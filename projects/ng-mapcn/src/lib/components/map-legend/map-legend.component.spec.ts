import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderMap, update } from '../../../testing/render';
import { MapLegendComponent, type MapLegendSection } from './map-legend.component';

const TEMPLATE = `
  <ng-map [center]="[0, 0]" [zoom]="0">
    <ng-map-legend
      [sections]="sections"
      [title]="title"
      [position]="position"
      [collapsible]="collapsible"
      [(collapsed)]="collapsed"
      [labels]="labels"
      [className]="className"
    >
      @if (extra) {
        <p class="projected">Extra</p>
      }
    </ng-map-legend>
  </ng-map>
`;

function hostDefaults(): Record<string, unknown> {
  return {
    sections: [],
    title: undefined,
    position: 'top-left',
    collapsible: false,
    collapsed: false,
    labels: undefined,
    className: undefined,
    extra: false,
  };
}

async function render(hostProps: Record<string, unknown> = {}) {
  const host = { ...hostDefaults(), ...hostProps };
  const result = await renderMap(TEMPLATE, { imports: [MapLegendComponent], hostProps: host });
  return { ...result, map: result.map! };
}

const q = <T extends HTMLElement = HTMLElement>(
  map: { getContainer(): HTMLElement },
  selector: string,
) => map.getContainer().querySelector<T>(selector)!;
const qa = (map: { getContainer(): HTMLElement }, selector: string) =>
  Array.from(map.getContainer().querySelectorAll<HTMLElement>(selector));

// The DOM serialises hex colors as rgb(); run the expected value through the same parser.
const normalized = (image: string) => {
  const el = document.createElement('div');
  el.style.backgroundImage = image;
  return el.style.backgroundImage;
};

const categories = (title?: string): MapLegendSection => ({
  type: 'categories',
  title,
  entries: [
    { color: '#ff0000', label: 'Red' },
    { color: '#00ff00', label: 'Line', shape: 'line' },
  ],
});
const gradient: MapLegendSection = {
  type: 'gradient',
  title: 'Density',
  stops: [
    { color: '#000', value: 0 },
    { color: '#fff', value: 100 },
  ],
};

