import { SchematicsException, type Tree } from '@angular-devkit/schematics';

/** Workspace-root file that remembers where `init` copied the components. */
export const CONFIG_FILE = 'ng-mapcn.json';
export const DEFAULT_PATH = 'src/app/shared/components/map';
export const DEFAULT_ALIAS = '@/shared/components/map';

export interface NgMapcnConfig {
  /** Folder (relative to the workspace root) holding the copied components. */
  path: string;
  /** Import specifier that resolves to `path` (tsconfig `paths`), e.g. `@/shared/components/map`. */
  alias: string;
  /** Angular project `init` set up. */
  project?: string;
}

/** The saved config, or null when `init` has not run (or the file is not valid JSON). */
export function readConfig(tree: Tree): NgMapcnConfig | null {
  const buffer = tree.read(CONFIG_FILE);
  if (!buffer) return null;
  try {
    const parsed = JSON.parse(buffer.toString()) as Partial<NgMapcnConfig>;
    if (typeof parsed.path !== 'string' || typeof parsed.alias !== 'string') return null;
    return {
      path: parsed.path,
      alias: parsed.alias,
      ...(typeof parsed.project === 'string' ? { project: parsed.project } : {}),
    };
  } catch {
    return null;
  }
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
