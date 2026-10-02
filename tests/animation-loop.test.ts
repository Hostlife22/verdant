import { describe, expect, it } from 'vitest';
import { AnimationLoop } from '../src/browser/animation-loop';
import type { FrameScheduler } from '../src/browser/animation-loop';

class ManualFrames implements FrameScheduler {
  private sequence = 0;
  private callbacks = new Map<number, (timestamp: number) => void>();

  get pending(): number {
    return this.callbacks.size;
  }

  request(callback: (timestamp: number) => void): number {
    const handle = ++this.sequence;
    this.callbacks.set(handle, callback);
    return handle;
  }

  cancel(handle: number): void {
    this.callbacks.delete(handle);
  }

  frame(timestamp: number): void {
    const callbacks = [...this.callbacks.values()];
    this.callbacks.clear();
    callbacks.forEach((callback) => callback(timestamp));
  }
}

describe('animation scheduling', () => {
  it('has at most one pending frame even when start is repeated', () => {
    const scheduler = new ManualFrames();
    const elapsed: number[] = [];
    const loop = new AnimationLoop(scheduler, (seconds) =>
      elapsed.push(seconds),
    );
    loop.start();
    loop.start();
    expect(scheduler.pending).toBe(1);
    scheduler.frame(100);
    loop.start();
    scheduler.frame(116);
    expect(elapsed).toEqual([0, 0.016]);
    expect(scheduler.pending).toBe(1);
  });

  it('cancels pending work and discards the suspended interval on resume', () => {
    const scheduler = new ManualFrames();
    const elapsed: number[] = [];
    const loop = new AnimationLoop(scheduler, (seconds) =>
      elapsed.push(seconds),
    );
    loop.start();
    scheduler.frame(100);
    loop.stop();
    scheduler.frame(10000);
    expect(elapsed).toEqual([0]);
    expect(scheduler.pending).toBe(0);
    loop.start();
    scheduler.frame(20000);
    scheduler.frame(20016);
    expect(elapsed).toEqual([0, 0, 0.016]);
  });

  it('cannot restart after disposal, including repeated disposal', () => {
    const scheduler = new ManualFrames();
    const elapsed: number[] = [];
    const loop = new AnimationLoop(scheduler, (seconds) =>
      elapsed.push(seconds),
    );
    loop.start();
    loop.dispose();
    loop.dispose();
    loop.start();
    scheduler.frame(100);
    expect(elapsed).toEqual([]);
    expect(scheduler.pending).toBe(0);
  });

  it('allows an update to stop playback without queuing another frame', () => {
    const scheduler = new ManualFrames();
    const loop = new AnimationLoop(scheduler, () => loop.stop());
    loop.start();
    scheduler.frame(100);
    expect(scheduler.pending).toBe(0);
  });

  it('keeps one pending frame when an update stops and restarts playback', () => {
    const scheduler = new ManualFrames();
    const loop = new AnimationLoop(scheduler, () => {
      loop.stop();
      loop.start();
    });
    loop.start();
    scheduler.frame(100);
    expect(scheduler.pending).toBe(1);
    loop.dispose();
    expect(scheduler.pending).toBe(0);
  });

  it('stops scheduling if an update fails and exposes the original error', () => {
    const scheduler = new ManualFrames();
    const error = new Error('Render failed');
    const loop = new AnimationLoop(scheduler, () => {
      throw error;
    });
    loop.start();
    expect(() => scheduler.frame(100)).toThrow(error);
    expect(scheduler.pending).toBe(0);
  });
});
