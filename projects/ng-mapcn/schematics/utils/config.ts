import { SchematicsException, type Tree } from '@angular-devkit/schematics';

import {
  CONFIG_FILE,
  CORE_MARKER,
  LEGACY_PATH,
  type NgMapcnConfig,
  NgMapcnError,
  NOT_INITIALIZED,
  parseConfig,
} from './defaults';
import { joinPath } from './path';

export {
  CONFIG_FILE,
  DEFAULT_ALIAS,
  DEFAULT_PATH,
  defaultAliasFor,
  defaultPathFor,
  initTarget,
  LEGACY_PATH,
  type NgMapcnConfig,
  NgMapcnError,
  parseConfig,
  pickProject,
  type ProjectInfo,
} from './defaults';

/**
 * The saved config, or null when `init` has not run. An invalid file throws (with what to fix):
 * it is never treated as missing, which would copy elsewhere or overwrite it.
 */
export function readConfig(tree: Tree): NgMapcnConfig | null {
  const buffer = tree.read(CONFIG_FILE);
  return buffer ? parseConfig(buffer.toString()) : null;
}

/** Whether an earlier version of `ng add` left a copy in LEGACY_PATH. */
export function hasLegacyCopy(tree: Tree): boolean {
  return tree.exists(joinPath(LEGACY_PATH, CORE_MARKER));
}

/**
 * Where `add` copies when no `--path` is given: the saved folder, else an earlier copy (adopted,
 * `legacy: true`). Without either, `init` has not run: throws, as the CLI does.
 */
export function addTarget(tree: Tree): { path: string; legacy: boolean } {
  const saved = readConfig(tree);
  if (saved) return { path: saved.path, legacy: false };
  if (hasLegacyCopy(tree)) return { path: LEGACY_PATH, legacy: true };
  throw new NgMapcnError(NOT_INITIALIZED);
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
