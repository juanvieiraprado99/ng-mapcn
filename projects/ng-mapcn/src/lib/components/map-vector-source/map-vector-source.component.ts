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
  type PromoteIdSpecification,
  type VectorSourceSpecification,
  type VectorTileSource,
} from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { addMapLayers, removeLayersUsingSource } from '../../utils/layers';
import { nextId } from '../../utils/map-utils';
import {
  definedOptions,
  sameTiles,
  type TileBounds,
  type TileScheme,
} from '../../utils/tile-source';

/**
 * Vector tile source (MVT), including PMTiles through the `pmtiles://` protocol. It adds the
 * source only: draw it with layers that reference it by id (`source: 'parcels'`), for instance
 * through `map.addLayer` or another ng-mapcn layer component. Drop it inside `<ng-map>`.
 *
 * The MapLibre source id is exactly `id` (auto-generated when omitted). While the source exists
 * it is announced through `MapContextService.hasSource(id)` / `sourceIds()`, so a layer component
 * can wait for it; after a theme switch the source is re-added (and announced again).
 *
 * Provide `tiles` (URL templates) or `url` (a TileJSON, or `pmtiles://<archive url>`). `tiles`/`url`
 * are updated in place (`setTiles`/`setUrl`), but the mode (`url` vs `tiles`) is fixed at creation,
 * switching later is ignored (change `id` to rebuild); every other option is applied when the source is
 * created.
 *
 * PMTiles needs the protocol registered once, before the map loads (the library does not depend
 * on `pmtiles`):
 * ```ts
 * import * as maplibregl from 'maplibre-gl';
 * import { Protocol } from 'pmtiles';
 * maplibregl.addProtocol('pmtiles', new Protocol().tile);
 * ```
 *
 * Teardown (destroy, `id` change, or the gate closing for a theme switch) removes every layer still
 * using the source, including layers added by other components or the app, then the source. A
 * consumer should gate on `MapContextService.hasSource(id)` and re-add its layers when it reopens.
 */
@Component({
  selector: 'ng-map-vector-source',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapVectorSourceComponent {
  /**
   * Source id. Auto-generated if not provided. Changing it re-creates the source.
   * Layers reference the source by this id.
   */
  readonly id = input<string>();
  /** Tile URL templates, e.g. `https://tiles.example.com/{z}/{x}/{y}.mvt`. */
  readonly tiles = input<readonly string[]>();
  /** TileJSON URL or `pmtiles://<archive url>`, instead of `tiles`. Takes precedence. */
  readonly url = input<string>();
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
  /**
   * Feature property (or `{ [sourceLayer]: property }`) used as the feature id, which enables
   * feature-state (hover/selection) on vector tiles. Applied at creation.
   */
  readonly promoteId = input<PromoteIdSpecification>();

  private readonly ctx = inject(MapContextService);

  private readonly autoId = nextId('ng-vector-source');
  private readonly resolvedId = computed(() => this.id() ?? this.autoId);

  private readonly created = signal(false);
  private appliedUrl: string | undefined;
  private appliedTiles: readonly string[] | undefined;

  constructor() {
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      const sourceId = this.resolvedId();
      const url = untracked(() => this.url());
      const tiles = untracked(() => this.tiles());
      const bounds = untracked(() => this.bounds());
      const options = untracked(() =>
        definedOptions({
          minzoom: this.minzoom(),
          maxzoom: this.maxzoom(),
          attribution: this.attribution(),
          bounds: bounds && [...bounds],
          scheme: this.scheme(),
          promoteId: this.promoteId(),
        }),
      );

      const teardown = addMapLayers(
        map,
        (b) => {
          if (!url && !tiles?.length) {
            throw new Error(`ng-map-vector-source "${sourceId}" needs "tiles" or "url".`);
          }
          b.addSource(sourceId, {
            type: 'vector',
            ...(url ? { url } : { tiles: [...(tiles ?? [])] }),
            ...options,
          } as VectorSourceSpecification);
        },
        (error) => this.ctx.reportError(error),
      );
      if (!teardown) return;
      const release = this.ctx.registerSource(sourceId);
      this.appliedUrl = url;
      this.appliedTiles = tiles;
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
      const source = map?.getSource(this.resolvedId()) as VectorTileSource | undefined;
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
  }
}
