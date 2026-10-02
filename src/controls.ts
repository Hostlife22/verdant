import { required } from './render';
import type { Simulation } from './simulation';

export interface Controls {
  refresh(): void;
  dispose(): void;
}

export function bindControls(
  simulation: Simulation,
  onChange: () => void,
): Controls {
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const toggle = required('#toggle', HTMLButtonElement);
  const reset = required('#reset', HTMLButtonElement);
  const wind = required('#wind', HTMLInputElement);
  const speed = required('#speed', HTMLInputElement);
  const windValue = required('#wind-value', HTMLOutputElement);
  const speedValue = required('#speed-value', HTMLOutputElement);
  const status = required('#status', HTMLElement);
  const refresh = (): void => {
    toggle.textContent = simulation.state.paused
      ? 'Play animation'
      : 'Pause animation';
    status.textContent = simulation.state.paused
      ? 'Paused · take your time'
      : 'Live · a little room to grow';
  };
  toggle.addEventListener(
    'click',
    () => {
      simulation.setPaused(!simulation.state.paused);
      refresh();
      onChange();
    },
    options,
  );
  reset.addEventListener(
    'click',
    () => {
      simulation.reset();
      refresh();
      onChange();
    },
    options,
  );
  const update = (): void => {
    simulation.setParameters({
      wind: wind.valueAsNumber,
      speed: speed.valueAsNumber,
    });
    windValue.value = `${simulation.parameters.wind.toFixed(2)}×`;
    speedValue.value = `${simulation.parameters.speed.toFixed(1)}×`;
    wind.setAttribute(
      'aria-valuetext',
      `${simulation.parameters.wind.toFixed(2)} times wind strength`,
    );
    speed.setAttribute(
      'aria-valuetext',
      `${simulation.parameters.speed.toFixed(1)} times growth speed`,
    );
    onChange();
  };
  wind.addEventListener('input', update, options);
  speed.addEventListener('input', update, options);
  update();
  refresh();
  return { refresh, dispose: () => abort.abort() };
}
