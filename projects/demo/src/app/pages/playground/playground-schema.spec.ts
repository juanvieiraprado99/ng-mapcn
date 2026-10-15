import { describe, expect, it } from 'vitest';

import { OSM_RASTER_STYLE } from '../../shared/osm-style';
import {
  buildSnippet,
  controlDefaults,
  type PlaygroundSpec,
  resolveInputs,
  toTemplateExpr,
} from './playground-schema';
import { PLAYGROUND_SPECS } from './playground-specs';
import { MAP_CONTROLS } from './style-presets';

const SPEC: PlaygroundSpec = {
  id: 'route',
  label: 'Route',
  description: 'A line',
  selector: 'ng-map-route',
  className: 'MapRouteComponent',
  view: { center: [-74, 40.7], zoom: 11 },
  attrs: { id: 'demo' },
  fixed: [
    {
      input: 'coordinates',
      value: [
        [0, 0],
        [1, 1],
      ],
      ts: 'readonly coordinates: [number, number][] = [[0, 0], [1, 1]];',
    },
  ],
  controls: [
    { kind: 'color', key: 'color', label: 'Color', default: '#4285F4' },
    { kind: 'range', key: 'width', label: 'Width', min: 1, max: 12, step: 1, default: 3 },
    { kind: 'boolean', key: 'interactive', label: 'Interactive', default: true },
    {
      kind: 'json',
      key: 'dashArray',
      label: 'Dash',
      default: undefined,
    },
    {
      kind: 'range',
      key: 'fillOpacity',
      label: 'Fill opacity',
      min: 0,
      max: 1,
      step: 0.1,
      default: 0.5,
      into: { input: 'fillPaint', prop: 'fill-opacity' },
    },
  ],
};

describe('toTemplateExpr', () => {
  it('serializes primitives, arrays and objects as Angular template expressions', () => {
    expect(toTemplateExpr("it's")).toBe("'it\\'s'");
    expect(toTemplateExpr(3)).toBe('3');
    expect(toTemplateExpr(false)).toBe('false');
    expect(toTemplateExpr(null)).toBe('null');
    expect(toTemplateExpr([1, 'a'])).toBe("[1, 'a']");
    expect(toTemplateExpr({ pitch: 60, 'fill-color': '#fff' })).toBe(
      "{ pitch: 60, 'fill-color': '#fff' }",
    );
  });
});

describe('controlDefaults', () => {
  it('keys every control by its key', () => {
    expect(controlDefaults(SPEC.controls)).toEqual({
      color: '#4285F4',
      width: 3,
      interactive: true,
      dashArray: undefined,
      fillOpacity: 0.5,
    });
  });
});

describe('resolveInputs', () => {
  it('merges fixed inputs, control values and grouped (into) props', () => {
    const inputs = resolveInputs(SPEC, {
      ...controlDefaults(SPEC.controls),
      width: 8,
      fillOpacity: 0.2,
    });

    expect(inputs['coordinates']).toEqual([
      [0, 0],
      [1, 1],
    ]);
    expect(inputs['width']).toBe(8);
    expect(inputs['fillPaint']).toEqual({ 'fill-opacity': 0.2 });
    expect(inputs).not.toHaveProperty('fillOpacity');
    // Untouched grouped props are not forced on the component.
    expect(resolveInputs(SPEC, controlDefaults(SPEC.controls))).not.toHaveProperty('fillPaint');
  });
});

