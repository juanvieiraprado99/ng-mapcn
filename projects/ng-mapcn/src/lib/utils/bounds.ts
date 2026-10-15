import type * as GeoJSON from 'geojson';
import type { LngLatBoundsLike, PaddingOptions } from 'maplibre-gl';

/** Plain bounds as `[west, south, east, north]`. */
export type BoundsTuple = [number, number, number, number];

/** Options of `ng-map`'s `fitBounds` input and of `MapContextService.fitBounds()`. */
export interface MapFitBoundsOptions {
  /**
   * Explicit bounds to fit. When omitted, the union of the bounds of the map's children
   * (markers, GeoJSON, routes, arcs, cluster layers, heatmaps) is used.
   */
  bounds?: LngLatBoundsLike;
  /** Padding around the bounds, in pixels (a number, or per side). */
  padding?: number | PaddingOptions;
  /** Maximum zoom the fit may reach. Defaults to 16, so a single point does not zoom to the street. */
  maxZoom?: number;
  /** Animation duration in milliseconds (MapLibre default when omitted). */
  duration?: number;
  /** `false` jumps to the bounds without animating. The very first automatic fit never animates. */
  animate?: boolean;
}

/** Default `maxZoom` of a fit. */
export const DEFAULT_FIT_MAX_ZOOM = 16;

/** A bounds source: anything MapLibre accepts as `LngLatBoundsLike`, or nothing to contribute. */
export type BoundsGetter = () => LngLatBoundsLike | null | undefined;

/** Normalizes any `LngLatBoundsLike` (arrays, `LngLatBounds`) to a tuple; `null` when invalid. */
export function toBoundsTuple(value: LngLatBoundsLike | null | undefined): BoundsTuple | null {
  if (!value) return null;
  let result: number[] | null = null;
  const v = value as unknown;
  if (Array.isArray(v)) {
    if (v.length === 4 && v.every((n) => typeof n === 'number')) {
      result = v as number[];
    } else if (v.length === 2) {
      const sw = toPair(v[0]);
      const ne = toPair(v[1]);
      if (sw && ne) result = [sw[0], sw[1], ne[0], ne[1]];
    }
  } else if (typeof (v as { getWest?: unknown }).getWest === 'function') {
    const b = v as { getWest(): number; getSouth(): number; getEast(): number; getNorth(): number };
    result = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  }
  return result && result.every(Number.isFinite) ? (result as unknown as BoundsTuple) : null;
}

function toPair(value: unknown): [number, number] | null {
  if (Array.isArray(value) && value.length >= 2) return [value[0], value[1]];
  const o = value as { lng?: number; lon?: number; lat?: number } | null;
  if (o && typeof o === 'object' && o.lat !== undefined) {
    const lng = o.lng ?? o.lon;
    if (lng !== undefined) return [lng, o.lat];
  }
  return null;
}

/** Smallest bounds containing every input; `null` when none is valid. */
export function unionBounds(
  all: Iterable<LngLatBoundsLike | null | undefined>,
): BoundsTuple | null {
  let acc: number[] | null = null;
  for (const item of all) {
    const b = toBoundsTuple(item);
    if (!b) continue;
    acc = acc
      ? [
          Math.min(acc[0], b[0]),
          Math.min(acc[1], b[1]),
          Math.max(acc[2], b[2]),
          Math.max(acc[3], b[3]),
        ]
      : [...b];
  }
  return acc as unknown as BoundsTuple | null;
}

/** Bounds of a list of `[lng, lat]` positions. */
export function coordinatesBounds(
  coordinates: Iterable<readonly number[] | null | undefined>,
): BoundsTuple | null {
  let acc: number[] | null = null;
  for (const c of coordinates) {
    if (!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    if (!acc) {
      acc = [c[0], c[1], c[0], c[1]];
    } else {
      acc[0] = Math.min(acc[0], c[0]);
      acc[1] = Math.min(acc[1], c[1]);
      acc[2] = Math.max(acc[2], c[0]);
      acc[3] = Math.max(acc[3], c[1]);
    }
  }
  return acc as unknown as BoundsTuple | null;
}

/** Bounds of GeoJSON data; `null` for a URL (not fetched) or empty data. */
export function geoJsonBounds(
  data: GeoJSON.GeoJSON | string | null | undefined,
): BoundsTuple | null {
  if (!data || typeof data === 'string') return null;
  return coordinatesBounds(geoJsonPositions(data));
}

function* geoJsonPositions(node: GeoJSON.GeoJSON | null | undefined): Generator<number[]> {
  if (!node) return;
  switch (node.type) {
    case 'FeatureCollection':
      for (const f of node.features) yield* geoJsonPositions(f);
      return;
    case 'Feature':
      yield* geoJsonPositions(node.geometry);
      return;
    case 'GeometryCollection':
      for (const g of node.geometries) yield* geoJsonPositions(g);
      return;
    default:
      yield* flatten(node.coordinates);
  }
}

function* flatten(coordinates: unknown): Generator<number[]> {
  if (!Array.isArray(coordinates)) return;
  if (typeof coordinates[0] === 'number') yield coordinates as number[];
  else for (const c of coordinates) yield* flatten(c);
}

/** Whether two bounds are the same (or both absent). */
export function sameBounds(a: BoundsTuple | null, b: BoundsTuple | null): boolean {
  if (a === b) return true;
  return !!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}
