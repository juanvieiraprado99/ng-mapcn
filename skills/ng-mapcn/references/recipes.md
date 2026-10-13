# ng-mapcn recipes

Copy-paste examples. Import from `'ng-mapcn'` (or from the folder `ng add` copied into your app). Every map needs a parent with an explicit height. Coordinates are `[longitude, latitude]`.

Contents: [Controls](#controls) | [Markers from an array](#markers-from-an-array) | [Draggable marker](#draggable-marker) | [Standalone popup](#standalone-popup) | [Route](#route) | [GeoJSON with hover](#geojson-with-hover) | [Arcs](#arcs) | [Clusters](#clusters) | [Controlled viewport and raw map](#controlled-viewport-and-raw-map) | [Basemaps, theme, projection](#basemaps-theme-projection) | [Custom layer component](#custom-layer-component) | [Lazy loading](#lazy-loading)

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
        />
      </ng-map>
    </div>
  `,
})
export class ControlsMap {
  onLocate(pos: { longitude: number; latitude: number }) {
    console.log(pos.longitude, pos.latitude);
  }
}
```

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

`data` also accepts a `GeoJSON.FeatureCollection<GeoJSON.Point>`. Clicking a cluster zooms into it unless `[zoomOnClusterClick]="false"`.

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

Layer order: `map.addLayer(spec, beforeId)` places a layer under `beforeId`. Library layer ids are `<id>-layer` (route), `geojson-fill-<id>` / `geojson-line-<id>` (geojson) and `arc-layer-<id>` (arc), where `<id>` is the component's `id` input. `ng-map-cluster-layer` has no `id` input (auto ids `clusters-ng-cluster-N`), so its order follows creation order.

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
