import { lazy, Suspense, useEffect, useState } from "react";

/* Reuses Affogato's turntable preview canvas for project-card visuals.
 * Same SSR contract as Accent3D: render a sized element on the server
 * (never null — @astrojs/react's check() and client:visible both need it),
 * lazy-load three/drei only in the browser. */
const FriendPreviewCanvas = lazy(() => import("@/components/affogato/FriendPreview"));

export default function VoxelPetVisual({ modelPath }: { modelPath: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ width: "100%", height: "100%" }} />;

  return (
    <Suspense fallback={<div style={{ width: "100%", height: "100%" }} />}>
      <FriendPreviewCanvas modelPath={modelPath} className="h-full w-full" />
    </Suspense>
  );
}
