import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Map as FakeMapClass } from '../../../testing/maplibre-fake';
import {
  loadAndSettle,
  reloadStyle,
  renderMap,
  structuralCalls,
  update,
} from '../../../testing/render';
import { MapSymbolLayerComponent } from './map-symbol-layer.component';

const TEMPLATE = `
  <ng-map [theme]="theme" (mapError)="mapError($event)">
    @if (show) {
      <ng-map-symbol-layer
        [data]="data"
        [id]="id"
        [beforeId]="beforeId"
        [images]="images"
        [icon]="icon"
        [iconSize]="iconSize"
        [textField]="textField"
        [textSize]="textSize"
        [allowOverlap]="allowOverlap"
        [minZoom]="minZoom"
        [maxZoom]="maxZoom"
        [filter]="filter"
        [layout]="layout"
        [paint]="paint"
        [interactive]="interactive"
        (featureClick)="featureClick($event)"
        (featureHover)="featureHover($event)"
      />
    }
  </ng-map>
`;

const DATA: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Florence', kind: 'city' },
      geometry: { type: 'Point', coordinates: [11.25, 43.77] },
    },
  ],
};

function hostDefaults(): Record<string, any> {
  return {
    theme: 'light',
    show: true,
    data: DATA,
    id: 's',
    beforeId: undefined,
    images: {},
    icon: undefined,
    iconSize: 1,
    textField: '{name}',
    textSize: 12,
    allowOverlap: false,
    minZoom: 0,
    maxZoom: 24,
    filter: undefined,
    layout: undefined,
    paint: undefined,
    interactive: false,
    mapError: vi.fn(),
    featureClick: vi.fn(),
    featureHover: vi.fn(),
  };
}

/** Lets pending image decodes settle, then runs the effects they unblock. */
async function settle(fixture: { detectChanges(): void }) {
  await vi.advanceTimersByTimeAsync(0);
  fixture.detectChanges();
}

async function render(hostProps: Record<string, unknown> = {}) {
  const host = { ...hostDefaults(), ...hostProps };
  const result = await renderMap(TEMPLATE, { imports: [MapSymbolLayerComponent], hostProps: host });
  await settle(result.fixture);
  return { ...result, map: result.map!, host };
}

async function renderLoaded(hostProps: Record<string, unknown> = {}) {
  const result = await render(hostProps);
  loadAndSettle(result.fixture, result.map);
  return result;
}

const SOURCE = 'symbol-source-s';
const LAYER = 'symbol-layer-s';

const feature = (id?: number) => ({
  type: 'Feature',
  id,
  properties: { name: 'Florence' },
  geometry: { type: 'Point', coordinates: [1, 2] },
});
const mouseEvent = (id?: number, lng = 5, lat = 6) => ({
  features: [feature(id)],
  lngLat: { lng, lat },
});

const addImageCalls = (map: { calls: string[] }) => map.calls.filter((c) => /Image:/.test(c));

