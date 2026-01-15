import { StyleSpecification } from 'maplibre-gl';

/**
 * Convert HSL color to RGB hex for MapLibre
 * HSL format: "hsl(221.2 83.2% 53.3%)"
 * Kept for potential future use in custom styles
 */
function hslToHex(hsl: string): string {
  const match = hsl.match(/hsl\(([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\)/);
  if (!match) return '#3b82f6'; // Default blue

  const h = parseFloat(match[1]) / 360;
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h < 1 / 6) {
    r = c; g = x; b = 0;
  } else if (h < 2 / 6) {
    r = x; g = c; b = 0;
  } else if (h < 3 / 6) {
    r = 0; g = c; b = x;
  } else if (h < 4 / 6) {
    r = 0; g = x; b = c;
  } else if (h < 5 / 6) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Default map styles following mapcn.dev pattern
 * Uses Carto basemaps for professional vector-based styling
 */
const defaultStyles = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

/**
 * Get light theme map style
 * Returns Carto Positron style (white/light map) for light mode
 * Following the pattern from mapcn.dev
 */
export function getLightMapStyle(): string | StyleSpecification {
  return defaultStyles.light;
}

/**
 * Get dark theme map style
 * Returns Carto Dark Matter style (black/dark map) for dark mode
 * Following the pattern from mapcn.dev
 */
export function getDarkMapStyle(): string | StyleSpecification {
  return defaultStyles.dark;
}
