import { expect, test } from './fixtures';
import { gotoAndWaitForMap, layerIds, mapCall } from './map-helpers';

// Docs page examples, in template order.
const LABELS = 0;
const ICONS = 1;
const LIVE = 2;
const IMAGES = 3;
const FILTERS = 4;
const INTERACTION = 5;

const ICON_IDS = ['cafe', 'viewpoint', 'station'];

const symbolLayer = async (page: Parameters<typeof layerIds>[0], mapIndex: number) => {
  const ids = await layerIds(page, mapIndex);
  const id = ids.find((layer) => layer.startsWith('symbol-layer-'));
  expect(id, `symbol-layer-* in ${ids.join(', ')}`).toBeDefined();
  return id!;
};

/**
 * Tags the MapLibre style layer object of `layer`, so `isSameLayer` can tell whether the layer
 * was re-created since (a new object), which the id alone cannot show.
 */
const tagLayer = (page: Parameters<typeof layerIds>[0], mapIndex: number, layer: string) =>
  mapCall(
    page,
    mapIndex,
    (map, id: string) => {
      const styleLayer = map.getLayer(id) as unknown as { __e2eTag?: boolean } | undefined;
      if (styleLayer) styleLayer.__e2eTag = true;
      return !!styleLayer;
    },
    layer,
  );

const isSameLayer = (page: Parameters<typeof layerIds>[0], mapIndex: number, layer: string) =>
  mapCall(
    page,
    mapIndex,
    (map, id: string) =>
      (map.getLayer(id) as unknown as { __e2eTag?: boolean } | undefined)?.__e2eTag === true,
    layer,
  );

/** Text colors of `layer`, for checking the theme-aware defaults. */
const textColors = (page: Parameters<typeof layerIds>[0], mapIndex: number, layer: string) =>
  mapCall(
    page,
    mapIndex,
    (map, id: string) => [
      String(map.getPaintProperty(id, 'text-color')),
      String(map.getPaintProperty(id, 'text-halo-color')),
    ],
    layer,
  );

const isDark = (page: Parameters<typeof layerIds>[0]) =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));