describe('MapSymbolLayerComponent', () => {
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

      expect(map.calls.find((c) => c.startsWith('addSource:'))).toMatch(
        /^addSource:symbol-source-ng-symbol-\d+$/,
      );
    });

    it('inserts the layer before beforeId, at creation only', async () => {
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

    it('re-creates the source and layer when the id changes', async () => {
      const { fixture, map } = await renderLoaded({ id: 'a' });
      update(fixture, { id: 'b' });

      expect(map.getSource('symbol-source-a')).toBeUndefined();
      expect(map.getLayerOrder()).toEqual(['symbol-layer-b']);
    });
  });

  describe('initial definition', () => {
    it('creates a text layer with theme colors and the basemap font', async () => {
      const { map } = await renderLoaded();
      map.basemapLayers = [];
      const layer = map.getLayer(LAYER);

      expect(layer.type).toBe('symbol');
      expect(layer.source).toBe(SOURCE);
      expect(layer.layout['text-field']).toBe('{name}');
      expect(layer.layout['text-font']).toEqual(['Noto Sans Regular']);
      expect(layer.layout['text-size']).toBe(12);
      expect(layer.layout['text-anchor']).toBe('center');
      expect(layer.layout['text-offset']).toEqual([0, 0]);
      expect(layer.layout['text-allow-overlap']).toBe(false);
      expect(layer.layout['icon-image']).toBeUndefined();
      expect(layer.paint['text-color']).toBe('#171717');
      expect(layer.paint['text-halo-color']).toBe('#ffffff');
      expect(layer.paint['text-halo-width']).toBe(1);
      expect(layer.minzoom).toBe(0);
      expect(layer.maxzoom).toBe(24);
    });

    it('anchors the text below the icon when there is one', async () => {
      const { map } = await renderLoaded({ icon: ['get', 'kind'] });
      const layout = map.getLayer(LAYER).layout;

      expect(layout['icon-image']).toEqual(['get', 'kind']);
      expect(layout['icon-allow-overlap']).toBe(false);
      expect(layout['text-anchor']).toBe('top');
      expect(layout['text-offset']).toEqual([0, 0.8]);
    });

    it('reuses a literal font stack of the basemap', async () => {
      const result = await render();
      result.map.basemapLayers = [
        { id: 'p', type: 'symbol', layout: { 'text-font': ['Montserrat Medium'] } },
      ];
      loadAndSettle(result.fixture, result.map);

      expect(result.map.getLayer(LAYER).layout['text-font']).toEqual(['Montserrat Medium']);
    });

    it('swaps the text colors with the theme', async () => {
      const { fixture, map } = await renderLoaded();

      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);

      expect(map.getLayer(LAYER).paint['text-color']).toBe('#fafafa');
      expect(map.getLayer(LAYER).paint['text-halo-color']).toBe('#0a0a0a');
    });

    it('lets layout and paint override everything else', async () => {
      const { map } = await renderLoaded({
        layout: { 'text-size': 30 },
        paint: { 'text-color': '#ff0000' },
      });

      expect(map.getLayer(LAYER).layout['text-size']).toBe(30);
      expect(map.getLayer(LAYER).paint['text-color']).toBe('#ff0000');
    });

    it('applies the filter and zoom range at creation', async () => {
      const filter = ['==', ['get', 'kind'], 'city'];
      const { map } = await renderLoaded({ filter, minZoom: 2, maxZoom: 9 });

      expect(map.getLayer(LAYER).filter).toEqual(filter);
      expect(map.getLayer(LAYER).minzoom).toBe(2);
      expect(map.getLayer(LAYER).maxzoom).toBe(9);
    });
  });

  describe('no glyphs (blank style)', () => {
    it('omits every text key and warns exactly once', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const result = await render({ icon: 'pin' });
      result.map.glyphs = undefined;
      loadAndSettle(result.fixture, result.map);
      const { layout, paint } = result.map.getLayer(LAYER);

      expect(Object.keys(layout).filter((k) => k.startsWith('text-'))).toEqual([]);
      expect(Object.keys(paint).filter((k) => k.startsWith('text-'))).toEqual([]);
      expect(layout['icon-image']).toBe('pin');

      update(result.fixture, { theme: 'dark' });
      reloadStyle(result.fixture, result.map);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('glyphs');
    });
  });

  describe('reconcile, do not recreate (invariant 2)', () => {
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
      expect(structuralCalls(map).filter((c) => c.startsWith('addLayer'))).toHaveLength(1);
    });

    it('updates textSize and allowOverlap through setLayoutProperty only', async () => {
      const { fixture, map } = await renderLoaded({ icon: 'pin' });
      map.setLayoutProperty.mockClear();
      map.calls.length = 0;

      update(fixture, { textSize: 20, allowOverlap: true });

      expect(map.setLayoutProperty).toHaveBeenCalledWith(LAYER, 'text-size', 20);
      expect(map.setLayoutProperty).toHaveBeenCalledWith(LAYER, 'text-allow-overlap', true);
      expect(map.setLayoutProperty).toHaveBeenCalledWith(LAYER, 'icon-allow-overlap', true);
      expect(structuralCalls(map)).toEqual([]);
      expect(map.getLayer(LAYER).layout['text-size']).toBe(20);
    });

    it('resets layout keys that are no longer applied', async () => {
      const { fixture, map } = await renderLoaded({ icon: 'pin' });
      expect(map.getLayer(LAYER).layout['icon-image']).toBe('pin');

      update(fixture, { icon: undefined });

      expect(map.getLayer(LAYER).layout['icon-image']).toBeUndefined();
    });

    it('calls setLayerZoomRange and setFilter only when they change', async () => {
      const { fixture, map } = await renderLoaded({ maxZoom: 6 });
      expect(map.setLayerZoomRange).not.toHaveBeenCalled();
      expect(map.setFilter).not.toHaveBeenCalled();

      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);
      expect(map.setLayerZoomRange).not.toHaveBeenCalled();
      expect(map.setFilter).not.toHaveBeenCalled();

      const filter = ['==', ['get', 'kind'], 'city'];
      update(fixture, { maxZoom: 8, filter });
      expect(map.setLayerZoomRange).toHaveBeenCalledExactlyOnceWith(LAYER, 0, 8);
      expect(map.setFilter).toHaveBeenCalledExactlyOnceWith(LAYER, filter);
    });
  });

  describe('images', () => {
    const IMAGES = { a: '/a.png', b: { url: '/b.png', sdf: true, pixelRatio: 2 } };

    it('decodes URL images once and adds them before the layer', async () => {
      const { map } = await renderLoaded({ images: IMAGES, icon: ['get', 'kind'] });

      expect(map.loadImage).toHaveBeenCalledTimes(2);
      expect(map.hasImage('a')).toBe(true);
      expect(map.hasImage('b')).toBe(true);
      expect(map.calls.indexOf('addImage:a')).toBeLessThan(map.calls.indexOf(`addLayer:${LAYER}`));
    });

    it('passes sdf and pixelRatio to addImage', async () => {
      const addImage = vi.spyOn(FakeMapClass.prototype, 'addImage');
      await renderLoaded({ images: IMAGES });

      expect(addImage.mock.calls.find((c) => c[0] === 'a')?.[2]).toEqual({
        sdf: false,
        pixelRatio: 1,
      });
      expect(addImage.mock.calls.find((c) => c[0] === 'b')?.[2]).toEqual({
        sdf: true,
        pixelRatio: 2,
      });
    });

    it('re-adds images from the cache after a theme switch, without refetching', async () => {
      const { fixture, map } = await renderLoaded({ images: IMAGES });
      expect(map.loadImage).toHaveBeenCalledTimes(2);

      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);
      await settle(fixture);

      expect(map.hasImage('a')).toBe(true);
      expect(map.hasImage('b')).toBe(true);
      expect(map.getLayerOrder()).toEqual([LAYER]);
      expect(map.loadImage).toHaveBeenCalledTimes(2);
    });

    it('adds, swaps and removes images on change without adding the layer again', async () => {
      const { fixture, map } = await renderLoaded({ images: IMAGES });
      const layersAdded = () => map.calls.filter((c) => c === `addLayer:${LAYER}`).length;
      expect(layersAdded()).toBe(1);
      map.calls.length = 0;

      // c is new, b is swapped (different pixelRatio), a is dropped.
      update(fixture, { images: { b: { url: '/b.png', sdf: true, pixelRatio: 3 }, c: '/c.png' } });
      await settle(fixture);

      expect(map.hasImage('a')).toBe(false);
      expect(map.hasImage('b')).toBe(true);
      expect(map.hasImage('c')).toBe(true);
      expect(addImageCalls(map)).toEqual(
        expect.arrayContaining(['removeImage:b', 'addImage:b', 'addImage:c', 'removeImage:a']),
      );
      expect(map.calls.filter((c) => c === `addLayer:${LAYER}`)).toEqual([]);
      expect(map.getLayerOrder()).toEqual([LAYER]);
    });

    it('does not touch an image that did not change', async () => {
      const { fixture, map } = await renderLoaded({ images: IMAGES });
      map.calls.length = 0;

      update(fixture, { images: { ...IMAGES, c: '/c.png' } });
      await settle(fixture);

      expect(addImageCalls(map)).toEqual(['addImage:c']);
    });

    it('never replaces or removes images that exist in the style already', async () => {
      const result = await render({ images: { a: '/a.png', b: '/b.png' } });
      const { fixture, map } = result;
      map.addImage('a', { width: 1, height: 1, data: new Uint8Array(4) });
      loadAndSettle(fixture, map);

      expect(map.calls.filter((c) => c === 'addImage:a')).toHaveLength(1);

      update(fixture, { images: {} });
      await settle(fixture);
      expect(map.hasImage('a')).toBe(true);
      expect(map.hasImage('b')).toBe(false);

      update(fixture, { show: false });
      expect(map.hasImage('a')).toBe(true);
    });

    it('accepts decoded pixel data without loading anything', async () => {
      const data = { width: 1, height: 1, data: new Uint8ClampedArray(4) };
      const { map } = await renderLoaded({ images: { px: { data } } });

      expect(map.loadImage).not.toHaveBeenCalled();
      expect(map.hasImage('px')).toBe(true);
    });

    it('reports a failed image and still creates the layer', async () => {
      const result = await render();
      const { fixture, map, host } = result;
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      map.loadImage.mockRejectedValueOnce(new Error('404'));
      update(fixture, { images: { bad: '/bad.png', ok: '/ok.png' } });
      await settle(fixture);
      loadAndSettle(fixture, map);

      expect(host['mapError']).toHaveBeenCalledTimes(1);
      expect(host['mapError'].mock.calls[0][0].message).toBe('404');
      expect(map.hasImage('bad')).toBe(false);
      expect(map.getLayerOrder()).toEqual([LAYER]);
    });
  });

  describe('teardown (invariant 4)', () => {
    it('removes the layer, then the source, then its own images', async () => {
      const { fixture, map } = await renderLoaded({ images: { a: '/a.png' } });
      map.calls.length = 0;

      update(fixture, { show: false });

      expect(map.calls.filter((c) => /^(remove)/.test(c))).toEqual([
        `removeLayer:${LAYER}`,
        `removeSource:${SOURCE}`,
        'removeImage:a',
      ]);
    });

    it('does not throw when the map is mid-reload', async () => {
      const { fixture, map } = await renderLoaded({ images: { a: '/a.png' } });
      vi.spyOn(map, 'removeLayer').mockImplementation(() => {
        throw new Error('style reloading');
      });
      vi.spyOn(map, 'removeImage').mockImplementation(() => {
        throw new Error('style reloading');
      });

      expect(() => update(fixture, { show: false })).not.toThrow();
    });
  });

  describe('creation failures', () => {
    it('reports an unknown beforeId, without leaving images behind', async () => {
      const { fixture, map, host } = await render({
        beforeId: 'missing',
        images: { a: '/a.png' },
      });
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      expect(() => loadAndSettle(fixture, map)).not.toThrow();
      expect(host['mapError']).toHaveBeenCalled();
      expect(map.getLayer(LAYER)).toBeUndefined();
      expect(map.getSource(SOURCE)).toBeUndefined();
      expect(map.hasImage('a')).toBe(false);
    });
  });

  describe('interaction', () => {
    it('binds nothing while not interactive', async () => {
      const { map } = await renderLoaded();

      expect(map.listenerCount('click', LAYER)).toBe(0);
    });

    it('emits featureClick and featureHover, and sets the cursor', async () => {
      const { map, host } = await renderLoaded({ interactive: true });

      map.fire('mousemove', mouseEvent(1, 7, 8), LAYER);
      expect(map.getCanvas().style.cursor).toBe('pointer');
      expect(host['featureHover']).toHaveBeenCalledTimes(1);
      expect(host['featureHover'].mock.calls[0][0]).toMatchObject({ longitude: 7, latitude: 8 });

      map.fire('mousemove', mouseEvent(1, 9, 9), LAYER);
      expect(host['featureHover']).toHaveBeenCalledTimes(1);

      map.fire('mousemove', mouseEvent(2), LAYER);
      expect(host['featureHover']).toHaveBeenCalledTimes(2);

      map.fire('click', mouseEvent(3, 1, 2), LAYER);
      expect(host['featureClick']).toHaveBeenCalledTimes(1);
      expect(host['featureClick'].mock.calls[0][0].feature.properties).toEqual({
        name: 'Florence',
      });

      map.fire('mouseleave', {}, LAYER);
      expect(host['featureHover']).toHaveBeenLastCalledWith(null);
      expect(map.getCanvas().style.cursor).toBe('');
    });

    it('reports a hover without an id once per enter', async () => {
      const { map, host } = await renderLoaded({ interactive: true });

      map.fire('mousemove', mouseEvent(undefined), LAYER);
      map.fire('mousemove', mouseEvent(undefined), LAYER);

      expect(host['featureHover']).toHaveBeenCalledTimes(1);
    });

    it('unbinds symmetrically when interactive turns off', async () => {
      const { fixture, map, host } = await renderLoaded({ interactive: true });
      expect(map.listenerCount('mousemove', LAYER)).toBe(1);

      update(fixture, { interactive: false });

      for (const event of ['mousemove', 'mouseleave', 'click']) {
        expect(map.listenerCount(event, LAYER)).toBe(0);
      }
      map.fire('click', mouseEvent(1), LAYER);
      expect(host['featureClick']).not.toHaveBeenCalled();
    });

    it('rebinds after a theme switch', async () => {
      const { fixture, map } = await renderLoaded({ interactive: true });

      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);

      expect(map.listenerCount('click', LAYER)).toBe(1);
    });
  });
});
