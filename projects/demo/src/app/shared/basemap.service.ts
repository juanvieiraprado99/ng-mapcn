import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
// Type-only: a value import would pull the whole ng-mapcn FESM (and with it
// maplibre-gl) into the initial bundle, since this service is root-provided.
import type { MapStylesConfig } from 'ng-mapcn';

import { OSM_RASTER_STYLE } from './osm-style';

export type BasemapId = 'carto' | 'openfreemap' | 'osm' | 'maptiler' | 'stadia';

export interface BasemapProvider {
  readonly id: BasemapId;
  readonly label: string;
  /** Vector styles re-theme cleanly; raster tiles are a fixed image. */
  readonly kind: 'vector' | 'raster';
  readonly needsKey: boolean;
  /** Where the user gets an API key. */
  readonly keyUrl?: string;
  readonly note?: string;
  /** `undefined` = fall back to the library's Carto defaults. */
  styles(key: string): MapStylesConfig | undefined;
}

export const BASEMAP_PROVIDERS: readonly BasemapProvider[] = [
  {
    id: 'carto',
    label: 'Carto',
    kind: 'vector',
    needsKey: false,
    styles: () => undefined,
  },
  {
    id: 'openfreemap',
    label: 'OpenFreeMap',
    kind: 'vector',
    needsKey: false,
    styles: () => ({
      light: 'https://tiles.openfreemap.org/styles/positron',
      dark: 'https://tiles.openfreemap.org/styles/dark',
    }),
  },
  {
    id: 'osm',
    label: 'OpenStreetMap',
    kind: 'raster',
    needsKey: false,
    note: 'Raster tiles. Dev/demo only — see the OSM tile usage policy.',
    styles: () => ({ light: OSM_RASTER_STYLE, dark: OSM_RASTER_STYLE }),
  },
  {
    id: 'maptiler',
    label: 'MapTiler',
    kind: 'vector',
    needsKey: true,
    keyUrl: 'https://cloud.maptiler.com/account/keys/',
    styles: (key) =>
      key
        ? {
            light: `https://api.maptiler.com/maps/streets-v4/style.json?key=${key}`,
            dark: `https://api.maptiler.com/maps/streets-v4-dark/style.json?key=${key}`,
          }
        : undefined,
  },
  {
    id: 'stadia',
    label: 'Stadia Maps',
    kind: 'vector',
    needsKey: true,
    keyUrl: 'https://client.stadiamaps.com/',
    note: 'Key optional on localhost (rate limited).',
    styles: (key) => {
      const auth = key ? `?api_key=${key}` : '';
      return {
        light: `https://tiles.stadiamaps.com/styles/alidade_smooth.json${auth}`,
        dark: `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json${auth}`,
      };
    },
  },
];

const STORAGE_KEY = 'ng-mapcn-demo:basemap';

interface PersistedState {
  providerId: BasemapId;
  keys: Partial<Record<BasemapId, string>>;
}

/**
 * Basemap selected in the header. Wired into the library through
 * `provideMapStyles()` in `app.config.ts`, so every `<ng-map>` that does not
 * set its own `[styles]` (or `[blank]`) follows this signal live.
 */
@Injectable({ providedIn: 'root' })
export class BasemapService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly providers = BASEMAP_PROVIDERS;

  private readonly restored = this.restore();

  readonly providerId = signal<BasemapId>(this.restored.providerId);
  readonly keys = signal<Partial<Record<BasemapId, string>>>(this.restored.keys);

  readonly provider = computed(
    () => this.providers.find((p) => p.id === this.providerId()) ?? this.providers[0],
  );

  readonly key = computed(() => this.keys()[this.providerId()] ?? '');

  readonly styles = computed<MapStylesConfig | undefined>(() => this.provider().styles(this.key()));

  constructor() {
    effect(() => {
      const state: PersistedState = {
        providerId: this.providerId(),
        keys: this.keys(),
      };
      if (!this.isBrowser) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {}
    });

    if (!this.isBrowser) return;
    // Follow picks made in other windows — the blocks gallery previews are
    // iframes, and they should switch basemap with the page around them.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const state = this.restore();
      this.providerId.set(state.providerId);
      this.keys.set(state.keys);
    };
    window.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', onStorage));
  }

  select(id: BasemapId): void {
    this.providerId.set(id);
  }

  setKey(id: BasemapId, key: string): void {
    this.keys.update((keys) => ({ ...keys, [id]: key.trim() }));
  }

  private restore(): PersistedState {
    const fallback: PersistedState = { providerId: 'carto', keys: {} };
    if (!this.isBrowser) return fallback;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      const known = BASEMAP_PROVIDERS.some((p) => p.id === parsed.providerId);
      return {
        providerId: known ? (parsed.providerId as BasemapId) : 'carto',
        keys: parsed.keys ?? {},
      };
    } catch {
      return fallback;
    }
  }
}
