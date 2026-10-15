---
name: ng-mapcn
description: Use when building or editing interactive maps in an Angular 22+ app with ng-mapcn (MapLibre GL v6, mapcn port) - adding <ng-map>, markers, popups, tooltips, routes, GeoJSON layers, arcs, clusters, heatmaps, raster/vector tile sources (PMTiles), image overlays, 3D buildings (fill-extrusion), terrain and hillshade, draw tools (points/lines/polygons), map controls, theme-aware basemaps, or installing via `ng add ng-mapcn`.
---

# ng-mapcn

Angular port of [mapcn](https://mapcn.dev): composable MapLibre GL v6 map components. Standalone, OnPush, signal inputs/outputs, theme-aware (light/dark), no API keys (Carto basemaps by default). Peer deps: Angular `^22`, `maplibre-gl ^6.11.2`.

## Setup

- Copy-paste (shadcn-style): `ng add ng-mapcn` adds `maplibre-gl`, registers its CSS and worker assets, appends the `.maplibregl-popup-*` CSS overrides, and copies sources to `src/app/components/ui/map` (`--path` to change). Import from that folder instead of `'ng-mapcn'`.
- Drawing is opt-in: `ng add ng-mapcn --draw` (copies `<path>/draw`, adds `terra-draw` + `terra-draw-maplibre-gl-adapter`) or `npm i terra-draw terra-draw-maplibre-gl-adapter` and import `MapDrawComponent` from `'ng-mapcn/draw'` (the core entry never loads terra-draw).
- npm: `npm i ng-mapcn maplibre-gl` (`@types/geojson` comes with it). Then add `maplibre-gl/dist/maplibre-gl.css` to `angular.json` `styles`, the worker assets (`references/troubleshooting.md`), and in global `styles.scss`: `@use 'ng-mapcn/src/lib/styles/index' as *;` and `@use 'ng-mapcn/styles.scss' as *;`.
- Which one does the app use? Sources in `src/app/components/ui/map` (or another `--path`) → copy-paste; otherwise import from `'ng-mapcn'`.
- Optional app-wide basemap: `provideMapStyles({ light, dark })` in `app.config.ts`.
- Optional translations: `provideMapLabels({ zoomIn: "Aproximar", ... })` (partial; keys zoomIn, zoomOut, resetNorth, locate, fullscreen, loading, closePopup), or a `[labels]` input on `ng-map`, `ng-map-controls`, `ng-map-popup`.

## Minimal example

```ts
import { Component } from '@angular/core';
import {
  MapComponent,
  MapControlsComponent,
  MapMarkerComponent,
  MarkerPopupComponent,
} from 'ng-mapcn';

@Component({
  selector: 'app-map',
  imports: [MapComponent, MapControlsComponent, MapMarkerComponent, MarkerPopupComponent],
  template: `
    <div class="map-container">
      <ng-map [center]="[-46.63, -23.55]" [zoom]="10">
        <ng-map-controls />
        <ng-map-marker [longitude]="-46.63" [latitude]="-23.55">
          <ng-marker-popup><strong>Sao Paulo</strong></ng-marker-popup>
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

Coordinates are always `[longitude, latitude]`.

## Composition model

`<ng-map>` provides `MapContextService` (signals `map`, `isLoaded`, `resolvedTheme`). Every child resolves the map through `inject(MapContextService)`, so children must sit inside `<ng-map>` (injection fails otherwise). Marker sub-components (`ng-marker-*`) must sit inside `<ng-map-marker>`. Custom children do the same: wrap source/layer work in an `effect` that returns early unless `ctx.map()` exists and `ctx.isLoaded()` is true (see `references/recipes.md`).

## Components

| Selector                                               | Purpose                              | Key inputs / outputs                                                                                                                                            |
| ------------------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ng-map`                                               | Map host                             | `center`, `zoom`, `theme`, `styles`, `blank`, `projection`, `viewport`, `fitBounds`, `loading`, `options`; `viewportChange`, `mapReady`, `mapClick`, `mapError` |
| `ng-map-controls`                                      | Zoom/compass/locate/fullscreen       | `position`, `showZoom`, `showCompass`, `showLocate`, `showFullscreen`, `labels`; `locateChange`, `locateError`                                                  |
| `ng-map-marker`                                        | Marker                               | `longitude`, `latitude`, `draggable`, `offset`, `rotation`, `ariaLabel`; `markerClick`, `dragEnd` (keyboard: Enter/Space, arrow keys)                           |
| `ng-marker-content` / `-popup` / `-tooltip` / `-label` | Marker children                      | content, click popup (`closeButton`, `offset`, `anchor`, `maxWidth`, `closeOnClick`), hover/focus tooltip, label                                                |
| `ng-map-popup`                                         | Popup at coordinates                 | `longitude`, `latitude`, `closeButton`, `closeOnClick`, `className`; `popupClose`                                                                               |
| `ng-map-route`                                         | Line layer                           | `coordinates`, `color`, `width`, `dashArray`, `progress`, `active`, `beforeId`; `routeClick`, `routeMouseEnter`, `routeMouseLeave`                              |
| `ng-route-progress` / `ng-route-marker`                | Route children                       | covered line (`color`, `width`); marker at `start`, `end`, `progress` or a fraction                                                                             |
| `ng-map-geojson`                                       | Fill + line layers                   | `data`, `promoteId`, `fillPaint`, `fillHoverPaint`, `interactive`; `featureClick`, `featureHover`                                                               |
| `ng-map-arc`                                           | Curved arcs                          | `data`, `curvature`, `paint`, `hoverPaint`; `arcClick`, `arcHover`                                                                                              |
| `ng-map-cluster-layer`                                 | Clustered points                     | `data`, `id`, `beforeId`, `clusterColors`, `pointColor`; `pointClick`, `clusterClick`                                                                           |
| `ng-map-heatmap`                                       | Point-density heatmap                | `data`, `id`, `beforeId`, `weightProperty`, `weightRange`, `radius`, `intensity`, `opacity`, `gradient`, `minZoom`, `maxZoom`, `paint`                          |
| `ng-map-raster-source`                                 | Raster tiles + layer                 | `id`, `tiles`, `url`, `tileSize`, `minzoom`, `maxzoom`, `attribution`, `bounds`, `scheme`, `opacity`, `visible`, `beforeId`, `paint`                            |
| `ng-map-vector-source`                                 | Vector tiles / PMTiles (source only) | `id`, `tiles`, `url`, `minzoom`, `maxzoom`, `attribution`, `bounds`, `scheme`, `promoteId`                                                                      |
| `ng-map-image-overlay`                                 | Image on 4 corners                   | `id`, `url`, `coordinates`, `opacity`, `visible`, `beforeId`, `paint`                                                                                           |
| `ng-map-fill-extrusion`                                | 3D extrusion (buildings)             | `id`, `source`, `sourceLayer`, `heightProperty`, `baseProperty`, `color`, `opacity`, `minZoom`, `maxZoom`, `filter`, `beforeId`, `paint`                        |
| `ng-map-terrain`                                       | 3D terrain + hillshade               | `id`, `tiles`, `url`, `encoding`, `tileSize`, `exaggeration`, `hillshade`, `hillshadeExaggeration`, `hillshadePaint`, `beforeId`                                |
| `ng-map-draw` (`'ng-mapcn/draw'`)                      | Draw / select / edit shapes          | `modes`, `mode` (model), `features` (model, FeatureCollection), `editable`, `color`; `drawEnd`, `featureEdit`, `featureSelect`, `featureDeselect`               |

Full inputs, types and defaults: `references/components.md`.

## Rules

- Give the map's parent an explicit height; `<ng-map>` fills its parent.
- Pass new array/object references to update `data` / `coordinates`; do not mutate in place.
- Inputs are reconciled by diff; MapLibre objects are not recreated. `anchor` (marker, tooltip, marker popup), `beforeId` and `closeOnClick` apply at creation only.
- Theme switches call `setStyle`, which wipes custom sources and layers. Gate custom layer code on `isLoaded()` and re-add inside the effect.
- Theme comes from the `theme` input, else the `dark`/`light` class or `data-theme` on `<html>`, else `prefers-color-scheme`. Any toggle that sets a `dark` class works; `ThemeService` is optional.
- Popup/tooltip content is wrapped in `.ng-popup-card` / `.ng-tooltip-pill` automatically; just project your content. A `class` on the Angular host does not reach that wrapper: use the `className` input. Hover popups need `className="ng-popup-passthrough"`.
- `ng-map-draw`: terra-draw is restarted (same `features`) on every theme switch and when `modes`/`editable` change, so an unfinished shape is lost (`color` restyles in place). Ids may be any non-empty string or finite number. Bind `[(features)]`; it updates when a draw/edit/delete completes.
- Controlled viewport: bind `[viewport]` and `(viewportChange)` together.
- Fit to data: `<ng-map [fitBounds]="{ padding: 48, maxZoom: 14 }">` (or `MapContextService.fitBounds()`) instead of imperative `map.fitBounds` + `isLoaded` handling.
- The global `.maplibregl-popup-*` overrides and `maplibre-gl.css` are required.
- Tile sources: the source id is the `id` input verbatim; a layer of your own that draws it should wait for `ctx.hasSource(id)` (see `references/recipes.md`). `ng-map-vector-source` adds no layers. PMTiles: the library does not depend on `pmtiles`; install it and call `maplibregl.addProtocol('pmtiles', new Protocol().tile)` once, then use `url="pmtiles://<archive url>"`.
- 3D: `ng-map-fill-extrusion` creates only a layer and defaults to the Carto basemap (`source="carto"`, `sourceLayer="building"`, `render_height`, `minZoom` 14); for any other source it waits for `map.getSource(source)` and omits `sourceLayer` unless given. Tilt the map with `[options]="{ pitch: 60 }"` (terrain needs `maxPitch` up to 85). `ng-map-terrain` works with no inputs (public Terrarium tiles), is re-applied after theme switches, and only one terrain per map is active.
- Many points: use `ng-map-cluster-layer`, `ng-map-heatmap` or `ng-map-geojson` (GPU), not hundreds of `ng-map-marker` (one DOM element each).
- MapLibre is ~1 MB: lazy-load the map (`loadComponent` route or `@defer (on viewport)`). Any eager import of `ng-mapcn` pulls it into the main bundle.
- Only pass trusted URLs to `styles`, `provideMapStyles()` and `data`; attributions render as HTML.

## More

- `references/recipes.md` - copy-paste examples
- `references/troubleshooting.md` - symptoms and fixes
- Full docs for LLMs: https://ng-mapcn.vercel.app/llms-full.txt
