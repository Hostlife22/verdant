import { CONFIG, clamp } from './config';

export interface Growth {
  stem: number;
  opacity: number;
  progress: number;
  phase: 'Germinating' | 'Growing' | 'Flourishing' | 'Returning';
}

export function smooth(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

export function growthAt(time: number): Growth {
  return {
    stem: smooth((time - 0.5) / CONFIG.growUntil),
    opacity:
      1 - smooth((time - CONFIG.fadeFrom) / (CONFIG.cycle - CONFIG.fadeFrom)),
    progress: clamp(time / CONFIG.cycle, 0, 1),
    phase:
      time < 2
        ? 'Germinating'
        : time < 11
          ? 'Growing'
          : time < 17
            ? 'Flourishing'
            : 'Returning',
  };
}

export function leafGrowth(time: number, delay: number): number {
  return smooth((time - delay) / 1.6);
}
