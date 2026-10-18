import {
  chain,
  type Rule,
  schematic,
  type SchematicContext,
  type Tree,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import {
  type ProjectDefinition,
  readWorkspace,
  updateWorkspace,
  type WorkspaceDefinition,
} from '@schematics/angular/utility';

import { dirnamePath, joinPath, normalizeTargetPath, relativePath } from '../utils/path';

// v6.4.1+ fixes GHSA-jrc7-96c5-q579 (attribution XSS); the copied sources are written against v6.
const MAPLIBRE_VERSION = '^6.11.2';
// The public types reference GeoJSON; maplibre-gl v6 no longer loads them ambiently.
const GEOJSON_TYPES_VERSION = '^7946.0.16';
const MAPLIBRE_CSS = 'node_modules/maplibre-gl/dist/maplibre-gl.css';
// MapLibre v6 loads its module worker from `./maplibre-gl-worker.mjs` next to the bundle that
// imports it (`import.meta.url`), and the worker imports `./maplibre-gl-shared.mjs`. Copying both
// to the output root puts them beside the app chunks.
const WORKER_ASSETS = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'].map((glob) => ({
  glob,
  input: 'node_modules/maplibre-gl/dist',
  output: '/',
}));

// Global overrides required by mapcn: MapLibre injects its own popup chrome,
// which must be neutralized so the framework-styled content shows cleanly.
const GLOBAL_CSS = `
/* ng-mapcn — required MapLibre popup overrides */
.maplibregl-popup-content {
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
  max-width: none !important;
}
.maplibregl-popup-tip {
  display: none !important;
}
`;

// Non-interactive (hover tooltip) popups. A styles.scss consumer already gets this rule from the
// copied styles via the @use line, so it is only appended to plain CSS files.
const PASSTHROUGH_CSS = `
/* ng-mapcn — className="ng-popup-passthrough" popups ignore the pointer */
.maplibregl-popup:has(.ng-popup-passthrough),
.maplibregl-popup:has(.ng-popup-passthrough) .maplibregl-popup-content {
  pointer-events: none !important;
}
`;

interface NgAddOptions {
  project?: string;
  path: string;
  draw?: boolean;
}

export function ngAdd(options: NgAddOptions): Rule {
  const path = normalizeTargetPath(options.path);
  return async (tree: Tree, context: SchematicContext) => {
    const workspace = await readWorkspaceOrWarn(tree, context);
    const projectName = workspace ? resolveProjectName(workspace, options.project) : undefined;
    const project = projectName ? workspace?.projects.get(projectName) : undefined;
    return chain([
      addMaplibreDependency(),
      projectName ? registerBuildOptions(projectName) : noop(),
      appendGlobalStyles(path, project),
      schematic('map', { path, draw: options.draw }),
      installDependencies(),
    ]);
  };
}

async function readWorkspaceOrWarn(
  tree: Tree,
  context: SchematicContext,
): Promise<WorkspaceDefinition | null> {
  if (!tree.exists('angular.json')) {
    context.logger.warn(
      'angular.json not found — add maplibre-gl CSS and its worker assets to your build manually.',
    );
    return null;
  }
  try {
    return await readWorkspace(tree);
  } catch (e) {
    context.logger.warn(
      `Could not read angular.json (${(e as Error).message}) — add maplibre-gl CSS and its ` +
        'worker assets to your build manually.',
    );
    return null;
  }
}

/** The requested project, else the first one (the CLI passes the default project as `project`). */
function resolveProjectName(
  workspace: WorkspaceDefinition,
  requested?: string,
): string | undefined {
  if (requested) return requested;
  return workspace.projects.keys().next().value;
}

function noop(): Rule {
  return (tree: Tree) => tree;
}

function addMaplibreDependency(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const pkgBuffer = tree.read('package.json');
    if (!pkgBuffer) return tree;
    const pkg = JSON.parse(pkgBuffer.toString());
    const before = JSON.stringify(pkg);
    pkg.dependencies = pkg.dependencies ?? {};
    const existing: string | undefined =
      pkg.dependencies['maplibre-gl'] ?? pkg.devDependencies?.['maplibre-gl'];
    if (!existing) {
      pkg.dependencies['maplibre-gl'] = MAPLIBRE_VERSION;
    } else if (majorOf(existing) !== 6) {
      // Never rewrite the app's own pin — but the copied sources will not compile against it.
      context.logger.warn(
        `ng-mapcn needs maplibre-gl ${MAPLIBRE_VERSION} (v6.4.1+ also fixes GHSA-jrc7-96c5-q579); ` +
          `found "${existing}". Update it before building.`,
      );
    }
    if (!pkg.dependencies['@types/geojson'] && !pkg.devDependencies?.['@types/geojson']) {
      pkg.devDependencies = { ...pkg.devDependencies, '@types/geojson': GEOJSON_TYPES_VERSION };
    }
    if (JSON.stringify(pkg) !== before) {
      tree.overwrite('package.json', JSON.stringify(pkg, null, 2) + '\n');
    }
    return tree;
  };
}

