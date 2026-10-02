import { PARAMETER_LIMITS } from '../core/config';
import type { Parameters } from '../core/config';
import { required } from './dom';

export interface ControlActions {
  toggle(): void;
  reset(): void;
  setParameters(parameters: Parameters): void;
}

export interface Controls {
  render(paused: boolean, parameters: Readonly<Parameters>): void;
  dispose(): void;
}

export function bindControls(
  root: ParentNode,
  actions: ControlActions,
): Controls {
  const toggle = required(root, '#toggle', HTMLButtonElement);
  const reset = required(root, '#reset', HTMLButtonElement);
  const wind = required(root, '#wind', HTMLInputElement);
  const speed = required(root, '#speed', HTMLInputElement);
  const windValue = required(root, '#wind-value', HTMLOutputElement);
  const speedValue = required(root, '#speed-value', HTMLOutputElement);
  const status = required(root, '#status', HTMLElement);
  const abort = new AbortController();
  const options = { signal: abort.signal };

  for (const [input, limits] of [
    [wind, PARAMETER_LIMITS.wind],
    [speed, PARAMETER_LIMITS.speed],
  ] as const) {
    input.min = String(limits.min);
    input.max = String(limits.max);
    input.step = String(limits.step);
  }

  toggle.addEventListener('click', actions.toggle, options);
  reset.addEventListener('click', actions.reset, options);
  const update = (): void =>
    actions.setParameters({
      wind: wind.valueAsNumber,
      speed: speed.valueAsNumber,
    });
  wind.addEventListener('input', update, options);
  speed.addEventListener('input', update, options);

  return {
    render(paused, parameters) {
      toggle.textContent = paused ? 'Play animation' : 'Pause animation';
      status.textContent = paused
        ? 'Paused · take your time'
        : 'Live · a little room to grow';
      wind.value = String(parameters.wind);
      speed.value = String(parameters.speed);
      windValue.value = `${parameters.wind.toFixed(2)}×`;
      speedValue.value = `${parameters.speed.toFixed(1)}×`;
      wind.setAttribute(
        'aria-valuetext',
        `${parameters.wind.toFixed(2)} times wind strength`,
      );
      speed.setAttribute(
        'aria-valuetext',
        `${parameters.speed.toFixed(1)} times growth speed`,
      );
    },
    dispose: () => abort.abort(),
  };
}
