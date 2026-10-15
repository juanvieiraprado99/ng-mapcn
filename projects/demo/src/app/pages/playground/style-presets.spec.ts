import { describe, expect, it } from 'vitest';

import { buildSnippet } from './playground-schema';
import {
  applyPreset,
  findPreset,
  initialMapState,
  MAP_CONTROLS,
  mapInputs,
  mapSnippetInput,
  presetSnippet,
  STYLE_PRESETS,
  updateMapState,
} from './style-presets';

const VIEW = { center: [2.35, 48.85] as [number, number], zoom: 3 };
const MAP_ONLY = {
  id: 'map',
  label: 'Map',
  description: '',
  controls: [],
  fixed: [],
  view: VIEW,
};

describe('style presets', () => {
  it('has unique ids and the default is the first', () => {
    const ids = STYLE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(findPreset('nope').id).toBe(ids[0]);
  });

  it('applying a preset replaces basemap, projection and tilt but keeps theme and zoom', () => {
    const state = { ...initialMapState(5), theme: 'dark' as const, pitch: 30 };

    const globe = applyPreset(state, findPreset('globe'));
    expect(globe).toMatchObject({
      presetId: 'globe',
      projection: 'globe',
      pitch: 30,
      theme: 'dark',
      zoom: 5,
    });

    const tilted = applyPreset(globe, findPreset('tilted'));
    expect(tilted).toMatchObject({ projection: 'mercator', pitch: 60, bearing: -20 });
  });

  it('drives the live map: styles, blank, projection and the controlled viewport', () => {
    const state = applyPreset(initialMapState(4), findPreset('openfreemap'));
    expect(mapInputs(state, VIEW).styles?.light).toContain('openfreemap');

    expect(mapInputs(applyPreset(state, findPreset('blank')), VIEW).blank).toBe(true);
    expect(mapInputs(applyPreset(state, findPreset('globe')), VIEW).projection).toEqual({
      type: 'globe',
    });
    expect(mapInputs(applyPreset(state, findPreset('tilted')), VIEW).viewport).toEqual({
      zoom: 4,
      pitch: 60,
      bearing: -20,
    });
  });

  it('renders the playground snippet for a custom basemap with a styles constant', () => {
    const state = applyPreset(initialMapState(3), findPreset('voyager'));
    const { template, component } = buildSnippet(MAP_ONLY, {}, mapSnippetInput(state, VIEW));

    expect(template).toBe('<ng-map [center]="[2.35, 48.85]" [zoom]="3" [styles]="styles" />');
    expect(component).toContain('readonly styles: MapStylesConfig');
    expect(component).toContain('voyager-gl-style');
    expect(component).toContain("import { MapComponent, MapStylesConfig } from 'ng-mapcn';");
  });

  it('renders blank, globe, theme and camera as inputs', () => {
    const state = {
      ...applyPreset(initialMapState(3), findPreset('tilted')),
      theme: 'dark' as const,
      projection: 'globe' as const,
    };
    const { template } = buildSnippet(MAP_ONLY, {}, mapSnippetInput(state, VIEW));

    expect(template).toContain('theme="dark"');
    expect(template).toContain(`[projection]="{ type: 'globe' }"`);
    expect(template).toContain('[options]="{ pitch: 60, bearing: -20 }"');
    expect(
      buildSnippet(MAP_ONLY, {}, mapSnippetInput(applyPreset(state, findPreset('blank')), VIEW))
        .template,
    ).toContain(' [blank]="true"');
  });

  it('gives every preset a gallery snippet, split by language', () => {
    expect(presetSnippet(findPreset('carto')).template).toContain('<ng-map />');
    expect(presetSnippet(findPreset('carto')).provider).toBeUndefined();

    const custom = presetSnippet(findPreset('openfreemap'));
    expect(custom.template).toBe(
      `<ng-map [styles]="{ light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark' }" />`,
    );
    expect(custom.template).not.toContain('// ');
    expect(custom.provider).toContain('provideMapStyles({');
    expect(custom.provider).not.toContain('<ng-map');

    expect(presetSnippet(findPreset('globe')).template).toContain(
      `[projection]="{ type: 'globe' }"`,
    );
    expect(presetSnippet(findPreset('tilted')).template).toContain(
      '[options]="{ pitch: 60, bearing: -20 }"',
    );
    expect(presetSnippet(findPreset('blank')).template).toBe('<ng-map [blank]="true" />');
  });

  it('applies Carto explicitly, so the gallery does not follow the header picker', () => {
    for (const id of ['carto', 'globe', 'tilted']) {
      expect(findPreset(id).styles?.light, id).toContain('positron');
    }
    expect(findPreset('carto').note).toContain('no input needed');
    // The default is the library default: the snippets spell no styles out.
    const state = initialMapState(3);
    expect(buildSnippet(MAP_ONLY, {}, mapSnippetInput(state, VIEW)).template).not.toContain(
      'styles',
    );
    expect(presetSnippet(findPreset('globe')).provider).toBeUndefined();
  });

  it('keeps the tilt when a preset defines none', () => {
    const tilted = applyPreset(initialMapState(15), findPreset('tilted'));
    expect(applyPreset(tilted, findPreset('carto'))).toMatchObject({ pitch: 60, bearing: -20 });
  });

  it('only the Carto-backed presets expose the carto vector source', () => {
    expect(STYLE_PRESETS.filter((p) => p.hasCartoSource).map((p) => p.id)).toEqual([
      'carto',
      'voyager',
      'globe',
      'tilted',
    ]);
  });

  it('prints blank the same way in the gallery and the playground', () => {
    const state = applyPreset(initialMapState(3), findPreset('blank'));
    expect(buildSnippet(MAP_ONLY, {}, mapSnippetInput(state, VIEW)).template).toContain(
      '[blank]="true"',
    );
    expect(presetSnippet(findPreset('blank')).template).toBe('<ng-map [blank]="true" />');
  });

  it('credits every tile provider on its card', () => {
    for (const id of ['carto', 'voyager', 'openfreemap', 'osm']) {
      expect(findPreset(id).note, id).toMatch(/OpenStreetMap|OpenMapTiles/);
    }
  });
});

