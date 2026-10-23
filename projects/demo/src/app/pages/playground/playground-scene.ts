import {
  type Control,
  controlDefaults,
  type PlaygroundSpec,
  type Values,
} from './playground-schema';
import { findSpec, PLAYGROUND_SPECS } from './playground-specs';
import { findPreset, initialMapState, type MapState, STYLE_PRESETS } from './style-presets';

/**
 * The playground's scene: a stack of component instances ("layers") over one map. Pure data and
 * functions like the schema, so the stack edits and the shareable URL are testable alone.
 */

export interface SceneLayer {
  /** Stable identity (tracking, selection); never reused within a scene. */
  uid: number;
  specId: string;
  /**
   * Instance name: the spec id, suffixed (`route-2`) when the spec is already in the scene. It
   * prefixes the control ids and suffixes the layer `id` attribute, so two blocks never clash.
   */
  name: string;
  values: Values;
  visible: boolean;
}

export interface Scene {
  /** Top of the stack first, as listed in the UI; the map draws the last one first. */
  layers: SceneLayer[];
  map: MapState;
}

/** The blocks of the palette: every spec that renders a component (not the bare map). */
export const LAYER_SPECS: readonly PlaygroundSpec[] = PLAYGROUND_SPECS.filter(
  (spec) => spec.selector,
);

/** Upper bound for a decoded scene, so a crafted link cannot freeze the page. */
export const MAX_LAYERS = 20;

const DEFAULT_SPEC_ID = 'route';

function nextUid(layers: readonly SceneLayer[]): number {
  return layers.reduce((max, layer) => Math.max(max, layer.uid), 0) + 1;
}

function nextName(layers: readonly SceneLayer[], specId: string): string {
  const taken = new Set(layers.map((layer) => layer.name));
  if (!taken.has(specId)) return specId;
  let n = 2;
  while (taken.has(`${specId}-${n}`)) n++;
  return `${specId}-${n}`;
}

export function createLayer(
  layers: readonly SceneLayer[],
  specId: string,
  values?: Values,
): SceneLayer {
  const spec = findSpec(specId);
  return {
    uid: nextUid(layers),
    specId: spec.id,
    name: nextName(layers, spec.id),
    values: { ...controlDefaults(spec.controls), ...values },
    visible: true,
  };
}

/** A `single` spec (terrain, draw) is allowed once per map. */
export function canAdd(layers: readonly SceneLayer[], specId: string): boolean {
  return !findSpec(specId).single || !layers.some((layer) => layer.specId === specId);
}

/**
 * Inserts a new instance of `specId` at `index` (0 = top of the stack); `layer` is undefined
 * when the spec is `single` and already in the scene.
 */
export function addLayer(
  layers: readonly SceneLayer[],
  specId: string,
  index = 0,
): { layers: SceneLayer[]; layer?: SceneLayer } {
  if (!canAdd(layers, specId)) return { layers: [...layers] };
  const layer = createLayer(layers, specId);
  const next = [...layers];
  next.splice(Math.max(0, Math.min(index, next.length)), 0, layer);
  return { layers: next, layer };
}

export function removeLayer(layers: readonly SceneLayer[], uid: number): SceneLayer[] {
  return layers.filter((layer) => layer.uid !== uid);
}

export function moveLayer(layers: readonly SceneLayer[], from: number, to: number): SceneLayer[] {
  const next = [...layers];
  if (from < 0 || from >= next.length) return next;
  const [layer] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, layer);
  return next;
}

/** A copy of the layer with its values, placed right above it. */
export function duplicateLayer(
  layers: readonly SceneLayer[],
  uid: number,
): { layers: SceneLayer[]; layer?: SceneLayer } {
  const index = layers.findIndex((layer) => layer.uid === uid);
  if (index < 0) return { layers: [...layers] };
  const source = layers[index];
  if (!canAdd(layers, source.specId)) return { layers: [...layers] };
  const layer = createLayer(layers, source.specId, structuredClone(source.values));
  const next = [...layers];
  next.splice(index, 0, layer);
  return { layers: next, layer };
}

export function updateLayer(
  layers: readonly SceneLayer[],
  uid: number,
  patch: Partial<Pick<SceneLayer, 'values' | 'visible'>>,
): SceneLayer[] {
  return layers.map((layer) => (layer.uid === uid ? { ...layer, ...patch } : layer));
}

/**
 * The layer's spec as rendered: a second instance gets a suffixed `id` (`route-2`), and 3D
 * buildings read their source from the picked basemap when it is not Carto.
 */
export function layerSpec(layer: SceneLayer, presetId: string): PlaygroundSpec {
  const spec = findSpec(layer.specId);
  const attrs = { ...spec.attrs };
  const suffix = layer.name.slice(spec.id.length);
  if (suffix && typeof attrs['id'] === 'string') attrs['id'] = `${attrs['id']}${suffix}`;
  const building = findPreset(presetId).buildingSource;
  if (spec.id === 'fill-extrusion' && building) Object.assign(attrs, building);
  return spec.attrs || suffix ? { ...spec, attrs } : spec;
}

