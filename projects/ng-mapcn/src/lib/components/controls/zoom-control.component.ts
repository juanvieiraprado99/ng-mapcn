import { Component, inject, input, output } from '@angular/core';
import { ControlPosition, ZoomControlConfig } from '../../models';
import { MapService } from '../../services/map.service';

/**
 * Zoom control component
 */
@Component({
  selector: 'ng-zoom-control',
  standalone: true,
  imports: [],
  templateUrl: './zoom-control.component.html',
  styleUrl: './zoom-control.component.scss',
})
export class ZoomControlComponent {
  config = input<ZoomControlConfig>();
  mapId = input<string>('default-map');
  position = input<ControlPosition>('top-right');

  zoomIn = output<void>();
  zoomOut = output<void>();

  private mapService = inject(MapService);

  /**
   * Handle zoom in
   */
  onZoomIn(): void {
    const mapId = this.mapId();
    this.mapService.zoomIn(mapId);
    this.zoomIn.emit();
  }

  /**
   * Handle zoom out
   */
  onZoomOut(): void {
    const mapId = this.mapId();
    this.mapService.zoomOut(mapId);
    this.zoomOut.emit();
  }

  /**
   * Get position class
   */
  getPositionClass(): string {
    return `ng-controls-${this.position()}`;
  }
}
