import { Injectable, signal } from '@angular/core';
import { type Marker } from 'maplibre-gl';

@Injectable()
export class MarkerContextService {
  private readonly markerSignal = signal<Marker | null>(null);

  readonly marker = this.markerSignal.asReadonly();

  setMarker(marker: Marker): void {
    this.markerSignal.set(marker);
  }

  reset(): void {
    this.markerSignal.set(null);
  }
}
