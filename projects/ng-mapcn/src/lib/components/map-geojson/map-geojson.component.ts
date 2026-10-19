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
  type AddLayerObject,
  type FillLayerSpecification,
  type GeoJSONSource,
  type LineLayerSpecification,
  type MapLayerMouseEvent,
} from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { geoJsonBounds } from '../../utils/bounds';
import { syncLayerProperties } from '../../utils/layer-properties';
import { addMapLayers } from '../../utils/layers';
import { type MapGeoJSONEvent, mergeHoverPaint, nextId } from '../../utils/map-utils';

export type MapGeoJSONData<P = GeoJSON.GeoJsonProperties> =
  | GeoJSON.FeatureCollection<GeoJSON.Geometry, P>
  | GeoJSON.Feature<GeoJSON.Geometry, P>
  | GeoJSON.Geometry
  | string;

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
 *
 * Generic over the feature properties `P`, inferred from `data` (e.g.
 * `FeatureCollection<Polygon, P>`), so `featureClick` / `featureHover` carry typed
 * `feature.properties`.
 */
@Component({
  selector: 'ng-map-geojson',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class MapGeoJSONComponent<P extends Record<string, any> = Record<string, unknown>> {
  /** GeoJSON data (FeatureCollection, Feature, Geometry) or a URL to fetch it from. */
  readonly data = input.required<MapGeoJSONData<P | null>>();
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

  readonly featureClick = output<MapGeoJSONEvent<P>>();
  readonly featureHover = output<MapGeoJSONEvent<P> | null>();

  private readonly ctx = inject(MapContextService);
  private readonly zone = inject(NgZone);

  private readonly autoId = nextId('ng-geojson');
  private readonly resolvedId = computed(() => this.id() ?? this.autoId);
  private readonly hasFill = computed(() => this.fillPaint() !== false);
  private readonly sourceId = computed(() => `geojson-source-${this.resolvedId()}`);
  private readonly fillLayerId = computed(() => `geojson-fill-${this.resolvedId()}`);
  private readonly lineLayerId = computed(() => `geojson-line-${this.resolvedId()}`);
  /** Bumped every time the source is (re)created, so the layer effect re-adds its layers. */
  private readonly sourceRevision = signal(0);
  /** Data currently in the source, so re-runs of the data effect skip a no-op setData. */
  private appliedData: MapGeoJSONData<P | null> | null = null;
  /**
   * Whether this component's own source exists. Gates the other effects: after a failed creation
   * (e.g. an `id` already in use) they must not touch the source/layers of another owner.
   */
  private readonly created = signal(false);
  /** Paint keys set on each layer, so keys removed from the inputs get reset. */
  private appliedFillKeys: ReadonlySet<string> = new Set();
  private appliedLineKeys: ReadonlySet<string> = new Set();

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
    // Contributes to the map's declarative fit-to-bounds (`<ng-map [fitBounds]>`).
    inject(DestroyRef).onDestroy(
      this.ctx.registerBounds(() => geoJsonBounds(this.data() as GeoJSON.GeoJSON | string)),
    );

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
      const teardown = addMapLayers(
        map,
        (b) =>
          b.addSource(sourceId, {
            type: 'geojson',
            // Untracked: data changes go through setData below, never a source re-create.
            data: data as never,
            ...(promoteId ? { promoteId } : {}),
          }),
        (error) => this.ctx.reportError(error),
      );
      if (!teardown) return;
      this.appliedData = data;
      this.created.set(true);
      // The cleanup of a previous run removed the layers with the old source.
      this.sourceRevision.update((r) => r + 1);

      onCleanup(() => {
        this.created.set(false);
        // The layers (added by the effect below) go first: a source in use cannot be removed.
        for (const id of [lineLayerId, fillLayerId]) {
          try {
            if (map.getLayer(id)) map.removeLayer(id);
          } catch {
            // style may be mid-reload
          }
        }
        teardown();
      });
    });

    // Sync data when it changes.
    effect(() => {
      const data = this.data();
      if (!this.created()) return;
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
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map) return;

      this.sourceRevision();
      const sourceId = this.sourceId();

      const fillLayerId = this.fillLayerId();
      const lineLayerId = this.lineLayerId();
      const showFill = this.fillPaint() !== false;
      const showLine = this.linePaint() !== false;
      const mergedFillPaint = this.mergedFillPaint();
      const mergedLinePaint = this.mergedLinePaint();
      const beforeId = this.beforeId();

      // Reported, not thrown: an exception escaping an effect aborts change detection.
      const addLayer = (layer: AddLayerObject) => {
        try {
          map.addLayer(layer, beforeId);
        } catch (error) {
          this.ctx.reportError(error);
        }
      };

      if (showFill && !map.getLayer(fillLayerId)) {
        addLayer({ id: fillLayerId, type: 'fill', source: sourceId, paint: mergedFillPaint });
      } else if (!showFill && map.getLayer(fillLayerId)) {
        map.removeLayer(fillLayerId);
      }

      if (showLine && !map.getLayer(lineLayerId)) {
        addLayer({ id: lineLayerId, type: 'line', source: sourceId, paint: mergedLinePaint });
      } else if (!showLine && map.getLayer(lineLayerId)) {
        map.removeLayer(lineLayerId);
      }

      if (showFill && map.getLayer(fillLayerId)) {
        this.appliedFillKeys = syncLayerProperties(
          map,
          fillLayerId,
          'paint',
          mergedFillPaint,
          this.appliedFillKeys,
        );
      }
      if (showLine && map.getLayer(lineLayerId)) {
        this.appliedLineKeys = syncLayerProperties(
          map,
          lineLayerId,
          'paint',
          mergedLinePaint,
          this.appliedLineKeys,
        );
      }
    });

    // Interaction handlers (bound to the fill layer). `hasFill` (not `fillPaint`) so a new paint
    // object does not re-bind the handlers and reset the hovered feature mid-hover.
    effect((onCleanup) => {
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map) return;
      if (!this.interactive() || !this.hasFill()) return;

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
      ): MapGeoJSONEvent<P> => ({
        feature: feature as unknown as MapGeoJSONEvent<P>['feature'],
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        originalEvent: e,
      });

      const handleMouseMove = (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const id = feature.id ?? null;
        if (hovering && id === hoveredId) return;
        map.getCanvas().style.cursor = 'pointer';
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
