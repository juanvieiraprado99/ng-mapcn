import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadAndSettle,
  reloadStyle,
  renderMap,
  structuralCalls,
  update,
} from '../../../testing/render';
import { defaultExtrusionColors, MapFillExtrusionComponent } from './map-fill-extrusion.component';

const TEMPLATE = `
  <ng-map [theme]="theme" (mapError)="mapError($event)">
    @if (show) {
      <ng-map-fill-extrusion
        [id]="id"
        [source]="source"
        [sourceLayer]="sourceLayer"
        [heightProperty]="heightProperty"
        [baseProperty]="baseProperty"
        [color]="color"
        [opacity]="opacity"
        [minZoom]="minZoom"
        [maxZoom]="maxZoom"
        [filter]="filter"
        [beforeId]="beforeId"
        [paint]="paint"
      />
    }
  </ng-map>
`;

function hostDefaults(): Record<string, any> {
  return {
    theme: 'light',
    show: true,
    id: 'b',
    source: undefined,
    sourceLayer: undefined,
    heightProperty: undefined,
    baseProperty: undefined,
    color: undefined,
    opacity: undefined,
    minZoom: undefined,
    maxZoom: undefined,
    filter: undefined,
    beforeId: undefined,
    paint: undefined,
    mapError: vi.fn(),
  };
}

const CARTO = { type: 'vector', url: 'https://example.com/tiles.json' } as never;

async function render(
  hostProps: Record<string, unknown> = {},
  basemapSource: string | null = 'carto',
) {
  const host: Record<string, any> = { ...hostDefaults(), ...hostProps };
  const result = await renderMap(TEMPLATE, {
    imports: [MapFillExtrusionComponent],
    hostProps: host,
  });
  const map = result.map!;
  // The basemap's own vector source: `carto` in the earlier Carto styles, `protomaps` now.
  if (basemapSource) map.addSource(basemapSource, CARTO);
  map.calls.length = 0;
  return { ...result, map, host };
}

async function renderLoaded(
  hostProps: Record<string, unknown> = {},
  basemapSource: string | null = 'carto',
) {
  const result = await render(hostProps, basemapSource);
  loadAndSettle(result.fixture, result.map);
  return result;
}

const LAYER = 'fill-extrusion-layer-b';

