import type { PlaygroundSpec } from './playground-schema';

/**
 * Every component the playground can show. Adding one is a single entry here plus its class in
 * `playground-components.ts`: the controls, the live preview and the snippet are all generated.
 * (`ng-map-draw` is left out: it needs the optional terra-draw peer, see /docs/components/draw.)
 */

const EARTHQUAKES = 'https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson';

const OFF = { value: undefined, label: 'Default' };

const ROUTE: [number, number][] = [
  [-74.0445, 40.6892],
  [-74.0134, 40.7061],
  [-73.9969, 40.7261],
  [-73.9857, 40.7484],
  [-73.9654, 40.7829],
];

const AREAS = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 1,
      properties: { name: 'Lower Manhattan' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.02, 40.7],
            [-73.99, 40.7],
            [-73.99, 40.725],
            [-74.02, 40.725],
            [-74.02, 40.7],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 2,
      properties: { name: 'Midtown' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.0, 40.735],
            [-73.965, 40.735],
            [-73.965, 40.77],
            [-74.0, 40.77],
            [-74.0, 40.735],
          ],
        ],
      },
    },
  ],
};

const ARCS = [
  { id: 'nyc-lon', from: [-74.006, 40.7128], to: [-0.1276, 51.5074] },
  { id: 'nyc-sf', from: [-74.006, 40.7128], to: [-122.4194, 37.7749] },
  { id: 'lon-dxb', from: [-0.1276, 51.5074], to: [55.2708, 25.2048] },
  { id: 'sf-tokyo', from: [-122.4194, 37.7749], to: [139.6917, 35.6895] },
];

const FIRE = [
  [0, 'rgba(255, 237, 160, 0)'],
  [0.4, '#fd8d3c'],
  [0.7, '#e31a1c'],
  [1, '#800026'],
];
const OCEAN = [
  [0, 'rgba(8, 81, 156, 0)'],
  [0.4, '#4292c6'],
  [0.7, '#2171b5'],
  [1, '#08306b'],
];

const BY_HEIGHT = [
  'interpolate',
  ['linear'],
  ['get', 'render_height'],
  0,
  '#bfdbfe',
  60,
  '#3b82f6',
  200,
  '#1e3a8a',
];

