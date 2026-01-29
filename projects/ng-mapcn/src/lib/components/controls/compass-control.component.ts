import { Component, DestroyRef, effect, inject, input, output } from '@angular/core';
import { Map as MapLibreMap } from 'maplibre-gl';
import { CompassControlConfig, ControlPosition } from '../../models';
import { MapService } from '../../services/map.service';

@Component({
  selector: 'ng-compass-control',
  standalone: true,
  imports: [],
  templateUrl: './compass-control.component.html',
  styleUrl: './compass-control.component.scss',
})
export class CompassControlComponent {
  config = input<CompassControlConfig>();
  mapId = input<string>('default-map');
  position = input<ControlPosition>('top-right');

  resetNorth = output<void>();

  private mapService = inject(MapService);
  private destroyRef = inject(DestroyRef);
  private map: MapLibreMap | null = null;
  private rotateHandler: (() => void) | null = null;
  private rotateEndHandler: (() => void) | null = null;

  compassRotation: number = 0;

  constructor() {
    effect(() => {
      const mapId = this.mapId();
      const mapSignal = this.mapService.getMapSignal(mapId);
      const mapInstance = mapSignal();
      if (mapInstance && !this.map) {
        this.map = mapInstance;
        this.setupRotationListeners();
        this.updateCompassRotation();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.removeRotationListeners();
    });
  }

  private setupRotationListeners(): void {
    if (!this.map) {
      return;
    }

    this.removeRotationListeners();

    this.rotateHandler = () => {
      this.updateCompassRotation();
    };

    this.rotateEndHandler = () => {
      this.updateCompassRotation();
    };

    this.map.on('rotate', this.rotateHandler);
    this.map.on('rotateend', this.rotateEndHandler);
  }

  private removeRotationListeners(): void {
    if (this.map) {
      if (this.rotateHandler) {
        this.map.off('rotate', this.rotateHandler);
        this.rotateHandler = null;
      }
      if (this.rotateEndHandler) {
        this.map.off('rotateend', this.rotateEndHandler);
        this.rotateEndHandler = null;
      }
    }
  }

  private updateCompassRotation(): void {
    if (!this.map) {
      return;
    }

    const bearing = this.map.getBearing();
    this.compassRotation = -bearing;
  }

  getCompassRotationStyle(): string {
    return `transform: rotate(${this.compassRotation}deg);`;
  }

  onResetNorth(): void {
    const mapId = this.mapId();
    this.mapService.resetNorth(mapId);
    this.resetNorth.emit();
  }

  getPositionClass(): string {
    return `ng-controls-${this.position()}`;
  }

  getCompassImagePath(): string {
    return this.config()?.compassImagePath || '/compass.png';
  }
}
