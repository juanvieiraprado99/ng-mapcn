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
  type Coordinates,
  type ImageSource,
  type ImageSourceSpecification,
  type RasterLayerSpecification,
} from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { syncLayerProperties } from '../../utils/layer-properties';
import { addMapLayers, removeLayersUsingSource } from '../../utils/layers';
import { nextId } from '../../utils/map-utils';

/**
 * The four `[lng, lat]` corners of an image overlay, clockwise from the top-left:
 * top-left, top-right, bottom-right, bottom-left.
 */
export type ImageOverlayCoordinates = readonly [
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
];

type MapImagePaint = NonNullable<RasterLayerSpecification['paint']>;

const toCoordinates = (corners: ImageOverlayCoordinates): Coordinates =>
  corners.map((corner) => [corner[0], corner[1]]) as Coordinates;

const sameCoordinates = (a: ImageOverlayCoordinates | null, b: ImageOverlayCoordinates) =>
  !!a && a.every((corner, i) => corner[0] === b[i][0] && corner[1] === b[i][1]);

/**
 * Georeferenced image drawn on the map between four corner coordinates (a scanned map, a radar
 * frame, a floor plan). Drop it inside `<ng-map>`.
 *
 * Ids: the MapLibre image source is exactly `id` (auto-generated when omitted) and is announced
 * through `MapContextService.hasSource(id)`; the raster layer is `image-layer-<id>`.
 *
 * `url` and `coordinates` are updated in place (`updateImage` / `setCoordinates`); `opacity`,
 * `visible` and `paint` are reconciled live; `beforeId` is applied at creation. After a theme
 * switch the source and layer are re-added. To avoid a flash when `url` changes, set
 * `paint` to `{ 'raster-fade-duration': 0 }`.
 */
@Component({
  selector: 'ng-map-image-overlay',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapImageOverlayComponent {
  /**
   * Source id. Auto-generated if not provided. Changing it re-creates the source and layer.
   */
  readonly id = input<string>();
  /** Image URL. */
  readonly url = input.required<string>();
  /** Corners as `[lng, lat]`, clockwise from the top-left. */
  readonly coordinates = input.required<ImageOverlayCoordinates>();
  /** Layer opacity, 0..1 (number or MapLibre expression). */
  readonly opacity = input<number | readonly unknown[]>(1);
  /** Whether the layer is drawn. */
  readonly visible = input(true);
  /**
   * Optional MapLibre layer id to insert the layer before (z-order control).
   * Applied at layer creation only; later changes are ignored.
   */
  readonly beforeId = input<string>();
  /** Escape hatch: raster paint properties merged last. */
  readonly paint = input<MapImagePaint>();

  private readonly ctx = inject(MapContextService);

  private readonly autoId = nextId('ng-image-overlay');
  private readonly resolvedId = computed(() => this.id() ?? this.autoId);
  private readonly layerId = computed(() => `image-layer-${this.resolvedId()}`);

  private readonly created = signal(false);
  private appliedUrl: string | null = null;
  private appliedCoordinates: ImageOverlayCoordinates | null = null;
  private appliedVisible = true;
  private appliedPaintKeys: ReadonlySet<string> = new Set();

  private readonly mergedPaint = computed<MapImagePaint>(
    () => ({ 'raster-opacity': this.opacity(), ...(this.paint() ?? {}) }) as MapImagePaint,
  );

  constructor() {
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      const sourceId = this.resolvedId();
      const layerId = this.layerId();
      const url = untracked(() => this.url());
      const coordinates = untracked(() => this.coordinates());
      const beforeId = untracked(() => this.beforeId());
      const paint = untracked(() => this.mergedPaint());
      const visible = untracked(() => this.visible());

      const teardown = addMapLayers(
        map,
        (b) => {
          b.addSource(sourceId, {
            type: 'image',
            url,
            coordinates: toCoordinates(coordinates),
          } as ImageSourceSpecification);
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
      this.appliedCoordinates = coordinates;
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

    // Swap the image and/or move the corners on the live source.
    effect(() => {
      const url = this.url();
      const coordinates = this.coordinates();
      if (!this.created()) return;
      const map = this.ctx.map();
      const source = map?.getSource(this.resolvedId()) as ImageSource | undefined;
      if (!source) return;
      if (url !== this.appliedUrl) {
        source.updateImage({ url, coordinates: toCoordinates(coordinates) });
        this.appliedUrl = url;
        this.appliedCoordinates = coordinates;
      } else if (!sameCoordinates(this.appliedCoordinates, coordinates)) {
        source.setCoordinates(toCoordinates(coordinates));
        this.appliedCoordinates = coordinates;
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
