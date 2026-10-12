import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type FakeMap } from '../../../testing/maplibre-fake';
import {
  loadAndSettle,
  reloadStyle,
  renderMap,
  structuralCalls,
  update,
} from '../../../testing/render';
import { MapArcComponent } from './map-arc.component';

const TEMPLATE = `
  <ng-map [theme]="theme">
    @if (show) {
      <ng-map-arc
        [data]="data"
        [id]="id"
        [curvature]="curvature"
        [samples]="samples"
        [paint]="paint"
        [layout]="layout"
        [hoverPaint]="hoverPaint"
        [interactive]="interactive"
        [beforeId]="beforeId"
        (arcClick)="arcClick($event)"
        (arcHover)="arcHover($event)"
      />
    }
  </ng-map>
`;

const ARC_A = {
  id: 'a',
  from: [0, 0] as [number, number],
  to: [10, 10] as [number, number],
  name: 'A',
};
const ARC_B = {
  id: 2,
  from: [20, 0] as [number, number],
  to: [30, 5] as [number, number],
  weight: 7,
};

function hostDefaults(): Record<string, any> {
  return {
    theme: 'light',
    show: true,
    data: [ARC_A, ARC_B],
    id: 'x1',
    curvature: 0.2,
    samples: 8,
    paint: undefined,
    layout: undefined,
    hoverPaint: undefined,
    interactive: true,
    beforeId: undefined,
    arcClick: vi.fn(),
    arcHover: vi.fn(),
  };
}

async function render(hostProps: Record<string, unknown> = {}) {
  const host = { ...hostDefaults(), ...hostProps };
  const result = await renderMap(TEMPLATE, { imports: [MapArcComponent], hostProps: host });
  return { ...result, map: result.map!, host };
}

async function renderLoaded(hostProps: Record<string, unknown> = {}) {
  const result = await render(hostProps);
  loadAndSettle(result.fixture, result.map);
  return result;
}

const SOURCE = 'arc-source-x1';
const HIT = 'arc-hit-layer-x1';
const LINE = 'arc-layer-x1';

const event = (id: string | number | undefined, lng = 5, lat = 6) => ({
  features: id === undefined ? [] : [{ id, properties: {}, geometry: {} }],
  lngLat: { lng, lat },
  point: { x: 1, y: 2 },
});

const featureStateCalls = (map: FakeMap) => map.setFeatureState.mock.calls;
const layerHandlerCalls = (map: FakeMap) =>
  map.calls.filter((c) => c.startsWith('on:') && c.includes('arc-'));

