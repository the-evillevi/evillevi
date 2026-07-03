import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Clone, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { useReducedMotion } from "@/lib/affogato/useReducedMotion";

/* Store preview: ONE small canvas showing the hovered/focused friend on a
 * slow turntable. A canvas per row would blow the browser WebGL context cap
 * (8 on Safari/Firefox) — a single 96px slot previews any pet at negligible
 * cost, and unmounts (freeing its context) when the sheet closes. */

function FriendPreviewModel({ modelPath, fitSize = 1.4 }: { modelPath: string; fitSize?: number }) {
  const { scene } = useGLTF(modelPath);
  const groupRef = useRef<THREE.Group>(null);

  // Same bbox normalization as CubeCat: centered, uniform apparent size.
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z) || 1;
    const fitScale = fitSize / maxDimension;
    return { scale: fitScale, offset: center.multiplyScalar(-fitScale) };
  }, [scene, fitSize]);

  // Slow turntable only — no useAnimations, no clip playback.
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.5;
  });

  return (
    <group ref={groupRef}>
      {/* Clone (SkeletonUtils under the hood for skinned meshes) so showing
          the same model the main scene renders un-cloned stays safe;
          deep={false} shares geometries/materials — no GPU re-upload. */}
      <Clone
        object={scene}
        deep={false}
        position={[fit.offset.x, fit.offset.y, fit.offset.z]}
        scale={fit.scale}
      />
    </group>
  );
}

export default function FriendPreviewCanvas({
  modelPath,
  className = "size-24",
}: {
  modelPath: string;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div className={className} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 1.2, 3.2], fov: 45 }}
        dpr={[1, 1.5]}
        shadows={false}
        frameloop={reducedMotion || !pageVisible ? "demand" : "always"}
        gl={{ antialias: false, powerPreference: "low-power" }}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={1.8} />
        <directionalLight position={[2, 3, 2]} intensity={2} />
        <Suspense fallback={null}>
          <FriendPreviewModel modelPath={modelPath} />
        </Suspense>
      </Canvas>
    </div>
  );
}
