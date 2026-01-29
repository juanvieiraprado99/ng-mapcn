import { Component, DestroyRef, effect, inject, input } from '@angular/core';
import type { IControl } from 'maplibre-gl';
import {
  FullscreenControl,
  GeolocateControl,
  Map as MapLibreMap,
  NavigationControl,
} from 'maplibre-gl';
import { ControlPosition } from '../../models';
import { MapService } from '../../services/map.service';

@Component({
  selector: 'ng-map-controls',
  standalone: true,
  imports: [],
  template: '<div style="display: none"></div>',
  styles: [':host { display: none }'],
})
export class MapControlsComponent {
  mapId = input<string>('default-map');
  position = input<ControlPosition>('top-right');

  showZoom = input<boolean>(true);
  showCompass = input<boolean>(false);
  showLocate = input<boolean>(false);
  showFullscreen = input<boolean>(false);

  visualizePitch = input<boolean>(false);
  visualizeRoll = input<boolean>(false);

  private mapService = inject(MapService);
  private destroyRef = inject(DestroyRef);

  private controls: IControl[] = [];
  private currentMap: MapLibreMap | null = null;

  constructor() {
    effect(() => {
      const mapId = this.mapId();
      const pos = this.position();
      const showZoom = this.showZoom();
      const showCompass = this.showCompass();
      const showLocate = this.showLocate();
      const showFullscreen = this.showFullscreen();
      const visualizePitch = this.visualizePitch();
      const visualizeRoll = this.visualizeRoll();

      const map = this.mapService.getMapSignal(mapId)();

      if (!map) {
        this.removeAllControls();
        this.currentMap = null;
        return;
      }

      this.currentMap = map;
      this.removeAllControls();

      if (showZoom || showCompass) {
        const navControl = new NavigationControl({
          showZoom,
          showCompass,
          visualizePitch,
          visualizeRoll,
        });
        map.addControl(navControl, pos);
        this.controls.push(navControl);
      }

      if (showLocate) {
        const geolocateControl = new GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          },
          trackUserLocation: true,
        });
        map.addControl(geolocateControl, pos);
        this.controls.push(geolocateControl);
      }

      if (showFullscreen) {
        const fullscreenControl = new FullscreenControl({});
        map.addControl(fullscreenControl, pos);
        this.controls.push(fullscreenControl);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.removeAllControls();
      this.currentMap = null;
    });
  }

  private removeAllControls(): void {
    if (!this.currentMap) {
      this.controls = [];
      return;
    }
    for (const control of this.controls) {
      try {
        this.currentMap.removeControl(control);
      } catch {
        // Control may already be removed
      }
    }
    this.controls = [];
  }
}
