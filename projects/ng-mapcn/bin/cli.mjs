import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { createInterface } from 'node:readline/promises';
import { delimiter, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

const COMMANDS = ['init', 'add', 'list', 'help', 'version'];
const BOOLEAN_FLAGS = new Set(['all', 'overwrite', 'skipInstall', 'yes']);
const STRING_FLAGS = new Set(['path', 'project', 'alias']);

const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

export function parseArgs(argv) {
  const options = {};
  const positionals = [];
  let command;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      command = 'help';
    } else if (arg === '-v' || arg === '--version') {
      command = 'version';
    } else if (arg === '-y') {
      options.yes = true;
    } else if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      const name = camel(eq === -1 ? arg.slice(2) : arg.slice(2, eq));
      const inline = eq === -1 ? undefined : arg.slice(eq + 1);
      if (BOOLEAN_FLAGS.has(name)) {
        options[name] = inline === undefined ? true : inline !== 'false';
      } else if (STRING_FLAGS.has(name)) {
        const value = inline ?? argv[++i];
        if (value === undefined || value.startsWith('--')) {
          throw new UsageError(`Missing value for --${name}.`);
        }
        options[name] = value;
      } else {
        throw new UsageError(`Unknown option: ${arg}`);
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      throw new UsageError(`Unknown option: ${arg}`);
    } else {
      positionals.push(arg);
    }
  }
  if (!command) {
    const first = positionals.shift();
    if (first === undefined) command = 'help';
    else if (COMMANDS.includes(first)) command = first;
    else throw new UsageError(`Unknown command: ${first}`);
  }
  const items = positionals.flatMap((p) => p.split(',')).filter(Boolean);
  return { command, items, options };
}

function detectPackageManager(cwd) {
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(cwd, 'bun.lockb')) || existsSync(join(cwd, 'bun.lock'))) return 'bun';
  return 'npm';
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * The copy-paste defaults and rules shared with the schematics (`schematics/utils/defaults.ts`,
 * compiled next to the collection), so the CLI and `ng add` / `ng g` read ng-mapcn.json, pick the
 * project and default the folder the same way.
 */
export function loadDefaults(collection) {
  return createRequire(collection)('./utils/defaults.js');
}

/**
 * `ng-mapcn.json` written by `init`, parsed with the schematics' rules, or null when there is
 * none. An invalid file throws `NgMapcnError` (with what to fix) instead of counting as missing.
 */
export function readConfig(cwd, defaults) {
  const file = join(cwd, defaults.CONFIG_FILE);
  return existsSync(file) ? defaults.parseConfig(readFileSync(file, 'utf8')) : null;
}

/**
 * Removes comments and trailing commas from JSONC (angular.json allows both), leaving strings
 * untouched.
 */
export function stripJsonc(text) {
  // Copies `source` outside strings through `onChar(source, i)`, which returns the text to emit
  // and the index of the last character it consumed.
  const pass = (source, onChar) => {
    let out = '';
    for (let i = 0; i < source.length; i++) {
      if (source[i] === '"') {
        let j = i + 1;
        while (j < source.length && source[j] !== '"') j += source[j] === '\\' ? 2 : 1;
        out += source.slice(i, j + 1);
        i = j;
      } else {
        const [emit, last] = onChar(source, i);
        out += emit;
        i = last;
      }
    }
    return out;
  };
  const withoutComments = pass(text, (s, i) => {
    if (s[i] === '/' && s[i + 1] === '/') {
      const end = s.indexOf('\n', i);
      return ['\n', end === -1 ? s.length : end];
    }
    if (s[i] === '/' && s[i + 1] === '*') {
      const end = s.indexOf('*/', i + 2);
      return [' ', end === -1 ? s.length : end + 1];
    }
    return [s[i], i];
  });
  return pass(withoutComments, (s, i) => {
    if (s[i] !== ',') return [s[i], i];
    let j = i + 1;
    while (j < s.length && /\s/.test(s[j])) j++;
    return [s[j] === '}' || s[j] === ']' ? '' : ',', i];
  });
}

/** angular.json projects (comments allowed), or {} when it cannot be read. */
function readProjects(cwd) {
  try {
    return JSON.parse(stripJsonc(readFileSync(join(cwd, 'angular.json'), 'utf8'))).projects ?? {};
  } catch {
    return {};
  }
}

/**
 * The questions `init` asks (shadcn/Zard style). `ask(question, fallback)` returns the answer, or
 * the fallback for an empty one. `fallbacks.path` and `fallbacks.aliasFor(path)` are what the
 * schematic would choose by itself; the alias default follows the folder just answered.
 */
export async function askInitOptions(ask, fallbacks) {
  const path = await ask('Where should the map components be copied?', fallbacks.path);
  const alias = await ask('Import alias for them?', fallbacks.aliasFor(path));
  return { path, alias };
}

/** Terminal prompt for {@link askInitOptions}; null when stdin is not interactive. */
function terminalAsk() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return null;
  return async (question, fallback) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = (await rl.question(`${question} (${fallback}) `)).trim();
      return answer || fallback;
    } finally {
      rl.close();
    }
  };
}

