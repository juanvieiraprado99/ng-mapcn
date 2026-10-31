import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  MapMarkerComponent,
  MapPopupComponent,
  MapRouteComponent,
  MarkerContentComponent,
  MarkerPopupComponent,
} from 'ng-mapcn';
import {
  configureMapTesting,
  fireMapEvent,
  getFakeMap,
  loadMap,
  MAP_TEST_SELECTORS,
  reloadStyle,
  renderMap,
  resetMapTesting,
  structuralCalls,
} from 'ng-mapcn/testing';
import { NgMapHarness, NgMapPopupHarness } from 'ng-mapcn/testing/harness';
import { fakeRegistry } from 'ng-mapcn/testing/maplibre';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TestingComponent } from './pages/docs/testing';
import {
  ANGULAR_JSON_TEST,
  EVENTS_SPEC,
  FAKE_TIMERS_SPEC,
  FIRST_SPEC,
  HARNESS_SPEC,
  JEST_CONFIG,
  JEST_SETUP,
  POPUP_CLICKS_SPEC,
  SELECTORS_E2E,
  VITEST_CONFIG,
  VITEST_SETUP,
} from './pages/docs/testing.examples';

// The code of the /docs/testing page. Each block below is a snippet of
// pages/docs/testing.examples.ts, and runs here exactly as it is documented.

const TEMPLATE = `
  <ng-map>
    <ng-map-marker [longitude]="2" [latitude]="3" />
    <ng-map-route id="trip" [coordinates]="coordinates" />
  </ng-map>
`;

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
});
describe('route interactions', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('emits routeClick when the route layer is clicked', async () => {
    const routeClick = vi.fn();
    const { fixture } = await renderMap(
      `<ng-map>
        <ng-map-route id="trip" [coordinates]="coordinates" (routeClick)="routeClick($event)" />
      </ng-map>`,
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
      `<ng-map [theme]="theme()">
        <ng-map-route id="trip" [coordinates]="coordinates" />
      </ng-map>`,
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
});
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
});
describe('popups and map clicks', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('keeps a popup open on map clicks with closeOnClick off', async () => {
    const { fixture } = await renderMap(
      `<ng-map>
        <ng-map-popup [longitude]="2" [latitude]="48" [closeOnClick]="false">Pinned</ng-map-popup>
        <ng-map-popup [longitude]="13" [latitude]="52">Closes on a map click</ng-map-popup>
      </ng-map>`,
      { imports: [MapPopupComponent] },
    );
    await loadMap(fixture);
    const openPopups = () =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('.maplibregl-popup'),
        (popup) => popup.textContent?.trim(),
      );
    expect(openPopups()).toEqual(['Pinned', 'Closes on a map click']);

    // Like MapLibre, the fake closes every popup without closeOnClick: false on a map click.
    fireMapEvent(getFakeMap(fixture), 'click', { lngLat: { lng: 0, lat: 0 } });

    expect(openPopups()).toEqual(['Pinned']);
  });
});
describe('marker popup', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('opens on click and closes with its close button', async () => {
    const { fixture } = await renderMap(
      `<ng-map>
        <ng-map-marker [longitude]="-46.63" [latitude]="-23.55" ariaLabel="São Paulo">
          <ng-marker-content>SP</ng-marker-content>
          <ng-marker-popup [closeButton]="true">Largest city in Brazil</ng-marker-popup>
        </ng-map-marker>
      </ng-map>`,
      { imports: [MapMarkerComponent, MarkerContentComponent, MarkerPopupComponent] },
    );
    await loadMap(fixture);

    const loader = TestbedHarnessEnvironment.loader(fixture);
    const map = await loader.getHarness(NgMapHarness);
    const [marker] = await map.getMarkers({ label: 'São Paulo' });
    expect(await marker.getText()).toBe('SP');
    expect(await map.getPopups()).toHaveLength(0);

    await marker.click();

    // aria-expanded on the marker: this marker's popup, not any popup on the map.
    expect(await marker.isPopupOpen()).toBe(true);
    const popup = await loader.getHarness(NgMapPopupHarness.with({ text: /Largest city/ }));
    expect(await popup.isTooltip()).toBe(false);

    await popup.close();
    expect(await marker.isPopupOpen()).toBe(false);
    expect(await map.getPopups()).toHaveLength(0);
  });
});
// ---------------------------------------------------------------------------------------------
// The documented code is the code above: these checks fail when /docs/testing drifts from it.
// ---------------------------------------------------------------------------------------------

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
const SPEC_SOURCE = read('projects/demo/src/app/docs-testing.spec.ts');

