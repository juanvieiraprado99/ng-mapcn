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
import {
  type FillLayerSpecification,
  type GeoJSONSource,
  type LineLayerSpecification,
  type MapLayerMouseEvent,
} from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { type MapGeoJSONEvent, mergeHoverPaint, nextId } from '../../utils/map-utils';

export type MapGeoJSONData =
  GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Geometry | string;

type MapFillPaint = NonNullable<FillLayerSpecification['paint']>;
type MapLinePaint = NonNullable<LineLayerSpecification['paint']>;

// Monochrome defaults: a neutral-gray fill with a fixed near-surface line for
// thin separators. Hardcoded (not theme tokens), tuned for a typical
// light/dark surface. Override via `fillPaint` / `linePaint`.
const GEOJSON_DEFAULT_COLORS: Record<'light' | 'dark', { fill: string; line: string }> = {
  light: { fill: '#d4d4d4', line: '#ffffff' },
  dark: { fill: '#404040', line: '#171717' },
};

/**
 * Renders arbitrary GeoJSON as fill + outline layers on the map. Composes like
 * `ng-map-route` / `ng-map-arc` — drop it inside `<ng-map>` (typically with
 * `blank`) for choropleths and region/data maps.
 */
@Component({
  selector: 'ng-map-geojson',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapGeoJSONComponent {
  /** GeoJSON data (FeatureCollection, Feature, Geometry) or a URL to fetch it from. */
  readonly data = input.required<MapGeoJSONData>();
  /** Optional unique identifier prefix for the source/layers. Auto-generated if not provided. */
  readonly id = input<string>();
  /**
   * Feature property to promote to the feature `id`. Required for hover
   * feature-state (`fillHoverPaint`) and stable hover/click payloads.
   */
  readonly promoteId = input<string>();
  /** Paint for the fill layer; merged onto theme defaults. `false` omits the layer. */
  readonly fillPaint = input<MapFillPaint | false>();
  /** Paint for the outline layer; merged onto a hairline default. `false` omits the layer. */
  readonly linePaint = input<MapLinePaint | false>();
  /** Paint applied to the hovered feature via feature-state. Requires `promoteId`. */
  readonly fillHoverPaint = input<MapFillPaint>();
  /** Whether features respond to mouse events. */
  readonly interactive = input(false);
  /**
   * Optional MapLibre layer id to insert the layers before (z-order control).
   * Applied at layer creation only — later changes are ignored (mapcn parity).
   */
  readonly beforeId = input<string>();

  readonly featureClick = output<MapGeoJSONEvent>();
  readonly featureHover = output<MapGeoJSONEvent | null>();

  private readonly ctx = inject(MapContextService);
  private readonly zone = inject(NgZone);

  private readonly autoId = nextId('ng-geojson');
  private readonly resolvedId = computed(() => this.id() ?? this.autoId);
  private readonly sourceId = computed(() => `geojson-source-${this.resolvedId()}`);
  private readonly fillLayerId = computed(() => `geojson-fill-${this.resolvedId()}`);
  private readonly lineLayerId = computed(() => `geojson-line-${this.resolvedId()}`);
  /** Bumped every time the source is (re)created, so the layer effect re-adds its layers. */
  private readonly sourceRevision = signal(0);
  /** Data currently in the source, so re-runs of the data effect skip a no-op setData. */
  private appliedData: MapGeoJSONData | null = null;

  private readonly mergedFillPaint = computed<MapFillPaint>(() => {
    const defaults = GEOJSON_DEFAULT_COLORS[this.ctx.resolvedTheme()];
    return mergeHoverPaint(
      { 'fill-color': defaults.fill, ...(this.fillPaint() || {}) },
      this.fillHoverPaint(),
    );
  });
  private readonly mergedLinePaint = computed<MapLinePaint>(() => {
    const defaults = GEOJSON_DEFAULT_COLORS[this.ctx.resolvedTheme()];
    return {
      'line-color': defaults.line,
      'line-width': 0.5,
      ...(this.linePaint() || {}),
    };
  });

  constructor() {
    // Add source once the map style is loaded; re-runs after theme setStyle.
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      const sourceId = this.sourceId();
      const fillLayerId = this.fillLayerId();
      const lineLayerId = this.lineLayerId();
      const promoteId = this.promoteId();

      const data = untracked(() => this.data());
      map.addSource(sourceId, {
        type: 'geojson',
        // Untracked: data changes go through setData below, never a source re-create.
        data: data as never,
        ...(promoteId ? { promoteId } : {}),
      });
      this.appliedData = data;
      // The cleanup of a previous run removed the layers with the old source.
      this.sourceRevision.update((r) => r + 1);

      onCleanup(() => {
        try {
          if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
          if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        } catch {
          // style may be mid-reload
        }
      });
    });

    // Sync data when it changes.
    effect(() => {
      const data = this.data();
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;
      const source = map.getSource(this.sourceId()) as GeoJSONSource | undefined;
      // Skip what the source was just created with — a URL would be fetched twice.
      if (!source || data === this.appliedData) return;
      source.setData(data as never);
      this.appliedData = data;
    });

    // Sync layers and paint when visibility or styling changes.
    effect(() => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      this.sourceRevision();
      const sourceId = this.sourceId();
      if (!map.getSource(sourceId)) return;

      const fillLayerId = this.fillLayerId();
      const lineLayerId = this.lineLayerId();
      const showFill = this.fillPaint() !== false;
      const showLine = this.linePaint() !== false;
      const mergedFillPaint = this.mergedFillPaint();
      const mergedLinePaint = this.mergedLinePaint();
      const beforeId = this.beforeId();

      if (showFill && !map.getLayer(fillLayerId)) {
        map.addLayer(
          { id: fillLayerId, type: 'fill', source: sourceId, paint: mergedFillPaint },
          beforeId,
        );
      } else if (!showFill && map.getLayer(fillLayerId)) {
        map.removeLayer(fillLayerId);
      }

      if (showLine && !map.getLayer(lineLayerId)) {
        map.addLayer(
          { id: lineLayerId, type: 'line', source: sourceId, paint: mergedLinePaint },
          beforeId,
        );
      } else if (!showLine && map.getLayer(lineLayerId)) {
        map.removeLayer(lineLayerId);
      }

      if (showFill && map.getLayer(fillLayerId)) {
        for (const [key, value] of Object.entries(mergedFillPaint)) {
          map.setPaintProperty(fillLayerId, key as keyof MapFillPaint, value as never);
        }
      }
      if (showLine && map.getLayer(lineLayerId)) {
        for (const [key, value] of Object.entries(mergedLinePaint)) {
          map.setPaintProperty(lineLayerId, key as keyof MapLinePaint, value as never);
        }
      }
    });

    // Interaction handlers (bound to the fill layer).
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;
      if (!this.interactive() || this.fillPaint() === false) return;

      const sourceId = this.sourceId();
      const fillLayerId = this.fillLayerId();
      let hoveredId: string | number | null = null;
      // Features without an id (no promoteId) cannot be told apart: hover is reported once on
      // enter instead of on every mousemove.
      let hovering = false;

      const setHover = (next: string | number | null) => {
        if (next === hoveredId) return;
        const sourceExists = !!map.getSource(sourceId);
        if (hoveredId != null && sourceExists) {
          map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
        }
        hoveredId = next;
        if (next != null && sourceExists) {
          map.setFeatureState({ source: sourceId, id: next }, { hover: true });
        }
      };

      const toEvent = (
        feature: NonNullable<MapLayerMouseEvent['features']>[number],
        e: MapLayerMouseEvent,
      ): MapGeoJSONEvent => ({
        feature: feature as unknown as MapGeoJSONEvent['feature'],
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        originalEvent: e,
      });

      const handleMouseMove = (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        map.getCanvas().style.cursor = 'pointer';
        const id = feature.id ?? null;
        if (hovering && id === hoveredId) return;
        hovering = true;
        setHover(id);
        // Map events fire outside the zone — re-enter for outputs
        this.zone.run(() => this.featureHover.emit(toEvent(feature, e)));
      };

      const handleMouseLeave = () => {
        hovering = false;
        setHover(null);
        map.getCanvas().style.cursor = '';
        this.zone.run(() => this.featureHover.emit(null));
      };

      const handleClick = (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        this.zone.run(() => this.featureClick.emit(toEvent(feature, e)));
      };

      map.on('mousemove', fillLayerId, handleMouseMove);
      map.on('mouseleave', fillLayerId, handleMouseLeave);
      map.on('click', fillLayerId, handleClick);

      onCleanup(() => {
        map.off('mousemove', fillLayerId, handleMouseMove);
        map.off('mouseleave', fillLayerId, handleMouseLeave);
        map.off('click', fillLayerId, handleClick);
        try {
          setHover(null);
          map.getCanvas().style.cursor = '';
        } catch {
          // map may be mid-teardown
        }
      });
    });
  }
}
