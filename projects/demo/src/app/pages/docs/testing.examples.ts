/**
 * Code shown on `/docs/testing`. The runnable specs (FIRST_SPEC, EVENTS_SPEC, FAKE_TIMERS_SPEC and
 * HARNESS_SPEC) are executed verbatim by `docs-testing.spec.ts`, which fails when this text and the
 * spec drift apart. The setup and runner configs cannot run inside a spec: the spec only
 * cross-checks their key lines against the demo's real setup.
 */

export const INSTALL_CDK = 'npm install --save-dev @angular/cdk';

/** `src/testing/setup.ts`, listed in `setupFiles`. */
export const VITEST_SETUP = `import { configureFakeMapLibre, fakeRegistry } from 'ng-mapcn/testing/maplibre';
import { beforeEach, vi } from 'vitest';

// Replace maplibre-gl with the fake for every spec.
vi.mock('maplibre-gl', () => import('ng-mapcn/testing/maplibre'));

// Make the fake's methods vi.fn() spies (jumpTo, setStyle, setData, ...).
configureFakeMapLibre({ spy: vi.fn });

beforeEach(() => fakeRegistry.reset());`;

/** `vitest.config.mts`, wired through `runnerConfig` for the Angular CLI builder. */
export const VITEST_CONFIG = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Without this, Node loads ng-mapcn from node_modules and it
    // imports the real maplibre-gl, so the mock never applies.
    server: { deps: { inline: [/ng-mapcn/] } },
  },
});`;

export const ANGULAR_JSON_TEST = `"test": {
  "builder": "@angular/build:unit-test",
  "options": {
    "setupFiles": ["src/testing/setup.ts"],
    "runnerConfig": "vitest.config.mts"
  }
}`;

export const JEST_CONFIG = `// jest.config.js
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/src/testing/setup.ts'],
  moduleNameMapper: {
    '^maplibre-gl$': 'ng-mapcn/testing/maplibre',
  },
};`;

export const JEST_SETUP = `// src/testing/setup.ts
import { configureFakeMapLibre, fakeRegistry } from 'ng-mapcn/testing/maplibre';

configureFakeMapLibre({ spy: jest.fn });

beforeEach(() => fakeRegistry.reset());`;

export const FIRST_SPEC = `import { TestBed } from '@angular/core/testing';
import { MapMarkerComponent, MapRouteComponent } from 'ng-mapcn';
import { getFakeMap, loadMap, renderMap, resetMapTesting, structuralCalls } from 'ng-mapcn/testing';
import { fakeRegistry } from 'ng-mapcn/testing/maplibre';
import { afterEach, describe, expect, it } from 'vitest';

const TEMPLATE = \`
  <ng-map>
    <ng-map-marker [longitude]="2" [latitude]="3" />
    <ng-map-route id="trip" [coordinates]="coordinates" />
  </ng-map>
\`;

describe('delivery map', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('adds the route once the style has loaded', async () => {
    const { fixture, ctx } = await renderMap(TEMPLATE, {
      imports: [MapMarkerComponent, MapRouteComponent],
      hostProps: {
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
    });
    const map = getFakeMap(fixture);

    // Nothing is added until the map has loaded: layer components wait for ctx.isLoaded().
    expect(ctx.isLoaded()).toBe(false);
    expect(structuralCalls(map)).toEqual([]);

    await loadMap(fixture);

    expect(ctx.isLoaded()).toBe(true);
    expect(structuralCalls(map)).toEqual(['addSource:trip', 'addLayer:trip-layer']);
    expect(map.getLayer('trip-layer')).toBeDefined();
    expect(fakeRegistry.markers).toHaveLength(1);
    expect(fakeRegistry.markers[0].getLngLat()).toEqual({ lng: 2, lat: 3 });
  });
});`;

