import { HeroScene } from "./HeroScene";
import { NeoCanvas } from "./NeoCanvas";

/** Hero island — mount with `client:only="react"` (Canvas cannot SSR). */
export default function Hero3D() {
  return (
    <NeoCanvas className="absolute inset-0" verticalUnits={5.8} horizontalUnits={6.4}>
      <HeroScene />
    </NeoCanvas>
  );
}
