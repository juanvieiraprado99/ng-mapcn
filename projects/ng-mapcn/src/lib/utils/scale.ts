/** Metres of Earth's circumference at the equator (WGS 84, spherical web mercator). */
const EARTH_CIRCUMFERENCE_M = 40075016.686;
/** MapLibre tile size in pixels. */
const TILE_SIZE = 512;
const METERS_PER_FOOT = 0.3048;
const METERS_PER_MILE = 1609.344;
const FEET_PER_MILE = 5280;

/** A scale bar reading: `value` in `unit`, drawn `width` pixels long. */
export interface ScaleReading {
  value: number;
  unit: 'meter' | 'kilometer' | 'foot' | 'mile';
  /** Bar length in pixels. */
  width: number;
}

/** Ground metres covered by one screen pixel at `latitude` and `zoom`. */
export function metersPerPixel(latitude: number, zoom: number): number {
  return (EARTH_CIRCUMFERENCE_M * Math.cos((latitude * Math.PI) / 180)) / (TILE_SIZE * 2 ** zoom);
}

/** Largest 1/2/5 × 10ⁿ value that is not greater than `distance` (`distance` > 0). */
function niceValue(distance: number): number {
  let exponent = Math.floor(Math.log10(distance));
  // Guard against log10 rounding at exact powers of ten.
  if (10 ** (exponent + 1) <= distance) exponent++;
  else if (10 ** exponent > distance) exponent--;
  const base = 10 ** exponent;
  return [5, 2, 1].map((m) => m * base).find((v) => v <= distance) ?? base;
}

/**
 * Picks the largest round scale-bar length whose bar fits in `maxWidth` pixels.
 * Metric switches to kilometres at 1000 m; imperial uses miles at 5280 ft.
 */
export function computeScale(
  metersPerPixel: number,
  maxWidth: number,
  system: 'metric' | 'imperial',
): ScaleReading {
  const maxMeters = maxWidth * metersPerPixel;
  if (system === 'metric') {
    if (maxMeters >= 1000) {
      const value = niceValue(maxMeters / 1000);
      return { value, unit: 'kilometer', width: (value * 1000) / metersPerPixel };
    }
    const value = niceValue(maxMeters);
    return { value, unit: 'meter', width: value / metersPerPixel };
  }
  const maxFeet = maxMeters / METERS_PER_FOOT;
  if (maxFeet >= FEET_PER_MILE) {
    const value = niceValue(maxMeters / METERS_PER_MILE);
    return { value, unit: 'mile', width: (value * METERS_PER_MILE) / metersPerPixel };
  }
  const value = niceValue(maxFeet);
  return { value, unit: 'foot', width: (value * METERS_PER_FOOT) / metersPerPixel };
}
