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
  readonly id = input<string | undefined>(undefined);
  readonly color = input('#4285F4');
  readonly width = input(3);
  readonly opacity = input(0.8);
  readonly dashArray = input<[number, number] | undefined>(undefined);
  readonly interactive = input(true);

  readonly routeClick = output<MapMouseEvent>();

  private readonly ctx = inject(MapContextService);
  private readonly zone = inject(NgZone);

  private readonly autoId = nextId('ng-route');
  private readonly sourceId = computed(() => this.id() ?? this.autoId);
  private readonly layerId = computed(() => `${this.sourceId()}-layer`);

  constructor() {
    // Add source + layer once the map style is loaded
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      const coords = untracked(() => this.coordinates());
      const color = untracked(() => this.color());
      const width = untracked(() => this.width());
      const opacity = untracked(() => this.opacity());
      const da = untracked(() => this.dashArray());
      const interactive = untracked(() => this.interactive());
      const sourceId = untracked(() => this.sourceId());
      const layerId = untracked(() => this.layerId());

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

      // Map events fire outside the zone (map is created there) — re-enter for outputs
      const handleClick = (e: MapMouseEvent) => this.zone.run(() => this.routeClick.emit(e));
      const handleMouseEnter = () => {
        map.getCanvas().style.cursor = 'pointer';
      };
      const handleMouseLeave = () => {
        map.getCanvas().style.cursor = '';
      };
      if (interactive) {
        map.on('click', layerId, handleClick);
        map.on('mouseenter', layerId, handleMouseEnter);
        map.on('mouseleave', layerId, handleMouseLeave);
      }

      onCleanup(() => {
        if (interactive) {
          map.off('click', layerId, handleClick);
          map.off('mouseenter', layerId, handleMouseEnter);
          map.off('mouseleave', layerId, handleMouseLeave);
        }
        try {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
        } catch {}
        try {
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        } catch {}
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