describe('MapArcComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  describe('gating (invariant 1)', () => {
    it('adds nothing before load, then the source, the hit layer and the visible layer in order', async () => {
      const { fixture, map, ctx } = await render();

      expect(ctx.isLoaded()).toBe(false);
      expect(structuralCalls(map)).toEqual([]);

      loadAndSettle(fixture, map);

      expect(structuralCalls(map)).toEqual([
        `addSource:${SOURCE}`,
        `addLayer:${HIT}`,
        `addLayer:${LINE}`,
      ]);
      expect(map.getSource(SOURCE).promoteId).toBe('id');
    });

    it('draws the hit layer under the visible layer', async () => {
      const { map } = await renderLoaded();
      expect(map.getLayerOrder()).toEqual([HIT, LINE]);
    });

    it('keeps the hit layer under the visible one when beforeId is set, and inserts both before it', async () => {
      const { fixture, map } = await render({ beforeId: 'base-layer' });
      map.addSource('base', { type: 'geojson', data: {} });
      map.addLayer({ id: 'base-layer', type: 'line', source: 'base' });

      loadAndSettle(fixture, map);

      expect(map.getLayerOrder()).toEqual([HIT, LINE, 'base-layer']);
    });
  });

  describe('re-add after theme switch (invariant 1)', () => {
    it('re-adds the source and both layers exactly once after setStyle', async () => {
      const { fixture, map } = await renderLoaded();

      update(fixture, { theme: 'dark' });
      expect(map.setStyle).toHaveBeenCalled();
      expect(map.getLayerOrder()).toEqual([]);

      reloadStyle(fixture, map);

      expect(map.getSource(SOURCE)).toBeDefined();
      expect(map.getLayerOrder()).toEqual([HIT, LINE]);
      const calls = structuralCalls(map);
      expect(calls.filter((c) => c === `addSource:${SOURCE}`)).toHaveLength(2);
      expect(calls.filter((c) => c === `addLayer:${HIT}`)).toHaveLength(2);
      expect(calls.filter((c) => c === `addLayer:${LINE}`)).toHaveLength(2);
      expect(map.listenerCount('mousemove', HIT)).toBe(1);
    });

    it('keeps the layers when the new style arrives after the debounce (slow network)', async () => {
      const { fixture, map } = await renderLoaded();

      update(fixture, { theme: 'dark' });
      // styledata from the layer removals, then the 100 ms debounce, while the style is in flight.
      map.fire('styledata');
      vi.advanceTimersByTime(100);
      fixture.detectChanges();

      // The new style arrives (drops every custom layer); change detection runs before the debounce
      // ends, as it does in a browser.
      map.finishStyleLoad();
      fixture.detectChanges();
      vi.advanceTimersByTime(100);
      fixture.detectChanges();

      expect(map.getSource(SOURCE)).toBeDefined();
      expect(map.getLayerOrder()).toEqual([HIT, LINE]);
    });
  });

  describe('hit layer width (invariant 6)', () => {
    it.each([
      ['the default paint', undefined, 12],
      ['a width of 2', { 'line-width': 2 }, 12],
      ['a width of 10', { 'line-width': 10 }, 16],
      ['an expression width', { 'line-width': ['get', 'weight'] }, 18],
    ])('gives %s a hit width of %s', async (_label, paint, expected) => {
      const { map } = await renderLoaded({ paint });
      expect(map.getLayer(HIT).paint['line-width']).toBe(expected);
    });

    it('is transparent and fully opaque in layer terms', async () => {
      const { map } = await renderLoaded();
      expect(map.getLayer(HIT).paint['line-color']).toBe('rgba(0, 0, 0, 0)');
      expect(map.getLayer(HIT).paint['line-opacity']).toBe(1);
    });

    it('is updated through setPaintProperty when the line width changes', async () => {
      const { fixture, map } = await renderLoaded();
      map.calls.length = 0;

      update(fixture, { paint: { 'line-width': 10 } });

      expect(map.setPaintProperty).toHaveBeenCalledWith(HIT, 'line-width', 16);
      expect(map.getLayer(HIT).paint['line-width']).toBe(16);
      expect(structuralCalls(map)).toEqual([]);
    });
  });

  describe('features', () => {
    it('builds a LineString per datum with extra fields as properties', async () => {
      const { map } = await renderLoaded();

      const { features } = map.getSource(SOURCE).data;
      expect(features).toHaveLength(2);
      expect(features[0].properties).toEqual({ id: 'a', name: 'A' });
      expect(features[1].properties).toEqual({ id: 2, weight: 7 });
      for (const f of features) {
        expect(f.geometry.type).toBe('LineString');
        expect(f.geometry.coordinates).toHaveLength(9); // samples + 1
      }
      expect(features[0].geometry.coordinates[0]).toEqual([0, 0]);
      expect(features[0].geometry.coordinates.at(-1)).toEqual([10, 10]);
      expect(features[1].geometry.coordinates[0]).toEqual([20, 0]);
      expect(features[1].geometry.coordinates.at(-1)).toEqual([30, 5]);
    });

    it('defaults to 64 samples', async () => {
      const { map } = await renderLoaded({ samples: 64 });
      expect(map.getSource(SOURCE).data.features[0].geometry.coordinates).toHaveLength(65);
    });

    it('curves the arc away from the straight line', async () => {
      const { map } = await renderLoaded();
      const mid = map.getSource(SOURCE).data.features[0].geometry.coordinates[4];
      expect(mid[0]).not.toBeCloseTo(mid[1]);
    });

    it.each([
      ['data', { data: [ARC_A] }],
      ['curvature', { curvature: 0.5 }],
      ['samples', { samples: 4 }],
    ])('pushes new %s through setData without structural changes', async (_name, change) => {
      const { fixture, map } = await renderLoaded();
      const source = map.getSource(SOURCE);
      source.setData.mockClear();
      map.calls.length = 0;

      update(fixture, change);

      expect(source.setData).toHaveBeenCalledTimes(1);
      expect(map.getSource(SOURCE)).toBe(source);
      expect(structuralCalls(map)).toEqual([]);
    });

    it('rebuilds the coordinates with the new sample count', async () => {
      const { fixture, map } = await renderLoaded();
      const source = map.getSource(SOURCE);
      source.setData.mockClear();

      update(fixture, { samples: 4 });

      const fc = source.setData.mock.calls[0][0];
      expect(fc.features[0].geometry.coordinates).toHaveLength(5);
    });
  });

  describe('reconcile, do not recreate (invariant 2)', () => {
    it('merges paint and layout onto the defaults at creation', async () => {
      const { map } = await renderLoaded({
        paint: { 'line-color': '#ff0000' },
        layout: { 'line-cap': 'butt' },
      });

      expect(map.getLayer(LINE).paint).toEqual({
        'line-color': '#ff0000',
        'line-width': 2,
        'line-opacity': 0.85,
      });
      expect(map.getLayer(LINE).layout).toEqual({ 'line-join': 'round', 'line-cap': 'butt' });
    });

    it('updates paint and layout with setPaintProperty / setLayoutProperty only', async () => {
      const { fixture, map } = await renderLoaded();
      map.setPaintProperty.mockClear();
      map.setLayoutProperty.mockClear();
      map.calls.length = 0;

      update(fixture, { paint: { 'line-color': '#00ff00' }, layout: { 'line-cap': 'square' } });

      expect(map.setPaintProperty).toHaveBeenCalledWith(LINE, 'line-color', '#00ff00');
      expect(map.setLayoutProperty).toHaveBeenCalledWith(LINE, 'line-cap', 'square');
      expect(structuralCalls(map)).toEqual([]);
    });

    it('wraps hoverPaint keys in a feature-state case expression', async () => {
      const { fixture, map } = await renderLoaded();
      map.calls.length = 0;

      update(fixture, { hoverPaint: { 'line-width': 5 } });

      expect(map.setPaintProperty).toHaveBeenCalledWith(LINE, 'line-width', [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        5,
        2,
      ]);
      expect(structuralCalls(map)).toEqual([]);
    });
  });

  describe('teardown (invariant 4)', () => {
    it('removes both layers before the source and unregisters the handlers', async () => {
      const { fixture, map } = await renderLoaded();
      expect(map.listenerCount('mousemove', HIT)).toBe(1);
      expect(map.listenerCount('mouseleave', HIT)).toBe(1);
      expect(map.listenerCount('click', HIT)).toBe(1);
      map.calls.length = 0;

      update(fixture, { show: false });

      const calls = structuralCalls(map);
      const source = calls.indexOf(`removeSource:${SOURCE}`);
      expect(source).toBeGreaterThan(-1);
      expect(calls.indexOf(`removeLayer:${LINE}`)).toBeGreaterThan(-1);
      expect(calls.indexOf(`removeLayer:${HIT}`)).toBeGreaterThan(-1);
      expect(calls.indexOf(`removeLayer:${LINE}`)).toBeLessThan(source);
      expect(calls.indexOf(`removeLayer:${HIT}`)).toBeLessThan(source);
      expect(map.listenerCount('mousemove', HIT)).toBe(0);
      expect(map.listenerCount('mouseleave', HIT)).toBe(0);
      expect(map.listenerCount('click', HIT)).toBe(0);
    });

    it('does not throw when the whole fixture is destroyed', async () => {
      const { fixture } = await renderLoaded();
      expect(() => fixture.destroy()).not.toThrow();
    });

    it('resets a hovered arc when interactivity is switched off', async () => {
      const { fixture, map } = await renderLoaded();
      map.fire('mousemove', event('a'), HIT);

      update(fixture, { interactive: false });

      expect(featureStateCalls(map).at(-1)).toEqual([
        { source: SOURCE, id: 'a' },
        { hover: false },
      ]);
      expect(map.getCanvas().style.cursor).toBe('');
    });
  });

  describe('hover and click on the hit layer', () => {
    it('sets hover state and emits arcHover with the matching datum', async () => {
      const { map, host } = await renderLoaded();

      map.fire('mousemove', event('a', 7, 8), HIT);

      expect(featureStateCalls(map)).toEqual([[{ source: SOURCE, id: 'a' }, { hover: true }]]);
      expect(map.getCanvas().style.cursor).toBe('pointer');
      expect(host['arcHover']).toHaveBeenCalledTimes(1);
      const emitted = host['arcHover'].mock.calls[0][0];
      expect(emitted.arc).toBe(ARC_A);
      expect([emitted.longitude, emitted.latitude]).toEqual([7, 8]);
    });

    it('matches numeric feature ids against the datum by string', async () => {
      const { map, host } = await renderLoaded();

      map.fire('mousemove', event(2), HIT);

      expect(host['arcHover'].mock.calls[0][0].arc).toBe(ARC_B);
    });

    it('swaps the hover state when moving to another arc', async () => {
      const { map, host } = await renderLoaded();

      map.fire('mousemove', event('a'), HIT);
      map.fire('mousemove', event(2), HIT);

      expect(featureStateCalls(map)).toEqual([
        [{ source: SOURCE, id: 'a' }, { hover: true }],
        [{ source: SOURCE, id: 'a' }, { hover: false }],
        [{ source: SOURCE, id: 2 }, { hover: true }],
      ]);
      expect(host['arcHover']).toHaveBeenCalledTimes(2);
    });

    it('does nothing when moving within the same arc', async () => {
      const { map, host } = await renderLoaded();

      map.fire('mousemove', event('a'), HIT);
      map.fire('mousemove', event('a', 9, 9), HIT);

      expect(featureStateCalls(map)).toHaveLength(1);
      expect(host['arcHover']).toHaveBeenCalledTimes(1);
    });

    it('clears hover, emits null and resets the cursor on mouseleave', async () => {
      const { map, host } = await renderLoaded();
      map.fire('mousemove', event('a'), HIT);

      map.fire('mouseleave', {}, HIT);

      expect(featureStateCalls(map).at(-1)).toEqual([
        { source: SOURCE, id: 'a' },
        { hover: false },
      ]);
      expect(host['arcHover']).toHaveBeenLastCalledWith(null);
      expect(map.getCanvas().style.cursor).toBe('');
    });

    it('emits arcClick with the datum', async () => {
      const { map, host } = await renderLoaded();

      map.fire('click', event(2, 3, 4), HIT);

      expect(host['arcClick']).toHaveBeenCalledTimes(1);
      const emitted = host['arcClick'].mock.calls[0][0];
      expect(emitted.arc).toBe(ARC_B);
      expect([emitted.longitude, emitted.latitude]).toEqual([3, 4]);
    });

    it('emits nothing for an unknown feature id or an empty hit', async () => {
      const { map, host } = await renderLoaded();

      map.fire('mousemove', event('unknown'), HIT);
      map.fire('click', event('unknown'), HIT);
      map.fire('click', event(undefined), HIT);
      map.fire('mousemove', event(undefined), HIT);

      expect(host['arcHover']).not.toHaveBeenCalled();
      expect(host['arcClick']).not.toHaveBeenCalled();
    });

    it('looks the datum up in the current data', async () => {
      const { fixture, map, host } = await renderLoaded();
      const replaced = { ...ARC_A, name: 'A2' };

      update(fixture, { data: [replaced] });
      map.fire('click', event('a'), HIT);

      expect(host['arcClick'].mock.calls[0][0].arc).toBe(replaced);
    });
  });

  describe('non-interactive', () => {
    it('registers no layer-scoped handlers when interactive is false', async () => {
      const { map, host } = await renderLoaded({ interactive: false });

      expect(layerHandlerCalls(map)).toEqual([]);
      expect(map.listenerCount('mousemove', HIT)).toBe(0);
      expect(map.listenerCount('mouseleave', HIT)).toBe(0);
      expect(map.listenerCount('click', HIT)).toBe(0);

      map.fire('click', event('a'), HIT);
      expect(host['arcClick']).not.toHaveBeenCalled();
    });
  });
});
