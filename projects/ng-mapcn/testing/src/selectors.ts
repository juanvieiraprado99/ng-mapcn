/**
 * The DOM contract of a rendered `<ng-map>`: the CSS selectors of the elements MapLibre and the
 * library put on the page. It holds for the `maplibre-gl` fake (`ng-mapcn/testing/maplibre`) and
 * for the real MapLibre alike, so reuse it in your own end-to-end tests (Playwright, Cypress) and
 * DOM queries instead of hard-coding the classes. The component harnesses
 * (`ng-mapcn/testing/harness`) are built on it.
 *
 * Stable public API: a selector only changes in a major release, with a migration note. The
 * repository's end-to-end suite asserts every entry against real MapLibre in Chromium.
 *
 * This module has no imports, so it is safe to read from any environment.
 */
export const MAP_TEST_SELECTORS = {
  /** The `<ng-map>` host. */
  map: 'ng-map',
  /** `<ng-map>`'s loader overlay. */
  loader: '.ng-map-loader',
  /** A marker element, placed by MapLibre in `.maplibregl-canvas-container`. */
  marker: '.maplibregl-marker',
  /** An open popup or tooltip, a direct child of the map container (`.maplibregl-map`). */
  popup: '.maplibregl-popup',
  /**
   * The card of `<ng-marker-popup>` / `<ng-map-popup>` (a `role="dialog"`), inside
   * `.maplibregl-popup-content`.
   */
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

/** The keys of {@link MAP_TEST_SELECTORS}. */
export type MapTestSelector = keyof typeof MAP_TEST_SELECTORS;
