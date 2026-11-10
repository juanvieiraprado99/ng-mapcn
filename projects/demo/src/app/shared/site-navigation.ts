import type { Localized } from './i18n/messages';

/**
 * Single source of truth for the site navigation (mirrors mapcn's
 * `site-navigation.ts`): header nav, mobile sheet, command search, docs
 * sidebar and the docs prev/next links all read from here.
 */
export interface SiteNavigationItem {
  /** Per language; render it with `LanguageService.text()`. */
  title: Localized<string>;
  href: string;
  /** lucide icon registered by the consumer (command search). */
  icon: 'lucideBookOpen' | 'lucideLayers2' | 'lucideCornerDownRight';
  /** Static file served from `public/` (opened in a new tab, not routed). */
  file?: boolean;
}

export interface SiteNavigationGroup {
  title: Localized<string>;
  items: SiteNavigationItem[];
}

/** Names that read the same in every language (component names, file names). */
const same = (title: string): Localized<string> => ({ en: title, 'pt-BR': title });

export const docsNavigation: SiteNavigationGroup[] = [
  {
    title: { en: 'Basics', 'pt-BR': 'Básico' },
    items: [
      {
        title: { en: 'Getting Started', 'pt-BR': 'Primeiros passos' },
        href: '/docs',
        icon: 'lucideBookOpen',
      },
      {
        title: { en: 'Installation', 'pt-BR': 'Instalação' },
        href: '/docs/installation',
        icon: 'lucideBookOpen',
      },
      {
        title: { en: 'Testing your maps', 'pt-BR': 'Testando seus mapas' },
        href: '/docs/testing',
        icon: 'lucideBookOpen',
      },
      { title: same('llms.txt'), href: '/llms.txt', icon: 'lucideBookOpen', file: true },
      {
        title: { en: 'API Reference', 'pt-BR': 'Referência da API' },
        href: '/docs/api-reference',
        icon: 'lucideBookOpen',
      },
      {
        title: { en: 'Map Styles', 'pt-BR': 'Estilos de mapa' },
        href: '/docs/basemaps',
        icon: 'lucideBookOpen',
      },
      { title: same('Roadmap'), href: '/docs/roadmap', icon: 'lucideBookOpen' },
    ],
  },
  {
    title: { en: 'Components', 'pt-BR': 'Componentes' },
    items: [
      { title: same('Map'), href: '/docs/components/map', icon: 'lucideLayers2' },
      {
        title: { en: 'Controls', 'pt-BR': 'Controles' },
        href: '/docs/components/controls',
        icon: 'lucideLayers2',
      },
      {
        title: { en: 'Legend', 'pt-BR': 'Legenda' },
        href: '/docs/components/legend',
        icon: 'lucideLayers2',
      },
      {
        title: { en: 'Markers', 'pt-BR': 'Marcadores' },
        href: '/docs/components/markers',
        icon: 'lucideLayers2',
      },
      { title: same('Popups'), href: '/docs/components/popups', icon: 'lucideLayers2' },
      {
        title: { en: 'Routes', 'pt-BR': 'Rotas' },
        href: '/docs/components/routes',
        icon: 'lucideLayers2',
      },
      {
        title: { en: 'Arcs', 'pt-BR': 'Arcos' },
        href: '/docs/components/arcs',
        icon: 'lucideLayers2',
      },
      { title: same('GeoJSON'), href: '/docs/components/geojson', icon: 'lucideLayers2' },
      { title: same('Clusters'), href: '/docs/components/clusters', icon: 'lucideLayers2' },
      { title: same('Heatmap'), href: '/docs/components/heatmap', icon: 'lucideLayers2' },
      {
        title: { en: 'Symbols', 'pt-BR': 'Símbolos' },
        href: '/docs/components/symbols',
        icon: 'lucideLayers2',
      },
      {
        title: { en: 'Tile Sources', 'pt-BR': 'Fontes de tiles' },
        href: '/docs/components/tile-sources',
        icon: 'lucideLayers2',
      },
      {
        title: { en: '3D Buildings & Terrain', 'pt-BR': 'Prédios 3D e terreno' },
        href: '/docs/components/3d',
        icon: 'lucideLayers2',
      },
      {
        title: { en: 'Draw', 'pt-BR': 'Desenho' },
        href: '/docs/components/draw',
        icon: 'lucideLayers2',
      },
      {
        title: { en: 'Advanced', 'pt-BR': 'Avançado' },
        href: '/docs/components/advanced',
        icon: 'lucideLayers2',
      },
    ],
  },
];

const pageItems: SiteNavigationItem[] = [
  { title: { en: 'Home', 'pt-BR': 'Início' }, href: '/', icon: 'lucideCornerDownRight' },
  { title: same('Docs'), href: '/docs', icon: 'lucideCornerDownRight' },
  {
    title: { en: 'Components', 'pt-BR': 'Componentes' },
    href: '/docs/components/map',
    icon: 'lucideCornerDownRight',
  },
  { title: same('Blocks'), href: '/blocks', icon: 'lucideCornerDownRight' },
  { title: same('Playground'), href: '/playground', icon: 'lucideCornerDownRight' },
];

export const siteNavigation: SiteNavigationGroup[] = [
  { title: { en: 'Pages', 'pt-BR': 'Páginas' }, items: pageItems },
  ...docsNavigation,
];

/** Header links: every page except Home. */
export const mainNavItems = pageItems.filter((item) => item.href !== '/');

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
