import { BLOCKS } from '../projects/demo/src/app/blocks/registry';

/**
 * Single source of truth for the pages the cross-cutting specs (smoke, SSR/hydration, axe) visit.
 * A new component adds its docs page here (and to `DOCS_COMPONENT_PAGES`); block routes come from
 * the demo's block registry automatically.
 */
export const DOCS_COMPONENT_PAGES = [
  'map',
  'controls',
  'scale',
  'style-switcher',
  'minimap',
  'legend',
  'markers',
  'popups',
  'routes',
  'arcs',
  'geojson',
  'clusters',
  'heatmap',
  'symbols',
  'raster-source',
  'vector-source',
  'image-overlay',
  'fill-extrusion',
  'terrain',
  'draw',
  'advanced',
];

export const DOCS_PAGES = [
  '/docs',
  '/docs/installation',
  '/docs/testing',
  '/docs/api-reference',
  '/docs/basemaps',
  '/docs/roadmap',
  ...DOCS_COMPONENT_PAGES.map((name) => `/docs/components/${name}`),
];

export const BLOCK_VIEW_ROUTES = BLOCKS.map((block) => `/view/${block.name}`);

export const ROUTES = ['/', ...DOCS_PAGES, '/blocks', '/playground', ...BLOCK_VIEW_ROUTES];

/**
 * How many maps each route renders (block previews on /blocks are iframes). Asserted as a minimum,
 * so a page that silently stops rendering its maps fails instead of passing with nothing to check.
 */
export const EXPECTED_MAPS: Record<string, number> = {
  '/': 6,
  '/docs': 0,
  '/docs/installation': 1,
  '/docs/testing': 0,
  '/docs/api-reference': 0,
  '/docs/basemaps': 5,
  '/docs/roadmap': 0,
  '/docs/components/map': 5,
  '/docs/components/controls': 1,
  '/docs/components/scale': 2,
  '/docs/components/style-switcher': 1,
  '/docs/components/minimap': 2,
  '/docs/components/legend': 3,
  '/docs/components/markers': 4,
  '/docs/components/popups': 1,
  '/docs/components/routes': 4,
  '/docs/components/arcs': 2,
  '/docs/components/geojson': 2,
  '/docs/components/clusters': 1,
  '/docs/components/heatmap': 1,
  '/docs/components/symbols': 6,
  '/docs/components/raster-source': 1,
  '/docs/components/vector-source': 1,
  '/docs/components/image-overlay': 1,
  '/docs/components/fill-extrusion': 1,
  '/docs/components/terrain': 1,
  '/docs/components/draw': 1,
  '/docs/components/advanced': 4,
  '/blocks': BLOCKS.length, // one iframe preview per block
  '/playground': 8, // the playground map + one live preview per gallery style (7 presets)
};
