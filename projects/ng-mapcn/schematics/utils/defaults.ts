/**
 * Copy-paste defaults and rules shared by the schematics and the CLI (bin/cli.mjs loads the
 * compiled copy from dist, so both decide the same way). No imports: the CLI requires it before
 * the devkit.
 */

/** Workspace-root file that remembers where `init` copied the components. */
export const CONFIG_FILE = 'ng-mapcn.json';
export const DEFAULT_PATH = 'src/app/shared/components/map';
export const DEFAULT_ALIAS = '@/shared/components/map';
/** Where `ng add ng-mapcn` copied everything before ng-mapcn.json existed (22.0.0-beta.9 and earlier). */
export const LEGACY_PATH = 'src/app/components/ui/map';
/** A file every copy has: its presence marks a folder as an ng-mapcn copy. */
export const CORE_MARKER = 'components/map/map.component.ts';

/** A problem the user has to fix by hand (bad ng-mapcn.json, unknown project, no init yet). */
export class NgMapcnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NgMapcnError';
  }
}

export const NOT_INITIALIZED =
  `${CONFIG_FILE} not found. Run "npx ng-mapcn@latest init" (or "ng add ng-mapcn") first, ` +
  'or pass --path <dir>.';

/** Printed when `add` uses an earlier copy because ng-mapcn.json does not exist yet. */
export const LEGACY_ADOPTED =
  `Using the copy in ${LEGACY_PATH}, made by an earlier version. Run "npx ng-mapcn@latest init" ` +
  `(or "ng add ng-mapcn") to save it in ${CONFIG_FILE} and map an import alias for it.`;

/** A workspace-relative path in one spelling: POSIX separators, no leading `./`, no trailing `/`. */
export function samePath(a: string, b: string): boolean {
  const clean = (p: string) =>
    p
      .trim()
      .replace(/\\/g, '/')
      .replace(/^(\.\/)+/, '')
      .replace(/\/+$/, '');
  return clean(a) === clean(b);
}

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
 * The project `init` sets up: the requested one (it must exist), else the one saved in
 * ng-mapcn.json (if it still exists), else the only application, else the first application with
 * a warning (several apps), else the first project.
 */
export function pickProject(
  projects: Record<string, ProjectInfo>,
  requested?: string,
  saved?: string,
): ProjectChoice {
  const names = Object.keys(projects);
  if (requested) {
    if (!names.includes(requested)) {
      throw new NgMapcnError(
        `Project "${requested}" not found in angular.json. Projects: ${names.join(', ') || 'none'}.`,
      );
    }
    return { name: requested };
  }
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
 * file with only `path` still works), `project` is optional. Throws {@link NgMapcnError} when the
 * file is not valid, so a typo never silently drops the user's folder or alias.
 */
export function parseConfig(text: string): NgMapcnConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new NgMapcnError(
      `${CONFIG_FILE} is not valid JSON (${(error as Error).message}). Fix it or delete it and ` +
        'run init again.',
    );
  }
  const record = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  const { path, alias, project } = (record ?? {}) as Record<string, unknown>;
  if (typeof path !== 'string' || !path.trim()) {
    throw new NgMapcnError(`${CONFIG_FILE} needs a "path": the folder the components are in.`);
  }
  return {
    path,
    alias: typeof alias === 'string' && alias.trim() ? alias : DEFAULT_ALIAS,
    ...(typeof project === 'string' && project ? { project } : {}),
  };
}

/** Folder and alias `init` would use with no `--path`/`--alias`. */
export interface InitTarget {
  path: string;
  alias: string;
  /** The folder is an earlier copy (LEGACY_PATH) being adopted. */
  legacy: boolean;
}

/**
 * The folder and alias for `init` when none is given: the saved ones while the project is the
 * saved one (another project gets its own defaults), else an earlier copy in LEGACY_PATH, else
 * `<sourceRoot>/app/shared/components/map`. `aliasFor` gives the alias for another folder.
 */
export function initTarget(options: {
  saved: NgMapcnConfig | null;
  legacyExists: boolean;
  projectName: string | undefined;
  project: ProjectInfo | undefined;
}): InitTarget & { aliasFor(path: string): string } {
  const { saved, legacyExists, projectName, project } = options;
  const savedApplies = !!saved && (!saved.project || !projectName || saved.project === projectName);
  const aliasFor = (path: string) =>
    savedApplies && saved && samePath(saved.path, path)
      ? saved.alias
      : defaultAliasFor(path, project);
  if (savedApplies && saved)
    return { path: saved.path, alias: saved.alias, legacy: false, aliasFor };
  if (!saved && legacyExists) {
    return { path: LEGACY_PATH, alias: aliasFor(LEGACY_PATH), legacy: true, aliasFor };
  }
  const path = defaultPathFor(project);
  return { path, alias: aliasFor(path), legacy: false, aliasFor };
}
