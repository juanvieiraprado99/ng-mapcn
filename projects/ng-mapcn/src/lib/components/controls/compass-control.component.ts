import { Component, DestroyRef, effect, inject, input, output } from '@angular/core';
import { Map as MapLibreMap } from 'maplibre-gl';
import { CompassControlConfig, ControlPosition } from '../../models';
import { MapService } from '../../services/map.service';

/**
 * Compass control component
 */
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

  // Compass rotation in degrees (negative of map bearing to always point north)
  compassRotation: number = 0;

  constructor() {
    // Watch for map availability
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

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      this.removeRotationListeners();
    });
  }

  /**
   * Setup rotation listeners for the map
   */
  private setupRotationListeners(): void {
    if (!this.map) {
      return;
    }

    this.removeRotationListeners();

    // Listen to rotation events
    this.rotateHandler = () => {
      this.updateCompassRotation();
    };

    this.rotateEndHandler = () => {
      this.updateCompassRotation();
    };

    this.map.on('rotate', this.rotateHandler);
    this.map.on('rotateend', this.rotateEndHandler);
  }

  /**
   * Remove rotation listeners
   */
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

  /**
   * Update compass rotation based on map bearing
   */
  private updateCompassRotation(): void {
    if (!this.map) {
      return;
    }

    // Get current bearing (rotation) of the map
    const bearing = this.map.getBearing();

    // Compass rotates in opposite direction to always point north
    // If map rotates 45° clockwise, compass rotates -45° (counter-clockwise)
    this.compassRotation = -bearing;
  }

  /**
   * Get compass rotation style
   */
  getCompassRotationStyle(): string {
    return `transform: rotate(${this.compassRotation}deg);`;
  }

  /**
   * Handle reset north
   */
  onResetNorth(): void {
    const mapId = this.mapId();
    this.mapService.resetNorth(mapId);
    this.resetNorth.emit();
    // Rotation will update automatically via event listener
  }

  /**
   * Get position class
   */
  getPositionClass(): string {
    return `ng-controls-${this.position()}`;
  }

  /**
   * Get compass image path
   */
  getCompassImagePath(): string {
    return this.config()?.compassImagePath || '/compass.png';
  }
}
