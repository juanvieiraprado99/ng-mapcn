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

  test('the icon images are registered, and again after a theme switch', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/symbols', ICONS);
    const has = () =>
      mapCall(page, ICONS, (map, ids: string[]) => ids.map((id) => map.hasImage(id)), ICON_IDS);

    await expect.poll(has).toEqual([true, true, true]);
    const darkBefore = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    );

    await page.locator('app-theme-toggle button').click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(!darkBefore);

    // setStyle drops the style's images: the component registers them again from its cache.
    await expect.poll(has).toEqual([true, true, true]);
    await expect.poll(() => symbolLayer(page, ICONS)).toMatch(/^symbol-layer-/);
  });

  test('toggling the options updates the layout without re-creating the layer', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, '/docs/components/symbols', LIVE);
    const idBefore = await symbolLayer(page, LIVE);
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
    expect(await symbolLayer(page, LIVE)).toBe(idBefore);
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
    expect(await symbolLayer(page, FILTERS)).toBe(idBefore);
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
