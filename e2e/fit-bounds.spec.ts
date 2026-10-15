import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { gotoAndWaitForMap, mapCall } from './map-helpers';

// "Fit to Bounds" on the map page: the fifth map (Paris, Berlin, Rome; the toggle adds Tokyo).
const FIT = 4;
const PARIS: [number, number] = [2.35, 48.85];
const TOKYO: [number, number] = [139.69, 35.69];

const contains = (page: Page, point: [number, number]) =>
  mapCall(page, FIT, (map, p: [number, number]) => map.getBounds().contains(p), point);

const zoom = (page: Page) => mapCall(page, FIT, (map) => map.getZoom());

test.describe('fit bounds', () => {
  test('fits the markers once loaded and refits when their bounds change', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/map', FIT);
    await page.locator('ng-map').nth(FIT).scrollIntoViewIfNeeded();

    // Initial fit: the European cities are in view, Tokyo is not.
    await expect.poll(() => contains(page, PARIS), { message: 'Paris in view' }).toBe(true);
    expect(await contains(page, TOKYO)).toBe(false);
    const europeZoom = await zoom(page);

    await page.getByTestId('fit-toggle').click();

    await expect.poll(() => contains(page, TOKYO), { message: 'Tokyo in view' }).toBe(true);
    await expect
      .poll(() => mapCall(page, FIT, (map) => map.isMoving()), { message: 'fit finished' })
      .toBe(false);
    expect(await contains(page, PARIS)).toBe(true);
    expect(await zoom(page)).toBeLessThan(europeZoom);

    // Removing Tokyo fits back to Europe.
    await page.getByTestId('fit-toggle').click();
    await expect.poll(() => contains(page, TOKYO), { message: 'Tokyo out of view' }).toBe(false);
    await expect
      .poll(() => zoom(page), { message: 'zoomed back in' })
      .toBeGreaterThan(europeZoom - 0.01);
  });
});
