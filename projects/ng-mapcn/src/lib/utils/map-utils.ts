import type * as GeoJSON from 'geojson';
import { type Map as MapLibreMap, type MapMouseEvent } from 'maplibre-gl';

/** Current viewport state of a map (mapcn `MapViewport`). */
export interface MapViewport {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

/** Datum consumed by `ng-map-arc`. Extra properties are exposed to paint expressions via `["get", ...]`. */
export type MapArcDatum = {
  id: string | number;
  from: [number, number];
  to: [number, number];
} & Record<string, unknown>;

/** Payload emitted by `ng-map-arc` click/hover outputs. */
export interface MapArcEvent<T extends MapArcDatum = MapArcDatum> {
  arc: T;
  longitude: number;
  latitude: number;
  originalEvent: MapMouseEvent;
}

/** Payload emitted by `ng-map-geojson` click/hover outputs. */
export interface MapGeoJSONEvent<P = Record<string, unknown>> {
  feature: GeoJSON.Feature<GeoJSON.Geometry, P>;
  longitude: number;
  latitude: number;
  originalEvent: MapMouseEvent;
}

let idCounter = 0;

/** Deterministic unique id generator for sources/layers (replaces per-component Math.random ids). */
export function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

/** Read the current viewport from a MapLibre map. */
export function getViewport(map: MapLibreMap): MapViewport {
  const center = map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

/**
 * Merge a hover paint into a base paint by wrapping each overridden property in a
 * `["case", ["boolean", ["feature-state", "hover"], false], hoverValue, baseValue]`
 * expression. Requires the source to have `promoteId` so `setFeatureState` works.
 */
export function mergeHoverPaint<T extends Record<string, unknown>>(
  paint: T,
  hoverPaint: T | undefined,
): T {
  if (!hoverPaint) return paint;
  const merged: Record<string, unknown> = { ...paint };
  for (const [key, hoverValue] of Object.entries(hoverPaint)) {
    if (hoverValue === undefined) continue;
    const baseValue = merged[key];
    merged[key] =
      baseValue === undefined
        ? hoverValue
        : ['case', ['boolean', ['feature-state', 'hover'], false], hoverValue, baseValue];
  }
  return merged as T;
}

/**
 * Build the coordinates of a curved arc between two points as a quadratic
 * Bézier in lng/lat space, unwrapping the destination longitude so arcs that
 * cross the antimeridian (e.g. Tokyo -> San Francisco) curve the short way.
 * Resulting longitudes may leave [-180, 180]; MapLibre renders them correctly
 * on the globe, and on mercator with world copies.
 */
export function buildArcCoordinates(
  from: [number, number],
  to: [number, number],
  curvature: number,
  samples: number,
): [number, number][] {
  const [x0, y0] = from;
  const [xTo, y2] = to;
  const rawDx = xTo - x0;
  const x2 = rawDx > 180 ? xTo - 360 : rawDx < -180 ? xTo + 360 : xTo;
  const dx = x2 - x0;
  const dy = y2 - y0;
  const distance = Math.hypot(dx, dy);

  if (distance === 0 || curvature === 0) return [from, [x2, y2]];

  const mx = (x0 + x2) / 2;
  const my = (y0 + y2) / 2;
  const nx = -dy / distance;
  const ny = dx / distance;
  const offset = distance * curvature;
  const cx = mx + nx * offset;
  const cy = my + ny * offset;

  const points: [number, number][] = [];
  const segments = Math.max(2, Math.floor(samples));
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const inv = 1 - t;
    points.push([
      inv * inv * x0 + 2 * inv * t * cx + t * t * x2,
      inv * inv * y0 + 2 * inv * t * cy + t * t * y2,
    ]);
  }
  return points;
}
