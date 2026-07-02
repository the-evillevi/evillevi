import { NeoCanvas } from "./NeoCanvas";
import { NeoBox, NeoCoin, NeoCone, NeoSphere, NeoTorus } from "./shapes";
import { useNbPalette, type NbColorName } from "./useNbPalette";

export type AccentShape = "box" | "sphere" | "torus" | "cone" | "coin";

export type AccentProps = {
  shape?: AccentShape;
  color?: NbColorName;
};

const SHAPE_COMPONENTS = {
  box: NeoBox,
  sphere: NeoSphere,
  torus: NeoTorus,
  cone: NeoCone,
  coin: NeoCoin,
} as const;

/** Single-shape canvas behind Accent3D's lazy import — never SSR'd. */
export default function AccentScene({ shape = "torus", color = "peach" }: AccentProps) {
  const palette = useNbPalette();
  const Shape = SHAPE_COMPONENTS[shape];

  return (
    <NeoCanvas className="h-full w-full" verticalUnits={2.8}>
      <Shape
        color={palette[color]}
        ink={palette.ink}
        scale={1.05}
        floatAmplitude={0.1}
        rotation={shape === "coin" ? [-0.25, 0, 0.1] : [0, 0, 0]}
      />
    </NeoCanvas>
  );
}
