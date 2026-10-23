import type { StyleSpecification } from 'maplibre-gl';

interface RasterStyleOptions {
  /** Source and layer id; layer components must not reuse it. */
  id: string;
  tiles: string;
  attribution: string;
  maxzoom: number;
}

/**
 * Hand-built raster style for tile services that serve no style.json, plus its copy-ready
 * declaration. Built once at module load, so the reference is stable (`ng-map` compares the
 * resolved style by identity before calling `setStyle`).
 */
function rasterStyle(
  constName: string,
  { id, tiles, attribution, maxzoom }: RasterStyleOptions,
): { style: StyleSpecification; code: { name: string; declaration: string } } {
  const style: StyleSpecification = {
    version: 8,
    sources: { [id]: { type: 'raster', tiles: [tiles], tileSize: 256, maxzoom, attribution } },
    layers: [{ id, type: 'raster', source: id }],
  };
  const declaration = `const ${constName}: StyleSpecification = {
  version: 8,
  sources: {
    ${id.includes('-') ? `'${id}'` : id}: {
      type: 'raster',
      tiles: ['${tiles}'],
      tileSize: 256,
      maxzoom: ${maxzoom},
      attribution: '${attribution.replace(/'/g, "\\'")}',
    },
  },
  layers: [{ id: '${id}', type: 'raster', source: '${id}' }],
};`;
  return { style, code: { name: constName, declaration } };
}

/** Esri World Imagery: satellite and aerial photos, no key (Esri terms of use apply). */
export const ESRI_IMAGERY = rasterStyle('IMAGERY_STYLE', {
  id: 'imagery',
  tiles:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles © Esri, Maxar, Earthstar Geographics and the GIS User Community',
  maxzoom: 19,
});

/** OpenStreetMap France's Humanitarian style (HOT), raster tiles. */
export const OSM_HUMANITARIAN = rasterStyle('HOT_STYLE', {
  id: 'osm-hot',
  tiles: 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors, tiles by HOT and OSM France',
  maxzoom: 19,
});
