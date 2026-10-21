import type { StyleSpecification } from 'maplibre-gl';

import { OSM_RASTER_STYLE, OSM_RASTER_STYLE_CODE } from '../../shared/osm-style';
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
  /**
   * Per-theme styles (URLs or hand-built style objects); omitted = whatever the app provides.
   * `CARTO` is the library default, so the snippets leave it out.
   */
  styles?: { light: string | StyleSpecification; dark: string | StyleSpecification };
  /** Declaration of an object style for the snippets (the object itself cannot be printed). */
  stylesCode?: { name: string; declaration: string };
  /** The basemap is a Carto style, whose building source `ng-map-fill-extrusion` finds by default. */
  hasCartoSource?: boolean;
  /** Basemap whose style needs the user's API key (read from the header's basemap picker). */
  keyed?: 'maptiler' | 'stadia';
  /** Building source of a non-Carto vector basemap, passed to `ng-map-fill-extrusion`. */
  buildingSource?: { source: string; sourceLayer: string };
  blank?: boolean;
  projection?: 'mercator' | 'globe';
  pitch?: number;
  bearing?: number;
  /** Shown on the gallery card. */
  note?: string;
}

/** The library's built-in basemap, applied explicitly so the gallery does not follow the header picker. */
const CARTO = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

/** Stands in for the user's key in the printed snippets; swapped for the real key at runtime. */
export const KEY_PLACEHOLDER = 'YOUR_API_KEY';

/** Styles ready for `<ng-map>`: the placeholder becomes the user's key, `undefined` = no key yet. */
export function resolveStyles(preset: StylePreset, key: string | undefined): StylePreset['styles'] {
  if (!preset.styles || !preset.keyed) return preset.styles;
  if (!key) return preset.keyed === 'stadia' ? withKey(preset.styles, '') : undefined;
  return withKey(preset.styles, key);
}

function withKey(styles: NonNullable<StylePreset['styles']>, key: string) {
  const swap = (style: string | StyleSpecification) =>
    typeof style === 'string'
      ? style
          .replace(`?key=${KEY_PLACEHOLDER}`, key ? `?key=${encodeURIComponent(key)}` : '')
          .replace(`?api_key=${KEY_PLACEHOLDER}`, key ? `?api_key=${encodeURIComponent(key)}` : '')
      : style;
  return { light: swap(styles.light), dark: swap(styles.dark) };
}

