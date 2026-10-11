# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Build the library (includes schematics)
npm run build:lib
npm run build:lib:prod

# Build only the schematics into dist/ng-mapcn/schematics
npm run build:schematics

# Build library, pack it, install locally, and serve demo app
npm run build-ui-dev

# Same as above but clears .angular and dist caches first (use when builds are stale)
npm run build-ui-dev-clean

# Serve demo app (requires library already built and installed locally)
ng serve demo

# Publish to npm
npm run publish:lib

# Run tests (Vitest via the Angular CLI)
npm test                # lib + demo
npm run test:lib        # library only
npm run test:demo       # demo only (run npm run install:lib first)
npm run test:coverage   # library with v8 coverage (coverage/ng-mapcn)

# Lint and format (ESLint + Prettier)
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

The demo app depends on `ng-mapcn` installed as a local `.tgz` file from `dist/`. After any library change, run `build-ui-dev` or `build-ui-dev-clean` before serving the demo.

## Architecture

This is an **Angular library workspace** (`ng-packagr`) with two projects:

- `projects/ng-mapcn/` — the publishable library, an Angular port of [mapcn](https://mapcn.dev) (React + MapLibre GL v5)
- `projects/demo/` — a demo/test app that consumes the built library

### Library structure (`projects/ng-mapcn/src/lib/`)

**Composition model (mapcn parity):** `<ng-map>` provides a component-scoped `MapContextService` (`providers: [MapContextService]`). All child components (`ng-map-marker`, `ng-map-route`, `ng-map-geojson`, `ng-map-arc`, `ng-map-cluster-layer`, `ng-map-controls`, `ng-map-popup`) resolve the map via `inject(MapContextService)` — the Angular equivalent of mapcn's `useMap()`. There is no global registry.

- `components/map/` — map host: MapLibre init (`renderWorldCopies: false`, compact attribution), theme-driven `setStyle`, `blank` style, controlled `viewport` with anti-feedback-loop guard, loader overlay.
- `components/map-marker/` + `marker-content/`, `marker-popup/`, `marker-tooltip/`, `marker-label/` — marker created once, reconciled by diffed setters; content projected into `marker.getElement()` via embedded views (the Angular "portal").
- `components/map-route|map-geojson|map-arc|map-cluster-layer/` — imperative layer components with empty templates.
- `services/map-context.service.ts` — `map`, `isLoaded`, `resolvedTheme` signals.
- `services/theme.service.ts` — watches the **`dark`/`light` class** on `document.documentElement` (MutationObserver) with a `prefers-color-scheme` fallback.
- `utils/map-utils.ts` — `nextId`, `getViewport`, `mergeHoverPaint`, `buildArcCoordinates`, shared types.
- `styles/` — SCSS tokens/utilities; `map-styles.ts` has Carto defaults + `blankMapStyle`.

**Invariants (from the mapcn port plan — do not violate):**

1. Every source/layer operation is gated on `MapContextService.isLoaded()` (map `load` + debounced `styledata`). Theme switch calls `setStyle`, which destroys layers — the gate closes and reopens, and each layer component's creation `effect` re-adds everything.
2. MapLibre objects are created **once** and reconciled with diffed setters; never destroyed/recreated on input changes.
3. Controlled viewport uses an internal flag around `jumpTo` plus `map.isMoving()` skip to avoid feedback loops.
4. Teardown is defensive (try/catch): remove layers before the source; symmetric `map.off` for every `map.on(event, layerId, handler)`.
5. Declarative hover = `promoteId` + `setFeatureState` + `mergeHoverPaint` (case expressions on `feature-state hover`).
6. Arcs render an invisible hit layer with `width = max(line-width + 6, 12)` under the visible layer.

### Distribution

Two channels, same sources:

- **npm package** — ng-packagr build (`dist/ng-mapcn`).
- **Schematics copy-paste (shadcn-style)** — `ng add ng-mapcn` adds `maplibre-gl`, registers its CSS, appends the global `.maplibregl-popup-*` overrides and copies the sources into the consumer app. `scripts/sync-schematic-files.mjs` mirrors `src/lib/**` into `schematics/map/files/` (generated, git-ignored); `scripts/build-schematics.mjs` compiles and copies everything into `dist/ng-mapcn/schematics`.

**Key patterns**:

- All inputs/outputs use the Angular signals API (`input()`, `output()`); components are standalone and OnPush.
- The global CSS overrides for `.maplibregl-popup-*` (in `projects/ng-mapcn/styles.scss`) are required for popups/tooltips to look right.

## Commits

Always use **Conventional Commits** format — commit messages are parsed by the GitHub Actions release workflow to generate categorized release notes, so well-described commits produce informative releases. commitlint enforces the format through a husky `commit-msg` hook, and lint-staged runs ESLint and Prettier on staged files in the `pre-commit` hook.

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

**Examples:**

- `feat(marker): add support for custom SVG icons`
- `fix(popup): ensure readable text in dark mode`
- `chore: bump ng-mapcn to version 21.0.0-beta.6`
