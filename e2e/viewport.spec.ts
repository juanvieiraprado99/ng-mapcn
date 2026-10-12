import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { gotoAndWaitForMap, mapCall, waitForMap } from './map-helpers';

// "Synced Viewports" on the advanced page: maps 3 and 4 (index 2 and 3) share one `viewport` signal.
const A = 2;
const B = 3;

interface View {
  lng: number;
  lat: number;
  zoom: number;
  moving: boolean;
}

function view(page: Page, index: number): Promise<View> {
  return mapCall(page, index, (map) => ({
    lng: map.getCenter().lng,
    lat: map.getCenter().lat,
    zoom: map.getZoom(),
    moving: map.isMoving(),
  }));
}

/** Waits until both maps agree on center and zoom and are no longer moving. */
async function expectSynced(page: Page): Promise<View> {
  await expect
    .poll(
      async () => {
        const [a, b] = await Promise.all([view(page, A), view(page, B)]);
        return (
          !a.moving &&
          !b.moving &&
          Math.abs(a.lng - b.lng) <= 1e-6 &&
          Math.abs(a.lat - b.lat) <= 1e-6 &&
          Math.abs(a.zoom - b.zoom) <= 1e-6
        );
      },
      { message: 'both maps share the same viewport', timeout: 10_000 },
    )
    .toBe(true);
  return view(page, A);
}

async function drag(page: Page, index: number, dx: number, dy: number): Promise<void> {
  const box = (await page.locator('ng-map').nth(index).locator('canvas').boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  await page.mouse.up();
}

test.describe('synced viewports', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/advanced', A);
    await waitForMap(page, B);
    // Bring the pair back into view after waiting for the second one.
    await page
      .locator('ng-map')
      .nth(A)
      .evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expectSynced(page);
  });

  test('dragging either map moves the other one to the same viewport', async ({ page }) => {
    const start = await view(page, A);

    await drag(page, A, -120, 60);
    const afterA = await expectSynced(page);
    expect(Math.hypot(afterA.lng - start.lng, afterA.lat - start.lat)).toBeGreaterThan(1e-3);

    await drag(page, B, 90, -40);
    const afterB = await expectSynced(page);
    expect(Math.hypot(afterB.lng - afterA.lng, afterB.lat - afterA.lat)).toBeGreaterThan(1e-3);
  });

  test('zooming one map zooms the other', async ({ page }) => {
    const start = await view(page, A);
    const box = (await page.locator('ng-map').nth(B).locator('canvas').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -300);

    await expect.poll(async () => (await view(page, B)).zoom).toBeGreaterThan(start.zoom);
    const synced = await expectSynced(page);
    expect(synced.zoom).toBeGreaterThan(start.zoom);
  });

  test('no feedback loop: the follower stays still once the viewports have settled', async ({
    page,
  }) => {
    await drag(page, A, -100, 50);
    await expectSynced(page);

    await mapCall(page, B, (map) => {
      const w = window as unknown as { __moves: number };
      w.__moves = 0;
      map.on('move', () => (w.__moves += 1));
    });
    // Absence check: nothing to wait *for*, so observe a fixed window (per the plan: 500 ms).
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as unknown as { __moves: number }).__moves)).toBe(0);
  });
});
