import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  NgZone,
  output,
  signal,
  untracked,
} from '@angular/core';
import type * as GeoJSON from 'geojson';
import {
  type GeoJSONSource,
  type Map as MapLibreMap,
  type MapGeoJSONFeature,
  type MapMouseEvent,
} from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { geoJsonBounds } from '../../utils/bounds';
import { addMapLayers } from '../../utils/layers';
import { nextId } from '../../utils/map-utils';

export interface ClusterPointClickEvent<P = Record<string, unknown>> {
  feature: GeoJSON.Feature<GeoJSON.Point, P>;
  coordinates: [number, number];
}

export interface ClusterClickEvent {
  clusterId: number;
  coordinates: [number, number];
  pointCount: number;
}

const DEFAULT_CLUSTER_COLORS: [string, string, string] = ['#22c55e', '#eab308', '#ef4444'];
const DEFAULT_CLUSTER_THRESHOLDS: [number, number] = [100, 750];
/** Served by the Carto (default), OpenFreeMap and MapTiler glyph servers. */
const FALLBACK_TEXT_FONT = ['Noto Sans Regular'];

/**
 * Font stack for the count labels. Glyph servers only serve their own fonts (Carto has no
 * "Open Sans", Stadia only "Stadia *"), so reuse the first literal `text-font` of the
 * basemap's own symbol layers, which its `glyphs` server is known to serve. Upright stacks win
 * over italic ones (water labels usually come first).
 */
function basemapTextFont(map: MapLibreMap): string[] {
  let italic: string[] | null = null;
  for (const layer of map.getStyle()?.layers ?? []) {
    if (layer.type !== 'symbol') continue;
    const font = fontStack(layer.layout?.['text-font']);
    if (!font) continue;
    if (!/italic/i.test(font[0])) return font;
    italic ??= font;
  }
  return italic ?? FALLBACK_TEXT_FONT;
}

/** A literal font stack (`[...]` or `['literal', [...]]`); data-driven expressions return null. */
function fontStack(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value[0] === 'literal') return fontStack(value[1]);
  if (!value.every((f) => typeof f === 'string')) return null;
  // Expressions start with an operator (`get`, `case`, `coalesce`...); font names are capitalized.
  return /^[a-z][a-z-]*$/.test(value[0]) ? null : value;
}

/**
 * Clustered point layer: cluster circles colored/sized by point count, a count
 * label, and unclustered point dots. Clicking a cluster zooms to its expansion
 * zoom by default (disable via `zoomOnClusterClick`).
 *
 * Generic over the feature properties `P`, inferred from `data`
 * (`FeatureCollection<Point, P>`), so `pointClick` carries typed `feature.properties`.
 *
 * Source and layer ids derive from `id` (auto-generated when omitted), so they can be targeted
 * with `beforeId`, `queryRenderedFeatures` or custom layers:
 * - source: `cluster-source-<id>`
 * - cluster circles: `clusters-<id>`
 * - cluster count labels: `cluster-count-<id>`
 * - unclustered points: `unclustered-point-<id>`
 *
 * Default colors are green/yellow/red (`#22c55e`, `#eab308`, `#ef4444`); mapcn uses
 * `['#3b82f6', '#1d4ed8', '#1e3a8a']` — pass those via `clusterColors` for mapcn's look.
 */
