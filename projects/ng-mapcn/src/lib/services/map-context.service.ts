import { computed, Injectable, signal } from '@angular/core';
import { type Map as MapLibreMap } from 'maplibre-gl';

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
