export const BEANS_PER_SECOND = 1 / 60;

export function calculateEarnedBeans(
  elapsedSeconds: number,
  beansPerSecond = BEANS_PER_SECOND,
) {
  return Math.max(0, elapsedSeconds) * beansPerSecond;
}

export function elapsedBeanSeconds(
  lastBeanAccruedAt: number | null,
  at: number,
) {
  if (!lastBeanAccruedAt) return 0;
  return Math.max(0, Math.floor((at - lastBeanAccruedAt) / 1000));
}
