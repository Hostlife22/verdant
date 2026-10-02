import { Simulation } from '../core/simulation';
import { AnimationLoop } from './animation-loop';
import { bindControls } from './controls';
import type { Controls } from './controls';
import { Renderer } from './render';

export interface Application {
  dispose(): void;
}

export function mountApplication(root: HTMLElement): Application {
  const document = root.ownerDocument;
  const view = document.defaultView;
  if (!view) throw new Error('The application requires a browser window');
  const simulation = new Simulation();
  const reducedMotion = view.matchMedia('(prefers-reduced-motion: reduce)');
  const lifecycle = new AbortController();
  const renderer = new Renderer(root);
  let suspended = false;
  let disposed = false;

  if (reducedMotion.matches) simulation.showMature();

  const loop = new AnimationLoop(
    {
      request: (callback) => view.requestAnimationFrame(callback),
      cancel: (handle) => view.cancelAnimationFrame(handle),
    },
    (seconds) => {
      simulation.advance(seconds);
      renderer.render(simulation.state);
    },
  );

  const synchronize = (): void => {
    if (disposed) return;
    renderer.render(simulation.state);
    controls.render(simulation.state.paused, simulation.parameters);
    if (simulation.state.paused || document.hidden || suspended) loop.stop();
    else loop.start();
  };

  // Binding never invokes actions during construction.
  let controls: Controls;
  try {
    controls = bindControls(root, {
      toggle: () => {
        simulation.setPaused(!simulation.state.paused);
        synchronize();
      },
      reset: () => {
        loop.stop();
        simulation.reset();
        synchronize();
      },
      setParameters: (parameters) => {
        simulation.setParameters(parameters);
        synchronize();
      },
    });
  } catch (error) {
    renderer.dispose();
    loop.dispose();
    lifecycle.abort();
    throw error;
  }

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    loop.dispose();
    lifecycle.abort();
    controls.dispose();
    renderer.dispose();
  };

  document.addEventListener('visibilitychange', synchronize, {
    signal: lifecycle.signal,
  });
  reducedMotion.addEventListener(
    'change',
    (event) => {
      if (event.matches) {
        simulation.setPaused(true);
        synchronize();
      }
    },
    { signal: lifecycle.signal },
  );
  view.addEventListener(
    'pagehide',
    (event) => {
      if (event.persisted) {
        suspended = true;
        loop.stop();
      } else dispose();
    },
    { signal: lifecycle.signal },
  );
  view.addEventListener(
    'pageshow',
    () => {
      suspended = false;
      synchronize();
    },
    { signal: lifecycle.signal },
  );

  synchronize();
  return { dispose };
}
