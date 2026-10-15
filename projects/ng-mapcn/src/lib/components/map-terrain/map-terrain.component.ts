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
  type HillshadeLayerSpecification,
  type RasterDEMSourceSpecification,
} from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { syncLayerProperties } from '../../utils/layer-properties';
import { addMapLayers, removeLayersUsingSource } from '../../utils/layers';
import { nextId } from '../../utils/map-utils';
import { definedOptions } from '../../utils/tile-source';

type MapHillshadePaint = NonNullable<HillshadeLayerSpecification['paint']>;

/** Encoding of the elevation tiles: Terrarium (AWS, Mapzen) or Mapbox Terrain-RGB (also MapTiler). */
export type TerrainEncoding = 'terrarium' | 'mapbox';

/**
 * Public Terrarium elevation tiles (AWS Open Data "Terrain Tiles", no key needed), used when
 * neither `tiles` nor `url` is given. Tiles exist up to zoom 15.
 */
export const defaultTerrainTiles: readonly string[] = [
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
];

const DEFAULT_ATTRIBUTION =
  'Terrain: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Mapzen, AWS Terrain Tiles</a>';

/**
 * Declarative 3D terrain: a `raster-dem` source drives `map.setTerrain`, with an optional
 * hillshade layer. Drop it inside `<ng-map>` and tilt the map (`[pitch]="60"`).
 *
 * `<ng-map-terrain />` works as is, with public Terrarium tiles. For another provider pass
 * `tiles` (URL templates) or `url` (a TileJSON) and the matching `encoding`; `url` takes
 * precedence over `tiles`. `tiles`, `url`, `encoding`, `tileSize`, `minzoom`, `maxzoom` and
 * `attribution` are applied when the source is created (change `id` to rebuild); `exaggeration`
 * and the hillshade inputs are reconciled live.
 *
 * Ids (auto-generated `id` when omitted):
 * - DEM source of the terrain: `terrain-source-<id>`, announced through
 *   `MapContextService.hasSource`.
 * - hillshade: layer `terrain-hillshade-<id>` over its own source `terrain-hillshade-source-<id>`
 *   (MapLibre warns when a hillshade layer and the terrain share one DEM source). Both exist only
 *   while `hillshade` is true; toggling it adds or removes them without touching the terrain.
 *
 * The terrain is style-level state: a theme `setStyle` discards it, so it is switched off with the
 * other children and enabled again, with the sources, once the style is back. Changing
 * `exaggeration` calls `setTerrain` again, which MapLibre handles by rebuilding its terrain mesh.
 * Teardown disables the terrain (only if it is this one) before removing the layer and sources.
 * Only one terrain can be active per map: with several `ng-map-terrain`, the last one wins.
 */
