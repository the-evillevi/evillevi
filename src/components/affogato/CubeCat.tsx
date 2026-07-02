import { useEffect, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";

import type { TimerMode, TimerStatus } from "@/lib/affogato/types";

const MODEL_PATH = "/models/animal-cat.glb";

/* All 24 Kenney animal GLBs in public/models/ share this clip set
 * (static/idle/walk/run/eat/dance/gesture-positive/gesture-negative). */
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
  scale?: number;
  status: TimerStatus;
  mode: TimerMode;
  reducedMotion: boolean;
}

export default function CubeCat({
  position = [0, 0, 0],
  scale = 1.5,
  status,
  mode,
  reducedMotion,
}: CubeCatProps) {
  // NOTE: the cached scene is rendered un-cloned — fine while a single
  // instance is mounted; switch to scene.clone() if a preview carousel
  // ever mounts several at once.
  const { scene, animations } = useGLTF(MODEL_PATH);
  const { actions } = useAnimations(animations, scene);

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
      status === "running" ? (mode === "pomodoro" ? Animation.Run : Animation.Dance) : Animation.Idle;
    const next = actions[key] ?? actions[Animation.Idle];
    if (!next || next === currentAction.current) return;

    currentAction.current?.fadeOut(0.3);
    next.reset().fadeIn(0.3).play();
    currentAction.current = next;
  }, [actions, mode, status, reducedMotion]);

  return <primitive object={scene} position={position} scale={scale} />;
}

// Module-level preload: fires when the lazy scene chunk loads — the earlier
// in-effect preload ran after useGLTF had already suspended, a no-op.
useGLTF.preload(MODEL_PATH);
