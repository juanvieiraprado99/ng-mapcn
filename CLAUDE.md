# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Build the library
ng build ng-mapcn
ng build ng-mapcn --configuration production

# Build library, pack it, install locally, and serve demo app
npm run build-ui-dev

# Same as above but clears .angular and dist caches first (use when builds are stale)
npm run build-ui-dev-clean

# Serve demo app (requires library already built and installed locally)
ng serve demo

# Publish to npm
npm run publish:lib

# Run tests
ng test
```

The demo app depends on `ng-mapcn` installed as a local `.tgz` file from `dist/`. After any library change, run `build-ui-dev` or `build-ui-dev-clean` before serving the demo.

## Architecture

This is an **Angular library workspace** (`ng-packagr`) with two projects:

- `projects/ng-mapcn/` — the publishable library
- `projects/demo/` — a demo/test app that consumes the built library

### Library structure (`projects/ng-mapcn/src/lib/`)

**Components** (all standalone):

- `map/map.component.ts` — Core map host. Wraps MapLibre GL, registers itself with `MapService` by `mapId`, handles theme switching, and emits lifecycle/interaction events. All other components/services look up the map instance via `mapId`.
- `marker/marker.component.ts` — Declarative marker; delegates to `MarkerService`.
- `route/route.component.ts` — Draws GeoJSON line routes on the map.
- `controls/map-controls.component.ts` — Adds native MapLibre controls (zoom, compass, geolocate, fullscreen).
- `route-planning/route-planning.component.ts` — UI for point-to-point routing via OSRM.

**Services**:

- `MapService` — Central registry (`Map<mapId, MapLibreMap>`). All components communicate with the underlying MapLibre instance through this service using a shared `mapId` string.
- `MarkerService` — Creates and manages MapLibre `Marker` and `Popup` instances; handles custom icons, popups, labels, and tooltips.
- `ThemeService` — Signal-based (`theme = signal<'light'|'dark'>`) theme state. `MapComponent` observes `data-theme` on `document.documentElement` for `auto` mode.
- `OsrmService` — HTTP client wrapper for OSRM routing API (requires `provideHttpClient()` in the consumer app).

**Key patterns**:

- All inputs use the Angular signals API (`input()`, `output()`).
- Components are standalone — no NgModule.
- `mapId` is the coordination key: `MapComponent` registers a map, and every other component/service uses the same `mapId` to retrieve it from `MapService`.
- Theme-aware map styles are defined in `lib/styles/map-styles.ts` and applied by `MapComponent` when the theme changes.

## Commits

Always use **Conventional Commits** format — commit messages are parsed by the GitHub Actions release workflow to generate categorized release notes, so well-described commits produce informative releases.

```
<type>[optional scope]: <short description>
```

| Type | When to use |
|------|-------------|
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

**Examples:**
- `feat(marker): add support for custom SVG icons`
- `fix(popup): ensure readable text in dark mode`
- `chore: bump ng-mapcn to version 21.0.0-beta.6`
