import { computed, Injectable, signal } from '@angular/core';
import { type LngLatBoundsLike, type Map as MapLibreMap } from 'maplibre-gl';

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
  /** Theme currently applied to the map (mapcn context `resolvedTheme`). */
  readonly resolvedTheme = this.resolvedThemeSignal.asReadonly();

  private readonly sourceCounts = new Map<string, number>();
  private readonly sourceIdsSignal = signal<ReadonlySet<string>>(new Set());
  /** Ids of the sources currently added to the map by source components. */
  readonly sourceIds = this.sourceIdsSignal.asReadonly();

  private readonly boundsSources = signal<ReadonlyMap<symbol, BoundsGetter>>(new Map());
  /**
   * Union of the bounds the child components registered (`registerBounds`), or `null` when none
   * has data. Reactive: it changes only when the resulting bounds really change.
   */
  readonly dataBounds = computed<BoundsTuple | null>(
    () => unionBounds([...this.boundsSources().values()].map(safeBounds)),
    { equal: sameBounds },
  );

  private errorHandler: ((error: Error) => void) | null = null;

  setMap(map: MapLibreMap): void {
    this.mapSignal.set(map);
  }

  setResolvedTheme(theme: 'light' | 'dark'): void {
    this.resolvedThemeSignal.set(theme);
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
   * Registers a source of fit-to-bounds data. `getter` runs in a reactive context, so reading the
   * component's signals inside it keeps `dataBounds` up to date. Returns the unregister function
   * (call it on destroy).
   */
  registerBounds(getter: BoundsGetter): () => void {
    const key = Symbol('bounds');
    this.boundsSources.update((m) => new Map(m).set(key, getter));
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
    this.sourceCounts.clear();
    this.sourceIdsSignal.set(new Set());
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
