// Generates /llms.txt (index) and /llms-full.txt (full API dump) into the demo's
// public/ folder, so agents landing on the docs site can read the whole library
// without scraping HTML. See https://llmstxt.org.
//
// Source of truth: the same JSON the API Reference page renders, plus the
// library's package.json — so these files can't drift from the real API.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SITE_URL = 'https://ng-mapcn.vercel.app';
const REPO_URL = 'https://github.com/juanvieiraprado99/ng-mapcn';

const pkg = JSON.parse(readFileSync(join(root, 'projects', 'ng-mapcn', 'package.json'), 'utf8'));
const api = JSON.parse(
  readFileSync(
    join(root, 'projects', 'demo', 'src', 'app', 'pages', 'docs', 'api-reference.data.json'),
    'utf8',
  ),
);

const publicDir = join(root, 'projects', 'demo', 'public');

const INTRO = `> Angular port of [mapcn](https://www.mapcn.dev) — composable MapLibre GL v6 map components in the spirit of shadcn/ui. Standalone, signals-first, OnPush, SSR-safe, theme-aware. Carto basemaps by default, so no API key is required. Distributed both as an npm package and as copy-paste sources via \`ng add\` (you own the code).`;

const INSTALLATION = `## Installation

### Copy-paste (recommended, shadcn-style)

\`\`\`bash
ng add ng-mapcn
\`\`\`

Adds \`maplibre-gl\`, registers its CSS, appends the required \`.maplibregl-popup-*\` overrides and copies the component sources into \`src/app/components/ui/map\` (customize with \`--path\`). \`ng add\` installs with the workspace's package manager (npm, pnpm, yarn or bun).

### npm package

\`\`\`bash
npm install ng-mapcn maplibre-gl
# or: pnpm add / yarn add / bun add ng-mapcn maplibre-gl
\`\`\`

\`\`\`scss
// global styles.scss
@use 'ng-mapcn/src/lib/styles/index' as *;  // tokens + utilities
@use 'ng-mapcn/styles.scss' as *;           // required popup overrides
@import 'maplibre-gl/dist/maplibre-gl.css'; // MapLibre base CSS
\`\`\`

The \`.maplibregl-popup-*\` overrides are **required** — MapLibre injects its own popup chrome, which must be neutralized for popups and tooltips to render correctly.

### Agent skill

\`\`\`bash
npx skills add juanvieiraprado99/ng-mapcn
\`\`\`

Installs the ng-mapcn agent skill (${REPO_URL}/tree/main/skills/ng-mapcn) with the [skills.sh](https://skills.sh) CLI, so coding agents use the real API: selectors, inputs, outputs, setup, recipes and troubleshooting.`;

const QUICK_START = `## Quick start

\`\`\`html
<ng-map [center]="[-46.63, -23.55]" [zoom]="10">
  <ng-map-controls position="bottom-right" [showZoom]="true" [showCompass]="true" />

  <ng-map-marker [longitude]="-46.63" [latitude]="-23.55" [draggable]="true">
    <ng-marker-content><!-- empty = default blue dot --></ng-marker-content>
    <ng-marker-popup><strong>São Paulo</strong></ng-marker-popup>
    <ng-marker-tooltip>Olá!</ng-marker-tooltip>
  </ng-map-marker>

  <ng-map-route [coordinates]="lineCoords" color="#4285F4" [width]="3" />
</ng-map>
\`\`\``;

const BASEMAPS = `## Basemaps

Any MapLibre-compatible style works. Set it per map with the \`styles\` input, or app-wide with \`provideMapStyles()\`. Precedence: \`[styles]\` → \`[blank]\` → \`provideMapStyles()\` → Carto default.

| Provider | Style URL | API key |
|---|---|---|
| Carto (default) | \`https://basemaps.cartocdn.com/gl/{positron|dark-matter|voyager}-gl-style/style.json\` | no |
| OpenFreeMap | \`https://tiles.openfreemap.org/styles/{liberty|bright|positron|dark|fiord}\` | no |
| OpenStreetMap | raster tiles \`https://tile.openstreetmap.org/{z}/{x}/{y}.png\` — build the StyleSpecification by hand; dev/demo only (tile usage policy) | no |
| MapTiler | \`https://api.maptiler.com/maps/{streets-v4|streets-v4-dark|dataviz-v4}/style.json?key=KEY\` | yes |
| Stadia Maps | \`https://tiles.stadiamaps.com/styles/{alidade_smooth|alidade_smooth_dark}.json?api_key=KEY\` | keyless on localhost |`;