@Component({
  selector: 'ng-map-terrain',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapTerrainComponent {
  /** Unique identifier prefix. Auto-generated if not provided. Changing it re-creates all. */
  readonly id = input<string>();
  /** Elevation tile URL templates. Defaults to public Terrarium tiles. Applied at creation. */
  readonly tiles = input<readonly string[]>();
  /** TileJSON URL, instead of `tiles`. Takes precedence. Applied at creation. */
  readonly url = input<string>();
  /** Encoding of the elevation tiles. Default `terrarium`. Applied at creation. */
  readonly encoding = input<TerrainEncoding>();
  /** Tile size in pixels. Default 256 (use 512 for 512px providers). Applied at creation. */
  readonly tileSize = input<number>();
  /** Minimum zoom of the elevation tiles. Applied at creation. */
  readonly minzoom = input<number>();
  /** Maximum zoom of the elevation tiles (15 for the default tiles). Applied at creation. */
  readonly maxzoom = input<number>();
  /** Attribution shown in the attribution control. Applied at creation. */
  readonly attribution = input<string>();
  /** How tall the terrain looks (1 = true scale). Default 1. */
  readonly exaggeration = input<number>();
  /** Whether to draw a hillshade layer over the terrain. Default false. */
  readonly hillshade = input<boolean>();
  /** Hillshade intensity, 0..1 (MapLibre default 0.5). */
  readonly hillshadeExaggeration = input<number>();
  /** Hillshade color of the shaded slopes. */
  readonly hillshadeShadowColor = input<string>();
  /** Hillshade color of the lit slopes. */
  readonly hillshadeHighlightColor = input<string>();
  /** Hillshade accent color for steep slopes. */
  readonly hillshadeAccentColor = input<string>();
  /** Escape hatch: hillshade paint properties merged last, over the inputs above. */
  readonly hillshadePaint = input<MapHillshadePaint>();
  /**
   * Optional MapLibre layer id to insert the hillshade layer before (typically the first label
   * layer, so labels stay on top). Applied when the hillshade layer is created only.
   */
  readonly beforeId = input<string>();

  private readonly ctx = inject(MapContextService);

  private readonly autoId = nextId('ng-terrain');
  private readonly resolvedId = computed(() => this.id() ?? this.autoId);
  private readonly sourceId = computed(() => `terrain-source-${this.resolvedId()}`);
  private readonly hillshadeSourceId = computed(
    () => `terrain-hillshade-source-${this.resolvedId()}`,
  );
  private readonly hillshadeLayerId = computed(() => `terrain-hillshade-${this.resolvedId()}`);

  /** Whether the DEM source and the terrain exist; gates the sync effects. */
  private readonly created = signal(false);
  private readonly hillshadeCreated = signal(false);
  /** The DEM source spec the terrain was created with, reused for the hillshade's own source. */
  private demSpec: RasterDEMSourceSpecification | null = null;
  private appliedExaggeration = 1;
  private appliedPaintKeys: ReadonlySet<string> = new Set();

  private readonly hillshadePaintValue = computed<MapHillshadePaint>(
    () =>
      ({
        ...definedOptions({
          'hillshade-exaggeration': this.hillshadeExaggeration(),
          'hillshade-shadow-color': this.hillshadeShadowColor(),
          'hillshade-highlight-color': this.hillshadeHighlightColor(),
          'hillshade-accent-color': this.hillshadeAccentColor(),
        }),
        ...(this.hillshadePaint() ?? {}),
      }) as MapHillshadePaint,
  );

  constructor() {
    // Add the DEM source and enable the terrain once the style is loaded; re-runs after setStyle.
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      const sourceId = this.sourceId();
      const exaggeration = untracked(() => this.exaggeration() ?? 1);
      const spec = untracked(() => this.buildDemSpec());

      const teardown = addMapLayers(
        map,
        (b) => {
          b.addSource(sourceId, spec);
          map.setTerrain({ source: sourceId, exaggeration });
        },
        (error) => this.ctx.reportError(error),
      );
      if (!teardown) return;
      const release = this.ctx.registerSource(sourceId);
      this.demSpec = spec;
      this.appliedExaggeration = exaggeration;
      this.created.set(true);

      onCleanup(() => {
        this.created.set(false);
        this.demSpec = null;
        release();
        try {
          // The terrain may have been replaced by one of another component or the application.
          if (map.getTerrain()?.source === sourceId) map.setTerrain(null);
        } catch {
          // style may be mid-reload
        }
        removeLayersUsingSource(map, sourceId);
        teardown();
      });
    });

    // Exaggeration: setTerrain again, only when it really changed.
    effect(() => {
      const exaggeration = this.exaggeration() ?? 1;
      if (!this.created()) return;
      const map = this.ctx.map();
      const sourceId = this.sourceId();
      if (!map || map.getTerrain()?.source !== sourceId) return;
      if (exaggeration === this.appliedExaggeration) return;
      map.setTerrain({ source: sourceId, exaggeration });
      this.appliedExaggeration = exaggeration;
    });

    // Hillshade layer (with its own DEM source), present only while `hillshade` is true.
    effect((onCleanup) => {
      if (!this.created() || !this.hillshade()) return;
      const map = this.ctx.map();
      const spec = this.demSpec;
      if (!map || !spec) return;

      const sourceId = this.hillshadeSourceId();
      const layerId = this.hillshadeLayerId();
      const paint = untracked(() => this.hillshadePaintValue());
      const beforeId = untracked(() => this.beforeId());

      const teardown = addMapLayers(
        map,
        (b) => {
          b.addSource(sourceId, spec);
          b.addLayer(
            { id: layerId, type: 'hillshade', source: sourceId, paint } as AddLayerObject,
            beforeId,
          );
        },
        (error) => this.ctx.reportError(error),
      );
      if (!teardown) return;
      this.appliedPaintKeys = new Set(Object.keys(paint));
      this.hillshadeCreated.set(true);

      onCleanup(() => {
        this.hillshadeCreated.set(false);
        teardown();
      });
    });

    // Reconcile the hillshade paint.
    effect(() => {
      const paint = this.hillshadePaintValue();
      if (!this.hillshadeCreated()) return;
      const map = this.ctx.map();
      const layerId = this.hillshadeLayerId();
      if (!map || !map.getLayer(layerId)) return;
      this.appliedPaintKeys = syncLayerProperties(
        map,
        layerId,
        'paint',
        paint as Record<string, unknown>,
        this.appliedPaintKeys,
      );
    });
  }

  private buildDemSpec(): RasterDEMSourceSpecification {
    const url = this.url();
    const tiles = this.tiles();
    const usesDefaults = !url && !tiles?.length;
    return {
      type: 'raster-dem',
      ...(url ? { url } : { tiles: [...(usesDefaults ? defaultTerrainTiles : (tiles ?? []))] }),
      encoding: this.encoding() ?? 'terrarium',
      ...definedOptions({
        // Tiles are 256px for the default and usual Terrarium sets; a TileJSON states its own.
        tileSize: this.tileSize() ?? (url ? undefined : 256),
        minzoom: this.minzoom(),
        maxzoom: this.maxzoom() ?? (usesDefaults ? 15 : undefined),
        attribution: this.attribution() ?? (usesDefaults ? DEFAULT_ATTRIBUTION : undefined),
      }),
    };
  }
}
