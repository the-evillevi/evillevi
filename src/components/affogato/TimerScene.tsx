import { memo, Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import CubeCat from "@/components/affogato/CubeCat";
import { selectFriendModelPath, useAffogatoStore } from "@/lib/affogato/store";
import { useReducedMotion } from "@/lib/affogato/useReducedMotion";

/* Subscribes to the store directly (all primitive selections) and takes no
 * props — with memo, the parent's per-second re-render never reaches the
 * Canvas; only status/mode/friend/preference changes do. */
const TimerScene = memo(function TimerScene() {
  const status = useAffogatoStore((state) => state.timer.status);
  const mode = useAffogatoStore((state) => state.timer.mode);
  const reducedMotionPreference = useAffogatoStore((state) => state.preferences.reducedMotion);
  const modelPath = useAffogatoStore(selectFriendModelPath);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const systemReducedMotion = useReducedMotion();
  const reduced = reducedMotionPreference || systemReducedMotion;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <Canvas
        camera={{ position: [0, 2, 5], fov: 50 }}
        dpr={[1, 1.5]}
        shadows
        // Stop burning frames when nothing should move or nobody can see it.
        frameloop={reduced || !inView || !pageVisible ? "demand" : "always"}
        style={{ height: "100%", width: "100%" }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[2, 4, 3]} intensity={2.5} castShadow />
        <OrbitControls enablePan={false} enableZoom={false} maxPolarAngle={Math.PI / 2} />
        {/* Suspense inside the Canvas: lights render while the model streams. */}
        <Suspense fallback={null}>
          <CubeCat status={status} mode={mode} reducedMotion={reduced} modelPath={modelPath} />
        </Suspense>
      </Canvas>
    </div>
  );
});

export default TimerScene;
