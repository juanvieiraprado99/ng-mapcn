import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadAndSettle,
  reloadStyle,
  renderMap,
  structuralCalls,
  update,
} from '../../../testing/render';
import { MapRasterSourceComponent } from './map-raster-source.component';

const TEMPLATE = `
  <ng-map [theme]="theme" (mapError)="mapError($event)">
    @if (show) {
      <ng-map-raster-source
        [id]="id"
        [tiles]="tiles"
        [url]="url"
        [tileSize]="tileSize"
        [minzoom]="minzoom"
        [maxzoom]="maxzoom"
        [attribution]="attribution"
        [bounds]="bounds"
        [scheme]="scheme"
        [opacity]="opacity"
        [visible]="visible"
        [beforeId]="beforeId"
        [paint]="paint"
      />
    }
  </ng-map>
`;

const TILES = ['https://tiles.example.com/{z}/{x}/{y}.png'];

function hostDefaults(): Record<string, any> {
  return {
    theme: 'light',
    show: true,
    id: 'radar',
    tiles: TILES,
    url: undefined,
    tileSize: undefined,
    minzoom: undefined,
    maxzoom: undefined,
    attribution: undefined,
    bounds: undefined,
    scheme: undefined,
    opacity: 1,
    visible: true,
    beforeId: undefined,
    paint: undefined,
    mapError: vi.fn(),
  };
}

async function render(hostProps: Record<string, unknown> = {}) {
  const host = { ...hostDefaults(), ...hostProps } as Record<string, any> & {
    mapError: ReturnType<typeof vi.fn>;
  };
  const result = await renderMap(TEMPLATE, {
    imports: [MapRasterSourceComponent],
    hostProps: host,
  });
  return { ...result, map: result.map!, host };
}

async function renderLoaded(hostProps: Record<string, unknown> = {}) {
  const result = await render(hostProps);
  loadAndSettle(result.fixture, result.map);
  return result;
}

const SOURCE = 'radar';
const LAYER = 'raster-layer-radar';

