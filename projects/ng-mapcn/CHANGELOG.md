# Changelog

## [22.0.0-beta.2](https://github.com/juanvieiraprado99/ng-mapcn/compare/v22.0.0-beta.1...v22.0.0-beta.2) (2026-10-12)


### ⚠ BREAKING CHANGES

* ng-mapcn now requires maplibre-gl ^6.11.2 and WebGL2. Apps must serve `maplibre-gl-worker.mjs` and `maplibre-gl-shared.mjs` from `node_modules/maplibre-gl/dist` at their build output root (`ng add` configures this), or call `setWorkerUrl()` for another location. `maplibre-gl` is now a peer dependency.

### Bug Fixes

* require maplibre-gl v6 and address library review findings ([#24](https://github.com/juanvieiraprado99/ng-mapcn/issues/24)) ([de6bd22](https://github.com/juanvieiraprado99/ng-mapcn/commit/de6bd221c4b5651189cf5f5a91ecdf759ab969ac))

## [22.0.0-beta.1](https://github.com/juanvieiraprado99/ng-mapcn/compare/v22.0.0-beta.0...v22.0.0-beta.1) (2026-10-12)


### Features

* **demo:** mapcn.dev-style docs site, blocks gallery, SEO and map style picker ([1186b45](https://github.com/juanvieiraprado99/ng-mapcn/commit/1186b45f5590f6ff157aa27e78cc524b6bb9636a))


### Bug Fixes

* **geojson:** keep the layers when [data] or [promoteId] changes ([e2476c2](https://github.com/juanvieiraprado99/ng-mapcn/commit/e2476c2b9784b876ed0427cecf2516d7d1ce6c87))
* **map:** re-add layers when a theme switch style arrives after the load gate re-opened ([2f4712a](https://github.com/juanvieiraprado99/ng-mapcn/commit/2f4712aa5c5b06ed4b1eec662f1e1617c4c9c47f))
* **popup:** keep the projected content when the popup exists before the map ([3d5cfd0](https://github.com/juanvieiraprado99/ng-mapcn/commit/3d5cfd0e46175fc61f89e21a65594c5345a24fd8))
* resolve remaining lint violations ([30f4423](https://github.com/juanvieiraprado99/ng-mapcn/commit/30f44238cef2cabe2cb6cacb98338238c4e25492))