/** Points the camera at a spec's data; a tilted basemap preset keeps its own tilt. */
export function frameSpec(map: MapState, spec: PlaygroundSpec): MapState {
  const preset = findPreset(map.presetId);
  return {
    ...map,
    center: spec.view.center,
    zoom: spec.view.zoom,
    pitch: preset.pitch ?? spec.view.pitch ?? 0,
    bearing: preset.bearing ?? spec.view.bearing ?? 0,
  };
}

export function defaultScene(): Scene {
  const spec = findSpec(DEFAULT_SPEC_ID);
  return {
    layers: [createLayer([], spec.id)],
    map: frameSpec(initialMapState(spec.view.zoom), spec),
  };
}

// ── Shareable link ────────────────────────────────────────────────────────────

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

interface EncodedLayer {
  s: string;
  /** Only the values that differ from the defaults. */
  v?: Values;
  h?: 1;
}

interface EncodedScene {
  v: 1;
  m: MapState;
  l: EncodedLayer[];
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const binary = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

/** The scene as a compact URL-safe string for the `?scene=` query parameter. */
export function encodeScene(scene: Scene): string {
  const encoded: EncodedScene = {
    v: 1,
    m: scene.map,
    l: scene.layers.map((layer) => {
      const spec = findSpec(layer.specId);
      const changed = spec.controls.filter(
        (control) => !same(layer.values[control.key], control.default),
      );
      return {
        s: layer.specId,
        ...(changed.length && {
          v: Object.fromEntries(changed.map((control) => [control.key, layer.values[control.key]])),
        }),
        ...(!layer.visible && { h: 1 as const }),
      };
    }),
  };
  return toBase64Url(JSON.stringify(encoded));
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** The value if the control can take it, otherwise its default. */
function sanitizeValue(control: Control, value: unknown): unknown {
  switch (control.kind) {
    case 'range':
      return isFiniteNumber(value)
        ? Math.min(control.max, Math.max(control.min, value))
        : control.default;
    case 'boolean':
      return typeof value === 'boolean' ? value : control.default;
    case 'color':
    case 'text':
      return typeof value === 'string' ? value : control.default;
    case 'select':
      return control.options.find((option) => same(option.value, value))?.value ?? control.default;
    case 'json':
      return value !== undefined && !control.validate?.(value) ? value : control.default;
  }
}

function decodeMap(raw: unknown): MapState {
  const fallback = initialMapState(2);
  if (!raw || typeof raw !== 'object') return fallback;
  const map = raw as Partial<Record<keyof MapState, unknown>>;
  const center =
    Array.isArray(map.center) && map.center.length === 2 && map.center.every(isFiniteNumber)
      ? ([map.center[0], map.center[1]] as [number, number])
      : undefined;
  return {
    presetId: STYLE_PRESETS.some((preset) => preset.id === map.presetId)
      ? String(map.presetId)
      : fallback.presetId,
    theme: map.theme === 'light' || map.theme === 'dark' ? map.theme : 'auto',
    projection: map.projection === 'globe' ? 'globe' : 'mercator',
    zoom: isFiniteNumber(map.zoom) ? Math.min(22, Math.max(0, map.zoom)) : fallback.zoom,
    pitch: isFiniteNumber(map.pitch) ? Math.min(85, Math.max(0, map.pitch)) : 0,
    bearing: isFiniteNumber(map.bearing) ? map.bearing : 0,
    ...(center && { center }),
  };
}

/**
 * Reads a `?scene=` string back. Anything unknown is dropped or replaced by its default (the link
 * may be hand-edited or come from an older playground); `null` when it is not a scene at all.
 */
export function decodeScene(code: string | null | undefined): Scene | null {
  if (!code) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(code));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const { v, m, l } = raw as Partial<EncodedScene>;
  if (v !== 1 || !Array.isArray(l)) return null;

  let layers: SceneLayer[] = [];
  for (const entry of l.slice(0, MAX_LAYERS)) {
    const spec = LAYER_SPECS.find((candidate) => candidate.id === entry?.s);
    if (!spec || !canAdd(layers, spec.id)) continue;
    const stored = entry.v && typeof entry.v === 'object' ? entry.v : {};
    const values = Object.fromEntries(
      spec.controls.map((control) => [
        control.key,
        control.key in stored ? sanitizeValue(control, stored[control.key]) : control.default,
      ]),
    );
    // Appended in order: the first entry is the top of the stack.
    layers = [...layers, { ...createLayer(layers, spec.id, values), visible: entry.h !== 1 }];
  }
  return { layers, map: decodeMap(m) };
}