describe('MapFillExtrusionComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  describe('defaults (Carto basemap)', () => {
    it('adds nothing before load, then one fill-extrusion layer on the basemap source', async () => {
      const { fixture, map, ctx } = await render();

      expect(ctx.isLoaded()).toBe(false);
      expect(structuralCalls(map)).toEqual([]);

      loadAndSettle(fixture, map);

      expect(structuralCalls(map)).toEqual([`addLayer:${LAYER}`]);
      const layer = map.getLayer(LAYER);
      expect(layer.type).toBe('fill-extrusion');
      expect(layer.source).toBe('carto');
      expect(layer['source-layer']).toBe('building');
      expect(layer.minzoom).toBe(14);
      expect(layer.paint['fill-extrusion-height']).toEqual([
        'coalesce',
        ['to-number', ['get', 'render_height']],
        0,
      ]);
      expect(layer.paint['fill-extrusion-base']).toEqual([
        'coalesce',
        ['to-number', ['get', 'render_min_height']],
        0,
      ]);
      expect(layer.paint['fill-extrusion-opacity']).toBe(0.8);
      expect(layer.paint['fill-extrusion-color']).toBe(defaultExtrusionColors.light);
      expect(layer.filter).toEqual(['!=', ['get', 'hide_3d'], true]);
    });

    it('generates an id when none is given', async () => {
      const { fixture, map } = await render({ id: undefined });
      loadAndSettle(fixture, map);

      expect(map.calls.find((c) => c.startsWith('addLayer:'))).toMatch(
        /^addLayer:fill-extrusion-layer-ng-fill-extrusion-\d+$/,
      );
    });
  });

  describe('current Carto styles (protomaps source)', () => {
    it('extrudes the buildings layer with its height and min_height', async () => {
      const { map } = await renderLoaded({}, 'protomaps');

      const layer = map.getLayer(LAYER);
      expect(layer.source).toBe('protomaps');
      expect(layer['source-layer']).toBe('buildings');
      expect(layer.paint['fill-extrusion-height']).toEqual([
        'coalesce',
        ['to-number', ['get', 'height']],
        0,
      ]);
      expect(layer.paint['fill-extrusion-base']).toEqual([
        'coalesce',
        ['to-number', ['get', 'min_height']],
        0,
      ]);
    });

    it('takes the schema defaults for an explicit protomaps source, under explicit inputs', async () => {
      const { map } = await renderLoaded(
        { source: 'protomaps', heightProperty: 'levels' },
        'protomaps',
      );

      const layer = map.getLayer(LAYER);
      expect(layer['source-layer']).toBe('buildings');
      expect(layer.paint['fill-extrusion-height']).toEqual([
        'coalesce',
        ['to-number', ['get', 'levels']],
        0,
      ]);
      expect(layer.paint['fill-extrusion-base']).toEqual([
        'coalesce',
        ['to-number', ['get', 'min_height']],
        0,
      ]);
    });

    it('waits for either Carto source and picks up the one the style brings', async () => {
      const { fixture, map } = await renderLoaded({}, null);
      expect(structuralCalls(map)).toEqual([]);

      map.addSource('protomaps', CARTO);
      map.fire('sourcedata');
      fixture.detectChanges();

      expect(map.getLayer(LAYER).source).toBe('protomaps');
    });

    it('follows the schema when a style swap moves from the earlier to the current tiles', async () => {
      const { fixture, map } = await renderLoaded();
      expect(map.getLayer(LAYER)['source-layer']).toBe('building');

      update(fixture, { theme: 'dark' });
      map.finishStyleLoad();
      map.addSource('protomaps', CARTO);
      reloadStyle(fixture, map);

      const layer = map.getLayer(LAYER);
      expect(layer.source).toBe('protomaps');
      expect(layer['source-layer']).toBe('buildings');
      expect(layer.paint['fill-extrusion-height']).toEqual([
        'coalesce',
        ['to-number', ['get', 'height']],
        0,
      ]);
    });
  });

  describe('custom source', () => {
    it('omits the source layer for a source other than the basemap one', async () => {
      const { fixture, map } = await render({ source: 'shapes' });
      map.addSource('shapes', { type: 'geojson', data: {} } as never);
      loadAndSettle(fixture, map);

      expect(map.getLayer(LAYER).source).toBe('shapes');
      expect(map.getLayer(LAYER)['source-layer']).toBeUndefined();
    });

    it('uses an explicit sourceLayer, property names and filter', async () => {
      const filter = ['==', ['get', 'kind'], 'tower'];
      const { fixture, map } = await render({
        sourceLayer: 'bldg',
        heightProperty: 'h',
        baseProperty: 'min_h',
        filter,
      });
      loadAndSettle(fixture, map);

      const layer = map.getLayer(LAYER);
      expect(layer['source-layer']).toBe('bldg');
      expect(layer.paint['fill-extrusion-height']).toEqual([
        'coalesce',
        ['to-number', ['get', 'h']],
        0,
      ]);
      expect(layer.paint['fill-extrusion-base']).toEqual([
        'coalesce',
        ['to-number', ['get', 'min_h']],
        0,
      ]);
      expect(layer.filter).toEqual(filter);
    });

    it('a null filter removes the default one', async () => {
      const { fixture, map } = await render({ filter: null });
      loadAndSettle(fixture, map);

      expect(map.getLayer(LAYER).filter).toBeUndefined();
    });

    it('waits for a registered source and adds the layer when it is announced', async () => {
      const { fixture, map, ctx } = await render({ source: 'parcels', sourceLayer: 'parcels' });
      loadAndSettle(fixture, map);
      expect(structuralCalls(map)).toEqual([]);

      map.addSource('parcels', { type: 'vector', url: 'x' } as never);
      const release = ctx.registerSource('parcels');
      fixture.detectChanges();

      expect(structuralCalls(map)).toEqual(['addSource:parcels', `addLayer:${LAYER}`]);
      release();
    });

    it('also picks up a source added by the application (sourcedata)', async () => {
      const { fixture, map } = await render({ source: 'late', sourceLayer: 'l' });
      loadAndSettle(fixture, map);
      expect(map.getLayer(LAYER)).toBeUndefined();

      map.addSource('late', { type: 'vector', url: 'x' } as never);
      map.fire('sourcedata');
      fixture.detectChanges();

      expect(map.getLayer(LAYER)).toBeDefined();
    });

    it('removes its sourcedata listener when destroyed while waiting', async () => {
      const { fixture, map } = await render({ source: 'late', sourceLayer: 'l' });
      loadAndSettle(fixture, map);
      expect(map.listenerCount('sourcedata')).toBe(1);

      update(fixture, { show: false });

      expect(map.listenerCount('sourcedata')).toBe(0);
    });

    it('does not listen for sourcedata once the source exists', async () => {
      const { map } = await renderLoaded();

      expect(map.listenerCount('sourcedata')).toBe(0);
    });

    it('goes away with a registered source on a style reload and comes back with it', async () => {
      const { fixture, map, ctx } = await render({ source: 'parcels', sourceLayer: 'parcels' });
      map.addSource('parcels', { type: 'vector', url: 'x' } as never);
      let release = ctx.registerSource('parcels');
      loadAndSettle(fixture, map);
      expect(map.getLayer(LAYER)).toBeDefined();

      update(fixture, { theme: 'dark' });
      release();
      map.finishStyleLoad();
      reloadStyle(fixture, map);
      expect(map.getLayerOrder()).toEqual([]);

      map.addSource('parcels', { type: 'vector', url: 'x' } as never);
      release = ctx.registerSource('parcels');
      fixture.detectChanges();
      expect(map.getLayerOrder()).toEqual([LAYER]);
    });
  });

  describe('theme switch (invariant 1)', () => {
    async function switchTheme(
      fixture: { detectChanges(): void },
      map: Awaited<ReturnType<typeof render>>['map'],
    ) {
      update(fixture as never, { theme: 'dark' });
      expect(map.getLayerOrder()).toEqual([]);
      map.finishStyleLoad();
      // The new basemap brings its source back.
      map.addSource('carto', CARTO);
      reloadStyle(fixture, map);
    }

    it('re-adds the layer after setStyle with the theme color', async () => {
      const { fixture, map } = await renderLoaded();
      expect(map.getLayer(LAYER).paint['fill-extrusion-color']).toBe(defaultExtrusionColors.light);

      await switchTheme(fixture, map);

      expect(map.getLayerOrder()).toEqual([LAYER]);
      expect(map.getLayer(LAYER).paint['fill-extrusion-color']).toBe(defaultExtrusionColors.dark);
    });

    it('keeps a custom color across themes', async () => {
      const { fixture, map } = await renderLoaded({ color: '#ff0000' });

      await switchTheme(fixture, map);

      expect(map.getLayer(LAYER).paint['fill-extrusion-color']).toBe('#ff0000');
    });
  });

  describe('reconciliation (invariant 2)', () => {
    it('updates paint with setPaintProperty and never re-creates the layer', async () => {
      const { fixture, map } = await renderLoaded();
      map.calls.length = 0;

      update(fixture, { opacity: 0.5, color: '#00ff00', heightProperty: 'h2' });

      expect(structuralCalls(map)).toEqual([]);
      const paint = map.getLayer(LAYER).paint;
      expect(paint['fill-extrusion-opacity']).toBe(0.5);
      expect(paint['fill-extrusion-color']).toBe('#00ff00');
      expect(paint['fill-extrusion-height']).toEqual(['coalesce', ['to-number', ['get', 'h2']], 0]);
    });

    it('sets the zoom range and the filter only when they change', async () => {
      const { fixture, map } = await renderLoaded();
      map.calls.length = 0;

      update(fixture, { minZoom: 16, maxZoom: 20 });
      expect(map.getLayer(LAYER).minzoom).toBe(16);
      expect(map.getLayer(LAYER).maxzoom).toBe(20);
      update(fixture, { minZoom: 16, maxZoom: 20 });
      expect(map.calls.filter((c) => c.startsWith('setLayerZoomRange'))).toHaveLength(1);

      const filter = ['>', ['get', 'render_height'], 30];
      update(fixture, { filter });
      expect(map.getLayer(LAYER).filter).toBe(filter);
      update(fixture, { filter });
      expect(map.calls.filter((c) => c.startsWith('setFilter'))).toHaveLength(1);
      expect(structuralCalls(map)).toEqual([]);
    });

    it('the paint escape hatch wins and a removed key is reset', async () => {
      const { fixture, map } = await renderLoaded({
        paint: { 'fill-extrusion-vertical-gradient': false },
      });
      expect(map.getLayer(LAYER).paint['fill-extrusion-vertical-gradient']).toBe(false);

      update(fixture, { paint: undefined });

      expect(map.getLayer(LAYER).paint['fill-extrusion-vertical-gradient']).toBeUndefined();
    });

    it('applies beforeId at creation', async () => {
      const { fixture, map } = await render({ beforeId: 'labels' });
      map.addLayer({ id: 'labels', type: 'fill', source: 'carto' } as never);
      loadAndSettle(fixture, map);

      expect(map.getLayerOrder()).toEqual([LAYER, 'labels']);
    });
  });

  describe('teardown (invariant 4)', () => {
    it('removes only its layer, leaving the basemap source', async () => {
      const { fixture, map } = await renderLoaded();
      map.calls.length = 0;

      update(fixture, { show: false });

      expect(structuralCalls(map)).toEqual([`removeLayer:${LAYER}`]);
      expect(map.getSource('carto')).toBeDefined();
    });

    it('does not fail when the layer was already removed', async () => {
      const { fixture, map } = await renderLoaded();
      map.removeLayer(LAYER);

      expect(() => update(fixture, { show: false })).not.toThrow();
    });

    it('re-creates the layer when the id changes', async () => {
      const { fixture, map } = await renderLoaded();

      update(fixture, { id: 'c' });

      expect(map.getLayerOrder()).toEqual(['fill-extrusion-layer-c']);
    });

    it('reports a duplicate layer id through mapError', async () => {
      const { fixture, map, host } = await render();
      map.addLayer({ id: LAYER, type: 'fill', source: 'carto' } as never);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => loadAndSettle(fixture, map)).not.toThrow();

      expect(host['mapError'].mock.calls[0][0].message).toContain('already exists');
      expect(map.getLayer(LAYER).type).toBe('fill');
    });
  });
});