/** The statements `import { a, b as c } from 'module'` of `source`, as `module:name` pairs. */
function importedNames(source: string): string[] {
  const pairs: string[] = [];
  for (const [, names, module] of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)) {
    for (const name of names.split(',')) {
      const clean = name
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0];
      if (clean) pairs.push(`${module}:${clean}`);
    }
  }
  return pairs;
}

function splitSnippet(snippet: string): { imports: string; body: string } {
  const statements = [...snippet.matchAll(/import[\s\S]*?from '[^']+';\n/g)];
  const last = statements[statements.length - 1];
  const end = last.index + last[0].length;
  return { imports: snippet.slice(0, end), body: snippet.slice(end).replace(/^\n/, '') };
}

describe('docs: the documented specs are the specs that run', () => {
  const runnable = { FIRST_SPEC, EVENTS_SPEC, FAKE_TIMERS_SPEC, POPUP_CLICKS_SPEC, HARNESS_SPEC };

  for (const [name, snippet] of Object.entries(runnable)) {
    it(`${name}: the body appears in this file character for character`, () => {
      expect(SPEC_SOURCE).toContain(splitSnippet(snippet).body);
    });

    it(`${name}: every import is imported by this file`, () => {
      const available = importedNames(SPEC_SOURCE);
      for (const pair of importedNames(splitSnippet(snippet).imports)) {
        expect(available, pair).toContain(pair);
      }
    });
  }
});

describe('docs: setup and config snippets match the demo', () => {
  it('the Vitest setup uses the same mock and spy lines as the demo setup', () => {
    const setup = read('projects/demo/src/testing/setup.ts');
    for (const line of [
      "vi.mock('maplibre-gl', () => import('ng-mapcn/testing/maplibre'));",
      'configureFakeMapLibre({ spy: vi.fn });',
      "import { configureFakeMapLibre, fakeRegistry } from 'ng-mapcn/testing/maplibre';",
    ]) {
      expect(setup, line).toContain(line);
      expect(VITEST_SETUP, line).toContain(line);
    }
  });

  it('the Vitest config inlines ng-mapcn like the demo config', () => {
    const config = read('vitest.demo.config.mts');
    const inline = 'server: { deps: { inline: [/ng-mapcn/] } },';
    expect(config).toContain(inline);
    expect(VITEST_CONFIG).toContain(inline);
  });

  it('the angular.json snippet matches the demo test target', () => {
    const angularJson = JSON.parse(read('angular.json')).projects.demo.architect.test;
    const documented = JSON.parse(`{${ANGULAR_JSON_TEST}}`).test;
    expect(documented.builder).toBe(angularJson.builder);
    expect(Object.keys(documented.options).sort()).toEqual(['runnerConfig', 'setupFiles']);
    expect(angularJson.options.runnerConfig).toBeDefined();
    expect(angularJson.options.setupFiles).toHaveLength(1);
  });

  it('the selector table and the Playwright snippet match MAP_TEST_SELECTORS', () => {
    const rows = new TestingComponent().selectors;
    expect(rows.map((row) => [row.name, row.type])).toEqual(
      Object.entries(MAP_TEST_SELECTORS).map(([key, selector]) => [key, `'${selector}'`]),
    );
    expect(SELECTORS_E2E).toContain("import { MAP_TEST_SELECTORS as S } from 'ng-mapcn/testing';");
  });

  it('the Jest snippets map maplibre-gl to the fake', () => {
    expect(JEST_CONFIG).toContain("'^maplibre-gl$': 'ng-mapcn/testing/maplibre'");
    expect(JEST_SETUP).toContain('configureFakeMapLibre({ spy: jest.fn });');
  });
});
