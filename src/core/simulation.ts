import { CONFIG, DEFAULT_PARAMETERS, LEAVES, PARAMETER_LIMITS } from './config';
import type { Parameters } from './config';
import { clamp } from './math';
import { growthAt, leafGrowth, smooth } from './growth';
import {
  ANGLE_SPRING,
  UNFURL_SPRING,
  integrateSpring,
  windAt,
} from './physics';
import type { Spring } from './physics';

interface LeafState {
  angle: Spring;
  unfurl: Spring;
}

interface MutableSimulationState {
  time: number;
  paused: boolean;
  stem: Spring;
  leaves: LeafState[];
}

// Read-only live view: rendering reads it synchronously; copy it to retain a snapshot.
export interface SimulationState {
  readonly time: number;
  readonly paused: boolean;
  readonly stem: Readonly<Spring>;
  readonly leaves: readonly {
    readonly angle: Readonly<Spring>;
    readonly unfurl: Readonly<Spring>;
  }[];
}

function spring(): Spring {
  return { value: 0, velocity: 0 };
}

export class Simulation {
  private currentParameters: Parameters = { ...DEFAULT_PARAMETERS };
  private readonly currentState: MutableSimulationState = {
    time: 0,
    paused: false,
    stem: spring(),
    leaves: LEAVES.map(() => ({ angle: spring(), unfurl: spring() })),
  };
  private accumulator = 0;

  get state(): SimulationState {
    return this.currentState;
  }

  get parameters(): Readonly<Parameters> {
    return this.currentParameters;
  }

  setPaused(paused: boolean): void {
    this.currentState.paused = paused;
    this.accumulator = 0;
  }

  setParameters(parameters: Parameters): void {
    this.currentParameters.wind = clamp(
      parameters.wind,
      PARAMETER_LIMITS.wind.min,
      PARAMETER_LIMITS.wind.max,
    );
    this.currentParameters.speed = clamp(
      parameters.speed,
      PARAMETER_LIMITS.speed.min,
      PARAMETER_LIMITS.speed.max,
    );
  }

  private resetPlant(): void {
    this.currentState.time = 0;
    this.currentState.stem = spring();
    this.currentState.leaves = LEAVES.map(() => ({
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
    this.currentState.time = CONFIG.matureTime;
    this.currentState.leaves.forEach((leaf) => {
      leaf.unfurl.value = 1;
    });
    this.setPaused(true);
  }

  advance(seconds: number): void {
    if (this.currentState.paused || !Number.isFinite(seconds) || seconds <= 0)
      return;
    // Drop suspended time instead of trying to catch up after a stalled frame.
    if (seconds > CONFIG.maxFrame) return;
    this.accumulator += seconds;
    while (this.accumulator + 1e-10 >= CONFIG.step) {
      this.accumulator = Math.max(0, this.accumulator - CONFIG.step);
      this.step();
    }
  }

  private step(): void {
    this.currentState.time += CONFIG.step * this.currentParameters.speed;
    if (this.currentState.time + 1e-10 >= CONFIG.cycle) {
      // Both sides of the seam have zero visible plant area. Reset hidden springs.
      const remainder = Math.max(0, this.currentState.time - CONFIG.cycle);
      this.resetPlant();
      this.currentState.time = remainder;
      return;
    }
    const time = this.currentState.time;
    integrateSpring(
      this.currentState.stem,
      windAt(time, 0, this.currentParameters.wind) * 0.45,
      CONFIG.step,
      ANGLE_SPRING,
    );
    const stemGrowth = growthAt(time).stem;
    this.currentState.leaves.forEach((leaf, index) => {
      const definition = LEAVES[index];
      if (!definition) return;
      const growth =
        leafGrowth(time, definition.delay) *
        smooth((stemGrowth - definition.height) / CONFIG.leafEmergence);
      integrateSpring(leaf.unfurl, growth, CONFIG.step, UNFURL_SPRING);
      integrateSpring(
        leaf.angle,
        growth * windAt(time, index * 0.7, this.currentParameters.wind),
        CONFIG.step,
        ANGLE_SPRING,
      );
    });
  }
}