function usage(registry, defaults) {
  const { CONFIG_FILE, DEFAULT_PATH, DEFAULT_ALIAS } = defaults;
  const names = Object.keys(registry.items);
  return [
    'Usage: ng-mapcn <command> [options]',
    '',
    'Commands:',
    '  init                 Set up maplibre-gl, the import alias and copy the core map',
    '  add <items...>       Copy components (and their dependencies) into your app',
    '  list                 List available components (✓ = installed)',
    '',
    'Options:',
    `  --path <dir>         Target directory (init default: ${DEFAULT_PATH}; then ${CONFIG_FILE})`,
    `  --alias <import>     Import alias for it, added to tsconfig paths (init default: ${DEFAULT_ALIAS})`,
    '  --project <name>     Angular project (init)',
    '  -y, --yes            Do not ask, use the defaults (init)',
    '  --all                Every component except draw',
    '  --overwrite          Replace existing files (add)',
    '  --skip-install       Do not install packages',
    '  -h, --help           Show this help',
    '  -v, --version        Show the version',
    '',
    `Components: ${names.join(', ')}`,
  ].join('\n');
}

/** The `node_modules` directory that contains the package whose `package.json` is `pkgJson`. */
function nodeModulesRootOf(pkgJson) {
  const real = realpathSync(pkgJson);
  const at = real.lastIndexOf(`${sep}node_modules${sep}`);
  return at === -1 ? undefined : real.slice(0, at + `${sep}node_modules`.length);
}

/**
 * Loads the workspace's own devkit. It is a transitive dependency of @angular/cli, so under
 * non-hoisted layouts (pnpm) it is only reachable through @angular/cli. Returns the modules plus the
 * node_modules directories the bundled schematics need on NODE_PATH: the one holding
 * @angular-devkit/schematics and the one holding @angular/cli (beside @schematics/angular).
 */
export function resolveDevkit(cwd) {
  const req = createRequire(join(cwd, 'package.json'));
  let cliReq = req;
  const nodeModulesDirs = [];
  const addDir = (dir) => {
    if (dir && !nodeModulesDirs.includes(dir)) nodeModulesDirs.push(dir);
  };
  let cliDir;
  try {
    const cliPkg = req.resolve('@angular/cli/package.json');
    cliReq = createRequire(cliPkg);
    cliDir = nodeModulesRootOf(cliPkg);
  } catch {
    // @angular/cli is not a direct dependency: resolve from the workspace.
  }
  const toolsPath = cliReq.resolve('@angular-devkit/schematics/tools');
  const marker = `${sep}node_modules${sep}@angular-devkit${sep}`;
  const at = toolsPath.lastIndexOf(marker);
  if (at === -1) throw new Error('Unexpected @angular-devkit/schematics location');
  // First the folder of the devkit the NodeWorkflow below comes from, so the bundled schematics
  // load that same copy (not another version hoisted elsewhere); then @angular/cli's folder.
  addDir(toolsPath.slice(0, at + `${sep}node_modules`.length));
  addDir(cliDir);
  try {
    addDir(nodeModulesRootOf(cliReq.resolve('@schematics/angular/package.json')));
  } catch {
    // optional: usually beside @angular/cli, already added.
  }
  const load = (id) => {
    try {
      return cliReq(id);
    } catch {
      return req(id);
    }
  };
  return {
    NodeWorkflow: cliReq('@angular-devkit/schematics/tools').NodeWorkflow,
    lastValueFrom: load('rxjs').lastValueFrom,
    logging: load('@angular-devkit/core').logging,
    nodeModulesDirs,
  };
}

