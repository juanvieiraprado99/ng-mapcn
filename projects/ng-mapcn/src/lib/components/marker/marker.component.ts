import { Component, DestroyRef, effect, inject, input, output } from '@angular/core';
import { Map as MapLibreMap, MapMouseEvent, Marker } from 'maplibre-gl';
import { MarkerConfig } from '../../models/marker-config.interface';
import { MapService } from '../../services/map.service';
import { MarkerService } from '../../services/marker.service';

@Component({
  selector: 'ng-marker',
  standalone: true,
  imports: [],
  template: '',
  styles: [],
})
export class MarkerComponent {
  config = input.required<MarkerConfig>();
  mapId = input<string>('default-map');

  markerClick = output<MapMouseEvent>();
  markerHover = output<MapMouseEvent>();

  private marker: Marker | null = null;
  private markerService = inject(MarkerService);
  private mapService = inject(MapService);
  private destroyRef = inject(DestroyRef);
  private mapReadyHandler: (() => void) | null = null;

  constructor() {
    effect(() => {
      const config = this.config();
      const mapId = this.mapId();
      const mapSignal = this.mapService.getMapSignal(mapId);
      const map = mapSignal();

      if (this.marker) {
        this.removeMarker();
      }

      if (map && config && !this.marker && !this.mapReadyHandler) {
        this.attemptAddMarker(map, config);
      }
    });

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      if (this.mapReadyHandler) {
        this.mapReadyHandler = null;
      }
      this.removeMarker();
    });
  }

  private attemptAddMarker(map: MapLibreMap, config: MarkerConfig): void {
    if (!config || this.marker) {
      return;
    }

    if (!map.loaded() || !map.isStyleLoaded()) {
      if (this.mapReadyHandler) {
        return;
      }

      if (!map.isStyleLoaded()) {
        this.mapReadyHandler = () => {
          if (map.loaded()) {
            this.mapReadyHandler = null;
            this.addMarker(map);
          } else {
            const loadHandler = () => {
              this.mapReadyHandler = null;
              this.addMarker(map);
            };
            map.once('load', loadHandler);
          }
        };
        map.once('styledata', this.mapReadyHandler);
      } else {
        this.mapReadyHandler = () => {
          this.mapReadyHandler = null;
          this.addMarker(map);
        };
        map.once('load', this.mapReadyHandler);
      }
      return;
    }

    this.addMarker(map);
  }

  private addMarker(map: MapLibreMap): void {
    const config = this.config();
    const mapId = this.mapId();

    if (!config || this.marker) {
      return;
    }

    try {
      this.marker = this.markerService.addMarker(mapId, config, map);

      if (this.marker) {
        const element = this.marker.getElement();
        if (element) {
          element.addEventListener('click', (e) => {
            this.markerClick.emit(e as any);
          });

          element.addEventListener('mouseenter', (e) => {
            this.markerHover.emit(e as any);
          });
        }
      }
    } catch (error) {
      // Error adding marker
    }
  }

  /**
   * Remove marker from map
   */
  private removeMarker(): void {
    const config = this.config();
    const mapId = this.mapId();

    if (this.marker && config?.id) {
      this.markerService.removeMarker(mapId, config.id);
      this.marker = null;
    }
  }

  getMarker(): Marker | null {
    return this.marker;
  }
}
