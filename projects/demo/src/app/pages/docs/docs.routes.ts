import { type Routes } from '@angular/router';

import { basemapProviders } from '@/shared/basemap.providers';

import { DocsLayoutComponent } from '../../layout/docs-layout';

export const DOCS_ROUTES: Routes = [
  {
    path: '',
    component: DocsLayoutComponent,
    // Route-level so `ng-mapcn` is only reached from a lazy chunk.
    providers: basemapProviders,
    children: [
      {
        path: '',
        title: 'Introduction',
        data: {
          seo: {
            title: 'Introduction to Angular Map Components',
            description:
              'Introduction to ng-mapcn: copy-paste map components for Angular, built on MapLibre GL and styled with Tailwind CSS. Learn the composition model and what ships in the box.',
            keywords: ['Angular maps', 'MapLibre Angular', 'Angular map library'],
            breadcrumbs: [],
          },
        },
        loadComponent: () =>
          import('./getting-started').then((m) => m.GettingStartedComponent),
      },
      {
        path: 'installation',
        title: 'Installation',
        data: {
          seo: {
            title: 'Install Angular Map Components',
            description:
              'Install ng-mapcn in your Angular app with npx ng-mapcn init or npm. Sets up maplibre-gl, registers its CSS and copies the map core into your project, then add components one by one.',
            keywords: ['npx ng-mapcn init', 'install MapLibre Angular', 'Angular map setup'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }],
          },
        },
        loadComponent: () =>
          import('./installation').then((m) => m.InstallationComponent),
      },
      {
        path: 'testing',
        title: 'Testing your maps',
        data: {
          seo: {
            title: 'Testing Angular Maps',
            description:
              'Unit-test Angular components that render ng-mapcn maps in jsdom without WebGL. Set up the MapLibre fake with Vitest or Jest, drive maps with helpers and CDK component harnesses.',
            keywords: ['test Angular maps', 'MapLibre mock', 'Angular component harness map'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }],
          },
        },
        loadComponent: () => import('./testing').then((m) => m.TestingComponent),
      },
      {
        path: 'api-reference',
        title: 'API Reference',
        data: {
          seo: {
            title: 'Angular Map API Reference',
            description:
              'Complete API reference for ng-mapcn: every Angular map component with its inputs, outputs, defaults and types — map, markers, popups, routes, arcs, GeoJSON and clusters.',
            keywords: ['ng-mapcn API', 'Angular map inputs', 'MapLibre Angular API'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }],
          },
        },
        loadComponent: () =>
          import('./api-reference').then((m) => m.ApiReferenceComponent),
      },
      {
        path: 'basemaps',
        title: 'Map Styles',
        data: {
          seo: {
            title: 'Angular Map Styles and Basemaps',
            description:
              'Use any MapLibre-compatible basemap with ng-mapcn: Carto (default), MapTiler, Stadia, OpenFreeMap and OpenStreetMap, with automatic light and dark themes.',
            keywords: ['MapLibre basemaps', 'Carto basemap', 'dark mode map Angular', 'vector tiles Angular'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }],
          },
        },
        loadComponent: () =>
          import('./components/basemaps-page').then((m) => m.BasemapsPageComponent),
      },
      {
        path: 'roadmap',
        title: 'Roadmap',
        data: {
          seo: {
            title: 'Angular Map Components Roadmap',
            description:
              'The ng-mapcn roadmap: what has shipped in the 22.x betas and what comes next, from new map components, search and routing to Angular forms integration and AI tooling.',
            keywords: ['ng-mapcn roadmap', 'Angular map library roadmap', 'mapcn Angular'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }],
          },
        },
        loadComponent: () => import('./roadmap').then((m) => m.RoadmapComponent),
      },
      {
        path: 'components/map',
        title: 'Map',
        data: {
          seo: {
            title: 'Angular Map Component',
            description:
              'The ng-map component: drop an interactive MapLibre map into any Angular app. Controlled viewport, theme-aware styles, blank data maps and loading states.',
            keywords: ['Angular map component', 'MapLibre map Angular', 'interactive map Angular'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/map-page').then((m) => m.MapPageComponent),
      },
      {
        path: 'components/controls',
        title: 'Controls',
        data: {
          seo: {
            title: 'Angular Map Controls',
            description:
              'Add zoom, compass, locate-me and fullscreen controls to an Angular map with ng-map-controls. Positionable, themeable and built on MapLibre GL.',
            keywords: ['map zoom controls Angular', 'geolocate control', 'fullscreen map Angular'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/controls-page').then((m) => m.ControlsPageComponent),
      },
      {
        path: 'components/scale',
        title: 'Scale',
        data: {
          seo: {
            title: 'Angular Map Scale Bar',
            description:
              'Add a distance scale bar to an Angular map with ng-map-scale: metric, imperial or both, updated as the map zooms and pans.',
            keywords: ['map scale bar Angular', 'MapLibre scale control', 'distance scale'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/scale-page').then((m) => m.ScalePageComponent),
      },
      {
        path: 'components/style-switcher',
        title: 'Style Switcher',
        data: {
          seo: {
            title: 'Angular Map Style Switcher',
            description:
              'Let users switch the basemap of an Angular map with ng-map-style-switcher: a list of light/dark style options, two-way bound, with your layers re-added after every switch.',
            keywords: ['basemap switcher Angular', 'MapLibre style switcher', 'change map style'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/style-switcher-page').then((m) => m.StyleSwitcherPageComponent),
      },
      {
        path: 'components/minimap',
        title: 'Minimap',
        data: {
          seo: {
            title: 'Angular Map Minimap',
            description:
              'Add an overview minimap to an Angular map with ng-map-minimap: it follows the main viewport, outlines it and navigates it by click, drag or keyboard.',
            keywords: ['minimap Angular', 'overview map MapLibre', 'inset map'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/minimap-page').then((m) => m.MinimapPageComponent),
      },
      {
        path: 'components/legend',
        title: 'Legend',
        data: {
          seo: {
            title: 'Angular Map Legend Component',
            description:
              'Add a map legend to an Angular map with ng-map-legend: category swatches, colour gradients and custom projected content, collapsible and themeable.',
            keywords: ['map legend Angular', 'Angular map gradient legend', 'MapLibre legend component'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/legend-page').then((m) => m.LegendPageComponent),
      },
      {
        path: 'components/markers',
        title: 'Markers',
        data: {
          seo: {
            title: 'Angular Map Markers',
            description:
              'Angular map markers with custom HTML content, labels, tooltips and popups. Draggable, reactive markers built on MapLibre GL with signals and OnPush.',
            keywords: ['Angular map marker', 'custom map marker', 'map tooltip Angular', 'draggable marker'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/markers-page').then((m) => m.MarkersPageComponent),
      },
      {
        path: 'components/popups',
        title: 'Popups',
        data: {
          seo: {
            title: 'Angular Map Popups',
            description:
              'Standalone map popups for Angular: anchor any template to a coordinate with ng-map-popup, styled with Tailwind and shadcn-like defaults.',
            keywords: ['map popup Angular', 'MapLibre popup', 'info window Angular'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/popups-page').then((m) => m.PopupsPageComponent),
      },
      {
        path: 'components/routes',
        title: 'Routes',
        data: {
          seo: {
            title: 'Angular Map Routes and Polylines',
            description:
              'Draw routes and polylines on an Angular map with ng-map-route: trails, delivery paths and turn-by-turn directions, with hover and click events.',
            keywords: ['map route Angular', 'polyline Angular', 'directions map', 'OSRM route'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/routes-page').then((m) => m.RoutesPageComponent),
      },
      {
        path: 'components/arcs',
        title: 'Arcs',
        data: {
          seo: {
            title: 'Angular Map Arcs',
            description:
              'Draw curved great-circle arcs between coordinates on an Angular map with ng-map-arc — flight paths, connections and network flows with hover states.',
            keywords: ['flight path map', 'great circle arc', 'connection map Angular'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/arcs-page').then((m) => m.ArcsPageComponent),
      },
      {
        path: 'components/geojson',
        title: 'GeoJSON',
        data: {
          seo: {
            title: 'Angular GeoJSON Layers',
            description:
              'Render GeoJSON polygons and lines on an Angular map with ng-map-geojson: choropleths, boundaries and declarative hover states powered by feature-state.',
            keywords: ['GeoJSON Angular', 'choropleth Angular', 'polygon layer MapLibre'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/geojson-page').then((m) => m.GeojsonPageComponent),
      },
      {
        path: 'components/clusters',
        title: 'Clusters',
        data: {
          seo: {
            title: 'Angular Map Clusters',
            description:
              'Cluster thousands of points on an Angular map with ng-map-cluster-layer: zoom-to-expand, custom colors and counts, powered by MapLibre GL clustering.',
            keywords: ['marker clustering Angular', 'point clusters MapLibre', 'large datasets map'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/clusters-page').then((m) => m.ClustersPageComponent),
      },
      {
        path: 'components/heatmap',
        title: 'Heatmap',
        data: {
          seo: {
            title: 'Angular Map Heatmap',
            description:
              'Visualize point density on an Angular map with ng-map-heatmap: weighted points, theme-aware gradients and zoom-dependent styling powered by MapLibre GL.',
            keywords: ['heatmap Angular', 'density map MapLibre', 'weighted heatmap layer'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/heatmap-page').then((m) => m.HeatmapPageComponent),
      },
      {
        path: 'components/symbols',
        title: 'Symbols',
        data: {
          seo: {
            title: 'Angular Map Symbol Layer',
            description:
              'Draw text labels and icons for GeoJSON points on an Angular map with ng-map-symbol-layer: images by id, data-driven icons, collision-aware labels and live options powered by MapLibre GL.',
            keywords: ['symbol layer Angular', 'map labels MapLibre', 'custom map icons'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/symbols-page').then((m) => m.SymbolsPageComponent),
      },
      {
        path: 'components/raster-source',
        title: 'Raster Tiles',
        data: {
          seo: {
            title: 'Angular Map Raster Tiles',
            description:
              'Add XYZ, TMS or WMS raster tiles to an Angular map with ng-map-raster-source: a declarative source and layer with live opacity and visibility.',
            keywords: ['Angular raster tiles', 'WMS overlay', 'MapLibre raster source'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/raster-source-page').then((m) => m.RasterSourcePageComponent),
      },
      {
        path: 'components/vector-source',
        title: 'Vector Tiles',
        data: {
          seo: {
            title: 'Angular Map Vector Tiles and PMTiles',
            description:
              'Add vector tiles and PMTiles archives to an Angular map with ng-map-vector-source, then draw your own layers that survive theme switches.',
            keywords: ['PMTiles Angular', 'MapLibre vector tiles', 'vector source Angular'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/vector-source-page').then((m) => m.VectorSourcePageComponent),
      },
      {
        path: 'components/image-overlay',
        title: 'Image Overlay',
        data: {
          seo: {
            title: 'Angular Map Image Overlay',
            description:
              'Pin a georeferenced image (a scanned map, a radar frame, a floor plan) to four corners on an Angular map with ng-map-image-overlay.',
            keywords: ['image overlay Angular map', 'georeferenced image MapLibre', 'map image source'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/image-overlay-page').then((m) => m.ImageOverlayPageComponent),
      },
      {
        path: 'components/fill-extrusion',
        title: '3D Buildings',
        data: {
          seo: {
            title: 'Angular 3D Map Buildings',
            description:
              'Render 3D buildings on an Angular map with ng-map-fill-extrusion: extrude the basemap buildings or your own polygons by a height property, powered by MapLibre GL.',
            keywords: ['Angular 3D map', '3D buildings MapLibre', 'fill-extrusion'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/fill-extrusion-page').then((m) => m.FillExtrusionPageComponent),
      },
      {
        path: 'components/terrain',
        title: 'Terrain',
        data: {
          seo: {
            title: 'Angular Map 3D Terrain',
            description:
              'Drape an Angular map over real elevation with ng-map-terrain: Terrarium or Terrain-RGB tiles, exaggeration and hillshade, powered by MapLibre GL.',
            keywords: ['MapLibre terrain hillshade', 'Angular 3D terrain', 'elevation map'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/terrain-page').then((m) => m.TerrainPageComponent),
      },
      // Pages split per component: old links land on the first one (vercel.json answers 301 for
      // the prerendered site, where redirect routes have no HTML).
      { path: 'components/tile-sources', redirectTo: 'components/raster-source' },
      { path: 'components/3d', redirectTo: 'components/fill-extrusion' },
      {
        path: 'components/draw',
        title: 'Draw',
        data: {
          seo: {
            title: 'Angular Map Draw Tools',
            description:
              'Draw, select and edit points, lines and polygons on an Angular map with ng-map-draw, built on terra-draw: two-way GeoJSON features, events and theme-aware styling.',
            keywords: ['draw polygon Angular map', 'terra-draw Angular', 'geofence editor MapLibre'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () => import('./components/draw-page').then((m) => m.DrawPageComponent),
      },
      {
        path: 'components/advanced',
        title: 'Advanced',
        data: {
          seo: {
            title: 'Advanced Angular Map Usage',
            description:
              "Advanced ng-mapcn patterns: raw MapLibre map access, synced viewports, custom layers and the MapContextService — the Angular equivalent of mapcn's useMap.",
            keywords: ['MapLibre map instance Angular', 'synced maps', 'custom map layers'],
            breadcrumbs: [{ name: 'Docs', path: '/docs' }, { name: 'Components', path: '/docs/components/map' }],
          },
        },
        loadComponent: () =>
          import('./components/advanced-page').then((m) => m.AdvancedPageComponent),
      },
    ],
  },
];
