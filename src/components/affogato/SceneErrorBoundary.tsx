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
      <div className="grid h-full w-full place-items-center border-4 border-[var(--nb-ink)] bg-[var(--nb-surface)] p-6 text-center">
        <div>
          <Cat className="mx-auto size-10" />
          <p className="mt-3 font-black uppercase">The cat wandered off</p>
          <p className="text-sm font-bold text-[var(--nb-muted)]">
            The 3D scene failed to load. Your timer still works.
          </p>
        </div>
      </div>
    );
  }
}
