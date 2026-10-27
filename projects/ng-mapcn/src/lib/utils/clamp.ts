/** Clamps to 0-1; NaN becomes 0. Internal: not part of the public API. */
export function clamp01(value: number): number {
  return Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));
}
