import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test as base } from '@playwright/test';

/**
 * Minimal basemap served for every `style.json` request: no tiles, no glyphs, no sprites, so the
 * suite never needs the network and maps become ready in about a second.
 */
export const MINIMAL_STYLE = {
  version: 8,
  sources: {},
  layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#eee' } }],
};

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

/** 1x1 transparent PNG for remote images (marker photos), so they never hit the network. */
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/** Fails the test if the page asked for anything that is not served locally or faked below. */
export const test = base.extend<{ network: { blocked: string[]; errors: string[] } }>({
  network: [
    async ({ page }, use) => {
      const blocked: string[] = [];
      const errors: string[] = [];

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
          return route.fulfill({ json: MINIMAL_STYLE });
        }
        const data = REMOTE_DATA.find(({ match }) => match.test(url.href));
        if (data) {
          return route.fulfill({
            contentType: 'application/geo+json',
            body: readFileSync(join(FIXTURES_DIR, data.file)),
          });
        }
        if (route.request().resourceType() === 'image') {
          return route.fulfill({ contentType: 'image/png', body: PIXEL_PNG });
        }
        blocked.push(`${route.request().method()} ${url.href}`);
        return route.abort();
      });

      await use({ blocked, errors });

      // Asserted here (not in afterEach) so every spec gets the guards for free.
      expect.soft(blocked, 'requests that no fixture intercepted').toEqual([]);
      expect.soft(errors, 'console errors / uncaught exceptions').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
