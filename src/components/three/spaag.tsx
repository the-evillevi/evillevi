import { Edges } from "@react-three/drei";
import * as THREE from "three";

/*
 * The Spaag treatment shared by the garden's 3D objects (voxel friends,
 * extruded shapes): flat unlit fills, ink lines on every hard edge, and an
 * ink "slab" that copies the object as a hard shadow, offset like the CSS
 * card shadow (--evil-shadow-card: 4/4 in light, none in dark).
 */

export const INK = "#1A1A1A";
export const EDGE_WIDTH = 2;
export const EDGE_THRESHOLD = 32;
/* The slab sits this far behind its object so it never cuts through a part. */
export const SHADOW_DEPTH = 4;

/** Ink lines on the hard edges of the parent mesh. Lines are in pixels. */
export function InkEdges({
  color,
  threshold = EDGE_THRESHOLD,
}: {
  color: string;
  threshold?: number;
}) {
  return <Edges threshold={threshold} linewidth={EDGE_WIDTH} color={color} />;
}

/** The slab offset in world units for the current canvas. */
export function slabOffset(
  shadowX: number,
  shadowY: number,
  viewportHeight: number,
  canvasHeight: number,
) {
  // The ortho camera shows viewportHeight world units over canvasHeight px.
  const unitsPerPx = viewportHeight / canvasHeight;
  return { dx: shadowX * unitsPerPx, dy: -shadowY * unitsPerPx };
}

/**
 * Places `slab`, a child of `target` that shares its geometry, at the
 * target's world position pushed by (dx, dy) on screen and SHADOW_DEPTH back.
 * Call per frame after `updateMatrixWorld`, since targets may animate.
 */
export function placeSlab(
  target: THREE.Object3D,
  slab: THREE.Object3D,
  dx: number,
  dy: number,
  scratch: THREE.Vector3,
) {
  slab.visible = dx !== 0 || dy !== 0;
  if (!slab.visible) return;
  target.getWorldPosition(scratch);
  scratch.x += dx;
  scratch.y += dy;
  scratch.z -= SHADOW_DEPTH;
  slab.position.copy(target.worldToLocal(scratch));
}