describe('buildSnippet', () => {
  const map = {
    attrs: [
      { name: 'center', value: [-74, 40.7] },
      { name: 'zoom', value: 11 },
    ],
  };

  it('lists only inputs that differ from their default, plus fixed ones', () => {
    const values = { ...controlDefaults(SPEC.controls), color: '#e11d48', width: 8 };
    const { template } = buildSnippet(SPEC, values, map);

    expect(template).toContain('<ng-map [center]="[-74, 40.7]" [zoom]="11">');
    expect(template).toContain('<ng-map-route');
    expect(template).toContain('id="demo"');
    expect(template).toContain('[coordinates]="coordinates"');
    expect(template).toContain('color="#e11d48"');
    expect(template).toContain('[width]="8"');
    expect(template).not.toContain('interactive');
    expect(template).not.toContain('fillPaint');
  });

  it('groups changed into-props under one object input', () => {
    const values = { ...controlDefaults(SPEC.controls), fillOpacity: 0.2 };
    const { template } = buildSnippet(SPEC, values, map);

    expect(template).toContain(`[fillPaint]="{ 'fill-opacity': 0.2 }"`);
  });

  it('emits a component with imports and the fixed input declarations', () => {
    const { component } = buildSnippet(SPEC, controlDefaults(SPEC.controls), map);

    expect(component).toContain("import { MapComponent, MapRouteComponent } from 'ng-mapcn';");
    expect(component).toContain('imports: [MapComponent, MapRouteComponent],');
    expect(component).toContain('readonly coordinates: [number, number][]');
    expect(component).toContain('export class AppMapComponent');
  });

  it('declares map-level consts (styles) and their type import', () => {
    const { component, template } = buildSnippet(SPEC, controlDefaults(SPEC.controls), {
      attrs: [{ name: 'styles', expr: 'styles' }],
      ts: ["readonly styles: MapStylesConfig = { light: 'a', dark: 'b' };"],
      imports: ['MapStylesConfig'],
    });

    expect(template).toContain('[styles]="styles"');
    expect(component).toContain('MapStylesConfig');
    expect(component).toContain("readonly styles: MapStylesConfig = { light: 'a', dark: 'b' };");
  });

  it('renders only the map when the spec has no layer component', () => {
    const { template, component } = buildSnippet(
      { ...SPEC, selector: undefined, className: undefined, fixed: [], controls: [] },
      {},
      map,
    );

    expect(template).toBe('<ng-map [center]="[-74, 40.7]" [zoom]="11" />');
    expect(component).toContain('imports: [MapComponent],');
  });
});

describe('required inputs and escaping', () => {
  const REQUIRED: Record<string, string[]> = {
    'ng-map-marker': ['longitude', 'latitude'],
    'ng-map-route': ['coordinates'],
    'ng-map-geojson': ['data'],
    'ng-map-arc': ['data'],
    'ng-map-cluster-layer': ['data'],
    'ng-map-heatmap': ['data'],
  };
  const MAP = { attrs: [{ name: 'zoom', value: 3 }] };

  it.each(PLAYGROUND_SPECS.filter((s) => s.selector).map((s) => [s.id, s] as const))(
    '%s emits its required inputs at default values',
    (_id, spec) => {
      const { template } = buildSnippet(spec, controlDefaults(spec.controls), MAP);
      for (const name of REQUIRED[spec.selector!] ?? []) {
        expect(template, name).toContain(`[${name}]="`);
      }
    },
  );

  it('escapes double quotes and ampersands in bound expressions', () => {
    const spec: PlaygroundSpec = {
      ...SPEC,
      fixed: [],
      controls: [{ kind: 'json', key: 'paint', label: 'p', default: undefined }],
    };
    const { template } = buildSnippet(spec, { paint: { a: 'say "hi" & go' } }, MAP);

    expect(template).toContain(`[paint]="{ a: 'say &quot;hi&quot; &amp; go' }"`);
  });

  it('escapes backticks, ${ and backslashes in the component template literal', () => {
    const spec: PlaygroundSpec = {
      ...SPEC,
      fixed: [],
      controls: [{ kind: 'text', key: 'label', label: 'l', default: '' }],
    };
    const { component } = buildSnippet(spec, { label: 'a`b${c}\\d' }, MAP);

    expect(component).toContain('label="a\\`b\\${c}\\\\d"');
  });
});