export async function main(argv, env = {}) {
  const cwd = env.cwd ?? process.cwd();
  const out = env.stdout ?? ((s) => process.stdout.write(s + '\n'));
  const err = env.stderr ?? ((s) => process.stderr.write(s + '\n'));
  const collection =
    env.collection ?? fileURLToPath(new URL('../schematics/collection.json', import.meta.url));
  const registryFile = join(dirname(collection), 'registry.json');
  const pkgFile = fileURLToPath(new URL('../package.json', import.meta.url));

  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (e) {
    if (e instanceof UsageError) {
      err(e.message);
      err('Run "ng-mapcn --help" for usage.');
      return 1;
    }
    throw e;
  }
  const { command, items, options } = parsed;

  if (command === 'version') {
    out(readJson(pkgFile).version);
    return 0;
  }
  const registry = readJson(registryFile);
  const defaults = loadDefaults(collection);
  if (command === 'help') {
    out(usage(registry, defaults));
    return 0;
  }

  if (!existsSync(join(cwd, 'angular.json'))) {
    err(
      `Run this command from the root of an Angular workspace (angular.json not found in ${cwd}).`,
    );
    return 1;
  }
  let config;
  try {
    config = readConfig(cwd, defaults);
  } catch (e) {
    err(e?.message ?? String(e));
    return 1;
  }
  // A copy an earlier version of `ng add` made, before ng-mapcn.json existed: adopt it.
  const legacyExists = existsSync(join(cwd, defaults.LEGACY_PATH, defaults.CORE_MARKER));
  const legacy = !config && legacyExists ? defaults.LEGACY_PATH : undefined;

  if (command === 'init') {
    // Same project, folder and alias the schematic would pick, so the questions show them.
    const projects = readProjects(cwd);
    let choice;
    try {
      choice = defaults.pickProject(projects, options.project, config?.project);
    } catch (e) {
      err(e?.message ?? String(e));
      return 1;
    }
    if (choice.warning) err(choice.warning);
    if (choice.name) options.project = choice.name;
    if (!options.yes && options.path === undefined && options.alias === undefined) {
      const ask = env.ask === undefined ? terminalAsk() : env.ask;
      if (ask) {
        const fallbacks = defaults.initTarget({
          saved: config,
          legacyExists,
          projectName: choice.name,
          project: projects[choice.name],
        });
        Object.assign(options, await askInitOptions(ask, fallbacks));
      }
    }
  } else if (options.path === undefined && !config) {
    if (!legacy) {
      err(defaults.NOT_INITIALIZED);
      return 1;
    }
    err(
      `Using the copy in ${legacy}, made by an earlier version. Run "npx ng-mapcn@latest init" ` +
        `to save it in ${defaults.CONFIG_FILE} and map an import alias for it.`,
    );
  }
  const target = options.path ?? config?.path ?? legacy;

  if (command === 'list') {
    for (const item of Object.values(registry.items)) {
      const installed = item.files.every((f) => existsSync(join(cwd, target, f)));
      out(`${installed ? '✓' : ' '} ${item.name}  ${item.description ?? ''}`.trimEnd());
    }
    return 0;
  }

  if (command === 'add' && items.length === 0 && !options.all) {
    err('Specify at least one component, or pass --all.');
    err('');
    err(usage(registry, defaults));
    return 1;
  }

  let NodeWorkflow, lastValueFrom, logging;
  try {
    const devkit = resolveDevkit(cwd);
    ({ NodeWorkflow, lastValueFrom, logging } = devkit);
    // The bundled schematics `require('@angular-devkit/schematics')` and `@schematics/angular` from
    // wherever this package lives (the npx cache), where they are not installed: expose the
    // workspace's node_modules directories to them.
    const current = (process.env.NODE_PATH ?? '').split(delimiter).filter(Boolean);
    const extra = devkit.nodeModulesDirs.filter((d) => !current.includes(d));
    if (extra.length) {
      process.env.NODE_PATH = [...extra, ...current].join(delimiter);
      Module._initPaths();
    }
  } catch (e) {
    if (e?.code === 'MODULE_NOT_FOUND' && /@angular-devkit\/schematics/.test(e.message ?? '')) {
      err(
        'Could not find @angular-devkit/schematics. Run "npm install" in your Angular workspace first.',
      );
    } else {
      err(`Could not load the Angular devkit: ${e?.message ?? e}`);
    }
    return 1;
  }

  const workflow = new NodeWorkflow(cwd, {
    force: false,
    dryRun: false,
    packageManager: detectPackageManager(cwd),
    resolvePaths: [cwd],
    schemaValidation: true,
  });
  let failed = false;
  const strip = (p) => String(p ?? '').replace(/^\//, '');
  workflow.reporter.subscribe((e) => {
    if (e.kind === 'create') out(`CREATE ${strip(e.path)}`);
    else if (e.kind === 'update') out(`UPDATE ${strip(e.path)}`);
    else if (e.kind === 'delete') out(`DELETE ${strip(e.path)}`);
    else if (e.kind === 'rename') out(`RENAME ${strip(e.path)} => ${strip(e.to)}`);
    else if (e.kind === 'error') {
      failed = true;
      err(`ERROR ${strip(e.path)}: ${e.description ?? ''}`);
    }
  });
  const logger = new logging.Logger('ng-mapcn');
  logger.subscribe((entry) => {
    if (entry.level === 'warn' || entry.level === 'error' || entry.level === 'fatal') {
      err(entry.message);
    } else {
      out(entry.message);
    }
  });

  const schematic = command === 'init' ? 'ng-add' : 'add';
  const schematicOptions =
    command === 'init'
      ? {
          project: options.project,
          path: options.path,
          alias: options.alias,
          all: options.all,
          skipInstall: options.skipInstall,
        }
      : {
          components: items,
          all: options.all,
          overwrite: options.overwrite,
          path: target,
          skipInstall: options.skipInstall,
        };
  for (const k of Object.keys(schematicOptions)) {
    if (schematicOptions[k] === undefined) delete schematicOptions[k];
  }

  try {
    await lastValueFrom(
      workflow.execute({
        collection,
        schematic,
        options: schematicOptions,
        allowPrivate: false,
        logger,
      }),
      { defaultValue: undefined },
    );
  } catch (e) {
    err(e?.message ?? String(e));
    return 1;
  }
  return failed ? 1 : 0;
}
