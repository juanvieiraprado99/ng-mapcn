import { BLOCKS } from '../projects/demo/src/app/blocks/registry';

/**
 * Single source of truth for the pages the cross-cutting specs (smoke, SSR/hydration, axe) visit.
 * A new component adds its docs page here (and to `DOCS_COMPONENT_PAGES`); block routes come from
 * the demo's block registry automatically.
 */
export const DOCS_COMPONENT_PAGES = [
  'map',
  'controls',
  'markers',
  'popups',
  'routes',
  'arcs',
  'geojson',
  'clusters',
  'heatmap',
  'tile-sources',
  '3d',
  'advanced',
];

export const DOCS_PAGES = [
  '/docs',
  '/docs/installation',
  '/docs/api-reference',
  '/docs/basemaps',
  ...DOCS_COMPONENT_PAGES.map((name) => `/docs/components/${name}`),
];

export const BLOCK_VIEW_ROUTES = BLOCKS.map((block) => `/view/${block.name}`);

export const ROUTES = ['/', ...DOCS_PAGES, '/blocks', ...BLOCK_VIEW_ROUTES];

/**
 * How many maps each route renders (block previews on /blocks are iframes). Asserted as a minimum,
 * so a page that silently stops rendering its maps fails instead of passing with nothing to check.
 */
export const EXPECTED_MAPS: Record<string, number> = {
  '/': 6,
  '/docs': 0,
  '/docs/installation': 1,
  '/docs/api-reference': 0,
  '/docs/basemaps': 5,
  '/docs/components/map': 5,
  '/docs/components/controls': 1,
  '/docs/components/markers': 3,
  '/docs/components/popups': 1,
  '/docs/components/routes': 3,
  '/docs/components/arcs': 2,
  '/docs/components/geojson': 2,
  '/docs/components/clusters': 1,
  '/docs/components/heatmap': 1,
  '/docs/components/tile-sources': 3,
  '/docs/components/3d': 2,
  '/docs/components/advanced': 4,
  '/blocks': BLOCKS.length, // one iframe preview per block
};
