# ng-mapcn API reference

All components are standalone, `OnPush`, and use signal inputs/outputs. Everything below is exported from `ng-mapcn` (or from the folder `ng add` copied into your app). Coordinates are `[longitude, latitude]`.

Contents: [ng-map](#ng-map) | [ng-map-controls](#ng-map-controls) | [ng-map-marker](#ng-map-marker) | [Marker children](#marker-children) | [ng-map-popup](#ng-map-popup) | [ng-map-route](#ng-map-route) | [ng-map-geojson](#ng-map-geojson) | [ng-map-arc](#ng-map-arc) | [ng-map-cluster-layer](#ng-map-cluster-layer) | [Services](#services) | [Providers and styles](#providers-and-styles) | [Utils and types](#utils-and-types)

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
| `viewport`   | `Partial<MapViewport>`                     | `undefined` | Controlled viewport; applied with `jumpTo`, skipped while the map is moving                                                        |
| `options`    | `Omit<MapOptions, 'container' \| 'style'>` | `undefined` | Extra MapLibre constructor options. Defaults before spreading: `renderWorldCopies: false`, `attributionControl: { compact: true }` |

| Output           | Payload                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `viewportChange` | `MapViewport` (fires on every `move` except programmatic viewport sync) |
| `mapReady`       | MapLibre `Map` (on `load`)                                              |
| `mapClick`       | `MapMouseEvent`                                                         |
| `mapError`       | `Error`                                                                 |

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

| Output         | Payload                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `locateChange` | `{ longitude: number; latitude: number }` (after a successful geolocation; the map flies there at zoom 14) |

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

| Output             | Payload                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| `markerClick`      | `MouseEvent`                                                                 |
| `markerMouseEnter` | `MouseEvent`                                                                 |
| `markerMouseLeave` | `MouseEvent`                                                                 |
| `dragStart`        | `{ lng: number; lat: number }`                                               |
| `drag`             | `{ lng: number; lat: number }` (per frame, emitted outside the Angular zone) |
| `dragEnd`          | `{ lng: number; lat: number }`                                               |

Method: `getMarker(): Marker | null`.

`MarkerContextService` (provided by each `ng-map-marker`): `marker` readonly signal of `Marker | null`, plus `setMarker(marker)` and `reset()`. Marker children inject it.

## Marker children

Must be placed inside `<ng-map-marker>`.

| Selector            | Class                    | Inputs                                                                                         | Outputs            | Behavior                                                                                                                           |
| ------------------- | ------------------------ | ---------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ng-marker-content` | `MarkerContentComponent` | none                                                                                           | none               | Projects its content into the marker element. Empty content renders the default dot (`.ng-marker-default-icon`)                    |
| `ng-marker-popup`   | `MarkerPopupComponent`   | none                                                                                           | `popupClose: void` | Popup attached to the marker (opens on marker click). Created with `closeButton: false`, `closeOnClick: false`, `maxWidth: 'none'` |
| `ng-marker-tooltip` | `MarkerTooltipComponent` | `offset: Offset` (default `16`), `anchor: PositionAnchor` (default `undefined`, creation only) | none               | Shown on marker hover; `pointer-events: none`                                                                                      |
| `ng-marker-label`   | `MarkerLabelComponent`   | `position: 'top' \| 'bottom'` (default `'top'`)                                                | none               | CSS label (`.ng-marker-label`), meant to be placed inside `ng-marker-content`                                                      |

## ng-map-popup

Class `MapPopupComponent`. Standalone popup at coordinates, opened on creation (unless `open` is `false`).

| Input          | Type                | Default  | Notes                                                                                                                         |
| -------------- | ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `longitude`    | `number`            | required |                                                                                                                               |
| `latitude`     | `number`            | required |                                                                                                                               |
| `closeButton`  | `boolean`           | `false`  | Library-drawn X button                                                                                                        |
| `offset`       | `Offset`            | `16`     |                                                                                                                               |
| `maxWidth`     | `string`            | `'none'` |                                                                                                                               |
| `closeOnClick` | `boolean`           | `true`   | Creation only. Set `false` for hover popups                                                                                   |
| `open`         | `boolean` (`model`) | `true`   | `[(open)]`: closing writes `false`, `true` reopens the same popup. A closed popup stays closed when only the position changes |

| Output       | Payload                                      |
| ------------ | -------------------------------------------- |
| `popupClose` | `void` (user close or `open` set to `false`) |
| `openChange` | `boolean` (the `[(open)]` binding)           |

## ng-map-route

Class `MapRouteComponent`. A LineString layer.

| Input         | Type                 | Default             | Notes                               |
| ------------- | -------------------- | ------------------- | ----------------------------------- |
| `coordinates` | `[number, number][]` | required            |                                     |
| `id`          | `string`             | auto (`ng-route-N`) | Source id; layer id is `<id>-layer` |
| `color`       | `string`             | `'#4285F4'`         |                                     |
| `width`       | `number`             | `3`                 |                                     |
| `opacity`     | `number`             | `0.8`               |                                     |
| `dashArray`   | `[number, number]`   | `undefined`         | Dashed line when set                |
| `interactive` | `boolean`            | `true`              |                                     |

| Output       | Payload         |
| ------------ | --------------- |
| `routeClick` | `MapMouseEvent` |

## ng-map-geojson

Class `MapGeoJSONComponent`. Fill and outline layers.

`type MapGeoJSONData = GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Geometry | string` (a string is a URL). Exported.

| Input            | Type                                       | Default               | Notes                                                                                                    |
| ---------------- | ------------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------- |
| `data`           | `MapGeoJSONData`                           | required              |                                                                                                          |
| `id`             | `string`                                   | auto (`ng-geojson-N`) |                                                                                                          |
| `promoteId`      | `string`                                   | `undefined`           | Feature property promoted to the feature id. Needed for `fillHoverPaint` and stable hover/click payloads |
| `fillPaint`      | `FillLayerSpecification['paint'] \| false` | `undefined`           | Merged onto theme defaults; `false` omits the fill layer                                                 |
| `linePaint`      | `LineLayerSpecification['paint'] \| false` | `undefined`           | Merged onto defaults; `false` omits the outline layer                                                    |
| `fillHoverPaint` | `FillLayerSpecification['paint']`          | `undefined`           | Applied to the hovered feature via feature-state. Requires `promoteId`                                   |
| `interactive`    | `boolean`                                  | `false`               | Enables mouse events                                                                                     |
| `beforeId`       | `string`                                   | `undefined`           | Layer to insert before; creation only                                                                    |

Paint defaults: fill color `#d4d4d4` (light) / `#404040` (dark); line color `#ffffff` (light) / `#171717` (dark), line width `0.5`.

| Output         | Payload                                                  |
| -------------- | -------------------------------------------------------- |
| `featureClick` | `MapGeoJSONEvent`                                        |
| `featureHover` | `MapGeoJSONEvent \| null` (null when the pointer leaves) |

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

Class `MapClusterLayerComponent`. Cluster circles sized/colored by count, a count label, and unclustered point dots.

| Input                | Type                                                 | Default                             | Notes                             |
| -------------------- | ---------------------------------------------------- | ----------------------------------- | --------------------------------- |
| `data`               | `string \| GeoJSON.FeatureCollection<GeoJSON.Point>` | required                            | String is a URL                   |
| `clusterMaxZoom`     | `number`                                             | `14`                                |                                   |
| `clusterRadius`      | `number`                                             | `50`                                | Pixels                            |
| `clusterColors`      | `[string, string, string]`                           | `['#22c55e', '#eab308', '#ef4444']` | small, medium, large              |
| `clusterThresholds`  | `[number, number]`                                   | `[100, 750]`                        | Point counts for medium and large |
| `pointColor`         | `string`                                             | `'#3b82f6'`                         |                                   |
| `zoomOnClusterClick` | `boolean`                                            | `true`                              |                                   |

| Output         | Payload                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `pointClick`   | `ClusterPointClickEvent` = `{ feature: GeoJSON.Feature<GeoJSON.Point>; coordinates: [number, number] }` |
| `clusterClick` | `ClusterClickEvent` = `{ clusterId: number; coordinates: [number, number]; pointCount: number }`        |

## Services

`MapContextService` (`@Injectable()`, provided by `ng-map`, not root):

| Member                                                                       | Type                          | Notes                                                                                                          |
| ---------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `map`                                                                        | `Signal<MapLibreMap \| null>` |                                                                                                                |
| `isLoaded`                                                                   | `Signal<boolean>`             | True only when the map `load` flag and the (debounced) `styledata` flag are both set. Closes during `setStyle` |
| `resolvedTheme`                                                              | `Signal<'light' \| 'dark'>`   | Theme currently applied to the map                                                                             |
| `setMap`, `setResolvedTheme`, `setLoadedFlag`, `setStyleLoadedFlag`, `reset` | methods                       | Used internally by `ng-map`                                                                                    |

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
```
