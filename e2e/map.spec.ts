import { expect, test } from './fixtures';
import { gotoAndWaitForMap, mapCall, waitForMap } from './map-helpers';

test.describe('map', () => {
  test('every map on the page becomes ready and renders a canvas', async ({ page }) => {
    await page.goto('/docs/components/map');
    // The page has four examples (basic, controlled, blank, custom styles); later ones render
    // lazily, so wait for each in turn.
    for (let index = 0; index < 4; index++) {
      await waitForMap(page, index);
    }
    const maps = page.locator('ng-map');
    await expect(maps).toHaveCount(4);
    for (let index = 0; index < 4; index++) {
      const map = maps.nth(index);
      await expect(map.locator('canvas.maplibregl-canvas')).toHaveCount(1);
      await expect(map.locator('.ng-map-loader')).toHaveCount(0);
    }
  });

  test('the basic example is centered where the page says', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/map', 0);
    const view = await mapCall(page, 0, (map) => ({
      center: map.getCenter().toArray(),
      zoom: map.getZoom(),
    }));
    expect(view.center[0]).toBeCloseTo(-74.006, 3);
    expect(view.center[1]).toBeCloseTo(40.7128, 3);
    expect(view.zoom).toBeCloseTo(12, 5);
  });

  test('the zoom-in control zooms the map', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/controls', 0);
    const before = await mapCall(page, 0, (map) => map.getZoom());

    await page.locator('ng-map').first().getByRole('button', { name: 'Zoom in' }).click();

    await expect
      .poll(() => mapCall(page, 0, (map) => map.getZoom()), { message: 'zoom after Zoom in' })
      .toBeGreaterThan(before);
  });
});
