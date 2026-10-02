export interface Parameters {
  wind: number;
  speed: number;
}

export interface LeafDefinition {
  readonly height: number;
  readonly side: -1 | 1;
  readonly size: number;
  readonly delay: number;
}

export const CONFIG = {
  step: 1 / 120,
  maxFrame: 0.1,
  cycle: 20,
  growUntil: 11,
  fadeFrom: 17,
  matureTime: 12,
  leafEmergence: 0.07,
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

export const PARAMETER_LIMITS = {
  wind: { min: 0, max: 2, step: 0.05 },
  speed: { min: 0.5, max: 2, step: 0.1 },
} as const;
