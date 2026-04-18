import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { GeoJSONSource, MapMouseEvent } from 'maplibre-gl';
import { MapContextService } from '../../services/map-context.service';

@Component({
  selector: 'ng-map-route',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapRouteComponent {
  readonly coordinates = input.required<[number, number][]>();
  readonly color = input('#4285F4');
  readonly width = input(3);
  readonly opacity = input(0.8);
  readonly dashArray = input<[number, number] | undefined>(undefined);
  readonly interactive = input(true);

  readonly routeClick = output<MapMouseEvent>();

  private readonly ctx = inject(MapContextService);

  private readonly sourceId = `ng-route-${Math.random().toString(36).slice(2, 9)}`;
  private readonly layerId = `${this.sourceId}-layer`;

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

      map.addSource(this.sourceId, {
        type: 'geojson',
        data: this.toGeoJSON(coords),
      });

      map.addLayer({
        id: this.layerId,
        type: 'line',
        source: this.sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': color,
          'line-width': width,
          'line-opacity': opacity,
          ...(da ? { 'line-dasharray': da } : {}),
        },
      });

      if (interactive) {
        map.on('click', this.layerId, (e) => this.routeClick.emit(e));
        map.on('mouseenter', this.layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', this.layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      }

      onCleanup(() => {
        try {
          if (map.getLayer(this.layerId)) map.removeLayer(this.layerId);
        } catch {}
        try {
          if (map.getSource(this.sourceId)) map.removeSource(this.sourceId);
        } catch {}
      });
    });

    // Update GeoJSON data when coordinates change (no flicker)
    effect(() => {
      const coords = this.coordinates(); // always tracked
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;
      const source = map.getSource(this.sourceId) as GeoJSONSource | undefined;
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
      if (!map || !map.getLayer(this.layerId)) return;
      map.setPaintProperty(this.layerId, 'line-color', color);
      map.setPaintProperty(this.layerId, 'line-width', width);
      map.setPaintProperty(this.layerId, 'line-opacity', opacity);
      if (da) map.setPaintProperty(this.layerId, 'line-dasharray', da);
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
