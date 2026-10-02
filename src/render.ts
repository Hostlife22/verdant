import { CONFIG, LEAVES } from './config';
import { growthAt, smooth } from './growth';
import type { SimulationState } from './simulation';

interface LeafElements {
  group: SVGGElement;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string>,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([name, value]) =>
    element.setAttribute(name, value),
  );
  return element;
}

export function required<T extends Element>(
  selector: string,
  type: { new (): T },
): T {
  const element = document.querySelector(selector);
  if (!(element instanceof type))
    throw new Error(`Missing element: ${selector}`);
  return element;
}

export class Renderer {
  private readonly plant = required('#plant', SVGGElement);
  private readonly stem = required('#stem', SVGPathElement);
  private readonly tip = required('#tip', SVGEllipseElement);
  private readonly phase = required('#phase', HTMLElement);
  private readonly progress = required('#progress', HTMLElement);
  private readonly elapsed = required('#elapsed', HTMLElement);
  private readonly leaves: LeafElements[];

  constructor() {
    this.leaves = LEAVES.map((definition, index) => {
      const group = svgElement('g', { class: 'leaf' });
      const body = svgElement('path', {
        d: 'M0 0 C24 -40 73 -47 105 -40 C88 -7 40 23 0 0Z',
        fill: index % 3 === 0 ? 'url(#leaf-light)' : 'url(#leaf-dark)',
      });
      const vein = svgElement('path', {
        d: 'M0 0 Q52 -15 100 -39 M30 -8 L37 -26 M51 -17 L57 -34 M71 -26 L76 -38 M30 -8 L50 3 M51 -17 L73 -9',
        class: 'vein',
      });
      group.append(body, vein);
      group.dataset.side = String(definition.side);
      this.plant.append(group);
      return { group };
    });
  }

  render(state: SimulationState): void {
    const growth = growthAt(state.time);
    const height = CONFIG.stemHeight * growth.stem;
    const bend = state.stem.value * 2.8;
    const xAt = (fraction: number): number =>
      CONFIG.baseX + bend * fraction * fraction;
    this.plant.setAttribute('opacity', String(growth.opacity));
    this.stem.setAttribute(
      'd',
      `M${CONFIG.baseX} ${CONFIG.baseY} Q${CONFIG.baseX} ${CONFIG.baseY - height * 0.5} ${xAt(growth.stem)} ${CONFIG.baseY - height}`,
    );
    this.stem.setAttribute('stroke-width', String(3 + growth.stem * 3));
    this.tip.setAttribute('cx', String(xAt(growth.stem)));
    this.tip.setAttribute('cy', String(CONFIG.baseY - height));
    this.tip.setAttribute('opacity', String(smooth(growth.stem * 10)));
    this.leaves.forEach(({ group }, index) => {
      const definition = LEAVES[index];
      const leaf = state.leaves[index];
      if (!definition || !leaf) return;
      const scale = leaf.unfurl.value * definition.size;
      const angle =
        definition.side * (-10 - (1 - leaf.unfurl.value) * 65) +
        leaf.angle.value;
      group.setAttribute(
        'transform',
        `translate(${xAt(definition.height)} ${CONFIG.baseY - definition.height * CONFIG.stemHeight}) rotate(${angle}) scale(${definition.side * scale} ${scale * (0.35 + leaf.unfurl.value * 0.65)})`,
      );
    });
    this.phase.textContent = growth.phase;
    this.progress.style.transform = `scaleX(${growth.progress})`;
    this.elapsed.textContent = `${state.time.toFixed(1).padStart(4, '0')} / 20s`;
  }
}
