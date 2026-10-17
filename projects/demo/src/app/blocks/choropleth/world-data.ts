import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, PLATFORM_ID, type Signal, signal } from '@angular/core';

export const WORLD_GEOJSON =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_110m_admin_0_countries.geojson';

export interface WorldFeatureProperties {
  NAME_LONG: string;
}

export type WorldData = GeoJSON.FeatureCollection<GeoJSON.Geometry, WorldFeatureProperties>;

/**
 * Fetches the world countries GeoJSON once, in the browser. Call it from an
 * injection context (a field initializer or constructor).
 */
export function injectWorldData(url: string = WORLD_GEOJSON): Signal<WorldData | null> {
  const data = signal<WorldData | null>(null);
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return data.asReadonly();

  let active = true;
  inject(DestroyRef).onDestroy(() => (active = false));
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`World data request failed: ${res.status} ${res.statusText}`);
      return res.json() as Promise<WorldData>;
    })
    .then((world) => {
      if (active) data.set(world);
    })
    // The map keeps rendering without the country layer; nothing else depends on it.
    .catch((error: unknown) => console.error(error));

  return data.asReadonly();
}
