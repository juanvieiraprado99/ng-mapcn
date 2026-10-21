import { describe, expect, it } from 'vitest';

import {
  addLayer,
  createLayer,
  decodeScene,
  defaultScene,
  duplicateLayer,
  encodeScene,
  frameSpec,
  LAYER_SPECS,
  layerSpec,
  MAX_LAYERS,
  moveLayer,
  removeLayer,
  type SceneLayer,
  updateLayer,
} from './playground-scene';
import { buildSceneSnippet } from './playground-schema';
import { findSpec } from './playground-specs';
import { initialMapState } from './style-presets';

const stack = (...specIds: string[]) =>
  specIds.reduce<SceneLayer[]>((layers, id) => [...layers, createLayer(layers, id)], []);

describe('scene layers', () => {
  it('offers every component spec as a block, but not the bare map', () => {
    expect(LAYER_SPECS.map((spec) => spec.id)).not.toContain('map');
    expect(LAYER_SPECS.every((spec) => spec.selector)).toBe(true);
  });

  it('creates a layer with the spec defaults, a unique uid and a unique name', () => {
    const layers = stack('route', 'route', 'heatmap', 'route');
    expect(layers.map((l) => l.name)).toEqual(['route', 'route-2', 'heatmap', 'route-3']);
    expect(new Set(layers.map((l) => l.uid)).size).toBe(4);
    expect(layers[0].values['width']).toBe(3);
    expect(layers[0].visible).toBe(true);
  });

  it('reuses a freed name but never a uid', () => {
    const layers = removeLayer(stack('route', 'route'), 1);
    const next = createLayer(layers, 'route');
    expect(next.name).toBe('route');
    expect(next.uid).toBe(3);
  });

  it('adds on top by default, or at an index', () => {
    const base = stack('route', 'heatmap');
    expect(addLayer(base, 'arc').layers.map((l) => l.specId)).toEqual(['arc', 'route', 'heatmap']);
    expect(addLayer(base, 'arc', 1).layers.map((l) => l.specId)).toEqual([
      'route',
      'arc',
      'heatmap',
    ]);
    expect(addLayer(base, 'arc', 99).layers.at(-1)?.specId).toBe('arc');
  });

  it('moves a layer and ignores an out-of-range source', () => {
    const base = stack('route', 'heatmap', 'arc');
    expect(moveLayer(base, 0, 2).map((l) => l.specId)).toEqual(['heatmap', 'arc', 'route']);
    expect(moveLayer(base, 5, 0).map((l) => l.specId)).toEqual(['route', 'heatmap', 'arc']);
  });

  it('duplicates a layer above it with a copy of its values', () => {
    const base = updateLayer(stack('route', 'heatmap'), 2, {
      values: { ...createLayer([], 'heatmap').values, radius: 50 },
    });
    const { layers, layer } = duplicateLayer(base, 2);
    expect(layers.map((l) => l.name)).toEqual(['route', 'heatmap-2', 'heatmap']);
    expect(layer?.values['radius']).toBe(50);
    expect(layer?.values).not.toBe(base[1].values);
  });

  it('suffixes the layer id of a second instance', () => {
    const [first, second] = stack('route', 'route');
    expect(layerSpec(first, 'carto').attrs?.['id']).toBe('route');
    expect(layerSpec(second, 'carto').attrs?.['id']).toBe('route-2');
    const [, areas] = stack('geojson', 'geojson');
    expect(layerSpec(areas, 'carto').attrs?.['id']).toBe('areas-2');
  });

  it('reads 3D buildings from a non-Carto basemap source', () => {
    const [buildings] = stack('fill-extrusion');
    expect(layerSpec(buildings, 'carto').attrs).toEqual({ id: 'buildings' });
    expect(layerSpec(buildings, 'maptiler').attrs).toMatchObject({
      id: 'buildings',
      source: 'openmaptiles',
    });
  });

  it('frames a spec, keeping the tilt of a tilted preset', () => {
    const extrusion = findSpec('fill-extrusion');
    expect(frameSpec(initialMapState(2), extrusion)).toMatchObject({
      center: extrusion.view.center,
      zoom: extrusion.view.zoom,
      pitch: 60,
      bearing: -20,
    });
    const tilted = { ...initialMapState(2), presetId: 'tilted' };
    expect(frameSpec(tilted, findSpec('route')).pitch).toBe(60);
  });

  it('starts with one route over its data', () => {
    const scene = defaultScene();
    expect(scene.layers.map((l) => l.specId)).toEqual(['route']);
    expect(scene.map.center).toEqual(findSpec('route').view.center);
  });
});

