import { type StyleSpecification } from 'maplibre-gl';

/**
 * Per-theme basemap overrides (mapcn `styles` prop). A theme left undefined
 * falls back to the Carto default for that theme.
 */
export interface MapStylesConfig {
  light?: string | StyleSpecification;
  dark?: string | StyleSpecification;
}

/**
 * Default map styles following mapcn.dev pattern
 * Uses Carto basemaps for professional vector-based styling
 */
export const defaultStyles: Record<'light' | 'dark', string> = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

/**
 * Style without tiles and with a transparent background — for dataviz
 * (choropleth, arcs) without a basemap. Enabled by the `blank` input on
 * `ng-map`; the themed container CSS shows through behind it.
 */
export const blankMapStyle: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': 'rgba(0, 0, 0, 0)' },
    },
  ],
};

/**
 * Get light theme map style
 * Returns Carto Positron style (white/light map) for light mode
 */
export function getLightMapStyle(): string | StyleSpecification {
  return defaultStyles.light;
}

/**
 * Get dark theme map style
 * Returns Carto Dark Matter style (black/dark map) for dark mode
 */
export function getDarkMapStyle(): string | StyleSpecification {
  return defaultStyles.dark;
}
