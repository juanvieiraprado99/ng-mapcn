import { expect, test } from './fixtures';
import { gotoAndWaitForMap, mapCall } from './map-helpers';

test.describe('arcs', () => {
  test('an arc across the antimeridian renders on both sides of a single mercator world', async ({
    page,
  }) => {
    // The interactive example (mercator, default renderWorldCopies: false) has Shanghai → Los
    // Angeles, which crosses the antimeridian: its eastern end lies past 180° when unwrapped.
    await gotoAndWaitForMap(page, '/docs/components/arcs', 1);

    const hits = await mapCall(page, 1, async (map) => {
      const sourceId = Object.keys(map.getStyle().sources).find((id) => id.startsWith('arc-'));
      const hitLayer = map.getStyle().layers.find((l) => l.id.startsWith('arc-hit-layer-'));
      if (!sourceId || !hitLayer) throw new Error('arc source or hit layer not found');
      const source = map.getSource(sourceId) as unknown as {
        getData(): Promise<GeoJSON.FeatureCollection>;
      };
      const lane = (await source.getData()).features.find(
        (f) => f.properties?.['id'] === 'shg-lax',
      );
      if (!lane) throw new Error('Shanghai → Los Angeles lane not found');

      const geometry = lane.geometry as GeoJSON.LineString | GeoJSON.MultiLineString;
      const points = (
        geometry.type === 'MultiLineString' ? geometry.coordinates.flat() : geometry.coordinates
      ) as [number, number][];
      // Points near each end of the lane, wrapped into [-180, 180] (where they should be drawn).
      const wrap = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;
      const near = (point: [number, number]) => {
        const { x, y } = map.project([wrap(point[0]), point[1]]);
        return map
          .queryRenderedFeatures(
            [
              [x - 3, y - 3],
              [x + 3, y + 3],
            ],
            { layers: [hitLayer.id] },
          )
          .some((f) => f.properties?.['id'] === 'shg-lax');
      };
      return {
        asiaSide: near(points[Math.floor(points.length * 0.1)]),
        americasSide: near(points[Math.floor(points.length * 0.9)]),
      };
    });

    expect(hits).toEqual({ asiaSide: true, americasSide: true });
  });
});
