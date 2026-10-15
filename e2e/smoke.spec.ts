import type { Locator, Page } from '@playwright/test';

import { BLOCKS } from '../projects/demo/src/app/blocks/registry';
import { expect, test } from './fixtures';

/**
 * Production smoke test: every page of the shipped bundle loads, every map on it becomes ready,
 * nothing logs an error and nothing reaches the network outside the fixtures.
 */
const DOCS_PAGES = [
  '/docs',
  '/docs/installation',
  '/docs/api-reference',
  '/docs/basemaps',
  ...[
    'map',
    'controls',
    'markers',
    'popups',
    'routes',
    'arcs',
    'geojson',
    'clusters',
    'heatmap',
    'advanced',
  ].map((name) => `/docs/components/${name}`),
];

const ROUTES = ['/', ...DOCS_PAGES, '/blocks', ...BLOCKS.map((block) => `/view/${block.name}`)];

/**
 * How many maps each route renders (block previews on /blocks are iframes). Asserted as a minimum,
 * so a page that silently stops rendering its maps fails instead of passing with nothing to check.
 */
const EXPECTED_MAPS: Record<string, number> = {
  '/': 6,
  '/docs': 0,
  '/docs/installation': 1,
  '/docs/api-reference': 0,
  '/docs/basemaps': 5,
  '/docs/components/map': 4,
  '/docs/components/controls': 1,
  '/docs/components/markers': 3,
  '/docs/components/popups': 1,
  '/docs/components/routes': 3,
  '/docs/components/arcs': 2,
  '/docs/components/geojson': 2,
  '/docs/components/clusters': 1,
  '/docs/components/heatmap': 1,
  '/docs/components/advanced': 4,
  '/blocks': BLOCKS.length, // one iframe preview per block
};

/** A map is ready once its loader overlay is gone and its canvas exists. */
async function expectMapReady(map: Locator, name: string): Promise<void> {
  await expect(map.locator('.ng-map-loader'), `${name} finishes loading`).toHaveCount(0, {
    timeout: 30_000,
  });
  await expect(map.locator('canvas.maplibregl-canvas'), `${name} has a canvas`).toHaveCount(1);
}

/**
 * Scrolls down the page until at least `expected` maps exist (examples, home sections and block
 * previews render lazily on viewport), then waits for every `ng-map` of the page to be ready. Block
 * previews (/blocks) are iframes: each is scrolled into view and its map awaited through a frame
 * locator, which auto-waits instead of polling a frame whose main thread is busy booting WebGL.
 */
async function waitForEveryMap(page: Page, expected: number): Promise<number> {
  const iframes = page.locator('iframe');
  await expect
    .poll(
      async () => {
        if ((await page.locator('ng-map').count()) + (await iframes.count()) >= expected) {
          return true;
        }
        const atBottom = await page.evaluate(() => {
          const { scrollY, innerHeight } = window;
          const bottom = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
          window.scrollBy(0, Math.round(innerHeight * 0.7));
          return bottom;
        });
        if (atBottom) {
          await page.evaluate(() => window.scrollTo(0, 0));
        }
        return false;
      },
      { message: `at least ${expected} maps should render`, timeout: 30_000, intervals: [150] },
    )
    .toBe(true);

  let total = 0;
  const maps = page.locator('ng-map');
  for (let i = 0; i < (await maps.count()); i++) {
    await maps.nth(i).evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expectMapReady(maps.nth(i), `map #${i}`);
    total++;
  }

  const previews = await iframes.count();
  for (let i = 0; i < previews; i++) {
    await iframes.nth(i).evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const map = page.frameLocator('iframe').nth(i).locator('ng-map').first();
    await expect(map, `preview #${i} renders a map`).toHaveCount(1, { timeout: 30_000 });
    await expectMapReady(map, `preview #${i} map`);
    total++;
  }
  return total;
}

test.describe('production smoke', () => {
  for (const route of ROUTES) {
    test(`${route} loads cleanly`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('app-root')).not.toBeEmpty();

      // This must be the production bundle: no Angular debug hooks.
      expect(await page.evaluate(() => typeof (window as unknown as { ng?: unknown }).ng)).toBe(
        'undefined',
      );

      const maps = await waitForEveryMap(page, EXPECTED_MAPS[route] ?? 1);
      expect(maps).toBeGreaterThanOrEqual(EXPECTED_MAPS[route] ?? 1);
      // Console errors and unintercepted requests are asserted by the shared fixture.
    });
  }
});
