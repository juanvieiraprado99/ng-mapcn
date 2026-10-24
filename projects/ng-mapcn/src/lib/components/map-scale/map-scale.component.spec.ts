import { ApplicationRef, NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderMap, update } from '../../../testing/render';
import { trackZoneRun } from '../../../testing/zone';
import { MapScaleComponent } from './map-scale.component';

const TEMPLATE = `
  <ng-map [center]="[0, 0]" [zoom]="0">
    @if (show) {
      <ng-map-scale
        [unit]="unit"
        [position]="position"
        [maxWidth]="maxWidth"
        [labels]="labels"
        [className]="className"
      />
    }
  </ng-map>
`;

function hostDefaults(): Record<string, unknown> {
  return {
    show: true,
    unit: 'metric',
    position: 'bottom-left',
    maxWidth: 100,
    labels: undefined,
    className: undefined,
  };
}

async function render(hostProps: Record<string, unknown> = {}) {
  const host = { ...hostDefaults(), ...hostProps };
  const result = await renderMap(TEMPLATE, { imports: [MapScaleComponent], hostProps: host });
  return { ...result, map: result.map! };
}

const format = (unit: string, value: number) =>
  new Intl.NumberFormat('en-US', { style: 'unit', unit, unitDisplay: 'short' }).format(value);

const q = <T extends HTMLElement = HTMLElement>(
  map: { getContainer(): HTMLElement },
  selector: string,
) => map.getContainer().querySelector<T>(selector)!;

describe('MapScaleComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('renders in bottom-left by default', async () => {
    const { map } = await render();
    expect(q(map, '.maplibregl-ctrl-bottom-left .ng-scale')).not.toBeNull();
  });

  it('mounts in the corner of its position', async () => {
    const { map } = await render({ position: 'top-right' });
    expect(q(map, '.maplibregl-ctrl-top-right .ng-scale')).not.toBeNull();
  });

  it('shows a round metric label and a matching bar width', async () => {
    const { map } = await render();
    expect(q(map, '.ng-scale-label').textContent).toBe(format('kilometer', 5000));
    expect(q(map, '.ng-scale-bar').style.width).toBe('63.88px');
  });

  it('updates on move once per frame', async () => {
    const { map } = await render();

    map.jumpTo({ zoom: 10 });
    vi.advanceTimersToNextFrame();
    expect(q(map, '.ng-scale-label').textContent).toBe(format('kilometer', 5));

    const raf = vi.spyOn(window, 'requestAnimationFrame');
    map.fire('move');
    map.fire('move');
    map.fire('move');
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it('writes the reading without entering the zone or ticking per move', async () => {
    const { map } = await render();
    const zone = trackZoneRun();
    const tick = vi.spyOn(TestBed.inject(ApplicationRef), 'tick');

    map.jumpTo({ zoom: 10 });
    map.fire('move');
    vi.advanceTimersToNextFrame();

    expect(q(map, '.ng-scale-label').textContent).toBe(format('kilometer', 5));
    expect(zone.runs).toBe(0);
    expect(tick).not.toHaveBeenCalled();
  });

  it('schedules the frame outside the zone, whichever zone fired the move', async () => {
    const { map } = await render();
    const outside = vi.spyOn(TestBed.inject(NgZone), 'runOutsideAngular');
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame');
    outside.mockImplementation(((fn: () => unknown) => {
      expect(raf).not.toHaveBeenCalled();
      return fn();
    }) as NgZone['runOutsideAngular']);

    map.fire('move');

    expect(outside).toHaveBeenCalledTimes(1);
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it('adds the className and keeps ng-scale', async () => {
    const { map } = await render({ className: 'extra' });
    const card = q(map, '.ng-scale');
    expect(card.classList).toContain('extra');
    expect(card.classList).toContain('ng-scale');
  });

  it('shows two bars, metric first, for both', async () => {
    const { map } = await render({ unit: 'both' });
    const bars = map.getContainer().querySelectorAll('.ng-scale-bar');
    const labels = map.getContainer().querySelectorAll('.ng-scale-label');
    expect(bars).toHaveLength(2);
    expect(labels[0].textContent).toBe(format('kilometer', 5000));
    expect(labels[1].textContent).toBe(format('mile', 2000));
  });

  it('switches the rows and redraws when the unit changes', async () => {
    const { fixture, map } = await render();
    update(fixture, { unit: 'imperial' });
    await fixture.whenStable();
    expect(map.getContainer().querySelectorAll('.ng-scale-bar')).toHaveLength(1);
    expect(q(map, '.ng-scale-label').textContent).toBe(format('mile', 2000));
  });

  it('exposes an accessible name', async () => {
    const { map } = await render();
    const card = q(map, '.ng-scale');
    expect(card.getAttribute('role')).toBe('img');
    expect(card.getAttribute('aria-label')).toBe(`Map scale: ${format('kilometer', 5000)}`);
  });

  it('uses a label override in the accessible name', async () => {
    const { map } = await render({ labels: { scale: 'Escala' } });
    expect(q(map, '.ng-scale').getAttribute('aria-label')).toMatch(/^Escala: /);
  });

  it('stays finite at the pole', async () => {
    const { map } = await render();
    map.jumpTo({ center: [0, 90], zoom: 3 });
    vi.advanceTimersToNextFrame();
    expect(q(map, '.ng-scale-bar').style.width).not.toMatch(/NaN|Infinity/);
    expect(q(map, '.ng-scale-label').textContent).not.toMatch(/NaN|Infinity/);
  });

  it('removes its move listener on destroy and cancels a pending frame', async () => {
    const { fixture, map } = await render({ show: false });
    const before = map.listenerCount('move');

    update(fixture, { show: true });
    await fixture.whenStable();
    expect(map.listenerCount('move')).toBe(before + 1);

    map.fire('move');
    update(fixture, { show: false });
    await fixture.whenStable();
    expect(map.listenerCount('move')).toBe(before);
    expect(() => vi.advanceTimersToNextFrame()).not.toThrow();
  });
});
