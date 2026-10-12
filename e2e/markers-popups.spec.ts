import { expect, test } from './fixtures';
import { gotoAndWaitForMap } from './map-helpers';

test.describe('markers', () => {
  test('markers render as DOM elements inside .maplibregl-marker with their labels', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, '/docs/components/markers', 0);
    const markers = page.locator('ng-map').first().locator('.maplibregl-marker');
    await expect(markers).toHaveCount(3);
    for (const name of ['Shibuya', 'Shinjuku', 'Asakusa']) {
      await expect(markers.filter({ hasText: name })).toBeVisible();
    }
  });

  test('hovering a marker shows its tooltip', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/markers', 0);
    const map = page.locator('ng-map').first();
    await map.locator('.maplibregl-marker', { hasText: 'Shibuya' }).hover();
    await expect(map.locator('.maplibregl-popup')).toContainText('Famous crossing & shopping');
  });

  test('clicking a marker toggles its popup card and clicking the map closes it', async ({
    page,
  }) => {
    // Example 2 ("Rich Popups"): markers open an ng-map-popup with the place card.
    await gotoAndWaitForMap(page, '/docs/components/markers', 1);
    const map = page.locator('ng-map').nth(1);
    await expect(map.locator('.maplibregl-popup')).toHaveCount(0);

    // Open the northern marker, then toggle it closed by clicking it again.
    const transit = map.locator('.maplibregl-marker', { hasText: 'Transit' });
    await transit.click();

    const popup = map.locator('.maplibregl-popup');
    await expect(popup).toHaveCount(1);
    const card = popup.locator('.ng-popup-card');
    await expect(card).toContainText('Grand Central Terminal');
    await expect(card).toContainText('5:15 AM - 2:00 AM');

    await transit.click();
    await expect(popup).toHaveCount(0);

    // Another marker opens its own card (never two at once).
    await map.locator('.maplibregl-marker', { hasText: 'Museum' }).click();
    await expect(popup).toHaveCount(1);
    await expect(popup.locator('.ng-popup-card')).toContainText('The Metropolitan Museum of Art');

    // Clicking an empty part of the map closes it.
    await map.locator('canvas.maplibregl-canvas').click({ position: { x: 8, y: 8 } });
    await expect(map.locator('.maplibregl-popup')).toHaveCount(0);
  });

  test('dragging a marker reports its new position', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/markers', 2);
    const map = page.locator('ng-map').nth(2);
    const readout = map.locator('xpath=..').locator('div.font-mono');
    await expect(readout).toContainText('lng: -3.7038');

    const marker = map.locator('.maplibregl-marker');
    const box = await marker.boundingBox();
    expect(box).not.toBeNull();
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y + 30, { steps: 8 });
    await page.mouse.up();

    await expect(readout).not.toContainText('lng: -3.7038');
  });
});

test.describe('standalone popup', () => {
  test('shows its card content and the close button removes it', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/popups', 0);
    const map = page.locator('ng-map').first();
    const card = map.locator('.maplibregl-popup .ng-popup-card');
    await expect(card).toContainText('New York City');
    await expect(card).toContainText('Population: 8.3 million');

    await map.getByRole('button', { name: 'Close popup' }).click();
    await expect(map.locator('.maplibregl-popup')).toHaveCount(0);

    // The page's own button brings it back.
    await page.getByRole('button', { name: 'Show Popup' }).click();
    await expect(map.locator('.maplibregl-popup .ng-popup-card')).toContainText('New York City');
  });
});
