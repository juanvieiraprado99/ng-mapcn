import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  NgZone,
  output,
  signal,
  untracked,
} from '@angular/core';
import { MapContextService } from 'ng-mapcn';
import {
  type GeoJSONStoreFeatures,
  TerraDraw,
  TerraDrawLineStringMode,
  TerraDrawPointMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';

import { buildDrawStyles, type DrawHexColor } from './draw-styles';

/** Shapes the user can draw. */
export type MapDrawShape = 'point' | 'line' | 'polygon';

/**
 * Interaction mode: a drawing shape, `select` (pick, drag and edit existing features) or
 * `static` (no interaction, features are only displayed).
 */
export type MapDrawMode = MapDrawShape | 'select' | 'static';

/** Properties carried by drawn features; `mode` is the shape they were drawn with. */
export type MapDrawProperties = { mode?: MapDrawShape } & Record<string, unknown>;

export type MapDrawGeometry = GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon;
export type MapDrawFeature = GeoJSON.Feature<MapDrawGeometry, MapDrawProperties> & {
  id: string | number;
};
export type MapDrawFeatureCollection = GeoJSON.FeatureCollection<
  MapDrawGeometry,
  MapDrawProperties
>;

/** Emitted by `drawEnd` (a feature was completed) and `featureEdit` (an existing one changed). */
export interface MapDrawEvent {
  feature: MapDrawFeature;
  /** Shape of the feature. */
  mode: MapDrawShape;
  /** What finished, as reported by terra-draw (`draw`, `edit`, `dragFeature`, ...). */
  action: string;
}

const SHAPES: readonly MapDrawShape[] = ['point', 'line', 'polygon'];
const GEOMETRY_SHAPE: Record<string, MapDrawShape | undefined> = {
  Point: 'point',
  LineString: 'line',
  Polygon: 'polygon',
};
/** Terra-draw store features that only guide the interaction (never user data). */
const GUIDANCE_KEYS = [
  'edited',
  'selectionPoint',
  'midPoint',
  'closingPoint',
  'snappingPoint',
  'coordinatePoint',
] as const;
/** Properties owned by terra-draw; everything else on a feature is user data. */
const RESERVED_KEYS = new Set<string>(['mode', 'selected', 'currentlyDrawing', ...GUIDANCE_KEYS]);

const EMPTY: MapDrawFeatureCollection = { type: 'FeatureCollection', features: [] };

/** Completed features of a terra-draw snapshot, without guidance points or transient state. */
function finishedFeatures(
  snapshot: readonly GeoJSONStoreFeatures[],
  shapes: ReadonlySet<string>,
): MapDrawFeature[] {
  const result: MapDrawFeature[] = [];
  for (const feature of snapshot) {
    const props = feature.properties as Record<string, unknown>;
    const mode = props['mode'];
    if (typeof mode !== 'string' || !shapes.has(mode)) continue;
    if (props['currentlyDrawing'] || GUIDANCE_KEYS.some((key) => props[key])) continue;
    const { selected: _selected, ...rest } = props;
    result.push({ ...feature, properties: rest } as unknown as MapDrawFeature);
  }
  return result;
}

function toCollection(features: MapDrawFeature[]): MapDrawFeatureCollection {
  return { type: 'FeatureCollection', features };
}

function serialize(features: readonly MapDrawFeature[]): string {
  return JSON.stringify(features.map((f) => [f.id, f.geometry, f.properties]));
}

function userProperties(props: Record<string, unknown> | null | undefined) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props ?? {})) {
    if (!RESERVED_KEYS.has(key)) out[key] = value;
  }
  return out;
}

/**
 * Draws, edits and deletes points, lines and polygons on the map, built on
 * [terra-draw](https://terradraw.dev). Drop it inside `<ng-map>`.
 *
 * Lives in the optional `ng-mapcn/draw` entry point and needs the `terra-draw` and
 * `terra-draw-maplibre-gl-adapter` peer dependencies.
 *
 * `features` is a GeoJSON `FeatureCollection` of points, lines and polygons. It is the source of
 * truth: it updates whenever a draw, edit or delete completes (not on every mouse move), and
 * assigning a new collection replaces what is shown. Features without an `id` get one; features
 * whose geometry is not a Point, LineString or Polygon, or that terra-draw rejects, are dropped
 * and reported through `mapError`.
 *
 * A theme switch (`setStyle`) destroys terra-draw's layers, so the controller is stopped and
 * restarted on the new style with the same features. Changing `modes`, `editable` or `color`
 * restarts it too. An unfinished shape is lost on a restart.
 *
 * Keyboard: terra-draw finishes a shape with Enter, cancels it with Escape and deletes the
 * selected feature with Delete.
 */
