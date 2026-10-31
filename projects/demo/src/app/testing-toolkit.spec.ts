import { TestBed } from '@angular/core/testing';
import { MapMarkerComponent, MapRouteComponent } from 'ng-mapcn';
import {
  configureMapTesting,
  getFakeMap,
  loadMap,
  renderMap,
  resetMapTesting,
  structuralCalls,
} from 'ng-mapcn/testing';
import { fakeRegistry, Map as FakeMapClass } from 'ng-mapcn/testing/maplibre';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Consumes the testing toolkit exactly like an app would: only the package's public entry points,
// with `maplibre-gl` mocked by `ng-mapcn/testing/maplibre` in `src/testing/setup.ts`.
const TEMPLATE = `
  <ng-map>
    <ng-map-marker [longitude]="2" [latitude]="3" />
    <ng-map-route id="trip" [coordinates]="coordinates" />
  </ng-map>
`;

const render = () =>
  renderMap(TEMPLATE, {
    imports: [MapMarkerComponent, MapRouteComponent],
    hostProps: {
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    },
  });

describe('ng-mapcn/testing (from the package)', () => {
  afterEach(() => {
    configureMapTesting({ advanceTimers: null });
    vi.useRealTimers();
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('renders a map with a marker and a route on the fake', async () => {
    const { fixture, ctx } = await render();
    await loadMap(fixture);

    const map = getFakeMap(fixture);
    expect(ctx.isLoaded()).toBe(true);
    expect(structuralCalls(map)).toEqual(['addSource:trip', 'addLayer:trip-layer']);
    expect(fakeRegistry.markers).toHaveLength(1);
    expect(fakeRegistry.markers[0].map).toBe(map);
    expect(fakeRegistry.markers[0].getLngLat()).toEqual({ lng: 2, lat: 3 });
  });

  it('shares one fake instance between the mocked maplibre-gl and the helpers', async () => {
    const { fixture, map } = await render();

    // The map ng-mapcn created through `maplibre-gl` is the one the helpers and the registry see.
    expect(map).toBeInstanceOf(FakeMapClass);
    expect(getFakeMap(fixture)).toBe(fakeRegistry.maps[0]);
    // `configureFakeMapLibre({ spy: vi.fn })` in the setup reached that same module.
    expect(vi.isMockFunction(map!.jumpTo)).toBe(true);
    // `resetMapTesting` (inside `ng-mapcn/testing`) clears the registry this spec imports.
    resetMapTesting();
    expect(fakeRegistry.maps).toHaveLength(0);
  });

  it('loads with fake timers through configureMapTesting', async () => {
    vi.useFakeTimers();
    configureMapTesting({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    const { fixture, map } = await render();

    await loadMap(fixture);

    expect(structuralCalls(map!)).toEqual(['addSource:trip', 'addLayer:trip-layer']);
  });

  // The demo is zoneless: the detection cannot lean on zone.js's saved original here.
  describe('fake-timer detection without zone.js', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('throws for an untagged fake-timer library instead of hanging', async () => {
      const { fixture, ctx } = await render();
      vi.stubGlobal('setTimeout', () => 0);

      await expect(loadMap(fixture)).rejects.toThrow(/fake timers are installed/);
      expect(ctx.isLoaded()).toBe(false);
    });

    it('accepts a spy on setTimeout that calls through', async () => {
      const { fixture, ctx } = await render();
      vi.spyOn(globalThis, 'setTimeout');

      await loadMap(fixture);

      expect(ctx.isLoaded()).toBe(true);
    });
  });
});
