import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  NgZone,
  output,
  untracked,
} from '@angular/core';
import {
  type GeoJSONSource,
  type LineLayerSpecification,
  type MapLayerMouseEvent,
} from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import {
  buildArcCoordinates,
  type MapArcDatum,
  type MapArcEvent,
  mergeHoverPaint,
  nextId,
} from '../../utils/map-utils';

type MapArcLinePaint = NonNullable<LineLayerSpecification['paint']>;
type MapArcLineLayout = NonNullable<LineLayerSpecification['layout']>;

const DEFAULT_ARC_CURVATURE = 0.2;
const DEFAULT_ARC_SAMPLES = 64;
const ARC_HIT_MIN_WIDTH = 12;
const ARC_HIT_PADDING = 6;

const DEFAULT_ARC_PAINT: MapArcLinePaint = {
  'line-color': '#4285F4',
  'line-width': 2,
  'line-opacity': 0.85,
};

const DEFAULT_ARC_LAYOUT: MapArcLineLayout = {
  'line-join': 'round',
  'line-cap': 'round',
};

/**
 * Draws curved arcs between origin/destination points (flight paths, network
 * links). Renders an invisible wide "hit" layer under the visible line so
 * hover/click UX stays comfortable at thin widths.
 */
@Component({
  selector: 'ng-map-arc',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapArcComponent<T extends MapArcDatum = MapArcDatum> {
  readonly data = input.required<T[]>();
  /** Optional unique identifier prefix for the source/layers. Auto-generated if not provided. */
  readonly id = input<string | undefined>(undefined);
  /** Perpendicular curvature relative to the segment length. 0 = straight line. */
  readonly curvature = input(DEFAULT_ARC_CURVATURE);
  /** Number of segments used to approximate each arc. */
  readonly samples = input(DEFAULT_ARC_SAMPLES);
  /** Line paint; merged onto the defaults. Datum extras are available via `["get", ...]`. */
  readonly paint = input<MapArcLinePaint | undefined>(undefined);
  readonly layout = input<MapArcLineLayout | undefined>(undefined);
  /** Paint applied to the hovered arc via feature-state. */
  readonly hoverPaint = input<MapArcLinePaint | undefined>(undefined);
  readonly interactive = input(true);
  /**
   * Optional MapLibre layer id to insert the arc layers before (z-order control).
   * Applied at layer creation only — later changes are ignored (mapcn parity).
   */
  readonly beforeId = input<string | undefined>(undefined);

  readonly arcClick = output<MapArcEvent<T>>();
  readonly arcHover = output<MapArcEvent<T> | null>();

  private readonly ctx = inject(MapContextService);
  private readonly zone = inject(NgZone);

  private readonly autoId = nextId('ng-arc');
  private readonly resolvedId = computed(() => this.id() ?? this.autoId);
  private readonly sourceId = computed(() => `arc-source-${this.resolvedId()}`);
  private readonly layerId = computed(() => `arc-layer-${this.resolvedId()}`);
  private readonly hitLayerId = computed(() => `arc-hit-layer-${this.resolvedId()}`);

  private readonly mergedPaint = computed<MapArcLinePaint>(() =>
    mergeHoverPaint({ ...DEFAULT_ARC_PAINT, ...this.paint() }, this.hoverPaint()),
  );
  private readonly mergedLayout = computed<MapArcLineLayout>(() => ({
    ...DEFAULT_ARC_LAYOUT,
    ...this.layout(),
  }));
  private readonly hitWidth = computed(() => {
    const w = this.paint()?.['line-width'] ?? DEFAULT_ARC_PAINT['line-width'];
    const base = typeof w === 'number' ? w : ARC_HIT_MIN_WIDTH;
    return Math.max(base + ARC_HIT_PADDING, ARC_HIT_MIN_WIDTH);
  });

  private readonly geoJSON = computed<GeoJSON.FeatureCollection<GeoJSON.LineString>>(() => {
    const curvature = this.curvature();
    const samples = this.samples();
    return {
      type: 'FeatureCollection',
      features: this.data().map((arc) => {
        const { from, to, ...properties } = arc;
        return {
          type: 'Feature',
          properties,
          geometry: {
            type: 'LineString',
            coordinates: buildArcCoordinates(from, to, curvature, samples),
          },
        };
      }),
    };
  });

  constructor() {
    // Add source and layers once the map style is loaded; re-runs after theme setStyle.
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;

      const sourceId = this.sourceId();
      const layerId = this.layerId();
      const hitLayerId = this.hitLayerId();
      const beforeId = untracked(() => this.beforeId());

      map.addSource(sourceId, {
        type: 'geojson',
        data: untracked(() => this.geoJSON()),
        promoteId: 'id',
      });

      map.addLayer(
        {
          id: hitLayerId,
          type: 'line',
          source: sourceId,
          layout: DEFAULT_ARC_LAYOUT,
          paint: {
            'line-color': 'rgba(0, 0, 0, 0)',
            'line-width': untracked(() => this.hitWidth()),
            'line-opacity': 1,
          },
        },
        beforeId,
      );

      map.addLayer(
        {
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: untracked(() => this.mergedLayout()),
          paint: untracked(() => this.mergedPaint()),
        },
        beforeId,
      );

      onCleanup(() => {
        try {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getLayer(hitLayerId)) map.removeLayer(hitLayerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        } catch {
          // style may be mid-reload
        }
      });
    });

    // Sync features when data / curvature / samples change.
    effect(() => {
      const geoJSON = this.geoJSON();
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;
      const source = map.getSource(this.sourceId()) as GeoJSONSource | undefined;
      source?.setData(geoJSON);
    });

    // Sync paint/layout when they change.
    effect(() => {
      const mergedPaint = this.mergedPaint();
      const mergedLayout = this.mergedLayout();
      const hitWidth = this.hitWidth();
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map) return;
      const layerId = this.layerId();
      if (!map.getLayer(layerId)) return;

      for (const [key, value] of Object.entries(mergedPaint)) {
        map.setPaintProperty(layerId, key as keyof MapArcLinePaint, value as never);
      }
      for (const [key, value] of Object.entries(mergedLayout)) {
        map.setLayoutProperty(layerId, key as keyof MapArcLineLayout, value as never);
      }
      const hitLayerId = this.hitLayerId();
      if (map.getLayer(hitLayerId)) {
        map.setPaintProperty(hitLayerId, 'line-width', hitWidth);
      }
    });

    // Interaction handlers (bound to the invisible hit layer).
    effect((onCleanup) => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map();
      if (!map || !this.interactive()) return;

      const sourceId = this.sourceId();
      const hitLayerId = this.hitLayerId();
      let hoveredId: string | number | null = null;

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

      const findArc = (featureId: string | number | undefined): T | undefined =>
        featureId == null
          ? undefined
          : untracked(() => this.data()).find((arc) => String(arc.id) === String(featureId));

      const handleMouseMove = (e: MapLayerMouseEvent) => {
        const featureId = e.features?.[0]?.id as string | number | undefined;
        if (featureId == null || featureId === hoveredId) return;

        setHover(featureId);
        map.getCanvas().style.cursor = 'pointer';

        const arc = findArc(featureId);
        if (arc) {
          // Map events fire outside the zone — re-enter for outputs
          this.zone.run(() =>
            this.arcHover.emit({
              arc,
              longitude: e.lngLat.lng,
              latitude: e.lngLat.lat,
              originalEvent: e,
            }),
          );
        }
      };

      const handleMouseLeave = () => {
        setHover(null);
        map.getCanvas().style.cursor = '';
        this.zone.run(() => this.arcHover.emit(null));
      };

      const handleClick = (e: MapLayerMouseEvent) => {
        const arc = findArc(e.features?.[0]?.id as string | number | undefined);
        if (!arc) return;
        this.zone.run(() =>
          this.arcClick.emit({
            arc,
            longitude: e.lngLat.lng,
            latitude: e.lngLat.lat,
            originalEvent: e,
          }),
        );
      };

      map.on('mousemove', hitLayerId, handleMouseMove);
      map.on('mouseleave', hitLayerId, handleMouseLeave);
      map.on('click', hitLayerId, handleClick);

      onCleanup(() => {
        map.off('mousemove', hitLayerId, handleMouseMove);
        map.off('mouseleave', hitLayerId, handleMouseLeave);
        map.off('click', hitLayerId, handleClick);
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
