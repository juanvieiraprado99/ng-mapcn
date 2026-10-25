import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addProtocol,
  configureFakeMapLibre,
  fakeRegistry,
  Map as FakeMap,
  Marker,
  Popup,
  removeProtocol,
} from './maplibre-fake';

function createMap(options: Record<string, unknown> = {}): FakeMap {
  return new FakeMap({ center: [0, 0], zoom: 1, ...options } as any);
}

function geojsonSource() {
  return { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } as any;
}

describe('maplibre-fake', () => {
  it('addControl places the element in the corner container', () => {
    const map = createMap();
    const el = document.createElement('div');
    map.addControl({ onAdd: () => el, onRemove: vi.fn() }, 'bottom-left');

    expect(map.getContainer().querySelector('.maplibregl-ctrl-bottom-left')!.contains(el)).toBe(
      true,
    );
    expect(map.calls).toContain('addControl:bottom-left');
  });

  it('removeControl calls onRemove', () => {
    const map = createMap();
    const control = { onAdd: () => document.createElement('div'), onRemove: vi.fn() };
    map.addControl(control);
    expect(map.hasControl(control)).toBe(true);

    map.removeControl(control);

    expect(control.onRemove).toHaveBeenCalledWith(map);
    expect(map.hasControl(control)).toBe(false);
    expect(map.calls).toContain('removeControl');
  });

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

  it('fitBounds centers the camera on the bounds, records the call and fires move', () => {
    const map = createMap();
    const onMove = vi.fn();
    map.on('move', onMove);

    expect(map.fitBounds([0, 10, 20, 30], { maxZoom: 7 })).toBe(map);

    expect(map.getCenter()).toEqual({ lng: 10, lat: 20 });
    expect(map.getZoom()).toBe(7);
    expect(map.calls).toContain('fitBounds');
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it('setLayerZoomRange updates the layer zoom range and is not structural', () => {
    const map = createMap();
    map.addSource('s', geojsonSource());
    map.addLayer({ id: 'l', type: 'heatmap', source: 's' } as any);

    expect(map.setLayerZoomRange('l', 2, 9)).toBe(map);

    expect(map.getLayer('l').minzoom).toBe(2);
    expect(map.getLayer('l').maxzoom).toBe(9);
    expect(map.calls).toContain('setLayerZoomRange:l');
  });

  it('setTerrain/getTerrain keep the terrain, require the source and are not structural', () => {
    const map = createMap();
    expect(map.getTerrain()).toBeNull();
    expect(() => map.setTerrain({ source: 'dem' })).toThrow('no source with ID: dem');

    map.addSource('dem', { type: 'raster-dem', tiles: ['a'] } as any);
    expect(map.setTerrain({ source: 'dem', exaggeration: 2 })).toBe(map);

    expect(map.getTerrain()).toEqual({ source: 'dem', exaggeration: 2 });
    expect(map.setTerrain).toHaveBeenLastCalledWith({ source: 'dem', exaggeration: 2 });
    expect(map.calls).toContain('setTerrain:dem');

    map.setTerrain(null);
    expect(map.getTerrain()).toBeNull();
    expect(map.calls).toContain('setTerrain:null');
  });

  it('the terrain is style-level: finishing a style load drops it', () => {
    const map = createMap();
    map.addSource('dem', { type: 'raster-dem', tiles: ['a'] } as any);
    map.setTerrain({ source: 'dem' });

    map.setStyle('https://example.com/style.json');
    expect(map.getTerrain()).not.toBeNull();
    map.finishStyleLoad();

    expect(map.getTerrain()).toBeNull();
  });

  it('setFilter stores the filter on the layer', () => {
    const map = createMap();
    map.addSource('s', geojsonSource());
    map.addLayer({ id: 'l', type: 'fill-extrusion', source: 's' } as any);

    map.setFilter('l', ['==', ['get', 'a'], 1]);

    expect(map.getLayer('l').filter).toEqual(['==', ['get', 'a'], 1]);
    expect(map.calls).toContain('setFilter:l');
  });

  it('tile and image sources expose the in-place updaters as spies', () => {
    const map = createMap();
    map.addSource('t', { type: 'raster', tiles: ['a'] } as any);
    map.addSource('i', { type: 'image', url: 'u', coordinates: [] } as any);

    const tiles = map.getSource('t');
    tiles.setTiles(['b']);
    tiles.setUrl('https://x/tiles.json');
    const image = map.getSource('i');
    image.updateImage({ url: 'v' });
    image.setCoordinates([[0, 0]]);

    expect(tiles.setTiles).toHaveBeenCalledWith(['b']);
    expect(tiles.setUrl).toHaveBeenCalledWith('https://x/tiles.json');
    expect(image.updateImage).toHaveBeenCalledWith({ url: 'v' });
    expect(image.setCoordinates).toHaveBeenCalledWith([[0, 0]]);
  });

  it('addProtocol / removeProtocol record custom protocols and the registry resets them', () => {
    const load = vi.fn();
    addProtocol('pmtiles', load);
    expect(fakeRegistry.protocols['pmtiles']).toBe(load);
    removeProtocol('pmtiles');
    expect(fakeRegistry.protocols['pmtiles']).toBeUndefined();

    addProtocol('x', load);
    fakeRegistry.reset();
    expect(fakeRegistry.protocols).toEqual({});
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

  describe('DOM', () => {
    afterEach(() => document.body.replaceChildren());

    function attachedMap(): { map: FakeMap; container: HTMLElement } {
      const container = document.body.appendChild(document.createElement('div'));
      return { map: createMap({ container }), container };
    }

    it('renders into options.container: canvas and control containers, fullscreen spy', () => {
      const { map, container } = attachedMap();

      expect(map.getContainer()).toBe(container);
      expect(container.classList).toContain('maplibregl-map');
      expect(map.getCanvasContainer().parentElement).toBe(container);
      expect(map.getCanvasContainer().className).toBe('maplibregl-canvas-container');
      expect(map.getCanvasContainer().contains(map.getCanvas())).toBe(true);
      expect(container.querySelector(':scope > .maplibregl-control-container')).not.toBeNull();
      expect(typeof map.getContainer().requestFullscreen).toBe('function');
    });

    it('without options.container it renders into a detached element', () => {
      const map = createMap();

      expect(map.getContainer().isConnected).toBe(false);
      expect(map.getContainer().querySelector('.maplibregl-canvas-container')).not.toBeNull();
    });

    it('addControl puts the corner inside the control container', () => {
      const { map, container } = attachedMap();
      const el = document.createElement('div');
      map.addControl({ onAdd: () => el, onRemove: vi.fn() }, 'top-left');

      expect(
        container.querySelector('.maplibregl-control-container > .maplibregl-ctrl-top-left'),
      ).toBe(el.parentElement);
    });

    it('remove() takes what the map added out of the container', () => {
      const { map, container } = attachedMap();
      new Marker().setLngLat([1, 2]).addTo(map);
      map.addControl({ onAdd: () => document.createElement('div'), onRemove: vi.fn() });

      map.remove();

      expect(container.children).toHaveLength(0);
      expect(container.classList).not.toContain('maplibregl-map');
    });

    it('a marker element is tagged, attached to the canvas container by addTo and detached by remove', () => {
      const { map } = attachedMap();
      const element = document.createElement('div');
      const marker = new Marker({ element });

      expect(element.classList).toContain('maplibregl-marker');
      expect(element.isConnected).toBe(false);

      marker.setLngLat([1, 2]).addTo(map);
      expect(element.parentElement).toBe(map.getCanvasContainer());

      marker.remove();
      expect(element.isConnected).toBe(false);
    });

    it('a popup builds .maplibregl-popup > .maplibregl-popup-content in the map container while open', () => {
      const { map, container } = attachedMap();
      const content = document.createElement('p');
      const popup = new Popup().setDOMContent(content);
      expect(popup.getElement()).toBeUndefined();

      popup.setLngLat([1, 2]).addTo(map);

      const root = container.querySelector(':scope > .maplibregl-popup');
      expect(root).toBe(popup.getElement());
      expect(root!.querySelector(':scope > .maplibregl-popup-content')!.firstChild).toBe(content);

      popup.remove();
      expect(container.querySelector('.maplibregl-popup')).toBeNull();
      expect(popup.getContent()).toBe(content);
    });

    it('addTo on an open popup closes it first and leaves the previous map, like MapLibre', () => {
      const first = attachedMap();
      const second = attachedMap();
      const popup = new Popup().setDOMContent(document.createElement('p')).addTo(first.map);
      const events: string[] = [];
      popup.on('open', () => events.push('open'));
      popup.on('close', () => events.push('close'));

      popup.addTo(second.map);

      expect(events).toEqual(['close', 'open']);
      expect(first.map.listenerCount('remove')).toBe(0);
      expect(second.map.listenerCount('remove')).toBe(1);
      expect(first.container.querySelector('.maplibregl-popup')).toBeNull();
      expect(second.container.querySelector('.maplibregl-popup')).toBe(popup.getElement());

      // Re-adding to the same map does not stack a second `remove` listener either.
      popup.addTo(second.map);
      expect(second.map.listenerCount('remove')).toBe(1);
    });

    it('setDOMContent on an open popup replaces the content in place', () => {
      const { map, container } = attachedMap();
      const popup = new Popup().setDOMContent(document.createElement('p')).addTo(map);
      const next = document.createElement('span');

      popup.setDOMContent(next);

      expect([...container.querySelector('.maplibregl-popup-content')!.childNodes]).toEqual([next]);
    });
  });

  describe('togglePopup', () => {
    afterEach(() => document.body.replaceChildren());

    function markerWithPopup() {
      const container = document.body.appendChild(document.createElement('div'));
      const map = createMap({ container });
      const popup = new Popup().setDOMContent(document.createElement('p'));
      const open = vi.fn();
      const close = vi.fn();
      popup.on('open', open);
      popup.on('close', close);
      const marker = new Marker().setLngLat([3, 4]).addTo(map).setPopup(popup);
      return { map, container, popup, marker, open, close };
    }

    it('opens the popup at the marker, then closes it, firing open and close', () => {
      const { container, popup, marker, open, close } = markerWithPopup();

      marker.togglePopup();
      expect(popup.isOpen()).toBe(true);
      expect(popup.getLngLat()).toEqual({ lng: 3, lat: 4 });
      expect(container.querySelector('.maplibregl-popup')).not.toBeNull();
      expect(open).toHaveBeenCalledTimes(1);

      marker.togglePopup();
      expect(popup.isOpen()).toBe(false);
      expect(container.querySelector('.maplibregl-popup')).toBeNull();
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('a click on the marker element toggles the popup', () => {
      const { popup, marker } = markerWithPopup();

      marker.getElement().click();
      expect(popup.isOpen()).toBe(true);
      marker.getElement().click();
      expect(popup.isOpen()).toBe(false);
    });

    it('Enter and Space keypresses on the marker element toggle the popup', () => {
      const { popup, marker } = markerWithPopup();
      const press = (key: string) =>
        marker.getElement().dispatchEvent(new KeyboardEvent('keypress', { key }));

      press('Enter');
      expect(popup.isOpen()).toBe(true);
      press(' ');
      expect(popup.isOpen()).toBe(false);
      press('a');
      expect(popup.isOpen()).toBe(false);
    });

    it('a map click closes the popup unless closeOnClick is false, like MapLibre', () => {
      const { map, popup, marker, close } = markerWithPopup();
      const kept = new Popup({ closeOnClick: false }).addTo(map);

      marker.togglePopup();
      map.fire('click');

      expect(popup.isOpen()).toBe(false);
      expect(close).toHaveBeenCalledTimes(1);
      expect(kept.isOpen()).toBe(true);
      expect(map.listenerCount('click')).toBe(0);
    });

    it('removing the marker closes its open popup', () => {
      const { popup, marker, close } = markerWithPopup();
      marker.togglePopup();

      marker.remove();

      expect(popup.isOpen()).toBe(false);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('clearing the popup removes the click toggle', () => {
      const { popup, marker } = markerWithPopup();

      marker.setPopup(null);
      marker.getElement().click();

      expect(popup.isOpen()).toBe(false);
      expect(marker.togglePopup().getPopup()).toBeNull();
    });

    it('a marker without a popup ignores clicks', () => {
      const container = document.body.appendChild(document.createElement('div'));
      const marker = new Marker().setLngLat([0, 0]).addTo(createMap({ container }));

      marker.getElement().click();

      expect(container.querySelector('.maplibregl-popup')).toBeNull();
    });
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

  describe('configureFakeMapLibre', () => {
    // The shared setup configures `vi.fn`; put it back for the other specs.
    afterEach(() => configureFakeMapLibre({ spy: vi.fn }));

    it('defaults to plain methods, so no test runner is needed', () => {
      configureFakeMapLibre({ spy: undefined });
      const map = createMap();

      expect(vi.isMockFunction(map.jumpTo)).toBe(false);
      map.jumpTo({ zoom: 4 });
      expect(map.getZoom()).toBe(4);
      expect(map.calls).toContain('jumpTo');
    });

    it('wraps each method implementation with the configured spy factory', () => {
      const wrapped: unknown[] = [];
      configureFakeMapLibre({
        spy: (impl) => {
          const fn = vi.fn(impl);
          wrapped.push(fn);
          return fn;
        },
      });
      const map = createMap();

      expect(vi.isMockFunction(map.jumpTo)).toBe(true);
      expect(wrapped).toContain(map.setStyle);
      map.jumpTo({ zoom: 3 });
      expect(map.jumpTo).toHaveBeenCalledWith({ zoom: 3 });
      expect(map.getZoom()).toBe(3);
      map.addSource('s', geojsonSource());
      expect(vi.isMockFunction(map.getSource('s').setData)).toBe(true);
    });

    it('passing no key keeps the current factory', () => {
      configureFakeMapLibre({});
      expect(vi.isMockFunction(createMap().jumpTo)).toBe(true);
    });

    it('fakeRegistry.reset() keeps the configuration', () => {
      configureFakeMapLibre({ spy: vi.fn });
      fakeRegistry.reset();
      // The default is the identity, so a reset that restored it would yield a plain method.
      expect(vi.isMockFunction(createMap().jumpTo)).toBe(true);
    });
  });
});
