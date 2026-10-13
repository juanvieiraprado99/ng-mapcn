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
  }
}
