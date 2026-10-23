import { expect, minimalStyle, test } from './fixtures';
import { gotoAndWaitForMap, layerIds, mapCall } from './map-helpers';

const CONTROLS_URL = '/docs/components/controls';
const LEGEND_URL = '/docs/components/legend';

// Docs page examples, in template order.
const SCALE = 1;
const SWITCHER = 2;
const COLLAPSIBLE = 2;

test.describe('map controls pack', () => {
  test('scale label changes after zoom', async ({ page }) => {
    await gotoAndWaitForMap(page, CONTROLS_URL, SCALE);
    const labels = page.locator('ng-map').nth(SCALE).locator('.ng-scale .ng-scale-label');
    await expect(labels.first()).not.toHaveText('');
    const before = await labels.allTextContents();

    await mapCall(page, SCALE, (map) => map.jumpTo({ zoom: map.getZoom() + 3 }));

    await expect.poll(() => labels.allTextContents()).not.toEqual(before);
  });

  test('legend collapses', async ({ page }) => {
    await gotoAndWaitForMap(page, LEGEND_URL, COLLAPSIBLE);
    const map = page.locator('ng-map').nth(COLLAPSIBLE);
    const toggle = map.locator('.ng-legend-toggle');
    const body = map.locator('.ng-legend-body');

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(body).toBeVisible();

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(body).toHaveCount(0);
  });

  test('style switcher keeps layers', async ({ page }) => {
    await gotoAndWaitForMap(page, CONTROLS_URL, SWITCHER);
    const own = (ids: string[]) => ids.filter((id) => id.includes('switcher-area'));
    const before = own(await layerIds(page, SWITCHER));
    expect(before.length).toBeGreaterThan(0);

    const button = page.locator('ng-map').nth(SWITCHER).locator('.ng-style-switcher-button');
    await button.focus();
    const request = page.waitForRequest((req) =>
      req.url().endsWith('/dark-matter-gl-style/style.json'),
    );
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await request;

    await expect.poll(() => mapCall(page, SWITCHER, (map) => map.isStyleLoaded())).toBe(true);
    await expect.poll(async () => own(await layerIds(page, SWITCHER))).toEqual(before);
  });

  test("overlays don't overlap", async ({ page }) => {
    // The fixture basemap has no sources, so MapLibre renders no attribution: serve one.
    await page.route(/style\.json$|\/styles\/[^/]+$/, (route) => {
      const style = minimalStyle(false);
      return route.fulfill({
        json: {
          ...style,
          sources: {
            credits: {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: [] },
              attribution: '© CARTO, © OpenStreetMap contributors',
            },
          },
          layers: [...style.layers, { id: 'credits', type: 'circle', source: 'credits' }],
        },
      });
    });
    await gotoAndWaitForMap(page, CONTROLS_URL, SCALE);
    const map = page.locator('ng-map').nth(SCALE);
    const boxes = [];
    for (const selector of ['.ng-controls', '.ng-scale', '.maplibregl-ctrl-attrib']) {
      const box = await map.locator(selector).first().boundingBox();
      expect(box, selector).not.toBeNull();
      boxes.push({ selector, ...box! });
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const intersects =
          a.x < b.x + b.width &&
          b.x < a.x + a.width &&
          a.y < b.y + b.height &&
          b.y < a.y + a.height;
        expect(intersects, `${a.selector} vs ${b.selector}`).toBe(false);
      }
    }
  });
});
