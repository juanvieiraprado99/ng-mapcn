import { describe, expect, it, vi } from 'vitest';

import { fakeRegistry, Map as FakeMap, Marker, Popup } from './maplibre-fake';

function createMap(options: Record<string, unknown> = {}): FakeMap {
  return new FakeMap({ center: [0, 0], zoom: 1, ...options } as any);
}

function geojsonSource() {
  return { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } as any;
}

describe('maplibre-fake', () => {
  it('removeSource throws while a layer uses the source', () => {
    const map = createMap();
    map.addSource('s', geojsonSource());
    map.addLayer({ id: 'l', type: 'line', source: 's' } as any);

    expect(() => map.removeSource('s')).toThrow(
      'Source "s" cannot be removed while layer "l" is using it.',
    );

    map.removeLayer('l');
    expect(() => map.removeSource('s')).not.toThrow();
    expect(map.getSource('s')).toBeUndefined();
  });

  it('addLayer throws on duplicate id', () => {
    const map = createMap();
    map.addSource('s', geojsonSource());
    map.addLayer({ id: 'l', type: 'line', source: 's' } as any);
    expect(() => map.addLayer({ id: 'l', type: 'line', source: 's' } as any)).toThrow();
  });

  it('addLayer throws on unknown source', () => {
    const map = createMap();
    expect(() => map.addLayer({ id: 'l', type: 'line', source: 'nope' } as any)).toThrow();
  });

  it('setStyle keeps the current style until the new one loads, then clears sources and layers', () => {
    const map = createMap();
    map.addSource('s', geojsonSource());
    map.addLayer({ id: 'l', type: 'line', source: 's' } as any);
    const onStyleLoad = vi.fn();
    const onStyleData = vi.fn();
    map.on('style.load', onStyleLoad);
    map.on('styledata', onStyleData);

    map.setStyle('https://example.com/style.json');

    expect(map.calls).toContain('setStyle');
    expect(map.hasPendingStyle()).toBe(true);
    expect(map.getLayer('l')).toBeDefined();

    map.finishStyleLoad();

    expect(map.hasPendingStyle()).toBe(false);
    expect(map.getSource('s')).toBeUndefined();
    expect(map.getLayer('l')).toBeUndefined();
    expect(onStyleLoad).toHaveBeenCalledTimes(1);
    expect(onStyleData).toHaveBeenCalledTimes(1);
  });

  it('jumpTo updates camera and fires move', () => {
    const map = createMap();
    const onMove = vi.fn();
    map.on('move', onMove);

    map.jumpTo({ center: [10, 20], zoom: 5, bearing: 30, pitch: 40 });

    expect(map.getCenter()).toEqual({ lng: 10, lat: 20 });
    expect(map.getZoom()).toBe(5);
    expect(map.getBearing()).toBe(30);
    expect(map.getPitch()).toBe(40);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(map.calls).toContain('jumpTo');
  });

  it('fire only calls handlers registered for the given layerId', () => {
    const map = createMap();
    const global = vi.fn();
    const layerA = vi.fn();
    const layerB = vi.fn();
    map.on('click', global);
    map.on('click', 'a', layerA);
    map.on('click', 'b', layerB);

    map.fire('click', {}, 'a');

    expect(layerA).toHaveBeenCalledTimes(1);
    expect(layerB).not.toHaveBeenCalled();
    expect(global).not.toHaveBeenCalled();

    map.fire('click');
    expect(global).toHaveBeenCalledTimes(1);
    expect(map.listenerCount('click', 'a')).toBe(1);
    expect(map.listenerCount('click')).toBe(1);
  });

  it('off removes exactly the handler', () => {
    const map = createMap();
    const h1 = vi.fn();
    const h2 = vi.fn();
    map.on('click', 'a', h1);
    map.on('click', 'a', h2);

    map.off('click', 'a', h1);
    map.fire('click', {}, 'a');

    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledTimes(1);
    expect(map.calls).toContain('off:click:a');
  });

  describe('registry', () => {
    it('registers instances (first test)', () => {
      createMap();
      new Marker();
      new Popup();
      expect(fakeRegistry.maps).toHaveLength(1);
      expect(fakeRegistry.markers).toHaveLength(1);
      expect(fakeRegistry.popups).toHaveLength(1);
    });

    it('registry resets between tests', () => {
      expect(fakeRegistry.maps).toHaveLength(0);
      expect(fakeRegistry.markers).toHaveLength(0);
      expect(fakeRegistry.popups).toHaveLength(0);
    });
  });
});
