# Contributing to ng-mapcn

Thanks for your interest in ng-mapcn, an Angular port of [mapcn](https://mapcn.dev) built on MapLibre GL. By taking part you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Prerequisites

- Node.js `^22.22.3 || ^24.15.0 || >=26.0.0` (see `engines` in `package.json`)
- npm 9 or newer

## Local setup

```bash
npm install
npm run build-ui-dev
```

`build-ui-dev` builds the library, packs it, installs the `.tgz` into the workspace and serves the demo app. The demo consumes `ng-mapcn` as a local `.tgz` from `dist/`, so **rerun it after every library change**. The tarball is installed without saving it to `package.json`, so after any `npm install` run `npm run install:lib` (or `build-ui-dev`) to put the local library back.

If builds look stale, use the clean variant, which clears `.angular` and `dist` first:

```bash
npm run build-ui-dev-clean
```

## Project structure

This is an Angular library workspace with two projects:

- `projects/ng-mapcn/` is the publishable library.
- `projects/demo/` is the docs site and blocks gallery that consume the built library.

Inside `projects/ng-mapcn/src/lib/`:

| Path                                                                                              | Purpose                                                                                                |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `components/map/`                                                                                 | Map host: MapLibre init, theme-driven `setStyle`, `blank` style, controlled `viewport`, loader overlay |
| `components/map-marker/` + `marker-content/`, `marker-popup/`, `marker-tooltip/`, `marker-label/` | Marker created once and reconciled by diffed setters; content projected into the marker element        |
| `components/map-route/`, `map-geojson/`, `map-arc/`, `map-cluster-layer/`                         | Imperative layer components with empty templates                                                       |
| `services/map-context.service.ts`                                                                 | `map`, `isLoaded`, `resolvedTheme` signals, provided by `<ng-map>`                                     |
| `services/theme.service.ts`                                                                       | Watches the `dark`/`light` class on `<html>`, with a `prefers-color-scheme` fallback                   |
| `utils/map-utils.ts`                                                                              | `nextId`, `getViewport`, `mergeHoverPaint`, `buildArcCoordinates`, shared types                        |
| `styles/`                                                                                         | SCSS tokens/utilities and `map-styles.ts` (Carto defaults + `blankMapStyle`)                           |

The library is also distributed by schematics (`ng add ng-mapcn`). `scripts/sync-schematic-files.mjs` mirrors `src/lib/**` into `schematics/map/files/`. That folder is generated and git-ignored, so never edit it by hand.

## Library invariants

These come from the mapcn port plan. Do not violate them.

1. Every source/layer operation is gated on `MapContextService.isLoaded()` (map `load` plus debounced `styledata`). A theme switch calls `setStyle`, which destroys layers; the gate closes and reopens, and each layer component's creation `effect` re-adds everything.
2. MapLibre objects are created **once** and reconciled with diffed setters. Never destroy and recreate them on input changes.
3. The controlled viewport uses an internal flag around `jumpTo` plus a `map.isMoving()` skip to avoid feedback loops.
4. Teardown is defensive (try/catch): remove layers before the source, and call `map.off` symmetrically for every `map.on(event, layerId, handler)`.
5. Declarative hover is `promoteId` + `setFeatureState` + `mergeHoverPaint` (case expressions on `feature-state hover`).
6. Arcs render an invisible hit layer with `width = max(line-width + 6, 12)` under the visible layer.

## Coding conventions

- Use the Angular signals API: `input()` and `output()`.
- Components are standalone and `OnPush`.
- Formatting follows the Prettier config in `package.json` (100 columns, single quotes).
- After changing the public API, run `npm run generate:llms` to regenerate `llms.txt` and `llms-full.txt`.

## Linting and formatting

ESLint (with angular-eslint) checks the code and Prettier formats it.

```bash
npm run lint          # report lint problems
npm run lint:fix      # autofix what can be fixed
npm run format        # format everything with Prettier
npm run format:check  # verify formatting without writing
```

- Git hooks (husky) are installed automatically by `npm install`. On commit, lint-staged lints and formats the staged files, and commitlint checks that the message follows Conventional Commits.
- CI repeats the lint, format and commit message checks on every pull request.
- To hide the mechanical formatting commits from `git blame`, run `git config blame.ignoreRevsFile .git-blame-ignore-revs`.
- On Windows, LF line endings are enforced by `.gitattributes`, so no extra Git setup is needed.

## Tests

Unit tests run on [Vitest](https://vitest.dev) through the Angular CLI (`@angular/build:unit-test`) with jsdom.

```bash
npm test               # library + schematics + demo tests
npm run test:lib       # library only
npm run test:schematics  # builds the schematics, then tests ng-add / map with SchematicTestRunner
npm run test:demo      # demo only (needs `npm run install:lib` first)
npm run test:coverage  # library with coverage, written to coverage/ng-mapcn
ng test ng-mapcn       # watch mode
```

- Specs live next to the code as `*.spec.ts` under `projects/ng-mapcn/src/lib/`. They are not copied by the `ng add` schematic.
- MapLibre is mocked globally in `projects/ng-mapcn/src/testing/setup.ts`, so specs never create a real map. Import `projects/ng-mapcn/src/testing/maplibre-fake.ts` to inspect the fake instances.
- Test helpers go in `projects/ng-mapcn/src/testing/`, never in `src/lib`, so they are not shipped by the package or the schematic.
- jsdom has no layout, so `ng-map` would wait forever for a non-zero container size. Render maps with `renderMap` from `src/testing/render.ts`, which stubs the size, and use `loadMap` (with `vi.useFakeTimers()`) to open the load gate.
- Restore global state in `afterEach`: real timers, `vi.restoreAllMocks()` and the `<html>` class.

### Demo tests

- Demo specs live next to the code under `projects/demo/src/app/`; helpers go in `projects/demo/src/testing/`. Run `npm run install:lib` first: the demo consumes the packed library, and any `npm install` / `npm ci` removes it.
- The demo reuses the library's MapLibre fake: `projects/demo/src/testing/setup.ts` mocks `maplibre-gl` with `projects/ng-mapcn/src/testing/maplibre-fake.ts`, and stubs the jsdom gaps the pages need (`IntersectionObserver`, `matchMedia`, `scrollIntoView`).
- `vitest.demo.config.mts` inlines `ng-mapcn`. The packaged library in `node_modules` is otherwise externalized and loads the real CommonJS `maplibre-gl`, which bypasses the mock.
- `renderRoute(url)` renders a URL through the real route table (`app.routes.ts`) and returns the first `<h1>` and every `console.error`. Smoke tests assert the heading, the exact `document.title` and no errors.
- Restore global state in `afterEach`: `localStorage.clear()`, the `<html>` class, `vi.restoreAllMocks()`, `vi.unstubAllGlobals()` and `TestBed.resetTestingModule()`, and remove any meta/link/script tags a test adds to `document.head`.

## E2E tests

End-to-end tests run the demo app in headless Chromium with real MapLibre and WebGL (software rendered), through [Playwright](https://playwright.dev). They cover map loading, markers and popups, route/arc/GeoJSON layers and hover, cluster expansion, theme switching, synced viewports, and a smoke test of every page on the production build.

```bash
npm run e2e:build   # production build (dist/demo) + development build (dist/demo-e2e)
npm run e2e         # run every spec (Playwright starts both servers itself)
npm run e2e:ui      # the same in Playwright's UI mode
npx playwright test --project=dev map.spec   # one spec, dev project only
```

Run `npx playwright install chromium` once to download the browser. Rerun `npm run e2e:build` after changing the library or the demo; the specs run against the built output.

- **Offline and deterministic.** `e2e/fixtures.ts` intercepts every request that is not `localhost`: basemap `style.json` files get a minimal local style (a light and a dark variant), remote GeoJSON and the OSRM route come from `e2e/fixtures/*.json` or small stubs, and images and raster tiles get a 1x1 PNG. Anything else is aborted and fails the test, as does any console error or uncaught exception. The fixture is automatic: import `test` and `expect` from `./fixtures`, not from `@playwright/test`.
- **Two projects.** The `dev` project (port 4310) runs the interaction specs against a development build, which exposes `window.ng`, so specs reach the MapLibre instance without any test hooks in product code. The `prod` project (port 4320) runs only `smoke.spec.ts` against the shipped bundle and asserts that `window.ng` is absent.
- **Adding a spec.** Create `e2e/<topic>.spec.ts`, open the page with `gotoAndWaitForMap(page, url, mapIndex)` from `e2e/map-helpers.ts` (read the page template first: examples are the `ng-map` elements in page order, and some are non-interactive), then use `mapCall` to run code against the map, `layerIds` and `featureState` to inspect it, and `findRenderedPoint` to find a point you can hover or click. Wait on conditions (`expect.poll`, auto-waiting locators, map events), never on fixed sleeps. A new remote URL needs a fixture entry in `e2e/fixtures.ts`.
- On failure CI uploads the `playwright-report` and `test-results` (traces) as an artifact.

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/). The GitHub Actions release workflow parses commit messages to generate categorized release notes, so clear messages produce informative releases.

```
<type>[optional scope]: <short description>
```

| Type       | When to use                           |
| ---------- | ------------------------------------- |
| `feat`     | New feature or component              |
| `fix`      | Bug fix                               |
| `docs`     | Documentation changes                 |
| `refactor` | Code refactoring (no behavior change) |
| `perf`     | Performance improvement               |
| `style`    | Formatting, missing semicolons, etc.  |
| `test`     | Adding or fixing tests                |
| `build`    | Build system or dependency changes    |
| `ci`       | CI/CD configuration changes           |
| `chore`    | Miscellaneous maintenance tasks       |

Examples: `feat(marker): add support for custom SVG icons`, `fix(popup): ensure readable text in dark mode`.

## Pull requests

- Branch from `main`, and keep one topic per PR.
- Write the PR title in Conventional Commit form.
- Link the issue in the description (`Closes #N`).
- Check your change in the demo in both light and dark themes.
- Run `npm run lint`, `npm run build:lib:prod` and `npm test` before opening the PR (and `npm run e2e:build && npm run e2e` when you touch the library or the demo).

## Reporting bugs and security issues

Open a GitHub issue for bugs and feature requests. For security vulnerabilities, do not open a public issue; follow [SECURITY.md](SECURITY.md) instead.