const THEMING = `## Theming

Without a \`theme\` input, the map watches the \`dark\`/\`light\` class on \`document.documentElement\` (works with any theme toggler) and falls back to \`prefers-color-scheme\`. Switching theme calls \`map.setStyle(..., { diff: true })\`; every layer component re-adds itself automatically once the style settles.`;

const FEATURES = `## Key Features

- **MapLibre GL JS v6** under the hood — no API keys required (Carto basemaps)
- **Composable** — markers, popups, routes, GeoJSON, arcs, clusters, heatmaps, tile sources, image overlays, 3D buildings and terrain are children of \`<ng-map>\`
- **Signals-first** — standalone components, \`input()\`/\`output()\`, \`effect()\`-based reconciliation, OnPush
- **Theme-aware** — swaps the basemap at runtime, layers survive the style change
- **SSR-safe** — the map is created in \`afterNextRender\`; nothing touches \`document\` on the server
- **Copy-paste distribution** — \`ng add ng-mapcn\` copies the sources into your project (shadcn-style)`;

const TECH_STACK = `## Tech Stack

- Angular 22+ (standalone, signals, zoneless-friendly)
- TypeScript
- MapLibre GL JS v6
- TailwindCSS (demo site)
- Carto basemaps (default tiles)`;

const CREDITS = `## Credits

- [mapcn](https://www.mapcn.dev) — the React + MapLibre GL library this is an Angular port of
- [Zard UI](https://zardui.com) — Angular component library used to build the demo/docs site
- [MapLibre GL JS](https://maplibre.org) — rendering engine
- [Carto](https://carto.com) — default basemaps`;

const componentList = api.sections
  .map((s) => `- **${s.title}** (\`${s.selector}\`): ${s.description}`)
  .join('\n');

// The docs pages group several components (markers page covers marker + content
// + popup + tooltip + label), so this list is not 1:1 with the API sections.
const DOCS_COMPONENT_PAGES = [
  { label: 'Map', slug: 'map' },
  { label: 'Controls', slug: 'controls' },
  { label: 'Legend', slug: 'legend' },
  { label: 'Markers', slug: 'markers' },
  { label: 'Popups', slug: 'popups' },
  { label: 'Routes', slug: 'routes' },
  { label: 'Arcs', slug: 'arcs' },
  { label: 'GeoJSON', slug: 'geojson' },
  { label: 'Clusters', slug: 'clusters' },
  { label: 'Heatmap', slug: 'heatmap' },
  { label: 'Tile Sources', slug: 'tile-sources' },
  { label: '3D Buildings & Terrain', slug: '3d' },
  { label: 'Draw', slug: 'draw' },
  { label: 'Advanced', slug: 'advanced' },
];

// ── llms.txt ─────────────────────────────────────────────────────────────────

const llms = `# ng-mapcn

${INTRO}

Version: ${pkg.version} · License: ${pkg.license ?? 'MIT'} · npm: https://www.npmjs.com/package/ng-mapcn

## Overview

- [Home](${SITE_URL}/): live examples — trails, arcs, fly-to, delivery, analytics, EV charging.
- [Documentation](${SITE_URL}/docs): introduction, features and supported basemaps.
- [Installation](${SITE_URL}/docs/installation): \`ng add\` (copy-paste) or npm package.
- [Map Styles](${SITE_URL}/docs/basemaps): a working example per provider (Carto, OpenFreeMap, OpenStreetMap, MapTiler, Stadia).
- [API Reference](${SITE_URL}/docs/api-reference): every component with inputs and outputs.
- [Roadmap](${SITE_URL}/docs/roadmap): what has shipped and what comes next.
- [Credits](${SITE_URL}/credits): mapcn, Zard UI, MapLibre, Carto.
- [Repository](${REPO_URL}): source, issues, releases.
- [llms-full.txt](${SITE_URL}/llms-full.txt): the complete API in one file, for agents.

## Components

Docs pages: ${DOCS_COMPONENT_PAGES.map((p) => `[${p.label}](${SITE_URL}/docs/components/${p.slug})`).join(' · ')}

${componentList}

\`ng-map\` also takes \`[fitBounds]="{ padding, maxZoom, duration, animate, bounds? }"\` to fit the camera to its children's data (or explicit \`bounds\`) once loaded and whenever they change; \`MapContextService.fitBounds()\` is the imperative form.

Utilities: \`MapViewport\`, \`getViewport\`, \`buildArcCoordinates\`, \`mergeHoverPaint\`, \`blankMapStyle\`, \`defaultStyles\`, \`MapStylesConfig\`, \`provideMapStyles()\`, \`MAP_DEFAULT_STYLES\`, and \`MapContextService\` (map / isLoaded / resolvedTheme signals and the \`hasSource(id)\` source registry, the equivalent of mapcn's \`useMap()\`).

${INSTALLATION}

${QUICK_START}

${BASEMAPS}

${THEMING}

${FEATURES}

${TECH_STACK}

${CREDITS}

## License

${pkg.license ?? 'MIT'}
`;

