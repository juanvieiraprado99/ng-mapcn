import { describe, expect, it } from 'vitest';

import {
  buildSnippet,
  controlDefaults,
  type PlaygroundSpec,
  resolveInputs,
  toTemplateExpr,
} from './playground-schema';
import { PLAYGROUND_SPECS } from './playground-specs';

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
