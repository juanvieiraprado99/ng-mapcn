# ng-mapcn API reference

All components are standalone, `OnPush`, and use signal inputs/outputs. Everything below is exported from `ng-mapcn` (or from the folder `ng add` copied into your app). Coordinates are `[longitude, latitude]`.

Contents: [ng-map](#ng-map) | [ng-map-controls](#ng-map-controls) | [ng-map-marker](#ng-map-marker) | [Marker children](#marker-children) | [ng-map-popup](#ng-map-popup) | [ng-map-route](#ng-map-route) | [ng-map-geojson](#ng-map-geojson) | [ng-map-arc](#ng-map-arc) | [ng-map-cluster-layer](#ng-map-cluster-layer) | [ng-map-heatmap](#ng-map-heatmap) | [ng-map-raster-source](#ng-map-raster-source) | [ng-map-vector-source](#ng-map-vector-source) | [ng-map-image-overlay](#ng-map-image-overlay) | [ng-map-fill-extrusion](#ng-map-fill-extrusion) | [ng-map-terrain](#ng-map-terrain) | [Services](#services) | [Providers and styles](#providers-and-styles) | [Utils and types](#utils-and-types)

## ng-map

Class `MapComponent`. Provides `MapContextService` to its children. Child content is only rendered once the MapLibre map exists. Shows a loader overlay while `!isLoaded() || loading()`.

| Input        | Type                                       | Default     | Notes                                                                                                                              |
| ------------ | ------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `center`     | `[number, number]`                         | `[0, 0]`    | Initial center (`viewport.center` wins if given)                                                                                   |
| `zoom`       | `number`                                   | `2`         | Initial zoom                                                                                                                       |
| `styles`     | `MapStylesConfig`                          | `undefined` | Per-theme basemap; a missing theme falls back to the Carto default                                                                 |
| `blank`      | `boolean`                                  | `false`     | Tile-less transparent style for dataviz. Ignored when `styles` is set                                                              |
| `projection` | `ProjectionSpecification`                  | `undefined` | MapLibre projection; clearing it resets to `{ type: 'mercator' }`                                                                  |
| `theme`      | `'light' \| 'dark' \| 'auto'`              | `'auto'`    | `auto` follows `ThemeService`                                                                                                      |
| `loading`    | `boolean`                                  | `false`     | Forces the loader overlay                                                                                                          |
| `labels`     | `Partial<MapLabels>`                       | `undefined` | Overrides the loader's accessible name (`loading`), over `provideMapLabels()` and the English defaults                             |
| `viewport`   | `Partial<MapViewport>`                     | `undefined` | Controlled viewport; applied with `jumpTo`, skipped while the map is moving                                                        |
| `options`    | `Omit<MapOptions, 'container' \| 'style'>` | `undefined` | Extra MapLibre constructor options. Defaults before spreading: `renderWorldCopies: false`, `attributionControl: { compact: true }` |

| Output           | Payload                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `viewportChange` | `MapViewport` (fires on every `move` except programmatic viewport sync; enters the Angular zone only while something listens)       |
| `mapReady`       | MapLibre `Map` (on `load`)                                                                                                          |
| `mapClick`       | `MapMouseEvent`                                                                                                                     |
| `mapError`       | `Error` (MapLibre errors, and layer components that fail to add their source or layer, e.g. a duplicate `id` or unknown `beforeId`) |

Method: `getMap(): MapLibreMap | null` (escape hatch to the raw map).

Basemap precedence: `styles` input, then `blank`, then `provideMapStyles()`, then Carto default. Changing these inputs at runtime re-applies the style.

The map is created in `afterNextRender` (browser only). If the container has no size yet, initialization waits for a resize.

## ng-map-controls

Class `MapControlsComponent`. Custom button UI (not a MapLibre `IControl`).

| Input            | Type                                                           | Default          |
| ---------------- | -------------------------------------------------------------- | ---------------- |
| `position`       | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `'bottom-right'` |
| `showZoom`       | `boolean`                                                      | `true`           |
| `showCompass`    | `boolean`                                                      | `false`          |
| `showLocate`     | `boolean`                                                      | `false`          |
| `showFullscreen` | `boolean`                                                      | `false`          |
| `labels`         | `Partial<MapLabels>`                                           | `undefined`      |
| `className`      | `string`                                                       | `undefined`      |

`labels` overrides the button titles and `aria-label`s (`zoomIn`, `zoomOut`, `resetNorth`, `locate`, `fullscreen`), over `provideMapLabels()` and the English defaults. `className` adds space-separated classes to the rendered `.ng-controls` element (reactive; built-in classes are kept).

| Output         | Payload                                                                                                                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locateChange` | `{ longitude: number; latitude: number }` (after a successful geolocation; the map flies there at zoom 14)                                                                                                                   |
| `locateError`  | `GeolocationPositionError \| Error`: the geolocation error (permission denied, timeout, position unavailable), or an `Error` when the browser has no `navigator.geolocation` (insecure context). Never emitted on the server |

## ng-map-marker

Class `MapMarkerComponent`. The MapLibre `Marker` is created once; inputs are diffed.

| Input               | Type                                 | Default     | Notes                          |
| ------------------- | ------------------------------------ | ----------- | ------------------------------ |
| `longitude`         | `number`                             | required    |                                |
| `latitude`          | `number`                             | required    |                                |
| `draggable`         | `boolean`                            | `false`     |                                |
| `offset`            | `PointLike`                          | `undefined` | `undefined` resets to `[0, 0]` |
| `rotation`          | `number`                             | `0`         |                                |
| `anchor`            | `MarkerOptions['anchor']`            | `undefined` | Creation only                  |
| `rotationAlignment` | `MarkerOptions['rotationAlignment']` | `'auto'`    |                                |
| `pitchAlignment`    | `MarkerOptions['pitchAlignment']`    | `'auto'`    |                                |

| Output             | Payload                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `markerClick`      | `MouseEvent`                                                                                     |
| `markerMouseEnter` | `MouseEvent`                                                                                     |
| `markerMouseLeave` | `MouseEvent`                                                                                     |
| `dragStart`        | `{ lng: number; lat: number }`                                                                   |
| `drag`             | `{ lng: number; lat: number }` (per frame; enters the Angular zone only while something listens) |
| `dragEnd`          | `{ lng: number; lat: number }`                                                                   |

Method: `getMarker(): Marker | null`.

`MarkerContextService` (provided by each `ng-map-marker`): `marker` readonly signal of `Marker | null`, plus `setMarker(marker)` and `reset()`. Marker children inject it.

## Marker children

Must be placed inside `<ng-map-marker>`.

| Selector            | Class                    | Inputs                                                                                                              | Outputs            | Behavior                                                                                                                                                                                                           |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ng-marker-content` | `MarkerContentComponent` | `className: string`                                                                                                 | none               | Projects its content into the marker element (`.ng-marker-content` wrapper). Empty content renders the default dot (`.ng-marker-default-icon`), re-evaluated when the content changes (`@if`, empty interpolation) |
| `ng-marker-popup`   | `MarkerPopupComponent`   | see the table below                                                                                                 | `popupClose: void` | Popup attached to the marker (opens on marker click). Created once; `offset`, `maxWidth`, `closeButton`, `labels` and `className` are reconciled live. Destroying the component does not emit `popupClose`         |
| `ng-marker-tooltip` | `MarkerTooltipComponent` | `offset: Offset` (default `16`), `anchor: PositionAnchor` (default `undefined`, creation only), `className: string` | none               | Shown on marker hover; `pointer-events: none`                                                                                                                                                                      |
| `ng-marker-label`   | `MarkerLabelComponent`   | `position: 'top' \| 'bottom'` (default `'top'`)                                                                     | none               | CSS label (`.ng-marker-label`), meant to be placed inside `ng-marker-content`                                                                                                                                      |

`className` (on `ng-marker-content`, `ng-marker-popup`, `ng-marker-tooltip`, `ng-map-popup` and `ng-map-controls`) adds space-separated classes to the element the library renders (`.ng-marker-content`, `.ng-popup-card`, `.ng-tooltip-pill`, `.ng-controls`). A `class` on the Angular host never reaches these elements, because their content is portaled into elements MapLibre owns. Changing the value swaps the classes on the live element; the built-in class is kept.

`ng-marker-popup` inputs:

| Input          | Type                 | Default     | Notes                                                                                                                          |
| -------------- | -------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `closeButton`  | `boolean`            | `false`     | Library-drawn X button (`.ng-popup-close`)                                                                                     |
| `offset`       | `Offset`             | `undefined` | Live via `setOffset`. Unset keeps the offset MapLibre derives from the marker; unsetting it later keeps the last value applied |
| `anchor`       | `PositionAnchor`     | `undefined` | Creation only                                                                                                                  |
| `maxWidth`     | `string`             | `'none'`    | Live via `setMaxWidth`                                                                                                         |
| `closeOnClick` | `boolean`            | `false`     | Creation only. `true` closes the popup on a map click                                                                          |
| `labels`       | `Partial<MapLabels>` | `undefined` | `closePopup` label of the close button                                                                                         |
| `className`    | `string`             | `undefined` | Classes for `.ng-popup-card`                                                                                                   |

## ng-map-popup

Class `MapPopupComponent`. Standalone popup at coordinates, opened on creation (unless `open` is `false`).

| Input          | Type                 | Default     | Notes                                                                                                                         |
| -------------- | -------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `longitude`    | `number`             | required    |                                                                                                                               |
| `latitude`     | `number`             | required    |                                                                                                                               |
| `closeButton`  | `boolean`            | `false`     | Library-drawn X button                                                                                                        |
| `offset`       | `Offset`             | `16`        |                                                                                                                               |
| `maxWidth`     | `string`             | `'none'`    |                                                                                                                               |
| `closeOnClick` | `boolean`            | `true`      | Creation only. Set `false` for hover popups                                                                                   |
| `open`         | `boolean` (`model`)  | `true`      | `[(open)]`: closing writes `false`, `true` reopens the same popup. A closed popup stays closed when only the position changes |
| `labels`       | `Partial<MapLabels>` | `undefined` | `closePopup` label of the close button                                                                                        |
| `className`    | `string`             | `undefined` | Classes for `.ng-popup-card`. `ng-popup-passthrough` makes the popup ignore the pointer (see below)                           |

Hover popups: set `[closeOnClick]="false"` and `className="ng-popup-passthrough"`. The popup sits next to the hovered point; if it captured the pointer, moving the cursor into it would fire the layer's `mouseleave` and close it. The rule `.maplibregl-popup:has(.ng-popup-passthrough)` (and its `.maplibregl-popup-content`) gets `pointer-events: none`. It ships in the library's `_utilities.scss`, and `ng add` appends it to a plain `styles.css`. It needs `:has()` (Chrome 105, Safari 15.4, Firefox 121).

| Output       | Payload                                      |
| ------------ | -------------------------------------------- |
| `popupClose` | `void` (user close or `open` set to `false`) |
| `openChange` | `boolean` (the `[(open)]` binding)           |

## ng-map-route

Class `MapRouteComponent`. A LineString layer.

| Input             | Type                 | Default             | Notes                                                                         |
| ----------------- | -------------------- | ------------------- | ----------------------------------------------------------------------------- |
| `coordinates`     | `[number, number][]` | required            |                                                                               |
| `id`              | `string`             | auto (`ng-route-N`) | Source id; layer id is `<id>-layer`                                           |
| `color`           | `string`             | `'#4285F4'`         |                                                                               |
| `width`           | `number`             | `3`                 |                                                                               |
| `opacity`         | `number`             | `0.8`               |                                                                               |
| `dashArray`       | `[number, number]`   | `undefined`         | Dashed line when set                                                          |
| `interactive`     | `boolean`            | `true`              |                                                                               |
| `beforeId`        | `string`             | `undefined`         | Layer to insert the route (and its progress line) before; creation only       |
| `progress`        | `number`             | `undefined`         | Covered fraction (0 to 1, clamped). Drawn only by a child `ng-route-progress` |
| `active`          | `boolean`            | `false`             | While `true`, the `active*` inputs override the base paint                    |
| `activeColor`     | `string`             | `undefined`         | Falls back to `color`                                                         |
| `activeWidth`     | `number`             | `undefined`         | Falls back to `width`                                                         |
| `activeOpacity`   | `number`             | `undefined`         | Falls back to `opacity`                                                       |
| `activeDashArray` | `[number, number]`   | `undefined`         | Falls back to `dashArray`                                                     |

Paint changes (including `active`) go through `setPaintProperty`; the layer is never recreated. `active` does not move the layer to the top (mapcn does), so it keeps `beforeId` ordering.

| Output            | Payload                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `routeClick`      | `MapMouseEvent`                                                         |
| `routeMouseEnter` | `MapMouseEvent` (only when `interactive`; the cursor becomes a pointer) |
| `routeMouseLeave` | `MapMouseEvent`                                                         |

### Route children

Place them inside `<ng-map-route>`. They read the route through `RouteContextService`, which `ng-map-route` provides (exported for custom children: `coordinates`, `progress`, `layerId`, `beforeId`, `created`, `width` signals, plus `cumulative`, the cumulative vertex distances).

`ng-route-progress` (`RouteProgressComponent`) draws the covered part, cut at `progress` of the cumulative haversine distance, as a second source and layer just above the route. Ids: source `<id>-layer-progress`, layer `<id>-layer-progress-layer`. Progress changes call `setData`; the layer is re-added after a theme switch.

| Input       | Type               | Default       |
| ----------- | ------------------ | ------------- |
| `color`     | `string`           | `'#22c55e'`   |
| `width`     | `number`           | route's width |
| `opacity`   | `number`           | `1`           |
| `dashArray` | `[number, number]` | `undefined`   |

`ng-route-marker` (`RouteMarkerComponent`) is a marker placed along the route. It accepts the marker children (`ng-marker-content`, `ng-marker-popup`, `ng-marker-tooltip`, `ng-marker-label`). It is created once and moved with `setLngLat`.

| Input | Type                                                         | Default   | Notes                                         |
| ----- | ------------------------------------------------------------ | --------- | --------------------------------------------- |
| `at`  | `RouteMarkerAt` = `'start' \| 'end' \| 'progress' \| number` | `'start'` | A number is a 0 to 1 fraction of the distance |

```html
<ng-map-route [coordinates]="coords" [progress]="0.4" [active]="selected()" activeColor="#2563eb">
  <ng-route-progress color="#22c55e" />
  <ng-route-marker at="progress"><ng-marker-content>🚚</ng-marker-content></ng-route-marker>
</ng-map-route>
```

## ng-map-geojson

Class `MapGeoJSONComponent<P = Record<string, unknown>>`. Fill and outline layers.

`type MapGeoJSONData<P = GeoJSON.GeoJsonProperties> = GeoJSON.FeatureCollection<GeoJSON.Geometry, P> | GeoJSON.Feature<GeoJSON.Geometry, P> | GeoJSON.Geometry | string` (a string is a URL). Exported.

Generic over the feature properties: `P` is inferred from `data`, so `featureClick` / `featureHover` carry typed `feature.properties`. When `data` is typed with an interface, type the handler with the same argument (`MapGeoJSONEvent<CountryProperties>`); a bare `MapGeoJSONEvent` does not compile, because an interface is not assignable to `Record<string, unknown>`. MapLibre serializes nested objects and arrays in rendered feature properties to JSON strings, so `P` is only accurate for flat properties.

| Input            | Type                                       | Default               | Notes                                                                                                    |
| ---------------- | ------------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------- |
| `data`           | `MapGeoJSONData<P \| null>`                | required              |                                                                                                          |
| `id`             | `string`                                   | auto (`ng-geojson-N`) |                                                                                                          |
| `promoteId`      | `string`                                   | `undefined`           | Feature property promoted to the feature id. Needed for `fillHoverPaint` and stable hover/click payloads |
| `fillPaint`      | `FillLayerSpecification['paint'] \| false` | `undefined`           | Merged onto theme defaults; `false` omits the fill layer                                                 |
| `linePaint`      | `LineLayerSpecification['paint'] \| false` | `undefined`           | Merged onto defaults; `false` omits the outline layer                                                    |
| `fillHoverPaint` | `FillLayerSpecification['paint']`          | `undefined`           | Applied to the hovered feature via feature-state. Requires `promoteId`                                   |
| `interactive`    | `boolean`                                  | `false`               | Enables mouse events                                                                                     |
| `beforeId`       | `string`                                   | `undefined`           | Layer to insert before; creation only                                                                    |

Paint defaults: fill color `#d4d4d4` (light) / `#404040` (dark); line color `#ffffff` (light) / `#171717` (dark), line width `0.5`.

| Output         | Payload                                                     |
| -------------- | ----------------------------------------------------------- |
| `featureClick` | `MapGeoJSONEvent<P>`                                        |
| `featureHover` | `MapGeoJSONEvent<P> \| null` (null when the pointer leaves) |

## ng-map-arc

Class `MapArcComponent<T extends MapArcDatum = MapArcDatum>`. Curved arcs; an invisible hit layer (width `max(line-width + 6, 12)`) sits under the visible one.

| Input         | Type                               | Default           | Notes                                                                                                                |
| ------------- | ---------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| `data`        | `T[]`                              | required          | `MapArcDatum` items                                                                                                  |
| `id`          | `string`                           | auto (`ng-arc-N`) |                                                                                                                      |
| `curvature`   | `number`                           | `0.2`             | `0` is a straight line                                                                                               |
| `samples`     | `number`                           | `64`              | Segments per arc                                                                                                     |
| `paint`       | `LineLayerSpecification['paint']`  | `undefined`       | Merged onto `line-color #4285F4`, `line-width 2`, `line-opacity 0.85`. Datum extras are readable with `["get", key]` |
| `layout`      | `LineLayerSpecification['layout']` | `undefined`       | Merged onto `line-join round`, `line-cap round`                                                                      |
| `hoverPaint`  | `LineLayerSpecification['paint']`  | `undefined`       | Applied on hover via feature-state                                                                                   |
| `interactive` | `boolean`                          | `true`            |                                                                                                                      |
| `beforeId`    | `string`                           | `undefined`       | Creation only                                                                                                        |

| Output     | Payload                  |
| ---------- | ------------------------ |
| `arcClick` | `MapArcEvent<T>`         |
| `arcHover` | `MapArcEvent<T> \| null` |

## ng-map-cluster-layer

Class `MapClusterLayerComponent<P = Record<string, unknown>>`. Cluster circles sized/colored by count, a count label, and unclustered point dots. Generic like `ng-map-geojson`: `P` is inferred from `data` and types `pointClick`.

Ids derive from `id` (auto `ng-cluster-N`): source `cluster-source-<id>`, layers `clusters-<id>` (circles), `cluster-count-<id>` (labels) and `unclustered-point-<id>`.

| Input                | Type                                                            | Default                             | Notes                                                                                         |
| -------------------- | --------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `data`               | `string \| GeoJSON.FeatureCollection<GeoJSON.Point, P \| null>` | required                            | String is a URL; a new URL is fetched again via `setData`                                     |
| `id`                 | `string`                                                        | auto (`ng-cluster-N`)               | Changing it re-creates the source and layers                                                  |
| `beforeId`           | `string`                                                        | `undefined`                         | Layer to insert the three layers before; creation only                                        |
| `clusterMaxZoom`     | `number`                                                        | `14`                                | Runtime changes re-cluster (`setClusterOptions`)                                              |
| `clusterRadius`      | `number`                                                        | `50`                                | Pixels; runtime changes re-cluster                                                            |
| `clusterColors`      | `[string, string, string]`                                      | `['#22c55e', '#eab308', '#ef4444']` | small, medium, large. mapcn uses `['#3b82f6', '#1d4ed8', '#1e3a8a']`; pass those for its look |
| `clusterThresholds`  | `[number, number]`                                              | `[100, 750]`                        | Point counts for medium and large                                                             |
| `pointColor`         | `string`                                                        | `'#3b82f6'`                         |                                                                                               |
| `zoomOnClusterClick` | `boolean`                                                       | `true`                              |                                                                                               |

| Output         | Payload                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| `pointClick`   | `ClusterPointClickEvent<P>` = `{ feature: GeoJSON.Feature<GeoJSON.Point, P>; coordinates: [number, number] }` |
| `clusterClick` | `ClusterClickEvent` = `{ clusterId: number; coordinates: [number, number]; pointCount: number }`              |

## ng-map-heatmap

Class `MapHeatmapComponent<P = Record<string, unknown>>`. A GeoJSON point source rendered as one MapLibre `heatmap` layer. `P` is inferred from `data`.

Ids derive from `id` (auto `ng-heatmap-N`): source `heatmap-source-<id>`, layer `heatmap-layer-<id>`.

| Input            | Type                                                            | Default               | Notes                                                                                                                                                                        |
| ---------------- | --------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`           | `string \| GeoJSON.FeatureCollection<GeoJSON.Point, P \| null>` | required              | String is a URL; a new URL is fetched again via `setData`                                                                                                                    |
| `id`             | `string`                                                        | auto (`ng-heatmap-N`) | Changing it re-creates the source and layer                                                                                                                                  |
| `beforeId`       | `string`                                                        | `undefined`           | Layer to insert before; creation only                                                                                                                                        |
| `weightProperty` | `string`                                                        | `undefined`           | Numeric property used as weight; missing or non-numeric counts as 0. Unset: every point weighs the same                                                                      |
| `weightRange`    | `[number, number]`                                              | `[0, 1]`              | `[min, max]` of the property, mapped linearly to weight 0..1                                                                                                                 |
| `radius`         | `number \| expression`                                          | `30`                  | Pixels; MapLibre expressions allowed (e.g. zoom interpolation)                                                                                                               |
| `intensity`      | `number \| expression`                                          | `1`                   | Expressions allowed                                                                                                                                                          |
| `opacity`        | `number \| expression`                                          | `1`                   | Expressions allowed                                                                                                                                                          |
| `gradient`       | `HeatmapGradient`                                               | theme default         | `readonly (readonly [number, string])[]` stops over density 0..1; sorted, a transparent stop at 0 is prepended when missing. Default: `defaultHeatmapGradients[light\|dark]` |
| `minZoom`        | `number`                                                        | `0`                   | Zoom range, reconciled with `setLayerZoomRange`                                                                                                                              |
| `maxZoom`        | `number`                                                        | `24`                  | Not rendered from this zoom up (MapLibre `maxzoom` is exclusive)                                                                                                             |
| `paint`          | `HeatmapLayerSpecification['paint']`                            | `undefined`           | Escape hatch, merged last over every input above                                                                                                                             |

No outputs. Also exported: `heatmapColorExpression(stops, theme?)`, `defaultHeatmapGradients`, `MapHeatmapData`, `HeatmapGradient`.

## ng-map-raster-source

Class `MapRasterSourceComponent`. A raster tile source (XYZ, TMS, WMS via `{bbox-epsg-3857}`) plus one `raster` layer.

Ids: the MapLibre source id is exactly `id` (auto `ng-raster-source-N`); layer `raster-layer-<id>`. The source is announced via `MapContextService.hasSource(id)` while it exists.

| Input         | Type                                | Default            | Notes                                                                   |
| ------------- | ----------------------------------- | ------------------ | ----------------------------------------------------------------------- |
| `id`          | `string`                            | auto               | Changing it re-creates the source and layer                             |
| `tiles`       | `readonly string[]`                 | `undefined`        | URL templates; changes call `setTiles`. One of `tiles` / `url` required |
| `url`         | `string`                            | `undefined`        | TileJSON URL, wins over `tiles`; changes call `setUrl`                  |
| `tileSize`    | `number`                            | `256` (MapLibre)   | Creation only                                                           |
| `minzoom`     | `number`                            | `0` (MapLibre)     | Creation only                                                           |
| `maxzoom`     | `number`                            | `22` (MapLibre)    | Creation only                                                           |
| `attribution` | `string`                            | `undefined`        | Creation only                                                           |
| `bounds`      | `[number, number, number, number]`  | `undefined`        | `[west, south, east, north]`; creation only                             |
| `scheme`      | `'xyz' \| 'tms'`                    | `'xyz'` (MapLibre) | Creation only                                                           |
| `opacity`     | `number \| expression`              | `1`                | `raster-opacity`, reconciled with `setPaintProperty`                    |
| `visible`     | `boolean`                           | `true`             | `visibility` layout property; the source stays loaded                   |
| `beforeId`    | `string`                            | `undefined`        | Layer to insert before; creation only                                   |
| `paint`       | `RasterLayerSpecification['paint']` | `undefined`        | Escape hatch, merged last                                               |

No outputs. A missing `tiles`/`url` or a duplicate source id is reported through `ng-map`'s `mapError`.

## ng-map-vector-source

Class `MapVectorSourceComponent`. A vector tile source (MVT, TileJSON or `pmtiles://`). **Adds the source only**: draw it with layers that reference `source: '<id>'`.

The source id is exactly `id` (auto `ng-vector-source-N`). While it exists on the map it is announced through `MapContextService.hasSource(id)` / `sourceIds()`; during a theme switch it disappears and comes back, so a consumer effect that reads `hasSource(id)` re-adds its layers by itself. On teardown (destroy, `id` change, or the gate closing for a theme switch) the component removes **every layer still using the source**, including layers added by other components or the app, then the source. Consumers must gate on `ctx.hasSource(id)` and re-add their layers when it reopens. The mode (`url` vs `tiles`) is fixed at creation: switching later is ignored; change `id` to rebuild.

| Input         | Type                               | Default         | Notes                                                                   |
| ------------- | ---------------------------------- | --------------- | ----------------------------------------------------------------------- |
| `id`          | `string`                           | auto            | Changing it re-creates the source                                       |
| `tiles`       | `readonly string[]`                | `undefined`     | URL templates; changes call `setTiles`. One of `tiles` / `url` required |
| `url`         | `string`                           | `undefined`     | TileJSON URL or `pmtiles://<archive url>`; changes call `setUrl`        |
| `minzoom`     | `number`                           | `0` (MapLibre)  | Creation only                                                           |
| `maxzoom`     | `number`                           | `22` (MapLibre) | Creation only                                                           |
| `attribution` | `string`                           | `undefined`     | Creation only                                                           |
| `bounds`      | `[number, number, number, number]` | `undefined`     | Creation only                                                           |
| `scheme`      | `'xyz' \| 'tms'`                   | `'xyz'`         | Creation only                                                           |
| `promoteId`   | `string \| Record<string, string>` | `undefined`     | Feature property used as id (enables feature-state); creation only      |

PMTiles: `ng-mapcn` does not depend on `pmtiles`. `npm i pmtiles`, then once before the map loads: `addProtocol('pmtiles', new Protocol().tile)` (`import { addProtocol } from 'maplibre-gl'; import { Protocol } from 'pmtiles'`; browser only). The server must support HTTP range requests.

## ng-map-image-overlay

Class `MapImageOverlayComponent`. An `image` source pinned to four corners plus one `raster` layer. Source id exactly `id` (auto `ng-image-overlay-N`), layer `image-layer-<id>`.

| Input         | Type                                | Default     | Notes                                                                               |
| ------------- | ----------------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| `id`          | `string`                            | auto        | Changing it re-creates the source and layer                                         |
| `url`         | `string`                            | required    | Changes call `updateImage`                                                          |
| `coordinates` | `ImageOverlayCoordinates`           | required    | `[lng, lat]` x4, clockwise from the top-left; changes call `setCoordinates`         |
| `opacity`     | `number \| expression`              | `1`         | `raster-opacity`                                                                    |
| `visible`     | `boolean`                           | `true`      |                                                                                     |
| `beforeId`    | `string`                            | `undefined` | Creation only                                                                       |
| `paint`       | `RasterLayerSpecification['paint']` | `undefined` | Escape hatch, e.g. `{ 'raster-fade-duration': 0 }` to avoid a flash on `url` change |

Also exported: `ImageOverlayCoordinates`, `TileBounds`, `TileScheme`.

## ng-map-fill-extrusion

Class `MapFillExtrusionComponent`. One MapLibre `fill-extrusion` layer, `fill-extrusion-layer-<id>` (auto `ng-fill-extrusion-N`). It creates no source: the layer is added once `map.getSource(source)` exists (a basemap source, a tile source component, or an application source announced by `sourcedata`) and re-added after a theme switch.

Defaults target the Carto basemaps (verified in Positron and Dark Matter): vector source `carto`, source layer `building` with `render_height`, `render_min_height` and `hide_3d`, tiles up to zoom 14.

| Input            | Type                                       | Default                             | Notes                                                  |
| ---------------- | ------------------------------------------ | ----------------------------------- | ------------------------------------------------------ |
| `id`             | `string`                                   | auto                                | Changing it re-creates the layer                       |
| `source`         | `string`                                   | `'carto'`                           | Changing it re-creates the layer                       |
| `sourceLayer`    | `string`                                   | `'building'` for `carto`, else none | Vector sources only; omit for GeoJSON                  |
| `heightProperty` | `string`                                   | `'render_height'`                   | Meters; `coalesce(to-number(get), 0)`                  |
| `baseProperty`   | `string`                                   | `'render_min_height'`               | Meters                                                 |
| `color`          | `string \| expression`                     | `defaultExtrusionColors[theme]`     | Theme-aware gray (`light` `#d1d5db`, `dark` `#3f3f46`) |
| `opacity`        | `number`                                   | `0.8`                               |                                                        |
| `minZoom`        | `number`                                   | `14`                                | `setLayerZoomRange` on change                          |
| `maxZoom`        | `number`                                   | `24`                                |                                                        |
| `filter`         | `FilterSpecification \| null`              | `['!=', ['get', 'hide_3d'], true]`  | `setFilter` on change; `null` = no filter              |
| `beforeId`       | `string`                                   | `undefined`                         | Creation only                                          |
| `paint`          | `FillExtrusionLayerSpecification['paint']` | `undefined`                         | Escape hatch, merged last over every input above       |

No outputs. Also exported: `defaultExtrusionColors`, `CARTO_SOURCE_ID`.

## ng-map-terrain

Class `MapTerrainComponent`. A `raster-dem` source `terrain-source-<id>` (auto id `ng-terrain-N`, announced through `hasSource`) plus `map.setTerrain({ source, exaggeration })`. With `hillshade` it also adds a hillshade layer `terrain-hillshade-<id>` over its own source `terrain-hillshade-source-<id>` (MapLibre warns if hillshade and terrain share a source). The terrain is style-level: it is disabled on teardown (only if it is this one) and re-enabled, with the sources, after a theme switch. One terrain per map.

| Input                                                                       | Type                                   | Default                         | Notes                                                     |
| --------------------------------------------------------------------------- | -------------------------------------- | ------------------------------- | --------------------------------------------------------- |
| `id`                                                                        | `string`                               | auto                            | Changing it re-creates everything                         |
| `tiles`                                                                     | `string[]`                             | public Terrarium tiles (AWS)    | Creation only (`defaultTerrainTiles`)                     |
| `url`                                                                       | `string`                               | `undefined`                     | TileJSON, takes precedence over `tiles`; creation only    |
| `encoding`                                                                  | `'terrarium' \| 'mapbox'`              | `'terrarium'`                   | Creation only                                             |
| `tileSize`                                                                  | `number`                               | `256` (none with `url`)         | Creation only                                             |
| `minzoom` / `maxzoom`                                                       | `number`                               | `maxzoom` 15 with default tiles | Creation only                                             |
| `attribution`                                                               | `string`                               | Mapzen / AWS for default tiles  | Creation only                                             |
| `exaggeration`                                                              | `number`                               | `1`                             | Calls `setTerrain` again when changed (rebuilds the mesh) |
| `hillshade`                                                                 | `boolean`                              | `false`                         | Adds/removes the hillshade layer and its source           |
| `hillshadeExaggeration`                                                     | `number`                               | `undefined`                     | 0..1, MapLibre default 0.5                                |
| `hillshadeShadowColor` / `hillshadeHighlightColor` / `hillshadeAccentColor` | `string`                               | `undefined`                     | Only defined values are set                               |
| `hillshadePaint`                                                            | `HillshadeLayerSpecification['paint']` | `undefined`                     | Escape hatch, merged last                                 |
| `beforeId`                                                                  | `string`                               | `undefined`                     | Hillshade layer, at its creation only                     |

No outputs. Also exported: `defaultTerrainTiles`, `TerrainEncoding`.

## Services

`MapContextService` (`@Injectable()`, provided by `ng-map`, not root):

| Member                                                                       | Type                                                             | Notes                                                                                                                                                                                          |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `map`                                                                        | `Signal<MapLibreMap \| null>`                                    |                                                                                                                                                                                                |
| `isLoaded`                                                                   | `Signal<boolean>`                                                | True only when the map `load` flag and the (debounced) `styledata` flag are both set. Closes during `setStyle`                                                                                 |
| `resolvedTheme`                                                              | `Signal<'light' \| 'dark'>`                                      | Theme currently applied to the map                                                                                                                                                             |
| `hasSource(id)` / `sourceIds`                                                | `boolean` (reactive in `effect`) / `Signal<ReadonlySet<string>>` | Source registry: ids announced by `ng-map-raster-source`, `ng-map-vector-source`, `ng-map-image-overlay` while the source is on the map. Wait on it before adding layers that use `source: id` |
| `registerSource(id)`                                                         | `() => () => void`                                               | Announce a source you added yourself; returns the release function                                                                                                                             |
| `setMap`, `setResolvedTheme`, `setLoadedFlag`, `setStyleLoadedFlag`, `reset` | methods                                                          | Used internally by `ng-map`                                                                                                                                                                    |

`ThemeService` (`providedIn: 'root'`):

| Member            | Notes                                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme`           | `Signal<'light' \| 'dark'>`. Detects the `dark` class, then the `light` class, then the `data-theme` attribute on `<html>`, then `prefers-color-scheme`. `'light'` on the server |
| `setTheme(theme)` | Toggles the `dark`/`light` class on `<html>` (no-op on the server)                                                                                                               |
| `toggleTheme()`   | Flips between light and dark                                                                                                                                                     |
| `getTheme()`      | Current value                                                                                                                                                                    |

## Providers and styles

```ts
provideMapStyles(
  source: MapStylesConfig | Signal<MapStylesConfig | undefined> | (() => Signal<MapStylesConfig | undefined>),
): Provider
```

A static config, a signal (changes swap every map's basemap at runtime), or a factory run in an injection context. `MAP_DEFAULT_STYLES` is the underlying `InjectionToken<Signal<MapStylesConfig | undefined>>`.

```ts
interface MapStylesConfig {
  light?: string | StyleSpecification;
  dark?: string | StyleSpecification;
}

defaultStyles: Record<'light' | 'dark', string> = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

blankMapStyle: StyleSpecification; // no sources, one transparent background layer
```

```ts
provideMapLabels(
  source: Partial<MapLabels> | Signal<Partial<MapLabels> | undefined> | (() => Signal<Partial<MapLabels> | undefined>),
): Provider
```

Translates the control buttons, the loader and the popup close button. Same three forms as `provideMapStyles`; a signal relabels every map when the locale changes. Missing keys fall back to `DEFAULT_MAP_LABELS` (English). A `labels` input on `ng-map`, `ng-map-controls`, `ng-map-popup` and `ng-marker-popup` wins over the provider. `MAP_LABELS` is the underlying `InjectionToken<Signal<Partial<MapLabels> | undefined>>`; `injectMapLabels(override?)` resolves defaults, then provider, then override, in an injection context.

```ts
interface MapLabels {
  zoomIn: string; // 'Zoom in'
  zoomOut: string; // 'Zoom out'
  resetNorth: string; // 'Reset north'
  locate: string; // 'My location'
  fullscreen: string; // 'Toggle fullscreen'
  loading: string; // 'Loading map' (loader aria-label)
  closePopup: string; // 'Close popup'
}
```

## Utils and types

```ts
interface MapViewport {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

type MapArcDatum = {
  id: string | number;
  from: [number, number];
  to: [number, number];
} & Record<string, unknown>;

interface MapArcEvent<T extends MapArcDatum = MapArcDatum> {
  arc: T;
  longitude: number;
  latitude: number;
  originalEvent: MapMouseEvent;
}

interface MapGeoJSONEvent<P = Record<string, unknown>> {
  feature: GeoJSON.Feature<GeoJSON.Geometry, P>;
  longitude: number;
  latitude: number;
  originalEvent: MapMouseEvent;
}

nextId(prefix: string): string; // 'prefix-N', unique per page
getViewport(map: MapLibreMap): MapViewport;
mergeHoverPaint<T extends Record<string, unknown>>(paint: T, hoverPaint: T | undefined): T;
// wraps each overridden property in ["case", ["boolean", ["feature-state", "hover"], false], hover, base]; needs promoteId on the source
buildArcCoordinates(from, to, curvature: number, samples: number): [number, number][];
// quadratic Bezier in lng/lat space; unwraps the destination longitude across the antimeridian
cumulativeLengths(coordinates): number[];
// haversine distance in meters at each vertex; compute once per path and pass it to the two below
sliceLineByProgress(coordinates, progress: number, cumulative?): [number, number][];
// the covered part, ending with a point interpolated (linearly in lng/lat) inside the cut segment
pointAlongLine(coordinates, fraction: number, cumulative?): [number, number] | null;
```