// ── llms-full.txt ────────────────────────────────────────────────────────────

// A bare `|` ends a table cell even inside backticks (GFM), so escape it.
const cell = (text) => String(text).replaceAll('|', '\\|');

const propTable = (rows) =>
  [
    '| Name | Type | Default | Description |',
    '|---|---|---|---|',
    ...rows.map(
      (r) =>
        `| \`${cell(r.name)}\` | \`${cell(r.type)}\` | ${r.default ? `\`${cell(r.default)}\`` : '—'} | ${cell(r.description)} |`,
    ),
  ].join('\n');

const fullSections = api.sections
  .map((s) => {
    const parts = [`### ${s.title}\n\n\`${s.selector}\`\n\n${s.description}`];
    if (s.inputs.length) parts.push(`**Inputs**\n\n${propTable(s.inputs)}`);
    if (s.outputs.length) parts.push(`**Outputs**\n\n${propTable(s.outputs)}`);
    return parts.join('\n\n');
  })
  .join('\n\n');

const llmsFull = `# ng-mapcn — full reference

${INTRO}

Version: ${pkg.version} · License: ${pkg.license ?? 'MIT'} · Docs: ${SITE_URL} · Repository: ${REPO_URL}

${INSTALLATION}

${QUICK_START}

## Component anatomy

Every part of the component set, and how they nest:

\`\`\`html
${api.anatomyCode}
\`\`\`

## Components

${fullSections}

## MapContextService

Component-scoped service provided by \`ng-map\` — the Angular equivalent of mapcn's \`useMap()\` hook. Inject it in any component projected inside \`ng-map\` to reach the raw map.

${propTable(api.contextRows)}

## provideMapStyles()

Sets the app-wide default basemap through the \`MAP_DEFAULT_STYLES\` token. Every \`ng-map\` without its own \`styles\` input (and without \`blank\`) uses it; pass a signal to swap the basemap at runtime.

\`\`\`ts
${api.provideStylesCode}
\`\`\`

${propTable(api.provideStylesRows)}

## provideMapLabels()

Translates the control buttons, the loader and the popup close button through the \`MAP_LABELS\` token. Partial labels merge over the English defaults; pass a signal to follow the active locale. A \`labels\` input on \`ng-map\`, \`ng-map-controls\` and \`ng-map-popup\` overrides it per component.

\`\`\`ts
${api.provideLabelsCode}
\`\`\`

${propTable(api.provideLabelsRows)}

${BASEMAPS}

${THEMING}

## SSR

The map is created in \`afterNextRender\` (browser-only, after hydration) and every child component gates its work on the map signal, which is \`null\` on the server. On the server the host renders a plain container \`<div>\` plus the loader, which matches the first client render and hydrates cleanly. Enable \`provideClientHydration(withEventReplay())\` in the consumer app.

## Invariants (when editing the library sources)

1. Every source/layer operation is gated on \`MapContextService.isLoaded()\` (map \`load\` + debounced \`styledata\`). A theme or basemap switch calls \`setStyle\`, which destroys layers — the gate closes and reopens, and each layer component's creation \`effect\` re-adds everything.
2. MapLibre objects are created **once** and reconciled with diffed setters; never destroyed/recreated on input changes.
3. Controlled viewport uses an internal flag around \`jumpTo\` plus a \`map.isMoving()\` skip to avoid feedback loops.
4. Teardown is defensive (try/catch): remove layers before the source; symmetric \`map.off\` for every \`map.on(event, layerId, handler)\`.
5. Declarative hover = \`promoteId\` + \`setFeatureState\` + \`mergeHoverPaint\` (case expressions on \`feature-state hover\`).
6. Arcs render an invisible hit layer with \`width = max(line-width + 6, 12)\` under the visible layer.

${FEATURES}

${TECH_STACK}

${CREDITS}

## License

${pkg.license ?? 'MIT'}
`;

writeFileSync(join(publicDir, 'llms.txt'), llms, 'utf8');
writeFileSync(join(publicDir, 'llms-full.txt'), llmsFull, 'utf8');

console.log(
  `Generated llms.txt (${(llms.length / 1024).toFixed(1)} kB) and llms-full.txt (${(llmsFull.length / 1024).toFixed(1)} kB) in projects/demo/public — ng-mapcn ${pkg.version}, ${api.sections.length} components.`,
);
