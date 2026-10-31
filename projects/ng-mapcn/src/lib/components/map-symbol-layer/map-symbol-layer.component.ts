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
  type FilterSpecification,
  type GeoJSONSource,
  type Map as MapLibreMap,
  type MapLayerMouseEvent,
  type SymbolLayerSpecification,
} from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { geoJsonBounds } from '../../utils/bounds';
import { syncLayerProperties } from '../../utils/layer-properties';
import { addMapLayers } from '../../utils/layers';
import { type MapGeoJSONEvent, nextId } from '../../utils/map-utils';
import { basemapTextFont } from '../../utils/text-font';

/** GeoJSON points (a FeatureCollection or a single Feature), or a URL to fetch GeoJSON from. */
export type MapSymbolData<P = GeoJSON.GeoJsonProperties> =
  string | GeoJSON.FeatureCollection<GeoJSON.Point, P> | GeoJSON.Feature<GeoJSON.Point, P>;

/** Decoded pixels `map.addImage` accepts. */
export type MapSymbolImageData =
  | HTMLImageElement
  | ImageBitmap
  | ImageData
  | { width: number; height: number; data: Uint8Array | Uint8ClampedArray };

/**
 * An image to register under an id and reference from `icon`: a URL (PNG, WebP or JPEG; SVG cannot
 * be decoded by `map.loadImage`), or the same with `sdf` / `pixelRatio`, or already decoded pixels.
 */
export type MapSymbolImage =
  | string
  | { url: string; sdf?: boolean; pixelRatio?: number }
  | { data: MapSymbolImageData; sdf?: boolean; pixelRatio?: number };

type MapSymbolLayout = NonNullable<SymbolLayerSpecification['layout']>;
type MapSymbolPaint = NonNullable<SymbolLayerSpecification['paint']>;
type Expression = readonly unknown[];

interface ResolvedImage {
  data: MapSymbolImageData;
  sdf: boolean;
  pixelRatio: number;
}

const SYMBOL_TEXT_COLORS: Record<'light' | 'dark', { color: string; halo: string }> = {
  light: { color: '#171717', halo: '#ffffff' },
  dark: { color: '#fafafa', halo: '#0a0a0a' },
};

/**
 * Declarative symbol layer: icons and/or text labels for a GeoJSON point source, rendered as a
 * MapLibre `symbol` layer (collision-aware, so crowded labels thin out by themselves). Drop it
 * inside `<ng-map>`.
 *
 * Generic over the feature properties `P`, inferred from `data`, so `featureClick` /
 * `featureHover` carry typed `feature.properties`.
 *
 * Icons come from `images`: a map of id to image (URL or decoded pixels) that is registered with
 * `map.addImage` and referenced from `icon` by id, or by a data-driven expression such as
 * `['get', 'kind']`. URLs are decoded once and re-registered after a theme switch (`setStyle`
 * drops the style's images). Image ids are shared per map: layers that register the same id use
 * one image (the first layer to add it provides the pixels, so give different images different
 * ids), and it is removed only when the last layer using it goes away. An id that already exists
 * in the style (a sprite icon, an image the app added) is used as is and never removed.
 *
 * SDF and non-SDF images cannot be mixed in one layer (MapLibre renders a layer's icons as one or
 * the other): use one layer per kind. `iconColor` only tints SDF images.
 *
 * Hover (`featureHover`) tells features apart by `id`. When the data the source is created with
 * is inline, non-empty and has no feature `id`s, the source generates them from the feature index
 * (MapLibre `generateId`, decided at creation), so the events carry those ids; data with ids keeps
 * its own. Features that still have no id (URL data) are told apart by position and properties.
 *
 * Text needs the style's `glyphs`. The `blank` style has none, so the text options are ignored
 * there (with a console warning) and only icons render.
 *
 * Source and layer ids derive from `id` (auto-generated when omitted):
 * - source: `symbol-source-<id>`
 * - layer: `symbol-layer-<id>`
 *
 * `beforeId` is applied at layer creation only; later changes are ignored.
 */
