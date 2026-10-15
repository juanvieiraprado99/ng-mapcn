import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  NgZone,
  output,
  signal,
  untracked,
} from '@angular/core';
import { type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { addMapLayers } from '../../utils/layers';
import { nextId } from '../../utils/map-utils';
import { RouteContextService } from './route-context.service';

@Component({
  selector: 'ng-map-route',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RouteContextService],
})
export class MapRouteComponent {
  readonly coordinates = input.required<[number, number][]>();
  /** Optional unique identifier prefix for the source/layer. Auto-generated if not provided. */
  readonly id = input<string>();
  readonly color = input('#4285F4');
  readonly width = input(3);
  readonly opacity = input(0.8);
  readonly dashArray = input<[number, number]>();
  readonly interactive = input(true);
  /** Id of an existing layer to insert the route (and its progress line) below. Applied at creation only. */
  readonly beforeId = input<string>();
  /** Covered fraction of the route (0-1), drawn by a child `<ng-route-progress>`. */
  readonly progress = input<number>();
  /** Highlights the route: the `active*` inputs override the base paint while true. */
  readonly active = input(false);
  readonly activeColor = input<string>();
  readonly activeWidth = input<number>();
  readonly activeOpacity = input<number>();
  readonly activeDashArray = input<[number, number]>();

  readonly routeClick = output<MapMouseEvent>();
  readonly routeMouseEnter = output<MapMouseEvent>();
  readonly routeMouseLeave = output<MapMouseEvent>();

  private readonly ctx = inject(MapContextService);
  private readonly zone = inject(NgZone);
  private readonly routeCtx = inject(RouteContextService);

  private readonly autoId = nextId('ng-route');
  private readonly sourceId = computed(() => this.id() ?? this.autoId);
  private readonly layerId = computed(() => `${this.sourceId()}-layer`);
  /** Coordinates currently in the source, so re-runs of the data effect skip a no-op setData. */
  private appliedCoords: [number, number][] | null = null;
  /**
   * Whether this component's own source and layer exist. Gates the sync effects: after a failed
   * creation (e.g. an `id` already in use) they must not touch the source/layer of another owner.
   */
  private readonly created = signal(false);

  private readonly paint = computed(() => {
    const active = this.active();
    return {
      color: (active ? this.activeColor() : undefined) ?? this.color(),
      width: (active ? this.activeWidth() : undefined) ?? this.width(),
      opacity: (active ? this.activeOpacity() : undefined) ?? this.opacity(),
      dashArray: (active ? this.activeDashArray() : undefined) ?? this.dashArray(),
    };
  });

  constructor() {
    // Share the signals themselves with the children (ng-route-progress / ng-route-marker).
    const width = computed(() => this.paint().width);
    this.routeCtx.connect({
      coordinates: this.coordinates,
      progress: this.progress,
      layerId: this.layerId,
      beforeId: this.beforeId,
      created: this.created.asReadonly(),
      width,
    });

    // Add source + layer once the map style is loaded; re-runs after theme setStyle
    // and when [id] changes (the cleanup removes the old ids).
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      const sourceId = this.sourceId();
      const layerId = this.layerId();
      const coords = untracked(() => this.coordinates());
      const { color, width, opacity, dashArray: da } = untracked(() => this.paint());
      const beforeId = untracked(() => this.beforeId());

      const teardown = addMapLayers(
        map,
        (b) => {
          b.addSource(sourceId, { type: 'geojson', data: this.toGeoJSON(coords) });
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
        (error) => this.ctx.reportError(error),
      );
      if (!teardown) return;
      this.appliedCoords = coords;
      this.created.set(true);

      onCleanup(() => {
        this.created.set(false);
        teardown();
      });
    });

    // Interaction handlers — toggling [interactive] rebinds them without touching the layer.
    effect((onCleanup) => {
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map || !this.interactive()) return;
      const layerId = this.layerId();

      // Map events fire outside the zone (map is created there) — re-enter for outputs
      const handleClick = (e: MapMouseEvent) => this.zone.run(() => this.routeClick.emit(e));
      const handleMouseEnter = (e: MapMouseEvent) => {
        map.getCanvas().style.cursor = 'pointer';
        this.zone.run(() => this.routeMouseEnter.emit(e));
      };
      const handleMouseLeave = (e: MapMouseEvent) => {
        map.getCanvas().style.cursor = '';
        this.zone.run(() => this.routeMouseLeave.emit(e));
      };
      map.on('click', layerId, handleClick);
      map.on('mouseenter', layerId, handleMouseEnter);
      map.on('mouseleave', layerId, handleMouseLeave);

      onCleanup(() => {
        map.off('click', layerId, handleClick);
        map.off('mouseenter', layerId, handleMouseEnter);
        map.off('mouseleave', layerId, handleMouseLeave);
        try {
          map.getCanvas().style.cursor = '';
        } catch {
          // map may be mid-teardown
        }
      });
    });

    // Update GeoJSON data when coordinates change (no flicker)
    effect(() => {
      const coords = this.coordinates(); // always tracked
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map) return;
      const source = map.getSource(this.sourceId()) as GeoJSONSource | undefined;
      // Skip what the source was just created with (load / theme switch re-runs this effect)
      if (!source || coords === this.appliedCoords) return;
      source.setData(this.toGeoJSON(coords));
      this.appliedCoords = coords;
    });

    // Update paint properties reactively
    effect(() => {
      const { color, width, opacity, dashArray: da } = this.paint();
      if (!this.created()) return;
      const map = this.ctx.map();
      const layerId = this.layerId();
      if (!map || !map.getLayer(layerId)) return;
      map.setPaintProperty(layerId, 'line-color', color);
      map.setPaintProperty(layerId, 'line-width', width);
      map.setPaintProperty(layerId, 'line-opacity', opacity);
      // Unconditional (mapcn parity): undefined clears the dash pattern
      map.setPaintProperty(layerId, 'line-dasharray', da);
    });
  }

  private toGeoJSON(coords: [number, number][]) {
    return {
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: coords },
      properties: {},
    };
  }
}
