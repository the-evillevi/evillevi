import { lazy, Suspense, useEffect, useState } from "react";
import type { SpaagFriendProps } from "./SpaagFriendScene";

const SpaagFriendScene = lazy(() => import("./SpaagFriendScene"));

/**
 * SSR-safe shell for one Spaag-style voxel friend, hydrated with
 * `client:visible`. Same pattern as Accent3D.tsx: the server renders a
 * sized div (not null) so the island's IntersectionObserver can fire, and
 * the three.js chunk loads only in the browser.
 */
export default function SpaagFriend(props: SpaagFriendProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ width: "100%", height: "100%" }} />;

  return (
    <Suspense fallback={null}>
      <SpaagFriendScene {...props} />
    </Suspense>
  );
}
