import { Rule, SchematicContext, Tree, chain, schematic } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

const MAPLIBRE_VERSION = '^5.16.0';
const MAPLIBRE_CSS = 'node_modules/maplibre-gl/dist/maplibre-gl.css';

// Global overrides required by mapcn: MapLibre injects its own popup chrome,
// which must be neutralized so the framework-styled content shows cleanly.
const GLOBAL_CSS = `
/* ng-mapcn — required MapLibre popup overrides */
.maplibregl-popup-content {
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
}
.maplibregl-popup-tip {
  display: none !important;
}
`;

interface NgAddOptions {
  project?: string;
  path: string;
}

export function ngAdd(options: NgAddOptions): Rule {
  return chain([
    addMaplibreDependency(),
    registerMaplibreCss(options),
    appendGlobalStyles(options),
    schematic('map', { path: options.path }),
    installDependencies(),
  ]);
}

function addMaplibreDependency(): Rule {
  return (tree: Tree) => {
    const pkgBuffer = tree.read('package.json');
    if (!pkgBuffer) return tree;
    const pkg = JSON.parse(pkgBuffer.toString());
    pkg.dependencies = pkg.dependencies ?? {};
    if (!pkg.dependencies['maplibre-gl']) {
      pkg.dependencies['maplibre-gl'] = MAPLIBRE_VERSION;
      tree.overwrite('package.json', JSON.stringify(pkg, null, 2) + '\n');
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
