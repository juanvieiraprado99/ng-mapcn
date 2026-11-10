import { existsSync, readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

const COMMANDS = ['init', 'add', 'list', 'help', 'version'];
const BOOLEAN_FLAGS = new Set(['all', 'overwrite', 'skipInstall']);
const STRING_FLAGS = new Set(['path', 'project']);
const DEFAULT_PATH = 'src/app/components/ui/map';

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

function usage(registry) {
  const names = Object.keys(registry.items);
  return [
    'Usage: ng-mapcn <command> [options]',
    '',
    'Commands:',
    '  init                 Set up maplibre-gl and copy the core map',
    '  add <items...>       Copy components (and their dependencies) into your app',
    '  list                 List available components (✓ = installed)',
    '',
    'Options:',
    `  --path <dir>         Target directory (default: ${DEFAULT_PATH})`,
    '  --project <name>     Angular project (init)',
    '  --all                Every component except draw',
    '  --overwrite          Replace existing files (add)',
    '  --skip-install       Do not install packages',
    '  -h, --help           Show this help',
    '  -v, --version        Show the version',
    '',
    `Components: ${names.join(', ')}`,
  ].join('\n');
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
  if (command === 'help') {
    out(usage(registry));
    return 0;
  }

  if (!existsSync(join(cwd, 'angular.json'))) {
    err(
      `Run this command from the root of an Angular workspace (angular.json not found in ${cwd}).`,
    );
    return 1;
  }
  const target = options.path ?? DEFAULT_PATH;

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
    err(usage(registry));
    return 1;
  }

  // The bundled schematics `require('@angular-devkit/schematics')` from wherever this package lives
  // (the npx cache), where it is not installed. Make the workspace's node_modules visible to them.
  const nodePaths = [join(cwd, 'node_modules'), process.env.NODE_PATH].filter(Boolean);
  process.env.NODE_PATH = nodePaths.join(delimiter);
  Module._initPaths();

  let NodeWorkflow, lastValueFrom, logging;
  try {
    const req = createRequire(join(cwd, 'package.json'));
    ({ NodeWorkflow } = req('@angular-devkit/schematics/tools'));
    ({ lastValueFrom } = req('rxjs'));
    ({ logging } = req('@angular-devkit/core'));
  } catch {
    err(
      'Could not find @angular-devkit/schematics. Run "npm install" in your Angular workspace first.',
    );
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
          path: target,
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
