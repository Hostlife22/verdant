import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { growthAt } from '../src/core/growth';
import { ANGLE_SPRING, integrateSpring } from '../src/core/physics';
import { Simulation } from '../src/core/simulation';

function advance(simulation: Simulation, seconds: number, fps = 60): void {
  for (let i = 0; i < Math.round(seconds * fps); i++)
    simulation.advance(1 / fps);
}

function numbers(value: unknown): number[] {
  if (typeof value === 'number') return [value];
  if (value !== null && typeof value === 'object')
    return Object.values(value).flatMap(numbers);
  return [];
}

describe('plant lifecycle', () => {
  it('extends the stem and unfurls leaves in order', () => {
    const sim = new Simulation();
    expect(growthAt(sim.state.time).stem).toBe(0);
    advance(sim, 5);
    expect(growthAt(sim.state.time).stem).toBeGreaterThan(0);
    expect(growthAt(sim.state.time).stem).toBeLessThan(1);
    expect(sim.state.leaves[0]?.unfurl.value).toBeGreaterThan(0.9);
    expect(sim.state.leaves[9]?.unfurl.value).toBe(0);
    advance(sim, 7);
    expect(growthAt(sim.state.time).stem).toBe(1);
    expect(sim.state.leaves.every((leaf) => leaf.unfurl.value > 0.99)).toBe(
      true,
    );
  });

  it('holds all state while paused and continues on resume', () => {
    const sim = new Simulation();
    advance(sim, 4);
    sim.setPaused(true);
    const snapshot = structuredClone(sim.state);
    advance(sim, 30);
    expect(sim.state).toEqual(snapshot);
    sim.setPaused(false);
    advance(sim, 1);
    expect(sim.state.time).toBeCloseTo(5);
  });

  it('resets physics and growth while preserving pause and settings', () => {
    const sim = new Simulation();
    sim.setParameters({ wind: 2, speed: 2 });
    advance(sim, 6);
    sim.setPaused(true);
    sim.reset();
    const fresh = new Simulation();
    fresh.setPaused(true);
    expect(sim.state).toEqual(fresh.state);
    expect(sim.parameters).toEqual({ wind: 2, speed: 2 });
  });

  it('joins the loop at zero visible plant area and resets spring velocities', () => {
    const sim = new Simulation();
    advance(sim, CONFIG.cycle - CONFIG.step, 120);
    const before = growthAt(sim.state.time);
    expect(before.opacity * before.stem).toBeLessThan(0.0001);
    sim.advance(CONFIG.step);
    const after = growthAt(sim.state.time);
    expect(after.opacity * after.stem).toBeLessThan(0.0001);
    expect(sim.state.time).toBeCloseTo(0);
    expect(sim.state.leaves.every((leaf) => leaf.angle.velocity === 0)).toBe(
      true,
    );
  });

  it.each([8, 48])(
    'matches frame rates after %s seconds, including loop resets',
    (seconds) => {
      const simulations = [30, 60, 144].map((fps) => {
        const sim = new Simulation();
        advance(sim, seconds, fps);
        return numbers(sim.state);
      });
      const baseline = simulations[0];
      if (!baseline) throw new Error('Missing baseline');
      simulations.forEach((values) =>
        values.forEach((value, index) =>
          expect(value).toBeCloseTo(baseline[index] ?? 0, 8),
        ),
      );
    },
  );

  it('drops long frames, background gaps, and invalid elapsed time', () => {
    const sim = new Simulation();
    advance(sim, 3);
    const snapshot = structuredClone(sim.state);
    [300, 0.11, NaN, Infinity, -1].forEach((delta) => sim.advance(delta));
    expect(sim.state).toEqual(snapshot);
    sim.advance(1 / 60);
    expect(sim.state.time).toBeCloseTo(3 + 1 / 60);
  });

  it('provides a still mature presentation for reduced motion', () => {
    const sim = new Simulation();
    sim.showMature();
    advance(sim, 1);
    expect(sim.state.paused).toBe(true);
    expect(growthAt(sim.state.time).stem).toBe(1);
    expect(sim.state.leaves.every((leaf) => leaf.unfurl.value === 1)).toBe(
      true,
    );
  });

  it.each([0.5, 2])(
    'stays finite through many cycles at maximum wind and speed %s',
    (speed) => {
      const sim = new Simulation();
      sim.setParameters({ wind: 2, speed });
      for (let frame = 0; frame < 30000; frame++) {
        sim.advance(1 / 30);
        if (frame % 100 === 0) {
          expect(numbers(sim.state).every(Number.isFinite)).toBe(true);
          expect(
            sim.state.leaves.every(
              (leaf) =>
                Math.abs(leaf.angle.velocity) <= 150 &&
                leaf.unfurl.value <= 1.15,
            ),
          ).toBe(true);
        }
      }
    },
  );

  it('normalizes unsupported parameter inputs', () => {
    const sim = new Simulation();
    sim.setParameters({ wind: Infinity, speed: -200 });
    advance(sim, 1);
    expect(sim.parameters).toEqual({ wind: 0, speed: 0.5 });
    expect(numbers(sim.state).every(Number.isFinite)).toBe(true);
  });
});

describe('spring integration', () => {
  it('settles at its target after a disturbance', () => {
    const spring = { value: -25, velocity: 100 };
    for (let i = 0; i < 1200; i++)
      integrateSpring(spring, 10, 1 / 120, ANGLE_SPRING);
    expect(spring.value).toBeCloseTo(10, 6);
    expect(spring.velocity).toBeCloseTo(0, 6);
  });

  it('recovers from corrupt state and bounds extreme targets and timesteps', () => {
    const spring = { value: NaN, velocity: Infinity };
    for (let i = 0; i < 100; i++)
      integrateSpring(spring, 1e20, 1000, ANGLE_SPRING);
    expect(Number.isFinite(spring.value)).toBe(true);
    expect(spring.value).toBeLessThanOrEqual(35);
    expect(Math.abs(spring.velocity)).toBeLessThanOrEqual(150);
  });
});
