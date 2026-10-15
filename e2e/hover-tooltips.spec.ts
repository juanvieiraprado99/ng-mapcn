import { expect, test } from './fixtures';
import { findRenderedPoint, gotoAndWaitForMap, layerIds, mapCall } from './map-helpers';

/**
 * Regression for #49: a hover popup sits right next to the hovered point. When it captured the
 * pointer, moving the cursor into it fired the layer's mouseleave and the popup closed itself.
 * `className="ng-popup-passthrough"` makes the whole MapLibre popup transparent to the pointer.
 */
test.describe('non-interactive hover popups', () => {
  test('arcs: the whole MapLibre popup ignores the pointer', async ({ page }) => {
    const MAP = 1;
    await gotoAndWaitForMap(page, '/docs/components/arcs', MAP);
    const hitLayer = (await layerIds(page, MAP)).find((id) => /^arc-hit-layer-/.test(id))!;
    let point = null as Awaited<ReturnType<typeof findRenderedPoint>>;
    await expect
      .poll(async () => (point = await findRenderedPoint(page, MAP, hitLayer)))
      .not.toBeNull();

    await page.mouse.move(point!.x, point!.y, { steps: 4 });
    const popup = page.locator('ng-map').nth(MAP).locator('.maplibregl-popup');
    await expect(popup).toContainText('→');

    const pointerEvents = (selector: string) =>
      popup.locator(selector).evaluate((el) => getComputedStyle(el).pointerEvents);
    expect(await popup.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
    expect(await pointerEvents('.maplibregl-popup-content')).toBe('none');
  });

  test('choropleth: the popup stays open while the cursor moves into it', async ({ page }) => {
    await gotoAndWaitForMap(page, '/view/choropleth', 0);

    // The centre of Brazil's bounding box (a country with visitor data, big enough to still be
    // under the cursor after it moves a few pixels up).
    let target: { x: number; y: number } | null = null;
    await expect
      .poll(async () => {
        target = await mapCall(page, 0, async (map) => {
          const sourceId = Object.keys(map.getStyle().sources).find((id) =>
            id.startsWith('geojson-'),
          );
          if (!sourceId) return null;
          const source = map.getSource(sourceId) as unknown as {
            getData(): Promise<GeoJSON.FeatureCollection>;
          };
          const feature = (await source.getData()).features.find(
            (f) => f.properties?.['NAME_LONG'] === 'Brazil',
          );
          if (!feature) return null;
          const lngs: number[] = [];
          const lats: number[] = [];
          const walk = (c: unknown): void => {
            if (Array.isArray(c) && typeof c[0] === 'number') {
              lngs.push(c[0]);
              lats.push(c[1] as number);
            } else if (Array.isArray(c)) c.forEach(walk);
          };
          walk((feature.geometry as GeoJSON.Polygon).coordinates);
          const mid = (v: number[]) => (Math.min(...v) + Math.max(...v)) / 2;
          const { x, y } = map.project([mid(lngs), mid(lats)]);
          const rect = map.getCanvas().getBoundingClientRect();
          return { x: rect.left + x, y: rect.top + y };
        });
        return target;
      })
      .not.toBeNull();

    // The source reports its data before the fill layer is rendered and queryable, so a single
    // hover can land too early and never fire again. Re-hover until the popup shows up.
    const popup = page.locator('ng-map').first().locator('.maplibregl-popup');
    await expect
      .poll(
        async () => {
          await page.mouse.move(target!.x + 3, target!.y, { steps: 2 });
          await page.mouse.move(target!.x, target!.y, { steps: 2 });
          return popup.count();
        },
        {
          message: 'hovering Brazil should open the popup',
          timeout: 20_000,
          intervals: [250, 500],
        },
      )
      .toBe(1);
    await expect(popup).toContainText('Brazil');

    // The popup sits just above the hovered point: move the cursor up into the popup card.
    const box = (await popup.locator('.ng-popup-card').boundingBox())!;
    const inside = { x: target!.x, y: Math.min(target!.y - 12, box.y + box.height - 2) };
    expect(inside.y).toBeGreaterThan(box.y);
    expect(inside.y).toBeLessThan(box.y + box.height);
    await page.mouse.move(inside.x, inside.y, { steps: 4 });
    await page.waitForTimeout(300);

    await expect(popup).toHaveCount(1);
    await expect(popup).toContainText('Brazil');
  });
});