describe('scene link', () => {
  it('round-trips the stack, the changed values, visibility and the map', () => {
    let layers = stack('route', 'heatmap');
    layers = updateLayer(layers, 1, {
      values: { ...layers[0].values, color: '#e11d48', dashArray: [2, 2] },
    });
    layers = updateLayer(layers, 2, { visible: false });
    const map = { ...initialMapState(5), presetId: 'blank', theme: 'dark' as const };

    const code = encodeScene({ layers, map });
    expect(code).toMatch(/^[\w-]+$/);
    const scene = decodeScene(code)!;

    expect(scene.layers.map((l) => [l.specId, l.name, l.visible])).toEqual([
      ['route', 'route', true],
      ['heatmap', 'heatmap', false],
    ]);
    expect(scene.layers[0].values).toEqual(layers[0].values);
    expect(scene.map).toEqual(map);
  });

  it('only stores the values that differ from the defaults', () => {
    const plain = encodeScene({ layers: stack('route'), map: initialMapState(2) });
    const edited = encodeScene({
      layers: updateLayer(stack('route'), 1, {
        values: { ...createLayer([], 'route').values, width: 9 },
      }),
      map: initialMapState(2),
    });
    expect(edited.length).toBeGreaterThan(plain.length);
  });

  it('round-trips an empty stack', () => {
    const code = encodeScene({ layers: [], map: initialMapState(2) });
    expect(decodeScene(code)?.layers).toEqual([]);
  });

  it('rejects what is not a scene', () => {
    expect(decodeScene(null)).toBeNull();
    expect(decodeScene('')).toBeNull();
    expect(decodeScene('%%%')).toBeNull();
    expect(decodeScene(btoa('{"v":2,"l":[]}'))).toBeNull();
    expect(decodeScene(btoa('"text"'))).toBeNull();
  });

  /** A hand-written link, as `encodeScene` would print it. */
  const link = (scene: unknown) =>
    btoa(JSON.stringify(scene)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  it('drops unknown blocks and keys and replaces invalid values by their defaults', () => {
    const scene = decodeScene(
      link({
        v: 1,
        m: { presetId: 'nope', theme: 'neon', zoom: 'x', pitch: 400, center: [1] },
        l: [
          { s: 'map' },
          { s: 'unknown' },
          {
            s: 'route',
            v: { width: 1000, color: 5, dashArray: [9, 9], interactive: 'yes', hacked: 1 },
          },
          { s: 'cluster', v: { clusterColors: 'red' } },
        ],
      }),
    )!;

    expect(scene.layers.map((l) => l.specId)).toEqual(['route', 'cluster']);
    const route = scene.layers[0].values;
    expect(route['width']).toBe(14);
    expect(route['color']).toBe('#4285F4');
    expect(route['dashArray']).toBeUndefined();
    expect(route['interactive']).toBe(true);
    expect(route).not.toHaveProperty('hacked');
    expect(scene.layers[1].values['clusterColors']).toEqual(
      findSpec('cluster').controls.find((c) => c.key === 'clusterColors')?.default,
    );
    expect(scene.map).toMatchObject({ presetId: 'carto', theme: 'auto', pitch: 85 });
    expect(scene.map.center).toBeUndefined();
  });

  it('caps the number of layers', () => {
    const scene = decodeScene(
      link({ v: 1, m: {}, l: Array.from({ length: 50 }, () => ({ s: 'route' })) }),
    )!;
    expect(scene.layers).toHaveLength(MAX_LAYERS);
  });
});

describe('buildSceneSnippet', () => {
  const map = { attrs: [{ name: 'zoom', value: 3 }] };
  const snippetOf = (layers: SceneLayer[]) =>
    buildSceneSnippet(
      layers.map((layer) => ({ spec: layerSpec(layer, 'carto'), values: layer.values })),
      map,
    );

  it('renders every layer inside one map, in the given order', () => {
    const { template } = snippetOf(stack('route', 'heatmap'));
    const lines = template.split('\n');
    expect(lines[0]).toBe('<ng-map [zoom]="3">');
    expect(template.indexOf('<ng-map-route')).toBeLessThan(template.indexOf('<ng-map-heatmap'));
    expect(lines.at(-1)).toBe('</ng-map>');
  });

  it('imports each component once', () => {
    const { component } = snippetOf(stack('route', 'heatmap', 'route'));
    expect(component).toContain(
      "import { MapComponent, MapRouteComponent, MapHeatmapComponent } from 'ng-mapcn';",
    );
  });

  it('shares an identical fixed member and renames a different one', () => {
    const { template, component } = snippetOf(stack('heatmap', 'cluster', 'route'));
    // Heatmap and clusters both read the same earthquakes URL: one `data` member.
    expect(component.match(/readonly data =/g)).toHaveLength(1);
    expect(template.match(/\[data\]="data"/g)).toHaveLength(2);

    const twoRoutes = stack('route', 'route');
    const changed = updateLayer(twoRoutes, 2, { values: twoRoutes[1].values });
    const snippet = buildSceneSnippet(
      [
        { spec: layerSpec(changed[0], 'carto'), values: changed[0].values },
        {
          spec: {
            ...layerSpec(changed[1], 'carto'),
            fixed: [{ input: 'coordinates', value: [], ts: 'readonly coordinates = [];' }],
          },
          values: changed[1].values,
        },
      ],
      map,
    );
    expect(snippet.template).toContain('[coordinates]="coordinates2"');
    expect(snippet.component).toContain('readonly coordinates2 = [];');
    expect(snippet.template).toContain('id="route-2"');
  });

  it('is a bare map without layers', () => {
    expect(snippetOf([]).template).toBe('<ng-map [zoom]="3" />');
  });
});
