<p align="center">
  <img src="https://raw.githubusercontent.com/juanvieiraprado99/ng-mapcn/main/projects/demo/public/github_banner.png" alt="ng-mapcn: beautiful maps for Angular" />
</p>

# ng-mapcn

<p>
  <a href="https://www.npmjs.com/package/ng-mapcn"><img src="https://img.shields.io/npm/v/ng-mapcn/beta?label=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/ng-mapcn"><img src="https://img.shields.io/npm/dm/ng-mapcn" alt="npm downloads" /></a>
  <a href="https://github.com/juanvieiraprado99/ng-mapcn/blob/main/LICENSE"><img src="https://img.shields.io/github/license/juanvieiraprado99/ng-mapcn" alt="license" /></a>
  <a href="https://angular.dev"><img src="https://img.shields.io/badge/Angular-22%2B-dd0031?logo=angular" alt="Angular 22+" /></a>
  <a href="https://bundlephobia.com/package/ng-mapcn"><img src="https://img.shields.io/bundlephobia/minzip/ng-mapcn" alt="bundle size" /></a>
</p>

ng-mapcn is a set of composable [MapLibre GL](https://maplibre.org) map components for Angular. It is built for Angular apps that need theme-aware maps (markers, popups, routes, GeoJSON, arcs, clusters) without API keys or a paid tile provider. It is an Angular port of the [mapcn](https://mapcn.dev) API, with MapLibre GL as the rendering engine and the copy-paste ownership model of [shadcn/ui](https://ui.shadcn.com): `ng add ng-mapcn` copies the sources into your project so you own the code.

**[Docs](https://ng-mapcn.vercel.app/docs)** · **[Blocks gallery](https://ng-mapcn.vercel.app/blocks)** · **[Installation](https://ng-mapcn.vercel.app/docs/installation)** · **[API reference](https://ng-mapcn.vercel.app/docs/api-reference)**

## Features

- **MapLibre GL JS v5** under the hood, no API keys required (Carto basemaps)
- **Theme-aware**: follows the `dark`/`light` class on `<html>` (or `prefers-color-scheme`) and swaps the basemap at runtime
- **Composable**: declare markers, popups, routes, GeoJSON, arcs and clusters as children of `<ng-map>`
- **Signals-first**: standalone components, signal inputs/outputs, `effect()`-based reconciliation
- **Copy-paste distribution**: `ng add ng-mapcn` copies the sources into your project (shadcn-style). Also usable as a regular npm package.
- **SSR-safe**: nothing touches `window` or MapLibre during server render

## Compatibility

| ng-mapcn | Angular | MapLibre GL | npm tag |
|---|---|---|---|
| `22.x` | `^22.0.0` | `^5.16.0` | `beta` |
| `21.x` | `^21.2.9` | `^5.16.0` | n/a |
| `18.x` | `^18.2.14` | `^5.16.0` | `latest` (stale) |

Node.js `^22.22.3 || ^24.15.0 || >=26.0.0`. Until a stable 22.x ships, always install with the `@beta` tag: the default `latest` tag still points at the Angular 18 build.

## Quick start

### 1. Install

Copy-paste (recommended, shadcn-style):

```bash
ng add ng-mapcn@beta
```

This will:

1. Add `maplibre-gl` to your dependencies
2. Register `maplibre-gl/dist/maplibre-gl.css` in `angular.json`
3. Append the required `.maplibregl-popup-*` CSS overrides to your global stylesheet
4. Copy the component sources to `src/app/components/ui/map` (customize with `--path`)

Or as a regular npm package:

```bash
npm install ng-mapcn@beta maplibre-gl
```

Then in your global `styles.scss`:

```scss
// theme tokens + component utility classes
@use 'ng-mapcn/src/lib/styles/index' as *;
// required .maplibregl-popup-* overrides
@use 'ng-mapcn/styles.scss' as *;
// MapLibre base CSS
@import 'maplibre-gl/dist/maplibre-gl.css';
```

The popup overrides are **required**. MapLibre injects its own popup chrome, which must be neutralized so the styled content shows cleanly:

```css
.maplibregl-popup-content {
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
}
.maplibregl-popup-tip {
  display: none !important;
}
```

### 2. Add a map

A complete standalone component (with `ng add`, import from `./components/ui/map` instead of `'ng-mapcn'`):

```ts
import { Component } from '@angular/core';
import { MapComponent, MapMarkerComponent, MarkerPopupComponent } from 'ng-mapcn';

@Component({
  selector: 'app-map',
  imports: [MapComponent, MapMarkerComponent, MarkerPopupComponent],
  template: `
    <div class="map-container">
      <ng-map [center]="[-46.63, -23.55]" [zoom]="10">
        <ng-map-marker [longitude]="-46.63" [latitude]="-23.55">
          <ng-marker-popup><strong>São Paulo</strong></ng-marker-popup>
        </ng-map-marker>
      </ng-map>
    </div>
  `,
  styles: `
    .map-container {
      height: 400px;
    }
  `,
})
export class AppMap {}
```

The map fills its parent, so give the parent an explicit height. More building blocks (controls, routes, GeoJSON, arcs, clusters) are listed below and in the [blocks gallery](https://ng-mapcn.vercel.app/blocks).

## Components

| Component | Description |
|---|---|
| `ng-map` | Map host. Inputs: `center`, `zoom`, `theme` (`light`/`dark`/`auto`), `styles` (per-theme basemap), `blank` (tile-less dataviz style), `projection`, `viewport` (controlled mode), `loading`, `options` (raw MapLibre `MapOptions`). Outputs: `viewportChange`, `mapReady`, `mapClick`, `mapError`. |
| `ng-map-controls` | Zoom / compass / locate / fullscreen buttons (custom UI, not MapLibre `IControl`). |
| `ng-map-marker` | Declarative marker. `longitude`, `latitude`, `draggable`, `offset`, `rotation`, `anchor`, alignments; click/hover/drag outputs. |
| `ng-marker-content` | Projects custom HTML into the marker element (empty = default dot). |
| `ng-marker-popup` / `ng-marker-tooltip` / `ng-marker-label` | Popup on click, tooltip on hover, CSS label above/below the marker. |
| `ng-map-popup` | Standalone popup at a lng/lat (no marker). |
| `ng-map-route` | LineString layer with color/width/opacity/dashArray and click output. |
| `ng-map-geojson` | Fill + outline layers from GeoJSON data or URL. Declarative hover via `promoteId` + `fillHoverPaint` (feature-state). |
| `ng-map-arc` | Curved arcs between points (flight paths). Invisible hit layer for comfortable hover/click; `hoverPaint` via feature-state. |
| `ng-map-cluster-layer` | Clustered points with count labels, threshold-based colors/sizes and expansion-zoom on click. |

Utilities: `MapViewport`, `getViewport`, `buildArcCoordinates`, `mergeHoverPaint`, `blankMapStyle`, `defaultStyles`, and `MapContextService` (map / isLoaded / resolvedTheme signals for advanced layer work via `inject`).

## Theming

Without a `theme` input, the map watches the `dark`/`light` class on `document.documentElement` (works with any theme toggler) and falls back to `prefers-color-scheme`. Switching theme calls `map.setStyle(..., { diff: true })` and every layer component re-adds itself automatically once the style settles.

## Basemaps

Any MapLibre-compatible style works. Set it per map with `styles`, or once for the whole app with `provideMapStyles()`:

```ts
import { provideMapStyles } from 'ng-mapcn';

export const appConfig: ApplicationConfig = {
  providers: [
    provideMapStyles({
      light: 'https://tiles.openfreemap.org/styles/positron',
      dark: 'https://tiles.openfreemap.org/styles/dark',
    }),
    // ...or pass a Signal (or a factory that injects a service) to swap the
    // basemap at runtime: provideMapStyles(() => inject(BasemapService).styles)
  ],
};
```

Precedence: `[styles]` → `[blank]` → `provideMapStyles()` → Carto default.

| Provider | Style URL | API key |
|---|---|---|
| Carto (default) | `https://basemaps.cartocdn.com/gl/{positron\|dark-matter\|voyager}-gl-style/style.json` | no |
| OpenFreeMap | `https://tiles.openfreemap.org/styles/{liberty\|bright\|positron\|dark\|fiord}` | no |
| OpenStreetMap | raster tiles `https://tile.openstreetmap.org/{z}/{x}/{y}.png` — build the `StyleSpecification` by hand; dev/demo only ([tile usage policy](https://operations.osmfoundation.org/policies/tiles/)) | no |
| MapTiler | `https://api.maptiler.com/maps/{streets-v4\|streets-v4-dark\|dataviz-v4}/style.json?key=KEY` | yes |
| Stadia Maps | `https://tiles.stadiamaps.com/styles/{alidade_smooth\|alidade_smooth_dark}.json?api_key=KEY` | keyless on `localhost` |

Live examples for each: [ng-mapcn demo → Map Styles](https://ng-mapcn.vercel.app/docs/basemaps).

## SSR support

ng-mapcn is server-side-rendering safe. The map is created in `afterNextRender`
(browser-only, after hydration) and every child component (markers, popups,
layers, controls) gates its work on the map signal, which is `null` on the
server — so nothing touches `document`, `window`, or MapLibre during server
render. On the server the map host renders a plain container `<div>` plus the
loader, which matches the first client render and hydrates cleanly.

In a consumer app with `@angular/ssr`, just enable hydration:

```ts
// app.config.ts
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    // ...your other providers
  ],
};
```

Notes:

- **Theme flash**: on the server the theme resolves to `light` (no `matchMedia`);
  if the user is in dark mode the basemap swaps once on the client after
  hydration. This mirrors the React `mapcn` behavior. Set the `theme` input
  explicitly to avoid it.
- If a bundler complains about `maplibre-gl` during server build/prerender, mark
  it external for the server (`externalDependencies: ["maplibre-gl"]`) or add
  `ngSkipHydration` to the element hosting `<ng-map>`.

## For LLMs

The docs site serves [`llms.txt`](https://ng-mapcn.vercel.app/llms.txt) (index) and [`llms-full.txt`](https://ng-mapcn.vercel.app/llms-full.txt) (every component, input, output and default in one file), following the [llmstxt.org](https://llmstxt.org) convention. Point your coding agent at either instead of scraping the docs.

## Contributing

Contributions are welcome. Please read the [contributing guide](https://github.com/juanvieiraprado99/ng-mapcn/blob/main/CONTRIBUTING.md) and the [code of conduct](https://github.com/juanvieiraprado99/ng-mapcn/blob/main/CODE_OF_CONDUCT.md). To report a vulnerability, follow the [security policy](https://github.com/juanvieiraprado99/ng-mapcn/blob/main/SECURITY.md) instead of opening a public issue.

To run the demo locally:

```bash
npm install
npm run build-ui-dev   # builds the lib, installs it locally and serves the demo
```

## Credits

- **[mapcn](https://www.mapcn.dev)** ([docs](https://www.mapcn.dev/docs)) — the React + MapLibre GL library that inspired this project. ng-mapcn is an Angular port of its composition model and component API. All credit for the original design goes to its authors.
- **[Zard UI](https://zardui.com)** ([docs](https://zardui.com/docs/installation)) — the Angular component library (shadcn-style, copy-paste) used to build this project's demo & documentation site.
- **[MapLibre GL JS](https://maplibre.org)** — the rendering engine.
- **[Carto](https://carto.com)** — the default free basemaps.

## License

MIT © ng-mapcn. See the [LICENSE](https://github.com/juanvieiraprado99/ng-mapcn/blob/main/LICENSE) file.
