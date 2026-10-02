export interface Parameters {
  wind: number;
  speed: number;
}

export interface LeafDefinition {
  height: number;
  side: number;
  size: number;
  delay: number;
}

export const CONFIG = {
  step: 1 / 120,
  maxFrame: 0.1,
  cycle: 20,
  growUntil: 11,
  fadeFrom: 17,
  stemHeight: 350,
  baseX: 300,
  baseY: 465,
} as const;

export const DEFAULT_PARAMETERS: Readonly<Parameters> = {
  wind: 0.65,
  speed: 1,
};

export const LEAVES: readonly LeafDefinition[] = Array.from(
  { length: 10 },
  (_, i) => ({
    height: 0.19 + Math.floor(i / 2) * 0.155 + (i % 2) * 0.048,
    side: i % 2 === 0 ? -1 : 1,
    size: 1.08 - Math.floor(i / 2) * 0.12,
    delay: 2 + i * 0.68,
  }),
);

export function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}
