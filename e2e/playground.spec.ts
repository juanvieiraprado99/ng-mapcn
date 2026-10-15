import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { gotoAndWaitForMap, layerIds, mapCall } from './map-helpers';

const PLAYGROUND = 0;

const snippet = (page: Page) => page.locator('#snippet app-code-block');

async function setRange(input: Locator, value: string) {
  await input.evaluate((el, v) => {
    const range = el as HTMLInputElement;
    range.value = v;
    range.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

test.describe('playground', () => {
  test('a control updates the real layer and the snippet', async ({ page }) => {
    await gotoAndWaitForMap(page, '/playground', PLAYGROUND);

    // Default component: route. Layer present, snippet lists no [width] yet.
    await expect.poll(() => layerIds(page, PLAYGROUND)).toContain('route-layer');
    await expect(snippet(page)).toContainText('<ng-map-route');
    await expect(snippet(page)).not.toContainText('[width]');

    await setRange(page.locator('#pg-route-width'), '9');

    await expect(snippet(page)).toContainText('[width]="9"');
    await expect
      .poll(() =>
        mapCall(page, PLAYGROUND, (map) => map.getPaintProperty('route-layer', 'line-width')),
      )
      .toBe(9);
  });

  test('switching component swaps the layer and the controls', async ({ page }) => {
    await gotoAndWaitForMap(page, '/playground', PLAYGROUND);

    await page.getByRole('button', { name: 'Heatmap', exact: true }).click();

    await expect(snippet(page)).toContainText('<ng-map-heatmap');
    await expect(page.locator('#pg-heatmap-radius')).toBeVisible();
    await expect(page.locator('#pg-route-width')).toHaveCount(0);
    await expect
      .poll(async () =>
        (await layerIds(page, PLAYGROUND)).some((id) => id.startsWith('heatmap-layer-')),
      )
      .toBe(true);
  });

  test('a gallery card applies its look to the playground map', async ({ page }) => {
    await gotoAndWaitForMap(page, '/playground', PLAYGROUND);

    await page
      .getByRole('button', { name: 'Apply Globe projection to the playground map' })
      .click();

    await expect(snippet(page)).toContainText(`[projection]="{ type: 'globe' }"`);
    await expect
      .poll(() => mapCall(page, PLAYGROUND, (map) => map.getProjection()?.type))
      .toBe('globe');

    await page.getByRole('button', { name: 'Apply 3D tilt to the playground map' }).click();
    await expect
      .poll(() => mapCall(page, PLAYGROUND, (map) => Math.round(map.getPitch())))
      .toBe(60);
    await expect(page.getByText('3D tilt snippet')).toBeVisible();
  });
});