describe('MapRasterSourceComponent', () => {
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

      expect(structuralCalls(map)).toEqual([]);
      expect(ctx.hasSource(SOURCE)).toBe(false);

      loadAndSettle(fixture, map);

      expect(structuralCalls(map)).toEqual([`addSource:${SOURCE}`, `addLayer:${LAYER}`]);
      expect(ctx.hasSource(SOURCE)).toBe(true);
    });

    it('generates an id when none is given and uses it verbatim as the source id', async () => {
      const { fixture, map, ctx } = await render({ id: undefined });
      loadAndSettle(fixture, map);

      const added = map.calls.find((c) => c.startsWith('addSource:'))!;
      expect(added).toMatch(/^addSource:ng-raster-source-\d+$/);
      expect(ctx.hasSource(added.replace('addSource:', ''))).toBe(true);
    });
  });

  describe('theme switch', () => {
    it('re-adds the source and layer, and the registry follows', async () => {
      const { fixture, map, ctx } = await renderLoaded({ opacity: 0.4 });
      const seen: boolean[] = [];

      update(fixture, { theme: 'dark' });
      // The gate closed: the source is no longer announced while setStyle is in flight.
      seen.push(ctx.hasSource(SOURCE));
      expect(map.getLayerOrder()).toEqual([]);
      reloadStyle(fixture, map);
      seen.push(ctx.hasSource(SOURCE));

      expect(seen).toEqual([false, true]);
      expect(map.getLayerOrder()).toEqual([LAYER]);
      expect(map.getSource(SOURCE).tiles).toEqual(TILES);
      expect(map.getLayer(LAYER).paint['raster-opacity']).toBe(0.4);
      expect(structuralCalls(map).filter((c) => c === `addSource:${SOURCE}`)).toHaveLength(2);
    });
  });

  describe('initial definition', () => {
    it('creates a raster source from tiles with only the defined options', async () => {
      const { map } = await renderLoaded();
      const source = map.getSource(SOURCE);

      expect(source.type).toBe('raster');
      expect(source.tiles).toEqual(TILES);
      expect(source).not.toHaveProperty('url');
      expect(source).not.toHaveProperty('tileSize');
      expect(source).not.toHaveProperty('minzoom');
      expect(map.getLayer(LAYER)).toMatchObject({
        type: 'raster',
        source: SOURCE,
        layout: { visibility: 'visible' },
        paint: { 'raster-opacity': 1 },
      });
    });

    it('forwards tileSize, zoom range, attribution, bounds and scheme', async () => {
      const { map } = await renderLoaded({
        tileSize: 512,
        minzoom: 2,
        maxzoom: 12,
        attribution: '(c) radar',
        bounds: [-10, -5, 10, 5],
        scheme: 'tms',
      });

      expect(map.getSource(SOURCE)).toMatchObject({
        tileSize: 512,
        minzoom: 2,
        maxzoom: 12,
        attribution: '(c) radar',
        bounds: [-10, -5, 10, 5],
        scheme: 'tms',
      });
    });

    it('prefers url (TileJSON) over tiles', async () => {
      const { map } = await renderLoaded({ url: 'https://example.com/tiles.json' });

      expect(map.getSource(SOURCE).url).toBe('https://example.com/tiles.json');
      expect(map.getSource(SOURCE)).not.toHaveProperty('tiles');
    });

    it('starts hidden when visible is false', async () => {
      const { map } = await renderLoaded({ visible: false });
      expect(map.getLayer(LAYER).layout.visibility).toBe('none');
    });

    it('lets paint override opacity', async () => {
      const { map } = await renderLoaded({
        paint: { 'raster-opacity': 0.2, 'raster-saturation': -1 },
      });
      expect(map.getLayer(LAYER).paint).toMatchObject({
        'raster-opacity': 0.2,
        'raster-saturation': -1,
      });
    });
  });

  describe('beforeId', () => {
    it('inserts the layer before the given layer, at creation only', async () => {
      const { fixture, map } = await render({ beforeId: 'base-layer' });
      map.addLayer({ id: 'base-layer', type: 'background' } as never);
      const addLayer = vi.spyOn(map, 'addLayer');
      loadAndSettle(fixture, map);

      expect(addLayer.mock.calls[0][1]).toBe('base-layer');
      expect(map.getLayerOrder()).toEqual([LAYER, 'base-layer']);

      addLayer.mockClear();
      update(fixture, { beforeId: 'other' });
      expect(addLayer).not.toHaveBeenCalled();
    });
  });

  describe('reconcile, do not recreate (invariant 2)', () => {
    it('updates opacity, paint and visibility without structural calls', async () => {
      const { fixture, map } = await renderLoaded();
      vi.mocked(map.setPaintProperty).mockClear();
      map.calls.length = 0;

      update(fixture, { opacity: 0.3, visible: false, paint: { 'raster-hue-rotate': 90 } });

      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'raster-opacity', 0.3);
      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'raster-hue-rotate', 90);
      expect(map.setLayoutProperty).toHaveBeenCalledWith(LAYER, 'visibility', 'none');
      expect(structuralCalls(map)).toEqual([]);

      update(fixture, { visible: true, paint: undefined });
      expect(map.setLayoutProperty).toHaveBeenLastCalledWith(LAYER, 'visibility', 'visible');
      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'raster-hue-rotate', undefined);
    });

    it('calls setTiles only when the tile URLs really change', async () => {
      const { fixture, map } = await renderLoaded();
      const source = map.getSource(SOURCE);

      update(fixture, { tiles: [...TILES] });
      expect(source.setTiles).not.toHaveBeenCalled();

      update(fixture, { tiles: ['https://b.example.com/{z}/{x}/{y}.png'] });
      expect(source.setTiles).toHaveBeenCalledTimes(1);
      expect(source.setTiles).toHaveBeenCalledWith(['https://b.example.com/{z}/{x}/{y}.png']);
      expect(structuralCalls(map)).toEqual([`addSource:${SOURCE}`, `addLayer:${LAYER}`]);
    });

    it('calls setUrl when the TileJSON url changes', async () => {
      const { fixture, map } = await renderLoaded({ url: 'https://example.com/a.json' });
      const source = map.getSource(SOURCE);

      update(fixture, { url: 'https://example.com/a.json' });
      expect(source.setUrl).not.toHaveBeenCalled();

      update(fixture, { url: 'https://example.com/b.json' });
      expect(source.setUrl).toHaveBeenCalledWith('https://example.com/b.json');
    });

    it('ignores creation-only options changing later', async () => {
      const { fixture, map } = await renderLoaded();
      map.calls.length = 0;

      update(fixture, { tileSize: 512, maxzoom: 5, scheme: 'tms' });

      expect(structuralCalls(map)).toEqual([]);
      expect(map.getSource(SOURCE)).not.toHaveProperty('tileSize');
    });
  });

  describe('teardown (invariant 4)', () => {
    it('removes the layer before the source and releases the registry', async () => {
      const { fixture, map, ctx } = await renderLoaded();
      map.calls.length = 0;

      update(fixture, { show: false });

      expect(structuralCalls(map)).toEqual([`removeLayer:${LAYER}`, `removeSource:${SOURCE}`]);
      expect(ctx.hasSource(SOURCE)).toBe(false);
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
    it('reports a missing tiles/url through mapError without touching the map', async () => {
      const { fixture, map, ctx, host } = await render({ tiles: undefined });
      vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => loadAndSettle(fixture, map)).not.toThrow();

      expect(host.mapError).toHaveBeenCalledTimes(1);
      expect(host.mapError.mock.calls[0][0].message).toContain('"tiles" or "url"');
      expect(structuralCalls(map)).toEqual([]);
      expect(ctx.hasSource(SOURCE)).toBe(false);
    });

    it('reports a source id already in use and leaves the owner alone', async () => {
      const { fixture, map, ctx, host } = await render();
      map.addSource(SOURCE, { type: 'raster', tiles: ['owner'] } as never);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      loadAndSettle(fixture, map);

      expect(host.mapError.mock.calls[0][0].message).toContain('already exists');
      expect(map.getSource(SOURCE).tiles).toEqual(['owner']);
      expect(map.getLayer(LAYER)).toBeUndefined();
      expect(ctx.hasSource(SOURCE)).toBe(false);
    });
  });

  describe('id change', () => {
    it('re-creates the source and layer and moves the registration', async () => {
      const { fixture, map, ctx } = await renderLoaded({ id: 'a' });

      update(fixture, { id: 'b' });

      expect(map.getSource('a')).toBeUndefined();
      expect(map.getSource('b')).toBeDefined();
      expect(map.getLayerOrder()).toEqual(['raster-layer-b']);
      expect(ctx.hasSource('a')).toBe(false);
      expect(ctx.hasSource('b')).toBe(true);
    });
  });
});
