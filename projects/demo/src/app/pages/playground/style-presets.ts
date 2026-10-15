import type { Control, MapSnippetInput, TemplateAttr } from './playground-schema';
import { toTemplateExpr } from './playground-schema';

/**
 * The style / theme gallery: each preset is a full look for the map (basemap, projection, camera
 * tilt). Pure data, so it also feeds the copy-ready `[styles]` / `provideMapStyles()` snippets.
 */
export interface StylePreset {
  id: string;
  label: string;
  description: string;
  /** Per-theme style URLs; omitted = the library's built-in Carto defaults. */
  styles?: { light: string; dark: string };
  blank?: boolean;
  projection?: 'mercator' | 'globe';
  pitch?: number;
  bearing?: number;
}

export const STYLE_PRESETS: readonly StylePreset[] = [
  {
    id: 'carto',
    label: 'Carto (default)',
    description: 'Positron in light mode, Dark Matter in dark mode. No configuration needed.',
  },
  {
    id: 'voyager',
    label: 'Carto Voyager',
    description: 'The colorful Voyager basemap for light mode, Dark Matter for dark mode.',
    styles: {
      light: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    },
  },
  {
    id: 'openfreemap',
    label: 'OpenFreeMap',
    description: 'Free vector tiles with no key or limits: Positron and Dark.',
    styles: {
      light: 'https://tiles.openfreemap.org/styles/positron',
      dark: 'https://tiles.openfreemap.org/styles/dark',
    },
  },
  {
    id: 'blank',
    label: 'Blank',
    description: 'A transparent, tile-less canvas for your own layers.',
    blank: true,
  },
  {
    id: 'globe',
    label: 'Globe projection',
    description: 'The default basemap on a 3D globe instead of Web Mercator.',
    projection: 'globe',
  },
  {
    id: 'tilted',
    label: '3D tilt',
    description: 'A pitched, rotated camera, the starting point for 3D buildings.',
    pitch: 60,
    bearing: -20,
  },
];

export const DEFAULT_PRESET_ID = 'carto';

export function findPreset(id: string): StylePreset {
  return STYLE_PRESETS.find((preset) => preset.id === id) ?? STYLE_PRESETS[0];
}

export type MapTheme = 'auto' | 'light' | 'dark';

/** The map-level controls of the playground. */
export interface MapState {
  presetId: string;
  theme: MapTheme;
  projection: 'mercator' | 'globe';
  pitch: number;
  bearing: number;
  zoom: number;
}

export function initialMapState(zoom: number, pitch = 0, bearing = 0): MapState {
  return {
    presetId: DEFAULT_PRESET_ID,
    theme: 'auto',
    projection: 'mercator',
    pitch,
    bearing,
    zoom,
  };
}

/** A preset replaces the whole look (basemap, projection, tilt); theme and zoom are kept. */
export function applyPreset(state: MapState, preset: StylePreset): MapState {
  return {
    ...state,
    presetId: preset.id,
    projection: preset.projection ?? 'mercator',
    pitch: preset.pitch ?? 0,
    bearing: preset.bearing ?? 0,
  };
}

export interface MapView {
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
}

/** Runtime inputs for `<ng-map>`. Camera changes go through the controlled `viewport`. */
export function mapInputs(state: MapState, view: MapView) {
  const preset = findPreset(state.presetId);
  return {
    center: view.center,
    zoom: view.zoom,
    theme: state.theme,
    styles: preset.styles,
    blank: !!preset.blank,
    projection: state.projection === 'globe' ? ({ type: 'globe' } as const) : undefined,
    viewport: { zoom: state.zoom, pitch: state.pitch, bearing: state.bearing },
  };
}

/** `[styles]` constant declaration shared by the gallery snippet and the playground snippet. */
function stylesDeclaration(styles: { light: string; dark: string }): string {
  return `readonly styles: MapStylesConfig = {\n  light: '${styles.light}',\n  dark: '${styles.dark}',\n};`;
}

