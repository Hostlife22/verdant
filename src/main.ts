import { bindControls } from './controls';
import { Renderer } from './render';
import { Simulation } from './simulation';

const simulation = new Simulation();
const renderer = new Renderer();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const lifecycle = new AbortController();
let frame: number | null = null;
let lastTime: number | null = null;

if (reducedMotion.matches) simulation.showMature();

function cancelFrame(): void {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  lastTime = null;
}

function schedule(): void {
  if (frame === null && !simulation.state.paused && !document.hidden)
    frame = requestAnimationFrame(tick);
}

function tick(now: number): void {
  frame = null;
  if (lastTime !== null) simulation.advance((now - lastTime) / 1000);
  lastTime = now;
  renderer.render(simulation.state);
  schedule();
}

const controls = bindControls(simulation, () => {
  cancelFrame();
  renderer.render(simulation.state);
  schedule();
});

function dispose(): void {
  cancelFrame();
  controls.dispose();
  lifecycle.abort();
}

document.addEventListener(
  'visibilitychange',
  () => {
    cancelFrame();
    schedule();
  },
  { signal: lifecycle.signal },
);

reducedMotion.addEventListener(
  'change',
  (event) => {
    if (event.matches) {
      simulation.setPaused(true);
      cancelFrame();
      controls.refresh();
    }
  },
  { signal: lifecycle.signal },
);

// Keep listeners for a page saved in the back-forward cache; clean up on real exit.
window.addEventListener(
  'pagehide',
  (event) => {
    if (event.persisted) cancelFrame();
    else dispose();
  },
  { signal: lifecycle.signal },
);

window.addEventListener('pageshow', schedule, { signal: lifecycle.signal });

renderer.render(simulation.state);
schedule();
