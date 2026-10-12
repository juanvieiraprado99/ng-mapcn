import type { Page } from '@playwright/test';

import { DARK_BACKGROUND, expect, LIGHT_BACKGROUND, test } from './fixtures';
import { gotoAndWaitForMap, layerIds, mapCall } from './map-helpers';

// Interactive arcs example (the second map on the arcs page).
const MAP = 1;

const background = (page: Page) =>
  mapCall(page, MAP, (map) => map.getPaintProperty('bg', 'background-color') as string);

const arcLayers = async (page: Page) =>
  (await layerIds(page, MAP)).filter((id) => id.startsWith('arc-'));

test.describe('theme', () => {
  test('the header toggle flips the dark class and swaps the map basemap, both ways', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, '/docs/components/arcs', MAP);
    const html = page.locator('html');
    const wasDark = await html.evaluate((el) => el.classList.contains('dark'));
    const [first, second] = wasDark
      ? [LIGHT_BACKGROUND, DARK_BACKGROUND]
      : [DARK_BACKGROUND, LIGHT_BACKGROUND];
    expect(await background(page)).toBe(second);

    await page.locator('app-theme-toggle button').click();
    await (wasDark
      ? expect(html).not.toHaveClass(/\bdark\b/)
      : expect(html).toHaveClass(/\bdark\b/));
    await expect.poll(() => background(page)).toBe(first);

    await page.locator('app-theme-toggle button').click();
    await (wasDark
      ? expect(html).toHaveClass(/\bdark\b/)
      : expect(html).not.toHaveClass(/\bdark\b/));
    await expect.poll(() => background(page)).toBe(second);
  });

  test('switching theme keeps the arc layers, with the hit layer still below the visible one', async ({
    page,
    network,
  }) => {
    // BUG: the layers are lost for good after a theme switch whenever the new basemap style takes
    // longer than ~100 ms to arrive (always the case for a real Carto style over the network).
    // Root cause (projects/ng-mapcn/src/lib/components/map/map.component.ts): `updateMapTheme`
    // closes the load gate and calls `map.setStyle(style, { diff: true })`, but the `styledata`
    // handler re-opens the gate after a fixed 100 ms debounce regardless of whether the new style
    // has been applied yet. When the style arrives later than that, the layer components re-add
    // their layers into the OLD style; the late style diff then removes them (they are not part of
    // the new style), and the gate is already open, so nothing re-adds them. Observed sequence:
    // setStyle -> styledata -> (100 ms) gate opens -> addLayer x2 -> style applied: layers=1 (bg).
    // The race also hits (about half of the runs) with the instant local style, so this spec
    // simulates a 300 ms network latency to make the failure deterministic.
    test.fail();

    await gotoAndWaitForMap(page, '/docs/components/arcs', MAP);
    const before = await arcLayers(page);
    expect(before).toHaveLength(2);

    network.styleDelayMs = 300;
    const wasDark = await page.locator('html').evaluate((el) => el.classList.contains('dark'));
    await page.locator('app-theme-toggle button').click();
    await expect.poll(() => background(page)).toBe(wasDark ? LIGHT_BACKGROUND : DARK_BACKGROUND);

    // setStyle has been applied: the same arc layers must exist again, hit layer first.
    await expect
      .poll(() => arcLayers(page), { message: 'arc layers after the theme switch' })
      .toEqual(before);
    const ids = await layerIds(page, MAP);
    expect(ids.findIndex((id) => id.startsWith('arc-hit-layer-'))).toBeLessThan(
      ids.findIndex((id) => id.startsWith('arc-layer-')),
    );
  });
});