test.describe('symbols', () => {
  test('the labels example has a symbol layer with a text field', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/symbols', LABELS);
    const id = await symbolLayer(page, LABELS);

    const info = await mapCall(
      page,
      LABELS,
      (map, layer: string) => ({
        type: map.getLayer(layer)?.type,
        textField: map.getLayoutProperty(layer, 'text-field'),
      }),
      id,
    );
    expect(info.type).toBe('symbol');
    expect(JSON.stringify(info.textField)).toContain('name');
  });

  test('the labels example uses the theme-aware default colors', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/symbols', LABELS);
    const id = await symbolLayer(page, LABELS);
    const LIGHT = ['#171717', '#ffffff'];
    const DARK = ['#fafafa', '#0a0a0a'];

    const darkBefore = await isDark(page);
    expect(await textColors(page, LABELS, id)).toEqual(darkBefore ? DARK : LIGHT);

    await page.locator('app-theme-toggle button').click();
    await expect.poll(() => isDark(page)).toBe(!darkBefore);
    // The id stays the same; the layer is re-added on the new style with the other colors.
    await expect
      .poll(() =>
        mapCall(page, LABELS, (map, layer: string) => !!map.getLayer(layer), id).then((exists) =>
          exists ? textColors(page, LABELS, id) : null,
        ),
      )
      .toEqual(darkBefore ? LIGHT : DARK);
  });

  test('the icon images are registered, and again after a theme switch', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/symbols', ICONS);
    const has = () =>
      mapCall(page, ICONS, (map, ids: string[]) => ids.map((id) => map.hasImage(id)), ICON_IDS);

    await expect.poll(has).toEqual([true, true, true]);
    const darkBefore = await isDark(page);

    // Record whether the images were still there when the new style loaded, so the final poll
    // cannot pass against the old style.
    await mapCall(
      page,
      ICONS,
      (map, ids: string[]) => {
        const w = window as unknown as { __symbolStyleLoad?: { count: number; had: boolean[] } };
        const state = (w.__symbolStyleLoad = { count: 0, had: [] as boolean[] });
        map.on('style.load', () => {
          state.count++;
          state.had = ids.map((id) => map.hasImage(id));
        });
      },
      ICON_IDS,
    );
    const styleLoad = () =>
      page.evaluate(
        () =>
          (window as unknown as { __symbolStyleLoad: { count: number; had: boolean[] } })
            .__symbolStyleLoad,
      );

    await page.locator('app-theme-toggle button').click();
    await expect.poll(() => isDark(page)).toBe(!darkBefore);
    await expect.poll(async () => (await styleLoad()).count).toBeGreaterThan(0);

    // The images were gone when the new style loaded; the component registers them again from
    // its cache once the gate re-opens.
    expect((await styleLoad()).had).toEqual([false, false, false]);
    await expect.poll(has).toEqual([true, true, true]);
    await expect.poll(() => symbolLayer(page, ICONS)).toMatch(/^symbol-layer-/);
  });

  test('toggling the options updates the layout without re-creating the layer', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, '/docs/components/symbols', LIVE);
    const idBefore = await symbolLayer(page, LIVE);
    expect(await tagLayer(page, LIVE, idBefore)).toBe(true);
    const layout = (property: string) =>
      mapCall(page, LIVE, (map, [layer, prop]) => map.getLayoutProperty(layer, prop), [
        idBefore,
        property,
      ] as [string, string]);

    expect(await layout('text-allow-overlap')).toBe(false);
    expect(await layout('text-size')).toBe(12);

    await page.getByTestId('toggle-overlap').click();
    await page.getByTestId('toggle-size').click();

    await expect.poll(() => layout('text-allow-overlap')).toBe(true);
    await expect.poll(() => layout('text-size')).toBe(18);
    expect(await isSameLayer(page, LIVE, idBefore)).toBe(true);
  });

  test('the images example registers a URL, a data and an SDF image', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/symbols', IMAGES);
    const info = () =>
      mapCall(page, IMAGES, (map) => ({
        has: ['pin', 'dot', 'badge'].map((id) => map.hasImage(id)),
        iconColors: map
          .getStyle()
          .layers.filter((l) => l.id.startsWith('symbol-layer-'))
          .map((l) => map.getPaintProperty(l.id, 'icon-color')),
      }));
    await expect.poll(async () => (await info()).has).toEqual([true, true, true]);
    expect((await info()).iconColors).toContain('#7c3aed');
  });

  test('the filter buttons change the layer filter and the zoom range is set', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/symbols', FILTERS);
    const idBefore = await symbolLayer(page, FILTERS);
    expect(await tagLayer(page, FILTERS, idBefore)).toBe(true);
    const read = () =>
      mapCall(
        page,
        FILTERS,
        (map, layer: string) => ({
          filter: map.getFilter(layer) ?? null,
          minzoom: map.getLayer(layer)?.minzoom,
          maxzoom: map.getLayer(layer)?.maxzoom,
          textSize: JSON.stringify(map.getLayoutProperty(layer, 'text-size')),
        }),
        idBefore,
      );

    const initial = await read();
    expect(initial.filter).toBeNull();
    expect(initial.minzoom).toBe(11);
    expect(initial.maxzoom).toBe(19);
    expect(initial.textSize).toContain('zoom');

    await page.getByTestId('filter-cafe').click();
    await expect.poll(async () => JSON.stringify((await read()).filter)).toContain('cafe');
    await page.getByTestId('filter-all').click();
    await expect.poll(async () => (await read()).filter).toBeNull();
    expect(await isSameLayer(page, FILTERS, idBefore)).toBe(true);
  });

  test('the interaction example has two layers with their own ids', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/symbols', INTERACTION);
    const ids = await layerIds(page, INTERACTION);
    expect(ids).toContain('symbol-layer-cafes');
    expect(ids).toContain('symbol-layer-viewpoints');

    // Clicks need rendered text, and the offline fixture's empty glyph set renders none.
    await expect(page.getByTestId('clicked')).toContainText('none');
    await expect(page.getByTestId('hovered')).toContainText('none');
  });
});
