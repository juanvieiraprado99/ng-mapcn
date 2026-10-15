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
  type RasterLayerSpecification,
  type RasterSourceSpecification,
  type RasterTileSource,
} from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { syncLayerProperties } from '../../utils/layer-properties';
import { addMapLayers, removeLayersUsingSource } from '../../utils/layers';
import { nextId } from '../../utils/map-utils';
import {
  definedOptions,
  sameTiles,
  type TileBounds,
  type TileScheme,
} from '../../utils/tile-source';

type MapRasterPaint = NonNullable<RasterLayerSpecification['paint']>;

/**
 * Raster tile source (XYZ, TMS, WMS through a `{bbox-epsg-3857}` template) plus the raster layer
 * that draws it. Drop it inside `<ng-map>`.
 *
 * Ids:
 * - source: exactly `id` (auto-generated when omitted), so other components and the escape hatch
 *   can reference it, e.g. `map.getSource('radar')`. It is announced through
 *   `MapContextService.hasSource(id)`.
 * - layer: `raster-layer-<id>`.
 *
 * Provide `tiles` (URL templates) or `url` (a TileJSON). `tiles`/`url` are updated in place
 * (`setTiles`/`setUrl`); the mode (`url` vs `tiles`) is fixed at creation, switching later is ignored (change `id` to rebuild); `tileSize`, `minzoom`, `maxzoom`, `bounds`, `scheme`, `attribution` and
 * `beforeId` are applied when the source is created. `opacity`, `visible` and `paint` are
 * reconciled live. After a theme switch the source and layer are re-added.
 */
@Component({
  selector: 'ng-map-raster-source',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapRasterSourceComponent {
  /**
   * Source id. Auto-generated if not provided. Changing it re-creates the source and layer.
   * Layers of other components reference the source by this id.
   */
  readonly id = input<string>();
  /** Tile URL templates, e.g. `https://tiles.example.com/{z}/{x}/{y}.png`. */
  readonly tiles = input<readonly string[]>();
  /** URL of a TileJSON document, instead of `tiles`. Takes precedence over `tiles`. */
  readonly url = input<string>();
  /** Tile size in pixels (MapLibre default 256). Applied at creation. */
  readonly tileSize = input<number>();
  /** Minimum zoom level of the tiles (default 0). Applied at creation. */
  readonly minzoom = input<number>();
  /** Maximum zoom level of the tiles (default 22). Applied at creation. */
  readonly maxzoom = input<number>();
  /** Attribution shown in the map's attribution control. Applied at creation. */
  readonly attribution = input<string>();
  /** `[west, south, east, north]` limit of the tiles. Applied at creation. */
  readonly bounds = input<TileBounds>();
  /** Tile scheme, `xyz` (default) or `tms`. Applied at creation. */
  readonly scheme = input<TileScheme>();
  /** Layer opacity, 0..1 (number or MapLibre expression). */
  readonly opacity = input<number | readonly unknown[]>(1);
  /** Whether the layer is drawn. The source stays loaded when hidden. */
  readonly visible = input(true);
  /**
   * Optional MapLibre layer id to insert the layer before (z-order control).
   * Applied at layer creation only; later changes are ignored.
   */
  readonly beforeId = input<string>();
  /** Escape hatch: raster paint properties merged last (e.g. `raster-saturation`). */
  readonly paint = input<MapRasterPaint>();

  private readonly ctx = inject(MapContextService);

  private readonly autoId = nextId('ng-raster-source');
  private readonly resolvedId = computed(() => this.id() ?? this.autoId);
  private readonly layerId = computed(() => `raster-layer-${this.resolvedId()}`);

  private readonly created = signal(false);
  private appliedUrl: string | undefined;
  private appliedTiles: readonly string[] | undefined;
  private appliedVisible = true;
  private appliedPaintKeys: ReadonlySet<string> = new Set();

  private readonly mergedPaint = computed<MapRasterPaint>(
    () => ({ 'raster-opacity': this.opacity(), ...(this.paint() ?? {}) }) as MapRasterPaint,
  );

  constructor() {
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      const sourceId = this.resolvedId();
      const layerId = this.layerId();
      const url = untracked(() => this.url());
      const tiles = untracked(() => this.tiles());
      const beforeId = untracked(() => this.beforeId());
      const paint = untracked(() => this.mergedPaint());
      const visible = untracked(() => this.visible());
      const bounds = untracked(() => this.bounds());
      const options = untracked(() =>
        definedOptions({
          tileSize: this.tileSize(),
          minzoom: this.minzoom(),
          maxzoom: this.maxzoom(),
          attribution: this.attribution(),
          bounds: bounds && [...bounds],
          scheme: this.scheme(),
        }),
      );

      const teardown = addMapLayers(
        map,
        (b) => {
          if (!url && !tiles?.length) {
            throw new Error(`ng-map-raster-source "${sourceId}" needs "tiles" or "url".`);
          }
          b.addSource(sourceId, {
            type: 'raster',
            ...(url ? { url } : { tiles: [...(tiles ?? [])] }),
            ...options,
          } as RasterSourceSpecification);
          b.addLayer(
            {
              id: layerId,
              type: 'raster',
              source: sourceId,
              layout: { visibility: visible ? 'visible' : 'none' },
              paint,
            } as AddLayerObject,
            beforeId,
          );
        },
        (error) => this.ctx.reportError(error),
      );
      if (!teardown) return;
      const release = this.ctx.registerSource(sourceId);
      this.appliedUrl = url;
      this.appliedTiles = tiles;
      this.appliedVisible = visible;
      this.appliedPaintKeys = new Set(Object.keys(paint));
      this.created.set(true);

      onCleanup(() => {
        this.created.set(false);
        release();
        removeLayersUsingSource(map, sourceId);
        teardown();
      });
    });

    // Point the live source at new tiles / a new TileJSON without recreating it.
    effect(() => {
      const url = this.url();
      const tiles = this.tiles();
      if (!this.created()) return;
      const map = this.ctx.map();
      const source = map?.getSource(this.resolvedId()) as RasterTileSource | undefined;
      if (!source) return;
      // The mode (url or tiles) is fixed at creation; the other mode is ignored.
      if (url) {
        if (this.appliedUrl === undefined || url === this.appliedUrl) return;
        source.setUrl(url);
        this.appliedUrl = url;
      } else if (tiles?.length && !this.appliedUrl && !sameTiles(tiles, this.appliedTiles)) {
        source.setTiles([...tiles]);
        this.appliedTiles = tiles;
      }
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
      const visible = this.visible();
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map || !map.getLayer(this.layerId()) || visible === this.appliedVisible) return;
      map.setLayoutProperty(this.layerId(), 'visibility', visible ? 'visible' : 'none');
      this.appliedVisible = visible;
    });
  }
}
