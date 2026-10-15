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
      pitch: 0,
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
    expect(presetSnippet(findPreset('blank')).template).toBe('<ng-map blank />');
  });

  it('tells the default preset it follows the header basemap picker', () => {
    expect(findPreset('carto').note).toContain('header basemap picker');
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
