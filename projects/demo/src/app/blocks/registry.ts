import type { Type } from '@angular/core';

/** A zard/ui component a block is built with. */
export type ZardComponentName =
  'badge' | 'button' | 'card' | 'chart' | 'input' | 'separator' | 'sidebar';

export interface BlockFile {
  /** Path inside `src/app/blocks/` — also the key into the generated sources. */
  path: string;
}

export interface BlockMeta {
  name: string;
  title: string;
  description: string;
  /** Height of the preview iframe and of the code viewer. */
  iframeHeight: string;
  /** zard/ui components used by the block (installed with zard-cli). */
  zard: ZardComponentName[];
  files: BlockFile[];
}

/**
 * The blocks gallery, in mapcn's order. Metadata only — keep it free of
 * component imports so the server routes can read it cheaply.
 */
export const BLOCKS: BlockMeta[] = [
  {
    name: 'analytics-map',
    title: 'Analytics Map',
    description:
      'Real-time analytics overview with a world map, breakdown cards, and device stats.',
    iframeHeight: '940px',
    zard: ['card', 'chart'],
    files: [
      { path: 'analytics-map/analytics-map.ts' },
      { path: 'analytics-map/data.ts' },
      { path: 'analytics-map/components/overview-card.ts' },
      { path: 'analytics-map/components/breakdown-card.ts' },
    ],
  },
  {
    name: 'choropleth',
    title: 'Choropleth',
    description:
      'World choropleth map shading countries by a metric, with a hover tooltip and legend.',
    iframeHeight: '720px',
    zard: [],
    files: [
      { path: 'choropleth/choropleth.ts' },
      { path: 'choropleth/data.ts' },
      { path: 'choropleth/world-data.ts' },
    ],
  },
  {
    name: 'analytics-card',
    title: 'Analytics Card',
    description: 'Compact analytics card with a headline metric over a world map.',
    iframeHeight: '600px',
    zard: ['card', 'badge'],
    files: [{ path: 'analytics-card/analytics-card.ts' }, { path: 'analytics-card/data.ts' }],
  },
  {
    name: 'delivery-tracker',
    title: 'Delivery Tracker',
    description: 'Live order tracking with route progress, courier position, and order details.',
    iframeHeight: '720px',
    zard: ['card', 'badge', 'button'],
    files: [
      { path: 'delivery-tracker/delivery-tracker.ts' },
      { path: 'delivery-tracker/data.ts' },
      { path: 'delivery-tracker/route-progress.ts' },
    ],
  },
  {
    name: 'uptime-monitor',
    title: 'Uptime Monitor',
    description:
      'Status-page style map of edge network locations with live health, latency, and uptime.',
    iframeHeight: '720px',
    zard: [],
    files: [
      { path: 'uptime-monitor/uptime-monitor.ts' },
      { path: 'uptime-monitor/data.ts' },
      { path: 'uptime-monitor/components/edge-node-marker.ts' },
      { path: 'uptime-monitor/components/status-sidebar.ts' },
    ],
  },
  {
    name: 'heatmap',
    title: 'Heatmap',
    description:
      'Globe-projected heatmap visualizing earthquake density with zoom-dependent styling.',
    iframeHeight: '800px',
    zard: [],
    files: [{ path: 'heatmap/heatmap.ts' }],
  },
  {
    name: 'pmtiles',
    title: 'PMTiles Parcels',
    description:
      'Vector tiles from a single PMTiles archive: a source component, a layer that waits for it, and hover highlighting.',
    iframeHeight: '720px',
    zard: [],
    files: [{ path: 'pmtiles/pmtiles.ts' }],
  },
  {
    name: 'city-3d',
    title: '3D City',
    description:
      '3D buildings colored by height, with optional terrain and hillshade, on the Carto basemap.',
    iframeHeight: '720px',
    zard: [],
    files: [{ path: 'city-3d/city-3d.ts' }],
  },
  {
    name: 'draw',
    title: 'Draw',
    description:
      'Draw and edit points, lines and polygons with a toolbar and a live readout of the shapes.',
    iframeHeight: '720px',
    zard: [],
    files: [{ path: 'draw/draw.ts' }],
  },
  {
    name: 'logistics-network',
    title: 'Logistics Network',
    description: 'Domestic logistics map with a sidebar of stats.',
    iframeHeight: '800px',
    zard: ['sidebar', 'separator'],
    files: [
      { path: 'logistics-network/logistics-network.ts' },
      { path: 'logistics-network/data.ts' },
      { path: 'logistics-network/components/filter-sidebar.ts' },
      { path: 'logistics-network/components/network-map.ts' },
    ],
  },
  {
    name: 'store-locator',
    title: 'Store Locator',
    description: 'Searchable store list synced with map markers.',
    iframeHeight: '800px',
    zard: ['input', 'sidebar'],
    files: [
      { path: 'store-locator/store-locator.ts' },
      { path: 'store-locator/data.ts' },
      { path: 'store-locator/components/store-list.ts' },
      { path: 'store-locator/components/locator-map.ts' },
    ],
  },
];

export function findBlock(name: string): BlockMeta | undefined {
  return BLOCKS.find((block) => block.name === name);
}

/** Lazy component loaders: each block lands in its own chunk. */
export const BLOCK_COMPONENTS: Record<string, () => Promise<Type<unknown>>> = {
  'analytics-map': () =>
    import('./analytics-map/analytics-map').then((m) => m.AnalyticsMapBlockComponent),
  choropleth: () => import('./choropleth/choropleth').then((m) => m.ChoroplethBlockComponent),
  'analytics-card': () =>
    import('./analytics-card/analytics-card').then((m) => m.AnalyticsCardBlockComponent),
  'delivery-tracker': () =>
    import('./delivery-tracker/delivery-tracker').then((m) => m.DeliveryTrackerBlockComponent),
  'uptime-monitor': () =>
    import('./uptime-monitor/uptime-monitor').then((m) => m.UptimeMonitorBlockComponent),
  heatmap: () => import('./heatmap/heatmap').then((m) => m.HeatmapBlockComponent),
  pmtiles: () => import('./pmtiles/pmtiles').then((m) => m.PmtilesBlockComponent),
  'city-3d': () => import('./city-3d/city-3d').then((m) => m.City3dBlockComponent),
  draw: () => import('./draw/draw').then((m) => m.DrawBlockComponent),
  'logistics-network': () =>
    import('./logistics-network/logistics-network').then((m) => m.LogisticsNetworkBlockComponent),
  'store-locator': () =>
    import('./store-locator/store-locator').then((m) => m.StoreLocatorBlockComponent),
};

/** Where zard/ui documents a component. */
export function zardDocsUrl(component: ZardComponentName): string {
  return `https://zardui.com/docs/components/${component}`;
}

/** zard-cli command that installs a block's UI components. */
export function zardInstallCommand(block: BlockMeta): string | null {
  return block.zard.length ? `npx zard-cli@latest add ${block.zard.join(' ')}` : null;
}
