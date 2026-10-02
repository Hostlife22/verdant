import { CONFIG, DEFAULT_PARAMETERS, LEAVES, clamp } from './config';
import type { Parameters } from './config';
import { growthAt, leafGrowth, smooth } from './growth';
import {
  ANGLE_SPRING,
  UNFURL_SPRING,
  integrateSpring,
  windAt,
} from './physics';
import type { Spring } from './physics';

export interface LeafState {
  angle: Spring;
  unfurl: Spring;
}

export interface SimulationState {
  time: number;
  paused: boolean;
  stem: Spring;
  leaves: LeafState[];
}

function spring(): Spring {
  return { value: 0, velocity: 0 };
}

export class Simulation {
  readonly parameters: Parameters = { ...DEFAULT_PARAMETERS };
  readonly state: SimulationState = {
    time: 0,
    paused: false,
    stem: spring(),
    leaves: LEAVES.map(() => ({ angle: spring(), unfurl: spring() })),
  };
  private accumulator = 0;

  setPaused(paused: boolean): void {
    this.state.paused = paused;
    this.accumulator = 0;
  }

  setParameters(parameters: Parameters): void {
    this.parameters.wind = clamp(parameters.wind, 0, 2);
    this.parameters.speed = clamp(parameters.speed, 0.5, 2);
  }

  private resetPlant(): void {
    this.state.time = 0;
    this.state.stem = spring();
    this.state.leaves = LEAVES.map(() => ({
      angle: spring(),
      unfurl: spring(),
    }));
  }

  reset(): void {
    this.resetPlant();
    this.accumulator = 0;
  }

  // Used for the initial reduced-motion presentation, without animated settling.
  showMature(): void {
    this.reset();
    this.state.time = 12;
    this.state.leaves.forEach((leaf) => {
      leaf.unfurl.value = 1;
    });
    this.setPaused(true);
  }

  advance(seconds: number): void {
    if (this.state.paused || !Number.isFinite(seconds) || seconds <= 0) return;
    // Drop suspended time instead of trying to catch up after a stalled frame.
    if (seconds > CONFIG.maxFrame) return;
    this.accumulator += seconds;
    while (this.accumulator + 1e-10 >= CONFIG.step) {
      this.accumulator = Math.max(0, this.accumulator - CONFIG.step);
      this.step();
    }
  }

  private step(): void {
    this.state.time += CONFIG.step * this.parameters.speed;
    if (this.state.time + 1e-10 >= CONFIG.cycle) {
      // Both sides of the seam have zero visible plant area. Reset hidden springs.
      const remainder = Math.max(0, this.state.time - CONFIG.cycle);
      this.resetPlant();
      this.state.time = remainder;
      return;
    }
    const time = this.state.time;
    integrateSpring(
      this.state.stem,
      windAt(time, 0, this.parameters.wind) * 0.45,
      CONFIG.step,
      ANGLE_SPRING,
    );
    this.state.leaves.forEach((leaf, index) => {
      const definition = LEAVES[index];
      if (!definition) return;
      const growth =
        leafGrowth(time, definition.delay) *
        smooth((growthAt(time).stem - definition.height) / 0.07);
      integrateSpring(leaf.unfurl, growth, CONFIG.step, UNFURL_SPRING);
      integrateSpring(
        leaf.angle,
        growth * windAt(time, index * 0.7, this.parameters.wind),
        CONFIG.step,
        ANGLE_SPRING,
      );
    });
  }
}
