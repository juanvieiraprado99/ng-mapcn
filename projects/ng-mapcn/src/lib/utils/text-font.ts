import { type Map as MapLibreMap } from 'maplibre-gl';

/** Served by the Carto (default), OpenFreeMap and MapTiler glyph servers. */
export const FALLBACK_TEXT_FONT = ['Noto Sans Regular'];

/**
 * Font stack for the count labels. Glyph servers only serve their own fonts (Carto has no
 * "Open Sans", Stadia only "Stadia *"), so reuse the first literal `text-font` of the
 * basemap's own symbol layers, which its `glyphs` server is known to serve. Upright stacks win
 * over italic ones (water labels usually come first).
 */
export function basemapTextFont(map: MapLibreMap): string[] {
  let italic: string[] | null = null;
  for (const layer of map.getStyle()?.layers ?? []) {
    if (layer.type !== 'symbol') continue;
    const font = fontStack(layer.layout?.['text-font']);
    if (!font) continue;
    if (!/italic/i.test(font[0])) return font;
    italic ??= font;
  }
  return italic ?? FALLBACK_TEXT_FONT;
}

/** A literal font stack (`[...]` or `['literal', [...]]`); data-driven expressions return null. */
export function fontStack(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value[0] === 'literal') return fontStack(value[1]);
  if (!value.every((f) => typeof f === 'string')) return null;
  // Expressions start with an operator (`get`, `case`, `coalesce`...); font names are capitalized.
  return /^[a-z][a-z-]*$/.test(value[0]) ? null : value;
}
