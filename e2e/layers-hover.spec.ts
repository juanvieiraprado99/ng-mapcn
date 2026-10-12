import { expect, test } from './fixtures';
import {
  featureState,
  findRenderedPoint,
  gotoAndWaitForMap,
  layerIds,
  mapCall,
  type RenderedPoint,
} from './map-helpers';

/** Number of features of `source` that the map currently holds in memory. */
function sourceFeatureCount(
  page: Parameters<typeof mapCall>[0],
  mapIndex: number,
  source: string,
): Promise<number> {
  return mapCall(page, mapIndex, (map, src) => map.querySourceFeatures(src).length, source);
}

function cursor(page: Parameters<typeof mapCall>[0], mapIndex: number): Promise<string> {
  return mapCall(page, mapIndex, (map) => map.getCanvas().style.cursor);
}

/** Looks the point up until the layer has rendered something hittable. */
async function pointOn(
  page: Parameters<typeof mapCall>[0],
  mapIndex: number,
  layerId: string,
): Promise<RenderedPoint> {
  let point: RenderedPoint | null = null;
  await expect
    .poll(async () => (point = await findRenderedPoint(page, mapIndex, layerId)), {
      message: `a rendered, hittable point on ${layerId}`,
    })
    .not.toBeNull();
  return point!;
}

test.describe('routes', () => {
  test('the basic route renders a line layer with features', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/routes', 0);
    const ids = await layerIds(page, 0);
    const layer = ids.find((id) => /^ng-route-\d+-layer$/.test(id));
    expect(layer, `route layer in ${ids.join(', ')}`).toBeDefined();

    const { source, type } = await mapCall(
      page,
      0,
      (map, id) => {
        const spec = map.getLayer(id)!;
        return { source: spec.source as string, type: spec.type };
      },
      layer!,
    );
    expect(type).toBe('line');
    await expect.poll(() => sourceFeatureCount(page, 0, source)).toBeGreaterThan(0);
  });

  test('the route planning example draws the fetched (stubbed) OSRM route', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/routes', 1);
    // The route layer only exists once the OSRM response has arrived.
    await expect
      .poll(async () => (await layerIds(page, 1)).some((id) => /^ng-route-\d+-layer$/.test(id)))
      .toBe(true);
    const source = (await layerIds(page, 1)).find((id) => /^ng-route-\d+-layer$/.test(id))!;
    const sourceId = source.replace(/-layer$/, '');
    await expect.poll(() => sourceFeatureCount(page, 1, sourceId)).toBeGreaterThan(0);
  });
});

test.describe('arcs', () => {
  // The first map on the page is `[interactive]="false"`; the interactive one is the second.
  const MAP = 1;

  test('the interactive example has its hit layer below the visible layer', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/arcs', MAP);
    const ids = await layerIds(page, MAP);
    const hit = ids.findIndex((id) => /^arc-hit-layer-/.test(id));
    const visible = ids.findIndex((id) => /^arc-layer-/.test(id));
    expect(hit, ids.join(', ')).toBeGreaterThanOrEqual(0);
    expect(visible, ids.join(', ')).toBeGreaterThanOrEqual(0);
    expect(hit).toBeLessThan(visible);
    expect(ids[hit].replace('arc-hit-layer-', '')).toBe(ids[visible].replace('arc-layer-', ''));
  });

  test('the non-interactive example ignores hover (confirms which map is which)', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, '/docs/components/arcs', 0);
    // The hit layer is always rendered; `[interactive]="false"` only skips the handlers.
    const hitLayer = (await layerIds(page, 0)).find((id) => /^arc-hit-layer-/.test(id))!;
    const point = await pointOn(page, 0, hitLayer);

    await page.mouse.move(point.x, point.y, { steps: 4 });
    // Settle: a hover would be set on the very next mousemove; the cursor is the sync signal.
    await page.waitForTimeout(300);
    expect(await cursor(page, 0)).toBe('');
    expect((await featureState(page, 0, point.source, point.featureId))?.['hover']).toBeFalsy();
  });

  test('hovering an arc sets its feature state and pointer cursor; leaving clears them', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, '/docs/components/arcs', MAP);
    const hitLayer = (await layerIds(page, MAP)).find((id) => /^arc-hit-layer-/.test(id))!;
    const point = await pointOn(page, MAP, hitLayer);

    await page.mouse.move(point.x, point.y, { steps: 4 });
    await expect
      .poll(() => featureState(page, MAP, point.source, point.featureId))
      .toMatchObject({ hover: true });
    expect(await cursor(page, MAP)).toBe('pointer');
    // The page's popup shows the hovered lane.
    await expect(page.locator('ng-map').nth(MAP).locator('.maplibregl-popup')).toContainText('→');

    // An empty corner of the map: nothing hovered any more.
    const box = (await page.locator('ng-map').nth(MAP).locator('canvas').boundingBox())!;
    await page.mouse.move(box.x + 6, box.y + box.height - 6, { steps: 4 });
    await expect
      .poll(() => featureState(page, MAP, point.source, point.featureId))
      .not.toMatchObject({ hover: true });
    await expect.poll(() => cursor(page, MAP)).toBe('');
    await expect(page.locator('ng-map').nth(MAP).locator('.maplibregl-popup')).toHaveCount(0);
  });
});

test.describe('geojson', () => {
  // Example 1 is the plain world-borders map; example 2 is the interactive US states overlay.
  const MAP = 1;

  test('the overlay has fill and line layers over the states fixture', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/geojson', MAP);
    const ids = await layerIds(page, MAP);
    expect(ids.some((id) => /^geojson-fill-/.test(id))).toBe(true);
    expect(ids.some((id) => /^geojson-line-/.test(id))).toBe(true);
  });

  test('hovering a state sets feature state (promoteId) and shows its name', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/geojson', MAP);
    const fillLayer = (await layerIds(page, MAP)).find((id) => /^geojson-fill-/.test(id))!;
    const point = await pointOn(page, MAP, fillLayer);
    const hoverUi = page.locator('ng-map').nth(MAP).locator('xpath=..').locator('div.absolute');
    await expect(hoverUi.first()).toContainText('Hover a state');

    await page.mouse.move(point.x, point.y, { steps: 4 });

    // promoteId="name": the feature id is the state name.
    expect(typeof point.featureId).toBe('string');
    await expect
      .poll(() => featureState(page, MAP, point.source, point.featureId))
      .toMatchObject({ hover: true });
    await expect(hoverUi.first()).toContainText(String(point.featureId));
    expect(await cursor(page, MAP)).toBe('pointer');

    const box = (await page.locator('ng-map').nth(MAP).locator('canvas').boundingBox())!;
    await page.mouse.move(box.x + box.width - 6, box.y + box.height - 6, { steps: 4 });
    await expect
      .poll(() => featureState(page, MAP, point.source, point.featureId))
      .not.toMatchObject({ hover: true });
    await expect(hoverUi.first()).toContainText('Hover a state');
  });
});
