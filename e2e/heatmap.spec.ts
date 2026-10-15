import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { gotoAndWaitForMap, layerIds, mapCall } from './map-helpers';

// Docs page examples, in template order.
const BASIC = 0;
const INLINE = 1;
const GRADIENT = 2;
const TUNING = 3;
const ZOOM = 4;

const heatmapLayer = async (page: Page, mapIndex: number) => {
  const ids = await layerIds(page, mapIndex);
  const id = ids.find((layer) => layer.startsWith('heatmap-layer-'));
  expect(id, `heatmap-layer-* in ${ids.join(', ')}`).toBeDefined();
  return id!;
};

const paint = (page: Page, mapIndex: number, property: string) =>
  heatmapLayer(page, mapIndex).then((id) =>
    mapCall(page, mapIndex, (map, [layer, prop]) => map.getPaintProperty(layer, prop), [
      id,
      property,
    ] as [string, string]),
  );

test.describe('heatmap', () => {
  test('renders a heatmap layer over the earthquakes fixture', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/heatmap', BASIC);
    const id = await heatmapLayer(page, BASIC);

    const type = await mapCall(page, BASIC, (map, layer: string) => map.getLayer(layer)?.type, id);
    expect(type).toBe('heatmap');
  });

  test('the earthquakes example weights by magnitude with the theme gradient', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/heatmap', BASIC);

    const weight = JSON.stringify(await paint(page, BASIC, 'heatmap-weight'));
    expect(weight).toContain('"mag"');
    const color = JSON.stringify(await paint(page, BASIC, 'heatmap-color'));
    expect(color).toContain('heatmap-density');
  });

  test('inline GeoJSON data is rendered without a request', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/heatmap', INLINE);
    const id = await heatmapLayer(page, INLINE);

    const count = await mapCall(
      page,
      INLINE,
      (map, layer: string) => {
        const source = map.getLayer(layer)?.source as string;
        const data = (
          map.getSource(source) as unknown as { serialize(): { data: unknown } }
        ).serialize().data as { features?: unknown[] };
        return data.features?.length ?? 0;
      },
      id,
    );
    expect(count).toBe(200);
  });

  test('changing the gradient updates the paint without re-creating the layer', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, '/docs/components/heatmap', GRADIENT);
    const idBefore = await heatmapLayer(page, GRADIENT);
    const fire = JSON.stringify(await paint(page, GRADIENT, 'heatmap-color'));
    expect(fire).toContain('#800026');

    await page.getByRole('button', { name: 'Ocean', exact: true }).click();
    await expect
      .poll(async () => JSON.stringify(await paint(page, GRADIENT, 'heatmap-color')))
      .toContain('#08306b');

    // Same layer id: reconciled in place, not destroyed and re-added.
    expect(await heatmapLayer(page, GRADIENT)).toBe(idBefore);
    expect(JSON.stringify(await paint(page, GRADIENT, 'heatmap-color'))).not.toContain('#800026');
  });

  test('the sliders drive radius, intensity and opacity', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/heatmap', TUNING);
    const idBefore = await heatmapLayer(page, TUNING);
    expect(await paint(page, TUNING, 'heatmap-radius')).toBe(20);

    const setSlider = (label: RegExp, value: string) =>
      page
        .locator('label', { hasText: label })
        .locator('input[type="range"]')
        .evaluate((el, v) => {
          const input = el as HTMLInputElement;
          input.value = v;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }, value);

    await setSlider(/Radius/, '45');
    await setSlider(/Intensity/, '2.5');
    await setSlider(/Opacity/, '0.4');

    await expect.poll(() => paint(page, TUNING, 'heatmap-radius')).toBe(45);
    await expect.poll(() => paint(page, TUNING, 'heatmap-intensity')).toBe(2.5);
    await expect.poll(() => paint(page, TUNING, 'heatmap-opacity')).toBe(0.4);
    expect(await heatmapLayer(page, TUNING)).toBe(idBefore);
  });

  test('the zoom example applies zoom expressions and a maxzoom', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/heatmap', ZOOM);
    const id = await heatmapLayer(page, ZOOM);

    const radius = JSON.stringify(await paint(page, ZOOM, 'heatmap-radius'));
    expect(radius).toContain('zoom');
    const maxzoom = await mapCall(
      page,
      ZOOM,
      (map, layer: string) => map.getLayer(layer)?.maxzoom,
      id,
    );
    expect(maxzoom).toBe(7);
  });

  test('switching theme re-adds the layer with the matching default gradient', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/heatmap', BASIC);
    const colorBefore = JSON.stringify(await paint(page, BASIC, 'heatmap-color'));

    await page.locator('app-theme-toggle button').click();
    await expect
      .poll(
        async () => {
          const ids = await layerIds(page, BASIC);
          if (!ids.some((id) => id.startsWith('heatmap-layer-'))) return null;
          return JSON.stringify(await paint(page, BASIC, 'heatmap-color'));
        },
        { message: 'heatmap layer re-added with the other theme gradient' },
      )
      .not.toBe(colorBefore);
  });

  test('a custom gradient is kept across a theme switch', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/heatmap', GRADIENT);
    expect(JSON.stringify(await paint(page, GRADIENT, 'heatmap-color'))).toContain('#800026');

    await page.locator('app-theme-toggle button').click();
    await expect
      .poll(
        async () => {
          const ids = await layerIds(page, GRADIENT);
          if (!ids.some((id) => id.startsWith('heatmap-layer-'))) return null;
          return JSON.stringify(await paint(page, GRADIENT, 'heatmap-color'));
        },
        { message: 'custom gradient present after the theme switch' },
      )
      .toContain('#800026');
  });
});