@Component({
  selector: 'ng-map-cluster-layer',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class MapClusterLayerComponent<P extends Record<string, any> = Record<string, unknown>> {
  /** GeoJSON FeatureCollection of points, or a URL to fetch GeoJSON from. */
  readonly data = input.required<string | GeoJSON.FeatureCollection<GeoJSON.Point, P | null>>();
  /**
   * Optional unique identifier prefix for the source/layers. Auto-generated if not provided.
   * Changing it re-creates the source and layers.
   */
  readonly id = input<string>();
  /**
   * Optional MapLibre layer id to insert the cluster layers before (z-order control).
   * Applied at layer creation only — later changes are ignored (same as `ng-map-geojson`).
   */
  readonly beforeId = input<string>();
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

  readonly pointClick = output<ClusterPointClickEvent<P>>();
  readonly clusterClick = output<ClusterClickEvent>();

  private readonly ctx = inject(MapContextService);
  private readonly zone = inject(NgZone);

  private readonly autoId = nextId('ng-cluster');
  private readonly resolvedId = computed(() => this.id() ?? this.autoId);
  private readonly sourceId = computed(() => `cluster-source-${this.resolvedId()}`);
  private readonly clusterLayerId = computed(() => `clusters-${this.resolvedId()}`);
  private readonly clusterCountLayerId = computed(() => `cluster-count-${this.resolvedId()}`);
  private warnedNoGlyphs = false;
  private readonly unclusteredLayerId = computed(() => `unclustered-point-${this.resolvedId()}`);
  /** Data currently in the source, so re-runs of the data effect skip a no-op setData. */
  private appliedData: string | GeoJSON.FeatureCollection<GeoJSON.Point, P | null> | null = null;
  /** Whether the source and layers exist; gates the sync effects after a failed creation. */
  private readonly created = signal(false);
  /** Cluster options currently in the source; re-clustering only runs when they really change. */
  private appliedClusterOptions: { clusterRadius: number; clusterMaxZoom: number } | null = null;

  constructor() {
    // Contributes to the map's declarative fit-to-bounds (`<ng-map [fitBounds]>`).
    inject(DestroyRef).onDestroy(this.ctx.registerBounds(() => geoJsonBounds(this.data())));

    // Add source and layers once the map style is loaded; re-runs after theme setStyle.
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      const sourceId = this.sourceId();
      const clusterLayerId = this.clusterLayerId();
      const clusterCountLayerId = this.clusterCountLayerId();
      const unclusteredLayerId = this.unclusteredLayerId();
      const beforeId = untracked(() => this.beforeId());

      const colors = untracked(() => this.clusterColors() ?? DEFAULT_CLUSTER_COLORS);
      const thresholds = untracked(() => this.clusterThresholds() ?? DEFAULT_CLUSTER_THRESHOLDS);
      const pointColor = untracked(() => this.pointColor());

      const data = untracked(() => this.data());
      const clusterOptions = {
        clusterMaxZoom: untracked(() => this.clusterMaxZoom()),
        clusterRadius: untracked(() => this.clusterRadius()),
      };
      const teardown = addMapLayers(
        map,
        (b) => {
          b.addSource(sourceId, { type: 'geojson', data, cluster: true, ...clusterOptions });

          b.addLayer(
            {
              id: clusterLayerId,
              type: 'circle',
              source: sourceId,
              filter: ['has', 'point_count'],
              paint: {
                'circle-color': this.clusterColorExpression(colors, thresholds),
                'circle-radius': this.clusterRadiusExpression(thresholds),
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff',
                'circle-opacity': 0.85,
              },
            },
            beforeId,
          );

          // A text layer needs the style's `glyphs` (the `blank` style has none): MapLibre would
          // reject it with a validation error. The clusters still render, without counts.
          if (map.getStyle()?.glyphs) {
            b.addLayer(
              {
                id: clusterCountLayerId,
                type: 'symbol',
                source: sourceId,
                filter: ['has', 'point_count'],
                layout: {
                  'text-field': '{point_count_abbreviated}',
                  'text-font': basemapTextFont(map),
                  'text-size': 12,
                },
                paint: { 'text-color': '#fff' },
              },
              beforeId,
            );
          } else {
            this.warnNoGlyphs();
          }

          b.addLayer(
            {
              id: unclusteredLayerId,
              type: 'circle',
              source: sourceId,
              filter: ['!', ['has', 'point_count']],
              paint: {
                'circle-color': pointColor,
                'circle-radius': 5,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
              },
            },
            beforeId,
          );
        },
        (error) => this.ctx.reportError(error),
      );
      if (!teardown) return;
      this.appliedData = data;
      this.appliedClusterOptions = clusterOptions;
      this.created.set(true);

      // Layer-scoped handler: MapLibre already queried the clicked features.
      const handleClusterClick = (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
        const feature = e.features?.[0];
        if (!feature) return;

        const clusterId = feature.properties?.['cluster_id'] as number;
        const pointCount = feature.properties?.['point_count'] as number;
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

        // Map events fire outside the zone — re-enter for outputs
        this.zone.run(() => this.clusterClick.emit({ clusterId, coordinates, pointCount }));

        if (untracked(() => this.zoomOnClusterClick())) {
          const source = map.getSource(sourceId) as GeoJSONSource;
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
            feature: feature as unknown as GeoJSON.Feature<GeoJSON.Point, P>,
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

      map.on('click', clusterLayerId, handleClusterClick);
      map.on('click', unclusteredLayerId, handlePointClick);
      map.on('mouseenter', clusterLayerId, cursorOn);
      map.on('mouseleave', clusterLayerId, cursorOff);
      map.on('mouseenter', unclusteredLayerId, cursorOn);
      map.on('mouseleave', unclusteredLayerId, cursorOff);

      onCleanup(() => {
        map.off('click', clusterLayerId, handleClusterClick);
        map.off('click', unclusteredLayerId, handlePointClick);
        map.off('mouseenter', clusterLayerId, cursorOn);
        map.off('mouseleave', clusterLayerId, cursorOff);
        map.off('mouseenter', unclusteredLayerId, cursorOn);
        map.off('mouseleave', unclusteredLayerId, cursorOff);
        this.created.set(false);
        teardown();
      });
    });

    // Update source data reactively — a new URL is fetched again by setData (beyond mapcn, which
    // ignores URL changes; ng-map-geojson behaves the same way).
    effect(() => {
      const data = this.data();
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map) return;
      const source = map.getSource(this.sourceId()) as GeoJSONSource | undefined;
      // Skip what the source was just created with (load / theme switch re-runs this effect)
      if (!source || data === this.appliedData) return;
      source.setData(data);
      this.appliedData = data;
    });

    // Re-cluster when clusterRadius / clusterMaxZoom change (mapcn applies them at creation only).
    // setClusterOptions re-runs the clustering in the worker, so it only runs on a real change —
    // never for the values the source was just created with (load / theme switch).
    effect(() => {
      const clusterRadius = this.clusterRadius();
      const clusterMaxZoom = this.clusterMaxZoom();
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map) return;
      const source = map.getSource(this.sourceId()) as GeoJSONSource | undefined;
      const applied = this.appliedClusterOptions;
      if (
        !source ||
        (applied?.clusterRadius === clusterRadius && applied.clusterMaxZoom === clusterMaxZoom)
      ) {
        return;
      }
      this.appliedClusterOptions = { clusterRadius, clusterMaxZoom };
      // MapLibre assigns `cluster` unconditionally: leaving it out would turn clustering off.
      // Rejects when the source changed or was removed in the meantime.
      source.setClusterOptions({ cluster: true, clusterRadius, clusterMaxZoom }).catch(() => {});
    });

    // Update layer paint when style props change
    effect(() => {
      const colors = this.clusterColors() ?? DEFAULT_CLUSTER_COLORS;
      const thresholds = this.clusterThresholds() ?? DEFAULT_CLUSTER_THRESHOLDS;
      const pointColor = this.pointColor();
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map) return;

      if (map.getLayer(this.clusterLayerId())) {
        map.setPaintProperty(
          this.clusterLayerId(),
          'circle-color',
          this.clusterColorExpression(colors, thresholds),
        );
        map.setPaintProperty(
          this.clusterLayerId(),
          'circle-radius',
          this.clusterRadiusExpression(thresholds),
        );
      }
      if (map.getLayer(this.unclusteredLayerId())) {
        map.setPaintProperty(this.unclusteredLayerId(), 'circle-color', pointColor);
      }
    });
  }

  private warnNoGlyphs(): void {
    if (this.warnedNoGlyphs) return;
    this.warnedNoGlyphs = true;
    console.warn(
      'ng-map-cluster-layer: the map style has no `glyphs` (e.g. the `blank` style), so cluster counts are not shown.',
    );
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
