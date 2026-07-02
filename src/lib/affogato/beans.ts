export const BEANS_PER_SECOND = 1 / 60;

export function calculateEarnedBeans(elapsedSeconds: number, beansPerSecond = BEANS_PER_SECOND) {
  return Math.max(0, elapsedSeconds) * beansPerSecond;
}

export function elapsedBeanSeconds(lastBeanAccruedAt: number | null, at: number) {
  if (!lastBeanAccruedAt) return 0;
  return Math.max(0, Math.floor((at - lastBeanAccruedAt) / 1000));
}

/** Display label for a bean balance; compacts once the number gets loud. */
export function formatBeanLabel(beans: number) {
  return beans >= 10_000
    ? new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(
        beans,
      )
    : beans.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
