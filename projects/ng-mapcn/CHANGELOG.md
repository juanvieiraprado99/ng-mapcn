# Changelog

## [22.0.0-beta.7](https://github.com/juanvieiraprado99/ng-mapcn/compare/v22.0.0-beta.6...v22.0.0-beta.7) (2026-10-15)


### Features

* **3d:** fill-extrusion buildings and terrain/hillshade ([#80](https://github.com/juanvieiraprado99/ng-mapcn/issues/80)) ([52c74ba](https://github.com/juanvieiraprado99/ng-mapcn/commit/52c74baee84d6179e2d9d1ee39ba9a00f92415aa))
* **demo:** interactive playground and style gallery ([#82](https://github.com/juanvieiraprado99/ng-mapcn/issues/82)) ([0a338c7](https://github.com/juanvieiraprado99/ng-mapcn/commit/0a338c75b86fd7f87e32fd41566917adb7ec4335))
* **draw:** ng-map-draw for points, lines and polygons (optional ng-mapcn/draw entry) ([#81](https://github.com/juanvieiraprado99/ng-mapcn/issues/81)) ([b994f04](https://github.com/juanvieiraprado99/ng-mapcn/commit/b994f041730131729e577bca21833aa367919ebf))
* **heatmap:** add ng-map-heatmap declarative heatmap layer ([#74](https://github.com/juanvieiraprado99/ng-mapcn/issues/74)) ([21df063](https://github.com/juanvieiraprado99/ng-mapcn/commit/21df063b1107e11015ba59757e54142983b5364c))
* **map:** declarative fit-to-bounds via [fitBounds] ([#76](https://github.com/juanvieiraprado99/ng-mapcn/issues/76)) ([795c044](https://github.com/juanvieiraprado99/ng-mapcn/commit/795c0447a472f7b826d90eca31441ec92b017a67))
* **marker:** keyboard access for markers, tooltips and drag, plus demo a11y fixes ([#84](https://github.com/juanvieiraprado99/ng-mapcn/issues/84)) ([7da1b14](https://github.com/juanvieiraprado99/ng-mapcn/commit/7da1b142697ce1836224b34ec661b6862fddf22a))
* **popup:** keyboard-accessible popups plus SSR/hydration and axe e2e checks ([#77](https://github.com/juanvieiraprado99/ng-mapcn/issues/77)) ([707c408](https://github.com/juanvieiraprado99/ng-mapcn/commit/707c408da917ba7f83b0556b3a16cadbaac79496))
* **sources:** raster/vector tile sources and image overlay ([#79](https://github.com/juanvieiraprado99/ng-mapcn/issues/79)) ([7ffce18](https://github.com/juanvieiraprado99/ng-mapcn/commit/7ffce18bd3a1df7a2ddc9bbbc523e608deed87b4))


### Bug Fixes

* **demo:** playground review fixes and OpenStreetMap style preset ([#83](https://github.com/juanvieiraprado99/ng-mapcn/issues/83)) ([27a827b](https://github.com/juanvieiraprado99/ng-mapcn/commit/27a827bf6b1cd24fc16f37b8d36d14abc284d7cd))

## [22.0.0-beta.6](https://github.com/juanvieiraprado99/ng-mapcn/compare/v22.0.0-beta.5...v22.0.0-beta.6) (2026-10-15)


### ⚠ BREAKING CHANGES

* **cluster:** MapGeoJSONComponent and MapClusterLayerComponent are now generic over feature properties. When data is typed with an interface, event handlers must use the matching type argument, e.g. MapGeoJSONEvent<CountryProperties> instead of MapGeoJSONEvent.

### Features

* className inputs for portaled content and controls ([#60](https://github.com/juanvieiraprado99/ng-mapcn/issues/60)) ([943506f](https://github.com/juanvieiraprado99/ng-mapcn/commit/943506fd0714b7570e1dd97c481e0a25230473bf))
* **cluster:** id and beforeId inputs and typed generics ([#63](https://github.com/juanvieiraprado99/ng-mapcn/issues/63)) ([3c43094](https://github.com/juanvieiraprado99/ng-mapcn/commit/3c43094ecd22c4152d3bd9cc886547837d5e5479))
* configurable and translatable control and a11y labels ([#59](https://github.com/juanvieiraprado99/ng-mapcn/issues/59)) ([f2b813a](https://github.com/juanvieiraprado99/ng-mapcn/commit/f2b813a3d0e2096a62015369b79b74568f8ece60))
* **controls:** add a locateError output ([#58](https://github.com/juanvieiraprado99/ng-mapcn/issues/58)) ([bc1dc42](https://github.com/juanvieiraprado99/ng-mapcn/commit/bc1dc42a5518c8d7f01db797cc0a1fb1db396ccf))
* **marker-popup:** support PopupOptions and closeButton ([#62](https://github.com/juanvieiraprado99/ng-mapcn/issues/62)) ([bcad9e0](https://github.com/juanvieiraprado99/ng-mapcn/commit/bcad9e0690d279bdbdfcc80f7c2376d4a0c8c423))
* **route:** progress, active state, beforeId, hover outputs, RouteProgress and RouteMarker ([#64](https://github.com/juanvieiraprado99/ng-mapcn/issues/64)) ([673ad9e](https://github.com/juanvieiraprado99/ng-mapcn/commit/673ad9ee0191bba5f6c8feb9eab2a272a4766384))


### Bug Fixes

* **popup:** keep hover tooltips open when the cursor moves into them ([#61](https://github.com/juanvieiraprado99/ng-mapcn/issues/61)) ([6cafa30](https://github.com/juanvieiraprado99/ng-mapcn/commit/6cafa3020421bc970ef345b8b891b446e9db439c))

## [22.0.0-beta.5](https://github.com/juanvieiraprado99/ng-mapcn/compare/v22.0.0-beta.4...v22.0.0-beta.5) (2026-10-14)


### Bug Fixes

* **controls:** keep bottom-right controls clear of the attribution ([#54](https://github.com/juanvieiraprado99/ng-mapcn/issues/54)) ([054656f](https://github.com/juanvieiraprado99/ng-mapcn/commit/054656fedf589a5b96ec3acc365722a35a340f7d))

## [22.0.0-beta.4](https://github.com/juanvieiraprado99/ng-mapcn/compare/v22.0.0-beta.3...v22.0.0-beta.4) (2026-10-13)


### Bug Fixes

* **geojson,arc:** reset paint/layout keys removed from the inputs ([#45](https://github.com/juanvieiraprado99/ng-mapcn/issues/45)) ([c9400c9](https://github.com/juanvieiraprado99/ng-mapcn/commit/c9400c965432e09d5ba7d8e6d441c89870f1e77e))
* **map,marker:** emit viewportChange and drag inside the zone when observed ([#46](https://github.com/juanvieiraprado99/ng-mapcn/issues/46)) ([8fc97f3](https://github.com/juanvieiraprado99/ng-mapcn/commit/8fc97f3997734a1f02a6006eeaef2b3daa32d460))
* **marker:** keep the default icon in sync with the projected content ([#51](https://github.com/juanvieiraprado99/ng-mapcn/issues/51)) ([b059074](https://github.com/juanvieiraprado99/ng-mapcn/commit/b059074742a8cf775f38694ed44342ea7f19d1c9))
* **popup:** add a two-way open input so a closed ng-map-popup can be reopened ([#47](https://github.com/juanvieiraprado99/ng-mapcn/issues/47)) ([3d82aec](https://github.com/juanvieiraprado99/ng-mapcn/commit/3d82aec1fa7b104bba52b6c1a6cff378aac8aca7))
* report layer creation failures instead of freezing change detection ([#44](https://github.com/juanvieiraprado99/ng-mapcn/issues/44)) ([79018e8](https://github.com/juanvieiraprado99/ng-mapcn/commit/79018e8d0ff345c6d724569c5f35b2a179951cc7))

## [22.0.0-beta.3](https://github.com/juanvieiraprado99/ng-mapcn/compare/v22.0.0-beta.2...v22.0.0-beta.3) (2026-10-13)


### Features

* add ng-mapcn agent skill for skills.sh ([#27](https://github.com/juanvieiraprado99/ng-mapcn/issues/27)) ([41c79ba](https://github.com/juanvieiraprado99/ng-mapcn/commit/41c79ba0c2e1bdc9a6c5a426b95dee90cafc0a4e))


### Bug Fixes

* load the MapLibre worker under ng serve and render cluster count labels ([#30](https://github.com/juanvieiraprado99/ng-mapcn/issues/30)) ([3d1e25e](https://github.com/juanvieiraprado99/ng-mapcn/commit/3d1e25ef94ed205c0bded327907cd221983be757))

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
