import { Suspense, memo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import CubeCat from "@/components/affogato/CubeCat";

import type { TimerState } from "@/lib/affogato/types";

function LoadingFallback() {
  return (
    <div className="grid h-full w-full place-items-center" aria-label="Loading 3D scene">
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="bg-primary block size-2 border" />
        ))}
      </div>
    </div>
  );
}

const TimerScene = memo(function TimerScene({ timer }: { timer: TimerState }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Canvas
        camera={{ position: [0, 2, 5], fov: 50 }}
        dpr={[1, 1.5]}
        shadows
        style={{ height: "100%", width: "100%" }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[2, 4, 3]} intensity={2.5} castShadow />
        <OrbitControls enablePan={false} enableZoom={false} maxPolarAngle={Math.PI / 2} />
        <CubeCat timer={timer} />
      </Canvas>
    </Suspense>
  );
});

export default TimerScene;
