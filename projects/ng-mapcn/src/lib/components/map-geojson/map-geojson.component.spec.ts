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
import { MapGeoJSONComponent } from './map-geojson.component';

const TEMPLATE = `
  <ng-map [theme]="theme">
    @if (show) {
      <ng-map-geojson
        [data]="data"
        [id]="id"
        [promoteId]="promoteId"
        [fillPaint]="fillPaint"
        [linePaint]="linePaint"
        [fillHoverPaint]="fillHoverPaint"
        [interactive]="interactive"
        [beforeId]="beforeId"
        (featureClick)="featureClick($event)"
        (featureHover)="featureHover($event)"
      />
    }
  </ng-map>
`;

const DATA: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { code: 'A' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      },
    },
  ],
};

function hostDefaults(): Record<string, any> {
  return {
    theme: 'light',
    show: true,
    data: DATA,
    id: 'g1',
    promoteId: undefined,
    fillPaint: undefined,
    linePaint: undefined,
    fillHoverPaint: undefined,
    interactive: false,
    beforeId: undefined,
    featureClick: vi.fn(),
    featureHover: vi.fn(),
  };
}

async function render(hostProps: Record<string, unknown> = {}) {
  const host = { ...hostDefaults(), ...hostProps };
  const result = await renderMap(TEMPLATE, { imports: [MapGeoJSONComponent], hostProps: host });
  return { ...result, map: result.map!, host };
}

async function renderLoaded(hostProps: Record<string, unknown> = {}) {
  const result = await render(hostProps);
  loadAndSettle(result.fixture, result.map);
  return result;
}

const SOURCE = 'geojson-source-g1';
const FILL = 'geojson-fill-g1';
const LINE = 'geojson-line-g1';

const feature = (id: number | string, extra: object = {}) => ({
  id,
  properties: { code: `F${id}` },
  geometry: { type: 'Point', coordinates: [1, 2] },
  ...extra,
});

const mouseEvent = (id: number | string, lng = 5, lat = 6) => ({
  features: [feature(id)],
  lngLat: { lng, lat },
  point: { x: 10, y: 20 },
});

const featureStateCalls = (map: FakeMap) => map.setFeatureState.mock.calls;

