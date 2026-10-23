import { createLayer, frameSpec, type Scene, type SceneLayer } from './playground-scene';
import type { Values } from './playground-schema';
import { findSpec } from './playground-specs';
import { applyPreset, findPreset, initialMapState, type MapState } from './style-presets';

/** A ready-made scene for the examples gallery: one click loads it into the builder. */
export interface PlaygroundExample {
  id: string;
  title: string;
  description: string;
  /** Spec ids shown on the card, top of the stack first. */
  blocks: string[];
  scene: () => Scene;
}

/** Builds the stack from top to bottom: each entry is a spec id and its changed values. */
function stack(...entries: [specId: string, values?: Values][]): SceneLayer[] {
  return entries.reduce<SceneLayer[]>(
    (layers, [specId, values]) => [...layers, createLayer(layers, specId, values)],
    [],
  );
}

/** The value of a select control's option, by label (e.g. the "By height" color expression). */
function option(specId: string, key: string, label: string): unknown {
  const control = findSpec(specId).controls.find((c) => c.key === key);
  return control?.kind === 'select'
    ? control.options.find((o) => o.label === label)?.value
    : undefined;
}

/** The map framed on `specId`'s data, on a basemap preset, with optional camera overrides. */
function mapOn(specId: string, presetId: string, camera: Partial<MapState> = {}): MapState {
  const spec = findSpec(specId);
  const state = applyPreset(initialMapState(spec.view.zoom), findPreset(presetId));
  return { ...frameSpec(state, spec), ...camera };
}

export const PLAYGROUND_EXAMPLES: readonly PlaygroundExample[] = [
  {
    id: 'delivery',
    title: 'Delivery route',
    description: 'A thick route across Manhattan with a pin at the drop-off and a popup.',
    blocks: ['popup', 'marker', 'route'],
    scene: () => ({
      layers: stack(
        ['popup', { longitude: -73.9654, latitude: 40.7829, closeButton: true }],
        ['marker', { longitude: -73.9654, latitude: 40.7829 }],
        ['route', { color: '#e11d48', width: 6 }],
      ),
      map: mapOn('route', 'voyager', { zoom: 11.5 }),
    }),
  },
  {
    id: 'flights',
    title: 'Flight network',
    description: 'Great-circle arcs between hubs on the globe.',
    blocks: ['arc'],
    scene: () => ({
      layers: stack(['arc', { curvature: 0.4, lineColor: '#f97316', lineWidth: 3 }]),
      map: mapOn('arc', 'globe', { center: [-30, 40], zoom: 1.6 }),
    }),
  },
  {
    id: 'earthquakes',
    title: 'Earthquake density',
    description: 'A heatmap under clustered points, on the dark Carto basemap.',
    blocks: ['cluster', 'heatmap'],
    scene: () => ({
      layers: stack(['cluster'], ['heatmap', { radius: 20, opacity: 0.8 }]),
      map: mapOn('heatmap', 'dark-matter'),
    }),
  },
  {
    id: 'alps',
    title: 'Alpine terrain',
    description: 'Exaggerated terrain and hillshade over satellite imagery in the Dolomites.',
    blocks: ['terrain'],
    scene: () => ({
      layers: stack(['terrain', { exaggeration: 1.5, hillshadeExaggeration: 0.35 }]),
      map: mapOn('terrain', 'imagery'),
    }),
  },
  {
    id: 'city-3d',
    title: 'City in 3D',
    description: 'Buildings extruded and colored by height over lower Manhattan.',
    blocks: ['fill-extrusion'],
    scene: () => ({
      layers: stack(['fill-extrusion', { color: option('fill-extrusion', 'color', 'By height') }]),
      map: mapOn('fill-extrusion', 'tilted'),
    }),
  },
  {
    id: 'sketch',
    title: 'Sketch an area',
    description: 'Draw polygons over the GeoJSON areas, then switch to Select to edit them.',
    blocks: ['draw', 'geojson'],
    scene: () => ({
      layers: stack(['draw', { mode: 'polygon', color: '#16a34a' }], ['geojson']),
      map: mapOn('geojson', 'positron'),
    }),
  },
];