describe('MapLegendComponent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('renders categories', async () => {
    const { map } = await render({ sections: [categories()] });
    const entries = qa(map, '.ng-legend-entry');
    expect(entries).toHaveLength(2);
    expect(entries[0].textContent).toContain('Red');
    expect(entries[1].textContent).toContain('Line');
    const swatch = entries[0].querySelector<HTMLElement>('.ng-legend-swatch')!;
    expect(swatch.getAttribute('aria-hidden')).toBe('true');
    expect(swatch.style.backgroundColor).not.toBe('');
    expect(swatch.classList).not.toContain('ng-legend-swatch--line');
    expect(entries[1].querySelector('.ng-legend-swatch--line')).not.toBeNull();
  });

  it('renders a gradient', async () => {
    const { map } = await render({ sections: [gradient] });
    expect(q(map, '.ng-legend-gradient').style.backgroundImage).toBe(
      normalized('linear-gradient(to right, #000, #fff)'),
    );
    const values = qa(map, '.ng-legend-gradient-label');
    expect(values[0].textContent).toBe('0');
    expect(values[1].textContent).toBe('100');
  });

  // jsdom has no layout: a 200px bar where each label is `width` wide, placed like the CSS does
  // (first left-aligned, last right-aligned, middle centred on its fraction).
  function stubLabelLayout(width: number): void {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      if (!this.classList.contains('ng-legend-gradient-label')) return new DOMRect();
      const at = (parseFloat((this as HTMLElement).style.left) / 100) * 200;
      const left = this.classList.contains('ng-legend-gradient-label--first')
        ? at
        : this.classList.contains('ng-legend-gradient-label--last')
          ? at - width
          : at - width / 2;
      return new DOMRect(left, 0, width, 10);
    });
  }
  const fiveStops = [0, 25, 50, 75, 100].map((value) => ({ color: '#000', value }));
  const hiddenLabels = (map: { getContainer(): HTMLElement }) =>
    qa(map, '.ng-legend-gradient-label').map((l) => l.hidden);

  it('keeps middle labels that fit at their fraction', async () => {
    stubLabelLayout(10);
    const { map } = await render({ sections: [{ type: 'gradient', stops: fiveStops }] });
    const labels = qa(map, '.ng-legend-gradient-label');
    expect(labels.map((l) => l.textContent)).toEqual(['0', '25', '50', '75', '100']);
    expect(labels.map((l) => l.style.left)).toEqual(['0%', '25%', '50%', '75%', '100%']);
    expect(hiddenLabels(map)).toEqual([false, false, false, false, false]);
  });

  it('hides middle labels that would overlap, greedily left to right', async () => {
    stubLabelLayout(60);
    const { map } = await render({ sections: [{ type: 'gradient', stops: fiveStops }] });
    // 25 overlaps the first label, 50 clears it, 75 overlaps 50.
    expect(hiddenLabels(map)).toEqual([false, true, false, true, false]);
  });

  it('never hides the first and last labels', async () => {
    stubLabelLayout(500);
    const { map } = await render({ sections: [{ type: 'gradient', stops: fiveStops }] });
    expect(hiddenLabels(map)).toEqual([false, true, true, true, false]);
  });

  it('measures again when the sections change', async () => {
    stubLabelLayout(60);
    const { fixture, map } = await render({ sections: [{ type: 'gradient', stops: fiveStops }] });
    update(fixture, { sections: [{ type: 'gradient', stops: fiveStops.slice(0, 3) }] });
    await fixture.whenStable();
    expect(hiddenLabels(map)).toEqual([false, false, false]);
  });

  it('measures again once web fonts have loaded', async () => {
    let loaded!: () => void;
    const ready = new Promise<void>((resolve) => (loaded = resolve));
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } });
    try {
      stubLabelLayout(10);
      const { map } = await render({ sections: [{ type: 'gradient', stops: fiveStops }] });
      expect(hiddenLabels(map)).toEqual([false, false, false, false, false]);

      // The fallback font was narrower than the web font that just arrived.
      vi.restoreAllMocks();
      stubLabelLayout(60);
      loaded();
      await ready;
      await Promise.resolve();

      expect(hiddenLabels(map)).toEqual([false, true, false, true, false]);
    } finally {
      delete (document as { fonts?: unknown }).fonts;
    }
  });

  it('formats gradient values with format', async () => {
    const { map } = await render({
      sections: [{ ...gradient, format: (v: number | string) => `${v}%` }],
    });
    const values = qa(map, '.ng-legend-gradient-label');
    expect(values[0].textContent).toBe('0%');
    expect(values[1].textContent).toBe('100%');
  });

  it('single-stop gradient renders a solid bar', async () => {
    const { map } = await render({
      sections: [{ type: 'gradient', stops: [{ color: '#f00', value: 1 }] }],
    });
    expect(q(map, '.ng-legend-gradient').style.backgroundImage).toBe(
      normalized('linear-gradient(to right, #f00, #f00)'),
    );
  });

  it('stacks several sections in input order, each with its own title', async () => {
    const { map } = await render({ sections: [categories('Kinds'), gradient] });
    const sections = qa(map, '.ng-legend-section');
    expect(sections).toHaveLength(2);
    expect(sections[0].querySelector('.ng-legend-section-title')!.textContent).toBe('Kinds');
    expect(sections[0].querySelector('.ng-legend-entry')).not.toBeNull();
    expect(sections[1].querySelector('.ng-legend-section-title')!.textContent).toBe('Density');
    expect(sections[1].querySelector('.ng-legend-gradient')).not.toBeNull();
  });

  it('names the region from title or the default label', async () => {
    const { map, fixture } = await render({ title: 'Land use' });
    const card = q(map, '.ng-legend');
    expect(card.getAttribute('role')).toBe('region');
    expect(card.getAttribute('aria-label')).toBe('Land use');
    update(fixture, { title: undefined });
    await fixture.whenStable();
    expect(q(map, '.ng-legend').getAttribute('aria-label')).toBe('Map legend');
  });

  it('collapses through the header button and emits collapsedChange', async () => {
    const { map, fixture } = await render({ collapsible: true, sections: [categories()] });
    const button = q<HTMLButtonElement>(map, '.ng-legend-toggle');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Map legend, Hide legend');

    button.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.collapsed).toBe(true);
    expect(q(map, '.ng-legend-body')).toBeNull();
    const after = q<HTMLButtonElement>(map, '.ng-legend-toggle');
    expect(after.getAttribute('aria-expanded')).toBe('false');
    expect(after.getAttribute('aria-label')).toBe('Map legend, Show legend');
  });

  it('starts the toggle name with its visible title (WCAG 2.5.3)', async () => {
    const { map } = await render({ collapsible: true, title: 'Places', sections: [categories()] });
    const button = q<HTMLButtonElement>(map, '.ng-legend-toggle');

    expect(button.textContent).toContain('Places');
    expect(button.getAttribute('aria-label')).toBe('Places, Hide legend');
  });

  it('has no button when not collapsible', async () => {
    const { map } = await render({ sections: [categories()] });
    expect(q(map, '.ng-legend-toggle')).toBeNull();
  });

  it('renders projected content after the sections, alone when sections is empty', async () => {
    const { map, fixture } = await render({ extra: true, sections: [categories()] });
    const body = q(map, '.ng-legend-body');
    const projected = q(map, '.maplibregl-ctrl-top-left .projected');
    expect(projected).not.toBeNull();
    expect(body.lastElementChild).toBe(projected);

    update(fixture, { sections: [] });
    await fixture.whenStable();
    expect(qa(map, '.ng-legend-section')).toHaveLength(0);
    expect(q(map, '.maplibregl-ctrl-top-left .projected')).not.toBeNull();
  });

  it('keeps projected content after a position change remounts the control', async () => {
    const { map, fixture } = await render({ extra: true });
    update(fixture, { position: 'bottom-right' });
    await fixture.whenStable();
    expect(q(map, '.maplibregl-ctrl-bottom-right .projected')).not.toBeNull();
    expect(qa(map, '.projected')).toHaveLength(1);
  });

  it('adds the className and keeps ng-legend', async () => {
    const { map } = await render({ className: 'extra other' });
    const card = q(map, '.ng-legend');
    expect(card.classList).toContain('extra');
    expect(card.classList).toContain('other');
    expect(card.classList).toContain('ng-legend');
  });

  it('defaults to top-left', async () => {
    const { map } = await render();
    expect(q(map, '.maplibregl-ctrl-top-left .ng-legend')).not.toBeNull();
  });

  it('uses label overrides', async () => {
    const { map } = await render({ collapsible: true, labels: { hideLegend: 'Ocultar' } });
    expect(q(map, '.ng-legend-toggle').getAttribute('aria-label')).toBe('Map legend, Ocultar');
  });
});
