import { CONFIG, LEAVES } from '../core/config';
import { growthAt, smooth } from '../core/growth';
import { required } from './dom';
import type { SimulationState } from '../core/simulation';

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

const GEOMETRY = { stemHeight: 350, baseX: 300, baseY: 465 } as const;

export class Renderer {
  private readonly plant: SVGGElement;
  private readonly stem: SVGPathElement;
  private readonly tip: SVGEllipseElement;
  private readonly phase: HTMLElement;
  private readonly progress: HTMLElement;
  private readonly elapsed: HTMLElement;
  private readonly leaves: LeafElements[];

  constructor(root: ParentNode) {
    this.plant = required(root, '#plant', SVGGElement);
    this.stem = required(root, '#stem', SVGPathElement);
    this.tip = required(root, '#tip', SVGEllipseElement);
    this.phase = required(root, '#phase', HTMLElement);
    this.progress = required(root, '#progress', HTMLElement);
    this.elapsed = required(root, '#elapsed', HTMLElement);
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

  dispose(): void {
    this.leaves.forEach(({ group }) => group.remove());
  }

  render(state: SimulationState): void {
    const growth = growthAt(state.time);
    const height = GEOMETRY.stemHeight * growth.stem;
    const bend = state.stem.value * 2.8;
    const xAt = (fraction: number): number =>
      GEOMETRY.baseX + bend * fraction * fraction;
    this.plant.setAttribute('opacity', String(growth.opacity));
    this.stem.setAttribute(
      'd',
      `M${GEOMETRY.baseX} ${GEOMETRY.baseY} Q${GEOMETRY.baseX} ${GEOMETRY.baseY - height * 0.5} ${xAt(growth.stem)} ${GEOMETRY.baseY - height}`,
    );
    this.stem.setAttribute('stroke-width', String(3 + growth.stem * 3));
    this.tip.setAttribute('cx', String(xAt(growth.stem)));
    this.tip.setAttribute('cy', String(GEOMETRY.baseY - height));
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
        `translate(${xAt(definition.height)} ${GEOMETRY.baseY - definition.height * GEOMETRY.stemHeight}) rotate(${angle}) scale(${definition.side * scale} ${scale * (0.35 + leaf.unfurl.value * 0.65)})`,
      );
    });
    this.phase.textContent = growth.phase;
    this.progress.style.transform = `scaleX(${growth.progress})`;
    this.elapsed.textContent = `${state.time.toFixed(1).padStart(4, '0')} / ${CONFIG.cycle}s`;
  }
}
