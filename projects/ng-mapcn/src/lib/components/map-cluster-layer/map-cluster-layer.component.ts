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
import { type GeoJSONSource, type MapGeoJSONFeature, type MapMouseEvent } from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { nextId } from '../../utils/map-utils';

export interface ClusterPointClickEvent {
  feature: GeoJSON.Feature<GeoJSON.Point>;
  coordinates: [number, number];
}

export interface ClusterClickEvent {
  clusterId: number;
  coordinates: [number, number];
  pointCount: number;
}

const DEFAULT_CLUSTER_COLORS: [string, string, string] = ['#22c55e', '#eab308', '#ef4444'];
const DEFAULT_CLUSTER_THRESHOLDS: [number, number] = [100, 750];

/**
 * Clustered point layer: cluster circles colored/sized by point count, a count
 * label, and unclustered point dots. Clicking a cluster zooms to its expansion
 * zoom by default (disable via `zoomOnClusterClick`).
 */
@Component({
  selector: 'ng-map-cluster-layer',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapClusterLayerComponent {
  /** GeoJSON FeatureCollection of points, or a URL to fetch GeoJSON from. */
  readonly data = input.required<string | GeoJSON.FeatureCollection<GeoJSON.Point>>();
  /** Maximum zoom level to cluster points on. */
  readonly clusterMaxZoom = input(14);
  /** Radius of each cluster in pixels. */
  readonly clusterRadius = input(50);
  /** Colors for cluster circles: [small, medium, large] based on point count. */
  readonly clusterColors = input<[string, string, string]>(DEFAULT_CLUSTER_COLORS);
  /** Point count thresholds for color/size steps: [medium, large]. */
  readonly clusterThresholds = input<[number, number]>(DEFAULT_CLUSTER_THRESHOLDS);
  /** Color for unclustered individual points. */
  readonly pointColor = input('#3b82f6');
  /** Zoom into a cluster when it is clicked (mapcn default behavior). */
  readonly zoomOnClusterClick = input(true);

  readonly pointClick = output<ClusterPointClickEvent>();
  readonly clusterClick = output<ClusterClickEvent>();

  private readonly ctx = inject(MapContextService);
  private readonly zone = inject(NgZone);

  private readonly id = nextId('ng-cluster');
  private readonly sourceId = `cluster-source-${this.id}`;
  private readonly clusterLayerId = `clusters-${this.id}`;
  private readonly clusterCountLayerId = `cluster-count-${this.id}`;
  private readonly unclusteredLayerId = `unclustered-point-${this.id}`;
  /** Data currently in the source, so re-runs of the data effect skip a no-op setData. */
  private appliedData: string | GeoJSON.FeatureCollection<GeoJSON.Point> | null = null;

  constructor() {
    // Add source and layers once the map style is loaded; re-runs after theme setStyle.
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      const colors = untracked(() => this.clusterColors());
      const thresholds = untracked(() => this.clusterThresholds());
      const pointColor = untracked(() => this.pointColor());

      const data = untracked(() => this.data());
      this.appliedData = data;
      map.addSource(this.sourceId, {
        type: 'geojson',
        data,
        cluster: true,
        clusterMaxZoom: untracked(() => this.clusterMaxZoom()),
        clusterRadius: untracked(() => this.clusterRadius()),
      });

      map.addLayer({
        id: this.clusterLayerId,
        type: 'circle',
        source: this.sourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': this.clusterColorExpression(colors, thresholds),
          'circle-radius': this.clusterRadiusExpression(thresholds),
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.85,
        },
      });

      map.addLayer({
        id: this.clusterCountLayerId,
        type: 'symbol',
        source: this.sourceId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          // The basemap must provide glyphs for this font — the Carto defaults do.
          'text-font': ['Open Sans'],
          'text-size': 12,
        },
        paint: { 'text-color': '#fff' },
      });

      map.addLayer({
        id: this.unclusteredLayerId,
        type: 'circle',
        source: this.sourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': pointColor,
          'circle-radius': 5,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      const handleClusterClick = (e: MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [this.clusterLayerId],
        });
        if (!features.length) return;

        const feature = features[0];
        const clusterId = feature.properties?.['cluster_id'] as number;
        const pointCount = feature.properties?.['point_count'] as number;
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

        // Map events fire outside the zone — re-enter for outputs
        this.zone.run(() => this.clusterClick.emit({ clusterId, coordinates, pointCount }));

        if (untracked(() => this.zoomOnClusterClick())) {
          const source = map.getSource(this.sourceId) as GeoJSONSource;
          source
            .getClusterExpansionZoom(clusterId)
            .then((zoom) => map.easeTo({ center: coordinates, zoom }))
            // Rejects when the source changed or was removed in the meantime
            .catch(() => {});
        }
      };

      const handlePointClick = (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
        if (!e.features?.length) return;
        const feature = e.features[0];
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [
          number,
          number,
        ];
        // Normalize the longitude across world copies before emitting
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }
        this.zone.run(() =>
          this.pointClick.emit({
            feature: feature as unknown as GeoJSON.Feature<GeoJSON.Point>,
            coordinates,
          }),
        );
      };

      const cursorOn = () => {
        map.getCanvas().style.cursor = 'pointer';
      };
      const cursorOff = () => {
        map.getCanvas().style.cursor = '';
      };

      map.on('click', this.clusterLayerId, handleClusterClick);
      map.on('click', this.unclusteredLayerId, handlePointClick);
      map.on('mouseenter', this.clusterLayerId, cursorOn);
      map.on('mouseleave', this.clusterLayerId, cursorOff);
      map.on('mouseenter', this.unclusteredLayerId, cursorOn);
      map.on('mouseleave', this.unclusteredLayerId, cursorOff);

      onCleanup(() => {
        map.off('click', this.clusterLayerId, handleClusterClick);
        map.off('click', this.unclusteredLayerId, handlePointClick);
        map.off('mouseenter', this.clusterLayerId, cursorOn);
        map.off('mouseleave', this.clusterLayerId, cursorOff);
        map.off('mouseenter', this.unclusteredLayerId, cursorOn);
        map.off('mouseleave', this.unclusteredLayerId, cursorOff);
        for (const id of [this.clusterCountLayerId, this.unclusteredLayerId, this.clusterLayerId]) {
          try {
            if (map.getLayer(id)) map.removeLayer(id);
          } catch {}
        }
        try {
          if (map.getSource(this.sourceId)) map.removeSource(this.sourceId);
        } catch {}
      });
    });

    // Update source data reactively (only for non-URL data)
    effect(() => {
      const data = this.data();
      if (typeof data === 'string') return;
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;
      const source = map.getSource(this.sourceId) as GeoJSONSource | undefined;
      // Skip what the source was just created with (load / theme switch re-runs this effect)
      if (!source || data === this.appliedData) return;
      source.setData(data);
      this.appliedData = data;
    });

    // Update layer paint when style props change
    effect(() => {
      const colors = this.clusterColors();
      const thresholds = this.clusterThresholds();
      const pointColor = this.pointColor();
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      if (map.getLayer(this.clusterLayerId)) {
        map.setPaintProperty(
          this.clusterLayerId,
          'circle-color',
          this.clusterColorExpression(colors, thresholds),
        );
        map.setPaintProperty(
          this.clusterLayerId,
          'circle-radius',
          this.clusterRadiusExpression(thresholds),
        );
      }
      if (map.getLayer(this.unclusteredLayerId)) {
        map.setPaintProperty(this.unclusteredLayerId, 'circle-color', pointColor);
      }
    });
  }

  private clusterColorExpression(colors: [string, string, string], thresholds: [number, number]) {
    return [
      'step',
      ['get', 'point_count'],
      colors[0],
      thresholds[0],
      colors[1],
      thresholds[1],
      colors[2],
    ] as never;
  }

  private clusterRadiusExpression(thresholds: [number, number]) {
    return ['step', ['get', 'point_count'], 20, thresholds[0], 30, thresholds[1], 40] as never;
  }
}
