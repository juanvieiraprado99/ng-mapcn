import type { SchematicContext, Tree } from '@angular-devkit/schematics';
import { JSONFile } from '@schematics/angular/utility/json-file';

import { dirnamePath, joinPath, relativePath } from './path';

type Paths = Record<string, string[]>;

/** How {@link ensureAlias} made the alias resolve in one tsconfig. */
export type AliasChange = 'present' | 'wildcard' | 'exact';

/**
 * Makes `alias` (and `alias/...`) resolve to the workspace folder `path` through tsconfig `paths`,
 * the way Zard UI's init does: an existing mapping that already covers it is kept, an app without
 * an `@/*` mapping gets `"@/*": ["./<base>/*"]` (when the alias suffix matches the end of `path`),
 * anything else gets exact `"<alias>"` / `"<alias>/*"` entries. Never writes `baseUrl`.
 *
 * Applied to the workspace `tsconfig.json` and to each of `projectTsconfigs` that declares its own
 * `compilerOptions.paths` (which replaces the inherited ones). Returns the change per file.
 */
export function ensureAlias(
  tree: Tree,
  context: SchematicContext,
  options: { path: string; alias: string; projectTsconfigs?: string[] },
): Record<string, AliasChange> {
  const changes: Record<string, AliasChange> = {};
  const files = ['tsconfig.json'];
  for (const candidate of options.projectTsconfigs ?? []) {
    const file = joinPath(candidate);
    if (file !== 'tsconfig.json' && !files.includes(file) && ownPaths(tree, file)) {
      files.push(file);
    }
  }
  if (!tree.exists('tsconfig.json')) {
    context.logger.warn(
      `tsconfig.json not found: map "${options.alias}" to "./${options.path}" in your ` +
        'compilerOptions.paths.',
    );
    files.shift();
  }

  for (const file of files) {
    const change = ensureAliasIn(tree, file, options.path, options.alias);
    changes[file] = change;
    if (change === 'wildcard') {
      context.logger.info(`${file}: added "@/*" to compilerOptions.paths.`);
    } else if (change === 'exact') {
      context.logger.info(
        `${file}: added "${options.alias}" and "${options.alias}/*" to compilerOptions.paths.`,
      );
    }
  }
  return changes;
}

function ownPaths(tree: Tree, file: string): Paths | undefined {
  if (!tree.exists(file)) return undefined;
  try {
    const paths = new JSONFile(tree, file).get(['compilerOptions', 'paths']);
    return paths && typeof paths === 'object' && !Array.isArray(paths)
      ? (paths as Paths)
      : undefined;
  } catch {
    return undefined;
  }
}

function ensureAliasIn(tree: Tree, file: string, path: string, alias: string): AliasChange {
  const json = new JSONFile(tree, file);
  const paths = ownPaths(tree, file) ?? {};
  const baseUrl = json.get(['compilerOptions', 'baseUrl']);
  // `paths` targets are relative to `baseUrl` when set, else to the tsconfig's folder.
  const base = joinPath(dirnamePath(file), typeof baseUrl === 'string' ? baseUrl : '');

  if (resolvesTo(paths, base, alias, path)) return 'present';

  // `./x` relative to the folder the targets are resolved from.
  const toTarget = (workspacePath: string) => relativePath(base, workspacePath);

  if (alias.startsWith('@/') && !('@/*' in paths)) {
    const suffix = alias.slice(2);
    if (path === suffix || path.endsWith(`/${suffix}`)) {
      const root = path.slice(0, path.length - suffix.length).replace(/\/$/, '');
      json.modify(
        ['compilerOptions', 'paths', '@/*'],
        [`${toTarget(root)}/*`.replace(/^\.\/\//, './')],
      );
      return 'wildcard';
    }
  }

  json.modify(['compilerOptions', 'paths', alias], [toTarget(path)]);
  json.modify(['compilerOptions', 'paths', `${alias}/*`], [`${toTarget(path)}/*`]);
  return 'exact';
}

/** Whether `paths` (targets relative to `base`) maps `alias` to the folder `path`. */
function resolvesTo(paths: Paths, base: string, alias: string, path: string): boolean {
  const target = joinPath(path);
  for (const [key, targets] of Object.entries(paths)) {
    if (!Array.isArray(targets) || !targets.length) continue;
    let mapped: string | undefined;
    if (key === alias) {
      mapped = targets[0];
    } else if (key.endsWith('*')) {
      const prefix = key.slice(0, -1);
      if (alias.startsWith(prefix)) mapped = targets[0].replace('*', alias.slice(prefix.length));
    }
    if (mapped === undefined) continue;
    const resolved = joinPath(base, mapped).replace(/\/index(\.ts)?$/, '');
    if (normalizeDots(resolved) === target) return true;
  }
  return false;
}

/** Resolves `..` segments of a workspace-relative path. */
function normalizeDots(path: string): string {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (part === '..') out.pop();
    else if (part && part !== '.') out.push(part);
  }
  return out.join('/');
}
