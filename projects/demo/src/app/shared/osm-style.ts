import type { StyleSpecification } from 'maplibre-gl';

/**
 * Hand-built raster style: OpenStreetMap serves tiles, not a style.json. Kept as a module
 * constant so the reference is stable (`ng-map` compares the resolved style by identity before
 * calling `setStyle`). Its source id is `osm`: layer components must not reuse it.
 */
export const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

/** Copy-ready declaration of the same constant, for the generated snippets. */
export const OSM_RASTER_STYLE_CODE = `const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};`;
