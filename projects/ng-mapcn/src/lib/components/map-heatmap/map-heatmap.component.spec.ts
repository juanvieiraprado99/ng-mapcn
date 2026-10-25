import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadAndSettle,
  reloadStyle,
  renderMap,
  structuralCalls,
  update,
} from '../../../testing/render';
import { defaultHeatmapGradients, MapHeatmapComponent } from './map-heatmap.component';

const TEMPLATE = `
  <ng-map [theme]="theme" (mapError)="mapError($event)">
    @if (show) {
      <ng-map-heatmap
        [data]="data"
        [id]="id"
        [beforeId]="beforeId"
        [weightProperty]="weightProperty"
        [weightRange]="weightRange"
        [radius]="radius"
        [intensity]="intensity"
        [opacity]="opacity"
        [gradient]="gradient"
        [minZoom]="minZoom"
        [maxZoom]="maxZoom"
        [paint]="paint"
      />
    }
  </ng-map>
`;

const DATA: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { mag: 4 },
      geometry: { type: 'Point', coordinates: [1, 2] },
    },
  ],
};

function hostDefaults(): Record<string, any> {
  return {
    theme: 'light',
    show: true,
    data: DATA,
    id: 'h',
    beforeId: undefined,
    weightProperty: undefined,
    weightRange: [0, 1],
    radius: 30,
    intensity: 1,
    opacity: 1,
    gradient: undefined,
    minZoom: 0,
    maxZoom: 24,
    paint: undefined,
    mapError: vi.fn(),
  };
}

async function render(hostProps: Record<string, unknown> = {}) {
  const host = { ...hostDefaults(), ...hostProps };
  const result = await renderMap(TEMPLATE, { imports: [MapHeatmapComponent], hostProps: host });
  return { ...result, map: result.map!, host };
}

async function renderLoaded(hostProps: Record<string, unknown> = {}) {
  const result = await render(hostProps);
  loadAndSettle(result.fixture, result.map);
  return result;
}

const SOURCE = 'heatmap-source-h';
const LAYER = 'heatmap-layer-h';

const ramp = (stops: unknown[]) => ['interpolate', ['linear'], ['heatmap-density'], ...stops];

