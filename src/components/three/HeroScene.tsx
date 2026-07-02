import { NeoBox, NeoCoin, NeoCone, NeoSphere, NeoTorus } from "./shapes";
import { useNbPalette } from "./useNbPalette";

/** Floating sticker cluster: five accent shapes around a center coin. */
export function HeroScene() {
  const palette = useNbPalette();

  return (
    <>
      <NeoBox
        color={palette.blue}
        ink={palette.ink}
        position={[-1.5, 1.0, 0]}
        rotation={[0.35, 0.6, 0]}
        phase={0}
        spinSpeed={0.25}
      />
      <NeoTorus
        color={palette.pink}
        ink={palette.ink}
        position={[1.6, 1.15, -0.8]}
        rotation={[0.5, 0, 0]}
        scale={1.1}
        phase={1.4}
        spinSpeed={0.35}
      />
      <NeoCone
        color={palette.green}
        ink={palette.ink}
        position={[1.7, -1.05, 0]}
        rotation={[0.15, 0, -0.2]}
        phase={2.8}
        spinSpeed={0.3}
      />
      <NeoSphere
        color={palette.yellow}
        ink={palette.ink}
        position={[-1.35, -1.25, -0.4]}
        phase={4.2}
        spinSpeed={0.2}
      />
      <NeoCoin
        color={palette.peach}
        ink={palette.ink}
        position={[0.15, 0.1, 0.5]}
        rotation={[-0.25, 0, 0.12]}
        scale={0.9}
        phase={3.4}
        spinSpeed={0.2}
      />
      <NeoBox
        color={palette.teal}
        ink={palette.ink}
        position={[0.2, -1.9, -2]}
        rotation={[0.4, 0.9, 0]}
        scale={0.5}
        phase={5.5}
        spinSpeed={0.4}
      />
    </>
  );
}
