import { Component, DestroyRef, effect, inject, input, output } from '@angular/core';
import { Map as MapLibreMap } from 'maplibre-gl';
import { ControlPosition, LocateControlConfig } from '../../models';
import { MapService } from '../../services/map.service';

/**
 * Locate control component
 */
@Component({
  selector: 'ng-locate-control',
  standalone: true,
  imports: [],
  templateUrl: './locate-control.component.html',
  styleUrl: './locate-control.component.scss',
})
export class LocateControlComponent {
  config = input<LocateControlConfig>();
  mapId = input<string>('default-map');
  position = input<ControlPosition>('top-right');

  locate = output<GeolocationPosition>();
  locateError = output<GeolocationPositionError>();

  private mapService = inject(MapService);
  private destroyRef = inject(DestroyRef);
  private watchId: number | null = null;
  private map: MapLibreMap | null = null;

  constructor() {
    // Watch for map availability
    effect(() => {
      const mapId = this.mapId();
      const mapSignal = this.mapService.getMapSignal(mapId);
      const mapInstance = mapSignal();
      if (mapInstance && !this.map) {
        this.map = mapInstance;
      }
    });

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      this.stopWatching();
    });
  }

  /**
   * Handle locate
   */
  onLocate(): void {
    if (!navigator.geolocation) {
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    const config = this.config();
    if (config?.watchPosition) {
      this.startWatching(options);
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.handleLocationSuccess(position);
        },
        (error) => {
          this.handleLocationError(error);
        },
        options
      );
    }
  }

  /**
   * Start watching position
   */
  private startWatching(options: PositionOptions): void {
    this.stopWatching();

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.handleLocationSuccess(position);
      },
      (error) => {
        this.handleLocationError(error);
      },
      options
    );
  }

  /**
   * Stop watching position
   */
  private stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Handle location success
   */
  private handleLocationSuccess(position: GeolocationPosition): void {
    const { longitude, latitude } = position.coords;
    const mapId = this.mapId();
    this.mapService.flyTo(mapId, [longitude, latitude], 15);

    this.locate.emit(position);
  }

  /**
   * Handle location error
   */
  private handleLocationError(error: GeolocationPositionError): void {
    this.locateError.emit(error);
  }

  /**
   * Get position class
   */
  getPositionClass(): string {
    return `ng-controls-${this.position()}`;
  }

  /**
   * Get locate image path
   */
  getLocateImagePath(): string {
    return this.config()?.locateImagePath || '/locateme.png';
  }
}