describe('updateMapState', () => {
  it('applies a preset for presetId and sets any other field directly', () => {
    const state = initialMapState(3);

    expect(updateMapState(state, 'presetId', 'tilted')).toMatchObject({ pitch: 60, bearing: -20 });
    expect(updateMapState(state, 'zoom', 9).zoom).toBe(9);
    expect(updateMapState(state, 'theme', 'dark').theme).toBe('dark');
  });

  it('exposes one control per map field with matching defaults', () => {
    const keys = MAP_CONTROLS.map((control) => control.key);
    expect(keys).toEqual(['presetId', 'theme', 'projection', 'zoom', 'pitch', 'bearing']);
    expect(Object.keys(initialMapState(2))).toEqual(expect.arrayContaining(keys));
  });
});

describe('camera follows the map', () => {
  it('prints the live camera rounded in the snippet and passes it to the viewport', () => {
    const state = {
      ...initialMapState(3),
      center: [10.123456, 20.987654] as [number, number],
      zoom: 5.23456,
      pitch: 37.4,
      bearing: -12.6,
    };
    const { template } = buildSnippet(MAP_ONLY, {}, mapSnippetInput(state, VIEW));

    expect(template).toContain('[center]="[10.1235, 20.9877]"');
    expect(template).toContain('[zoom]="5.23"');
    expect(template).toContain('[options]="{ pitch: 37, bearing: -13 }"');
    expect(mapInputs(state, VIEW).viewport).toEqual({
      center: [10.123456, 20.987654],
      zoom: 5.23456,
      pitch: 37.4,
      bearing: -12.6,
    });
  });

  it('keeps the spec center until the user moves the map', () => {
    expect(mapInputs(initialMapState(3), VIEW).viewport).not.toHaveProperty('center');
    expect(
      buildSnippet(MAP_ONLY, {}, mapSnippetInput(initialMapState(3), VIEW)).template,
    ).toContain('[center]="[2.35, 48.85]"');
  });
});

describe('OpenStreetMap preset', () => {
  const osm = findPreset('osm');

  it('shares one style object for both themes, so a theme switch costs nothing', () => {
    expect(osm.styles?.light).toBeTypeOf('object');
    expect(osm.styles?.light).toBe(osm.styles?.dark);
    expect(findPreset('osm').styles?.light).toBe(osm.styles?.light);
  });

  it('passes the object style through to the live map and the gallery preview', () => {
    const state = applyPreset(initialMapState(3), osm);
    expect(mapInputs(state, VIEW).styles).toBe(osm.styles);
  });

  it('never interpolates the style object into a snippet', () => {
    const { template, provider } = presetSnippet(osm);

    expect(template).toBe('<ng-map [styles]="styles" />');
    expect(provider).not.toContain('[object Object]');
    expect(provider).toContain('const OSM_STYLE: StyleSpecification');
    expect(provider).toContain('provideMapStyles({ light: OSM_STYLE, dark: OSM_STYLE }),');
    expect(provider).toContain('tile.openstreetmap.org/{z}/{x}/{y}.png');
  });

  it('declares the constant and its type import in the playground component snippet', () => {
    const state = applyPreset(initialMapState(3), osm);
    const { template, component } = buildSnippet(MAP_ONLY, {}, mapSnippetInput(state, VIEW));

    expect(template).toContain('[styles]="styles"');
    expect(component).toContain("import type { StyleSpecification } from 'maplibre-gl';");
    expect(component).toContain("import { MapComponent, MapStylesConfig } from 'ng-mapcn';");
    expect(component).toContain('const OSM_STYLE: StyleSpecification = {');
    expect(component).toContain(
      'readonly styles: MapStylesConfig = { light: OSM_STYLE, dark: OSM_STYLE };',
    );
    expect(component).not.toContain('[object Object]');
    // Module-level declaration sits before @Component, after the imports.
    expect(component.indexOf('const OSM_STYLE')).toBeLessThan(component.indexOf('@Component'));
  });

  it('says it is light only and credits OpenStreetMap', () => {
    expect(osm.description).toContain('Light only');
    expect(osm.note).toContain('© OpenStreetMap contributors');
    expect(osm.note).toContain('usage policy');
  });
});
