import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

import { renderBarrel } from '../registry/barrel';
import { readRegistry, resolve } from '../registry/resolve';
import { joinPath, normalizeTargetPath } from '../utils/path';

export interface AddOptions {
  components?: string[];
  all?: boolean;
  overwrite?: boolean;
  path: string;
  skipInstall?: boolean;
}

/**
 * Copies the requested components (shadcn-style) and the files they depend on into the project,
 * rewrites the `index.ts` barrel from what is present, and adds the npm dependencies they need.
 * With no components it copies the core only.
 */
export function add(options: AddOptions): Rule {
  const path = normalizeTargetPath(options.path);
  return (tree: Tree, context: SchematicContext) => {
    const registry = readRegistry();
    const resolution = resolve(registry, options.components ?? [], { all: options.all });

    let created = 0;
    let skipped = 0;
    for (const file of resolution.files) {
      const target = joinPath(path, file);
      const content = readFileSync(join(__dirname, 'files', file));
      if (!tree.exists(target)) {
        tree.create(target, content);
        created++;
      } else if (options.overwrite) {
        tree.overwrite(target, content);
        created++;
      } else {
        context.logger.info(`skipped ${target} (exists)`);
        skipped++;
      }
    }

    const barrel = renderBarrel(registry, (f) => tree.exists(joinPath(path, f)));
    const barrelPath = joinPath(path, 'index.ts');
    if (tree.exists(barrelPath)) tree.overwrite(barrelPath, barrel);
    else tree.create(barrelPath, barrel);

    const added = addDependenciesWithReport(resolution.dependencies);
    added.rule(tree, context);
    const hasMaplibre = hasPackage(tree, 'maplibre-gl');
    if (!hasMaplibre) {
      context.logger.warn(
        'maplibre-gl is not in package.json. Run "npx ng-mapcn init" (or "ng add ng-mapcn") first.',
      );
    }
    if (added.names().length && !options.skipInstall) {
      context.addTask(new NodePackageInstallTask());
    }

    const names = resolution.items.join(', ');
    context.logger.info(`Installed: ${names}. Created ${created}, skipped ${skipped} file(s).`);
    if (added.names().length) {
      context.logger.info(
        `Added dependencies: ${added
          .names()
          .map((n) => `${n}@${resolution.dependencies[n]}`)
          .join(', ')}`,
      );
    }
    return tree;
  };
}

interface DependencyRule {
  rule: Rule;
  /** Names added by the last run of `rule`. */
  names: () => string[];
}

function hasPackage(tree: Tree, name: string): boolean {
  const buffer = tree.read('package.json');
  if (!buffer) return false;
  const pkg = JSON.parse(buffer.toString());
  return Boolean(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]);
}

/**
 * Adds the given npm dependencies to `package.json`, never touching an entry the app already has
 * (in `dependencies` or `devDependencies`). `names()` reports what the rule added.
 */
export function addDependenciesWithReport(deps: Record<string, string>): DependencyRule {
  let added: string[] = [];
  const rule: Rule = (tree: Tree, context: SchematicContext) => {
    added = [];
    if (!Object.keys(deps).length) return tree;
    const buffer = tree.read('package.json');
    if (!buffer) {
      context.logger.warn(
        `package.json not found. Install: ${Object.entries(deps)
          .map(([n, v]) => `${n}@${v}`)
          .join(', ')}`,
      );
      return tree;
    }
    const pkg = JSON.parse(buffer.toString());
    pkg.dependencies = pkg.dependencies ?? {};
    for (const [name, version] of Object.entries(deps)) {
      if (!pkg.dependencies[name] && !pkg.devDependencies?.[name]) {
        pkg.dependencies[name] = version;
        added.push(name);
      }
    }
    if (added.length) tree.overwrite('package.json', JSON.stringify(pkg, null, 2) + '\n');
    return tree;
  };
  return { rule, names: () => added };
}

/** Rule form of {@link addDependenciesWithReport}, for reuse by `ng-add`. */
export function addDependencies(deps: Record<string, string>): Rule {
  return addDependenciesWithReport(deps).rule;
}
