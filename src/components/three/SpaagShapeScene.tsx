import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { roleColors } from "@/lib/evil-labs/recolor";
import { NeoCanvas } from "./NeoCanvas";
import { INK, InkEdges, placeSlab, slabOffset } from "./spaag";
import { useEvilTokens, type EvilTokens } from "./useEvilTokens";
import { useReducedMotion } from "./useReducedMotion";

export type SpaagShapeKind = "ring" | "star";

export type SpaagShapeProps = {
  shape?: SpaagShapeKind;
  className?: string;
};

const VERTICAL_UNITS = 2.6;
const DEPTH = 0.36;
/* Fixed 3/4 angle with a gentle sway, like the voxel friends. */
const TILT_X = -0.5;
const YAW = -0.55;
const SWAY = 0.4;
const HOVER_SCALE = 1.08;

/** A flat 2D outline, extruded with hard edges and centered on its depth. */
function extrudedShape(kind: SpaagShapeKind): THREE.ExtrudeGeometry {
  const outline = new THREE.Shape();
  if (kind === "ring") {
    outline.absarc(0, 0, 0.85, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.4, 0, Math.PI * 2, true);
    outline.holes.push(hole);
  } else {
    const points = 5;
    for (let i = 0; i <= points * 2; i++) {
      const radius = i % 2 === 0 ? 0.95 : 0.42;
      const angle = Math.PI / 2 + (i * Math.PI) / points;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) outline.moveTo(x, y);
      else outline.lineTo(x, y);
    }
  }
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: DEPTH,
    bevelEnabled: false,
    curveSegments: 48,
  });
  geometry.translate(0, 0, -DEPTH / 2);
  return geometry;
}

function Shape({ kind, tokens }: { kind: SpaagShapeKind; tokens: EvilTokens }) {
  const reducedMotion = useReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const viewport = useThree((state) => state.viewport);
  const swayRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const { geometry, face, side, slab } = useMemo(() => {
    const geometry = extrudedShape(kind);
    // ExtrudeGeometry groups: 0 = front and back caps, 1 = the extruded sides.
    const face = new THREE.MeshBasicMaterial();
    const side = new THREE.MeshBasicMaterial();
    const slab = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: INK }));
    slab.raycast = () => {};
    return { geometry, face, side, slab };
  }, [kind]);

  useEffect(
    () => () => {
      geometry.dispose();
      face.dispose();
      side.dispose();
      (slab.material as THREE.Material).dispose();
    },
    [geometry, face, side, slab],
  );

  // Caps in the accent, sides one shade darker, so the depth reads without light.
  useEffect(() => {
    const colors = roleColors(tokens.accent);
    face.color.setStyle(tokens.accent);
    side.color.setStyle(`rgb(${colors.shade.join(",")})`);
    invalidate();
  }, [tokens.accent, face, side, invalidate]);

  const world = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, delta) => {
    const sway = swayRef.current;
    const mesh = meshRef.current;
    if (!sway || !mesh) return;
    const t = state.clock.elapsedTime;
    sway.rotation.y = YAW + (reducedMotion ? 0 : Math.sin(t * 0.5) * SWAY);
    const target = hovered ? HOVER_SCALE : 1;
    sway.scale.setScalar(THREE.MathUtils.damp(sway.scale.x, target, 14, delta));
    mesh.updateMatrixWorld(true);
    const { dx, dy } = slabOffset(
      tokens.shadowX,
      tokens.shadowY,
      viewport.height,
      state.size.height,
    );
    placeSlab(mesh, slab, dx, dy, world);
  });

  return (
    <group rotation={[TILT_X, 0, 0]}>
      <group
        ref={swayRef}
        rotation={[0, YAW, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <mesh ref={meshRef} geometry={geometry} material={[face, side]}>
          <InkEdges color={tokens.border} threshold={20} />
          <primitive object={slab} />
        </mesh>
      </group>
    </group>
  );
}

/** A Spaag-style extruded shape in the scope's Evil Labs accent. Decorative. */
export default function SpaagShapeScene({ shape = "ring", className }: SpaagShapeProps) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const tokens = useEvilTokens(scopeRef);
  return (
    <div ref={scopeRef} className={className} style={{ width: "100%", height: "100%" }}>
      <NeoCanvas verticalUnits={VERTICAL_UNITS} className="h-full w-full">
        <Shape kind={shape} tokens={tokens} />
      </NeoCanvas>
    </div>
  );
}
