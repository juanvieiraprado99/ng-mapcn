import { computed, Injectable, type Signal, signal } from '@angular/core';
import {
  type LngLatBoundsLike,
  type Map as MapLibreMap,
  type StyleSpecification,
} from 'maplibre-gl';

import { type MapStylesConfig } from '../styles/map-styles';
import {
  type BoundsGetter,
  type BoundsTuple,
  DEFAULT_FIT_MAX_ZOOM,
  type MapFitBoundsOptions,
  sameBounds,
  toBoundsTuple,
  unionBounds,
} from '../utils/bounds';

@Injectable()
export class MapContextService {
  private readonly mapSignal = signal<MapLibreMap | null>(null);
  private readonly loadedFlagSignal = signal(false);
  private readonly styleLoadedFlagSignal = signal(false);
  private readonly resolvedThemeSignal = signal<'light' | 'dark'>('light');

  readonly map = this.mapSignal.asReadonly();
  readonly isLoaded = computed(() => this.loadedFlagSignal() && this.styleLoadedFlagSignal());
  /** The style half of the gate (debounced styledata after every style load). */
  readonly styleLoaded = this.styleLoadedFlagSignal.asReadonly();
  /** Theme currently applied to the map (mapcn context `resolvedTheme`). */
  readonly resolvedTheme = this.resolvedThemeSignal.asReadonly();

  private readonly styleOverrideSignal = signal<MapStylesConfig | undefined>(undefined);
  /**
   * Basemap chosen at runtime by a child (the style switcher). `<ng-map>` gives it the top
   * precedence and applies it through its own `setStyle` path, so the load gate closes and reopens.
   */
  readonly styleOverride = this.styleOverrideSignal.asReadonly();

  private readonly currentStyleSignal = signal<string | StyleSpecification | null>(null);
  /**
   * Style last requested or applied by `<ng-map>` (URL or spec), `null` before the map exists. It
   * is set before the swap finishes and kept when the change is a no-op diff or the fetch fails.
   */
  readonly currentStyle = this.currentStyleSignal.asReadonly();

  private readonly sourceCounts = new Map<string, number>();
  private readonly sourceIdsSignal = signal<ReadonlySet<string>>(new Set());
  /** Ids of the sources currently added to the map by source components. */
  readonly sourceIds = this.sourceIdsSignal.asReadonly();

  private readonly boundsSources = signal<ReadonlyMap<symbol, Signal<BoundsTuple | null>>>(
    new Map(),
  );
  /**
   * Union of the bounds the child components registered (`registerBounds`), or `null` when none
   * has data. Reactive: it changes only when the resulting bounds really change.
   */
  readonly dataBounds = computed<BoundsTuple | null>(
    () => unionBounds([...this.boundsSources().values()].map((bounds) => bounds())),
    { equal: sameBounds },
  );

  /**
   * Style images taken with `acquireImage`, by id: how many users hold each, and the image object
   * this service added (`map.getImage`), or `null` when the style already had one under that id.
   */
  private readonly imageRefs = new Map<string, { count: number; added: unknown }>();

  private errorHandler: ((error: Error) => void) | null = null;

  setMap(map: MapLibreMap): void {
    this.mapSignal.set(map);
  }

  setResolvedTheme(theme: 'light' | 'dark'): void {
    this.resolvedThemeSignal.set(theme);
  }

  /** Sets (or clears, with `undefined`) the runtime basemap override. Applied by `<ng-map>`. */
  setStyleOverride(config: MapStylesConfig | undefined): void {
    this.styleOverrideSignal.set(config);
  }

  setCurrentStyle(style: string | StyleSpecification): void {
    this.currentStyleSignal.set(style);
  }

  setLoadedFlag(value: boolean): void {
    this.loadedFlagSignal.set(value);
  }

  setStyleLoadedFlag(value: boolean): void {
    this.styleLoadedFlagSignal.set(value);
  }

