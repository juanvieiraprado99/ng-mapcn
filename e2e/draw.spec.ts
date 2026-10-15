import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { gotoAndWaitForMap, layerIds, mapCall } from './map-helpers';

// Docs page examples, in template order.
const BASIC = 0;
const PRELOADED = 1;

const URL = '/docs/components/draw';

/** terra-draw's MapLibre adapter prefixes its sources and layers with `td-`. */
const drawLayers = async (page: Page, mapIndex: number) =>
  (await layerIds(page, mapIndex)).filter((id) => id.startsWith('td-'));

const counts = (page: Page) => page.getByTestId('draw-count');

/** Viewport pixel of a point inside map number `mapIndex`, as a fraction of its canvas. */
async function canvasPoint(page: Page, mapIndex: number, fx: number, fy: number) {
  const box = await page.locator('ng-map').nth(mapIndex).locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  return { x: box!.x + box!.width * fx, y: box!.y + box!.height * fy };
}

/** Clicks the vertices of a triangle, then the last one again to close the polygon. */
async function drawTriangle(page: Page, mapIndex: number) {
  const a = await canvasPoint(page, mapIndex, 0.3, 0.3);
  const b = await canvasPoint(page, mapIndex, 0.6, 0.3);
  const c = await canvasPoint(page, mapIndex, 0.45, 0.6);
  for (const p of [a, b, c, c]) {
    await page.mouse.move(p.x, p.y);
    await page.mouse.click(p.x, p.y);
  }
}

const featureCollection = (page: Page, mapIndex: number) =>
  mapCall(page, mapIndex, (map) => {
    const sources = Object.keys(map.getStyle().sources).filter((id) => id.startsWith('td-'));
    return sources.length;
  });

test.describe('draw', () => {
  test('clicking a polygon in the polygon mode adds it to the features model', async ({ page }) => {
    await gotoAndWaitForMap(page, URL, BASIC);
    await expect(counts(page)).toContainText('0 polygons');

    await page.getByRole('button', { name: 'Polygon', exact: true }).first().click();
    await drawTriangle(page, BASIC);

    await expect(counts(page)).toContainText('1 polygons');
    expect((await drawLayers(page, BASIC)).length).toBeGreaterThan(0);
    expect(await featureCollection(page, BASIC)).toBeGreaterThan(0);
  });

  test('a point and a line are drawn with their own tools', async ({ page }) => {
    await gotoAndWaitForMap(page, URL, BASIC);

    await page.getByRole('button', { name: 'Point', exact: true }).first().click();
    const p = await canvasPoint(page, BASIC, 0.2, 0.7);
    await page.mouse.move(p.x, p.y);
    await page.mouse.click(p.x, p.y);
    await expect(counts(page)).toContainText('1 points');

    await page.getByRole('button', { name: 'Line', exact: true }).first().click();
    const a = await canvasPoint(page, BASIC, 0.5, 0.7);
    const b = await canvasPoint(page, BASIC, 0.8, 0.8);
    for (const q of [a, b, b]) {
      await page.mouse.move(q.x, q.y);
      await page.mouse.click(q.x, q.y);
    }
    await expect(counts(page)).toContainText('1 lines');
    await expect(counts(page)).toContainText('1 points');
  });

  test('switching theme keeps the drawn features and restarts the draw layers', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, URL, BASIC);
    await page.getByRole('button', { name: 'Polygon', exact: true }).first().click();
    await drawTriangle(page, BASIC);
    await expect(counts(page)).toContainText('1 polygons');
    const before = await mapCall(page, BASIC, (map) => map.getStyle().sources['td-polygon']?.type);
    expect(before).toBe('geojson');

    await page.locator('app-theme-toggle button').click();

    // setStyle removed terra-draw's layers; a new controller re-adds them with the same feature.
    await expect
      .poll(
        async () => {
          const ids = await drawLayers(page, BASIC);
          if (ids.length === 0) return null;
          return mapCall(page, BASIC, (map) => {
            const source = map.getSource('td-polygon') as unknown as
              { serialize(): { data: { features?: unknown[] } } } | undefined;
            return source?.serialize().data.features?.length ?? 0;
          });
        },
        { message: 'draw layers re-added with the polygon' },
      )
      .toBeGreaterThan(0);
    await expect(counts(page)).toContainText('1 polygons');
  });

  test('select mode deletes the selected feature with the Delete key', async ({ page }) => {
    await gotoAndWaitForMap(page, URL, BASIC);
    await page.getByRole('button', { name: 'Polygon', exact: true }).first().click();
    await drawTriangle(page, BASIC);
    await expect(counts(page)).toContainText('1 polygons');

    await page.getByRole('button', { name: 'Select', exact: true }).first().click();
    const inside = await canvasPoint(page, BASIC, 0.45, 0.4);
    await page.mouse.move(inside.x, inside.y);
    await page.mouse.click(inside.x, inside.y);
    await page.keyboard.press('Delete');

    await expect(counts(page)).toContainText('0 polygons');
  });

  test('Clear removes every feature', async ({ page }) => {
    await gotoAndWaitForMap(page, URL, BASIC);
    await page.getByRole('button', { name: 'Polygon', exact: true }).first().click();
    await drawTriangle(page, BASIC);
    await expect(counts(page)).toContainText('1 polygons');

    await page.getByRole('button', { name: 'Clear', exact: true }).first().click();

    await expect(counts(page)).toContainText('0 polygons');
  });

  test('a preloaded polygon is shown, selectable and draggable, and reports the edit', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, URL, PRELOADED);
    await expect(page.getByTestId('draw-last')).toContainText('none (1 zones)');
    expect((await drawLayers(page, PRELOADED)).length).toBeGreaterThan(0);

    const start = await canvasPoint(page, PRELOADED, 0.5, 0.5);
    await page.mouse.move(start.x, start.y);
    await page.mouse.click(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 20, start.y + 10, { steps: 5 });
    await page.mouse.move(start.x + 40, start.y + 20, { steps: 5 });
    await page.mouse.up();

    await expect(page.getByTestId('draw-last')).toContainText('dragFeature');
  });
});
