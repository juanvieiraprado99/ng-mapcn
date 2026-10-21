import type { Locator } from '@playwright/test';

import { expect, test } from './fixtures';
import { gotoAndWaitForMap, mapCall } from './map-helpers';

// Docs page examples, in template order.
const BUILDINGS = 0;
const TERRAIN = 1;

const PAGE = '/docs/components/3d';
const EXTRUSION = 'fill-extrusion-layer-buildings';
const DEM_SOURCE = 'terrain-source-relief';
const HILLSHADE = 'terrain-hillshade-relief';

// The shared 3D assertions stay on map state: WebGL is software-rendered (SwiftShader) in CI.

async function setRange(input: Locator, value: string) {
  await input.evaluate((el, v) => {
    const range = el as HTMLInputElement;
    range.value = v;
    range.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

test.describe('3D buildings', () => {
  test('extrudes the basemap building layer with the Carto defaults, over a pitched map', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, PAGE, BUILDINGS);

    const layer = await mapCall(
      page,
      BUILDINGS,
      (map, id: string) => {
        const l = map.getLayer(id);
        return {
          type: l?.type,
          source: l?.source,
          sourceLayer: l?.sourceLayer,
          minzoom: l?.minzoom,
          height: map.getPaintProperty(id, 'fill-extrusion-height'),
          base: map.getPaintProperty(id, 'fill-extrusion-base'),
          opacity: map.getPaintProperty(id, 'fill-extrusion-opacity'),
          pitch: map.getPitch(),
        };
      },
      EXTRUSION,
    );

    expect(layer).toMatchObject({
      type: 'fill-extrusion',
      source: 'carto',
      sourceLayer: 'building',
      minzoom: 14,
      opacity: 0.8,
      pitch: 60,
    });
    expect(layer.height).toEqual(['coalesce', ['to-number', ['get', 'render_height']], 0]);
    expect(layer.base).toEqual(['coalesce', ['to-number', ['get', 'render_min_height']], 0]);
  });

  test('the building tiles reach the source (render_height survives the round trip)', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, PAGE, BUILDINGS);

    await expect
      .poll(
        () =>
          mapCall(page, BUILDINGS, (map) =>
            map
              .querySourceFeatures('carto', { sourceLayer: 'building' })
              .map((f) => f.properties['render_height'] as number)
              .sort((a, b) => a - b),
          ),
        { message: 'building features loaded from the fixture tile', timeout: 20_000 },
      )
      .toContain(20);
  });

  test('opacity and color are reconciled on the same layer', async ({ page }) => {
    await gotoAndWaitForMap(page, PAGE, BUILDINGS);
    const paint = (property: string) =>
      mapCall(
        page,
        BUILDINGS,
        (map, [id, prop]) => map.getPaintProperty(id, prop as 'fill-extrusion-color'),
        [EXTRUSION, property] as [string, string],
      );
    const defaultColor = await paint('fill-extrusion-color');
    expect(typeof defaultColor).toBe('string');

    await setRange(
      page
        .locator('label', { hasText: /Opacity/ })
        .first()
        .locator('input'),
      '0.5',
    );
    await expect.poll(() => paint('fill-extrusion-opacity')).toBe(0.5);

    await page.getByRole('button', { name: 'Color by height' }).click();
    await expect
      .poll(async () => JSON.stringify(await paint('fill-extrusion-color')))
      .toContain('render_height');
    expect(
      await mapCall(
        page,
        BUILDINGS,
        (map) => map.getStyle().layers.filter((l) => l.type === 'fill-extrusion').length,
      ),
    ).toBe(1);
  });

  test('the extrusion comes back after a theme switch', async ({ page }) => {
    await gotoAndWaitForMap(page, PAGE, BUILDINGS);
    await expect
      .poll(() => mapCall(page, BUILDINGS, (map, id) => !!map.getLayer(id), EXTRUSION))
      .toBe(true);
    const before = await mapCall(
      page,
      BUILDINGS,
      (map, id: string) => map.getPaintProperty(id, 'fill-extrusion-color'),
      EXTRUSION,
    );

    await page.locator('app-theme-toggle button').click();

    await expect
      .poll(
        () =>
          mapCall(
            page,
            BUILDINGS,
            (map, id: string) => {
              try {
                return { layer: map.getLayer(id)?.type };
              } catch {
                return { layer: 'style is being replaced' };
              }
            },
            EXTRUSION,
          ),
        { message: 'extrusion re-added with the dark theme color' },
      )
      .toMatchObject({ layer: 'fill-extrusion' });
    const after = await mapCall(
      page,
      BUILDINGS,
      (map, id: string) => map.getPaintProperty(id, 'fill-extrusion-color'),
      EXTRUSION,
    );
    expect(after).not.toEqual(before);
  });
});

