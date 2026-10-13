import { expect, minimalStyle, test } from './fixtures';
import { gotoAndWaitForMap, mapCall, waitForMap } from './map-helpers';

test.describe('map', () => {
  test('every map on the page becomes ready and renders a canvas', async ({ page }) => {
    await page.goto('/docs/components/map');
    // The page has four examples (basic, controlled, blank, custom styles); later ones render
    // lazily, so wait for each in turn.
    for (let index = 0; index < 4; index++) {
      await waitForMap(page, index);
    }
    const maps = page.locator('ng-map');
    await expect(maps).toHaveCount(4);
    for (let index = 0; index < 4; index++) {
      const map = maps.nth(index);
      await expect(map.locator('canvas.maplibregl-canvas')).toHaveCount(1);
      await expect(map.locator('.ng-map-loader')).toHaveCount(0);
    }
  });

  test('the basic example is centered where the page says', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/map', 0);
    const view = await mapCall(page, 0, (map) => ({
      center: map.getCenter().toArray(),
      zoom: map.getZoom(),
    }));
    expect(view.center[0]).toBeCloseTo(-74.006, 3);
    expect(view.center[1]).toBeCloseTo(40.7128, 3);
    expect(view.zoom).toBeCloseTo(12, 5);
  });

  test('the zoom-in control zooms the map', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/controls', 0);
    const before = await mapCall(page, 0, (map) => map.getZoom());

    await page.locator('ng-map').first().getByRole('button', { name: 'Zoom in' }).click();

    await expect
      .poll(() => mapCall(page, 0, (map) => map.getZoom()), { message: 'zoom after Zoom in' })
      .toBeGreaterThan(before);
  });

  test('bottom-right controls sit above the attribution', async ({ page }) => {
    // The fixture basemap has no sources, so MapLibre renders no attribution: serve one whose
    // (empty) source carries the Carto credit, used by a layer so the control lists it.
    await page.route(/style\.json$|\/styles\/[^/]+$/, (route) => {
      const style = minimalStyle(false);
      return route.fulfill({
        json: {
          ...style,
          sources: {
            credits: {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: [] },
              attribution: '© CARTO, © OpenStreetMap contributors',
            },
          },
          layers: [...style.layers, { id: 'credits', type: 'circle', source: 'credits' }],
        },
      });
    });
    // The installation example uses the default <ng-map-controls /> in a short (320px) container.
    await gotoAndWaitForMap(page, '/docs/installation', 0);
    const map = page.locator('ng-map').first();
    const controls = await map.locator('.ng-controls').boundingBox();
    const attribution = await map.locator('.maplibregl-ctrl-attrib').boundingBox();

    expect(controls).not.toBeNull();
    expect(attribution).not.toBeNull();
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(attribution!.y);
  });
});
