import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  NgZone,
  output,
  untracked,
} from '@angular/core';
import { type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { nextId } from '../../utils/map-utils';

@Component({
  selector: 'ng-map-route',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  readonly routeClick = output<MapMouseEvent>();

  private readonly ctx = inject(MapContextService);
  private readonly zone = inject(NgZone);

  private readonly autoId = nextId('ng-route');
  private readonly sourceId = computed(() => this.id() ?? this.autoId);
  private readonly layerId = computed(() => `${this.sourceId()}-layer`);

  constructor() {
    // Add source + layer once the map style is loaded; re-runs after theme setStyle
    // and when [id] changes (the cleanup removes the old ids).
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      const sourceId = this.sourceId();
      const layerId = this.layerId();
      const coords = untracked(() => this.coordinates());
      const color = untracked(() => this.color());
      const width = untracked(() => this.width());
      const opacity = untracked(() => this.opacity());
      const da = untracked(() => this.dashArray());

      map.addSource(sourceId, {
        type: 'geojson',
        data: this.toGeoJSON(coords),
      });

      map.addLayer({
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
      });

      onCleanup(() => {
        try {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
        } catch {}
        try {
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        } catch {}
      });
    });

    // Interaction handlers — toggling [interactive] rebinds them without touching the layer.
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map || !this.interactive()) return;
      const layerId = this.layerId();

      // Map events fire outside the zone (map is created there) — re-enter for outputs
      const handleClick = (e: MapMouseEvent) => this.zone.run(() => this.routeClick.emit(e));
      const handleMouseEnter = () => {
        map.getCanvas().style.cursor = 'pointer';
      };
      const handleMouseLeave = () => {
        map.getCanvas().style.cursor = '';
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
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;
      const source = map.getSource(this.sourceId()) as GeoJSONSource | undefined;
      if (!source) return;
      source.setData(this.toGeoJSON(coords));
    });

    // Update paint properties reactively
    effect(() => {
      const color = this.color();
      const width = this.width();
      const opacity = this.opacity();
      const da = this.dashArray();
      if (!this.ctx.isLoaded()) return;
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