/** First major version a range mentions (`^6.1`, `~6`, `>=6.11`, `6.x` → 6); null for tags/URLs. */
function majorOf(range: string): number | null {
  const match = /^\s*(?:[\^~]|[<>]=?|=)?\s*v?(\d+)/.exec(range);
  return match ? Number(match[1]) : null;
}

/**
 * Registers the maplibre-gl CSS (first in `styles`) and copies its module worker next to the app
 * bundles. Edits angular.json through the workspace API, which keeps its comments and formatting
 * and understands both `architect` and `targets`.
 */
function registerBuildOptions(projectName: string): Rule {
  return (_tree: Tree, context: SchematicContext) =>
    updateWorkspace((workspace) => {
      const options = workspace.projects.get(projectName)?.targets.get('build')?.options;
      if (!options) {
        context.logger.warn(
          `Could not locate the build options for project "${projectName}" — add ` +
            `"${MAPLIBRE_CSS}" to its styles and copy maplibre-gl-worker.mjs and ` +
            'maplibre-gl-shared.mjs from node_modules/maplibre-gl/dist to your build output root.',
        );
        return;
      }

      const styles = options['styles'];
      if (!Array.isArray(styles)) {
        context.logger.warn(
          `Could not locate the styles array for project "${projectName}" — add "${MAPLIBRE_CSS}" manually.`,
        );
      } else if (!styles.includes(MAPLIBRE_CSS)) {
        options['styles'] = [MAPLIBRE_CSS, ...styles];
      }

      const assets = Array.isArray(options['assets']) ? options['assets'] : [];
      const missing = WORKER_ASSETS.filter(
        (asset) =>
          !assets.some(
            (a) =>
              typeof a === 'object' &&
              a !== null &&
              !Array.isArray(a) &&
              (a as { glob?: unknown }).glob === asset.glob,
          ),
      );
      if (missing.length) options['assets'] = [...assets, ...missing];
    });
}

/**
 * The project's global stylesheet: the first .scss/.css of its `styles` that exists, else
 * `<sourceRoot>/styles.scss|css`.
 */
function findGlobalStylesheet(tree: Tree, project?: ProjectDefinition): string | undefined {
  const declared = project?.targets.get('build')?.options?.['styles'];
  const fromBuild = (Array.isArray(declared) ? declared : [])
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        return (entry as { input?: unknown }).input;
      }
      return undefined;
    })
    .filter(
      (p): p is string =>
        typeof p === 'string' && /\.s?css$/.test(p) && !p.startsWith('node_modules/'),
    );
  const sourceRoot = project?.sourceRoot ?? joinPath(project?.root ?? '', 'src');
  const fallback = ['styles.scss', 'styles.css'].map((f) => joinPath(sourceRoot, f));
  return [...fromBuild, ...fallback].find((p) => tree.exists(p));
}

function appendGlobalStyles(path: string, project?: ProjectDefinition): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const stylesPath = findGlobalStylesheet(tree, project);
    if (!stylesPath) {
      context.logger.warn(
        'No global stylesheet found (styles.scss|css) — add the .maplibregl-popup-* overrides manually.',
      );
      return tree;
    }
    const current = tree.read(stylesPath)!.toString();
    let addition = '';
    if (!current.includes('.maplibregl-popup-content')) {
      addition += GLOBAL_CSS;
    }
    if (!stylesPath.endsWith('.scss') && !current.includes('.ng-popup-passthrough')) {
      addition += PASSTHROUGH_CSS;
    }
    if (stylesPath.endsWith('.scss')) {
      // Component styles are self-contained; the shared tokens/utilities live in the copied
      // styles folder and must be loaded once globally, relative to the global stylesheet.
      const stylesDir = relativePath(dirnamePath(stylesPath), path);
      const useLine = `@use '${stylesDir}/styles/index' as *;`;
      if (!current.includes(useLine)) {
        // @use must precede other rules
        tree.overwrite(stylesPath, `${useLine}\n${current}${addition}`);
        return tree;
      }
    }
    if (addition) {
      tree.overwrite(stylesPath, current + addition);
    }
    return tree;
  };
}

function installDependencies(): Rule {
  return (_tree: Tree, context: SchematicContext) => {
    context.addTask(new NodePackageInstallTask());
  };
}
