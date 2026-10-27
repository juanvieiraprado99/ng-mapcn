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
    // Collapsing destroys the overview instance: its canvas is gone, the main one stays.
    await expect(map.locator('.ng-minimap-map canvas.maplibregl-canvas')).toHaveCount(0);
    await expect(map.locator('canvas.maplibregl-canvas')).toHaveCount(1);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(body).toBeVisible();
    await expect(map.locator('.ng-minimap-map canvas.maplibregl-canvas')).toHaveCount(1);
    await expect(map.locator('canvas.maplibregl-canvas')).toHaveCount(2);
  });

  for (const [name, index] of [
    ['default', MINIMAP],
    ['blank', MINIMAP_BLANK],
  ] as const) {
    test(`the ${name} minimap follows the main map: clicking its center keeps the main center`, async ({
      page,
    }) => {
      await gotoAndWaitForMap(page, CONTROLS_URL, index);
      const map = page.locator('ng-map').nth(index);
      await expect(map.locator('canvas.maplibregl-canvas')).toHaveCount(2);
      const start = await center(page, index);

      await mapCall(page, index, (m) => m.jumpTo({ center: [-74, 40.7] }));
      const box = await map.locator('.ng-minimap-map').boundingBox();
      expect(box).not.toBeNull();

      // If the minimap had not followed, the click would send the main map back near the start.
      // Poll the click until the minimap has caught up and a click on its center is a no-op.
      await expect
        .poll(
          async () => {
            await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
            const c = await center(page, index);
            return Math.hypot(c[0] - -74, c[1] - 40.7);
          },
          { timeout: 10_000 },
        )
        .toBeLessThan(1);
      const end = await center(page, index);
      expect(Math.hypot(end[0] - start[0], end[1] - start[1])).toBeGreaterThan(50);
    });
  }
});
