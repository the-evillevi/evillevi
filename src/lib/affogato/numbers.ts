export function clampNumber(value: unknown, min: number, max: number, fallback = min): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function clampInt(value: unknown, min: number, max: number, fallback = min): number {
  return Math.round(clampNumber(value, min, max, fallback));
}

/** Positive finite number or null — for persisted epoch timestamps. */
export function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
