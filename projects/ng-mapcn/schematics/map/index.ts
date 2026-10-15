import {
  apply,
  chain,
  mergeWith,
  move,
  type Rule,
  type SchematicContext,
  type Tree,
  url,
} from '@angular-devkit/schematics';

interface MapOptions {
  path: string;
  draw?: boolean;
}

// The copied draw sources are written against these (same ranges as the npm peer dependencies).
const DRAW_DEPENDENCIES = {
  'terra-draw': '^1.37.0',
  'terra-draw-maplibre-gl-adapter': '^1.5.0',
};

/**
 * Copies the ng-mapcn map component sources (shadcn-style) into the consumer
 * project so they can be freely customized. With `draw`, also copies the optional
 * `ng-mapcn/draw` sources to `<path>/draw` and adds their terra-draw dependencies.
 */
export function map(options: MapOptions): Rule {
  return (_tree: Tree, context: SchematicContext) => {
    context.logger.info(`Copying ng-mapcn map components to ${options.path}`);
    const rules: Rule[] = [mergeWith(apply(url('./files'), [move(options.path)]))];
    if (options.draw) {
      context.logger.info(`Copying ng-mapcn draw component to ${options.path}/draw`);
      rules.push(
        mergeWith(apply(url('./draw-files'), [move(`${options.path}/draw`)])),
        addDrawDependencies(),
      );
    }
    return chain(rules);
  };
}

function addDrawDependencies(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const pkgBuffer = tree.read('package.json');
    if (!pkgBuffer) {
      context.logger.warn('package.json not found — install terra-draw and its MapLibre adapter.');
      return tree;
    }
    const pkg = JSON.parse(pkgBuffer.toString());
    const before = JSON.stringify(pkg);
    pkg.dependencies = pkg.dependencies ?? {};
    for (const [name, version] of Object.entries(DRAW_DEPENDENCIES)) {
      if (!pkg.dependencies[name] && !pkg.devDependencies?.[name]) {
        pkg.dependencies[name] = version;
      }
    }
    if (JSON.stringify(pkg) !== before) {
      tree.overwrite('package.json', JSON.stringify(pkg, null, 2) + '\n');
    }
    return tree;
  };
}
