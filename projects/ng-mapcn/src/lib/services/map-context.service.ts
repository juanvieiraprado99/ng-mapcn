import { computed, Injectable, signal } from '@angular/core';
import { Map as MapLibreMap } from 'maplibre-gl';

@Injectable()
export class MapContextService {
  private readonly mapSignal = signal<MapLibreMap | null>(null);
  private readonly loadedFlagSignal = signal(false);
  private readonly styleLoadedFlagSignal = signal(false);

  readonly map = this.mapSignal.asReadonly();
  readonly isLoaded = computed(
    () => this.loadedFlagSignal() && this.styleLoadedFlagSignal()
  );

  setMap(map: MapLibreMap): void {
    this.mapSignal.set(map);
  }

  setLoadedFlag(value: boolean): void {
    this.loadedFlagSignal.set(value);
  }

  setStyleLoadedFlag(value: boolean): void {
    this.styleLoadedFlagSignal.set(value);
  }

  reset(): void {
    this.mapSignal.set(null);
    this.loadedFlagSignal.set(false);
    this.styleLoadedFlagSignal.set(false);
  }
}
