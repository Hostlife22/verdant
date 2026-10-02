export interface FrameScheduler {
  request(callback: (timestamp: number) => void): number;
  cancel(handle: number): void;
}

// Scheduling only. Simulation owns timestep policy; the application owns playback intent.
export class AnimationLoop {
  private handle: number | null = null;
  private previousTime: number | null = null;
  private running = false;
  private disposed = false;

  constructor(
    private readonly scheduler: FrameScheduler,
    private readonly update: (seconds: number) => void,
  ) {}

  start(): void {
    if (this.disposed || this.running) return;
    this.running = true;
    this.schedule();
  }

  stop(): void {
    this.running = false;
    if (this.handle !== null) this.scheduler.cancel(this.handle);
    this.handle = null;
    this.previousTime = null;
  }

  dispose(): void {
    this.stop();
    this.disposed = true;
  }

  private schedule(): void {
    if (this.running && this.handle === null)
      this.handle = this.scheduler.request(this.tick);
  }

  private readonly tick = (timestamp: number): void => {
    this.handle = null;
    if (!this.running) return;
    const elapsed =
      this.previousTime === null
        ? 0
        : Math.max(0, (timestamp - this.previousTime) / 1000);
    this.previousTime = timestamp;
    try {
      this.update(elapsed);
    } catch (error) {
      this.stop();
      throw error;
    }
    this.schedule();
  };
}
