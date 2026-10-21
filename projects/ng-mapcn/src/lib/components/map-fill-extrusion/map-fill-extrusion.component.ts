import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import {
  type AddLayerObject,
  type FillExtrusionLayerSpecification,
  type FilterSpecification,
} from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { syncLayerProperties } from '../../utils/layer-properties';
import { addMapLayers } from '../../utils/layers';
import { nextId } from '../../utils/map-utils';

type MapFillExtrusionPaint = NonNullable<FillExtrusionLayerSpecification['paint']>;

/** Id of the vector source of the earlier Carto basemap styles (OpenMapTiles schema). */
export const CARTO_SOURCE_ID = 'carto';

/** Where a basemap vector source keeps its buildings and their heights. */
export interface BuildingSchema {
  readonly source: string;
  readonly sourceLayer: string;
  readonly heightProperty: string;
  readonly baseProperty: string;
}

/**
 * Building schemas of the Carto basemaps, tried in order when no `source` is given. The current
 * styles (`carto.streets/v2` tiles) name their source `protomaps`, with a `buildings` layer; the
 * earlier ones named it `carto`, with the OpenMapTiles `building` layer. A `source` set to one of
 * these ids also takes its source layer and height properties as defaults.
 */
export const CARTO_BUILDING_SCHEMAS: readonly BuildingSchema[] = [
  {
    source: 'protomaps',
    sourceLayer: 'buildings',
    heightProperty: 'height',
    baseProperty: 'min_height',
  },
  {
    source: CARTO_SOURCE_ID,
    sourceLayer: 'building',
    heightProperty: 'render_height',
    baseProperty: 'render_min_height',
  },
];

/** Theme-aware default extrusion colors, close to the basemaps' own building fills. */
export const defaultExtrusionColors: Record<'light' | 'dark', string> = {
  light: '#d1d5db',
  dark: '#3f3f46',
};

/**
 * `hide_3d` is set by OpenMapTiles on building outlines that have `building:part` features: the
 * parts carry the real heights, so drawing the outline too would hide them.
 */
const DEFAULT_FILTER: FilterSpecification = ['!=', ['get', 'hide_3d'], true];

const numberProperty = (name: string) => ['coalesce', ['to-number', ['get', name]], 0];

/**
 * Declarative 3D extrusion (MapLibre `fill-extrusion` layer) of polygons from a vector or GeoJSON
 * source, e.g. 3D buildings. Drop it inside `<ng-map>` and tilt the map (`[pitch]="60"`).
 *
 * It creates only the layer: the `source` is not created here. It is either one of the basemap
 * style's sources or a source added by `ng-map-vector-source` or the application. The layer is
 * added as soon as `map.getSource(source)` exists and re-added after a theme `setStyle`. A
 * source added later by the application is detected through MapLibre's `sourcedata` event.
 *
 * Defaults target the Carto basemaps: the first source of `CARTO_BUILDING_SCHEMAS` the style has
 * (`protomaps` with `buildings` and `height` / `min_height` in the current styles, `carto` with
 * `building` and `render_height` / `render_min_height` in the earlier ones), buildings visible
 * from zoom 14 (so extrusions sit over the flat footprints the basemap fades in at 13-16). With
 * any other `source`, pass `sourceLayer` for a vector source and omit it for GeoJSON; heights
 * then default to `render_height` / `render_min_height`.
 * Basemaps without a vector source (`blank`, raster) have nothing to extrude: use a source of
 * your own.
 *
 * Layer id: `fill-extrusion-layer-<id>` (auto-generated `id` when omitted). `beforeId` is applied
 * at creation only. `minZoom`/`maxZoom`, `filter` and paint inputs are reconciled live.
 */
