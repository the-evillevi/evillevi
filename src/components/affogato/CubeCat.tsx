import { useEffect, useMemo, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

import { getFriend, STARTER_FRIEND_ID } from "@/lib/affogato/friends";
import type { TimerMode, TimerStatus } from "@/lib/affogato/types";

/* All 24 Kenney animal GLBs in public/models/ share this clip set
 * (static/idle/walk/run/eat/dance/gesture-positive/gesture-negative);
 * the ?? fallback chain below covers any model that diverges. */
enum Animation {
  Static = "static",
  Idle = "idle",
  Walk = "walk",
  Run = "run",
  Eat = "eat",
  Dance = "dance",
  GesturePositive = "gesture-positive",
  GestureNegative = "gesture-negative",
}

interface CubeCatProps {
  position?: [number, number, number];
  /** Final size of the model's largest dimension in world units. */
  fitSize?: number;
  status: TimerStatus;
  mode: TimerMode;
  reducedMotion: boolean;
  modelPath: string;
}

export default function CubeCat({
  position = [0, 0, 0],
  fitSize = 2.6,
  status,
  mode,
  reducedMotion,
  modelPath,
}: CubeCatProps) {
  // NOTE: the cached scene is rendered un-cloned — fine while a single
  // instance is mounted; switch to scene.clone() if a preview carousel
  // ever mounts several at once.
  const { scene, animations } = useGLTF(modelPath);
  const { actions } = useAnimations(animations, scene);

  /* Kenney models pivot at their feet and vary in native size; normalize so
   * every friend renders centered on the origin at the same apparent size. */
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z) || 1;
    const fitScale = fitSize / maxDimension;
    return { scale: fitScale, offset: center.multiplyScalar(-fitScale) };
  }, [scene, fitSize]);

  const currentAction = useRef<(typeof actions)[string] | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      // Hold a static pose: prefer the dedicated clip, else stop entirely.
      const staticAction = actions[Animation.Static];
      if (currentAction.current && currentAction.current !== staticAction) {
        currentAction.current.stop();
        currentAction.current = null;
      }
      if (staticAction && staticAction !== currentAction.current) {
        staticAction.reset().play();
        currentAction.current = staticAction;
      }
      return;
    }

    const key =
      status === "running"
        ? mode === "pomodoro"
          ? Animation.Run
          : Animation.Dance
        : Animation.Idle;
    const next =
      actions[key] ?? actions[Animation.Idle] ?? Object.values(actions).find(Boolean) ?? null;
    if (!next || next === currentAction.current) return;

    currentAction.current?.fadeOut(0.3);
    next.reset().fadeIn(0.3).play();
    currentAction.current = next;
  }, [actions, mode, status, reducedMotion]);

  return (
    <group position={position}>
      <primitive
        object={scene}
        position={[fit.offset.x, fit.offset.y, fit.offset.z]}
        scale={fit.scale}
      />
    </group>
  );
}

// Module-level preload of the starter model: fires when the lazy scene chunk
// loads. Other friends stream on selection via the in-Canvas Suspense.
useGLTF.preload(getFriend(STARTER_FRIEND_ID).modelPath);
