import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type * as THREE from "three";
import { useReducedMotion } from "./useReducedMotion";

type NeoCanvasProps = {
  children: ReactNode;
  className?: string;
  /** World units visible vertically — compositions keep framing at any size. */
  verticalUnits?: number;
  /**
   * When set, at least this many world units stay visible horizontally too
   * ("contain" fit) — zooms out on narrow containers instead of clipping
   * the sides of the composition.
   */
  horizontalUnits?: number;
};

type FitOrthoProps = { verticalUnits: number; horizontalUnits?: number };

/* Ortho zoom is pixels-per-world-unit, so it must track container height or
 * a 100px accent and a 440px hero could never share compositions. */
function FitOrtho({ verticalUnits, horizontalUnits }: FitOrthoProps) {
  const camera = useThree((state) => state.camera) as THREE.OrthographicCamera;
  const size = useThree((state) => state.size);

  useLayoutEffect(() => {
    camera.zoom = horizontalUnits
      ? Math.min(size.height / verticalUnits, size.width / horizontalUnits)
      : size.height / verticalUnits;
    camera.updateProjectionMatrix();
  }, [camera, size, verticalUnits, horizontalUnits]);

  return null;
}

/**
 * Shared Canvas wrapper for all 3D islands. Orthographic for the flat 2.5D
 * sticker look, transparent so `--nb-base` shows through, `flat` (no tone
 * mapping) so the Catppuccin hexes render exactly as in CSS. No lights —
 * the cel shader bakes its own light direction. The frame loop drops to
 * "demand" when the canvas is offscreen or reduced motion is preferred.
 */
export function NeoCanvas({
  children,
  className,
  verticalUnits = 5.2,
  horizontalUnits,
}: NeoCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className={className} aria-hidden="true">
      <Canvas
        flat
        orthographic
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 10], near: 0.1, far: 100 }}
        gl={{ alpha: true, antialias: true }}
        frameloop={reducedMotion || !inView ? "demand" : "always"}
      >
        <FitOrtho verticalUnits={verticalUnits} horizontalUnits={horizontalUnits} />
        {children}
      </Canvas>
    </div>
  );
}
