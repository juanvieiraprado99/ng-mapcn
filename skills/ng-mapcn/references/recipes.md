# ng-mapcn recipes

Copy-paste examples. Import from `'ng-mapcn'` (or from the folder `ng add` copied into your app). Every map needs a parent with an explicit height. Coordinates are `[longitude, latitude]`.

Contents: [Controls](#controls) | [Markers from an array](#markers-from-an-array) | [Draggable marker](#draggable-marker) | [Standalone popup](#standalone-popup) | [Route](#route) | [GeoJSON with hover](#geojson-with-hover) | [Arcs](#arcs) | [Clusters](#clusters) | [Heatmap](#heatmap) | [Symbols](#symbols) | [Tile sources](#tile-sources) | [Draw](#draw) | [Controlled viewport and raw map](#controlled-viewport-and-raw-map) | [Basemaps, theme, projection](#basemaps-theme-projection) | [Custom layer component](#custom-layer-component) | [Lazy loading](#lazy-loading) | [Fit to data](#fit-to-data) | [3D buildings and terrain](#3d-buildings-and-terrain) | [Testing](#testing)

## Controls

```ts
@Component({
  selector: 'app-controls-map',
  imports: [MapComponent, MapControlsComponent],
  template: `
    <div style="height: 400px">
      <ng-map [center]="[-46.63, -23.55]" [zoom]="10">
        <ng-map-controls
          position="top-right"
          [showZoom]="true"
          [showCompass]="true"
          [showLocate]="true"
          [showFullscreen]="true"
          (locateChange)="onLocate($event)"
          (locateError)="onLocateError($event)"
        />
      </ng-map>
    </div>
  `,
})
export class ControlsMap {
  onLocate(pos: { longitude: number; latitude: number }) {
    console.log(pos.longitude, pos.latitude);
  }

  // Permission denied, timeout, or no geolocation at all (insecure context: an Error)
  onLocateError(error: GeolocationPositionError | Error) {
    console.warn(error.message);
  }
}
```

Translate the button labels app-wide in `app.config.ts`. Missing keys stay in English, and a signal follows the active locale:

```ts
provideMapLabels({ zoomIn: 'Aproximar', zoomOut: 'Afastar', locate: 'Minha localização' });
provideMapLabels(() => inject(I18nService).mapLabels); // Signal<Partial<MapLabels>>
```

Per map or per component: `<ng-map-controls [labels]="{ zoomIn: 'Acercar' }" />`.

## Markers from an array

Content, tooltip (hover), label and popup (click) are all children of the marker.

```ts
@Component({
  selector: 'app-cities-map',
  imports: [
    MapComponent,
    MapMarkerComponent,
    MarkerContentComponent,
    MarkerLabelComponent,
    MarkerPopupComponent,
    MarkerTooltipComponent,
  ],
  template: `
    <div style="height: 400px">
      <ng-map [center]="[-46.63, -23.55]" [zoom]="4">
        @for (city of cities(); track city.id) {
          <ng-map-marker
            [longitude]="city.lng"
            [latitude]="city.lat"
            (markerClick)="selected.set(city.id)"
          >
            <ng-marker-content>
              <div class="pin"></div>
              <ng-marker-label position="top">{{ city.name }}</ng-marker-label>
            </ng-marker-content>
            <ng-marker-tooltip [offset]="16">{{ city.name }}</ng-marker-tooltip>
            <ng-marker-popup (popupClose)="selected.set(null)">
              <strong>{{ city.name }}</strong>
            </ng-marker-popup>
          </ng-map-marker>
        }
      </ng-map>
    </div>
  `,
})
export class CitiesMap {
  readonly cities = signal([
    { id: 1, name: 'Sao Paulo', lng: -46.63, lat: -23.55 },
    { id: 2, name: 'Rio de Janeiro', lng: -43.17, lat: -22.91 },
  ]);
  readonly selected = signal<number | null>(null);
}
```

Omit `ng-marker-content` to get the default dot. Style the content however you like; the popup and tooltip containers are styled by the library's global CSS (`.ng-popup-card`, `.ng-tooltip-pill`).

## Draggable marker

```html
<ng-map [center]="[-46.63, -23.55]" [zoom]="10">
  <ng-map-marker
    [longitude]="pos().lng"
    [latitude]="pos().lat"
    [draggable]="true"
    (dragEnd)="pos.set($event)"
  />
</ng-map>
```

```ts
readonly pos = signal({ lng: -46.63, lat: -23.55 });
```

`dragEnd` emits `{ lng, lat }`, which matches the signal shape. `drag` fires on every frame of the drag; in zone.js apps each emission runs change detection, so prefer `dragEnd` unless the UI must follow the drag live.

## Standalone popup

```ts
template: `
  <ng-map [center]="[-46.63, -23.55]" [zoom]="10">
    @if (open()) {
      <ng-map-popup
        [longitude]="-46.63"
        [latitude]="-23.55"
        [closeButton]="true"
        (popupClose)="open.set(false)"
      >
        Hello from Sao Paulo
      </ng-map-popup>
    }
  </ng-map>
`,
```

The popup opens when created and is removed when the `@if` block is destroyed.

## Route

```html
<ng-map [center]="[-46.63, -23.55]" [zoom]="6">
  <ng-map-route
    [coordinates]="route()"
    color="#4285F4"
    [width]="4"
    [opacity]="0.8"
    [dashArray]="[2, 2]"
    (routeClick)="onRouteClick($event)"
  />
</ng-map>
```

```ts
readonly route = signal<[number, number][]>([[-46.63, -23.55], [-45.9, -23.2], [-43.17, -22.91]]);
```

Progress, a marker that follows it, and an active (selected) state:

```html
<ng-map-route
  [coordinates]="route()"
  color="#94a3b8"
  [width]="4"
  [progress]="progress()"
  [active]="selected()"
  activeColor="#2563eb"
  (routeClick)="selected.set(!selected())"
  (routeMouseEnter)="hovering.set(true)"
  (routeMouseLeave)="hovering.set(false)"
>
  <ng-route-progress color="#22c55e" />
  <ng-route-marker at="start">
    <ng-marker-content><div class="size-3 rounded-full bg-slate-500"></div></ng-marker-content>
  </ng-route-marker>
  <ng-route-marker at="progress">
    <ng-marker-content>🚚</ng-marker-content>
    <ng-marker-tooltip>In transit</ng-marker-tooltip>
  </ng-route-marker>
</ng-map-route>
```

Import `RouteProgressComponent`, `RouteMarkerComponent` and `MarkerContentComponent` too. `progress` (0 to 1) is measured along the cumulative distance. Without a `ng-route-progress` child nothing is drawn for it, but `ng-route-marker at="progress"` still follows it.

## GeoJSON with hover

Hover styling needs `promoteId` (a feature property that is unique per feature) and `interactive`.

```html
<ng-map [blank]="true" [center]="[0, 20]" [zoom]="1.5">
  <ng-map-geojson
    [data]="countries()"
    promoteId="NAME_LONG"
    [fillPaint]="{ 'fill-color': '#94a3b8', 'fill-opacity': 0.6 }"
    [fillHoverPaint]="{ 'fill-color': '#3b82f6', 'fill-opacity': 0.9 }"
    [linePaint]="{ 'line-color': '#ffffff', 'line-width': 0.5 }"
    [interactive]="true"
    (featureHover)="hovered.set($event?.feature.properties?.['NAME_LONG'] ?? null)"
    (featureClick)="onPick($event)"
  />
</ng-map>
```

`data` can also be a URL string. Set `[fillPaint]="false"` or `[linePaint]="false"` to skip a layer. A choropleth example (data-driven `fill-color` expression, `ng-map-popup` on hover) lives in `projects/demo/src/app/blocks/choropleth/`.

The properties type is inferred from `data`. With `countries: FeatureCollection<Geometry, CountryProperties>`, type the handler as `MapGeoJSONEvent<CountryProperties>` (a bare `MapGeoJSONEvent` does not compile for an interface):

```ts
onHover(event: MapGeoJSONEvent<CountryProperties> | null) {
  this.hovered.set(event?.feature.properties.NAME_LONG ?? null);
}
```

A tooltip that follows the hover is a `ng-map-popup` with `[closeOnClick]="false"` and `className="ng-popup-passthrough"`. Without the class, moving the cursor into the popup fires the layer's `mouseleave` and the popup disappears:

```html
@if (hover(); as h) {
<ng-map-popup
  [longitude]="h.lng"
  [latitude]="h.lat"
  [offset]="12"
  [closeOnClick]="false"
  className="ng-popup-passthrough"
>
  {{ h.name }}
</ng-map-popup>
}
```

## Arcs

```html
<ng-map [center]="[-98, 39]" [zoom]="3" [projection]="{ type: 'globe' }">
  <ng-map-arc
    [data]="arcs()"
    [curvature]="0.3"
    [paint]="{ 'line-color': ['get', 'color'], 'line-width': 2 }"
    [hoverPaint]="{ 'line-width': 4 }"
    (arcHover)="hovered.set($event?.arc.id ?? null)"
    (arcClick)="onArcClick($event)"
  />
</ng-map>
```

```ts
readonly arcs = signal<MapArcDatum[]>([
  { id: 'sfo-jfk', from: [-122.4, 37.8], to: [-74, 40.7], color: '#4285F4' },
]);
```

Extra datum properties (here `color`) are available to paint expressions through `["get", "color"]`. Typed `paint` may need a cast for expressions (the demo uses `as never`).

## Clusters

```html
<ng-map [center]="[-98, 39]" [zoom]="3">
  <ng-map-cluster-layer
    data="https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson"
    [clusterRadius]="50"
    [clusterMaxZoom]="14"
    [clusterColors]="['#22c55e', '#eab308', '#ef4444']"
    [clusterThresholds]="[100, 750]"
    (pointClick)="onPoint($event)"
    (clusterClick)="onCluster($event)"
  />
</ng-map>
```

`data` also accepts a `GeoJSON.FeatureCollection<GeoJSON.Point, P>`; `P` types `pointClick` (`ClusterPointClickEvent<Store>`). Clicking a cluster zooms into it unless `[zoomOnClusterClick]="false"`. Set `id="stores"` for stable ids (`cluster-source-stores`, `clusters-stores`, `cluster-count-stores`, `unclustered-point-stores`), and `beforeId` to put the three layers under another layer. The colors above are the defaults; mapcn uses `['#3b82f6', '#1d4ed8', '#1e3a8a']`.

## Heatmap

```html
<ng-map [center]="[-98, 39]" [zoom]="3">
  <ng-map-heatmap
    id="earthquakes"
    data="https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson"
    weightProperty="mag"
    [weightRange]="[0, 7.5]"
    [radius]="20"
    [maxZoom]="9"
  />
</ng-map>
```

`data` also accepts a `GeoJSON.FeatureCollection<GeoJSON.Point, P>`. Without `gradient` the ramp follows the map theme (`defaultHeatmapGradients`); a custom `[gradient]="[[0, 'rgba(0,0,0,0)'], [1, '#ef4444']]"` is kept across theme switches. `radius`, `intensity` and `opacity` accept zoom expressions such as `['interpolate', ['linear'], ['zoom'], 0, 8, 6, 34]`. `maxZoom` stops rendering from that zoom, so a custom circle layer placed after the heatmap in the template can take over when zoomed in. Ids: `heatmap-source-<id>`, `heatmap-layer-<id>`.

Gotchas: set `weightRange` to the real `[min, max]` of `weightProperty`, otherwise raw values (e.g. a magnitude of 0-7) saturate the layer. `radius`, `intensity`, `opacity`, `gradient`, `minZoom`/`maxZoom` and `data` update the existing layer in place, so binding them to signals is cheap. The component has no outputs and a heatmap is not hit-testable (`queryRenderedFeatures` returns nothing), so use a circle layer or markers for interaction.

## Symbols

```html
<ng-map [center]="[11.25, 43.77]" [zoom]="5">
  <ng-map-symbol-layer
    id="places"
    [data]="places"
    [images]="icons"
    [icon]="['get', 'kind']"
    textField="{name}"
    [interactive]="true"
    (featureClick)="selected.set($event.feature.properties?.name ?? null)"
  />
</ng-map>
```

```ts
// Local or same-origin PNG/WebP/JPEG (CORS applies to remote URLs; SVG cannot be decoded).
icons = { city: '/icons/city.png', park: { url: '/icons/park.png', pixelRatio: 2 } };
```

`icon` is an image id or an expression, so `['get', 'kind']` picks the image per feature. Text-only labels need no `images`: just `textField="{name}"`. Labels need the style glyphs, so on `[blank]` they are skipped with one console warning (icons still render). `allowOverlap`, `textSize`, `filter` and `data` update the existing layer in place; `images` changes add, swap or remove images without re-creating it. Pass `{ url, sdf: true }` and `iconColor` to recolor a monochrome icon; SDF and non-SDF images cannot be mixed in one layer, so put SDF icons in a layer of their own. Layers may share `images`: an id is added once per map and stays until the last layer using it is gone.

## Tile sources

```html
<ng-map [center]="[10, 50]" [zoom]="4">
  <ng-map-raster-source
    id="radar"
    [tiles]="['https://tiles.example.com/{z}/{x}/{y}.png']"
    [tileSize]="256"
    attribution="Radar data"
    [opacity]="0.7"
  />
  <ng-map-image-overlay [url]="img" [coordinates]="corners" [opacity]="0.8" />
  <ng-map-vector-source
    id="parcels"
    url="pmtiles://https://example.com/parcels.pmtiles"
    promoteId="parcel"
  />
  <app-parcels-layer source="parcels" />
</ng-map>
```

`corners` is `[[lng, lat] x4]` clockwise from the top-left. A vector source draws nothing by itself: add layers from a component that waits for it with `hasSource(id)` (it closes during a theme switch and re-opens once the source is re-added):

```ts
import { Component, effect, inject, input } from '@angular/core';
import { MapContextService } from 'ng-mapcn';

@Component({ selector: 'app-parcels-layer', template: '' })
export class ParcelsLayerComponent {
  readonly source = input.required<string>();
  private readonly ctx = inject(MapContextService);

  constructor() {
    effect((onCleanup) => {
      const map = this.ctx.map();
      const source = this.source();
      if (!map || !this.ctx.isLoaded() || !this.ctx.hasSource(source)) return;

      const id = `${source}-fill`;
      map.addLayer({
        id,
        type: 'fill',
        source,
        'source-layer': 'parcels',
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.5 },
      });
      onCleanup(() => {
        try {
          if (map.getLayer(id)) map.removeLayer(id);
        } catch {
          // style may be mid-reload
        }
      });
    });
  }
}
```

PMTiles needs the protocol registered once in the browser, before the source is added (`npm i pmtiles`; the library does not bundle it): `addProtocol('pmtiles', new Protocol().tile)` with `addProtocol` from `maplibre-gl` and `Protocol` from `pmtiles`. The archive must be served with HTTP range support. Tile `tiles`/`url`, image `url`/`coordinates` and `opacity`/`visible` update in place; `tileSize`, zoom range, `bounds`, `scheme`, `attribution` and `promoteId` are read at creation (change the `id` to rebuild).

## Fit to data

```ts
@Component({
  selector: 'app-fit-map',
  imports: [MapComponent, MapMarkerComponent, MarkerContentComponent],
  template: `
    <div style="height: 400px">
      <ng-map [fitBounds]="{ padding: 48, maxZoom: 14 }">
        @for (place of places(); track place.id) {
          <ng-map-marker [longitude]="place.lng" [latitude]="place.lat">
            <ng-marker-content
              ><div class="size-3 rounded-full bg-blue-500"></div
            ></ng-marker-content>
          </ng-map-marker>
        }
      </ng-map>
    </div>
  `,
})
export class FitMap {
  readonly places = signal([{ id: 1, lng: 2.35, lat: 48.85 }]);
}
```

The map fits once loaded and again whenever the union of the children's bounds changes (a batch of changes fits once). Pass `bounds` for explicit bounds, or inject `MapContextService` in a child and call `fitBounds({ padding: 48 })` (returns `false` when not loaded or there is nothing to fit). A single point zooms to `maxZoom` (default 16). Data given as a URL is not fetched, so it does not contribute.

## 3D buildings and terrain

```html
<ng-map
  [center]="[-74.0134, 40.7061]"
  [zoom]="15.5"
  [options]="{ pitch: 60, bearing: -20, maxPitch: 85 }"
>
  <!-- Carto basemap buildings: source "protomaps", layer "buildings", height. Needs zoom >= 14. -->
  <ng-map-fill-extrusion id="buildings" [opacity]="0.8" />
  <!-- Public Terrarium tiles by default; the hillshade has its own DEM source. -->
  <ng-map-terrain id="relief" [exaggeration]="1.5" [hillshade]="true" />
</ng-map>
```

Own data: `<ng-map-fill-extrusion source="footprints" sourceLayer="footprints" heightProperty="floors" [paint]="{ 'fill-extrusion-height': ['*', ['get', 'floors'], 3.2] }" />` next to an `ng-map-vector-source id="footprints"`. A GeoJSON source needs no `sourceLayer`. Another DEM provider: `<ng-map-terrain [tiles]="[...]" encoding="mapbox" [tileSize]="512" [maxzoom]="12" />`.

Gotchas: the map needs a pitch to look 3D (`pitch` is an `options` entry, not an `ng-map` input). `ng-map-fill-extrusion` does nothing on basemaps without a vector source (`blank`, raster): extrude a source of your own. Terrain is lost on a theme `setStyle` and re-applied automatically; only one terrain per map; changing `exaggeration` rebuilds the terrain mesh.

## Draw

Needs `npm i terra-draw terra-draw-maplibre-gl-adapter` (or `ng add ng-mapcn --draw`); import from the `'ng-mapcn/draw'` entry point (copy-paste: `<path>/draw`).

```ts
import { Component, signal, viewChild } from '@angular/core';
import { MapComponent } from 'ng-mapcn';
import { MapDrawComponent, type MapDrawFeatureCollection, type MapDrawMode } from 'ng-mapcn/draw';

@Component({
  imports: [MapComponent, MapDrawComponent],
  template: `
    <button (click)="mode.set('polygon')">Polygon</button>
    <button (click)="mode.set('select')">Edit</button>
    <button (click)="draw().clear()">Clear</button>
    <div class="h-[420px]">
      <ng-map [center]="[-46.63, -23.55]" [zoom]="11">
        <ng-map-draw
          [modes]="['point', 'line', 'polygon']"
          [(mode)]="mode"
          [(features)]="features"
          (drawEnd)="onDrawEnd($event)"
        />
      </ng-map>
    </div>
  `,
})
export class DrawMap {
  readonly draw = viewChild.required(MapDrawComponent);
  readonly mode = signal<MapDrawMode>('static');
  readonly features = signal<MapDrawFeatureCollection>({ type: 'FeatureCollection', features: [] });
}
```

Gotchas: `features` is a GeoJSON `FeatureCollection` (so it feeds `ng-map-geojson` or a backend); it updates when a draw/edit/delete completes, not per mouse move. Lines and polygons finish by clicking the last vertex again (or Enter). Preloaded features may omit `id` (one is assigned). A theme switch or a change of `modes`/`editable` restarts terra-draw with the same features and drops an unfinished shape (`color` restyles in place). Your own ids (`zone-1`, `42`) are kept. Only Point, LineString and Polygon are supported.

## Controlled viewport and raw map

```ts
@Component({
  selector: 'app-controlled-map',
  imports: [MapComponent],
  template: `
    <div style="height: 400px">
      <ng-map
        [viewport]="viewport()"
        (viewportChange)="viewport.set($event)"
        (mapReady)="map = $event"
      />
    </div>
    <p>zoom {{ viewport().zoom.toFixed(1) }}</p>
  `,
})
export class ControlledMap {
  readonly viewport = signal<MapViewport>({ center: [0, 0], zoom: 2, bearing: 0, pitch: 0 });
  map?: import('maplibre-gl').Map;
}
```

`mapReady` emits the raw MapLibre `Map` after `load`. For layers and sources prefer a child component using `MapContextService`.

## Basemaps, theme, projection

```html
<!-- Per-map basemap; a missing theme falls back to Carto -->
<ng-map [styles]="{ light: lightUrl, dark: darkUrl }" />

<!-- No tiles, transparent background (dataviz) -->
<ng-map [blank]="true" />

<!-- Force a theme regardless of <html> -->
<ng-map theme="dark" />

<!-- Globe -->
<ng-map [projection]="{ type: 'globe' }" />

<!-- Raw MapLibre options -->
<ng-map [options]="{ pitch: 45, minZoom: 1.2, maxZoom: 8 }" />
```

App-wide default (`app.config.ts`):

```ts
provideMapStyles({ light: lightUrl, dark: darkUrl });
```

Toggle the app theme with `inject(ThemeService).toggleTheme()` (flips the `dark`/`light` class on `<html>`).

## Custom layer component

Adapted from the demo's heatmap block. Gate on `isLoaded()`, add idempotently, clean up defensively (layers before the source).

```ts
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { MapContextService, nextId } from 'ng-mapcn';

@Component({
  selector: 'app-points-layer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class PointsLayerComponent {
  private readonly ctx = inject(MapContextService);
  private readonly id = nextId('points');
  private readonly sourceId = `points-source-${this.id}`;
  private readonly layerId = `points-layer-${this.id}`;

  constructor() {
    effect((onCleanup) => {
      const map = this.ctx.map();
      if (!map || !this.ctx.isLoaded()) return;

      if (!map.getSource(this.sourceId)) {
        map.addSource(this.sourceId, {
          type: 'geojson',
          data: 'https://example.com/points.geojson',
        });
      }
      if (!map.getLayer(this.layerId)) {
        map.addLayer({
          id: this.layerId,
          type: 'circle',
          source: this.sourceId,
          paint: { 'circle-radius': 5, 'circle-color': '#3b82f6' },
        });
      }

      onCleanup(() => {
        try {
          if (map.getLayer(this.layerId)) map.removeLayer(this.layerId);
          if (map.getSource(this.sourceId)) map.removeSource(this.sourceId);
        } catch {
          // style may be mid-reload
        }
      });
    });
  }
}
```

Use it as a child: `<ng-map><app-points-layer /></ng-map>`. When the theme changes, `isLoaded()` drops to false (cleanup runs) and back to true (layers are re-added). Use `ctx.resolvedTheme()` inside the effect for theme-specific colors.

Layer order: `map.addLayer(spec, beforeId)` places a layer under `beforeId`. Library layer ids are `<id>-layer` (route; its progress line is `<id>-layer-progress-layer`), `geojson-fill-<id>` / `geojson-line-<id>` (geojson), `arc-layer-<id>` (arc) and `clusters-<id>` / `cluster-count-<id>` / `unclustered-point-<id>` (cluster), `heatmap-layer-<id>` (heatmap; source `heatmap-source-<id>`), `fill-extrusion-layer-<id>` (fill-extrusion), `terrain-source-<id>` / `terrain-hillshade-source-<id>` / `terrain-hillshade-<id>` (terrain), where `<id>` is the component's `id` input. Every layer component also takes `beforeId` (creation only).

## Lazy loading

Keep every `ng-mapcn` import inside a lazily loaded file:

```ts
// app.routes.ts
{ path: 'map', loadComponent: () => import('./map-page').then((m) => m.MapPage) }
```

```html
<!-- or, inside an eager page: the deferred block's dependencies are split out -->
@defer (on viewport) {
<app-map />
} @placeholder {
<div style="height: 400px"></div>
}
```

## Testing

Unit-test components that render `<ng-map>` in jsdom (no WebGL). `ng-mapcn` imports `maplibre-gl` statically, so the runner replaces that module with the fake from `ng-mapcn/testing/maplibre`. Three entry points, all from the npm package (`ng add` does not copy them): `ng-mapcn/testing/maplibre` (the fake), `ng-mapcn/testing` (helpers) and `ng-mapcn/testing/harness` (CDK harnesses, needs the optional `@angular/cdk` peer). Never import them from app code. Vitest is first-class; Jest is documented but untested; Karma/Jasmine are unsupported.

Vitest setup (`src/testing/setup.ts` in `setupFiles`, and a config in `runnerConfig` that inlines `ng-mapcn`):

```ts
import { configureFakeMapLibre, fakeRegistry } from 'ng-mapcn/testing/maplibre';
import { beforeEach, vi } from 'vitest';

vi.mock('maplibre-gl', () => import('ng-mapcn/testing/maplibre'));
configureFakeMapLibre({ spy: vi.fn });
beforeEach(() => fakeRegistry.reset());
```

```ts
// vitest.config.mts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { server: { deps: { inline: [/ng-mapcn/] } } },
});
```

Jest: `moduleNameMapper: { '^maplibre-gl$': 'ng-mapcn/testing/maplibre' }` and `configureFakeMapLibre({ spy: jest.fn })` in a `setupFilesAfterEnv` file.

A spec: render, load, assert through the stable API (`structuralCalls`, `fakeRegistry`, the fake's getters; never `map.calls`):

```ts
import { TestBed } from '@angular/core/testing';
import { MapMarkerComponent, MapRouteComponent } from 'ng-mapcn';
import { getFakeMap, loadMap, renderMap, resetMapTesting, structuralCalls } from 'ng-mapcn/testing';
import { fakeRegistry } from 'ng-mapcn/testing/maplibre';
import { afterEach, describe, expect, it } from 'vitest';

describe('delivery map', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('adds the route once the style has loaded', async () => {
    const { fixture, ctx } = await renderMap(
      `<ng-map>
        <ng-map-marker [longitude]="2" [latitude]="3" />
        <ng-map-route id="trip" [coordinates]="coordinates" />
      </ng-map>`,
      {
        imports: [MapMarkerComponent, MapRouteComponent],
        hostProps: {
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      },
    );
    const map = getFakeMap(fixture);
    expect(structuralCalls(map)).toEqual([]); // layers wait for ctx.isLoaded()

    await loadMap(fixture);

    expect(structuralCalls(map)).toEqual(['addSource:trip', 'addLayer:trip-layer']);
    expect(fakeRegistry.markers[0].getLngLat()).toEqual({ lng: 2, lat: 3 });
  });
});
```

Helpers: `renderMap(template, { imports, providers, hostProps, size })` (returns `{ fixture, map, ctx }`; map not loaded yet), `loadMap(fixture)`, `reloadStyle(fixture)` (a theme/`styles` change: layers are dropped and re-added), `fireMapEvent(map, 'click', payload, layerId?)`, `getFakeMap`, `setMapSize`, `update`, `resetMapTesting` (call in `afterEach`). Change values after rendering with `update(fixture, props)` (it marks the host for check) or signals in `hostProps`: in zoneless apps (the Angular default) a direct `fixture.componentInstance.x = ...` needs `fixture.changeDetectorRef.markForCheck()`. One `renderMap()` per test (a second throws `TestBed already instantiated`): put several maps in one template.

Fake timers: `vi.useFakeTimers()` plus `configureMapTesting({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })`, and in `afterEach` `configureMapTesting({ advanceTimers: null })` then `vi.useRealTimers()`. Without `advanceTimers`, `loadMap()` waits on a real 100 ms timer; with fake timers on and no `advanceTimers` it throws a clear error instead of hanging.

Harnesses (`npm i -D @angular/cdk`): `TestbedHarnessEnvironment.loader(fixture).getHarness(NgMapHarness)`, then `map.getMarkers({ label })`, `map.getPopups({ text })`, `map.getControls()`; `NgMapMarkerHarness` (`click`, `hover`, `focus`, `pressEnter`, `getText`, `hasPopup`, `isPopupOpen`), `NgMapPopupHarness` (`getText`, `isTooltip`, `close`, `pressEscape`), `NgMapControlsHarness` (`zoomIn`, `zoomOut`, `resetNorth`, `toggleFullscreen`). `hasPopup()` reads the marker's `aria-haspopup` (it has an `ng-marker-popup`), `isPopupOpen()` its `aria-expanded` (this marker's popup only); `isPopupOpen()` throws when the marker content has its own button (no `aria-expanded` there), so use `getPopups()`. The e2e suite checks the harness selectors and marker ARIA against real MapLibre. The fake draws nothing, so `queryRenderedFeatures` and pixel hit testing are not available.
