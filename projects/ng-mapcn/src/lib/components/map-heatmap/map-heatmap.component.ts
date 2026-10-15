import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import type * as GeoJSON from 'geojson';
import {
  type AddLayerObject,
  type GeoJSONSource,
  type HeatmapLayerSpecification,
} from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { geoJsonBounds } from '../../utils/bounds';
import { syncLayerProperties } from '../../utils/layer-properties';
import { addMapLayers } from '../../utils/layers';
import { nextId } from '../../utils/map-utils';

/** GeoJSON FeatureCollection of points, or a URL to fetch GeoJSON from. */
export type MapHeatmapData<P = GeoJSON.GeoJsonProperties> =
  string | GeoJSON.FeatureCollection<GeoJSON.Point, P>;

/** Color stops over the normalized heatmap density: `[density 0..1, color]`. */
export type HeatmapGradient = readonly (readonly [number, string])[];

type MapHeatmapPaint = NonNullable<HeatmapLayerSpecification['paint']>;

/** Theme-aware default gradients; stop 0 is transparent so empty areas stay clear. */
export const defaultHeatmapGradients: Record<'light' | 'dark', HeatmapGradient> = {
  light: [
    [0, 'rgba(59,130,246,0)'],
    [0.2, '#bfdbfe'],
    [0.4, '#60a5fa'],
    [0.6, '#f59e0b'],
    [0.8, '#ef4444'],
    [1, '#b91c1c'],
  ],
  dark: [
    [0, 'rgba(59,130,246,0)'],
    [0.2, '#1e3a8a'],
    [0.4, '#3b82f6'],
    [0.6, '#f59e0b'],
    [0.8, '#f97316'],
    [1, '#fef08a'],
  ],
};

/**
 * Builds the `heatmap-color` expression from gradient stops: sorted ascending, with a
 * transparent stop at density 0 prepended when the gradient does not start there (so empty
 * areas stay clear). An empty gradient falls back to the theme default.
 */
export function heatmapColorExpression(
  stops: HeatmapGradient,
  theme: 'light' | 'dark' = 'light',
): unknown[] {
  const sorted = [...(stops.length ? stops : defaultHeatmapGradients[theme])].sort(
    (a, b) => a[0] - b[0],
  );
  if (sorted[0][0] > 0) sorted.unshift([0, 'rgba(0, 0, 0, 0)']);
  return ['interpolate', ['linear'], ['heatmap-density'], ...sorted.flat()];
}

/**
 * Declarative heatmap layer: a GeoJSON point source rendered as a MapLibre `heatmap` layer with
 * a theme-aware default gradient. Drop it inside `<ng-map>`.
 *
 * Generic over the feature properties `P`, inferred from `data`.
 *
 * Source and layer ids derive from `id` (auto-generated when omitted), so they can be targeted
 * with `beforeId`, `queryRenderedFeatures` or custom layers:
 * - source: `heatmap-source-<id>`
 * - layer: `heatmap-layer-<id>`
 *
 * `beforeId` is applied at layer creation only; later changes are ignored. `maxZoom` is the zoom
 * from which the heatmap is no longer rendered (MapLibre `maxzoom` is exclusive), which lets a
 * point layer take over when zoomed in. `radius`, `intensity` and `opacity` accept MapLibre
 * expressions (e.g. `['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20]`).
 */
