import { lazy, Suspense, useEffect, useState } from "react";
import type { AccentProps } from "./AccentScene";

const AccentScene = lazy(() => import("./AccentScene"));

/**
 * SSR-safe shell for a single decorative shape: renders nothing on the
 * server and lazy-loads the three.js chunk in the browser, so it can be
 * hydrated with `client:visible` (unlike Canvas-importing components,
 * which require `client:only`).
 */
export default function Accent3D(props: AccentProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  // SSR always takes this branch, and it must render a sized element, not
  // null: @astrojs/react's check() only recognizes a component that returns
  // a vnode, and client:visible's IntersectionObserver never fires on an
  // island whose display:contents wrapper has no laid-out children.
  if (!mounted) return <div style={{ width: "100%", height: "100%" }} />;

  return (
    <Suspense fallback={null}>
      <AccentScene {...props} />
    </Suspense>
  );
}
