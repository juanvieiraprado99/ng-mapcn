import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from './fixtures';
import { findRenderedPoint, gotoAndWaitForMap, layerIds, mapCall } from './map-helpers';

const [QUAKE_LNG, QUAKE_LAT] = (
  JSON.parse(readFileSync(join(__dirname, 'fixtures', 'earthquakes.json'), 'utf8')) as {
    features: { geometry: { coordinates: [number, number] } }[];
  }
).features[0].geometry.coordinates;

test.describe('clusters', () => {
  test('renders the cluster, count and unclustered-point layers over the earthquakes fixture', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, '/docs/components/clusters', 0);
    const ids = await layerIds(page, 0);
    for (const prefix of ['clusters-', 'cluster-count-', 'unclustered-point-']) {
      expect(
        ids.some((id) => id.startsWith(prefix)),
        `${prefix}* in ${ids.join(', ')}`,
      ).toBe(true);
    }
  });

  test('clicking a cluster zooms in', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/clusters', 0);
    const clusterLayer = (await layerIds(page, 0)).find((id) => id.startsWith('clusters-'))!;

    let point: Awaited<ReturnType<typeof findRenderedPoint>> = null;
    await expect
      .poll(async () => (point = await findRenderedPoint(page, 0, clusterLayer)), {
        message: 'a rendered cluster',
      })
      .not.toBeNull();
    const zoomBefore = await mapCall(page, 0, (map) => map.getZoom());

    await page.mouse.click(point!.x, point!.y);

    await expect
      .poll(() => mapCall(page, 0, (map) => map.getZoom()), { message: 'zoom after cluster click' })
      .toBeGreaterThan(zoomBefore);
    // Let the easeTo finish so the page is quiet when the test ends.
    await expect.poll(() => mapCall(page, 0, (map) => map.isMoving())).toBe(false);
  });

  test('clicking an individual earthquake reports its magnitude', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/clusters', 0);
    const pointLayer = (await layerIds(page, 0)).find((id) => id.startsWith('unclustered-point-'))!;
    await expect(page.getByText('Earthquake magnitude:')).toHaveCount(0);

    // Zoom far past clusterMaxZoom (14) on a known quake from the fixture, so it is no longer clustered.
    await mapCall(
      page,
      0,
      (map, center) => {
        map.jumpTo({ center, zoom: 16 });
        return new Promise<void>((resolve) => map.once('idle', () => resolve()));
      },
      [QUAKE_LNG, QUAKE_LAT],
    );
    let point: Awaited<ReturnType<typeof findRenderedPoint>> = null;
    await expect
      .poll(async () => (point = await findRenderedPoint(page, 0, pointLayer)), {
        message: 'a rendered unclustered earthquake',
      })
      .not.toBeNull();

    await page.mouse.click(point!.x, point!.y);

    await expect(page.getByText('Earthquake magnitude:')).toBeVisible();
  });
});
