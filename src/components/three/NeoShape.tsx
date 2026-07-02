import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { useCelMaterial } from "./celMaterial";
import { useReducedMotion } from "./useReducedMotion";

export type NeoShapeProps = {
  geometry: THREE.BufferGeometry;
  color: string;
  ink: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  /** Vertical bob distance in world units. */
  floatAmplitude?: number;
  floatSpeed?: number;
  /** Continuous y-rotation drift in radians per second. */
  spinSpeed?: number;
  /** Per-shape offset so a group of shapes doesn't bob in unison. */
  phase?: number;
  outlineScale?: number;
  /**
   * Dedicated hull geometry for shapes where uniform scaling misses edges
   * (e.g. a torus, whose scaled-up hull also grows the hole and never shows
   * inside it). Rendered at scale 1 instead of outlineScale.
   */
  outlineGeometry?: THREE.BufferGeometry;
  /** NdotH threshold for the cream highlight blob; pass > 1 to disable. */
  specEdge?: number;
  highlight?: string;
};

const HOVER_SCALE = 1.12;

/**
 * One retro-cartoon shape = two meshes sharing a geometry: an inverted-hull
 * ink outline (the thick uniform stroke) and a hard-edge cel-shaded fill
 * (two color bands + hard cream highlight). Idle float + snappy hover pop,
 * both skipped under prefers-reduced-motion.
 */
export function NeoShape({
  geometry,
  color,
  ink,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  floatAmplitude = 0.16,
  floatSpeed = 0.9,
  spinSpeed = 0.3,
  phase = 0,
  outlineScale = 1.07,
  outlineGeometry,
  specEdge,
  highlight,
}: NeoShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useReducedMotion();
  const celMaterial = useCelMaterial(color, ink, { highlight, specEdge });

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const targetScale = scale * (hovered ? HOVER_SCALE : 1);
    if (reducedMotion) {
      group.scale.setScalar(targetScale);
      return;
    }

    group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, targetScale, 14, delta));
    const t = state.clock.elapsedTime;
    group.position.y = position[1] + Math.sin(t * floatSpeed + phase) * floatAmplitude;
    group.rotation.y = rotation[1] + t * spinSpeed;
    group.rotation.x = rotation[0] + Math.sin(t * 0.6 + phase) * 0.08;
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={outlineGeometry ?? geometry} scale={outlineGeometry ? 1 : outlineScale}>
        <meshBasicMaterial color={ink} side={THREE.BackSide} />
      </mesh>
      <mesh
        geometry={geometry}
        material={celMaterial}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}
