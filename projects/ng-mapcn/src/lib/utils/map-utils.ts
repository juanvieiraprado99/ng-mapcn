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
 * Resulting longitudes may leave [-180, 180]. MapLibre still renders them on
 * the globe and on mercator, even a single world (`renderWorldCopies:
 * false`): its GeoJSON source moves the part past ±180 into the visible world.
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

const EARTH_RADIUS_M = 6371008.8;

/** Great-circle (haversine) distance in meters between two `[lng, lat]` points. */
function segmentLength(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLng = (b[0] - a[0]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Cumulative path length in meters at each vertex (`result[0]` is 0, `result[i]` the length of
 * `coordinates[0..i]`). Compute it once per coordinates array and pass it to
 * `sliceLineByProgress` / `pointAlongLine` to avoid re-measuring every segment on each call.
 */
export function cumulativeLengths(coordinates: readonly [number, number][]): number[] {
  const out: number[] = [];
  let total = 0;
  for (let i = 0; i < coordinates.length; i++) {
    if (i > 0) total += segmentLength(coordinates[i - 1], coordinates[i]);
    out.push(total);
  }
  return out;
}

/**
 * Walks `coordinates` up to `fraction` (clamped to 0–1) of the cumulative path length. Returns the
 * covered vertices plus the interpolated end point (`line`) and the end point itself (`point`).
 * Returns `null` for an empty path; a single vertex or a zero-length path yields that vertex.
 */
function walkLine(
  coordinates: readonly [number, number][],
  fraction: number,
  cumulative: readonly number[],
): { line: [number, number][]; point: [number, number] } | null {
  if (coordinates.length === 0) return null;
  const f = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
  const first = coordinates[0];
  const total = cumulative[coordinates.length - 1] ?? 0;
  if (coordinates.length === 1 || total === 0) return { line: [first], point: first };
  if (f >= 1) return { line: coordinates.map((c) => [c[0], c[1]]), point: coordinates.at(-1)! };

  const target = total * f;
  // First vertex i >= 1 whose cumulative length reaches the target: the cut is in segment i-1 → i.
  let lo = 1;
  let hi = coordinates.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] >= target) hi = mid;
    else lo = mid + 1;
  }
  const i = lo;
  if (cumulative[i] < target) {
    // Unreachable in practice (float guard): the target lies past the end.
    return { line: coordinates.map((c) => [c[0], c[1]]), point: coordinates.at(-1)! };
  }
  const walked = cumulative[i - 1];
  const len = cumulative[i] - walked;
  const t = len === 0 ? 0 : (target - walked) / len;
  const A = coordinates[i - 1];
  const B = coordinates[i];
  const point: [number, number] = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
  const line: [number, number][] = [];
  for (let k = 0; k < i; k++) line.push([coordinates[k][0], coordinates[k][1]]);
  if (t > 0) line.push(point);
  return { line, point };
}

/**
 * The covered part of a route: `coordinates` cut at `progress` (0–1) of the cumulative distance,
 * ending with an interpolated point inside the segment where the cut falls. `progress` is clamped.
 * Returns `[]` for an empty path and a single vertex at progress 0 (not drawable as a line).
 * Pass a precomputed `cumulative` (see `cumulativeLengths`) when calling repeatedly on the same path.
 */
export function sliceLineByProgress(
  coordinates: readonly [number, number][],
  progress: number,
  cumulative: readonly number[] = cumulativeLengths(coordinates),
): [number, number][] {
  return walkLine(coordinates, progress, cumulative)?.line ?? [];
}

/** The `[lng, lat]` at `fraction` (0–1, clamped) of the cumulative distance, or `null` if empty. */
export function pointAlongLine(
  coordinates: readonly [number, number][],
  fraction: number,
  cumulative: readonly number[] = cumulativeLengths(coordinates),
): [number, number] | null {
  return walkLine(coordinates, fraction, cumulative)?.point ?? null;
}
