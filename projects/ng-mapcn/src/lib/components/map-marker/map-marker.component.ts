import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  NgZone,
  output,
  untracked,
} from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { Marker, type MarkerOptions, Point, type PointLike } from 'maplibre-gl';
import { Subject } from 'rxjs';

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
  readonly offset = input<PointLike>();
  readonly rotation = input(0);
  /** Applied at creation only — MapLibre's Marker has no anchor setter (mapcn parity). */
  readonly anchor = input<MarkerOptions['anchor']>(undefined);
  readonly rotationAlignment = input<MarkerOptions['rotationAlignment']>('auto');
  readonly pitchAlignment = input<MarkerOptions['pitchAlignment']>('auto');

  readonly markerClick = output<MouseEvent>();
  readonly markerMouseEnter = output<MouseEvent>();
  readonly markerMouseLeave = output<MouseEvent>();
  readonly dragStart = output<{ lng: number; lat: number }>();
  private readonly drag$ = new Subject<{ lng: number; lat: number }>();
  /** Emits on every frame of a drag; backed by a Subject so idle drags skip the zone (`observed`). */
  readonly drag = outputFromObservable(this.drag$);
  readonly dragEnd = output<{ lng: number; lat: number }>();

  private readonly mapCtx = inject(MapContextService);
  private readonly markerCtx = inject(MarkerContextService);
  private readonly zone = inject(NgZone);

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
      const anchor = untracked(() => this.anchor());
      const rotationAlignment = untracked(() => this.rotationAlignment());
      const pitchAlignment = untracked(() => this.pitchAlignment());

      const el = document.createElement('div');
      // Creation and listener registration outside the zone; events re-enter via zone.run —
      // `drag` (per-frame) only when someone listens.
      const marker = this.zone.runOutsideAngular(() => {
        const m = new Marker({
          element: el,
          draggable,
          offset,
          rotation,
          ...(anchor ? { anchor } : {}),
          rotationAlignment,
          pitchAlignment,
        })
          .setLngLat([lng, lat])
          .addTo(map);

        el.addEventListener('click', (e) =>
          this.zone.run(() => this.markerClick.emit(e as MouseEvent)),
        );
        el.addEventListener('mouseenter', (e) =>
          this.zone.run(() => this.markerMouseEnter.emit(e as MouseEvent)),
        );
        el.addEventListener('mouseleave', (e) =>
          this.zone.run(() => this.markerMouseLeave.emit(e as MouseEvent)),
        );

        m.on('dragstart', () => {
          const ll = m.getLngLat();
          this.zone.run(() => this.dragStart.emit({ lng: ll.lng, lat: ll.lat }));
        });
        m.on('drag', () => {
          if (!this.drag$.observed) return;
          const ll = m.getLngLat();
          this.zone.run(() => this.drag$.next({ lng: ll.lng, lat: ll.lat }));
        });
        m.on('dragend', () => {
          const ll = m.getLngLat();
          this.zone.run(() => this.dragEnd.emit({ lng: ll.lng, lat: ll.lat }));
        });

        return m;
      });

      this.markerCtx.setMarker(marker);

      onCleanup(() => {
        marker.remove();
        this.markerCtx.reset();
      });
    });

    // Reconcile prop changes without recreating the marker (field-by-field diff)
    effect(() => {
      const lng = this.longitude();
      const lat = this.latitude();
      const draggable = this.draggable();
      const rotation = this.rotation() ?? 0;
      const rotationAlignment = this.rotationAlignment() ?? 'auto';
      const pitchAlignment = this.pitchAlignment() ?? 'auto';
      const off = this.offset();
      const marker = this.markerCtx.marker();
      if (!marker) return;

      const current = marker.getLngLat();
      if (current.lng !== lng || current.lat !== lat) marker.setLngLat([lng, lat]);
      if (marker.isDraggable() !== draggable) marker.setDraggable(draggable);
      if (marker.getRotation() !== rotation) marker.setRotation(rotation);
      if (marker.getRotationAlignment() !== rotationAlignment) {
        marker.setRotationAlignment(rotationAlignment);
      }
      if (marker.getPitchAlignment() !== pitchAlignment) {
        marker.setPitchAlignment(pitchAlignment);
      }
      // mapcn parity: undefined resets to [0, 0]; diff x/y to avoid no-op sets
      const targetOffset = Point.convert(off ?? [0, 0]);
      const currentOffset = marker.getOffset();
      if (currentOffset.x !== targetOffset.x || currentOffset.y !== targetOffset.y) {
        marker.setOffset(targetOffset);
      }
    });
  }

  /** Escape hatch — direct access to the underlying MapLibre Marker */
  getMarker(): Marker | null {
    return this.markerCtx.marker();
  }
}
