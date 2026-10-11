type LngLat = [number, number];

/** Rough planar distance; plenty for splitting a city-scale route. */
function segmentLength([x0, y0]: LngLat, [x1, y1]: LngLat): number {
  const latScale = Math.cos((((y0 + y1) / 2) * Math.PI) / 180);
  return Math.hypot((x1 - x0) * latScale, y1 - y0);
}

/**
 * Splits a route at `fraction` (0–1) of its length: the covered part, the
 * point where the courier is, and the part still ahead. ng-mapcn draws each
 * part as its own `ng-map-route` (mapcn's `RouteProgress` / `RouteMarker`).
 */
export function splitRoute(
  coordinates: LngLat[],
  fraction: number,
): { covered: LngLat[]; position: LngLat | null } {
  if (coordinates.length < 2) return { covered: coordinates, position: coordinates[0] ?? null };

  const lengths = coordinates.slice(1).map((point, i) => segmentLength(coordinates[i], point));
  const target =
    lengths.reduce((sum, length) => sum + length, 0) * Math.min(Math.max(fraction, 0), 1);

  let walked = 0;
  for (let i = 0; i < lengths.length; i++) {
    if (walked + lengths[i] >= target) {
      const t = lengths[i] ? (target - walked) / lengths[i] : 0;
      const [x0, y0] = coordinates[i];
      const [x1, y1] = coordinates[i + 1];
      const position: LngLat = [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
      return { covered: [...coordinates.slice(0, i + 1), position], position };
    }
    walked += lengths[i];
  }
  const last = coordinates[coordinates.length - 1];
  return { covered: coordinates, position: last };
}
