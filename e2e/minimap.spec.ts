import { expect, test } from './fixtures';
import { gotoAndWaitForMap, mapCall } from './map-helpers';

const CONTROLS_URL = '/docs/components/controls';

// Docs page examples, in template order: 3 = default minimap, 4 = blank + zoomOffset 3.
const MINIMAP = 3;
const MINIMAP_BLANK = 4;

const center = (page: Parameters<typeof mapCall>[0], index: number) =>
  mapCall(page, index, (map) => {
    const c = map.getCenter();
    return [c.lng, c.lat] as [number, number];
  });

test.describe('minimap', () => {
  test('renders its own canvas next to the main one', async ({ page }) => {
    await gotoAndWaitForMap(page, CONTROLS_URL, MINIMAP);
    const map = page.locator('ng-map').nth(MINIMAP);
    await expect(map.locator('canvas.maplibregl-canvas')).toHaveCount(2);
    await expect(map.locator('.ng-minimap-map')).toBeVisible();
    await expect(map.locator('.ng-minimap-map')).toHaveAttribute('aria-label', 'Overview map');
  });

  test('clicking the minimap recenters the main map', async ({ page }) => {
    await gotoAndWaitForMap(page, CONTROLS_URL, MINIMAP);
    const minimap = page.locator('ng-map').nth(MINIMAP).locator('.ng-minimap-map');
    await expect(minimap.locator('canvas.maplibregl-canvas').first()).toBeVisible();

    // Move the main map first so the minimap has to follow it before the click means anything.
    await mapCall(page, MINIMAP, (map) => map.jumpTo({ center: [10, 40] }));
    await expect.poll(() => center(page, MINIMAP)).toEqual([10, 40]);

    const box = await minimap.boundingBox();
    expect(box).not.toBeNull();
    const before = await center(page, MINIMAP);
    await page.mouse.click(box!.x + box!.width / 2 + 40, box!.y + box!.height / 2);

    await expect
      .poll(async () => (await center(page, MINIMAP))[0])
      .toBeGreaterThan(before[0] + 0.1);
    // Navigation is relative to the followed position: it stays near the minimap's center.
    const after = await center(page, MINIMAP);
    expect(Math.abs(after[1] - before[1])).toBeLessThan(5);
    expect(Math.abs(after[0] - before[0])).toBeLessThan(60);
  });

  test('the toggle collapses and expands the minimap', async ({ page }) => {
    await gotoAndWaitForMap(page, CONTROLS_URL, MINIMAP);
    const map = page.locator('ng-map').nth(MINIMAP);
    const toggle = map.locator('button.ng-minimap-toggle');
    const body = map.locator('.ng-minimap-map');

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toHaveAttribute('aria-label', 'Hide overview map');
    await expect(body).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-label', 'Show overview map');
    await expect(body).toBeHidden();
    await expect(map.locator('.ng-minimap-map canvas.maplibregl-canvas:visible')).toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(body).toBeVisible();
  });

  test('the blank minimap renders and keeps in sync', async ({ page }) => {
    await gotoAndWaitForMap(page, CONTROLS_URL, MINIMAP_BLANK);
    const map = page.locator('ng-map').nth(MINIMAP_BLANK);
    await expect(map.locator('canvas.maplibregl-canvas')).toHaveCount(2);
    await expect(map.locator('button.ng-minimap-toggle')).toHaveAttribute('aria-expanded', 'true');
  });
});
