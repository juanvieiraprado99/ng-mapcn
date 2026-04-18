import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { Marker, PointLike } from 'maplibre-gl';
import { MapContextService } from '../../services/map-context.service';
import { MarkerContextService } from './marker-context.service';

@Component({
  selector: 'ng-map-marker',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MarkerContextService],
})
export class MapMarkerComponent {
  readonly longitude = input.required<number>();
  readonly latitude = input.required<number>();
  readonly draggable = input(false);
  readonly offset = input<PointLike | undefined>(undefined);
  readonly rotation = input(0);

  readonly markerClick = output<MouseEvent>();
  readonly markerMouseEnter = output<MouseEvent>();
  readonly markerMouseLeave = output<MouseEvent>();
  readonly dragStart = output<{ lng: number; lat: number }>();
  readonly drag = output<{ lng: number; lat: number }>();
  readonly dragEnd = output<{ lng: number; lat: number }>();

  private readonly mapCtx = inject(MapContextService);
  private readonly markerCtx = inject(MarkerContextService);

  constructor() {
    // Create marker when the map becomes available
    effect((onCleanup) => {
      const map = this.mapCtx.map();
      if (!map) return;

      // Read initial values without registering them as dependencies
      // so that position/rotation changes go through the update effect below
      const lng = untracked(() => this.longitude());
      const lat = untracked(() => this.latitude());
      const draggable = untracked(() => this.draggable());
      const offset = untracked(() => this.offset());
      const rotation = untracked(() => this.rotation());

      const el = document.createElement('div');
      const marker = new Marker({ element: el, draggable, offset, rotation })
        .setLngLat([lng, lat])
        .addTo(map);

      el.addEventListener('click', (e) => this.markerClick.emit(e as MouseEvent));
      el.addEventListener('mouseenter', (e) => this.markerMouseEnter.emit(e as MouseEvent));
      el.addEventListener('mouseleave', (e) => this.markerMouseLeave.emit(e as MouseEvent));

      marker.on('dragstart', () => {
        const ll = marker.getLngLat();
        this.dragStart.emit({ lng: ll.lng, lat: ll.lat });
      });
      marker.on('drag', () => {
        const ll = marker.getLngLat();
        this.drag.emit({ lng: ll.lng, lat: ll.lat });
      });
      marker.on('dragend', () => {
        const ll = marker.getLngLat();
        this.dragEnd.emit({ lng: ll.lng, lat: ll.lat });
      });

      this.markerCtx.setMarker(marker);

      onCleanup(() => {
        marker.remove();
        this.markerCtx.reset();
      });
    });

    // Reconcile position/rotation changes without recreating the marker
    effect(() => {
      const marker = this.markerCtx.marker();
      if (!marker) return;

      marker.setLngLat([this.longitude(), this.latitude()]);
      marker.setDraggable(this.draggable());
      marker.setRotation(this.rotation());
      const off = this.offset();
      if (off != null) marker.setOffset(off);
    });
  }

  /** Escape hatch — direct access to the underlying MapLibre Marker */
  getMarker(): Marker | null {
    return this.markerCtx.marker();
  }
}