export const PLAYGROUND_SPECS: readonly PlaygroundSpec[] = [
  {
    id: 'map',
    label: 'Map',
    description: 'The root component: basemap, theme, projection and camera.',
    controls: [],
    fixed: [],
    view: { center: [2.3522, 48.8566], zoom: 4 },
  },
  {
    id: 'marker',
    label: 'Marker',
    description: 'A DOM marker at a coordinate. Drag it when draggable is on.',
    selector: 'ng-map-marker',
    className: 'MapMarkerComponent',
    controls: [
      {
        kind: 'range',
        key: 'longitude',
        label: 'Longitude',
        min: -75,
        max: -73,
        step: 0.01,
        default: -74.006,
      },
      {
        kind: 'range',
        key: 'latitude',
        label: 'Latitude',
        min: 40,
        max: 41.5,
        step: 0.01,
        default: 40.7128,
      },
      { kind: 'boolean', key: 'draggable', label: 'Draggable', default: false },
      {
        kind: 'range',
        key: 'rotation',
        label: 'Rotation',
        min: -180,
        max: 180,
        step: 5,
        default: 0,
      },
      {
        kind: 'select',
        key: 'anchor',
        label: 'Anchor',
        default: undefined,
        options: [
          OFF,
          { value: 'center', label: 'center' },
          { value: 'top', label: 'top' },
          { value: 'bottom', label: 'bottom' },
          { value: 'left', label: 'left' },
          { value: 'right', label: 'right' },
        ],
      },
    ],
    fixed: [],
    view: { center: [-74.006, 40.7128], zoom: 9 },
  },
  {
    id: 'route',
    label: 'Route',
    description: 'A polyline through coordinates, styled with color, width and dashes.',
    selector: 'ng-map-route',
    className: 'MapRouteComponent',
    attrs: { id: 'route' },
    controls: [
      { kind: 'color', key: 'color', label: 'Color', default: '#4285F4' },
      { kind: 'range', key: 'width', label: 'Width', min: 1, max: 14, step: 1, default: 3 },
      {
        kind: 'range',
        key: 'opacity',
        label: 'Opacity',
        min: 0.1,
        max: 1,
        step: 0.05,
        default: 0.8,
      },
      {
        kind: 'select',
        key: 'dashArray',
        label: 'Dash',
        default: undefined,
        options: [
          { value: undefined, label: 'Solid' },
          { value: [2, 2], label: 'Dotted [2, 2]' },
          { value: [6, 3], label: 'Dashed [6, 3]' },
        ],
      },
      { kind: 'boolean', key: 'interactive', label: 'Interactive', default: true },
    ],
    fixed: [
      {
        input: 'coordinates',
        value: ROUTE,
        ts: `readonly coordinates: [number, number][] = ${JSON.stringify(ROUTE)};`,
      },
    ],
    view: { center: [-73.99, 40.74], zoom: 10.8 },
  },
  {
    id: 'geojson',
    label: 'GeoJSON',
    description: 'Fill and outline layers for polygons, with a hover state.',
    selector: 'ng-map-geojson',
    className: 'MapGeoJSONComponent',
    attrs: { id: 'areas', promoteId: 'name' },
    controls: [
      {
        kind: 'color',
        key: 'fillColor',
        label: 'Fill color',
        default: '#d4d4d4',
        into: { input: 'fillPaint', prop: 'fill-color' },
      },
      {
        kind: 'range',
        key: 'fillOpacity',
        label: 'Fill opacity',
        min: 0,
        max: 1,
        step: 0.05,
        default: 1,
        into: { input: 'fillPaint', prop: 'fill-opacity' },
      },
      {
        kind: 'color',
        key: 'lineColor',
        label: 'Outline color',
        default: '#ffffff',
        into: { input: 'linePaint', prop: 'line-color' },
      },
      {
        kind: 'range',
        key: 'lineWidth',
        label: 'Outline width',
        min: 0,
        max: 8,
        step: 0.5,
        default: 1,
        into: { input: 'linePaint', prop: 'line-width' },
      },
      {
        kind: 'color',
        key: 'hoverColor',
        label: 'Hover color',
        default: '#a3a3a3',
        into: { input: 'fillHoverPaint', prop: 'fill-color' },
      },
      { kind: 'boolean', key: 'interactive', label: 'Interactive (enables hover)', default: false },
    ],
    fixed: [
      {
        input: 'data',
        value: AREAS,
        ts: 'readonly data: GeoJSON.FeatureCollection = { type: \'FeatureCollection\', features: [/* polygons with a "name" property */] };',
      },
    ],
    view: { center: [-73.99, 40.73], zoom: 11 },
  },
  {
    id: 'arc',
    label: 'Arcs',
    description: 'Curved great-circle-style links between origin and destination points.',
    selector: 'ng-map-arc',
    className: 'MapArcComponent',
    attrs: { id: 'flights' },
    controls: [
      {
        kind: 'range',
        key: 'curvature',
        label: 'Curvature',
        min: 0,
        max: 0.6,
        step: 0.05,
        default: 0.2,
      },
      {
        kind: 'color',
        key: 'lineColor',
        label: 'Color',
        default: '#4285F4',
        into: { input: 'paint', prop: 'line-color' },
      },
      {
        kind: 'range',
        key: 'lineWidth',
        label: 'Width',
        min: 1,
        max: 8,
        step: 0.5,
        default: 2,
        into: { input: 'paint', prop: 'line-width' },
      },
      {
        kind: 'range',
        key: 'lineOpacity',
        label: 'Opacity',
        min: 0.1,
        max: 1,
        step: 0.05,
        default: 0.85,
        into: { input: 'paint', prop: 'line-opacity' },
      },
      { kind: 'boolean', key: 'interactive', label: 'Interactive', default: true },
    ],
    fixed: [
      {
        input: 'data',
        value: ARCS,
        ts: `readonly data = ${JSON.stringify(ARCS)};`,
      },
    ],
    view: { center: [-30, 38], zoom: 1.4 },
  },
  {
    id: 'cluster',
    label: 'Clusters',
    description: 'Clustered points that expand as you zoom, from GeoJSON data or a URL.',
    selector: 'ng-map-cluster-layer',
    className: 'MapClusterLayerComponent',
    controls: [
      {
        kind: 'range',
        key: 'clusterRadius',
        label: 'Cluster radius',
        min: 10,
        max: 120,
        step: 5,
        default: 50,
      },
      {
        kind: 'range',
        key: 'clusterMaxZoom',
        label: 'Cluster max zoom',
        min: 1,
        max: 16,
        step: 1,
        default: 14,
      },
      { kind: 'color', key: 'pointColor', label: 'Point color', default: '#3b82f6' },
      { kind: 'boolean', key: 'zoomOnClusterClick', label: 'Zoom on cluster click', default: true },
      {
        kind: 'json',
        key: 'clusterColors',
        label: 'Cluster colors (small, medium, large)',
        default: ['#22c55e', '#eab308', '#ef4444'],
      },
      {
        kind: 'json',
        key: 'clusterThresholds',
        label: 'Thresholds [medium, large]',
        default: [100, 750],
      },
    ],
    fixed: [{ input: 'data', value: EARTHQUAKES, ts: `readonly data = '${EARTHQUAKES}';` }],
    view: { center: [-103.59, 40.67], zoom: 3 },
  },
  {
    id: 'heatmap',
    label: 'Heatmap',
    description: 'Point density as a heatmap layer, weighted by a numeric property.',
    selector: 'ng-map-heatmap',
    className: 'MapHeatmapComponent',
    attrs: { weightProperty: 'mag' },
    controls: [
      { kind: 'range', key: 'radius', label: 'Radius', min: 5, max: 60, step: 1, default: 30 },
      {
        kind: 'range',
        key: 'intensity',
        label: 'Intensity',
        min: 0.2,
        max: 3,
        step: 0.1,
        default: 1,
      },
      { kind: 'range', key: 'opacity', label: 'Opacity', min: 0.1, max: 1, step: 0.05, default: 1 },
      {
        kind: 'select',
        key: 'gradient',
        label: 'Gradient',
        default: undefined,
        options: [
          { value: undefined, label: 'Theme default' },
          { value: FIRE, label: 'Fire' },
          { value: OCEAN, label: 'Ocean' },
        ],
      },
    ],
    fixed: [
      { input: 'data', value: EARTHQUAKES, ts: `readonly data = '${EARTHQUAKES}';` },
      {
        input: 'weightRange',
        value: [0, 7.5],
        ts: 'readonly weightRange: [number, number] = [0, 7.5];',
      },
    ],
    view: { center: [-103.59, 40.67], zoom: 3 },
  },
  {
    id: 'raster',
    label: 'Raster tiles',
    description: 'An XYZ raster tile source drawn as a layer, with live paint tuning.',
    selector: 'ng-map-raster-source',
    className: 'MapRasterSourceComponent',
    attrs: { id: 'osm', attribution: '© OpenStreetMap contributors' },
    controls: [
      { kind: 'range', key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.05, default: 1 },
      { kind: 'boolean', key: 'visible', label: 'Visible', default: true },
      {
        kind: 'range',
        key: 'saturation',
        label: 'Saturation',
        min: -1,
        max: 1,
        step: 0.1,
        default: 0,
        into: { input: 'paint', prop: 'raster-saturation' },
      },
      {
        kind: 'range',
        key: 'hueRotate',
        label: 'Hue rotate',
        min: 0,
        max: 360,
        step: 10,
        default: 0,
        into: { input: 'paint', prop: 'raster-hue-rotate' },
      },
    ],
    fixed: [
      {
        input: 'tiles',
        value: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        ts: "readonly tiles = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];",
      },
      { input: 'tileSize', value: 256, ts: 'readonly tileSize = 256;' },
      { input: 'maxzoom', value: 19, ts: 'readonly maxzoom = 19;' },
    ],
    view: { center: [10, 50], zoom: 3.5 },
  },
  {
    id: 'fill-extrusion',
    label: '3D buildings',
    description:
      'Extruded buildings from the basemap vector tiles. Needs a basemap with a building layer (Carto default); pick the 3D tilt preset.',
    selector: 'ng-map-fill-extrusion',
    className: 'MapFillExtrusionComponent',
    attrs: { id: 'buildings' },
    controls: [
      {
        kind: 'range',
        key: 'opacity',
        label: 'Opacity',
        min: 0.1,
        max: 1,
        step: 0.05,
        default: 0.8,
      },
      {
        kind: 'range',
        key: 'minZoom',
        label: 'Min zoom',
        min: 10,
        max: 18,
        step: 0.5,
        default: 14,
      },
      {
        kind: 'select',
        key: 'color',
        label: 'Color',
        default: undefined,
        options: [
          { value: undefined, label: 'Theme default' },
          { value: '#f97316', label: 'Orange' },
          { value: BY_HEIGHT, label: 'By height' },
        ],
      },
    ],
    fixed: [],
    view: { center: [-74.0134, 40.7061], zoom: 15.5, pitch: 60, bearing: -20 },
  },
];

export function findSpec(id: string): PlaygroundSpec {
  return PLAYGROUND_SPECS.find((spec) => spec.id === id) ?? PLAYGROUND_SPECS[0];
}
