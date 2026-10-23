/**
 * Declarative schema of the playground: each showcased component is one `PlaygroundSpec`
 * (its inputs as editable `controls`, plus the `fixed` data it needs). The page renders the
 * controls and the live component from the spec, and `buildSnippet` turns the current values
 * back into copy-ready code. Pure data and functions: no Angular, no `ng-mapcn` imports.
 */

export interface SelectOption {
  value: unknown;
  label: string;
}

interface BaseControl {
  /** Unique within the spec; the Angular input name unless `into` is set. */
  key: string;
  label: string;
  description?: string;
  /**
   * Merges this control into one prop of an object input (`fillPaint['fill-color']`), so a
   * flat control can drive a nested value.
   */
  into?: { input: string; prop: string };
  /**
   * Always passed to the component and always in the snippet, even at the default (required
   * inputs, or values whose real default depends on something the control cannot know, such as
   * the theme).
   */
  always?: boolean;
}

export type Control = BaseControl &
  (
    | { kind: 'select'; options: SelectOption[]; default: unknown }
    | { kind: 'range'; min: number; max: number; step: number; default: number }
    | { kind: 'boolean'; default: boolean }
    | { kind: 'color'; default: string }
    | { kind: 'text'; default: string }
    /**
     * Edited as JSON text; the parsed value is the input. `validate` returns an error message
     * for a parsed value the component cannot take (the last good value is kept).
     */
    | { kind: 'json'; default: unknown; validate?: (value: unknown) => string | null }
  );

/** An input the playground always passes and the user does not edit (the component's data). */
export interface FixedInput {
  input: string;
  value: unknown;
  /** Declaration emitted into the snippet's class, so `[input]="input"` resolves. */
  ts: string;
}

export interface PlaygroundSpec {
  id: string;
  label: string;
  description: string;
  /** Layer component element; `undefined` for the map alone. */
  selector?: string;
  className?: string;
  /** Static string attributes, e.g. the layer `id`. */
  attrs?: Record<string, string>;
  controls: Control[];
  fixed: FixedInput[];
  /** The component draws from the Carto building source, so it needs a basemap with buildings. */
  requiresCarto?: boolean;
  /** Content projected into the layer element (e.g. the marker's `<ng-marker-content />`). */
  content?: { template: string; imports: string[] };
  /** Initial view that frames the component's data. */
  view: { center: [number, number]; zoom: number; pitch?: number; bearing?: number };
}

export interface TemplateAttr {
  name: string;
  /** Rendered as `[name]="expr"` (a reference to a class member). */
  expr?: string;
  /** Strings render as `name="value"`, everything else as `[name]="literal"`. */
  value?: unknown;
}

/** What the map around the component contributes to the snippet. */
export interface MapSnippetInput {
  attrs: TemplateAttr[];
  /** Class member declarations (e.g. the `styles` constant). */
  ts?: string[];
  /** Extra `ng-mapcn` type imports used by `ts`. */
  imports?: string[];
  /** Module-level declarations emitted between the imports and `@Component`. */
  declarations?: string[];
  /** Extra `import type { ... } from '...'` lines (types from other packages). */
  typeImports?: { from: string; names: string[] }[];
}

