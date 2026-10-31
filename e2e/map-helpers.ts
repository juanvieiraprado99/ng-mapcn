import type { Page } from '@playwright/test';
import type { Map as MapLibreMap } from 'maplibre-gl';

import { expect } from './fixtures';

/** A feature point that is visible on the canvas and hittable by the mouse. */
export interface RenderedPoint {
  x: number;
  y: number;
  featureId: string | number;
  source: string;
}

const MAP_SELECTOR = 'ng-map';

/**
 * Scrolls the page until `ng-map` number `mapIndex` exists (later docs examples render lazily),
 * brings it into view and waits for its loader overlay to disappear (`isLoaded()`).
 */
export async function waitForMap(page: Page, mapIndex = 0): Promise<void> {
  await expect
    .poll(
      async () => {
        const count = await page.locator(MAP_SELECTOR).count();
        if (count > mapIndex) {
          return true;
        }
        await page.mouse.wheel(0, 700);
        return false;
      },
      { message: `ng-map #${mapIndex} should appear`, timeout: 30_000, intervals: [100, 200, 300] },
    )
    .toBe(true);

  const map = page.locator(MAP_SELECTOR).nth(mapIndex);
  // Centered, so the sticky site header never covers the map or its markers.
  await map.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await expect(map.locator('.ng-map-loader')).toHaveCount(0, { timeout: 30_000 });
  await expect(map.locator('canvas.maplibregl-canvas').first()).toBeVisible();
}

export async function gotoAndWaitForMap(page: Page, url: string, mapIndex = 0): Promise<void> {
  await page.goto(url);
  await waitForMap(page, mapIndex);
}

/**
 * Runs `fn(map, arg)` in the page, where `map` is the MapLibre instance of `ng-map` number
 * `mapIndex` (reached through the dev build's `window.ng`). `fn` must be self-contained: it is
 * serialized and evaluated in the browser, so it cannot close over test-side variables.
 */
export async function mapCall<R, A = undefined>(
  page: Page,
  mapIndex: number,
  fn: (map: MapLibreMap, arg: A) => R | Promise<R>,
  arg?: A,
): Promise<R> {
  return page.evaluate(
    ([source, index, argument]) => {
      const ng = (
        window as unknown as { ng?: { getComponent(el: Element): { getMap(): unknown } } }
      ).ng;
      if (!ng) {
        throw new Error('window.ng is not available: e2e interaction specs need the dev build');
      }
      const host = document.querySelectorAll('ng-map')[index as number];
      const map = ng.getComponent(host).getMap();
      return (0, eval)(`(${source as string})`)(map, argument);
    },
    [fn.toString(), mapIndex, arg] as const,
  ) as Promise<R>;
}

export async function layerIds(page: Page, mapIndex: number): Promise<string[]> {
  return mapCall(page, mapIndex, (map) => map.getStyle().layers.map((layer) => layer.id));
}

export async function featureState(
  page: Page,
  mapIndex: number,
  source: string,
  id: string | number,
): Promise<Record<string, unknown> | undefined> {
  return mapCall(
    page,
    mapIndex,
    (map, [src, featureId]) => map.getFeatureState({ source: src, id: featureId }),
    [source, id] as [string, string | number],
  );
}

/**
 * Finds a point of layer `layerId` that is on screen, on top of the map canvas (not covered by
 * overlays) and returned by `queryRenderedFeatures`; coordinates are viewport pixels, ready for
 * `page.mouse`. Polygon vertices are nudged towards the ring centroid so they land inside the fill.
 */
export async function findRenderedPoint(
  page: Page,
  mapIndex: number,
  layerId: string,
): Promise<RenderedPoint | null> {
  return mapCall(
    page,
    mapIndex,
    (map, layer) => {
      const style = map.getStyle();
      const layerSpec = style.layers.find((l) => l.id === layer);
      if (!layerSpec || !('source' in layerSpec) || typeof layerSpec.source !== 'string') {
        return null;
      }
      const source = layerSpec.source;
      const canvas = map.getCanvas();
      const rect = canvas.getBoundingClientRect();
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      const candidates: [number, number][] = [];
      const addRing = (ring: number[][]) => {
        const cx = ring.reduce((sum, p) => sum + p[0], 0) / ring.length;
        const cy = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
        for (const [lng, lat] of ring) {
          candidates.push([lng + (cx - lng) * 0.2, lat + (cy - lat) * 0.2]);
        }
        candidates.push([cx, cy]);
      };
      const collect = (geometry: GeoJSON.Geometry): void => {
        switch (geometry.type) {
          case 'Point':
            candidates.push(geometry.coordinates as [number, number]);
            break;
          case 'MultiPoint':
          case 'LineString':
            candidates.push(...(geometry.coordinates as [number, number][]));
            break;
          case 'MultiLineString':
            geometry.coordinates.forEach((line) =>
              candidates.push(...(line as [number, number][])),
            );
            break;
          case 'Polygon':
            geometry.coordinates.forEach(addRing);
            break;
          case 'MultiPolygon':
            geometry.coordinates.forEach((polygon) => polygon.forEach(addRing));
            break;
          default:
            break;
        }
      };

      const sourceLayer = (layerSpec as { 'source-layer'?: string })['source-layer'];
      const features = map.querySourceFeatures(source, sourceLayer ? { sourceLayer } : undefined);
      for (const feature of features) {
        const before = candidates.length;
        collect(feature.geometry);
        for (let i = before; i < candidates.length; i++) {
          const [lng, lat] = candidates[i];
          const projected = map.project([lng, lat]);
          if (
            projected.x < 4 ||
            projected.y < 4 ||
            projected.x > width - 4 ||
            projected.y > height - 4
          ) {
            continue;
          }
          const x = rect.left + projected.x;
          const y = rect.top + projected.y;
          if (document.elementFromPoint(x, y) !== canvas) {
            continue;
          }
          const hit = map.queryRenderedFeatures([projected.x, projected.y], { layers: [layer] });
          if (hit.length === 0) {
            continue;
          }
          const featureId = hit[0].id ?? feature.id;
          return { x, y, featureId: featureId as string | number, source };
        }
      }
      return null;
    },
    layerId,
  );
}
