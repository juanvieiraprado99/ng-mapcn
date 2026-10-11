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

On a fresh clone, `npm install` fails because the demo depends on `file:dist/ng-mapcn/ng-mapcn-<version>.tgz`, which only exists after the first library build. Install once without that dependency, then restore the manifest:

```bash
npm pkg delete dependencies.ng-mapcn && npm install
git checkout package.json package-lock.json
npm run build-ui-dev
```

`build-ui-dev` builds the library, packs it, installs the `.tgz` into the workspace and serves the demo app. The demo consumes `ng-mapcn` as a local `.tgz` from `dist/`, so **rerun it after every library change**.

If builds look stale, use the clean variant, which clears `.angular` and `dist` first:

```bash
npm run build-ui-dev-clean
```

## Project structure

This is an Angular library workspace with two projects:

- `projects/ng-mapcn/` is the publishable library.
- `projects/demo/` is the docs site and blocks gallery that consume the built library.

Inside `projects/ng-mapcn/src/lib/`:

| Path | Purpose |
|---|---|
| `components/map/` | Map host: MapLibre init, theme-driven `setStyle`, `blank` style, controlled `viewport`, loader overlay |
| `components/map-marker/` + `marker-content/`, `marker-popup/`, `marker-tooltip/`, `marker-label/` | Marker created once and reconciled by diffed setters; content projected into the marker element |
| `components/map-route/`, `map-geojson/`, `map-arc/`, `map-cluster-layer/` | Imperative layer components with empty templates |
| `services/map-context.service.ts` | `map`, `isLoaded`, `resolvedTheme` signals, provided by `<ng-map>` |
| `services/theme.service.ts` | Watches the `dark`/`light` class on `<html>`, with a `prefers-color-scheme` fallback |
| `utils/map-utils.ts` | `nextId`, `getViewport`, `mergeHoverPaint`, `buildArcCoordinates`, shared types |
| `styles/` | SCSS tokens/utilities and `map-styles.ts` (Carto defaults + `blankMapStyle`) |

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

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/). The GitHub Actions release workflow parses commit messages to generate categorized release notes, so clear messages produce informative releases.

```
<type>[optional scope]: <short description>
```

| Type | When to use |
|---|---|
| `feat` | New feature or component |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `refactor` | Code refactoring (no behavior change) |
| `perf` | Performance improvement |
| `style` | Formatting, missing semicolons, etc. |
| `test` | Adding or fixing tests |
| `build` | Build system or dependency changes |
| `ci` | CI/CD configuration changes |
| `chore` | Miscellaneous maintenance tasks |

Examples: `feat(marker): add support for custom SVG icons`, `fix(popup): ensure readable text in dark mode`.

## Pull requests

- Branch from `main`, and keep one topic per PR.
- Write the PR title in Conventional Commit form.
- Link the issue in the description (`Closes #N`).
- Check your change in the demo in both light and dark themes.
- Run `npm run build:lib:prod` and `npm test` before opening the PR.

## Reporting bugs and security issues

Open a GitHub issue for bugs and feature requests. For security vulnerabilities, do not open a public issue; follow [SECURITY.md](SECURITY.md) instead.