describe('playground spec hardening', () => {
  const spec = (id: string) => PLAYGROUND_SPECS.find((s) => s.id === id)!;
  const jsonControl = (id: string, key: string) => {
    const control = spec(id).controls.find((c) => c.key === key)!;
    if (control.kind !== 'json') throw new Error('not json');
    return control;
  };

  it('validates the cluster colors and thresholds', () => {
    const colors = jsonControl('cluster', 'clusterColors').validate!;
    expect(colors(['#22c55e', 'red', 'rgb(1 2 3)'])).toBeNull();
    for (const bad of [null, undefined, 'red', [], [1, 2, 3], ['red', 'blue'], ['a', 'b', 'c']]) {
      expect(colors(bad), JSON.stringify(bad)).toContain('Three CSS colors');
    }

    const thresholds = jsonControl('cluster', 'clusterThresholds').validate!;
    expect(thresholds([100, 750])).toBeNull();
    for (const bad of [null, [750, 100], [100, 100], [0, 5], [1], ['1', '2'], [1, null]]) {
      expect(thresholds(bad), JSON.stringify(bad)).toContain('Two increasing numbers');
    }
  });

  it('defaults the cluster inputs to values that pass their own validators', () => {
    for (const key of ['clusterColors', 'clusterThresholds']) {
      const control = jsonControl('cluster', key);
      expect(control.validate!(control.default)).toBeNull();
    }
  });

  it('matches the GeoJSON outline width default of the library (0.5)', () => {
    const control = spec('geojson').controls.find((c) => c.key === 'lineWidth')!;
    expect(control.default).toBe(0.5);
  });

  it('keeps the pitch slider inside MapLibre default maxPitch (60)', () => {
    const pitch = MAP_CONTROLS.find((c) => c.key === 'pitch')!;
    expect(pitch.kind === 'range' && pitch.max).toBe(60);
  });

  it('types the arc data so the pasted component compiles under strictTemplates', () => {
    const { component } = buildSnippet(spec('arc'), controlDefaults(spec('arc').controls), {
      attrs: [],
    });
    expect(component).toContain('from: [number, number]');
    expect(component).toContain('to: [number, number]');
  });

  it('never reuses a basemap source id for a layer component id', () => {
    const basemapSourceIds = ['carto', 'openmaptiles', ...Object.keys(OSM_RASTER_STYLE.sources)];
    for (const s of PLAYGROUND_SPECS) {
      expect(basemapSourceIds, s.id).not.toContain(s.attrs?.['id']);
    }
  });
});

describe('projected content and always-on grouped controls', () => {
  const marker = PLAYGROUND_SPECS.find((s) => s.id === 'marker')!;
  const geojson = PLAYGROUND_SPECS.find((s) => s.id === 'geojson')!;

  it('renders the marker with its <ng-marker-content /> child and imports it', () => {
    const { template, component } = buildSnippet(marker, controlDefaults(marker.controls), {
      attrs: [],
    });

    expect(template).toMatch(
      /<ng-map-marker [^>]*>\n {4}<ng-marker-content \/>\n {2}<\/ng-map-marker>\n<\/ng-map>/,
    );
    expect(template).not.toContain('<ng-map-marker [longitude]="-74.006" [latitude]="40.7128" />');
    expect(component).toContain(
      "import { MapComponent, MapMarkerComponent, MarkerContentComponent } from 'ng-mapcn';",
    );
    expect(component).toContain(
      'imports: [MapComponent, MapMarkerComponent, MarkerContentComponent],',
    );
  });

  it('always passes the hover, fill and outline colors so hover works at the defaults', () => {
    const values = controlDefaults(geojson.controls);
    const inputs = resolveInputs(geojson, values);

    expect(inputs['fillHoverPaint']).toEqual({ 'fill-color': '#a3a3a3' });
    expect(inputs['fillPaint']).toEqual({ 'fill-color': '#d4d4d4' });
    expect(inputs['linePaint']).toEqual({ 'line-color': '#ffffff' });
    // Width/opacity stay at the library defaults until touched.
    expect(buildSnippet(geojson, values, { attrs: [] }).template).toContain('[fillHoverPaint]=');
  });
});

describe('module-level declarations and type imports', () => {
  it('renders extra type imports and declarations between the imports and @Component', () => {
    const { component } = buildSnippet(SPEC, controlDefaults(SPEC.controls), {
      attrs: [],
      declarations: ['const THING = 1;'],
      typeImports: [{ from: 'maplibre-gl', names: ['StyleSpecification', 'Map'] }],
    });

    expect(
      component.startsWith(
        [
          "import { Component } from '@angular/core';",
          "import type { StyleSpecification, Map } from 'maplibre-gl';",
          "import { MapComponent, MapRouteComponent } from 'ng-mapcn';",
          '',
          'const THING = 1;',
          '',
          '@Component({',
        ].join('\n'),
      ),
    ).toBe(true);
  });
});
