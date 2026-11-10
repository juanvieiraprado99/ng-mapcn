import { SchematicsException, type Tree } from '@angular-devkit/schematics';

import {
  CONFIG_FILE,
  CORE_MARKER,
  defaultPathFor,
  LEGACY_PATH,
  type NgMapcnConfig,
  parseConfig,
  type ProjectInfo,
} from './defaults';
import { joinPath } from './path';

export {
  CONFIG_FILE,
  DEFAULT_ALIAS,
  DEFAULT_PATH,
  defaultAliasFor,
  defaultPathFor,
  LEGACY_PATH,
  type NgMapcnConfig,
  parseConfig,
  pickProject,
  type ProjectInfo,
} from './defaults';

/** The saved config, or null when `init` has not run (or the file is not valid). */
export function readConfig(tree: Tree): NgMapcnConfig | null {
  const buffer = tree.read(CONFIG_FILE);
  return buffer ? parseConfig(buffer.toString()) : null;
}

export function writeConfig(tree: Tree, config: NgMapcnConfig): void {
  const content = `${JSON.stringify(
    {
      path: config.path,
      alias: config.alias,
      ...(config.project ? { project: config.project } : {}),
    },
    null,
    2,
  )}\n`;
  if (!tree.exists(CONFIG_FILE)) tree.create(CONFIG_FILE, content);
  else if (tree.read(CONFIG_FILE)?.toString() !== content) tree.overwrite(CONFIG_FILE, content);
}

/**
 * The folder to use when no `--path` is given: the saved one, else the folder an earlier version
 * of `ng add` copied to (so an existing copy is adopted instead of copied a second time), else the
 * default. `legacy` says which case applied.
 */
export function defaultTarget(
  tree: Tree,
  project?: ProjectInfo,
): { path: string; legacy: boolean } {
  const saved = readConfig(tree);
  if (saved) return { path: saved.path, legacy: false };
  if (tree.exists(joinPath(LEGACY_PATH, CORE_MARKER))) return { path: LEGACY_PATH, legacy: true };
  return { path: defaultPathFor(project), legacy: false };
}

/** A blank option (an empty answer to a prompt) counts as not given. */
export function given(value: string | undefined): string | undefined {
  return value?.trim() ? value : undefined;
}

/**
 * Validates an import alias: a bare specifier without quotes, spaces or a trailing `/*`
 * (`@/shared/components/map`, `@maps`, `~/map`).
 */
export function normalizeAlias(alias: string): string {
  const normalized = alias.trim().replace(/\/+$/, '');
  if (!normalized) throw new SchematicsException('The --alias option must not be empty.');
  if (normalized.endsWith('*')) {
    throw new SchematicsException(
      `The --alias option is the import itself, without "/*": got "${alias}".`,
    );
  }
  if (/[\s'"`;\\]/.test(normalized) || normalized.startsWith('.') || normalized.startsWith('/')) {
    throw new SchematicsException(
      `The --alias option is not a valid import specifier: "${alias}".`,
    );
  }
  return normalized;
}
