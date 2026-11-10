/**
 * Copy-paste defaults shared by the schematics and the CLI (bin/cli.mjs loads the compiled copy
 * from dist, so both read the same values). No imports: the CLI requires it before the devkit.
 */

/** Workspace-root file that remembers where `init` copied the components. */
export const CONFIG_FILE = 'ng-mapcn.json';
export const DEFAULT_PATH = 'src/app/shared/components/map';
export const DEFAULT_ALIAS = '@/shared/components/map';
/** Where `ng add ng-mapcn` copied everything before ng-mapcn.json existed (22.0.0-beta.9 and earlier). */
export const LEGACY_PATH = 'src/app/components/ui/map';
/** A file every copy has: its presence marks a folder as an ng-mapcn copy. */
export const CORE_MARKER = 'components/map/map.component.ts';

/** What the defaults need to know about an angular.json project. */
export interface ProjectInfo {
  projectType?: string;
  root?: string;
  sourceRoot?: string;
}

export interface ProjectChoice {
  name: string | undefined;
  /** Set when the choice was a guess the user should confirm with --project. */
  warning?: string;
}

/**
 * The project `init` sets up: the requested one, else the one saved in ng-mapcn.json (if it still
 * exists), else the only application, else the first application with a warning (several apps),
 * else the first project.
 */
export function pickProject(
  projects: Record<string, ProjectInfo>,
  requested?: string,
  saved?: string,
): ProjectChoice {
  if (requested) return { name: requested };
  const names = Object.keys(projects);
  if (saved && names.includes(saved)) return { name: saved };
  const apps = names.filter((name) => projects[name].projectType === 'application');
  if (apps.length === 1) return { name: apps[0] };
  if (apps.length > 1) {
    return {
      name: apps[0],
      warning:
        `Several applications in angular.json (${apps.join(', ')}): set up "${apps[0]}". ` +
        'Pass --project <name> to choose another.',
    };
  }
  return { name: names[0] };
}

/** Default copy folder for a project: `<sourceRoot>/app/shared/components/map`. */
export function defaultPathFor(project: ProjectInfo | undefined): string {
  const sourceRoot = project?.sourceRoot ?? [project?.root, 'src'].filter((part) => part).join('/');
  return [sourceRoot.replace(/^\.?\/+|\/+$/g, ''), 'app/shared/components/map']
    .filter((part) => part)
    .join('/');
}

/**
 * Default alias for a copy folder: `@/<path inside the project's app folder>`, matching the
 * `"@/*": ["./<sourceRoot>/app/*"]` mapping init adds (`@/shared/components/map` for the default
 * folder, `@/components/ui/map` for an earlier copy), else {@link DEFAULT_ALIAS}.
 */
export function defaultAliasFor(path: string, project?: ProjectInfo): string {
  const appDir = defaultPathFor(project).slice(0, -'/shared/components/map'.length);
  const normalized = path.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
  return normalized.startsWith(`${appDir}/`)
    ? `@/${normalized.slice(appDir.length + 1)}`
    : DEFAULT_ALIAS;
}

export interface NgMapcnConfig {
  /** Folder (relative to the workspace root) holding the copied components. */
  path: string;
  /** Import specifier that resolves to `path` (tsconfig `paths`), e.g. `@/shared/components/map`. */
  alias: string;
  /** Angular project `init` set up. */
  project?: string;
}

/**
 * Parses ng-mapcn.json. A config needs `path`; `alias` falls back to the default (a hand-written
 * file with only `path` still works), `project` is optional. Null when it is not valid.
 */
export function parseConfig(text: string): NgMapcnConfig | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const { path, alias, project } = parsed as Record<string, unknown>;
  if (typeof path !== 'string' || !path.trim()) return null;
  return {
    path,
    alias: typeof alias === 'string' && alias.trim() ? alias : DEFAULT_ALIAS,
    ...(typeof project === 'string' && project ? { project } : {}),
  };
}
