import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  NgZone,
  untracked,
} from '@angular/core';
import { Marker } from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { pointAlongLine } from '../../utils/map-utils';
import { MarkerContextService } from '../map-marker/marker-context.service';
import { RouteContextService } from '../map-route/route-context.service';

/** Where a `<ng-route-marker>` sits: route start, end, the current progress, or a 0-1 fraction. */
export type RouteMarkerAt = 'start' | 'end' | 'progress' | number;

/** A marker placed along the parent `<ng-map-route>`; project `<ng-marker-content>` into it. */
@Component({
  selector: 'ng-route-marker',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MarkerContextService],
})
export class RouteMarkerComponent {
  readonly at = input<RouteMarkerAt>('start');

  private readonly mapCtx = inject(MapContextService);
  private readonly routeCtx = inject(RouteContextService);
  private readonly markerCtx = inject(MarkerContextService);
  private readonly zone = inject(NgZone);

  private readonly position = computed(() => {
    const at = this.at();
    const fraction =
      at === 'start'
        ? 0
        : at === 'end'
          ? 1
          : at === 'progress'
            ? (this.routeCtx.progress() ?? 0)
            : at;
    return pointAlongLine(this.routeCtx.coordinates(), fraction, this.routeCtx.cumulative());
  });
  private readonly hasPosition = computed(() => this.position() !== null);

  constructor() {
    // Created once (as soon as the route has a position), moved with setLngLat afterwards.
    effect((onCleanup) => {
      const map = this.mapCtx.map();
      if (!map || !this.hasPosition()) return;
      const [lng, lat] = untracked(() => this.position()!);

      const marker = this.zone.runOutsideAngular(() =>
        new Marker({ element: document.createElement('div') }).setLngLat([lng, lat]).addTo(map),
      );
      this.markerCtx.setMarker(marker);

      onCleanup(() => {
        marker.remove();
        this.markerCtx.reset();
      });
    });

    effect(() => {
      const pos = this.position();
      const marker = this.markerCtx.marker();
      if (!marker || !pos) return;
      const current = marker.getLngLat();
      if (current.lng !== pos[0] || current.lat !== pos[1]) marker.setLngLat(pos);
    });
  }
}
