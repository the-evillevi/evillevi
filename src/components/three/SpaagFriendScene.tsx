import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import {
  bakeColors,
  classifyVertices,
  roleColors,
  type Group,
  type Rgb,
} from "@/lib/evil-labs/recolor";
import { NeoCanvas } from "./NeoCanvas";
import { INK, InkEdges, placeSlab, slabOffset } from "./spaag";
import { useEvilTokens, type EvilTokens } from "./useEvilTokens";
import { useReducedMotion } from "./useReducedMotion";

export type SpaagFriendProps = {
  modelPath: string;
  groups: Group[];
  /** Accessible name; the canvas itself is aria-hidden. */
  label: string;
  className?: string;
};

/* World units visible vertically. The model is fit to FIT_SIZE, so this
 * leaves room for the slab shadow and the hover pop. */
const VERTICAL_UNITS = 2.3;
const FIT_SIZE = 1.5;
/* Spaag's objects sit at a fixed 3/4 angle and sway instead of spinning. */
const TILT_X = 0.32;
const YAW = -0.6;
const SWAY = 0.35;
const HOVER_SCALE = 1.08;

type Part = { mesh: THREE.Mesh; vertexGroups: Uint8Array; shadow: THREE.Mesh };

/** Reads the atlas once into a pixel sampler; UVs are glTF top-left origin. */
function atlasSampler(texture: THREE.Texture | null): (u: number, v: number) => Rgb {
  const image = texture?.image as CanvasImageSource & { width: number; height: number };
  if (!image) return () => [128, 128, 128];
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(image, 0, 0);
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  return (u, v) => {
    const x = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
    const y = Math.min(height - 1, Math.max(0, Math.floor(v * height)));
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
}

function Friend({
  modelPath,
  groups,
  tokens,
}: {
  modelPath: string;
  groups: Group[];
  tokens: EvilTokens;
}) {
  const { scene, animations } = useGLTF(modelPath);
  const reducedMotion = useReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const viewport = useThree((state) => state.viewport);
  const rootRef = useRef<THREE.Group>(null);
  const swayRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Own copy of the node tree so the Affogato pages can show the same GLB.
  // Geometries are cloned too, since each part gets its own color attribute.
  const { model, parts, fill, shadowMaterial } = useMemo(() => {
    const model = scene.clone(true);
    const fill = new THREE.MeshBasicMaterial({ vertexColors: true });
    const shadowMaterial = new THREE.MeshBasicMaterial({ color: INK });
    let sample: ((u: number, v: number) => Rgb) | null = null;
    const parts: Part[] = [];
    model.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const source = mesh.material as THREE.MeshStandardMaterial;
      sample ??= atlasSampler(source.map);
      mesh.geometry = mesh.geometry.clone();
      const uv = mesh.geometry.getAttribute("uv");
      const vertexGroups = classifyVertices(uv.array, sample, groups);
      mesh.material = fill;
      const shadow = new THREE.Mesh(mesh.geometry, shadowMaterial);
      shadow.raycast = () => {};
      parts.push({ mesh, vertexGroups, shadow });
    });
    return { model, parts, fill, shadowMaterial };
  }, [scene, groups]);

  useEffect(
    () => () => {
      parts.forEach((part) => part.mesh.geometry.dispose());
      fill.dispose();
      shadowMaterial.dispose();
    },
    [parts, fill, shadowMaterial],
  );

  // Rebake vertex colors when the family or mode changes.
  useEffect(() => {
    const colors = roleColors(tokens.accent);
    for (const part of parts) {
      const baked = bakeColors(part.vertexGroups, groups, colors);
      part.mesh.geometry.setAttribute("color", new THREE.BufferAttribute(baked, 3));
    }
    invalidate();
  }, [parts, groups, tokens.accent, invalidate]);

  // Same bounding-box fit as FriendPreview: centered, uniform size.
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = FIT_SIZE / (Math.max(size.x, size.y, size.z) || 1);
    return { scale, offset: center.multiplyScalar(-scale) };
  }, [model]);

  const { actions, mixer } = useAnimations(animations, rootRef);

  // Idle loops; hover plays one positive gesture, then crossfades back.
  useEffect(() => {
    const base = actions[reducedMotion ? "static" : "idle"];
    base?.reset().fadeIn(0.2).play();
    invalidate();
    return () => {
      base?.fadeOut(0.2);
    };
  }, [actions, reducedMotion, invalidate]);

  useEffect(() => {
    if (!hovered || reducedMotion) return;
    const gesture = actions["gesture-positive"];
    const idle = actions.idle;
    if (!gesture || !idle) return;
    gesture.reset().setLoop(THREE.LoopOnce, 1);
    gesture.clampWhenFinished = false;
    gesture.crossFadeFrom(idle, 0.25, false).play();
    const onFinished = (event: { action: THREE.AnimationAction }) => {
      if (event.action !== gesture) return;
      idle.reset().crossFadeFrom(gesture, 0.3, false).play();
    };
    mixer.addEventListener("finished", onFinished);
    return () => mixer.removeEventListener("finished", onFinished);
  }, [hovered, reducedMotion, actions, mixer]);

  // The slab is the model again in solid ink, pushed by the card shadow's
  // screen offset. Recomputed per frame in world space, because each part
  // rotates and animates on its own.
  const world = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, delta) => {
    const sway = swayRef.current;
    if (sway) {
      const t = state.clock.elapsedTime;
      sway.rotation.y = YAW + (reducedMotion ? 0 : Math.sin(t * 0.55) * SWAY);
      const target = hovered ? HOVER_SCALE : 1;
      sway.scale.setScalar(THREE.MathUtils.damp(sway.scale.x, target, 14, delta));
    }
    rootRef.current?.updateMatrixWorld(true);
    const { dx, dy } = slabOffset(
      tokens.shadowX,
      tokens.shadowY,
      viewport.height,
      state.size.height,
    );
    for (const part of parts) placeSlab(part.mesh, part.shadow, dx, dy, world);
  });

  return (
    <group rotation={[TILT_X, 0, 0]}>
      <group
        ref={swayRef}
        rotation={[0, YAW, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <group
          ref={rootRef}
          position={[fit.offset.x, fit.offset.y, fit.offset.z]}
          scale={fit.scale}
        >
          <primitive object={model} />
        </group>
      </group>
      {parts.map((part) => (
        <Fragment key={part.mesh.uuid}>
          {createPortal(
            <>
              <InkEdges color={tokens.border} />
              <primitive object={part.shadow} />
            </>,
            part.mesh,
          )}
        </Fragment>
      ))}
    </group>
  );
}

export default function SpaagFriendScene({
  modelPath,
  groups,
  label,
  className,
}: SpaagFriendProps) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const tokens = useEvilTokens(scopeRef);
  return (
    <div
      ref={scopeRef}
      role="img"
      aria-label={label}
      className={className}
      style={{ width: "100%", height: "100%" }}
    >
      <NeoCanvas verticalUnits={VERTICAL_UNITS} className="h-full w-full">
        <Friend modelPath={modelPath} groups={groups} tokens={tokens} />
      </NeoCanvas>
    </div>
  );
}
