/** Whether two tile URL template lists hold the same URLs in the same order. */
export function sameTiles(
  a: readonly string[] | undefined,
  b: readonly string[] | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((tile, i) => tile === b[i]);
}

/** Bounding box `[west, south, east, north]` in degrees. */
export type TileBounds = readonly [number, number, number, number];

/** Tile addressing scheme: `xyz` (slippy map, default) or `tms` (flipped Y axis). */
export type TileScheme = 'xyz' | 'tms';

/**
 * Keeps only the defined values, so options left unset on a source component do not override
 * what a TileJSON `url` provides (zoom range, bounds, attribution).
 */
export function definedOptions<T extends Record<string, unknown>>(options: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