/** The map's contribution to the playground snippet (initial camera + basemap + look). */
export function mapSnippetInput(state: MapState, view: MapView): MapSnippetInput {
  const preset = findPreset(state.presetId);
  const attrs: TemplateAttr[] = [
    { name: 'center', value: view.center },
    { name: 'zoom', value: state.zoom },
  ];
  const ts: string[] = [];
  const imports: string[] = [];

  if (preset.blank) attrs.push({ name: 'blank', expr: 'true' });
  if (preset.styles) {
    attrs.push({ name: 'styles', expr: 'styles' });
    ts.push(stylesDeclaration(preset.styles));
    imports.push('MapStylesConfig');
  }
  if (state.theme !== 'auto') attrs.push({ name: 'theme', value: state.theme });
  if (state.projection === 'globe') {
    attrs.push({ name: 'projection', value: { type: 'globe' } });
  }
  const camera: Record<string, number> = {};
  if (state.pitch) camera['pitch'] = state.pitch;
  if (state.bearing) camera['bearing'] = state.bearing;
  if (Object.keys(camera).length) attrs.push({ name: 'options', value: camera });

  return { attrs, ts, imports };
}

/** The gallery's copy-ready code for a preset. */
export function presetSnippet(preset: StylePreset): string {
  const lines: string[] = [];
  if (preset.styles) {
    lines.push(
      '<!-- Per map -->',
      `<ng-map [styles]="${toTemplateExpr(preset.styles)}" />`,
      '',
      '// ...or once for the whole app (app.config.ts)',
      `provideMapStyles({\n  light: '${preset.styles.light}',\n  dark: '${preset.styles.dark}',\n}),`,
    );
    return lines.join('\n');
  }
  const attrs: string[] = [];
  if (preset.blank) attrs.push('blank');
  if (preset.projection === 'globe') attrs.push(`[projection]="{ type: 'globe' }"`);
  const camera: Record<string, number> = {};
  if (preset.pitch) camera['pitch'] = preset.pitch;
  if (preset.bearing) camera['bearing'] = preset.bearing;
  if (Object.keys(camera).length) attrs.push(`[options]="${toTemplateExpr(camera)}"`);
  if (!attrs.length) {
    return '<!-- No inputs: the built-in Carto basemap follows the light/dark theme -->\n<ng-map />';
  }
  return `<ng-map ${attrs.join(' ')} />`;
}

/** Map-level fields of the playground, rendered by the same controls component as the layers. */
export const MAP_CONTROLS: readonly Control[] = [
  {
    kind: 'select',
    key: 'presetId',
    label: 'Basemap',
    default: DEFAULT_PRESET_ID,
    options: STYLE_PRESETS.map((preset) => ({ value: preset.id, label: preset.label })),
  },
  {
    kind: 'select',
    key: 'theme',
    label: 'Theme',
    default: 'auto',
    options: [
      { value: 'auto', label: 'Auto (follows the site)' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ],
  },
  {
    kind: 'select',
    key: 'projection',
    label: 'Projection',
    default: 'mercator',
    options: [
      { value: 'mercator', label: 'Mercator' },
      { value: 'globe', label: 'Globe' },
    ],
  },
  { kind: 'range', key: 'zoom', label: 'Zoom', min: 0, max: 20, step: 0.5, default: 2 },
  { kind: 'range', key: 'pitch', label: 'Pitch', min: 0, max: 80, step: 5, default: 0 },
  { kind: 'range', key: 'bearing', label: 'Bearing', min: -180, max: 180, step: 10, default: 0 },
];

/** Applies one map control change; picking a basemap applies the whole preset. */
export function updateMapState(state: MapState, key: string, value: unknown): MapState {
  if (key === 'presetId') return applyPreset(state, findPreset(String(value)));
  return { ...state, [key]: value } as MapState;
}
