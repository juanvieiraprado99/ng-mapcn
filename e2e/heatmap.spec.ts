import { expect, test } from './fixtures';
import { gotoAndWaitForMap, layerIds, mapCall } from './map-helpers';

test.describe('heatmap', () => {
  test('renders a heatmap layer over the earthquakes fixture', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/heatmap', 0);
    const ids = await layerIds(page, 0);
    const heatmapLayer = ids.find((id) => id.startsWith('heatmap-layer-'));
    expect(heatmapLayer, `heatmap-layer-* in ${ids.join(', ')}`).toBeDefined();

    const type = await mapCall(page, 0, (map, id: string) => map.getLayer(id)?.type, heatmapLayer!);
    expect(type).toBe('heatmap');
  });
});