@Component({
  selector: 'ng-map-fill-extrusion',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapFillExtrusionComponent {
  /** Unique identifier of the layer. Auto-generated if not provided. Changing it re-creates it. */
  readonly id = input<string>();
  /**
   * Id of the source to extrude: a basemap source, a registered source component or an
   * application source. Defaults to the Carto basemap's building source (`protomaps`, or `carto`
   * in the earlier styles). Changing it re-creates the layer.
   */
  readonly source = input<string>();
  /**
   * Layer of a vector source. Defaults to the Carto one (`buildings` or `building`) for a Carto
   * source and is omitted otherwise (GeoJSON sources have no layers). Changing it re-creates the
   * layer.
   */
  readonly sourceLayer = input<string>();
  /** Feature property with the height in meters. Default from the Carto schema, else `render_height`. */
  readonly heightProperty = input<string>();
  /** Feature property with the base height in meters. Default from the Carto schema, else `render_min_height`. */
  readonly baseProperty = input<string>();
  /** Fill color (string or MapLibre expression). Defaults to a theme-aware gray. */
  readonly color = input<string | readonly unknown[]>();
  /** Layer opacity, 0..1. Default 0.8. */
  readonly opacity = input<number>();
  /** Minimum zoom at which the extrusion is drawn. Default 14. */
  readonly minZoom = input<number>();
  /** Zoom from which the extrusion is no longer drawn. Default 24. */
  readonly maxZoom = input<number>();
  /**
   * MapLibre filter. Defaults to skipping buildings flagged `hide_3d` (OpenMapTiles outlines that
   * are replaced by their parts); pass `null` for no filter at all.
   */
  readonly filter = input<FilterSpecification | null>();
  /**
   * Optional MapLibre layer id to insert the layer before (z-order control), e.g. a label layer.
   * Applied at layer creation only; later changes are ignored.
   */
  readonly beforeId = input<string>();
  /** Escape hatch: fill-extrusion paint properties merged last, over everything above. */
  readonly paint = input<MapFillExtrusionPaint>();

  private readonly ctx = inject(MapContextService);

  private readonly autoId = nextId('ng-fill-extrusion');
  private readonly layerId = computed(() => `fill-extrusion-layer-${this.id() ?? this.autoId}`);
  /** Carto schema of the source in use, set when the layer is created (none for other sources). */
  private readonly schema = signal<BuildingSchema | undefined>(undefined);
  private readonly resolvedFilter = computed<FilterSpecification | undefined>(() => {
    const filter = this.filter();
    if (filter === null) return undefined;
    return filter ?? DEFAULT_FILTER;
  });

  /** Bumped when the awaited source shows up through `sourcedata` (not announced by a component). */
  private readonly sourceTick = signal(0);
  private readonly created = signal(false);
  private appliedPaintKeys: ReadonlySet<string> = new Set();
  private appliedZoomRange: readonly [number, number] | null = null;
  private appliedFilter: FilterSpecification | undefined;

  private readonly mergedPaint = computed<MapFillExtrusionPaint>(() => {
    const color = this.color() ?? defaultExtrusionColors[this.ctx.resolvedTheme()];
    return {
      'fill-extrusion-color': color,
      'fill-extrusion-height': numberProperty(
        this.heightProperty() ?? this.schema()?.heightProperty ?? 'render_height',
      ),
      'fill-extrusion-base': numberProperty(
        this.baseProperty() ?? this.schema()?.baseProperty ?? 'render_min_height',
      ),
      'fill-extrusion-opacity': this.opacity() ?? 0.8,
      ...(this.paint() ?? {}),
    } as MapFillExtrusionPaint;
  });

  constructor() {
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      const explicit = this.source();
      // Tracked: a registered source announces itself, and a late application source ticks.
      if (explicit !== undefined) this.ctx.hasSource(explicit);
      this.sourceTick();

      const schema =
        explicit === undefined
          ? CARTO_BUILDING_SCHEMAS.find((s) => map.getSource(s.source))
          : CARTO_BUILDING_SCHEMAS.find((s) => s.source === explicit);
      const sourceId = explicit ?? schema?.source;

      if (!sourceId || !map.getSource(sourceId)) {
        const ids = sourceId ? [sourceId] : CARTO_BUILDING_SCHEMAS.map((s) => s.source);
        const onSourceData = () => {
          if (ids.some((id) => map.getSource(id))) this.sourceTick.update((n) => n + 1);
        };
        map.on('sourcedata', onSourceData);
        onCleanup(() => map.off('sourcedata', onSourceData));
        return;
      }

      // Before reading the paint, whose default heights come from the schema.
      this.schema.set(schema);
      const layerId = this.layerId();
      const sourceLayer = this.sourceLayer() ?? schema?.sourceLayer;
      const filter = untracked(() => this.resolvedFilter());
      const paint = untracked(() => this.mergedPaint());
      const beforeId = untracked(() => this.beforeId());
      const zoomRange: readonly [number, number] = untracked(() => [
        this.minZoom() ?? 14,
        this.maxZoom() ?? 24,
      ]);

      const teardown = addMapLayers(
        map,
        (b) => {
          b.addLayer(
            {
              id: layerId,
              type: 'fill-extrusion',
              source: sourceId,
              ...(sourceLayer ? { 'source-layer': sourceLayer } : {}),
              ...(filter ? { filter } : {}),
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
      this.appliedFilter = filter;
      this.appliedPaintKeys = new Set(Object.keys(paint));
      this.appliedZoomRange = zoomRange;
      this.created.set(true);

      onCleanup(() => {
        this.created.set(false);
        teardown();
      });
    });

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

    effect(() => {
      const minZoom = this.minZoom() ?? 14;
      const maxZoom = this.maxZoom() ?? 24;
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map || !map.getLayer(this.layerId())) return;
      const applied = this.appliedZoomRange;
      if (applied?.[0] === minZoom && applied[1] === maxZoom) return;
      map.setLayerZoomRange(this.layerId(), minZoom, maxZoom);
      this.appliedZoomRange = [minZoom, maxZoom];
    });

    effect(() => {
      const filter = this.resolvedFilter();
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map || !map.getLayer(this.layerId()) || filter === this.appliedFilter) return;
      map.setFilter(this.layerId(), filter ?? null);
      this.appliedFilter = filter;
    });
  }
}