export const EVENTS_SPEC = `import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MapRouteComponent } from 'ng-mapcn';
import {
  fireMapEvent,
  getFakeMap,
  loadMap,
  reloadStyle,
  renderMap,
  resetMapTesting,
  structuralCalls,
} from 'ng-mapcn/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('route interactions', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('emits routeClick when the route layer is clicked', async () => {
    const routeClick = vi.fn();
    const { fixture } = await renderMap(
      \`<ng-map>
        <ng-map-route id="trip" [coordinates]="coordinates" (routeClick)="routeClick($event)" />
      </ng-map>\`,
      {
        imports: [MapRouteComponent],
        hostProps: {
          routeClick,
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      },
    );
    await loadMap(fixture);

    // Layer events are fired with the layer id, like map.on('click', layerId, handler).
    fireMapEvent(getFakeMap(fixture), 'click', { lngLat: { lng: 1, lat: 1 } }, 'trip-layer');

    expect(routeClick).toHaveBeenCalledWith(
      expect.objectContaining({ lngLat: { lng: 1, lat: 1 } }),
    );
  });

  it('adds the route again after a theme switch', async () => {
    const theme = signal<'light' | 'dark'>('light');
    const { fixture } = await renderMap(
      \`<ng-map [theme]="theme()">
        <ng-map-route id="trip" [coordinates]="coordinates" />
      </ng-map>\`,
      {
        imports: [MapRouteComponent],
        hostProps: {
          theme,
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      },
    );
    const map = getFakeMap(fixture);
    await loadMap(fixture);

    // The new theme calls map.setStyle(); the style arrives with reloadStyle().
    theme.set('dark');
    fixture.detectChanges();
    await reloadStyle(fixture);

    expect(structuralCalls(map)).toEqual([
      'addSource:trip',
      'addLayer:trip-layer',
      'removeLayer:trip-layer',
      'removeSource:trip',
      'addSource:trip',
      'addLayer:trip-layer',
    ]);
  });
});`;

export const FAKE_TIMERS_SPEC = `import { TestBed } from '@angular/core/testing';
import { MapRouteComponent } from 'ng-mapcn';
import {
  configureMapTesting,
  getFakeMap,
  loadMap,
  renderMap,
  resetMapTesting,
  structuralCalls,
} from 'ng-mapcn/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('with fake timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // loadMap() waits 100 ms for the style debounce: tell it how to advance your fake clock.
    configureMapTesting({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
  });

  afterEach(() => {
    configureMapTesting({ advanceTimers: null });
    vi.useRealTimers();
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('loads the map without waiting on a real timer', async () => {
    const { fixture } = await renderMap(
      '<ng-map><ng-map-route id="trip" [coordinates]="coordinates" /></ng-map>',
      {
        imports: [MapRouteComponent],
        hostProps: {
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      },
    );

    await loadMap(fixture);

    expect(structuralCalls(getFakeMap(fixture))).toEqual(['addSource:trip', 'addLayer:trip-layer']);
  });
});`;

export const HARNESS_SPEC = `import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MapMarkerComponent, MarkerContentComponent, MarkerPopupComponent } from 'ng-mapcn';
import { loadMap, renderMap, resetMapTesting } from 'ng-mapcn/testing';
import { NgMapHarness, NgMapPopupHarness } from 'ng-mapcn/testing/harness';
import { afterEach, describe, expect, it } from 'vitest';

describe('marker popup', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('opens on click and closes with its close button', async () => {
    const { fixture } = await renderMap(
      \`<ng-map>
        <ng-map-marker [longitude]="-46.63" [latitude]="-23.55" ariaLabel="São Paulo">
          <ng-marker-content>SP</ng-marker-content>
          <ng-marker-popup [closeButton]="true">Largest city in Brazil</ng-marker-popup>
        </ng-map-marker>
      </ng-map>\`,
      { imports: [MapMarkerComponent, MarkerContentComponent, MarkerPopupComponent] },
    );
    await loadMap(fixture);

    const loader = TestbedHarnessEnvironment.loader(fixture);
    const map = await loader.getHarness(NgMapHarness);
    const [marker] = await map.getMarkers({ label: 'São Paulo' });
    expect(await marker.getText()).toBe('SP');
    expect(await map.getPopups()).toHaveLength(0);

    await marker.click();

    const popup = await loader.getHarness(NgMapPopupHarness.with({ text: /Largest city/ }));
    expect(await popup.isTooltip()).toBe(false);

    await popup.close();
    expect(await map.getPopups()).toHaveLength(0);
  });
});`;
