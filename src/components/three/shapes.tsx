import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { NeoShape, type NeoShapeProps } from "./NeoShape";

export type NeoPresetProps = Omit<NeoShapeProps, "geometry">;

/* Segment counts stay low on purpose — cel shading hides the polys and the
 * chunky silhouette fits the aesthetic. One geometry is shared by the
 * outline/fill meshes inside NeoShape. */
function useGeometry<T extends THREE.BufferGeometry>(factory: () => T): T {
  const geometry = useMemo(factory, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

export function NeoBox(props: NeoPresetProps) {
  const geometry = useGeometry(() => new THREE.BoxGeometry(1.3, 1.3, 1.3));
  // No highlight blob: a whole flat face flashing cream while spinning jars.
  return <NeoShape geometry={geometry} specEdge={2} {...props} />;
}

export function NeoSphere(props: NeoPresetProps) {
  const geometry = useGeometry(() => new THREE.SphereGeometry(0.85, 24, 16));
  return <NeoShape geometry={geometry} {...props} />;
}

export function NeoTorus(props: NeoPresetProps) {
  const geometry = useGeometry(() => new THREE.TorusGeometry(0.72, 0.3, 16, 48));
  // Same ring radius, fatter tube: the hull's hole shrinks below the fill's,
  // so the ink stroke also rings the inside of the hole.
  const outlineGeometry = useGeometry(() => new THREE.TorusGeometry(0.72, 0.37, 16, 48));
  return <NeoShape geometry={geometry} outlineGeometry={outlineGeometry} {...props} />;
}

export function NeoCone(props: NeoPresetProps) {
  const geometry = useGeometry(() => new THREE.ConeGeometry(0.85, 1.4, 24));
  return <NeoShape geometry={geometry} {...props} />;
}

export function NeoCoin(props: NeoPresetProps) {
  const geometry = useGeometry(() => {
    const coin = new THREE.CylinderGeometry(0.9, 0.9, 0.35, 48);
    // Face the camera; the idle y-spin becomes a lazy edge-over coin flip.
    coin.rotateX(Math.PI / 2);
    return coin;
  });
  return <NeoShape geometry={geometry} {...props} />;
}
