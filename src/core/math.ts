export function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}
