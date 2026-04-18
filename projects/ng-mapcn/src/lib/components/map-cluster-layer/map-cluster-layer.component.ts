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

export interface ClusterFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Record<string, unknown>;
}

@Component({
  selector: 'ng-map-cluster-layer',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapClusterLayerComponent {
  readonly features = input.required<ClusterFeature[]>();
  readonly clusterColor = input('#4285F4');
  readonly textColor = input('#ffffff');
  readonly maxZoom = input(14);

  readonly clusterClick = output<{ center: [number, number]; zoom: number }>();
  readonly featureClick = output<ClusterFeature>();

  private readonly ctx = inject(MapContextService);

  private readonly srcId = `ng-cluster-${Math.random().toString(36).slice(2, 9)}`;
  private readonly layerCircle = `${this.srcId}-circle`;
  private readonly layerCount = `${this.srcId}-count`;
  private readonly layerUnclustered = `${this.srcId}-unclustered`;

  constructor() {
    // Add all layers when the map style is loaded
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      const color = untracked(() => this.clusterColor());
      const textColor = untracked(() => this.textColor());
      const clusterMaxZoom = untracked(() => this.maxZoom());
      const features = untracked(() => this.features());

      map.addSource(this.srcId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
        cluster: true,
        clusterMaxZoom,
        clusterRadius: 50,
      });

      // Cluster circles — size scales with count
      map.addLayer({
        id: this.layerCircle,
        type: 'circle',
        source: this.srcId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step', ['get', 'point_count'],
            color,
            10, color,
            30, color,
          ],
          'circle-radius': [
            'step', ['get', 'point_count'],
            18,
            10, 24,
            30, 30,
          ],
          'circle-opacity': 0.85,
        },
      });

      // Cluster count labels
      map.addLayer({
        id: this.layerCount,
        type: 'symbol',
        source: this.srcId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 13,
        },
        paint: { 'text-color': textColor },
      });

      // Unclustered single-point dots
      map.addLayer({
        id: this.layerUnclustered,
        type: 'circle',
        source: this.srcId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': color,
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      // Cluster click → zoom in
      map.on('click', this.layerCircle, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [this.layerCircle] });
        if (!features.length) return;
        const src = map.getSource(this.srcId) as GeoJSONSource;
        const clusterId = (features[0].properties as { cluster_id: number }).cluster_id;
        src.getClusterExpansionZoom(clusterId).then((zoom) => {
          const geom = features[0].geometry as GeoJSON.Point;
          const center: [number, number] = [geom.coordinates[0], geom.coordinates[1]];
          map.flyTo({ center, zoom, duration: 500 });
          this.clusterClick.emit({ center, zoom });
        });
      });

      // Individual point click
      map.on('click', this.layerUnclustered, (e: MapMouseEvent) => {
        const f = map.queryRenderedFeatures(e.point, { layers: [this.layerUnclustered] });
        if (f.length) this.featureClick.emit(f[0] as unknown as ClusterFeature);
      });

      // Pointer cursors
      map.on('mouseenter', this.layerCircle, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', this.layerCircle, () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', this.layerUnclustered, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', this.layerUnclustered, () => { map.getCanvas().style.cursor = ''; });

      onCleanup(() => {
        for (const id of [this.layerCount, this.layerCircle, this.layerUnclustered]) {
          try { if (map.getLayer(id)) map.removeLayer(id); } catch {}
        }
        try { if (map.getSource(this.srcId)) map.removeSource(this.srcId); } catch {}
      });
    });

    // Update features reactively via setData
    effect(() => {
      const features = this.features(); // always tracked
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;
      const src = map.getSource(this.srcId) as GeoJSONSource | undefined;
      if (!src) return;
      src.setData({ type: 'FeatureCollection', features });
    });
  }
}
