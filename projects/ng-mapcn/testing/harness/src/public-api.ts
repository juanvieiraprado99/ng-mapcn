/*
 * Public API Surface of ng-mapcn/testing/harness
 *
 * Component harnesses (`@angular/cdk/testing`) for `<ng-map>`, its markers, popups and controls.
 * They read and drive the DOM only, so they work with the `maplibre-gl` fake from
 * `ng-mapcn/testing/maplibre` as well as with the real MapLibre in a browser. `@angular/cdk` is an
 * optional peer: install it to use this entry point. `ng-mapcn/testing` never imports it.
 */

export * from './map-controls-harness';
export * from './map-harness';
export * from './map-marker-harness';
export * from './map-popup-harness';
