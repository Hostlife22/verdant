import { clamp } from './math';

export interface Spring {
  value: number;
  velocity: number;
}

export interface SpringParameters {
  stiffness: number;
  damping: number;
  min: number;
  max: number;
  maxVelocity: number;
}

export const ANGLE_SPRING: Readonly<SpringParameters> = {
  stiffness: 60,
  damping: 7,
  min: -35,
  max: 35,
  maxVelocity: 150,
};

export const UNFURL_SPRING: Readonly<SpringParameters> = {
  stiffness: 95,
  damping: 9,
  min: 0,
  max: 1.15,
  maxVelocity: 5,
};

// Semi-implicit Euler. The caller uses a fixed step; substeps also protect direct callers.
export function integrateSpring(
  spring: Spring,
  target: number,
  seconds: number,
  parameters: Readonly<SpringParameters>,
): void {
  const duration = clamp(seconds, 0, 0.1);
  const steps = Math.max(1, Math.ceil(duration / (1 / 120)));
  const dt = duration / steps;
  spring.value = clamp(spring.value, parameters.min, parameters.max);
  spring.velocity = clamp(
    spring.velocity,
    -parameters.maxVelocity,
    parameters.maxVelocity,
  );
  const safeTarget = clamp(target, parameters.min, parameters.max);
  for (let i = 0; i < steps; i++) {
    const acceleration =
      parameters.stiffness * (safeTarget - spring.value) -
      parameters.damping * spring.velocity;
    spring.velocity = clamp(
      spring.velocity + acceleration * dt,
      -parameters.maxVelocity,
      parameters.maxVelocity,
    );
    spring.value = clamp(
      spring.value + spring.velocity * dt,
      parameters.min,
      parameters.max,
    );
    if (
      (spring.value === parameters.min && spring.velocity < 0) ||
      (spring.value === parameters.max && spring.velocity > 0)
    )
      spring.velocity = 0;
  }
}

export function windAt(time: number, offset: number, strength: number): number {
  return (
    (Math.sin(time * 1.6 + offset) * 7 +
      Math.sin(time * 3.1 + offset * 2) * 2.2) *
    strength
  );
}
