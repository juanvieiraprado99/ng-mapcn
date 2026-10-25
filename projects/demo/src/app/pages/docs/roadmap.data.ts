/**
 * Roadmap content for `/docs/roadmap`. Edited by hand at each release: tick
 * the deliverables that shipped and move finished milestones to `shipped`.
 * Only value-adding work belongs here (features, integrations, tooling), not bug fixes.
 */
export type RoadmapStatus = 'completed' | 'ongoing' | 'planned';

export interface RoadmapDeliverable {
  label: string;
  done: boolean;
}

export interface RoadmapMilestone {
  /** Anchor id of the card. */
  id: string;
  title: string;
  status: RoadmapStatus;
  /** Release range or date, e.g. "22.0.0-beta.7 · October 2026". */
  period?: string;
  /** Ongoing track with no end: shows "Continuous" instead of a percentage. */
  continuous?: boolean;
  description: string;
  goals: string[];
  deliverables: RoadmapDeliverable[];
}

export interface RoadmapProgress {
  done: number;
  total: number;
  percent: number;
}

export function milestoneProgress(milestone: RoadmapMilestone): RoadmapProgress {
  const total = milestone.deliverables.length;
  const done = milestone.deliverables.filter((d) => d.done).length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

const done = (label: string): RoadmapDeliverable => ({ label, done: true });
const todo = (label: string): RoadmapDeliverable => ({ label, done: false });

/**
 * The destination of the whole roadmap; shown first on the page. 22.0.0 ships
 * once every What's Next milestone has shipped on the beta line.
 */
export const stableMilestone: RoadmapMilestone = {
  id: 'stable',
  title: 'Stable 22.0.0',
  status: 'ongoing',
  description:
    'The destination of this roadmap. Every milestone under What\'s Next ships on the 22.0.0 beta line first; then the public API is frozen and 22.0.0 is released with semver guarantees, ready for production.',
  goals: ['Complete roadmap', 'API freeze', 'Semver'],
  deliverables: [
    done('Release process documented (Release-As, prerelease off)'),
    done('Smoke, SSR and accessibility checks on every docs page'),
    todo("Every What's Next milestone shipped"),
    todo('Public API review: every input, output and export final'),
    todo('Release-As: 22.0.0 and "prerelease": false'),
    todo('Install commands without @beta in the README and docs'),
    todo('Support policy for the 21.x and 18.x lines'),
  ],
};

export const shippedMilestones: RoadmapMilestone[] = [
  {
    id: 'foundation',
    title: 'Foundation: the mapcn port',
    status: 'completed',
    period: '22.0.0-beta.0 – beta.2 · October 2026',
    description:
      'The core of mapcn rebuilt for Angular: standalone components, signal inputs and a component-scoped map context instead of useMap().',
    goals: ['mapcn parity', 'Signals', 'Copy-paste'],
    deliverables: [
      done('ng-map with theme-driven styles, blank style and a controlled viewport'),
      done('ng-map-controls: zoom, compass, locate and fullscreen'),
      done('Marker family: content, popup, tooltip and label'),
      done('Standalone ng-map-popup'),
      done('Route, GeoJSON, arc and cluster layers'),
      done('ng add and map schematics for the copy-paste install'),
      done('mapcn.dev-style docs site and blocks gallery'),
    ],
  },
  {
    id: 'developer-experience',
    title: 'Developer experience',
    status: 'completed',
    period: '22.0.0-beta.3 – beta.6 · October 2026',
    description:
      'Typed APIs, styling hooks and translations, so the components fit into real apps and design systems.',
    goals: ['Type safety', 'Styling', 'i18n', 'Agents'],
    deliverables: [
      done('ng-mapcn agent skill on skills.sh'),
      done('GeoJSON and cluster layers typed by feature properties'),
      done('className inputs for portaled content and controls'),
      done('Configurable, translatable control and a11y labels'),
      done('Popup options and a two-way open input'),
      done('Route progress, active state, RouteProgress and RouteMarker'),
    ],
  },
  {
    id: 'beyond-mapcn',
    title: 'Beyond mapcn',
    status: 'completed',
    period: '22.0.0-beta.7 · October 2026',
    description:
      'Layers mapcn does not ship yet, plus keyboard access and server rendering out of the box.',
    goals: ['New layers', '3D', 'Accessibility', 'SSR'],
    deliverables: [
      done('ng-map-heatmap'),
      done('Declarative [fitBounds] on ng-map'),
      done('Raster, vector and PMTiles sources plus image overlay'),
      done('3D buildings, terrain and hillshade'),
      done('ng-mapcn/draw for points, lines and polygons'),
      done('Keyboard access for markers, popups, tooltips and drag'),
      done('Server-side rendering and hydration support'),
      done('Interactive playground and style gallery'),
    ],
  },
  {
    id: 'scene-builder',
    title: 'Playground & scene builder',
    status: 'completed',
    period: '22.0.0-beta.8 · October 2026',
    description: 'Compose a map visually, then copy the Angular code that renders it.',
    goals: ['Playground', 'Code generation'],
    deliverables: [
      done('Scene builder with a draggable layer stack'),
      done('Shareable links and generated component code'),
      done('Example scenes: delivery, flights, earthquakes, Alps, 3D city, sketch'),
      done('15 basemap presets, from Carto to satellite and globe'),
    ],
  },
];

export const nextMilestones: RoadmapMilestone[] = [
  {
    id: 'dx-docs-ai',
    title: 'DX, docs & AI',
    status: 'ongoing',
    description:
      'Make ng-mapcn easy to use for people and for coding agents, with first-class tooling for AI assistants.',
    goals: ['MCP', 'Agent skill', 'Docs'],
    deliverables: [
      done('llms.txt and llms-full.txt for agents'),
      done('ng-mapcn agent skill on skills.sh'),
      todo('ng-mapcn MCP server: components, API reference and blocks as tools'),
      todo('Agent skill recipes generated from the playground scenes'),
      todo('Copy page as Markdown and open-in-playground from every docs example'),
    ],
  },
  {
    id: 'new-components',
    title: 'New components',
    status: 'ongoing',
    description:
      'The building blocks map apps keep rewriting by hand, as composable ng-map children.',
    goals: ['Components', 'MapLibre'],
    deliverables: [
      done('ng-map-legend for choropleth, heatmap and cluster scales'),
      done('ng-map-scale: metric and imperial scale bar'),
      todo('ng-map-minimap: overview map synced with the main viewport'),
      done('ng-map-symbol-layer: icons and text labels from sprites or images'),
      done('ng-map-style-switcher: basemap picker as a control'),
      todo('Animated route playback with play, pause and speed'),
    ],
  },
  {
    id: 'search-routing',
    title: 'Search & routing',
    status: 'planned',
    description:
      'Find places and draw directions with pluggable providers, so each app chooses its own geocoder and router.',
    goals: ['Geocoding', 'Directions', 'Providers'],
    deliverables: [
      todo('ng-map-search: address search with Nominatim, MapTiler or a custom provider'),
      todo('Reverse geocoding on click'),
      todo('Directions helper (OSRM, Valhalla or custom) that feeds ng-map-route'),
      todo('Isochrones: the area reachable in N minutes'),
    ],
  },
  {
    id: 'angular-forms',
    title: 'Angular forms integration',
    status: 'planned',
    description:
      'Maps as form inputs: pick a location or draw an area, bound to Signal Forms or reactive forms.',
    goals: ['Forms', 'Signals'],
    deliverables: [
      todo('ng-map-location-picker as a form control (lng/lat)'),
      todo('ng-map-draw as a form control for GeoJSON features'),
      todo('Bounding-box and radius pickers for search filters'),
    ],
  },
  {
    id: 'real-time',
    title: 'Real-time data',
    status: 'planned',
    description:
      'Live maps from streams: smooth marker movement and layers that update from Observables or signals.',
    goals: ['Streaming', 'Animation'],
    deliverables: [
      todo('Smooth interpolation for markers updated from a stream'),
      todo('Layer data from Observables and WebSocket feeds'),
      todo('Trails: fading history behind moving markers'),
    ],
  },
  {
    id: 'measure-analyze',
    title: 'Measure & analyze',
    status: 'planned',
    description: 'Spatial tools on top of ng-mapcn/draw, without a GIS stack.',
    goals: ['Draw', 'Analysis'],
    deliverables: [
      todo('Distance and area measurement tool'),
      todo('Select the features inside a drawn polygon'),
      todo('Snapping and editing helpers for draw'),
    ],
  },
  {
    id: 'per-component-install',
    title: 'Per-component install, shadcn-style',
    status: 'planned',
    description:
      'Copy only what you use: pick components and let the schematic resolve the files they depend on.',
    goals: ['Schematics', 'Registry'],
    deliverables: [
      todo('ng g ng-mapcn:map --components=marker,route with dependency resolution'),
      todo('Registry manifest mapping each component to its files'),
      todo('Block schematics: add a gallery block to your app in one command'),
    ],
  },
  {
    id: 'blocks-templates',
    title: 'More blocks & templates',
    status: 'planned',
    description: 'Ready-made screens to start from, in the style of the current blocks gallery.',
    goals: ['Blocks', 'Templates'],
    deliverables: [
      todo('Fleet tracking dashboard'),
      todo('Real estate search with filters and a results list'),
      todo('Travel itinerary with day-by-day routes'),
      todo('Weather radar with an animated raster timeline'),
      todo('Sales territories with editable regions'),
    ],
  },
  {
    id: 'testing-toolkit',
    title: 'Testing toolkit',
    status: 'ongoing',
    description:
      'Test apps that use ng-mapcn without WebGL, with the same MapLibre fake the library uses.',
    goals: ['Testing', 'Harnesses'],
    deliverables: [
      done('ng-mapcn/testing entry point with the MapLibre fake'),
      todo('Component harnesses for map, marker and popup'),
      todo('"Testing your maps" docs page'),
    ],
  },
];
