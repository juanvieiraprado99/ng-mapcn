import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test as base } from '@playwright/test';

/**
 * Minimal basemaps served for every style request: no tiles, no sprites and a glyphs URL that is never fetched (aborted), so the suite
 * never needs the network and maps become ready in about a second. The light and dark variants
 * differ (background colour) so a theme switch is a real `setStyle` that removes and re-adds the
 * layers added by the components, exactly like swapping Carto positron for dark-matter.
 */
export const LIGHT_BACKGROUND = '#eeeeee';
export const DARK_BACKGROUND = '#222222';

/**
 * Tiles URL of the basemap vector source, named `protomaps` like in the real Carto styles
 * (`carto.streets/v2` tiles). No layer uses it, so nothing is fetched until a spec adds one (the
 * 3D buildings extrusion does). `npm run check:basemaps` checks the live styles still match.
 */
export const CARTO_SOURCE = 'protomaps';
export const CARTO_TILES =
  'https://tiles.basemaps.cartocdn.com/v/20261001-03/vectortiles/carto.streets/v2/{z}/{x}/{y}.mvt';

export function minimalStyle(dark: boolean) {
  return {
    version: 8,
    glyphs: 'https://fonts.test/{fontstack}/{range}.pbf',
    sources: { [CARTO_SOURCE]: { type: 'vector', tiles: [CARTO_TILES], maxzoom: 14 } },
    layers: [
      {
        id: 'bg',
        type: 'background',
        paint: { 'background-color': dark ? DARK_BACKGROUND : LIGHT_BACKGROUND },
      },
    ],
  };
}

const FIXTURES_DIR = join(__dirname, 'fixtures');

/** Remote data the demo pages fetch, mapped to the local fixture that stands in for it. */
const REMOTE_DATA: { match: RegExp; file: string }[] = [
  { match: /natural-earth-vector.*ne_110m_admin_0_countries\.geojson$/, file: 'countries.json' },
  { match: /PublicaMundi\/MappingAPI.*us-states\.json$/, file: 'us-states.json' },
  {
    match: /maplibre\.org\/maplibre-gl-js\/docs\/assets\/earthquakes\.geojson$/,
    file: 'earthquakes.json',
  },
];

/** 1x1 transparent PNG for remote images and raster tiles, so they never hit the network. */
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

/**
 * OSRM routing stub: a straight 12-point line between the requested coordinates, in the shape of
 * the real `/route/v1/driving/<lng,lat;lng,lat>` response.
 */
function osrmResponse(pathname: string) {
  const [from, to] = decodeURIComponent(pathname.split('/').pop() ?? '')
    .split(';')
    .map((pair) => pair.split(',').map(Number));
  const steps = 12;
  const coordinates = Array.from({ length: steps + 1 }, (_, i) => [
    from[0] + ((to[0] - from[0]) * i) / steps,
    from[1] + ((to[1] - from[1]) * i) / steps,
  ]);
  return {
    code: 'Ok',
    routes: [{ geometry: { type: 'LineString', coordinates }, duration: 600, distance: 3200 }],
    waypoints: [],
  };
}

/** z14 tile of `buildings.mvt` (lower Manhattan); every other vector tile is served empty. */
const BUILDINGS_TILE = '/14/4823/6160.mvt';

/** Public Terrarium elevation tiles (`ng-map-terrain` default): one hill tile for every request. */
const TERRARIUM_TILES_PATH = '/elevation-tiles-prod/terrarium/';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/** Fails the test if the page asked for anything that is not served locally or faked below. */
export interface NetworkState {
  /** Requests that no fixture intercepted (asserted empty after every test). */
  blocked: string[];
  /** Console errors and uncaught exceptions (asserted empty after every test). */
  errors: string[];
  /** Simulated latency for basemap style responses, for specs about style swaps. Default 0. */
  styleDelayMs: number;
}

export const test = base.extend<{ network: NetworkState }>({
  network: [
    async ({ page }, use) => {
      const blocked: string[] = [];
      const errors: string[] = [];
      const state: NetworkState = { blocked, errors, styleDelayMs: 0 };

      page.on('console', (message) => {
        if (message.type() === 'error') {
          errors.push(`console.error: ${message.text()}`);
        }
      });
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

      await page.route(/^(?!data:|blob:).*/, async (route) => {
        const url = new URL(route.request().url());
        if (LOCAL_HOSTS.has(url.hostname)) {
          return route.continue();
        }
        if (/style\.json$|\/styles\/[^/]+$/.test(url.pathname)) {
          if (state.styleDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, state.styleDelayMs));
          }
          return route.fulfill({ json: minimalStyle(/dark/i.test(url.pathname)) });
        }
        if (url.hostname === 'router.project-osrm.org') {
          return route.fulfill({ json: osrmResponse(url.pathname) });
        }
        // The header's GitHub button fetches the repository star count.
        if (url.hostname === 'api.github.com') {
          return route.fulfill({
            json: { stargazers_count: 1234 },
            headers: { 'access-control-allow-origin': '*' },
          });
        }
        const data = REMOTE_DATA.find(({ match }) => match.test(url.href));
        if (data) {
          return route.fulfill({
            contentType: 'application/geo+json',
            body: readFileSync(join(FIXTURES_DIR, data.file)),
          });
        }
        // 3D: Carto vector tiles (buildings) and Terrarium elevation tiles.
        if (url.hostname.endsWith('basemaps.cartocdn.com') && url.pathname.endsWith('.mvt')) {
          return route.fulfill({
            contentType: 'application/vnd.mapbox-vector-tile',
            headers: { 'access-control-allow-origin': '*' },
            body: url.pathname.endsWith(BUILDINGS_TILE)
              ? readFileSync(join(FIXTURES_DIR, 'buildings.mvt'))
              : Buffer.alloc(0),
          });
        }
        if (url.hostname === 's3.amazonaws.com' && url.pathname.startsWith(TERRARIUM_TILES_PATH)) {
          return route.fulfill({
            contentType: 'image/png',
            headers: { 'access-control-allow-origin': '*' },
            body: readFileSync(join(FIXTURES_DIR, 'terrarium.png')),
          });
        }
        // Glyph ranges of the minimal style: an empty PBF is a valid, empty glyph set.
        if (url.hostname === 'fonts.test' && url.pathname.endsWith('.pbf')) {
          return route.fulfill({
            contentType: 'application/x-protobuf',
            headers: { 'access-control-allow-origin': '*' },
            body: Buffer.alloc(0),
          });
        }
        // Raster basemap tiles (the OpenStreetMap example on the basemaps page) and <img> sources.
        if (
          url.hostname === 'tile.openstreetmap.org' ||
          route.request().resourceType() === 'image'
        ) {
          return route.fulfill({ contentType: 'image/png', body: PIXEL_PNG });
        }
        blocked.push(`${route.request().method()} ${url.href}`);
        return route.abort();
      });

      await use(state);

      // Asserted here (not in afterEach) so every spec gets the guards for free.
      expect.soft(blocked, 'requests that no fixture intercepted').toEqual([]);
      expect.soft(errors, 'console errors / uncaught exceptions').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