describe('MapGeoJSONComponent', () => {
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
    it('adds nothing before load, then the source before both layers', async () => {
      const { fixture, map, ctx } = await render();

      expect(ctx.isLoaded()).toBe(false);
      expect(structuralCalls(map)).toEqual([]);

      loadAndSettle(fixture, map);

      expect(structuralCalls(map)).toEqual([
        `addSource:${SOURCE}`,
        `addLayer:${FILL}`,
        `addLayer:${LINE}`,
      ]);
      expect(map.getLayerOrder()).toEqual([FILL, LINE]);
    });
  });

  describe('re-add after theme switch (invariant 1)', () => {
    it('re-adds the source and both layers exactly once, with the new theme colors', async () => {
      const { fixture, map } = await renderLoaded();
      expect(map.getLayer(FILL).paint['fill-color']).toBe('#d4d4d4');

      update(fixture, { theme: 'dark' });
      expect(map.setStyle).toHaveBeenCalled();
      expect(map.getSource(SOURCE)).toBeUndefined();
      expect(map.getLayerOrder()).toEqual([]);

      reloadStyle(fixture, map);

      expect(map.getSource(SOURCE)).toBeDefined();
      expect(map.getLayerOrder()).toEqual([FILL, LINE]);
      expect(structuralCalls(map).filter((c) => c === `addSource:${SOURCE}`)).toHaveLength(2);
      expect(structuralCalls(map).filter((c) => c === `addLayer:${FILL}`)).toHaveLength(2);
      expect(structuralCalls(map).filter((c) => c === `addLayer:${LINE}`)).toHaveLength(2);
      expect(map.getLayer(FILL).paint['fill-color']).toBe('#404040');
      expect(map.getLayer(LINE).paint['line-color']).toBe('#171717');
    });
  });

  describe('initial definition', () => {
    it('does not pass promoteId to the source when unset', async () => {
      const { map } = await renderLoaded();

      expect('promoteId' in map.getSource(SOURCE)).toBe(false);
      expect(map.getSource(SOURCE).data).toBe(DATA);
    });

    it('passes promoteId to the source when set', async () => {
      const { map } = await renderLoaded({ promoteId: 'code' });

      expect(map.getSource(SOURCE).promoteId).toBe('code');
    });

    it('uses the light default colors in the light theme', async () => {
      const { map } = await renderLoaded();

      expect(map.getLayer(FILL).paint['fill-color']).toBe('#d4d4d4');
      expect(map.getLayer(LINE).paint['line-color']).toBe('#ffffff');
      expect(map.getLayer(LINE).paint['line-width']).toBe(0.5);
    });

    it('uses the dark default colors in the dark theme', async () => {
      const { map } = await renderLoaded({ theme: 'dark' });

      expect(map.getLayer(FILL).paint['fill-color']).toBe('#404040');
      expect(map.getLayer(LINE).paint['line-color']).toBe('#171717');
    });

    it('merges fillPaint and linePaint onto the defaults', async () => {
      const { map } = await renderLoaded({
        fillPaint: { 'fill-opacity': 0.4 },
        linePaint: { 'line-width': 2 },
      });

      expect(map.getLayer(FILL).paint).toEqual({ 'fill-color': '#d4d4d4', 'fill-opacity': 0.4 });
      expect(map.getLayer(LINE).paint).toEqual({ 'line-color': '#ffffff', 'line-width': 2 });
    });

    it('lets fillPaint override the default color', async () => {
      const { map } = await renderLoaded({ fillPaint: { 'fill-color': '#123456' } });
      expect(map.getLayer(FILL).paint['fill-color']).toBe('#123456');
    });

    it('omits a layer whose paint is false and adds it back when toggled', async () => {
      const { fixture, map } = await renderLoaded({ fillPaint: false, linePaint: false });
      expect(map.getLayerOrder()).toEqual([]);
      expect(map.getSource(SOURCE)).toBeDefined();

      update(fixture, { fillPaint: undefined });
      expect(map.getLayerOrder()).toEqual([FILL]);

      update(fixture, { linePaint: undefined });
      expect(map.getLayerOrder()).toEqual([FILL, LINE]);

      update(fixture, { fillPaint: false });
      expect(map.getLayerOrder()).toEqual([LINE]);
    });

    it('forwards beforeId to addLayer for both layers', async () => {
      const { fixture, map } = await render({ beforeId: 'base-layer' });
      map.addSource('base', { type: 'geojson', data: DATA });
      map.addLayer({ id: 'base-layer', type: 'line', source: 'base' });

      loadAndSettle(fixture, map);

      expect(map.getLayerOrder()).toEqual([FILL, LINE, 'base-layer']);
    });
  });

  describe('reconcile, do not recreate (invariant 2)', () => {
    it('updates paint through setPaintProperty without structural changes', async () => {
      const { fixture, map } = await renderLoaded();
      map.setPaintProperty.mockClear();
      map.calls.length = 0;

      update(fixture, {
        fillPaint: { 'fill-color': '#abcdef' },
        linePaint: { 'line-width': 4 },
      });

      expect(map.setPaintProperty).toHaveBeenCalledWith(FILL, 'fill-color', '#abcdef');
      expect(map.setPaintProperty).toHaveBeenCalledWith(LINE, 'line-width', 4);
      expect(structuralCalls(map)).toEqual([]);
    });

    it('pushes new [data] through setData', async () => {
      const { fixture, map } = await renderLoaded();
      const next: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

      update(fixture, { data: next });

      // Looked up after the update: whether the source object survives is covered below.
      const setData = map.getSource(SOURCE).setData;
      expect(setData).toHaveBeenCalledWith(next);
    });

    // BUG: the source-creation effect reads `this.data()` (to build the initial source), so it
    // tracks it. A `[data]` change re-runs that effect: its cleanup removes both layers and the
    // source and it adds the source back. The layer-sync effect has no changed dependency, so the
    // layers are never re-added, and invariant 2 (never destroy/recreate) is violated.
    // Fix: read `this.data()` with `untracked()` when creating the source.
    it.fails('does not remove or re-add the source or layers when [data] changes', async () => {
      const { fixture, map } = await renderLoaded();
      const source = map.getSource(SOURCE);
      map.calls.length = 0;

      update(fixture, { data: { type: 'FeatureCollection', features: [] } });

      expect(structuralCalls(map)).toEqual([]);
      expect(map.getSource(SOURCE)).toBe(source);
    });

    // BUG: same root cause as above — the layers disappear after a `[data]` change.
    it.fails('keeps the fill and line layers present after [data] changes', async () => {
      const { fixture, map } = await renderLoaded();

      update(fixture, { data: { type: 'FeatureCollection', features: [] } });

      expect(map.getLayerOrder()).toEqual([FILL, LINE]);
    });
  });

  describe('declarative hover (invariant 5)', () => {
    it('wraps the hover paint keys in a feature-state case expression', async () => {
      const { map } = await renderLoaded({
        promoteId: 'code',
        fillHoverPaint: { 'fill-color': '#ff0000' },
      });

      expect(map.getLayer(FILL).paint['fill-color']).toEqual([
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        '#ff0000',
        '#d4d4d4',
      ]);
    });

    it('uses the hover value as-is for keys without a base value', async () => {
      const { map } = await renderLoaded({ fillHoverPaint: { 'fill-opacity': 0.9 } });
      expect(map.getLayer(FILL).paint['fill-opacity']).toBe(0.9);
    });

    it('sets hover state and emits featureHover on mousemove', async () => {
      const { map, host } = await renderLoaded({ interactive: true, promoteId: 'code' });

      map.fire('mousemove', mouseEvent(1, 7, 8), FILL);

      expect(featureStateCalls(map)).toEqual([[{ source: SOURCE, id: 1 }, { hover: true }]]);
      expect(map.getCanvas().style.cursor).toBe('pointer');
      expect(host['featureHover']).toHaveBeenCalledTimes(1);
      const emitted = host['featureHover'].mock.calls[0][0];
      expect(emitted.longitude).toBe(7);
      expect(emitted.latitude).toBe(8);
      expect(emitted.feature.id).toBe(1);
      expect(emitted.originalEvent.lngLat).toEqual({ lng: 7, lat: 8 });
    });

    it('swaps the hover state when moving to another feature', async () => {
      const { map, host } = await renderLoaded({ interactive: true });

      map.fire('mousemove', mouseEvent(1), FILL);
      map.fire('mousemove', mouseEvent(2), FILL);

      expect(featureStateCalls(map)).toEqual([
        [{ source: SOURCE, id: 1 }, { hover: true }],
        [{ source: SOURCE, id: 1 }, { hover: false }],
        [{ source: SOURCE, id: 2 }, { hover: true }],
      ]);
      expect(host['featureHover']).toHaveBeenCalledTimes(2);
    });

    it('does nothing when moving within the same feature', async () => {
      const { map, host } = await renderLoaded({ interactive: true });

      map.fire('mousemove', mouseEvent(1), FILL);
      map.fire('mousemove', mouseEvent(1, 9, 9), FILL);

      expect(featureStateCalls(map)).toHaveLength(1);
      expect(host['featureHover']).toHaveBeenCalledTimes(1);
    });

    it('ignores mousemove events without features', async () => {
      const { map, host } = await renderLoaded({ interactive: true });

      map.fire('mousemove', { features: [], lngLat: { lng: 0, lat: 0 } }, FILL);

      expect(featureStateCalls(map)).toHaveLength(0);
      expect(host['featureHover']).not.toHaveBeenCalled();
    });

    it('clears the hover state, emits null and resets the cursor on mouseleave', async () => {
      const { map, host } = await renderLoaded({ interactive: true });
      map.fire('mousemove', mouseEvent(1), FILL);

      map.fire('mouseleave', {}, FILL);

      expect(featureStateCalls(map).at(-1)).toEqual([{ source: SOURCE, id: 1 }, { hover: false }]);
      expect(host['featureHover']).toHaveBeenLastCalledWith(null);
      expect(map.getCanvas().style.cursor).toBe('');
    });

    it('clears a hovered feature when interactivity is switched off', async () => {
      const { fixture, map } = await renderLoaded({ interactive: true });
      map.fire('mousemove', mouseEvent(1), FILL);

      update(fixture, { interactive: false });

      expect(featureStateCalls(map).at(-1)).toEqual([{ source: SOURCE, id: 1 }, { hover: false }]);
      expect(map.listenerCount('mousemove', FILL)).toBe(0);
    });

    it('emits featureClick with the clicked feature', async () => {
      const { map, host } = await renderLoaded({ interactive: true });

      map.fire('click', mouseEvent(3, 1, 2), FILL);

      expect(host['featureClick']).toHaveBeenCalledTimes(1);
      const emitted = host['featureClick'].mock.calls[0][0];
      expect(emitted.feature.properties).toEqual({ code: 'F3' });
      expect([emitted.longitude, emitted.latitude]).toEqual([1, 2]);
    });

    it('does not emit featureClick when no feature is under the cursor', async () => {
      const { map, host } = await renderLoaded({ interactive: true });

      map.fire('click', { features: [], lngLat: { lng: 0, lat: 0 } }, FILL);

      expect(host['featureClick']).not.toHaveBeenCalled();
    });
  });

  describe('teardown (invariant 4)', () => {
    it('removes both layers before the source and unregisters the handlers', async () => {
      const { fixture, map } = await renderLoaded({ interactive: true });
      expect(map.listenerCount('mousemove', FILL)).toBe(1);
      expect(map.listenerCount('mouseleave', FILL)).toBe(1);
      expect(map.listenerCount('click', FILL)).toBe(1);
      map.calls.length = 0;

      update(fixture, { show: false });

      const calls = structuralCalls(map);
      expect(calls.at(-1)).toBe(`removeSource:${SOURCE}`);
      expect(calls.indexOf(`removeLayer:${FILL}`)).toBeGreaterThanOrEqual(0);
      expect(calls.indexOf(`removeLayer:${LINE}`)).toBeGreaterThanOrEqual(0);
      expect(calls.indexOf(`removeLayer:${FILL}`)).toBeLessThan(
        calls.indexOf(`removeSource:${SOURCE}`),
      );
      expect(calls.indexOf(`removeLayer:${LINE}`)).toBeLessThan(
        calls.indexOf(`removeSource:${SOURCE}`),
      );
      expect(map.listenerCount('mousemove', FILL)).toBe(0);
      expect(map.listenerCount('mouseleave', FILL)).toBe(0);
      expect(map.listenerCount('click', FILL)).toBe(0);
    });

    it('does not leave a hovered feature behind and does not throw', async () => {
      const { fixture, map } = await renderLoaded({ interactive: true });
      map.fire('mousemove', mouseEvent(1), FILL);

      expect(() => update(fixture, { show: false })).not.toThrow();

      // Either the state was reset explicitly or the source holding it is gone.
      const last = featureStateCalls(map).at(-1)!;
      expect(
        (last[1] as { hover: boolean }).hover === false || map.getSource(SOURCE) === undefined,
      ).toBe(true);
      expect(map.getCanvas().style.cursor).toBe('');
    });

    it('does not throw when the whole fixture is destroyed', async () => {
      const { fixture } = await renderLoaded({ interactive: true });
      expect(() => fixture.destroy()).not.toThrow();
    });
  });

  describe('non-interactive', () => {
    it('registers no handlers by default', async () => {
      const { map } = await renderLoaded();

      expect(map.calls.filter((c) => c.startsWith('on:') && c.endsWith(`:${FILL}`))).toEqual([]);
    });

    it('registers no handlers when fillPaint is false even if interactive', async () => {
      const { map } = await renderLoaded({ interactive: true, fillPaint: false });

      expect(map.calls.filter((c) => c.startsWith('on:') && c.includes('geojson'))).toEqual([]);
      expect(map.listenerCount('mousemove', FILL)).toBe(0);
    });
  });
});
