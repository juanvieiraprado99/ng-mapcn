/**
 * Single source of truth for the site navigation (mirrors mapcn's
 * `site-navigation.ts`): header nav, mobile sheet, command search, docs
 * sidebar and the docs prev/next links all read from here.
 */
export interface SiteNavigationItem {
  title: string;
  href: string;
  /** lucide icon registered by the consumer (command search). */
  icon: 'lucideBookOpen' | 'lucideLayers2' | 'lucideCornerDownRight';
  /** Static file served from `public/` (opened in a new tab, not routed). */
  file?: boolean;
}

export interface SiteNavigationGroup {
  title: string;
  items: SiteNavigationItem[];
}

export const docsNavigation: SiteNavigationGroup[] = [
  {
    title: 'Basics',
    items: [
      { title: 'Getting Started', href: '/docs', icon: 'lucideBookOpen' },
      { title: 'Installation', href: '/docs/installation', icon: 'lucideBookOpen' },
      { title: 'llms.txt', href: '/llms.txt', icon: 'lucideBookOpen', file: true },
      { title: 'API Reference', href: '/docs/api-reference', icon: 'lucideBookOpen' },
      { title: 'Map Styles', href: '/docs/basemaps', icon: 'lucideBookOpen' },
    ],
  },
  {
    title: 'Components',
    items: [
      { title: 'Map', href: '/docs/components/map', icon: 'lucideLayers2' },
      { title: 'Controls', href: '/docs/components/controls', icon: 'lucideLayers2' },
      { title: 'Markers', href: '/docs/components/markers', icon: 'lucideLayers2' },
      { title: 'Popups', href: '/docs/components/popups', icon: 'lucideLayers2' },
      { title: 'Routes', href: '/docs/components/routes', icon: 'lucideLayers2' },
      { title: 'Arcs', href: '/docs/components/arcs', icon: 'lucideLayers2' },
      { title: 'GeoJSON', href: '/docs/components/geojson', icon: 'lucideLayers2' },
      { title: 'Clusters', href: '/docs/components/clusters', icon: 'lucideLayers2' },
      { title: 'Heatmap', href: '/docs/components/heatmap', icon: 'lucideLayers2' },
      { title: 'Tile Sources', href: '/docs/components/tile-sources', icon: 'lucideLayers2' },
      { title: '3D Buildings & Terrain', href: '/docs/components/3d', icon: 'lucideLayers2' },
      { title: 'Draw', href: '/docs/components/draw', icon: 'lucideLayers2' },
      { title: 'Advanced', href: '/docs/components/advanced', icon: 'lucideLayers2' },
    ],
  },
];

const pageItems: SiteNavigationItem[] = [
  { title: 'Home', href: '/', icon: 'lucideCornerDownRight' },
  { title: 'Docs', href: '/docs', icon: 'lucideCornerDownRight' },
  { title: 'Components', href: '/docs/components/map', icon: 'lucideCornerDownRight' },
  { title: 'Blocks', href: '/blocks', icon: 'lucideCornerDownRight' },
  { title: 'Playground', href: '/playground', icon: 'lucideCornerDownRight' },
];

export const siteNavigation: SiteNavigationGroup[] = [
  { title: 'Pages', items: pageItems },
  ...docsNavigation,
];

/** Header links: every page except Home. */
export const mainNavItems = pageItems.filter((item) => item.title !== 'Home');

/** Flat docs order, used for the prev/next links at the bottom of each page. */
const docsOrder = docsNavigation.flatMap((group) => group.items).filter((item) => !item.file);

export function docsNeighbours(href: string): {
  prev?: SiteNavigationItem;
  next?: SiteNavigationItem;
} {
  const index = docsOrder.findIndex((item) => item.href === href);
  if (index === -1) return {};
  return { prev: docsOrder[index - 1], next: docsOrder[index + 1] };
}

/** `owner/name`, for the GitHub REST API. */
export const GITHUB_REPO = 'juanvieiraprado99/ng-mapcn';
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;