describe('MapHeatmapComponent', () => {
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
    it('adds nothing before load, then the source before the layer', async () => {
      const { fixture, map, ctx } = await render();

      expect(ctx.isLoaded()).toBe(false);
      expect(structuralCalls(map)).toEqual([]);

      loadAndSettle(fixture, map);

      expect(structuralCalls(map)).toEqual([`addSource:${SOURCE}`, `addLayer:${LAYER}`]);
    });

    it('generates ids when none is given', async () => {
      const { fixture, map } = await render({ id: undefined });
      loadAndSettle(fixture, map);

      const added = map.calls.find((c) => c.startsWith('addSource:'));
      expect(added).toMatch(/^addSource:heatmap-source-ng-heatmap-\d+$/);
    });
  });

  describe('theme switch', () => {
    it('re-adds the source and layer with the theme gradient', async () => {
      const { fixture, map } = await renderLoaded();
      expect(map.getLayer(LAYER).paint['heatmap-color']).toEqual(
        ramp(defaultHeatmapGradients.light.flat()),
      );

      update(fixture, { theme: 'dark' });
      expect(map.getLayerOrder()).toEqual([]);
      reloadStyle(fixture, map);

      expect(map.getLayerOrder()).toEqual([LAYER]);
      expect(structuralCalls(map).filter((c) => c === `addLayer:${LAYER}`)).toHaveLength(2);
      expect(map.getLayer(LAYER).paint['heatmap-color']).toEqual(
        ramp(defaultHeatmapGradients.dark.flat()),
      );
    });

    it('keeps a custom gradient across a theme switch', async () => {
      const gradient = [
        [0, '#000000'],
        [1, '#ffffff'],
      ];
      const { fixture, map } = await renderLoaded({ gradient });

      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);

      expect(map.getLayer(LAYER).paint['heatmap-color']).toEqual(
        ramp([0, '#000000', 1, '#ffffff']),
      );
    });
  });

  describe('initial definition', () => {
    it('creates a heatmap layer with the defaults', async () => {
      const { map } = await renderLoaded();
      const layer = map.getLayer(LAYER);

      expect(layer.type).toBe('heatmap');
      expect(layer.source).toBe(SOURCE);
      expect(layer.minzoom).toBe(0);
      expect(layer.maxzoom).toBe(24);
      expect(layer.paint['heatmap-radius']).toBe(30);
      expect(layer.paint['heatmap-intensity']).toBe(1);
      expect(layer.paint['heatmap-opacity']).toBe(1);
      expect(layer.paint['heatmap-weight']).toBeUndefined();
      expect(map.getSource(SOURCE).type).toBe('geojson');
    });

    it('passes object and URL data through to the source', async () => {
      const { map } = await renderLoaded();
      expect(map.getSource(SOURCE).data).toBe(DATA);
    });

    it('passes a URL through to the source', async () => {
      const { map } = await renderLoaded({ data: 'https://example.com/a.geojson' });
      expect(map.getSource(SOURCE).data).toBe('https://example.com/a.geojson');
    });

    it('builds the weight expression from weightProperty and weightRange', async () => {
      const { map } = await renderLoaded({ weightProperty: 'mag', weightRange: [0, 7.5] });

      expect(map.getLayer(LAYER).paint['heatmap-weight']).toEqual([
        'interpolate',
        ['linear'],
        ['coalesce', ['to-number', ['get', 'mag']], 0],
        0,
        0,
        7.5,
        1,
      ]);
    });

    it('sorts the gradient and prepends a transparent stop at 0', async () => {
      const { map } = await renderLoaded({
        gradient: [
          [1, '#ff0000'],
          [0.5, '#00ff00'],
        ],
      });

      expect(map.getLayer(LAYER).paint['heatmap-color']).toEqual(
        ramp([0, 'rgba(0, 0, 0, 0)', 0.5, '#00ff00', 1, '#ff0000']),
      );
    });

    it('falls back to the theme gradient when the gradient is empty', async () => {
      const { map } = await renderLoaded({ gradient: [] });

      expect(map.getLayer(LAYER).paint['heatmap-color']).toEqual(
        ramp(defaultHeatmapGradients.light.flat()),
      );
    });

    it('accepts expressions and forwards the zoom range', async () => {
      const expr = ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20];
      const { map } = await renderLoaded({ radius: expr, minZoom: 2, maxZoom: 9 });

      expect(map.getLayer(LAYER).paint['heatmap-radius']).toEqual(expr);
      expect(map.getLayer(LAYER).minzoom).toBe(2);
      expect(map.getLayer(LAYER).maxzoom).toBe(9);
    });

    it('lets paint override everything else', async () => {
      const { map } = await renderLoaded({
        paint: { 'heatmap-radius': 5, 'heatmap-opacity': 0.4 },
      });

      expect(map.getLayer(LAYER).paint['heatmap-radius']).toBe(5);
      expect(map.getLayer(LAYER).paint['heatmap-opacity']).toBe(0.4);
      expect(map.getLayer(LAYER).paint['heatmap-intensity']).toBe(1);
    });
  });

  describe('beforeId', () => {
    it('inserts the layer before the given layer, at creation only', async () => {
      const { fixture, map } = await render({ beforeId: 'base-layer' });
      map.addLayer({ id: 'base-layer', type: 'background' } as never);
      const addLayer = vi.spyOn(map, 'addLayer');
      loadAndSettle(fixture, map);

      expect(addLayer).toHaveBeenCalledTimes(1);
      expect(addLayer.mock.calls[0][1]).toBe('base-layer');
      expect(map.getLayerOrder()).toEqual([LAYER, 'base-layer']);

      addLayer.mockClear();
      update(fixture, { beforeId: 'other' });
      expect(addLayer).not.toHaveBeenCalled();
    });
  });

  describe('reconcile, do not recreate (invariant 2)', () => {
    it('updates paint through setPaintProperty only', async () => {
      const { fixture, map } = await renderLoaded();
      vi.mocked(map.setPaintProperty).mockClear();
      map.calls.length = 0;

      update(fixture, { radius: 12, intensity: 2, opacity: 0.5 });

      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'heatmap-radius', 12);
      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'heatmap-intensity', 2);
      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'heatmap-opacity', 0.5);
      expect(structuralCalls(map)).toEqual([]);
    });

    it('calls setData once for new data, and not for the creation data', async () => {
      const { fixture, map } = await renderLoaded();
      const source = map.getSource(SOURCE);
      expect(source.setData).not.toHaveBeenCalled();
      const next: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: 'FeatureCollection',
        features: [],
      };

      update(fixture, { data: next });

      expect(source.setData).toHaveBeenCalledExactlyOnceWith(next);
      expect(map.getSource(SOURCE)).toBe(source);

      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);
      expect(map.getSource(SOURCE).setData).not.toHaveBeenCalled();
    });

    it('calls setLayerZoomRange only when the range changes', async () => {
      const { fixture, map } = await renderLoaded({ maxZoom: 6 });
      expect(map.setLayerZoomRange).not.toHaveBeenCalled();

      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);
      expect(map.setLayerZoomRange).not.toHaveBeenCalled();

      update(fixture, { maxZoom: 8 });
      expect(map.setLayerZoomRange).toHaveBeenCalledExactlyOnceWith(LAYER, 0, 8);
      expect(map.getLayer(LAYER).maxzoom).toBe(8);
    });

    it('resets keys that are no longer applied', async () => {
      const { fixture, map } = await renderLoaded({ weightProperty: 'mag' });
      expect(map.getLayer(LAYER).paint['heatmap-weight']).toBeDefined();

      update(fixture, { weightProperty: undefined });

      expect(map.getLayer(LAYER).paint['heatmap-weight']).toBeUndefined();
    });

    it('reverts a paint override to the input value when removed', async () => {
      const { fixture, map } = await renderLoaded({ paint: { 'heatmap-radius': 5 } });
      expect(map.getLayer(LAYER).paint['heatmap-radius']).toBe(5);

      update(fixture, { paint: undefined });

      expect(map.getLayer(LAYER).paint['heatmap-radius']).toBe(30);
    });
  });

  describe('teardown (invariant 4)', () => {
    it('removes the layer before the source', async () => {
      const { fixture, map } = await renderLoaded();
      map.calls.length = 0;

      update(fixture, { show: false });

      expect(structuralCalls(map)).toEqual([`removeLayer:${LAYER}`, `removeSource:${SOURCE}`]);
    });

    it('does not throw when removeLayer throws', async () => {
      const { fixture, map } = await renderLoaded();
      vi.spyOn(map, 'removeLayer').mockImplementation(() => {
        throw new Error('style reloading');
      });

      expect(() => update(fixture, { show: false })).not.toThrow();
    });
  });

  describe('creation failures', () => {
    const FAIL_TEMPLATE = `
      <ng-map (mapError)="mapError($event)">
        <ng-map-heatmap id="dup" [data]="data" [paint]="{ 'heatmap-radius': 11 }" />
        <ng-map-heatmap [id]="secondId" [data]="secondData" [beforeId]="beforeId"
          [paint]="secondPaint" />
      </ng-map>
    `;

    async function renderFailing(props: Record<string, unknown>) {
      const host = {
        data: DATA,
        secondData: DATA,
        secondId: 'dup',
        beforeId: undefined,
        secondPaint: { 'heatmap-radius': 22 },
        mapError: vi.fn(),
        ...props,
      };
      const result = await renderMap(FAIL_TEMPLATE, {
        imports: [MapHeatmapComponent],
        hostProps: host,
      });
      vi.spyOn(console, 'error').mockImplementation(() => {});
      return { ...result, map: result.map!, host };
    }

    it('reports a duplicate id through mapError without touching the owner', async () => {
      const { fixture, map, host } = await renderFailing({});

      expect(() => loadAndSettle(fixture, map)).not.toThrow();
      expect(host.mapError).toHaveBeenCalledTimes(1);
      expect(host.mapError.mock.calls[0][0].message).toContain('already exists');

      const ownSource = map.getSource('heatmap-source-dup');
      update(fixture, {
        secondPaint: { 'heatmap-radius': 33 },
        secondData: { type: 'FeatureCollection', features: [] },
      });
      expect(map.getLayer('heatmap-layer-dup').paint['heatmap-radius']).toBe(11);
      expect(ownSource.setData).not.toHaveBeenCalled();
    });

    it('reports an unknown beforeId without throwing', async () => {
      const { fixture, map, host } = await renderFailing({
        secondId: 'other',
        beforeId: 'missing',
      });

      expect(() => loadAndSettle(fixture, map)).not.toThrow();
      expect(host.mapError).toHaveBeenCalled();
      expect(map.getLayer('heatmap-layer-other')).toBeUndefined();
      expect(map.getSource('heatmap-source-other')).toBeUndefined();
      expect(map.getLayer('heatmap-layer-dup')).toBeDefined();
    });
  });

  describe('id change', () => {
    it('re-creates the source and layer', async () => {
      const { fixture, map } = await renderLoaded({ id: 'a' });

      update(fixture, { id: 'b' });

      expect(map.getSource('heatmap-source-a')).toBeUndefined();
      expect(map.getSource('heatmap-source-b')).toBeDefined();
      expect(map.getLayerOrder()).toEqual(['heatmap-layer-b']);
    });
  });
});