test.describe('terrain', () => {
  const terrain = (page: Parameters<typeof mapCall>[0]) =>
    mapCall(page, TERRAIN, (map) => map.getTerrain());

  test('enables the terrain from a raster-dem source with a hillshade layer', async ({ page }) => {
    await gotoAndWaitForMap(page, PAGE, TERRAIN);

    expect(await terrain(page)).toEqual({ source: DEM_SOURCE, exaggeration: 1.5 });
    const state = await mapCall(
      page,
      TERRAIN,
      (map, [dem, hillshade]) => ({
        dem: map.getSource(dem)?.type,
        hillshadeSource: map.getSource('terrain-hillshade-source-relief')?.type,
        hillshade: map.getLayer(hillshade)?.type,
        pitch: map.getPitch(),
      }),
      [DEM_SOURCE, HILLSHADE] as [string, string],
    );
    expect(state).toEqual({
      dem: 'raster-dem',
      hillshadeSource: 'raster-dem',
      hillshade: 'hillshade',
      pitch: 70,
    });
  });

  test('the elevation tiles are decoded: the terrain reports an elevation', async ({ page }) => {
    await gotoAndWaitForMap(page, PAGE, TERRAIN);

    await expect
      .poll(() => mapCall(page, TERRAIN, (map) => map.queryTerrainElevation(map.getCenter())), {
        message: 'terrain elevation from the Terrarium fixture tile',
      })
      .not.toBeNull();
  });

  test('exaggeration is re-applied on the live terrain', async ({ page }) => {
    await gotoAndWaitForMap(page, PAGE, TERRAIN);

    await setRange(
      page
        .locator('label', { hasText: /Exaggeration/ })
        .first()
        .locator('input'),
      '2.5',
    );

    await expect.poll(() => terrain(page)).toEqual({ source: DEM_SOURCE, exaggeration: 2.5 });
  });

  test('toggling the hillshade adds and removes only its layer', async ({ page }) => {
    await gotoAndWaitForMap(page, PAGE, TERRAIN);
    const hasHillshade = () => mapCall(page, TERRAIN, (map, id) => !!map.getLayer(id), HILLSHADE);
    expect(await hasHillshade()).toBe(true);

    await page.getByRole('checkbox', { name: 'Hillshade' }).uncheck();

    await expect.poll(hasHillshade).toBe(false);
    expect(await terrain(page)).toEqual({ source: DEM_SOURCE, exaggeration: 1.5 });

    await page.getByRole('checkbox', { name: 'Hillshade' }).check();
    await expect.poll(hasHillshade).toBe(true);
  });

  test('the terrain, source and hillshade are re-applied after a theme switch', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, PAGE, TERRAIN);
    await expect.poll(() => terrain(page)).not.toBeNull();

    await page.locator('app-theme-toggle button').click();

    await expect
      .poll(
        () =>
          mapCall(
            page,
            TERRAIN,
            (map, [dem, hillshade]) => {
              try {
                return {
                  terrain: map.getTerrain(),
                  dem: map.getSource(dem)?.type,
                  hillshade: !!map.getLayer(hillshade),
                };
              } catch {
                return null; // the style is being replaced
              }
            },
            [DEM_SOURCE, HILLSHADE] as [string, string],
          ),
        { message: 'terrain after setStyle' },
      )
      .toEqual({
        terrain: { source: DEM_SOURCE, exaggeration: 1.5 },
        dem: 'raster-dem',
        hillshade: true,
      });
  });

  test('the hillshade reads its own DEM source with the same tiles', async ({ page }) => {
    await gotoAndWaitForMap(page, PAGE, TERRAIN);

    const sources = await mapCall(
      page,
      TERRAIN,
      (map, dem) => {
        const style = map.getStyle();
        const hillshade = style.layers.find((layer) => layer.type === 'hillshade') as
          { source: string } | undefined;
        const tiles = (id: string) => (style.sources[id] as { tiles?: string[] }).tiles;
        return {
          hillshade: hillshade?.source,
          same: JSON.stringify(tiles(hillshade!.source)) === JSON.stringify(tiles(dem)),
        };
      },
      DEM_SOURCE,
    );

    expect(sources.hillshade).not.toBe(DEM_SOURCE);
    expect(sources.same).toBe(true);
  });

  test('a steep pitch keeps the terrain and its elevation', async ({ page }) => {
    await gotoAndWaitForMap(page, PAGE, TERRAIN);

    await mapCall(page, TERRAIN, (map) => {
      map.jumpTo({ pitch: 80, bearing: 45 });
    });

    expect(await terrain(page)).toEqual({ source: DEM_SOURCE, exaggeration: 1.5 });
    await expect
      .poll(() => mapCall(page, TERRAIN, (map) => map.queryTerrainElevation(map.getCenter())))
      .not.toBeNull();
  });

  test('the terrain survives a switch to the globe projection and back', async ({ page }) => {
    await gotoAndWaitForMap(page, PAGE, TERRAIN);

    await mapCall(page, TERRAIN, (map) => {
      map.setProjection({ type: 'globe' });
    });
    await expect
      .poll(() => mapCall(page, TERRAIN, (map) => map.getProjection()?.type))
      .toBe('globe');
    expect(await terrain(page)).toEqual({ source: DEM_SOURCE, exaggeration: 1.5 });

    await mapCall(page, TERRAIN, (map) => {
      map.setProjection({ type: 'mercator' });
    });
    expect(await terrain(page)).toEqual({ source: DEM_SOURCE, exaggeration: 1.5 });
    // The fixture fails the test on any console error raised by the projection change.
  });
});