@Component({
  selector: 'ng-map-symbol-layer',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class MapSymbolLayerComponent<P extends Record<string, any> = Record<string, unknown>> {
  /** GeoJSON points (FeatureCollection or Feature), or a URL to fetch GeoJSON from. */
  readonly data = input.required<MapSymbolData<P | null>>();
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
  /**
   * Images to register by id, to be referenced from `icon`. Ids are shared with the other layers of
   * the map (the first to add an id provides the image). Use SDF or non-SDF images, not both.
   */
  readonly images = input<Record<string, MapSymbolImage>>({});
  /** Image id, or a MapLibre expression resolving to one (`['get', 'kind']`). */
  readonly icon = input<string | Expression>();
  /** Icon scale (number or MapLibre expression). */
  readonly iconSize = input<number | Expression>(1);
  /**
   * Icon color. Only applies to SDF images (`{ url, sdf: true }`), which cannot be mixed with
   * non-SDF ones in one layer: use one layer per kind.
   */
  readonly iconColor = input<string | Expression>();
  /** Label text: a `{property}` template, a plain string or a MapLibre expression. */
  readonly textField = input<string | Expression>();
  /** Font stack for the labels. Defaults to the basemap's own, which its glyph server serves. */
  readonly textFont = input<readonly string[]>();
  /** Label size in pixels (number or MapLibre expression). */
  readonly textSize = input<number | Expression>(12);
  /** Label color. Defaults to a theme-aware neutral. */
  readonly textColor = input<string | Expression>();
  /** Label halo color. Defaults to a theme-aware neutral. */
  readonly textHaloColor = input<string | Expression>();
  /** Label halo width in pixels. */
  readonly textHaloWidth = input<number | Expression>(1);
  /** Which part of the label touches the anchor. Defaults to `top` with an icon, else `center`. */
  readonly textAnchor = input<MapSymbolLayout['text-anchor']>();
  /** Label offset in ems from the anchor. Defaults to `[0, 0.8]` with an icon, else `[0, 0]`. */
  readonly textOffset = input<readonly [number, number]>();
  /** Draw icons and labels even when they collide with others. */
  readonly allowOverlap = input(false);
  /** Minimum zoom level at which the layer is rendered. */
  readonly minZoom = input(0);
  /** Zoom level from which the layer is no longer rendered. */
  readonly maxZoom = input(24);
  /** MapLibre filter expression. */
  readonly filter = input<FilterSpecification>();
  /** Escape hatch: layout properties merged last, over everything above. */
  readonly layout = input<MapSymbolLayout>();
  /** Escape hatch: paint properties merged last, over everything above. */
  readonly paint = input<MapSymbolPaint>();
  /** Whether features respond to mouse events. */
  readonly interactive = input(false);

  readonly featureClick = output<MapGeoJSONEvent<P>>();
  readonly featureHover = output<MapGeoJSONEvent<P> | null>();

  private readonly ctx = inject(MapContextService);
  private readonly zone = inject(NgZone);

  private readonly autoId = nextId('ng-symbol');
  private readonly resolvedId = computed(() => this.id() ?? this.autoId);
  private readonly sourceId = computed(() => `symbol-source-${this.resolvedId()}`);
  private readonly layerId = computed(() => `symbol-layer-${this.resolvedId()}`);

  /** Data currently in the source, so re-runs of the data effect skip a no-op setData. */
  private appliedData: MapSymbolData<P | null> | null = null;
  /** Whether this component's own source and layer exist; gates the sync effects. */
  private readonly created = signal(false);
  private appliedPaintKeys: ReadonlySet<string> = new Set();
  private appliedLayoutKeys: ReadonlySet<string> = new Set();
  private appliedZoomRange: readonly [number, number] | null = null;
  private appliedFilter: FilterSpecification | undefined;

  /**
   * The default font stack when the style has `glyphs`, `null` when it has none (text options are
   * then omitted). Set at layer creation, since it depends on the style that is currently loaded.
   */
  private readonly styleFont = signal<readonly string[] | null>(null);
  private warnedNoGlyphs = false;

  /** True once the initial `images` are decoded (or failed); the layer waits for it. */
  private readonly imagesReady = signal(false);
  private imagesStarted = false;
  /** The `images` value `resolved` was computed for. */
  private resolvedFor: Record<string, MapSymbolImage> | null = null;
  /** Decoded images that should exist in the style. */
  private resolved = new Map<string, ResolvedImage>();
  /** Images this component holds a reference to (`MapContextService.acquireImage`). */
  private readonly held = new Map<string, { image: ResolvedImage; release: () => void }>();
  /** Decoded images per URL: the style drops its images on `setStyle`, the pixels are kept. */
  private readonly urlCache = new Map<string, Promise<MapSymbolImageData>>();
  private imageVersion = 0;
  private destroyed = false;

  private readonly mergedLayout = computed<MapSymbolLayout>(() => {
    const icon = this.icon();
    const textField = this.textField();
    const font = this.styleFont();
    const hasIcon = icon !== undefined;
    return {
      ...(hasIcon
        ? {
            'icon-image': icon,
            'icon-size': this.iconSize(),
            'icon-allow-overlap': this.allowOverlap(),
          }
        : {}),
      ...(textField !== undefined && font
        ? {
            'text-field': textField,
            'text-font': this.textFont() ?? font,
            'text-size': this.textSize(),
            'text-anchor': this.textAnchor() ?? (hasIcon ? 'top' : 'center'),
            'text-offset': this.textOffset() ?? (hasIcon ? [0, 0.8] : [0, 0]),
            'text-allow-overlap': this.allowOverlap(),
          }
        : {}),
      ...(this.layout() ?? {}),
    } as MapSymbolLayout;
  });

  private readonly mergedPaint = computed<MapSymbolPaint>(() => {
    const theme = SYMBOL_TEXT_COLORS[this.ctx.resolvedTheme()];
    const iconColor = this.iconColor();
    return {
      ...(iconColor !== undefined ? { 'icon-color': iconColor } : {}),
      ...(this.textField() !== undefined && this.styleFont()
        ? {
            'text-color': this.textColor() ?? theme.color,
            'text-halo-color': this.textHaloColor() ?? theme.halo,
            'text-halo-width': this.textHaloWidth(),
          }
        : {}),
      ...(this.paint() ?? {}),
    } as MapSymbolPaint;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => (this.destroyed = true));
    // Contributes to the map's declarative fit-to-bounds (`<ng-map [fitBounds]>`).
    destroyRef.onDestroy(
      this.ctx.registerBounds(() => geoJsonBounds(this.data() as GeoJSON.GeoJSON | string)),
    );

    // Decode the initial images once the map exists (loading needs no loaded style).
    effect(() => {
      const map = this.ctx.map();
      if (!map || this.imagesStarted) return;
      this.imagesStarted = true;
      const images = untracked(() => this.images());
      this.resolvedFor = images;
      if (Object.keys(images).length === 0) {
        this.imagesReady.set(true);
        return;
      }
      void this.resolveImages(map, images).then((resolved) => {
        if (this.destroyed) return;
        this.resolved = resolved;
        this.imagesReady.set(true);
      });
    });

    // Add images, source and layer once the style is loaded; re-runs after theme setStyle.
    effect((onCleanup) => {
      if (!this.imagesReady()) return;
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      const sourceId = this.sourceId();
      const layerId = this.layerId();

      const teardown = untracked(() => {
        const hasGlyphs = !!map.getStyle()?.glyphs;
        this.styleFont.set(hasGlyphs ? basemapTextFont(map) : null);
        if (!hasGlyphs && this.textField() !== undefined) this.warnNoGlyphs();

        this.acquireImages();

        const data = this.data();
        const beforeId = this.beforeId();
        const layout = this.mergedLayout();
        const paint = this.mergedPaint();
        const filter = this.filter();
        const zoomRange: readonly [number, number] = [this.minZoom(), this.maxZoom()];

        const remove = addMapLayers(
          map,
          (b) => {
            b.addSource(sourceId, {
              type: 'geojson',
              data: data as never,
              ...(lacksIds(data) ? { generateId: true } : {}),
            });
            b.addLayer(
              {
                id: layerId,
                type: 'symbol',
                source: sourceId,
                minzoom: zoomRange[0],
                maxzoom: zoomRange[1],
                ...(filter ? { filter } : {}),
                layout,
                paint,
              } as AddLayerObject,
              beforeId,
            );
          },
          (error) => this.ctx.reportError(error),
        );
        if (!remove) {
          this.releaseImages();
          return null;
        }
        this.appliedData = data;
        this.appliedLayoutKeys = new Set(Object.keys(layout));
        this.appliedPaintKeys = new Set(Object.keys(paint));
        this.appliedZoomRange = zoomRange;
        this.appliedFilter = filter;
        return remove;
      });
      if (!teardown) return;
      this.created.set(true);

      onCleanup(() => {
        this.created.set(false);
        // The layer goes first (a source in use cannot be removed), then the images it used.
        teardown();
        this.releaseImages();
      });
    });

    // Reconcile `images` changes without touching the layer.
    effect(() => {
      const images = this.images();
      if (!this.imagesReady() || images === this.resolvedFor) return;
      const map = untracked(() => this.ctx.map());
      if (!map) return;
      this.resolvedFor = images;
      const version = ++this.imageVersion;
      void this.resolveImages(map, images).then((resolved) => {
        if (this.destroyed || version !== this.imageVersion) return;
        this.resolved = resolved;
        if (untracked(() => this.created()) && this.ctx.map() === map) this.syncImages();
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

    // Reconcile layout properties.
    effect(() => {
      const layout = this.mergedLayout();
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map || !map.getLayer(this.layerId())) return;
      this.appliedLayoutKeys = syncLayerProperties(
        map,
        this.layerId(),
        'layout',
        layout as Record<string, unknown>,
        this.appliedLayoutKeys,
      );
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

    // Reconcile the filter, only when it really changed.
    effect(() => {
      const filter = this.filter();
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map || !map.getLayer(this.layerId()) || filter === this.appliedFilter) return;
      map.setFilter(this.layerId(), filter ?? null);
      this.appliedFilter = filter;
    });

    // Interaction handlers bound to the symbol layer.
    effect((onCleanup) => {
      if (!this.created()) return;
      const map = this.ctx.map();
      if (!map) return;
      if (!this.interactive()) return;

      const layerId = this.layerId();
      let hoveredKey: unknown = null;
      let hovering = false;

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
        const key = hoverKey(feature);
        if (hovering && key === hoveredKey) return;
        map.getCanvas().style.cursor = 'pointer';
        hovering = true;
        hoveredKey = key;
        // Map events fire outside the zone: re-enter for outputs.
        this.zone.run(() => this.featureHover.emit(toEvent(feature, e)));
      };

      const handleMouseLeave = () => {
        hovering = false;
        hoveredKey = null;
        map.getCanvas().style.cursor = '';
        this.zone.run(() => this.featureHover.emit(null));
      };

      const handleClick = (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        this.zone.run(() => this.featureClick.emit(toEvent(feature, e)));
      };

      map.on('mousemove', layerId, handleMouseMove);
      map.on('mouseleave', layerId, handleMouseLeave);
      map.on('click', layerId, handleClick);

      onCleanup(() => {
        map.off('mousemove', layerId, handleMouseMove);
        map.off('mouseleave', layerId, handleMouseLeave);
        map.off('click', layerId, handleClick);
        try {
          map.getCanvas().style.cursor = '';
        } catch {
          // map may be mid-teardown
        }
      });
    });
  }

  /** Decodes every image; one that fails is reported and left out. */
  private async resolveImages(
    map: MapLibreMap,
    images: Record<string, MapSymbolImage>,
  ): Promise<Map<string, ResolvedImage>> {
    const entries = await Promise.all(
      Object.entries(images).map(async ([id, spec]): Promise<[string, ResolvedImage] | null> => {
        try {
          const options = typeof spec === 'string' ? { url: spec } : spec;
          const data = 'url' in options ? await this.loadUrl(map, options.url) : options.data;
          return [id, { data, sdf: options.sdf ?? false, pixelRatio: options.pixelRatio ?? 1 }];
        } catch (error) {
          if (!this.destroyed) this.ctx.reportError(error);
          return null;
        }
      }),
    );
    return new Map(entries.filter((e): e is [string, ResolvedImage] => e !== null));
  }

  private loadUrl(map: MapLibreMap, url: string): Promise<MapSymbolImageData> {
    let pending = this.urlCache.get(url);
    if (!pending) {
      pending = map.loadImage(url).then((response) => response.data);
      this.urlCache.set(url, pending);
      // A failure is not cached, so a later change can retry.
      pending.catch(() => this.urlCache.delete(url));
    }
    return pending;
  }

  private acquireImage(id: string, image: ResolvedImage): void {
    const release = this.ctx.acquireImage(id, image.data as never, {
      sdf: image.sdf,
      pixelRatio: image.pixelRatio,
    });
    this.held.set(id, { image, release });
  }

  /** Takes a reference to every decoded image (after creation or `setStyle`). */
  private acquireImages(): void {
    for (const [id, image] of this.resolved) this.acquireImage(id, image);
  }

  /** Brings the held images in line with `resolved`. */
  private syncImages(): void {
    for (const [id, image] of this.resolved) {
      const current = this.held.get(id);
      if (!current) {
        this.acquireImage(id, image);
      } else if (
        current.image.data !== image.data ||
        current.image.sdf !== image.sdf ||
        current.image.pixelRatio !== image.pixelRatio
      ) {
        // `updateImage` cannot change `sdf` or `pixelRatio`: swap the image instead. It only
        // changes when no other layer shares the id (the first one to add an id provides it).
        current.release();
        this.acquireImage(id, image);
      }
    }
    for (const [id, { release }] of [...this.held]) {
      if (this.resolved.has(id)) continue;
      release();
      this.held.delete(id);
    }
  }

  private releaseImages(): void {
    for (const { release } of this.held.values()) release();
    this.held.clear();
  }

  private warnNoGlyphs(): void {
    if (this.warnedNoGlyphs) return;
    this.warnedNoGlyphs = true;
    console.warn(
      'ng-map-symbol-layer: the map style has no `glyphs` (e.g. the `blank` style), so text labels are not shown.',
    );
  }
}

/**
 * Whether inline data has no feature ids, so the source should generate them (`generateId`, which
 * would overwrite ids the data has). A URL is not known yet: it keeps whatever ids it brings.
 */
function lacksIds(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const geojson = data as GeoJSON.GeoJSON;
  if (geojson.type === 'Feature') return geojson.id === undefined;
  if (geojson.type === 'FeatureCollection') {
    // An empty collection says nothing yet: the data that replaces it may carry ids.
    return geojson.features.length > 0 && geojson.features.every((f) => f.id === undefined);
  }
  return false;
}

/**
 * Tells hovered features apart: by id, else (URL data without ids) by position and properties,
 * so moving straight from one symbol to another still reports the new one.
 */
function hoverKey(feature: NonNullable<MapLayerMouseEvent['features']>[number]): unknown {
  if (feature.id !== undefined) return feature.id;
  const geometry = feature.geometry as GeoJSON.Point | undefined;
  return JSON.stringify([geometry?.coordinates, feature.properties]);
}
