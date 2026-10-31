import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadAndSettle,
  reloadStyle,
  renderMap,
  structuralCalls,
  update,
} from '../../../testing/render';
import { defaultTerrainTiles, MapTerrainComponent } from './map-terrain.component';

const TEMPLATE = `
  <ng-map [theme]="theme" (mapError)="mapError($event)">
    @if (show) {
      <ng-map-terrain
        [id]="id"
        [tiles]="tiles"
        [url]="url"
        [encoding]="encoding"
        [tileSize]="tileSize"
        [minzoom]="minzoom"
        [maxzoom]="maxzoom"
        [attribution]="attribution"
        [exaggeration]="exaggeration"
        [hillshade]="hillshade"
        [hillshadeExaggeration]="hillshadeExaggeration"
        [hillshadeShadowColor]="hillshadeShadowColor"
        [hillshadeHighlightColor]="hillshadeHighlightColor"
        [hillshadeAccentColor]="hillshadeAccentColor"
        [hillshadePaint]="hillshadePaint"
        [beforeId]="beforeId"
      />
    }
  </ng-map>
`;

function hostDefaults(): Record<string, any> {
  return {
    theme: 'light',
    show: true,
    id: 't',
    tiles: undefined,
    url: undefined,
    encoding: undefined,
    tileSize: undefined,
    minzoom: undefined,
    maxzoom: undefined,
    attribution: undefined,
    exaggeration: undefined,
    hillshade: false,
    hillshadeExaggeration: undefined,
    hillshadeShadowColor: undefined,
    hillshadeHighlightColor: undefined,
    hillshadeAccentColor: undefined,
    hillshadePaint: undefined,
    beforeId: undefined,
    mapError: vi.fn(),
  };
}

async function render(hostProps: Record<string, unknown> = {}) {
  const host: Record<string, any> = { ...hostDefaults(), ...hostProps };
  const result = await renderMap(TEMPLATE, { imports: [MapTerrainComponent], hostProps: host });
  return { ...result, map: result.map!, host };
}

async function renderLoaded(hostProps: Record<string, unknown> = {}) {
  const result = await render(hostProps);
  loadAndSettle(result.fixture, result.map);
  return result;
}

const SOURCE = 'terrain-source-t';
const HILLSHADE_SOURCE = 'terrain-hillshade-source-t';
const HILLSHADE = 'terrain-hillshade-t';