export const STYLE_PRESETS: readonly StylePreset[] = [
  {
    id: 'carto',
    label: 'Carto (default)',
    description: 'Positron in light mode, Dark Matter in dark mode. No configuration needed.',
    note: 'Default: no input needed. © CARTO, © OpenStreetMap contributors.',
    styles: CARTO,
    hasCartoSource: true,
  },
  {
    id: 'voyager',
    label: 'Carto Voyager',
    description: 'The colorful Voyager basemap for light mode, Dark Matter for dark mode.',
    styles: {
      light: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    },
    note: '© CARTO, © OpenStreetMap contributors.',
    hasCartoSource: true,
  },
  {
    id: 'openfreemap',
    label: 'OpenFreeMap',
    description: 'Free vector tiles with no key or limits: Positron and Dark.',
    styles: {
      light: 'https://tiles.openfreemap.org/styles/positron',
      dark: 'https://tiles.openfreemap.org/styles/dark',
    },
    note: '© OpenFreeMap, © OpenMapTiles, data from OpenStreetMap.',
    buildingSource: { source: 'openmaptiles', sourceLayer: 'building' },
  },
  {
    id: 'osm',
    label: 'OpenStreetMap',
    description: 'Standard OSM raster tiles. Light only: the same tiles show in dark mode.',
    note: '© OpenStreetMap contributors. Dev/demo only (OSM tile usage policy).',
    styles: { light: OSM_RASTER_STYLE, dark: OSM_RASTER_STYLE },
    stylesCode: { name: 'OSM_STYLE', declaration: OSM_RASTER_STYLE_CODE },
  },
  {
    id: 'maptiler',
    label: 'MapTiler',
    description: 'MapTiler Streets vector tiles, light and dark. Needs your API key.',
    styles: {
      light: `https://api.maptiler.com/maps/streets-v4/style.json?key=${KEY_PLACEHOLDER}`,
      dark: `https://api.maptiler.com/maps/streets-v4-dark/style.json?key=${KEY_PLACEHOLDER}`,
    },
    keyed: 'maptiler',
    buildingSource: { source: 'openmaptiles', sourceLayer: 'building' },
    note: 'Paste your key in the header map style picker. © MapTiler, © OpenStreetMap contributors.',
  },
  {
    id: 'stadia',
    label: 'Stadia Maps',
    description: 'Alidade Smooth vector tiles, light and dark. Key optional on localhost.',
    styles: {
      light: `https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=${KEY_PLACEHOLDER}`,
      dark: `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json?api_key=${KEY_PLACEHOLDER}`,
    },
    keyed: 'stadia',
    buildingSource: { source: 'openmaptiles', sourceLayer: 'building' },
    note: '© Stadia Maps, © OpenMapTiles, © OpenStreetMap contributors.',
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
    styles: CARTO,
    hasCartoSource: true,
    projection: 'globe',
  },
  {
    id: 'tilted',
    label: '3D tilt',
    description: 'A pitched, rotated camera, the starting point for 3D buildings.',
    styles: CARTO,
    hasCartoSource: true,
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
  /** Set once the user moves the map; until then the spec's initial center applies. */
  center?: [number, number];
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

/**
 * A preset replaces the basemap and projection; theme and zoom are kept. Tilt is only replaced
 * by a preset that defines one, so 3D buildings stay tilted when another basemap is picked.
 */
export function applyPreset(state: MapState, preset: StylePreset): MapState {
  return {
    ...state,
    presetId: preset.id,
    projection: preset.projection ?? 'mercator',
    pitch: preset.pitch ?? state.pitch,
    bearing: preset.bearing ?? state.bearing,
  };
}

export interface MapView {
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
}

/** Runtime inputs for `<ng-map>`. Camera changes go through the controlled `viewport`. */
export function mapInputs(state: MapState, view: MapView, key?: string) {
  const preset = findPreset(state.presetId);
  return {
    center: view.center,
    zoom: view.zoom,
    theme: state.theme,
    styles: resolveStyles(preset, key),
    blank: !!preset.blank,
    projection: state.projection === 'globe' ? ({ type: 'globe' } as const) : undefined,
    viewport: {
      ...(state.center && { center: state.center }),
      zoom: state.zoom,
      pitch: state.pitch,
      bearing: state.bearing,
    },
  };
}

/** Styles the snippets must spell out; the library default needs no input. */
function customStyles(preset: StylePreset) {
  return preset.styles === CARTO ? undefined : preset.styles;
}

/** `[styles]` constant declaration shared by the gallery snippet and the playground snippet. */
function stylesDeclaration(preset: StylePreset): string {
  const { styles, stylesCode } = preset;
  if (!styles) return '';
  if (typeof styles.light !== 'string' && stylesCode) {
    return `readonly styles: MapStylesConfig = { light: ${stylesCode.name}, dark: ${stylesCode.name} };`;
  }
  return `readonly styles: MapStylesConfig = {
  light: '${String(styles.light)}',
  dark: '${String(styles.dark)}',
};`;
}

/** The map's contribution to the playground snippet (initial camera + basemap + look). */
export function mapSnippetInput(state: MapState, view: MapView): MapSnippetInput {
  const preset = findPreset(state.presetId);
  // The camera is live (the user can pan and zoom): print it rounded.
  const [lng, lat] = state.center ?? view.center;
  const attrs: TemplateAttr[] = [
    { name: 'center', value: [+lng.toFixed(4), +lat.toFixed(4)] },
    { name: 'zoom', value: +state.zoom.toFixed(2) },
  ];
  const ts: string[] = [];
  const imports: string[] = [];
  const declarations: string[] = [];
  const typeImports: { from: string; names: string[] }[] = [];

  if (preset.blank) attrs.push({ name: 'blank', expr: 'true' });
  if (customStyles(preset)) {
    attrs.push({ name: 'styles', expr: 'styles' });
    ts.push(stylesDeclaration(preset));
    imports.push('MapStylesConfig');
    if (preset.stylesCode) {
      declarations.push(preset.stylesCode.declaration);
      typeImports.push({ from: 'maplibre-gl', names: ['StyleSpecification'] });
    }
  }
  if (state.theme !== 'auto') attrs.push({ name: 'theme', value: state.theme });
  if (state.projection === 'globe') {
    attrs.push({ name: 'projection', value: { type: 'globe' } });
  }
  const camera: Record<string, number> = {};
  if (Math.round(state.pitch)) camera['pitch'] = Math.round(state.pitch);
  if (Math.round(state.bearing)) camera['bearing'] = Math.round(state.bearing);
  if (Object.keys(camera).length) attrs.push({ name: 'options', value: camera });

  return { attrs, ts, imports, declarations, typeImports };
}

/** The gallery's copy-ready code for a preset: a template and, for custom styles, the app provider. */
export function presetSnippet(preset: StylePreset): { template: string; provider?: string } {
  const styles = customStyles(preset);
  if (styles && preset.stylesCode) {
    const { name, declaration } = preset.stylesCode;
    return {
      template: '<ng-map [styles]="styles" />',
      provider: `import type { StyleSpecification } from 'maplibre-gl';

${declaration}

// In the component
${stylesDeclaration(preset)}

// Or once for the whole app (app.config.ts)
provideMapStyles({ light: ${name}, dark: ${name} }),`,
    };
  }
  if (styles) {
    return {
      template: `<ng-map [styles]="${toTemplateExpr(styles)}" />`,
      provider: `// Or once for the whole app (app.config.ts)
provideMapStyles({
  light: '${String(styles.light)}',
  dark: '${String(styles.dark)}',
}),`,
    };
  }
  const attrs: string[] = [];
  // `blank` has no boolean-attribute transform, so it has to be bound.
  if (preset.blank) attrs.push('[blank]="true"');
  if (preset.projection === 'globe') attrs.push(`[projection]="{ type: 'globe' }"`);
  const camera: Record<string, number> = {};
  if (preset.pitch) camera['pitch'] = preset.pitch;
  if (preset.bearing) camera['bearing'] = preset.bearing;
  if (Object.keys(camera).length) attrs.push(`[options]="${toTemplateExpr(camera)}"`);
  if (!attrs.length) {
    return {
      template:
        '<!-- No inputs: the built-in Carto basemap follows the light/dark theme -->\n<ng-map />',
    };
  }
  return { template: `<ng-map ${attrs.join(' ')} />` };
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
  { kind: 'range', key: 'pitch', label: 'Pitch', min: 0, max: 60, step: 5, default: 0 },
  { kind: 'range', key: 'bearing', label: 'Bearing', min: -180, max: 180, step: 10, default: 0 },
];

/** Applies one map control change; picking a basemap applies the whole preset. */
export function updateMapState(state: MapState, key: string, value: unknown): MapState {
  if (key === 'presetId') return applyPreset(state, findPreset(String(value)));
  return { ...state, [key]: value } as MapState;
}
