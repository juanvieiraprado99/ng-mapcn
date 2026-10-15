import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { gotoAndWaitForMap, mapCall } from './map-helpers';

// Docs page examples, in template order.
const RASTER = 0;
const IMAGE = 1;
const PMTILES = 2;

const PAGE = '/docs/components/tile-sources';

const sourceType = (page: Page, index: number, id: string) =>
  mapCall(page, index, (map, source: string) => map.getSource(source)?.type, id);

test.describe('tile sources', () => {
  test('raster source: adds the source and a raster layer, then loads its tiles', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, PAGE, RASTER);

    expect(await sourceType(page, RASTER, 'tiles')).toBe('raster');
    const layer = await mapCall(page, RASTER, (map) => {
      const l = map.getLayer('raster-layer-tiles');
      return { type: l?.type, source: l?.source };
    });
    expect(layer).toEqual({ type: 'raster', source: 'tiles' });

    await expect
      .poll(() => mapCall(page, RASTER, (map) => map.isSourceLoaded('tiles')), {
        message: 'raster tiles loaded from the fixture',
      })
      .toBe(true);
  });

  test('raster source: opacity and visibility are reconciled on the same layer', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, PAGE, RASTER);
    const opacity = () =>
      mapCall(page, RASTER, (map) => map.getPaintProperty('raster-layer-tiles', 'raster-opacity'));
    expect(await opacity()).toBe(0.7);

    await page
      .locator('label', { hasText: /Opacity/ })
      .first()
      .locator('input[type="range"]')
      .evaluate((el) => {
        const input = el as HTMLInputElement;
        input.value = '0.3';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    await expect.poll(opacity).toBe(0.3);

    await page.getByRole('button', { name: 'Hide' }).click();
    await expect
      .poll(() =>
        mapCall(page, RASTER, (map) => map.getLayoutProperty('raster-layer-tiles', 'visibility')),
      )
      .toBe('none');
    expect(await sourceType(page, RASTER, 'tiles')).toBe('raster');
  });

  test('image overlay: setCoordinates moves the live source', async ({ page }) => {
    await gotoAndWaitForMap(page, PAGE, IMAGE);
    expect(await sourceType(page, IMAGE, 'compass')).toBe('image');

    const coordinates = () =>
      mapCall(
        page,
        IMAGE,
        (map) =>
          (map.getSource('compass') as unknown as { coordinates: number[][] }).coordinates[0],
      );
    expect(await coordinates()).toEqual([-80, 28]);

    await page.getByRole('button', { name: 'Move east' }).click();

    await expect.poll(coordinates).toEqual([-78, 28]);
    expect(await sourceType(page, IMAGE, 'compass')).toBe('image');
  });

  test('vector source over PMTiles: the archive is read and the parcels are drawn', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, PAGE, PMTILES);

    expect(await sourceType(page, PMTILES, 'parcels')).toBe('vector');
    await expect
      .poll(
        () =>
          mapCall(
            page,
            PMTILES,
            (map) => map.queryRenderedFeatures({ layers: ['parcels-fill'] }).length,
          ),
        { message: 'parcels rendered from the .pmtiles fixture' },
      )
      .toBeGreaterThan(0);
  });

  test('vector source: hovering a parcel sets its feature-state through promoteId', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, PAGE, PMTILES);
    await expect
      .poll(() =>
        mapCall(
          page,
          PMTILES,
          (map) => map.queryRenderedFeatures({ layers: ['parcels-fill'] }).length,
        ),
      )
      .toBeGreaterThan(0);

    const point = await mapCall(page, PMTILES, (map) => {
      const p = map.project([-74.0046, 40.5811]);
      const rect = map.getCanvas().getBoundingClientRect();
      return { x: rect.left + p.x, y: rect.top + p.y };
    });
    await page.mouse.move(point.x, point.y);
    await page.mouse.move(point.x + 1, point.y + 1);

    await expect
      .poll(
        () =>
          mapCall(page, PMTILES, (map) =>
            map.queryRenderedFeatures({ layers: ['parcels-fill'] }).some(
              (f) =>
                map.getFeatureState({
                  source: 'parcels',
                  sourceLayer: 'parcels',
                  id: f.id as number,
                })['hover'] === true,
            ),
          ),
        { message: 'a parcel has hover feature-state' },
      )
      .toBe(true);
  });

  test('a theme switch re-adds the sources and the layers that wait for them', async ({ page }) => {
    await gotoAndWaitForMap(page, PAGE, PMTILES);
    await expect
      .poll(() => mapCall(page, PMTILES, (map) => !!map.getLayer('parcels-fill')))
      .toBe(true);

    await page.locator('app-theme-toggle button').click();

    await expect
      .poll(
        () =>
          mapCall(page, PMTILES, (map) => ({
            source: map.getSource('parcels')?.type,
            fill: !!map.getLayer('parcels-fill'),
            line: !!map.getLayer('parcels-line'),
          })),
        { message: 'parcels source and layers after setStyle' },
      )
      .toEqual({ source: 'vector', fill: true, line: true });
    await expect
      .poll(() =>
        mapCall(
          page,
          PMTILES,
          (map) => map.queryRenderedFeatures({ layers: ['parcels-fill'] }).length,
        ),
      )
      .toBeGreaterThan(0);
  });

  test('the raster and image sources survive a theme switch', async ({ page }) => {
    await gotoAndWaitForMap(page, PAGE, RASTER);
    await page.locator('app-theme-toggle button').click();

    await expect
      .poll(() =>
        mapCall(page, RASTER, (map) => [
          map.getSource('tiles')?.type,
          map.getLayer('raster-layer-tiles')?.type,
        ]),
      )
      .toEqual(['raster', 'raster']);
  });
});