@Component({
  selector: 'ng-map-heatmap',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class MapHeatmapComponent<P extends Record<string, any> = Record<string, unknown>> {
  /** GeoJSON FeatureCollection of points, or a URL to fetch GeoJSON from. */
  readonly data = input.required<MapHeatmapData<P | null>>();
  /**
   * Optional unique identifier prefix for the source/layer. Auto-generated if not provided.
   * Changing it re-creates the source and layer.
   */
  readonly id = input<string>();
  /**
   * Optional MapLibre layer id to insert the layer before (z-order control).
   * Applied at layer creation only; later changes are ignored.
   */
  readonly beforeId = input<string>();
  /** Feature property used as the point weight. Without it every point weighs the same. */
  readonly weightProperty = input<string>();
  /** `[min, max]` of `weightProperty`, mapped linearly to a weight of 0..1. */
  readonly weightRange = input<readonly [number, number]>([0, 1]);
  /** Influence radius of each point in pixels (number or MapLibre expression). */
  readonly radius = input<number | readonly unknown[]>(30);
  /** Global intensity multiplier (number or MapLibre expression). */
  readonly intensity = input<number | readonly unknown[]>(1);
  /** Layer opacity (number or MapLibre expression). */
  readonly opacity = input<number | readonly unknown[]>(1);
  /** Color ramp over the heatmap density. Defaults to a theme-aware gradient. */
  readonly gradient = input<HeatmapGradient>();
  /** Minimum zoom level at which the heatmap is rendered. */
  readonly minZoom = input(0);
  /** Zoom level from which the heatmap is no longer rendered. */
  readonly maxZoom = input(24);
  /** Escape hatch: heatmap paint properties merged last, over everything above. */
  readonly paint = input<MapHeatmapPaint>();

  private readonly ctx = inject(MapContextService);

  private readonly autoId = nextId('ng-heatmap');
  private readonly resolvedId = computed(() => this.id() ?? this.autoId);
  private readonly sourceId = computed(() => `heatmap-source-${this.resolvedId()}`);
  private readonly layerId = computed(() => `heatmap-layer-${this.resolvedId()}`);

  /** Data currently in the source, so re-runs of the data effect skip a no-op setData. */
  private appliedData: MapHeatmapData<P | null> | null = null;
  /** Whether this component's own source and layer exist; gates the sync effects. */
  private readonly created = signal(false);
  private appliedPaintKeys: ReadonlySet<string> = new Set();
  private appliedZoomRange: readonly [number, number] | null = null;

  private readonly mergedPaint = computed<MapHeatmapPaint>(() => {
    const property = this.weightProperty();
    const [min, max] = this.weightRange();
    const theme = this.ctx.resolvedTheme();
    return {
      'heatmap-color': heatmapColorExpression(
        this.gradient() ?? defaultHeatmapGradients[theme],
        theme,
      ),
      ...(property
        ? {
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['coalesce', ['to-number', ['get', property]], 0],
              min,
              0,
              max,
              1,
            ],
          }
        : {}),
      'heatmap-radius': this.radius(),
      'heatmap-intensity': this.intensity(),
      'heatmap-opacity': this.opacity(),
      ...(this.paint() ?? {}),
    } as MapHeatmapPaint;
  });

  constructor() {
    // Contributes to the map's declarative fit-to-bounds (`<ng-map [fitBounds]>`).
    inject(DestroyRef).onDestroy(
      this.ctx.registerBounds(() => geoJsonBounds(this.data() as GeoJSON.GeoJSON | string)),
    );

    // Add source and layer once the style is loaded; re-runs after theme setStyle.
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      const sourceId = this.sourceId();
      const layerId = this.layerId();
      const data = untracked(() => this.data());
      const beforeId = untracked(() => this.beforeId());
      const paint = untracked(() => this.mergedPaint());
      const zoomRange: readonly [number, number] = untracked(() => [
        this.minZoom(),
        this.maxZoom(),
      ]);

      const teardown = addMapLayers(
        map,
        (b) => {
          b.addSource(sourceId, { type: 'geojson', data: data as never });
          b.addLayer(
            {
              id: layerId,
              type: 'heatmap',
              source: sourceId,
              minzoom: zoomRange[0],
              maxzoom: zoomRange[1],
              paint,
            } as AddLayerObject,
            beforeId,
          );
        },
        (error) => this.ctx.reportError(error),
      );
      if (!teardown) return;
      this.appliedData = data;
      this.appliedPaintKeys = new Set(Object.keys(paint));
      this.appliedZoomRange = zoomRange;
      this.created.set(true);

      onCleanup(() => {
        this.created.set(false);
        teardown();
      });
    });

    // Update source data reactively; skips what the source was just created with.
    effect(() => {
      const data = this.data();
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map) return;
      const source = map.getSource(this.sourceId()) as GeoJSONSource | undefined;
      if (!source || data === this.appliedData) return;
      source.setData(data as never);
      this.appliedData = data;
    });

    // Reconcile paint properties.
    effect(() => {
      const paint = this.mergedPaint();
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map || !map.getLayer(this.layerId())) return;
      this.appliedPaintKeys = syncLayerProperties(
        map,
        this.layerId(),
        'paint',
        paint as Record<string, unknown>,
        this.appliedPaintKeys,
      );
    });

    // Reconcile the zoom range, only when it really changed.
    effect(() => {
      const minZoom = this.minZoom();
      const maxZoom = this.maxZoom();
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map || !map.getLayer(this.layerId())) return;
      const applied = this.appliedZoomRange;
      if (applied?.[0] === minZoom && applied[1] === maxZoom) return;
      map.setLayerZoomRange(this.layerId(), minZoom, maxZoom);
      this.appliedZoomRange = [minZoom, maxZoom];
    });
  }
}