export type Values = Record<string, unknown>;

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** Serializes a value as an Angular template expression (single-quoted strings). */
export function toTemplateExpr(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'string') {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  if (Array.isArray(value)) {
    return `[${value.map(toTemplateExpr).join(', ')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) return '{}';
  return `{ ${entries
    .map(([k, v]) => `${IDENTIFIER.test(k) ? k : toTemplateExpr(k)}: ${toTemplateExpr(v)}`)
    .join(', ')} }`;
}

export function controlDefaults(controls: readonly Control[]): Values {
  return Object.fromEntries(controls.map((c) => [c.key, c.default]));
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function groupInto(controls: readonly Control[], values: Values, onlyChanged: boolean) {
  const grouped = new Map<string, Record<string, unknown>>();
  for (const control of controls) {
    if (!control.into) continue;
    const value = values[control.key];
    if (onlyChanged && !control.always && same(value, control.default)) continue;
    const bag = grouped.get(control.into.input) ?? {};
    bag[control.into.prop] = value;
    grouped.set(control.into.input, bag);
  }
  return grouped;
}

/** The inputs to bind on the live component: fixed data, plain controls and changed grouped props. */
export function resolveInputs(spec: PlaygroundSpec, values: Values): Values {
  const inputs: Values = { ...spec.attrs };
  for (const fixed of spec.fixed) inputs[fixed.input] = fixed.value;
  for (const control of spec.controls) {
    if (!control.into) inputs[control.key] = values[control.key];
  }
  // Untouched grouped props are left out so the component keeps its own (theme-aware) defaults.
  for (const [input, bag] of groupInto(spec.controls, values, true)) inputs[input] = bag;
  return inputs;
}

const escapeAttr = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** The template ends up inside a TS template literal in the Component tab. */
const escapeLiteral = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

function renderAttr(attr: TemplateAttr): string {
  if (attr.expr !== undefined) return `[${attr.name}]="${escapeAttr(attr.expr)}"`;
  if (typeof attr.value === 'string') {
    return `${attr.name}="${escapeAttr(attr.value)}"`;
  }
  return `[${attr.name}]="${escapeAttr(toTemplateExpr(attr.value))}"`;
}

function renderElement(tag: string, attrs: string[], indent: string, selfClose: boolean): string {
  const single = `<${tag}${attrs.map((a) => ` ${a}`).join('')}${selfClose ? ' />' : '>'}`;
  if (attrs.length <= 3 && indent.length + single.length <= 90) return single;
  const inner = `${indent}  `;
  return `<${tag}\n${attrs.map((a) => `${inner}${a}`).join('\n')}\n${indent}${selfClose ? '/>' : '>'}`;
}

/** One component of a scene snippet with its control values. */
export interface SnippetLayer {
  spec: PlaygroundSpec;
  values: Values;
}

/** Copy-ready code for the current state: the template alone and a full standalone component. */
export function buildSnippet(
  spec: PlaygroundSpec,
  values: Values,
  map: MapSnippetInput,
): { template: string; component: string } {
  return buildSceneSnippet(spec.selector ? [{ spec, values }] : [], map);
}

/**
 * Renames a fixed member whose name is already taken by a different declaration (two heatmaps
 * with their own `data`), so every layer of a scene binds its own class member.
 */
function claimMember(members: Map<string, string>, fixed: FixedInput): string {
  let name = fixed.input;
  for (let n = 2; members.has(name) && members.get(name) !== fixed.ts; n++) {
    name = `${fixed.input}${n}`;
  }
  if (!members.has(name)) {
    const ts =
      name === fixed.input
        ? fixed.ts
        : fixed.ts.replace(new RegExp(`^readonly ${fixed.input}\\b`), `readonly ${name}`);
    members.set(name, ts);
  }
  return name;
}

function renderLayer(spec: PlaygroundSpec, values: Values, members: Map<string, string>): string {
  const selector = spec.selector!;
  const attrs: string[] = [];
  for (const [name, value] of Object.entries(spec.attrs ?? {})) {
    attrs.push(renderAttr({ name, value }));
  }
  for (const fixed of spec.fixed) attrs.push(`[${fixed.input}]="${claimMember(members, fixed)}"`);
  for (const control of spec.controls) {
    if (control.into) continue;
    if (!control.always && same(values[control.key], control.default)) continue;
    attrs.push(renderAttr({ name: control.key, value: values[control.key] }));
  }
  for (const [input, bag] of groupInto(spec.controls, values, true)) {
    attrs.push(renderAttr({ name: input, value: bag }));
  }
  const { content } = spec;
  return content
    ? [
        renderElement(selector, attrs, '  ', false),
        `    ${content.template}`,
        `  </${selector}>`,
      ].join('\n')
    : renderElement(selector, attrs, '  ', true);
}

/**
 * Copy-ready code for a whole scene: every layer inside one `<ng-map>`, in creation (drawing)
 * order, with their class members and imports merged.
 */
export function buildSceneSnippet(
  layers: readonly SnippetLayer[],
  map: MapSnippetInput,
): { template: string; component: string } {
  const mapAttrs = map.attrs.map(renderAttr);
  const members = new Map<string, string>();
  const rendered = layers
    .filter(({ spec }) => spec.selector)
    .map(({ spec, values }) => renderLayer(spec, values, members));

  const template = rendered.length
    ? `${renderElement('ng-map', mapAttrs, '', false)}\n${rendered.map((layer) => `  ${layer}`).join('\n')}\n</ng-map>`
    : renderElement('ng-map', mapAttrs, '', true);

  const imports = [
    ...new Set([
      'MapComponent',
      ...layers
        .filter(({ spec }) => spec.selector && spec.className)
        .flatMap(({ spec }) => [spec.className!, ...(spec.content?.imports ?? [])]),
    ]),
  ];
  const libImports = [...imports, ...(map.imports ?? [])];
  const memberLines = [...members.values(), ...(map.ts ?? [])];
  const indented = escapeLiteral(template)
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n');
  const body = memberLines.length
    ? `{\n${memberLines.map((m) => `  ${m.split('\n').join('\n  ')}`).join('\n')}\n}`
    : '{}';

  const importLines = [
    "import { Component } from '@angular/core';",
    ...(map.typeImports ?? []).map(
      (t) => `import type { ${t.names.join(', ')} } from '${t.from}';`,
    ),
    `import { ${libImports.join(', ')} } from 'ng-mapcn';`,
  ];
  const declarations = (map.declarations ?? []).map((d) => `${d}\n\n`).join('');
  const component = `${importLines.join('\n')}\n\n${declarations}@Component({
  selector: 'app-map',
  standalone: true,
  imports: [${imports.join(', ')}],
  template: \`
    <div class="h-[420px]">
${indented}
    </div>
  \`,
})
export class AppMapComponent ${body}`;

  return { template, component };
}
