import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { type FakeMap } from '../../../testing/maplibre-fake';
import {
  loadAndSettle,
  reloadStyle,
  renderMap,
  structuralCalls,
  update,
} from '../../../testing/render';
import { MapClusterLayerComponent } from './map-cluster-layer.component';

const TEMPLATE = `
  <ng-map [theme]="theme">
    @if (show) {
      <ng-map-cluster-layer
        [data]="data"
        [id]="id"
        [beforeId]="beforeId"
        [clusterMaxZoom]="clusterMaxZoom"
        [clusterRadius]="clusterRadius"
        [clusterColors]="clusterColors"
        [clusterThresholds]="clusterThresholds"
        [pointColor]="pointColor"
        [zoomOnClusterClick]="zoomOnClusterClick"
        (pointClick)="pointClick($event)"
        (clusterClick)="clusterClick($event)"
      />
    }
  </ng-map>
`;

const DATA: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'p' },
      geometry: { type: 'Point', coordinates: [1, 2] },
    },
  ],
};

function hostDefaults(): Record<string, any> {
  return {
    theme: 'light',
    show: true,
    data: DATA,
    id: undefined,
    beforeId: undefined,
    clusterMaxZoom: 14,
    clusterRadius: 50,
    clusterColors: ['#22c55e', '#eab308', '#ef4444'],
    clusterThresholds: [100, 750],
    pointColor: '#3b82f6',
    zoomOnClusterClick: true,
    pointClick: vi.fn(),
    clusterClick: vi.fn(),
  };
}

async function render(hostProps: Record<string, unknown> = {}) {
  const host = { ...hostDefaults(), ...hostProps };
  const result = await renderMap(TEMPLATE, {
    imports: [MapClusterLayerComponent],
    hostProps: host,
  });
  return { ...result, map: result.map!, host };
}

/** Renders, loads, and resolves the auto-generated ids from the recorded `addSource` call. */
async function renderLoaded(hostProps: Record<string, unknown> = {}) {
  const result = await render(hostProps);
  loadAndSettle(result.fixture, result.map);
  return { ...result, ids: idsOf(result.map) };
}

function idsOf(map: FakeMap) {
  const added = map.calls.find((c) => c.startsWith('addSource:cluster-source-'));
  if (!added) throw new Error('the cluster source was not added');
  const n = added.slice('addSource:cluster-source-'.length);
  return {
    source: `cluster-source-${n}`,
    clusters: `clusters-${n}`,
    count: `cluster-count-${n}`,
    point: `unclustered-point-${n}`,
  };
}

const clusterFeature = (clusterId: number, pointCount: number, coordinates = [3, 4]) => ({
  properties: { cluster_id: clusterId, point_count: pointCount },
  geometry: { type: 'Point', coordinates },
});

