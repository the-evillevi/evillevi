import { Component, type ReactNode } from "react";
import { Cat } from "lucide-react";

/** Contains 3D failures (lazy-chunk network errors, missing/corrupt GLBs,
 *  WebGL context loss on mount) so the timer keeps working without a scene. */
export class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Affogato 3D scene failed", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="border-border bg-surface grid h-full w-full place-items-center border-2 p-6 text-center">
        <div>
          <Cat className="mx-auto size-10" />
          <p className="mt-3 font-extrabold uppercase">The cat wandered off</p>
          <p className="text-muted-foreground text-sm">
            The 3D scene failed to load. Your timer still works.
          </p>
        </div>
      </div>
    );
  }
}