@Component({
  selector: 'ng-map-draw',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapDrawComponent {
  /** Shapes the user can draw. */
  readonly modes = input<readonly MapDrawShape[]>(SHAPES);
  /** Active interaction mode; `static` (default) shows the features without drawing. */
  readonly mode = model<MapDrawMode>('static');
  /** The drawn features (two-way). */
  readonly features = model<MapDrawFeatureCollection>(EMPTY);
  /** Enables the `select` mode: select, drag, reshape and delete features. */
  readonly editable = input(true);
  /** Accent color (`#rrggbb`) of the drawn shapes; defaults to a theme-aware blue. */
  readonly color = input<DrawHexColor>();

  /** A new shape was completed. */
  readonly drawEnd = output<MapDrawEvent>();
  /** An existing feature was moved, reshaped or otherwise edited. */
  readonly featureEdit = output<MapDrawEvent>();
  /** A feature was selected (`select` mode). */
  readonly featureSelect = output<MapDrawFeature>();
  /** The selection was cleared; emits the id of the deselected feature. */
  readonly featureDeselect = output<string | number>();

  private readonly ctx = inject(MapContextService);
  private readonly zone = inject(NgZone);

  /** The running terra-draw instance; null while the style is not loaded. */
  private readonly instance = signal<TerraDraw | null>(null);
  private shapes: ReadonlySet<string> = new Set();
  private editableNow = false;
  /** Serialized features terra-draw currently holds; the guard against model/draw echo loops. */
  private appliedKey: string | null = null;

  constructor() {
    // Start terra-draw once the style is loaded; re-runs (restart) after a theme setStyle.
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;
      const shapes = this.modes().filter((m) => SHAPES.includes(m));
      const editable = this.editable();
      const color = this.color();
      const theme = untracked(() => this.ctx.resolvedTheme());

      const draw = this.start(map, shapes, editable, buildDrawStyles(theme, color));
      if (!draw) return;
      this.shapes = new Set(shapes);
      this.editableNow = editable;

      const onFinish = (id: string | number, context: { mode: string; action: string }) => {
        this.syncFromDraw(draw);
        const feature = this.snapshotFeature(draw, id);
        if (!feature) return;
        const event: MapDrawEvent = {
          feature,
          mode: feature.properties.mode as MapDrawShape,
          action: context.action,
        };
        this.zone.run(() =>
          context.action === 'draw' ? this.drawEnd.emit(event) : this.featureEdit.emit(event),
        );
      };
      const onChange = (_ids: (string | number)[], type: string) => {
        if (type === 'delete') this.syncFromDraw(draw);
      };
      const onSelect = (id: string | number) => {
        const feature = this.snapshotFeature(draw, id);
        if (feature) this.zone.run(() => this.featureSelect.emit(feature));
      };
      const onDeselect = (id: string | number) =>
        this.zone.run(() => this.featureDeselect.emit(id));
      draw.on('finish', onFinish);
      draw.on('change', onChange);
      draw.on('select', onSelect);
      draw.on('deselect', onDeselect);

      // Initial state, applied synchronously so the first frame already shows the features.
      this.appliedKey = null;
      untracked(() => {
        this.applyFeatures(draw, this.features());
        this.applyMode(draw, this.mode());
      });
      this.instance.set(draw);

      onCleanup(() => {
        draw.off('finish', onFinish);
        draw.off('change', onChange);
        draw.off('select', onSelect);
        draw.off('deselect', onDeselect);
        // Keep what the user drew across the restart; the model is the truth afterwards.
        try {
          this.syncFromDraw(draw);
        } catch {
          // Store already torn down.
        }
        this.instance.set(null);
        try {
          draw.stop();
        } catch {
          // The style (and terra-draw's layers) may already be gone after setStyle/map.remove.
        }
      });
    });

    // Model -> terra-draw.
    effect(() => {
      const value = this.features();
      const draw = this.instance();
      if (!draw) return;
      untracked(() => this.applyFeatures(draw, value));
    });

    // Active mode.
    effect(() => {
      const mode = this.mode();
      const draw = this.instance();
      if (!draw) return;
      untracked(() => this.applyMode(draw, mode));
    });
  }

  /** Removes every drawn feature. */
  clear(): void {
    const draw = this.instance();
    if (!draw) return;
    draw.clear();
    this.syncFromDraw(draw);
  }

  private start(
    map: NonNullable<ReturnType<MapContextService['map']>>,
    shapes: MapDrawShape[],
    editable: boolean,
    styles: ReturnType<typeof buildDrawStyles>,
  ): TerraDraw | null {
    try {
      return this.zone.runOutsideAngular(() => {
        const modes: ConstructorParameters<typeof TerraDraw>[0]['modes'] = [];
        if (shapes.includes('point')) {
          modes.push(new TerraDrawPointMode({ modeName: 'point', styles: styles.point as never }));
        }
        if (shapes.includes('line')) {
          modes.push(
            new TerraDrawLineStringMode({ modeName: 'line', styles: styles.line as never }),
          );
        }
        if (shapes.includes('polygon')) {
          modes.push(
            new TerraDrawPolygonMode({ modeName: 'polygon', styles: styles.polygon as never }),
          );
        }
        if (editable) {
          const coordinates = { midpoints: true, draggable: true, deletable: true };
          modes.push(
            new TerraDrawSelectMode({
              styles: styles.select as never,
              flags: {
                point: { feature: { draggable: true } },
                line: { feature: { draggable: true, coordinates } },
                polygon: { feature: { draggable: true, coordinates } },
              },
            }),
          );
        }
        const draw = new TerraDraw({ adapter: new TerraDrawMapLibreGLAdapter({ map }), modes });
        draw.start();
        return draw;
      });
    } catch (error) {
      this.ctx.reportError(error);
      return null;
    }
  }

  private snapshotFeature(draw: TerraDraw, id: string | number): MapDrawFeature | undefined {
    const feature = draw.getSnapshotFeature(id);
    return feature ? finishedFeatures([feature], this.shapes)[0] : undefined;
  }

  /** terra-draw -> model; a no-op when nothing changed since the last sync. */
  private syncFromDraw(draw: TerraDraw): void {
    const features = finishedFeatures(draw.getSnapshot(), this.shapes);
    const key = serialize(features);
    if (key === this.appliedKey) return;
    this.appliedKey = key;
    this.zone.run(() => this.features.set(toCollection(features)));
  }

  /** Model -> terra-draw: diffs by feature id instead of replacing the store. */
  private applyFeatures(draw: TerraDraw, value: MapDrawFeatureCollection | null): void {
    const input = (value?.features ?? []) as MapDrawFeature[];
    const inputKey = serialize(input);
    if (inputKey === this.appliedKey) return;
    try {
      const current = new Map(
        finishedFeatures(draw.getSnapshot(), this.shapes).map((f) => [f.id, f]),
      );
      const prepared: MapDrawFeature[] = [];
      for (const feature of input) {
        const shape = GEOMETRY_SHAPE[feature.geometry?.type];
        if (!shape) {
          this.ctx.reportError(
            new Error(`ng-map-draw: unsupported geometry "${feature.geometry?.type}" ignored.`),
          );
          continue;
        }
        prepared.push({
          ...feature,
          id: feature.id ?? draw.getFeatureId(),
          properties: { ...feature.properties, mode: feature.properties?.mode ?? shape },
        });
      }

      const wanted = new Set(prepared.map((f) => f.id));
      const stale = [...current.keys()].filter((id) => !wanted.has(id));
      if (stale.length) draw.removeFeatures(stale);

      const added = prepared.filter((f) => !current.has(f.id));
      if (added.length) {
        const results = draw.addFeatures(added as unknown as GeoJSONStoreFeatures[]);
        for (const result of results) {
          if (!result.valid) {
            this.ctx.reportError(
              new Error(`ng-map-draw: feature ${result.id ?? ''} rejected: ${result.reason}`),
            );
          }
        }
      }
      for (const feature of prepared) {
        const existing = current.get(feature.id);
        if (!existing) continue;
        if (JSON.stringify(existing.geometry) !== JSON.stringify(feature.geometry)) {
          draw.updateFeatureGeometry(feature.id, feature.geometry as never);
        }
        const next = userProperties(feature.properties);
        const previous = userProperties(existing.properties);
        if (JSON.stringify(next) !== JSON.stringify(previous)) {
          const patch: Record<string, unknown> = { ...next };
          for (const key of Object.keys(previous)) if (!(key in next)) patch[key] = undefined;
          draw.updateFeatureProperties(feature.id, patch as never);
        }
      }
    } catch (error) {
      this.ctx.reportError(error);
    }

    // terra-draw now holds the truth (assigned ids, dropped features); mirror it in the model.
    const features = finishedFeatures(draw.getSnapshot(), this.shapes);
    this.appliedKey = serialize(features);
    if (inputKey !== this.appliedKey) this.features.set(toCollection(features));
  }

  private applyMode(draw: TerraDraw, mode: MapDrawMode): void {
    const available =
      mode === 'static' || (mode === 'select' ? this.editableNow : this.shapes.has(mode));
    const target = available ? mode : 'static';
    try {
      if (draw.getMode() !== target) draw.setMode(target);
    } catch (error) {
      this.ctx.reportError(error);
    }
  }
}