describe('MapClusterLayerComponent', () => {
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
    it('adds nothing before load, then the source before its three layers', async () => {
      const { fixture, map, ctx } = await render();

      expect(ctx.isLoaded()).toBe(false);
      expect(structuralCalls(map)).toEqual([]);

      loadAndSettle(fixture, map);
      const ids = idsOf(map);

      expect(structuralCalls(map)).toEqual([
        `addSource:${ids.source}`,
        `addLayer:${ids.clusters}`,
        `addLayer:${ids.count}`,
        `addLayer:${ids.point}`,
      ]);
    });
  });

  describe('id and beforeId', () => {
    it('skips the count layer (and warns once) when the style has no glyphs', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const result = await render();
      result.map.glyphs = undefined;
      loadAndSettle(result.fixture, result.map);
      const ids = idsOf(result.map);

      expect(result.map.getLayerOrder()).toEqual([ids.clusters, ids.point]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('glyphs');
    });

    it('derives the source and layer ids from a custom id', async () => {
      const { fixture, map } = await render({ id: 'stores' });
      loadAndSettle(fixture, map);

      expect(structuralCalls(map)).toEqual([
        'addSource:cluster-source-stores',
        'addLayer:clusters-stores',
        'addLayer:cluster-count-stores',
        'addLayer:unclustered-point-stores',
      ]);
      expect(map.listenerCount('click', 'clusters-stores')).toBe(1);
    });

    it('keeps auto-generated ids when no id is set', async () => {
      const { ids } = await renderLoaded();
      expect(ids.source).toMatch(/^cluster-source-ng-cluster-\d+$/);
      expect(ids.clusters).toMatch(/^clusters-ng-cluster-\d+$/);
    });

    it('re-creates the source and layers, with symmetric listeners, when id changes', async () => {
      const { fixture, map } = await render({ id: 'a' });
      loadAndSettle(fixture, map);

      update(fixture, { id: 'b' });

      expect(map.getSource('cluster-source-a')).toBeUndefined();
      expect(map.getSource('cluster-source-b')).toBeDefined();
      expect(map.getLayerOrder()).toEqual(['clusters-b', 'cluster-count-b', 'unclustered-point-b']);
      expect(map.listenerCount('click', 'clusters-a')).toBe(0);
      expect(map.listenerCount('click', 'clusters-b')).toBe(1);
    });

    it('passes beforeId to addLayer for all three layers, at creation only', async () => {
      const { fixture, map } = await render({ id: 'x', beforeId: 'base-layer' });
      map.addLayer({ id: 'base-layer', type: 'background' } as never);
      const addLayer = vi.spyOn(map, 'addLayer');
      loadAndSettle(fixture, map);

      expect(addLayer).toHaveBeenCalledTimes(3);
      for (const call of addLayer.mock.calls) expect(call[1]).toBe('base-layer');
      expect(map.getLayerOrder().slice(0, 4)).toEqual([
        'clusters-x',
        'cluster-count-x',
        'unclustered-point-x',
        'base-layer',
      ]);

      addLayer.mockClear();
      update(fixture, { beforeId: 'other' });
      expect(addLayer).not.toHaveBeenCalled();
    });
  });

  describe('typed generics', () => {
    it('types the pointClick payload with the feature properties', () => {
      interface Store {
        name: string;
        open: boolean;
      }
      type Emitted<T> = T extends { pointClick: { emit(v: infer V): void } } ? V : never;
      expectTypeOf<
        Emitted<MapClusterLayerComponent<Store>>['feature']['properties']
      >().toEqualTypeOf<Store>();
      expectTypeOf<Emitted<MapClusterLayerComponent>['feature']['properties']>().toEqualTypeOf<
        Record<string, unknown>
      >();
    });
  });

  describe('re-add after theme switch (invariant 1)', () => {
    it('re-adds the source and all layers exactly once after setStyle', async () => {
      const { fixture, map, ids } = await renderLoaded();

      update(fixture, { theme: 'dark' });
      expect(map.setStyle).toHaveBeenCalled();
      expect(map.getLayerOrder()).toEqual([]);

      reloadStyle(fixture, map);

      expect(map.getSource(ids.source)).toBeDefined();
      expect(map.getLayerOrder()).toEqual([ids.clusters, ids.count, ids.point]);
      const calls = structuralCalls(map);
      for (const op of [
        `addSource:${ids.source}`,
        `addLayer:${ids.clusters}`,
        `addLayer:${ids.count}`,
        `addLayer:${ids.point}`,
      ]) {
        expect(calls.filter((c) => c === op)).toHaveLength(2);
      }
      expect(map.listenerCount('click', ids.clusters)).toBe(1);
    });
  });

  describe('initial definition', () => {
    it('enables clustering with the default options', async () => {
      const { map, ids } = await renderLoaded();
      const source = map.getSource(ids.source);

      expect(source.type).toBe('geojson');
      expect(source.cluster).toBe(true);
      expect(source.clusterMaxZoom).toBe(14);
      expect(source.clusterRadius).toBe(50);
      expect(source.data).toBe(DATA);
    });

    it('forwards custom clusterMaxZoom and clusterRadius', async () => {
      const { map, ids } = await renderLoaded({ clusterMaxZoom: 9, clusterRadius: 80 });

      expect(map.getSource(ids.source).clusterMaxZoom).toBe(9);
      expect(map.getSource(ids.source).clusterRadius).toBe(80);
    });

    it('builds step expressions from the colors and thresholds', async () => {
      const { map, ids } = await renderLoaded({
        clusterColors: ['#111111', '#222222', '#333333'],
        clusterThresholds: [10, 20],
      });

      const paint = map.getLayer(ids.clusters).paint;
      expect(paint['circle-color']).toEqual([
        'step',
        ['get', 'point_count'],
        '#111111',
        10,
        '#222222',
        20,
        '#333333',
      ]);
      expect(paint['circle-radius']).toEqual(['step', ['get', 'point_count'], 20, 10, 30, 20, 40]);
      expect(map.getLayer(ids.clusters).filter).toEqual(['has', 'point_count']);
      expect(map.getLayer(ids.count).layout['text-field']).toBe('{point_count_abbreviated}');
      expect(map.getLayer(ids.point).filter).toEqual(['!', ['has', 'point_count']]);
      expect(map.getLayer(ids.point).paint['circle-color']).toBe('#3b82f6');
    });
  });

  describe('count label font', () => {
    async function countFontWith(basemapLayers: any[]) {
      const result = await render();
      result.map.basemapLayers = basemapLayers;
      loadAndSettle(result.fixture, result.map);
      return result.map.getLayer(idsOf(result.map).count).layout['text-font'];
    }

    it("reuses the basemap's own font so its glyph server can serve it", async () => {
      const font = await countFontWith([
        { id: 'water', type: 'fill' },
        {
          id: 'place',
          type: 'symbol',
          layout: { 'text-font': ['Montserrat Medium', 'Noto Sans Regular'] },
        },
      ]);

      expect(font).toEqual(['Montserrat Medium', 'Noto Sans Regular']);
    });

    it('prefers an upright font over the italic one water labels use', async () => {
      const font = await countFontWith([
        { id: 'water-name', type: 'symbol', layout: { 'text-font': ['Montserrat Medium Italic'] } },
        { id: 'place', type: 'symbol', layout: { 'text-font': ['Montserrat Medium'] } },
      ]);

      expect(font).toEqual(['Montserrat Medium']);
    });

    it('uses an italic font when it is the only one', async () => {
      const font = await countFontWith([
        { id: 'water-name', type: 'symbol', layout: { 'text-font': ['Noto Sans Italic'] } },
      ]);

      expect(font).toEqual(['Noto Sans Italic']);
    });

    it('unwraps a literal expression', async () => {
      const font = await countFontWith([
        { id: 'place', type: 'symbol', layout: { 'text-font': ['literal', ['Stadia Bold']] } },
      ]);

      expect(font).toEqual(['Stadia Bold']);
    });

    it('falls back to Noto Sans Regular when no basemap font is a literal', async () => {
      const font = await countFontWith([
        { id: 'place', type: 'symbol', layout: { 'text-font': ['get', 'font'] } },
      ]);

      expect(font).toEqual(['Noto Sans Regular']);
    });
  });

  describe('reconcile, do not recreate (invariant 2)', () => {
    it('updates colors, thresholds and pointColor through setPaintProperty only', async () => {
      const { fixture, map, ids } = await renderLoaded();
      map.setPaintProperty.mockClear();
      map.calls.length = 0;

      update(fixture, {
        clusterColors: ['#a', '#b', '#c'],
        clusterThresholds: [5, 6],
        pointColor: '#00ff00',
      });

      expect(map.setPaintProperty).toHaveBeenCalledWith(ids.clusters, 'circle-color', [
        'step',
        ['get', 'point_count'],
        '#a',
        5,
        '#b',
        6,
        '#c',
      ]);
      expect(map.setPaintProperty).toHaveBeenCalledWith(ids.clusters, 'circle-radius', [
        'step',
        ['get', 'point_count'],
        20,
        5,
        30,
        6,
        40,
      ]);
      expect(map.setPaintProperty).toHaveBeenCalledWith(ids.point, 'circle-color', '#00ff00');
      expect(structuralCalls(map)).toEqual([]);
    });

    it('falls back to the default colors and thresholds when the inputs are set to undefined', async () => {
      const { fixture, map, ids } = await renderLoaded({
        clusterColors: ['#a', '#b', '#c'],
        clusterThresholds: [5, 6],
      });
      map.setPaintProperty.mockClear();

      update(fixture, { clusterColors: undefined, clusterThresholds: undefined });

      expect(map.setPaintProperty).toHaveBeenCalledWith(ids.clusters, 'circle-color', [
        'step',
        ['get', 'point_count'],
        '#22c55e',
        100,
        '#eab308',
        750,
        '#ef4444',
      ]);
    });

    it('pushes new object data through setData on the same source', async () => {
      const { fixture, map, ids } = await renderLoaded();
      const source = map.getSource(ids.source);
      source.setData.mockClear();
      map.calls.length = 0;
      const next: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: 'FeatureCollection',
        features: [],
      };

      update(fixture, { data: next });

      expect(source.setData).toHaveBeenCalledWith(next);
      expect(map.getSource(ids.source)).toBe(source);
      expect(structuralCalls(map)).toEqual([]);
    });

    it('loads a new URL through setData on the same source', async () => {
      const { fixture, map, ids } = await renderLoaded({ data: 'https://example.com/a.geojson' });
      const source = map.getSource(ids.source);
      expect(source.data).toBe('https://example.com/a.geojson');
      map.calls.length = 0;

      update(fixture, { data: 'https://example.com/b.geojson' });

      expect(source.setData).toHaveBeenCalledExactlyOnceWith('https://example.com/b.geojson');
      expect(structuralCalls(map)).toEqual([]);
    });

    it('does not refetch the URL the source was created with after a theme switch', async () => {
      const { fixture, map, ids } = await renderLoaded({ data: 'https://example.com/a.geojson' });

      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);

      expect(map.getSource(ids.source).setData).not.toHaveBeenCalled();
    });

    it('applies clusterRadius and clusterMaxZoom changes with setClusterOptions', async () => {
      const { fixture, map, ids } = await renderLoaded();
      const source = map.getSource(ids.source);
      map.calls.length = 0;

      update(fixture, { clusterRadius: 10 });
      expect(source.setClusterOptions).toHaveBeenLastCalledWith({
        // MapLibre sets `cluster` unconditionally: omitting it would turn clustering off.
        cluster: true,
        clusterRadius: 10,
        clusterMaxZoom: 14,
      });

      update(fixture, { clusterMaxZoom: 8 });
      expect(source.setClusterOptions).toHaveBeenLastCalledWith({
        // MapLibre sets `cluster` unconditionally: omitting it would turn clustering off.
        cluster: true,
        clusterRadius: 10,
        clusterMaxZoom: 8,
      });
      expect(source.setClusterOptions).toHaveBeenCalledTimes(2);
      expect(structuralCalls(map)).toEqual([]);
    });

    it('does not re-cluster on creation or after a theme switch', async () => {
      const { fixture, map, ids } = await renderLoaded({ clusterRadius: 30 });
      expect(map.getSource(ids.source).setClusterOptions).not.toHaveBeenCalled();

      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);

      const recreated = map.getSource(ids.source);
      expect(recreated.clusterRadius).toBe(30);
      expect(recreated.setClusterOptions).not.toHaveBeenCalled();
    });

    it('creates the source with the current cluster options after a theme switch', async () => {
      const { fixture, map, ids } = await renderLoaded();
      update(fixture, { clusterRadius: 12, clusterMaxZoom: 6 });

      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);

      const recreated = map.getSource(ids.source);
      expect(recreated.clusterRadius).toBe(12);
      expect(recreated.clusterMaxZoom).toBe(6);
      expect(recreated.setClusterOptions).not.toHaveBeenCalled();
    });
  });

  describe('cluster click', () => {
    it('emits clusterClick and eases to the expansion zoom', async () => {
      const { map, host, ids } = await renderLoaded();
      const source = map.getSource(ids.source);
      source.getClusterExpansionZoom.mockResolvedValue(9);
      const point = { x: 10, y: 20 };

      // Layer-scoped events carry the clicked features: no second query.
      const features = [clusterFeature(5, 12, [3, 4])];
      map.fire('click', { point, lngLat: { lng: 3, lat: 4 }, features }, ids.clusters);
      await vi.advanceTimersByTimeAsync(0);

      expect(map.queryRenderedFeatures).not.toHaveBeenCalled();
      expect(host['clusterClick']).toHaveBeenCalledWith({
        clusterId: 5,
        coordinates: [3, 4],
        pointCount: 12,
      });
      expect(source.getClusterExpansionZoom).toHaveBeenCalledWith(5);
      expect(map.easeTo).toHaveBeenCalledWith({ center: [3, 4], zoom: 9 });
    });

    it('does not ease when zoomOnClusterClick is false', async () => {
      const { map, host, ids } = await renderLoaded({ zoomOnClusterClick: false });
      const features = [clusterFeature(5, 12)];

      map.fire(
        'click',
        { point: { x: 0, y: 0 }, lngLat: { lng: 3, lat: 4 }, features },
        ids.clusters,
      );
      await vi.advanceTimersByTimeAsync(0);

      expect(host['clusterClick']).toHaveBeenCalledTimes(1);
      expect(map.getSource(ids.source).getClusterExpansionZoom).not.toHaveBeenCalled();
      expect(map.easeTo).not.toHaveBeenCalled();
    });

    it('does nothing when no cluster is rendered under the click', async () => {
      const { map, host, ids } = await renderLoaded();
      const features: unknown[] = [];

      map.fire(
        'click',
        { point: { x: 0, y: 0 }, lngLat: { lng: 3, lat: 4 }, features },
        ids.clusters,
      );
      await vi.advanceTimersByTimeAsync(0);

      expect(host['clusterClick']).not.toHaveBeenCalled();
      expect(map.easeTo).not.toHaveBeenCalled();
    });
  });

  describe('point click', () => {
    const pointEvent = (featureLng: number, lng: number) => ({
      features: [
        { properties: { name: 'p' }, geometry: { type: 'Point', coordinates: [featureLng, 5] } },
      ],
      lngLat: { lng, lat: 5 },
      point: { x: 0, y: 0 },
    });

    it('emits pointClick with the feature and its coordinates', async () => {
      const { map, host, ids } = await renderLoaded();

      map.fire('click', pointEvent(10, 11), ids.point);

      expect(host['pointClick']).toHaveBeenCalledTimes(1);
      const emitted = host['pointClick'].mock.calls[0][0];
      expect(emitted.coordinates).toEqual([10, 5]);
      expect(emitted.feature.properties).toEqual({ name: 'p' });
    });

    it('normalizes the longitude across world copies', async () => {
      const { map, host, ids } = await renderLoaded();

      map.fire('click', pointEvent(-170, 190), ids.point);

      expect(host['pointClick'].mock.calls[0][0].coordinates).toEqual([190, 5]);
    });

    it('normalizes in the other direction too', async () => {
      const { map, host, ids } = await renderLoaded();

      map.fire('click', pointEvent(170, -190), ids.point);

      expect(host['pointClick'].mock.calls[0][0].coordinates).toEqual([-190, 5]);
    });

    it('does not mutate the feature geometry while normalizing', async () => {
      const { map, host, ids } = await renderLoaded();
      const event = pointEvent(-170, 190);

      map.fire('click', event, ids.point);

      expect(event.features[0].geometry.coordinates).toEqual([-170, 5]);
      expect(host['pointClick']).toHaveBeenCalledTimes(1);
    });

    it('ignores clicks without features', async () => {
      const { map, host, ids } = await renderLoaded();

      map.fire('click', { features: [], lngLat: { lng: 0, lat: 0 } }, ids.point);

      expect(host['pointClick']).not.toHaveBeenCalled();
    });
  });

  describe('cursor', () => {
    it('shows a pointer over clusters and points and resets it on leave', async () => {
      const { map, ids } = await renderLoaded();

      for (const layer of [ids.clusters, ids.point]) {
        map.fire('mouseenter', {}, layer);
        expect(map.getCanvas().style.cursor).toBe('pointer');
        map.fire('mouseleave', {}, layer);
        expect(map.getCanvas().style.cursor).toBe('');
      }
    });
  });

  describe('teardown (invariant 4)', () => {
    it('removes every layer before the source and unregisters all six handlers', async () => {
      const { fixture, map, ids } = await renderLoaded();
      const handlers: [string, string][] = [
        ['click', ids.clusters],
        ['click', ids.point],
        ['mouseenter', ids.clusters],
        ['mouseleave', ids.clusters],
        ['mouseenter', ids.point],
        ['mouseleave', ids.point],
      ];
      for (const [event, layer] of handlers) expect(map.listenerCount(event, layer)).toBe(1);
      map.calls.length = 0;

      update(fixture, { show: false });

      const calls = structuralCalls(map);
      const source = calls.indexOf(`removeSource:${ids.source}`);
      expect(source).toBeGreaterThan(-1);
      for (const layer of [ids.clusters, ids.count, ids.point]) {
        const index = calls.indexOf(`removeLayer:${layer}`);
        expect(index).toBeGreaterThan(-1);
        expect(index).toBeLessThan(source);
      }
      for (const [event, layer] of handlers) expect(map.listenerCount(event, layer)).toBe(0);
    });

    it('does not throw when the whole fixture is destroyed', async () => {
      const { fixture } = await renderLoaded();
      expect(() => fixture.destroy()).not.toThrow();
    });
  });

  describe('interactivity', () => {
    // The cluster layer has no `interactive` input: click and cursor handlers are always
    // registered, so the checklist's "non-interactive registers no handlers" case does not apply.
    it('always registers its layer-scoped handlers once loaded', async () => {
      const { map, ids } = await renderLoaded();

      expect(map.calls.filter((c) => c.startsWith('on:') && c.includes(ids.clusters))).toHaveLength(
        3,
      );
      expect(map.calls.filter((c) => c.startsWith('on:') && c.includes(ids.point))).toHaveLength(3);
    });
  });
  describe('no redundant updates', () => {
    it('does not setData with the data the source was just created with', async () => {
      const { fixture, map, ids } = await renderLoaded();
      expect(map.getSource(ids.source).setData).not.toHaveBeenCalled();

      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);

      expect(map.getSource(ids.source).setData).not.toHaveBeenCalled();
    });
  });

  describe('expansion zoom failure', () => {
    it('swallows a rejected expansion-zoom lookup', async () => {
      const { map, ids } = await renderLoaded();
      map.getSource(ids.source).getClusterExpansionZoom.mockRejectedValue(new Error('gone'));
      const features = [clusterFeature(5, 12)];

      map.fire(
        'click',
        { point: { x: 0, y: 0 }, lngLat: { lng: 3, lat: 4 }, features },
        ids.clusters,
      );
      await vi.advanceTimersByTimeAsync(0);

      expect(map.easeTo).not.toHaveBeenCalled();
    });
  });

  describe('creation failures', () => {
    it('reports a failed layer through mapError and removes what it added', async () => {
      const host = { ...hostDefaults(), mapError: vi.fn() };
      const result = await renderMap(
        `<ng-map (mapError)="mapError($event)"><ng-map-cluster-layer [data]="data" /></ng-map>`,
        { imports: [MapClusterLayerComponent], hostProps: host },
      );
      const map = result.map!;
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const addLayer = map.addLayer.bind(map);
      vi.spyOn(map, 'addLayer').mockImplementation((layer: any, beforeId?: string) => {
        if (layer.type === 'symbol') throw new Error('invalid text-font');
        return addLayer(layer, beforeId);
      });

      expect(() => loadAndSettle(result.fixture, map)).not.toThrow();
      expect(host.mapError).toHaveBeenCalledTimes(1);
      expect(host.mapError.mock.calls[0][0].message).toBe('invalid text-font');
      expect(map.getLayerOrder()).toEqual([]);
      expect(Object.keys(map.getStyle().sources)).toEqual([]);
    });
  });
});
