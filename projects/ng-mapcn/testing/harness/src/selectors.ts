/**
 * The DOM contract the harnesses rely on: classes MapLibre and the library put on the rendered
 * map. They hold for the `maplibre-gl` fake and for the real MapLibre alike;
 * `e2e/testing-harness.spec.ts` asserts them against real MapLibre in a browser. This file has no
 * imports so that spec can load it outside Angular.
 */
export const HARNESS_SELECTORS = {
  map: 'ng-map',
  /** `<ng-map>`'s loader overlay. */
  loader: '.ng-map-loader',
  /** A marker element, placed by MapLibre in `.maplibregl-canvas-container`. */
  marker: '.maplibregl-marker',
  /** An open popup or tooltip, a direct child of the map container (`.maplibregl-map`). */
  popup: '.maplibregl-popup',
  /** The card of `<ng-marker-popup>` / `<ng-map-popup>`, inside `.maplibregl-popup-content`. */
  popupCard: '.ng-popup-card',
  /** The pill of `<ng-marker-tooltip>`. */
  tooltip: '.ng-tooltip-pill',
  /** The library's close button inside a popup card (`closeButton` input). */
  popupClose: '.ng-popup-close',
  /** `<ng-map-controls>`, rendered in a `.maplibregl-ctrl-*` corner of the control container. */
  controls: '.ng-controls',
  /** The button group of `<ng-map-controls>`. */
  controlGroup: '.ng-control-group',
} as const;
