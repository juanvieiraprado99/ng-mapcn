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

  it('labels the middle stops at their fraction when there are at most 5 stops', async () => {
    const stops = [0, 50, 100].map((value) => ({ color: '#000', value }));
    const { map } = await render({ sections: [{ type: 'gradient', stops }] });
    const labels = qa(map, '.ng-legend-gradient-label');
    expect(labels.map((l) => l.textContent)).toEqual(['0', '50', '100']);
    expect(labels.map((l) => l.style.left)).toEqual(['0%', '50%', '100%']);
  });

  it('labels only the first and last stop with more than 5 stops', async () => {
    const stops = [0, 1, 2, 3, 4, 5].map((value) => ({ color: '#000', value }));
    const { map } = await render({
      sections: [{ type: 'gradient', stops, format: (v: number | string) => `${v}u` }],
    });
    const labels = qa(map, '.ng-legend-gradient-label');
    expect(labels.map((l) => l.textContent)).toEqual(['0u', '5u']);
    expect(labels.map((l) => l.style.left)).toEqual(['0%', '100%']);
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
    expect(button.getAttribute('aria-label')).toBe('Hide legend');

    button.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.collapsed).toBe(true);
    expect(q(map, '.ng-legend-body')).toBeNull();
    const after = q<HTMLButtonElement>(map, '.ng-legend-toggle');
    expect(after.getAttribute('aria-expanded')).toBe('false');
    expect(after.getAttribute('aria-label')).toBe('Show legend');
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
    expect(q(map, '.ng-legend-toggle').getAttribute('aria-label')).toBe('Ocultar');
  });
});
