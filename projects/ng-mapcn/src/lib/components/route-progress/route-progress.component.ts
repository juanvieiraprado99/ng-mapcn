import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { type GeoJSONSource } from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { addMapLayers } from '../../utils/layers';
import { sliceLineByProgress } from '../../utils/map-utils';
import { RouteContextService } from '../map-route/route-context.service';

/** Draws the covered part of the parent `<ng-map-route [progress]>` on top of the route line. */
@Component({
  selector: 'ng-route-progress',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteProgressComponent {
  readonly color = input('#22c55e');
  /** Defaults to the route's width. */
  readonly width = input<number>();
  readonly opacity = input(1);
  readonly dashArray = input<[number, number]>();

  private readonly mapCtx = inject(MapContextService);
  private readonly routeCtx = inject(RouteContextService);

  private readonly created = signal(false);
  /** Data currently in the source, so re-runs skip a no-op setData. */
  private applied: { coords: [number, number][]; progress: number } | null = null;

  constructor() {
    effect((onCleanup) => {
      if (!this.mapCtx.isLoaded() || !this.routeCtx.created()) return;
      const map = this.mapCtx.map();
      if (!map) return;

      const sourceId = `${this.routeCtx.layerId()}-progress`;
      const layerId = `${sourceId}-layer`;
      const beforeId = untracked(() => this.routeCtx.beforeId());
      const coords = untracked(() => this.routeCtx.coordinates());
      const cumulative = untracked(() => this.routeCtx.cumulative());
      const progress = untracked(() => this.routeCtx.progress()) ?? 0;
      const color = untracked(() => this.color());
      const width = untracked(() => this.width() ?? this.routeCtx.width());
      const opacity = untracked(() => this.opacity());
      const da = untracked(() => this.dashArray());

      const teardown = addMapLayers(
        map,
        (b) => {
          b.addSource(sourceId, { type: 'geojson', data: toGeoJSON(coords, progress, cumulative) });
          b.addLayer(
            {
              id: layerId,
              type: 'line',
              source: sourceId,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': color,
                'line-width': width,
                'line-opacity': opacity,
                ...(da ? { 'line-dasharray': da } : {}),
              },
            },
            beforeId,
          );
        },
        (error) => this.mapCtx.reportError(error),
      );
      if (!teardown) return;
      this.applied = { coords, progress };
      this.created.set(true);

      onCleanup(() => {
        this.created.set(false);
        teardown();
      });
    });

    // Progress / coordinates changes: setData only, never recreate.
    effect(() => {
      const coords = this.routeCtx.coordinates();
      const progress = this.routeCtx.progress() ?? 0;
      const cumulative = this.routeCtx.cumulative();
      if (!this.created()) return;
      const map = this.mapCtx.map();
      if (!map) return;
      const sourceId = `${untracked(() => this.routeCtx.layerId())}-progress`;
      const source = map.getSource(sourceId) as GeoJSONSource | undefined;
      const applied = this.applied;
      if (!source || (applied?.coords === coords && applied.progress === progress)) return;
      source.setData(toGeoJSON(coords, progress, cumulative));
      this.applied = { coords, progress };
    });

    effect(() => {
      const color = this.color();
      const width = this.width() ?? this.routeCtx.width();
      const opacity = this.opacity();
      const da = this.dashArray();
      if (!this.created()) return;
      const map = this.mapCtx.map();
      const layerId = `${untracked(() => this.routeCtx.layerId())}-progress-layer`;
      if (!map || !map.getLayer(layerId)) return;
      map.setPaintProperty(layerId, 'line-color', color);
      map.setPaintProperty(layerId, 'line-width', width);
      map.setPaintProperty(layerId, 'line-opacity', opacity);
      map.setPaintProperty(layerId, 'line-dasharray', da);
    });
  }
}

function toGeoJSON(coords: [number, number][], progress: number, cumulative: readonly number[]) {
  const line = sliceLineByProgress(coords, progress, cumulative);
  // A LineString needs two positions; before that there is nothing to draw.
  return {
    type: 'FeatureCollection' as const,
    features:
      line.length < 2
        ? []
        : [
            {
              type: 'Feature' as const,
              geometry: { type: 'LineString' as const, coordinates: line },
              properties: {},
            },
          ],
  };
}