describe('MapTerrainComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  describe('creation (invariant 1)', () => {
    it('does nothing before load, then adds the DEM source and enables the terrain', async () => {
      const { fixture, map, ctx } = await render();

      expect(ctx.isLoaded()).toBe(false);
      expect(structuralCalls(map)).toEqual([]);
      expect(map.getTerrain()).toBeNull();

      loadAndSettle(fixture, map);

      expect(structuralCalls(map)).toEqual([`addSource:${SOURCE}`]);
      expect(map.getTerrain()).toEqual({ source: SOURCE, exaggeration: 1 });
      expect(ctx.hasSource(SOURCE)).toBe(true);
    });

    it('defaults to the public Terrarium tiles', async () => {
      const { map } = await renderLoaded();

      const source = map.getSource(SOURCE);
      expect(source.type).toBe('raster-dem');
      expect(source.tiles).toEqual([...defaultTerrainTiles]);
      expect(source.encoding).toBe('terrarium');
      expect(source.tileSize).toBe(256);
      expect(source.maxzoom).toBe(15);
      expect(source.attribution).toContain('Mapzen');
    });

    it('uses custom tiles, encoding and options instead of the defaults', async () => {
      const { map } = await renderLoaded({
        tiles: ['https://dem.example.com/{z}/{x}/{y}.png'],
        encoding: 'mapbox',
        tileSize: 512,
        minzoom: 2,
        maxzoom: 12,
        attribution: 'Own DEM',
      });

      const source = map.getSource(SOURCE);
      expect(source.tiles).toEqual(['https://dem.example.com/{z}/{x}/{y}.png']);
      expect(source.encoding).toBe('mapbox');
      expect(source.tileSize).toBe(512);
      expect(source.minzoom).toBe(2);
      expect(source.maxzoom).toBe(12);
      expect(source.attribution).toBe('Own DEM');
    });

    it('a TileJSON url replaces the default tiles and leaves unset options to it', async () => {
      const { map } = await renderLoaded({ url: 'https://dem.example.com/tiles.json' });

      const source = map.getSource(SOURCE);
      expect(source.url).toBe('https://dem.example.com/tiles.json');
      expect(source.tiles).toBeUndefined();
      expect(source.maxzoom).toBeUndefined();
      expect(source.attribution).toBeUndefined();
    });

    it('generates ids when none is given', async () => {
      const { fixture, map } = await render({ id: undefined });
      loadAndSettle(fixture, map);

      expect(map.calls.find((c) => c.startsWith('addSource:'))).toMatch(
        /^addSource:terrain-source-ng-terrain-\d+$/,
      );
    });
  });

  describe('exaggeration (invariant 2)', () => {
    it('applies the exaggeration at creation', async () => {
      const { map } = await renderLoaded({ exaggeration: 2.5 });

      expect(map.getTerrain()).toEqual({ source: SOURCE, exaggeration: 2.5 });
    });

    it('re-applies only on change and never re-creates the source', async () => {
      const { fixture, map } = await renderLoaded({ exaggeration: 1.5 });
      map.calls.length = 0;
      vi.mocked(map.setTerrain).mockClear();

      update(fixture, { exaggeration: 3 });
      update(fixture, { exaggeration: 3 });

      expect(map.setTerrain).toHaveBeenCalledTimes(1);
      expect(map.getTerrain()).toEqual({ source: SOURCE, exaggeration: 3 });
      expect(structuralCalls(map)).toEqual([]);
    });

    it('goes back to 1 when the exaggeration is cleared', async () => {
      const { fixture, map } = await renderLoaded({ exaggeration: 2 });

      update(fixture, { exaggeration: undefined });

      expect(map.getTerrain()).toEqual({ source: SOURCE, exaggeration: 1 });
    });

    it('flattens the relief with 0 without disabling the terrain', async () => {
      const { fixture, map } = await renderLoaded();

      update(fixture, { exaggeration: 0 });

      expect(map.getTerrain()).toEqual({ source: SOURCE, exaggeration: 0 });
    });

    it('does not touch a terrain that another source took over', async () => {
      const { fixture, map } = await renderLoaded();
      map.addSource('other-dem', { type: 'raster-dem', tiles: ['x'] } as never);
      map.setTerrain({ source: 'other-dem', exaggeration: 1 });
      vi.mocked(map.setTerrain).mockClear();

      update(fixture, { exaggeration: 4 });

      expect(map.setTerrain).not.toHaveBeenCalled();
      expect(map.getTerrain()).toEqual({ source: 'other-dem', exaggeration: 1 });
    });
  });

  describe('source options (read at creation)', () => {
    it('keeps the DEM source when tiles, url or encoding change later', async () => {
      const { fixture, map } = await renderLoaded();
      map.calls.length = 0;

      update(fixture, {
        tiles: ['https://dem.example.com/{z}/{x}/{y}.png'],
        encoding: 'mapbox',
        maxzoom: 10,
      });

      expect(structuralCalls(map)).toEqual([]);
      expect(map.getSource(SOURCE).tiles).toEqual([...defaultTerrainTiles]);
      expect(map.getSource(SOURCE).encoding).toBe('terrarium');
    });

    it('rebuilds with the current options when the id changes', async () => {
      const { fixture, map } = await renderLoaded();

      update(fixture, { tiles: ['https://dem.example.com/{z}/{x}/{y}.png'], encoding: 'mapbox' });
      update(fixture, { id: 'u' });

      const source = map.getSource('terrain-source-u');
      expect(source.tiles).toEqual(['https://dem.example.com/{z}/{x}/{y}.png']);
      expect(source.encoding).toBe('mapbox');
      // Custom tiles: no default zoom cap or attribution.
      expect(source.maxzoom).toBeUndefined();
      expect(source.attribution).toBeUndefined();
    });

    it('treats empty tiles as the default Terrarium set', async () => {
      const { map } = await renderLoaded({ tiles: [] });

      expect(map.getSource(SOURCE).tiles).toEqual([...defaultTerrainTiles]);
      expect(map.getSource(SOURCE).maxzoom).toBe(15);
    });
  });

  describe('hillshade', () => {
    it('adds no hillshade layer by default', async () => {
      const { map } = await renderLoaded();

      expect(map.getLayerOrder()).toEqual([]);
      expect(map.getSource(HILLSHADE_SOURCE)).toBeUndefined();
    });

    it('draws it from its own DEM source (MapLibre warns when terrain and hillshade share one)', async () => {
      const { map } = await renderLoaded({ hillshade: true });

      expect(structuralCalls(map)).toEqual([
        `addSource:${SOURCE}`,
        `addSource:${HILLSHADE_SOURCE}`,
        `addLayer:${HILLSHADE}`,
      ]);
      expect(map.getLayer(HILLSHADE).type).toBe('hillshade');
      expect(map.getLayer(HILLSHADE).source).toBe(HILLSHADE_SOURCE);
      expect(map.getSource(HILLSHADE_SOURCE).tiles).toEqual([...defaultTerrainTiles]);
      expect(map.getTerrain()?.source).toBe(SOURCE);
    });

    it('toggles on and off without touching the terrain', async () => {
      const { fixture, map } = await renderLoaded();
      vi.mocked(map.setTerrain).mockClear();
      map.calls.length = 0;

      update(fixture, { hillshade: true });
      expect(structuralCalls(map)).toEqual([
        `addSource:${HILLSHADE_SOURCE}`,
        `addLayer:${HILLSHADE}`,
      ]);

      map.calls.length = 0;
      update(fixture, { hillshade: false });
      expect(structuralCalls(map)).toEqual([
        `removeLayer:${HILLSHADE}`,
        `removeSource:${HILLSHADE_SOURCE}`,
      ]);
      expect(map.setTerrain).not.toHaveBeenCalled();
      expect(map.getTerrain()).not.toBeNull();
    });

    it('passes the color and exaggeration inputs as paint and only sets defined ones', async () => {
      const { map } = await renderLoaded({
        hillshade: true,
        hillshadeExaggeration: 0.8,
        hillshadeShadowColor: '#112233',
      });

      expect(map.getLayer(HILLSHADE).paint).toEqual({
        'hillshade-exaggeration': 0.8,
        'hillshade-shadow-color': '#112233',
      });
    });

    it('reconciles the paint with setPaintProperty; the escape hatch wins; removed keys reset', async () => {
      const { fixture, map } = await renderLoaded({
        hillshade: true,
        hillshadeAccentColor: '#ff0000',
      });
      map.calls.length = 0;

      update(fixture, {
        hillshadeAccentColor: undefined,
        hillshadeHighlightColor: '#ffffff',
        hillshadePaint: { 'hillshade-highlight-color': '#eeeeee', 'hillshade-method': 'basic' },
      });

      const paint = map.getLayer(HILLSHADE).paint;
      expect(paint['hillshade-accent-color']).toBeUndefined();
      expect(paint['hillshade-highlight-color']).toBe('#eeeeee');
      expect(paint['hillshade-method']).toBe('basic');
      expect(structuralCalls(map)).toEqual([]);
    });

    it('gives a hillshade enabled later the same DEM as the terrain', async () => {
      const { fixture, map } = await renderLoaded({
        tiles: ['https://dem.example.com/{z}/{x}/{y}.png'],
        encoding: 'mapbox',
      });

      update(fixture, { hillshade: true });

      const hillshadeSource = map.getSource(HILLSHADE_SOURCE);
      expect(hillshadeSource.tiles).toEqual(['https://dem.example.com/{z}/{x}/{y}.png']);
      expect(hillshadeSource.encoding).toBe('mapbox');
    });

    it('waits for the layer before reconciling paint, then creates it with the latest paint', async () => {
      const { fixture, map } = await renderLoaded();
      map.calls.length = 0;

      update(fixture, { hillshadeShadowColor: '#000000', hillshadeExaggeration: 0.2 });
      expect(map.calls.filter((c) => c.startsWith('setPaintProperty'))).toEqual([]);

      update(fixture, { hillshade: true });
      expect(map.getLayer(HILLSHADE).paint).toEqual({
        'hillshade-exaggeration': 0.2,
        'hillshade-shadow-color': '#000000',
      });
    });

    it('keeps the hillshade in sync after it was toggled off and on', async () => {
      const { fixture, map } = await renderLoaded({ hillshade: true });

      update(fixture, { hillshade: false });
      update(fixture, { hillshade: true, hillshadeAccentColor: '#00ff00' });
      update(fixture, { hillshadeAccentColor: '#0000ff' });

      expect(map.getLayer(HILLSHADE).paint['hillshade-accent-color']).toBe('#0000ff');
      expect(map.getLayerOrder()).toEqual([HILLSHADE]);
    });

    it('inserts the hillshade layer before beforeId', async () => {
      const { fixture, map } = await render({ hillshade: true, beforeId: 'labels' });
      map.addSource('s', { type: 'geojson', data: {} } as never);
      map.addLayer({ id: 'labels', type: 'line', source: 's' } as never);
      loadAndSettle(fixture, map);

      expect(map.getLayerOrder()).toEqual([HILLSHADE, 'labels']);
    });
  });

  describe('theme switch', () => {
    it('re-applies the terrain, source and hillshade after setStyle', async () => {
      const { fixture, map } = await renderLoaded({ hillshade: true, exaggeration: 2 });
      expect(map.getTerrain()).not.toBeNull();

      update(fixture, { theme: 'dark' });
      // Cleanup disables the terrain and drops the layers before the sources.
      expect(map.getTerrain()).toBeNull();
      expect(map.getSource(SOURCE)).toBeUndefined();
      map.calls.length = 0;
      reloadStyle(fixture, map);

      expect(structuralCalls(map)).toEqual([
        `addSource:${SOURCE}`,
        `addSource:${HILLSHADE_SOURCE}`,
        `addLayer:${HILLSHADE}`,
      ]);
      expect(map.getTerrain()).toEqual({ source: SOURCE, exaggeration: 2 });
    });

    it('keeps a live exaggeration change across the reload', async () => {
      const { fixture, map } = await renderLoaded({ exaggeration: 1 });

      update(fixture, { exaggeration: 2.5 });
      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);

      expect(map.getTerrain()).toEqual({ source: SOURCE, exaggeration: 2.5 });
    });

    it('re-applies the terrain when MapLibre already dropped it with the style', async () => {
      const { fixture, map } = await renderLoaded();

      update(fixture, { theme: 'dark' });
      map.finishStyleLoad();
      reloadStyle(fixture, map);

      expect(map.getTerrain()).toEqual({ source: SOURCE, exaggeration: 1 });
    });
  });

  describe('teardown (invariant 4)', () => {
    it('disables the terrain before removing the hillshade layer and the sources', async () => {
      const { fixture, map, ctx } = await renderLoaded({ hillshade: true });
      map.calls.length = 0;

      update(fixture, { show: false });

      const ops = map.calls.filter((c) => /^(setTerrain|removeLayer|removeSource)/.test(c));
      expect(ops[0]).toBe('setTerrain:null');
      expect(ops).toHaveLength(4);
      // The layer goes before its source; the two DEM sources are independent.
      expect(ops.indexOf(`removeLayer:${HILLSHADE}`)).toBeLessThan(
        ops.indexOf(`removeSource:${HILLSHADE_SOURCE}`),
      );
      expect(ops).toContain(`removeSource:${SOURCE}`);
      expect(map.getTerrain()).toBeNull();
      expect(ctx.hasSource(SOURCE)).toBe(false);
    });

    it('does nothing when removed before the map loaded', async () => {
      const { fixture, map, host } = await render({ hillshade: true });

      update(fixture, { show: false });
      loadAndSettle(fixture, map);

      expect(structuralCalls(map)).toEqual([]);
      expect(map.getTerrain()).toBeNull();
      expect(host['mapError']).not.toHaveBeenCalled();
    });

    it('leaves a terrain it does not own alone', async () => {
      const { fixture, map } = await renderLoaded();
      map.addSource('other-dem', { type: 'raster-dem', tiles: ['x'] } as never);
      map.setTerrain({ source: 'other-dem' });
      vi.mocked(map.setTerrain).mockClear();

      update(fixture, { show: false });

      expect(map.setTerrain).not.toHaveBeenCalled();
      expect(map.getTerrain()).toEqual({ source: 'other-dem' });
    });

    it('removes layers of other components still using the DEM source', async () => {
      const { fixture, map } = await renderLoaded();
      map.addLayer({ id: 'user-hillshade', type: 'hillshade', source: SOURCE } as never);

      expect(() => update(fixture, { show: false })).not.toThrow();

      expect(map.getLayer('user-hillshade')).toBeUndefined();
      expect(map.getSource(SOURCE)).toBeUndefined();
    });

    it('re-creates everything when the id changes', async () => {
      const { fixture, map } = await renderLoaded({ hillshade: true });

      update(fixture, { id: 'u' });

      expect(map.getSource(SOURCE)).toBeUndefined();
      expect(map.getTerrain()).toEqual({ source: 'terrain-source-u', exaggeration: 1 });
      expect(map.getLayerOrder()).toEqual(['terrain-hillshade-u']);
    });
  });

  describe('errors', () => {
    it('reports a source id already in use without removing the owner', async () => {
      const { fixture, map, host } = await render();
      map.addSource(SOURCE, { type: 'raster-dem', url: 'owner' } as never);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => loadAndSettle(fixture, map)).not.toThrow();
      update(fixture, { show: false });

      expect(host['mapError'].mock.calls[0][0].message).toContain('already exists');
      expect(map.getSource(SOURCE).url).toBe('owner');
      expect(map.getTerrain()).toBeNull();
    });

    it('removes its source again when enabling the terrain fails', async () => {
      const { fixture, map, host } = await render();
      vi.mocked(map.setTerrain).mockImplementationOnce(() => {
        throw new Error('terrain refused');
      });
      vi.spyOn(console, 'error').mockImplementation(() => {});

      loadAndSettle(fixture, map);

      expect(host['mapError'].mock.calls[0][0].message).toBe('terrain refused');
      expect(map.getSource(SOURCE)).toBeUndefined();
    });
  });
});
