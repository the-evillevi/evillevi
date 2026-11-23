import { lazy, Suspense, useEffect, useState } from "react";
import type { SpaagShapeProps } from "./SpaagShapeScene";

const SpaagShapeScene = lazy(() => import("./SpaagShapeScene"));

/**
 * SSR-safe shell for a Spaag-style extruded shape, hydrated with
 * `client:visible`. Same contract as SpaagFriend.tsx: a sized div on the
 * server, three.js only in the browser.
 */
export default function SpaagShape(props: SpaagShapeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ width: "100%", height: "100%" }} />;

  return (
    <Suspense fallback={null}>
      <SpaagShapeScene {...props} />
    </Suspense>
  );
}