  /**
   * Announces that a source with this id now exists on the map (called by the source components
   * once `addSource` succeeded). Returns the release function; call it when the source is removed.
   * Layer components that reference a source by id (`source="parcels"`) wait on `hasSource(id)`.
   */
  registerSource(id: string): () => void {
    this.sourceCounts.set(id, (this.sourceCounts.get(id) ?? 0) + 1);
    this.sourceIdsSignal.set(new Set(this.sourceCounts.keys()));
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const count = (this.sourceCounts.get(id) ?? 0) - 1;
      if (count > 0) this.sourceCounts.set(id, count);
      else this.sourceCounts.delete(id);
      this.sourceIdsSignal.set(new Set(this.sourceCounts.keys()));
    };
  }

  /** Whether a source with this id is currently registered. Reactive when read in an effect. */
  hasSource(id: string): boolean {
    return this.sourceIdsSignal().has(id);
  }

  /**
   * Takes a reference to the style image `id`, adding it with `data` / `options` when the style has
   * no image under that id (layer components sharing an id share one image: the first one to add it
   * provides the pixels). Needs a loaded map. Returns the release function: the image is removed
   * when its last reference is released, and only if it is still the one added here (an image the
   * style or the app already had is never removed). A style reload drops the images; every user
   * releases while the gate is closed and acquires again once it re-opens, so they are re-added.
   */
  acquireImage(
    id: string,
    data: Parameters<MapLibreMap['addImage']>[1],
    options: { sdf: boolean; pixelRatio: number },
  ): () => void {
    const map = this.mapSignal();
    if (!map) return () => undefined;
    const ref = this.imageRefs.get(id) ?? { count: 0, added: null };
    const current = map.getImage(id);
    if (!current) {
      // Missing: never added, or dropped by a style reload while it was still held.
      try {
        map.addImage(id, data, options);
        ref.added = map.getImage(id) ?? null;
      } catch (error) {
        this.reportError(error);
      }
    } else if (current !== ref.added) {
      ref.added = null;
    }
    ref.count++;
    this.imageRefs.set(id, ref);

    let released = false;
    return () => {
      if (released) return;
      released = true;
      // The map was destroyed meanwhile (`reset` cleared the references).
      if (this.imageRefs.get(id) !== ref) return;
      if (--ref.count > 0) return;
      this.imageRefs.delete(id);
      try {
        if (ref.added && map.getImage(id) === ref.added) map.removeImage(id);
      } catch {
        // style may be mid-reload
      }
    };
  }

  /**
   * Registers a source of fit-to-bounds data. `getter` runs in a reactive context, so reading the
   * component's signals inside it keeps `dataBounds` up to date. Returns the unregister function
   * (call it on destroy).
   */
  registerBounds(getter: BoundsGetter): () => void {
    const key = Symbol('bounds');
    // Memoized per source: when one child's data changes, only its bounds are recomputed (a
    // GeoJSON walk can be costly), the others are read from cache.
    const bounds = computed(() => toBoundsTuple(safeBounds(getter)), { equal: sameBounds });
    this.boundsSources.update((m) => new Map(m).set(key, bounds));
    return () =>
      this.boundsSources.update((m) => {
        const next = new Map(m);
        next.delete(key);
        return next;
      });
  }

  /**
   * Fits the camera to `options.bounds`, or to the union of the children's data when omitted.
   * Needs a loaded map. Returns whether a fit was started (`false`: not loaded or no bounds).
   */
  fitBounds(options: MapFitBoundsOptions = {}): boolean {
    const map = this.mapSignal();
    if (!map || !this.isLoaded()) return false;
    const bounds: LngLatBoundsLike | null = options.bounds
      ? toBoundsTuple(options.bounds)
      : this.dataBounds();
    if (!bounds) return false;
    const { animate, duration, padding, maxZoom } = options;
    map.fitBounds(bounds, {
      padding,
      maxZoom: maxZoom ?? DEFAULT_FIT_MAX_ZOOM,
      ...(animate === false ? { duration: 0 } : duration !== undefined ? { duration } : {}),
    });
    return true;
  }

  /** Set by `<ng-map>`: forwards errors reported by child components to its `mapError` output. */
  setErrorHandler(handler: ((error: Error) => void) | null): void {
    this.errorHandler = handler;
  }

  /**
   * Reports a failure of a child component (e.g. a source id already in use). Child components
   * report instead of throwing: an exception escaping an effect aborts change detection, which
   * would freeze every view on the page.
   */
  reportError(error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(err);
    this.errorHandler?.(err);
  }

  reset(): void {
    this.mapSignal.set(null);
    this.loadedFlagSignal.set(false);
    this.styleLoadedFlagSignal.set(false);
    this.styleOverrideSignal.set(undefined);
    this.currentStyleSignal.set(null);
    this.sourceCounts.clear();
    this.sourceIdsSignal.set(new Set());
    this.imageRefs.clear();
  }
}

/** A source being destroyed may already have lost its inputs; it then contributes nothing. */
function safeBounds(get: BoundsGetter): ReturnType<BoundsGetter> {
  try {
    return get();
  } catch {
    return null;
  }
}
