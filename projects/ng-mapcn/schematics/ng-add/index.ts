import {
  chain,
  type Rule,
  schematic,
  type SchematicContext,
  type Tree,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

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
  return chain([
    addMaplibreDependency(),
    registerMaplibreCss(options),
    registerWorkerAssets(options),
    appendGlobalStyles(options),
    schematic('map', { path: options.path, draw: options.draw }),
    installDependencies(),
  ]);
}

function addMaplibreDependency(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const pkgBuffer = tree.read('package.json');
    if (!pkgBuffer) return tree;
    const pkg = JSON.parse(pkgBuffer.toString());
    const before = JSON.stringify(pkg);
    pkg.dependencies = pkg.dependencies ?? {};
    const existing: string | undefined = pkg.dependencies['maplibre-gl'];
    if (!existing) {
      pkg.dependencies['maplibre-gl'] = MAPLIBRE_VERSION;
    } else if (!/^[\^~]?6\./.test(existing)) {
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

function registerWorkerAssets(options: NgAddOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const angularJsonBuffer = tree.read('angular.json');
    if (!angularJsonBuffer) return tree; // registerMaplibreCss already warned
    const workspace = JSON.parse(angularJsonBuffer.toString());
    const projectName = options.project ?? Object.keys(workspace.projects ?? {})[0];
    const buildOptions = workspace.projects?.[projectName]?.architect?.build?.options;
    if (!buildOptions) {
      context.logger.warn(
        `Could not locate the build options for project "${projectName}" — copy ` +
          'maplibre-gl-worker.mjs and maplibre-gl-shared.mjs from node_modules/maplibre-gl/dist ' +
          'to your build output root manually.',
      );
      return tree;
    }
    const assets: unknown[] = (buildOptions.assets ??= []);
    const missing = WORKER_ASSETS.filter(
      (asset) =>
        !assets.some(
          (a) =>
            typeof a === 'object' && a !== null && (a as { glob?: string }).glob === asset.glob,
        ),
    );
    if (missing.length) {
      assets.push(...missing);
      tree.overwrite('angular.json', JSON.stringify(workspace, null, 2) + '\n');
    }
    return tree;
  };
}

function registerMaplibreCss(options: NgAddOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const angularJsonBuffer = tree.read('angular.json');
    if (!angularJsonBuffer) {
      context.logger.warn('angular.json not found — add maplibre-gl CSS to your styles manually.');
      return tree;
    }
    const workspace = JSON.parse(angularJsonBuffer.toString());
    const projectName = options.project ?? Object.keys(workspace.projects ?? {})[0];
    const project = workspace.projects?.[projectName];
    const styles: unknown[] | undefined = project?.architect?.build?.options?.styles;
    if (!styles) {
      context.logger.warn(
        `Could not locate the styles array for project "${projectName}" — add "${MAPLIBRE_CSS}" manually.`,
      );
      return tree;
    }
    if (!styles.includes(MAPLIBRE_CSS)) {
      styles.unshift(MAPLIBRE_CSS);
      tree.overwrite('angular.json', JSON.stringify(workspace, null, 2) + '\n');
    }
    return tree;
  };
}

function appendGlobalStyles(options: NgAddOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const candidates = ['src/styles.scss', 'src/styles.css'];
    const stylesPath = candidates.find((p) => tree.exists(p));
    if (!stylesPath) {
      context.logger.warn(
        'No global stylesheet found (src/styles.scss|css) — add the .maplibregl-popup-* overrides manually.',
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
      // Component styles are self-contained; the shared tokens/utilities live
      // in the copied styles folder and must be loaded once globally.
      const stylesDir = options.path.replace(/^src\//, './').replace(/\/$/, '');
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
