import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { gotoAndWaitForMap, layerIds, mapCall } from './map-helpers';

const PLAYGROUND = 0;

const snippet = (page: Page) => page.locator('#snippet app-code-block');
const stackNames = (page: Page) => page.locator('[data-layer] .font-mono');

/** The map's own layers (no basemap), by component, bottom first. */
async function drawOrder(page: Page): Promise<string[]> {
  const kinds: [RegExp, string][] = [
    [/^route-layer$/, 'route'],
    [/^heatmap-layer-/, 'heatmap'],
    [/^arc-(hit-)?layer-/, 'arc'],
  ];
  const order: string[] = [];
  for (const id of await layerIds(page, PLAYGROUND)) {
    const kind = kinds.find(([match]) => match.test(id))?.[1];
    if (kind && !order.includes(kind)) order.push(kind);
  }
  return order;
}

/** Drives the zard slider by keyboard: Home, then one ArrowRight per step up to `value`. */
async function setSlider(
  page: Page,
  id: string,
  { min, step, value }: { min: number; step: number; value: number },
) {
  const thumb = page.locator(`${id} [data-slot="slider-thumb"]`);
  await thumb.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < Math.round((value - min) / step); i++) {
    await page.keyboard.press('ArrowRight');
  }
}

test.describe('playground', () => {
  test('a control updates the real layer and the snippet', async ({ page }) => {
    await gotoAndWaitForMap(page, '/playground', PLAYGROUND);

    // Default component: route. Layer present, snippet lists no [width] yet.
    await expect.poll(() => layerIds(page, PLAYGROUND)).toContain('route-layer');
    await expect(snippet(page)).toContainText('<ng-map-route');
    await expect(snippet(page)).not.toContainText('[width]');

    await setSlider(page, '#pg-route-width', { min: 1, step: 1, value: 9 });

    await expect(snippet(page)).toContainText('[width]="9"');
    await expect
      .poll(() =>
        mapCall(page, PLAYGROUND, (map) => map.getPaintProperty('route-layer', 'line-width')),
      )
      .toBe(9);
  });

  test('a block added from the palette is drawn over the existing layers', async ({ page }) => {
    await gotoAndWaitForMap(page, '/playground', PLAYGROUND);

    await page.getByRole('button', { name: 'Add Heatmap' }).click();

    await expect(snippet(page)).toContainText('<ng-map-heatmap');
    await expect(snippet(page)).toContainText('<ng-map-route');
    await expect(page.locator('#pg-heatmap-radius')).toBeVisible();
    await expect(page.locator('#pg-route-width')).toHaveCount(0);
    await expect.poll(() => drawOrder(page)).toEqual(['route', 'heatmap']);

    // Moving the heatmap below the route re-stacks the map layers too.
    await page.getByRole('button', { name: 'Move heatmap down' }).click();
    await expect(stackNames(page)).toHaveText(['route', 'heatmap']);
    await expect.poll(() => drawOrder(page)).toEqual(['heatmap', 'route']);
  });

  test('a block dragged from the palette lands where it is dropped', async ({ page }) => {
    await gotoAndWaitForMap(page, '/playground', PLAYGROUND);
    await page.getByRole('button', { name: 'Add Arcs' }).click();
    await expect(stackNames(page)).toHaveText(['arc', 'route']);

    // CDK drag: press, move past the threshold, hover the target, release.
    const block = page.getByRole('button', { name: 'Add Heatmap' });
    const target = page.locator('[data-layer="route"]');
    const from = (await block.boundingBox())!;
    const to = (await target.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + 4, { steps: 15 });
    await page.mouse.move(to.x + to.width / 2, to.y + 2, { steps: 5 });
    await page.mouse.up();

    await expect(stackNames(page)).toHaveText(['arc', 'heatmap', 'route']);
    await expect.poll(() => drawOrder(page)).toEqual(['route', 'heatmap', 'arc']);
  });

  test('a copied link reopens the same scene', async ({ page }) => {
    await gotoAndWaitForMap(page, '/playground', PLAYGROUND);
    await page.getByRole('button', { name: 'Add Arcs' }).click();
    await setSlider(page, '#pg-arc-lineWidth', { min: 1, step: 0.5, value: 6 });
    await page.getByRole('button', { name: 'Hide route' }).click();
    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page).toHaveURL(/\?scene=/);

    await gotoAndWaitForMap(page, page.url(), PLAYGROUND);
    await expect(stackNames(page)).toHaveText(['arc', 'route']);
    await expect(page.getByRole('button', { name: 'Show route' })).toBeVisible();
    await expect(snippet(page)).toContainText("'line-width': 6");
    await expect(snippet(page)).not.toContainText('<ng-map-route');
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

  test('the marker is visible and an anchor change re-creates it', async ({ page }) => {
    await gotoAndWaitForMap(page, '/playground', PLAYGROUND);
    await page.getByRole('button', { name: 'Add Marker' }).click();

    await expect(page.locator('.maplibregl-marker .ng-marker-default-icon')).toBeVisible();
    await expect(snippet(page)).toContainText('<ng-marker-content />');

    await page.locator('#pg-marker-anchor button').click();
    await page.getByRole('option', { name: 'top', exact: true }).click();
    await expect(snippet(page)).toContainText('anchor="top"');
    await expect(page.locator('.maplibregl-marker')).toHaveCount(1);
    await expect(page.locator('.maplibregl-marker')).toHaveClass(/maplibregl-marker-anchor-top/);
  });

  test('a camera move reaches the sliders and the next edit does not snap it back', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, '/playground', PLAYGROUND);

    await mapCall(page, PLAYGROUND, (map) => {
      map.jumpTo({ zoom: 6.5, center: [10, 20] });
    });
    await expect(page.locator('output[for="pg-map-zoom"]')).toHaveText('6.5');
    await expect(snippet(page)).toContainText('[zoom]="6.5"');
    await expect(snippet(page)).toContainText('[center]="[10, 20]"');

    await setSlider(page, '#pg-map-bearing', { min: -180, step: 10, value: 40 });
    await expect
      .poll(() => mapCall(page, PLAYGROUND, (map) => Math.round(map.getBearing())))
      .toBe(40);
    expect(await mapCall(page, PLAYGROUND, (map) => map.getZoom())).toBe(6.5);
  });

  test('the OpenStreetMap card applies a raster style and prints its declaration', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, '/playground', PLAYGROUND);

    await page.getByRole('button', { name: 'Apply OpenStreetMap to the playground map' }).click();

    await expect
      .poll(() => mapCall(page, PLAYGROUND, (map) => map.getSource('osm')?.type))
      .toBe('raster');
    await expect(page.getByText('OpenStreetMap snippet')).toBeVisible();
    await expect(page.locator('#gallery app-code-block').last()).toContainText('OSM_STYLE');

    // Switching theme keeps the same style object: no setStyle, so the source survives.
    await page.locator('app-theme-toggle button').click();
    expect(await mapCall(page, PLAYGROUND, (map) => map.getSource('osm')?.type)).toBe('raster');
  });

  test('the raster component coexists with the OpenStreetMap basemap', async ({ page }) => {
    await gotoAndWaitForMap(page, '/playground', PLAYGROUND);

    await page.getByRole('button', { name: 'Apply OpenStreetMap to the playground map' }).click();
    await page.getByRole('button', { name: 'Add Raster tiles' }).click();

    // The fixtures fail the test on any console error, e.g. a duplicate source id.
    await expect
      .poll(() => mapCall(page, PLAYGROUND, (map) => map.getSource('tiles')?.type))
      .toBe('raster');
    expect(await mapCall(page, PLAYGROUND, (map) => map.getSource('osm')?.type)).toBe('raster');
  });
});
