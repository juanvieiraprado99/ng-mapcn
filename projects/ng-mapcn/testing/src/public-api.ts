/*
 * Public API Surface of ng-mapcn/testing
 *
 * Unit-test helpers for `<ng-map>`. They drive the `maplibre-gl` fake from
 * `ng-mapcn/testing/maplibre`, which the test setup must install in place of `maplibre-gl`.
 * `MAP_TEST_SELECTORS` is the rendered DOM contract, also for end-to-end tests. This entry point
 * never imports `@angular/cdk` (the harnesses in `ng-mapcn/testing/harness` build on it).
 * Never import this entry point from application code.
 */

export * from './render';
export * from './selectors';
