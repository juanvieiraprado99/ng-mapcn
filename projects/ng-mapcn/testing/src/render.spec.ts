import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MapRouteComponent } from 'ng-mapcn';
import { fakeRegistry } from 'ng-mapcn/testing/maplibre';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  configureMapTesting,
  fireMapEvent,
  getFakeMap,
  loadMap,
  reloadStyle,
  renderMap,
  resetMapTesting,
  setMapSize,
  structuralCalls,
  update,
} from './render';

const TEMPLATE = `
  <ng-map [theme]="theme">
    <ng-map-route id="r" [coordinates]="coordinates" [color]="color" />
  </ng-map>
`;

const hostProps = () => ({
  theme: 'light',
  coordinates: [
    [0, 0],
    [1, 1],
  ],
  color: '#111111',
});

const render = () => renderMap(TEMPLATE, { imports: [MapRouteComponent], hostProps: hostProps() });

describe('ng-mapcn/testing', () => {
  afterEach(() => {
    configureMapTesting({ advanceTimers: null });
    vi.useRealTimers();
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('renderMap creates the map and returns its fake and context', async () => {
    const { fixture, map, ctx } = await render();

    expect(map).toBe(fakeRegistry.maps[0]);
    expect(getFakeMap(fixture)).toBe(map);
    expect(ctx.map()).toBe(map);
    expect(ctx.isLoaded()).toBe(false);
  });

  it('loadMap waits out the style debounce on a real timer by default', async () => {
    const { fixture, map, ctx } = await render();

    await loadMap(fixture);

    expect(ctx.isLoaded()).toBe(true);
    expect(structuralCalls(map!)).toEqual(['addSource:r', 'addLayer:r-layer']);
  });

  describe('with advanceTimers configured', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      configureMapTesting({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    });

    it('loadMap advances the fake clock instead of waiting', async () => {
      const { fixture, ctx } = await render();
      const advance = vi.spyOn(vi, 'advanceTimersByTime');

      await loadMap(fixture);

      expect(advance).toHaveBeenCalledWith(100);
      expect(ctx.isLoaded()).toBe(true);
    });

    it('reloadStyle re-adds the layers after a theme switch', async () => {
      const { fixture, map } = await render();
      await loadMap(fixture);

      update(fixture, { theme: 'dark' });
      expect(map!.hasPendingStyle()).toBe(true);
      await reloadStyle(fixture);

      expect(structuralCalls(map!)).toEqual([
        'addSource:r',
        'addLayer:r-layer',
        // The gate closes on setStyle: the route removes its layer, then re-adds it on the new style.
        'removeLayer:r-layer',
        'removeSource:r',
        'addSource:r',
        'addLayer:r-layer',
      ]);
      expect(map!.getLayer('r-layer')).toBeDefined();
    });
  });

  it('loadMap and reloadStyle throw instead of hanging on fake timers without advanceTimers', async () => {
    const { fixture, ctx } = await render();
    vi.useFakeTimers();

    await expect(loadMap(fixture)).rejects.toThrow(/configureMapTesting\(\{ advanceTimers \}\)/);
    await expect(reloadStyle(fixture)).rejects.toThrow(/^reloadStyle\(\) cannot wait/);
    // Nothing was fired: the map is left as it was.
    expect(ctx.isLoaded()).toBe(false);
  });

  it('update re-renders the host without zone.js (zoneless change detection)', async () => {
    const { fixture, map } = await renderMap(TEMPLATE, {
      imports: [MapRouteComponent],
      hostProps: hostProps(),
      providers: [provideZonelessChangeDetection()],
    });
    await loadMap(fixture);

    // A plain assignment marks nothing dirty without zone.js: update() must mark the host itself.
    update(fixture, { theme: 'dark' });

    expect(map!.hasPendingStyle()).toBe(true);
  });

  it('fireMapEvent reaches the handlers of a layer', async () => {
    const { fixture, map } = await render();
    await loadMap(fixture);
    const handler = vi.fn();
    map!.on('click', 'r', handler);

    fireMapEvent(map!, 'click', { lngLat: { lng: 1, lat: 2 } }, 'r');

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ lngLat: { lng: 1, lat: 2 } }));
  });

  it('getFakeMap throws when the map was not created', async () => {
    const { fixture, map } = await renderMap('<ng-map />', { size: null });

    expect(map).toBeUndefined();
    expect(() => getFakeMap(fixture)).toThrow(/has not created its map/);
  });

  it('resetMapTesting restores the HTMLElement offset getters and clears the registry', async () => {
    const proto = HTMLElement.prototype;
    const width = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
    const height = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');
    await render();
    setMapSize({ width: 640, height: 480 });

    expect(document.createElement('div').offsetWidth).toBe(640);
    expect(document.createElement('div').offsetHeight).toBe(480);

    resetMapTesting();

    expect(Object.getOwnPropertyDescriptor(proto, 'offsetWidth')).toEqual(width);
    expect(Object.getOwnPropertyDescriptor(proto, 'offsetHeight')).toEqual(height);
    expect(document.createElement('div').offsetWidth).toBe(0);
    expect(fakeRegistry.maps).toHaveLength(0);
  });
});
