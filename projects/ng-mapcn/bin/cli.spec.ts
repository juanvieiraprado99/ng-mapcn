import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { Module } from 'node:module';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

// @ts-expect-error plain ESM module without type declarations
import { askInitOptions, main, parseArgs, resolveDevkit, stripJsonc, UsageError } from './cli.mjs';

// Runs against the compiled collection: `npm run test:schematics` builds it first.
const ROOT = process.cwd();
const COLLECTION = join(ROOT, 'dist', 'ng-mapcn', 'schematics', 'collection.json');
const TMP = join(ROOT, 'tmp', 'cli');
const MAPLIBRE_CSS = 'node_modules/maplibre-gl/dist/maplibre-gl.css';
const TARGET = 'src/app/shared/components/map';
const ALIAS = '@/shared/components/map';

function workspace(name: string, { empty = false } = {}): string {
  const dir = join(TMP, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'src'), { recursive: true });
  if (empty) return dir;
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'app', dependencies: {} }));
  writeFileSync(
    join(dir, 'angular.json'),
    JSON.stringify({
      version: 1,
      projects: {
        app: {
          root: '',
          architect: {
            build: {
              builder: '@angular/build:application',
              options: { styles: ['src/styles.scss'] },
            },
          },
        },
      },
    }),
  );
  writeFileSync(join(dir, 'src', 'styles.scss'), 'body { margin: 0; }\n');
  writeFileSync(
    join(dir, 'tsconfig.json'),
    '/* To learn more about this file see: https://angular.dev/config/tsconfig. */\n' +
      '{\n  "compilerOptions": {\n    "strict": true\n  }\n}\n',
  );
  return dir;
}

/** A workspace where `init` already ran (ng-mapcn.json present), without running it. */
function initialized(name: string): string {
  const dir = workspace(name);
  writeFileSync(join(dir, 'ng-mapcn.json'), JSON.stringify({ path: TARGET, alias: ALIAS }));
  return dir;
}

type Ask = (question: string, fallback: string) => Promise<string>;

async function run(cwd: string, argv: string[], ask: Ask | null = null) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code: number = await main(argv, {
    cwd,
    ask,
    collection: COLLECTION,
    stdout: (s: string) => stdout.push(s),
    stderr: (s: string) => stderr.push(s),
  });
  return { code, out: stdout.join('\n'), err: stderr.join('\n') };
}

afterAll(() => rmSync(TMP, { recursive: true, force: true }));

describe('parseArgs', () => {
  it('parses positionals', () => {
    expect(parseArgs(['add', 'marker', 'route'])).toMatchObject({
      command: 'add',
      items: ['marker', 'route'],
    });
  });
  it('splits comma lists and reads flags', () => {
    expect(parseArgs(['add', 'marker,route', '--overwrite'])).toMatchObject({
      items: ['marker', 'route'],
      options: { overwrite: true },
    });
  });
  it('reads --flag=value and --flag value', () => {
    expect(parseArgs(['init', '--path=libs/ui/map']).options.path).toBe('libs/ui/map');
    expect(parseArgs(['init', '--path', 'libs/ui/map']).options.path).toBe('libs/ui/map');
  });
  it('accepts flags before the command and camel-cases kebab flags', () => {
    expect(parseArgs(['--skip-install', 'add', '--all'])).toMatchObject({
      command: 'add',
      options: { skipInstall: true, all: true },
    });
  });
  it('reads --alias, --yes and -y', () => {
    expect(parseArgs(['init', '--alias', '@maps', '--yes']).options).toMatchObject({
      alias: '@maps',
      yes: true,
    });
    expect(parseArgs(['init', '-y']).options.yes).toBe(true);
  });
  it('maps no command, -h and -v', () => {
    expect(parseArgs([]).command).toBe('help');
    expect(parseArgs(['-h']).command).toBe('help');
    expect(parseArgs(['--version']).command).toBe('version');
  });
  it('throws UsageError on unknown flags', () => {
    expect(() => parseArgs(['--nope'])).toThrow(UsageError);
  });
});

// The first run loads the devkit cold (several seconds on Windows).
describe('main', { timeout: 60_000 }, () => {
  it('init copies the core and sets up angular.json', async () => {
    const cwd = workspace('init');
    const { code } = await run(cwd, ['init', '--skip-install']);
    expect(code).toBe(0);
    expect(existsSync(join(cwd, TARGET, 'components/map/map.component.ts'))).toBe(true);
    const styles = JSON.parse(readFileSync(join(cwd, 'angular.json'), 'utf8')).projects.app
      .architect.build.options.styles;
    expect(styles).toContain(MAPLIBRE_CSS);
  });

  it('init saves ng-mapcn.json and maps the alias in tsconfig.json (comments kept)', async () => {
    const cwd = workspace('init-config');
    const { code, out } = await run(cwd, ['init', '--skip-install']);
    expect(code).toBe(0);
    expect(JSON.parse(readFileSync(join(cwd, 'ng-mapcn.json'), 'utf8'))).toEqual({
      path: TARGET,
      alias: ALIAS,
      project: 'app',
    });
    const tsconfig = readFileSync(join(cwd, 'tsconfig.json'), 'utf8');
    expect(tsconfig).toContain('/* To learn more about this file');
    expect(tsconfig).toContain('"@/*": [');
    expect(tsconfig).toContain('"./src/app/*"');
    expect(tsconfig).not.toContain('baseUrl');
    expect(out).toContain(`import { MapComponent } from '${ALIAS}';`);
  });

  it('init asks where to copy and which alias, then add and list use the answers', async () => {
    const cwd = workspace('init-ask');
    const questions: string[] = [];
    const answers = ['libs/maps', '@maps'];
    const ask: Ask = async (question) => {
      questions.push(question);
      return answers.shift()!;
    };
    expect((await run(cwd, ['init', '--skip-install'], ask)).code).toBe(0);
    expect(questions).toHaveLength(2);
    expect(existsSync(join(cwd, 'libs/maps/components/map/map.component.ts'))).toBe(true);
    const paths = readFileSync(join(cwd, 'tsconfig.json'), 'utf8');
    expect(paths).toContain('"@maps": [');
    expect(paths).toContain('"./libs/maps"');
    expect(paths).toContain('"@maps/*": [');

    expect((await run(cwd, ['add', 'scale', '--skip-install'])).code).toBe(0);
    expect(existsSync(join(cwd, 'libs/maps/components/map-scale/map-scale.component.ts'))).toBe(
      true,
    );
    expect(existsSync(join(cwd, TARGET))).toBe(false);
    const { out } = await run(cwd, ['list']);
    expect(out.split('\n').find((l) => l.includes('scale'))).toContain('✓');
  });

  it('init --yes and explicit flags skip the questions', async () => {
    let asked = 0;
    const ask: Ask = async (_q, fallback) => {
      asked++;
      return fallback;
    };
    expect((await run(workspace('init-yes'), ['init', '--yes', '--skip-install'], ask)).code).toBe(
      0,
    );
    expect(
      (await run(workspace('init-flag'), ['init', '--path', 'src/maps', '--skip-install'], ask))
        .code,
    ).toBe(0);
    expect(asked).toBe(0);
  });

  it('init offers the saved folder and alias as the defaults on a rerun', async () => {
    const cwd = initialized('init-rerun');
    writeFileSync(
      join(cwd, 'ng-mapcn.json'),
      JSON.stringify({ path: 'libs/maps', alias: '@maps' }),
    );
    const fallbacks: string[] = [];
    const ask: Ask = async (_q, fallback) => {
      fallbacks.push(fallback);
      return fallback;
    };
    expect((await run(cwd, ['init', '--skip-install'], ask)).code).toBe(0);
    expect(fallbacks).toEqual(['libs/maps', '@maps']);
    expect(existsSync(join(cwd, 'libs/maps/components/map/map.component.ts'))).toBe(true);
    expect(existsSync(join(cwd, TARGET))).toBe(false);
  });

  it('init sets up the application, not a library listed first', async () => {
    const cwd = workspace('init-app');
    const build = { builder: '@angular/build:application', options: { styles: [] } };
    writeFileSync(
      join(cwd, 'angular.json'),
      JSON.stringify({
        version: 1,
        projects: {
          ui: { projectType: 'library', root: 'projects/ui', architect: { build } },
          web: {
            projectType: 'application',
            root: 'projects/web',
            sourceRoot: 'projects/web/src',
            architect: { build },
          },
        },
      }),
    );
    const fallbacks: string[] = [];
    const ask: Ask = async (_q, fallback) => {
      fallbacks.push(fallback);
      return fallback;
    };
    expect((await run(cwd, ['init', '--skip-install'], ask)).code).toBe(0);
    expect(fallbacks[0]).toBe('projects/web/src/app/shared/components/map');
    const projects = JSON.parse(readFileSync(join(cwd, 'angular.json'), 'utf8')).projects;
    expect(projects.web.architect.build.options.styles).toContain(MAPLIBRE_CSS);
    expect(projects.ui.architect.build.options.styles).not.toContain(MAPLIBRE_CSS);
  });

  it('add reads an ng-mapcn.json that only has the path, like ng g ng-mapcn:add', async () => {
    const cwd = workspace('path-only');
    writeFileSync(join(cwd, 'ng-mapcn.json'), JSON.stringify({ path: 'libs/maps' }));
    expect((await run(cwd, ['add', 'scale', '--skip-install'])).code).toBe(0);
    expect(existsSync(join(cwd, 'libs/maps/components/map-scale/map-scale.component.ts'))).toBe(
      true,
    );
  });

  it('add adopts the folder an earlier version copied to when there is no ng-mapcn.json', async () => {
    const cwd = workspace('legacy');
    const legacy = 'src/app/components/ui/map';
    mkdirSync(join(cwd, legacy, 'components/map'), { recursive: true });
    writeFileSync(join(cwd, legacy, 'components/map/map.component.ts'), '// old copy');
    const { code, err } = await run(cwd, ['add', 'scale', '--skip-install']);
    expect(code).toBe(0);
    expect(err).toContain(`Using the copy in ${legacy}`);
    expect(existsSync(join(cwd, legacy, 'components/map-scale/map-scale.component.ts'))).toBe(true);
    expect(existsSync(join(cwd, TARGET))).toBe(false);
  });

  it('an invalid ng-mapcn.json is reported, not taken for a missing one, and not overwritten', async () => {
    const cwd = workspace('bad-config');
    const broken = '{ "path": "libs/maps", }';
    writeFileSync(join(cwd, 'ng-mapcn.json'), broken);
    for (const argv of [['add', 'marker'], ['list'], ['init', '--yes', '--skip-install']]) {
      const { code, err } = await run(cwd, argv);
      expect(code).toBe(1);
      expect(err).toContain('ng-mapcn.json is not valid JSON');
    }
    expect(readFileSync(join(cwd, 'ng-mapcn.json'), 'utf8')).toBe(broken);
  });

  it('init rejects components and --overwrite, which only add takes', async () => {
    const cwd = workspace('init-items');
    const items = await run(cwd, ['init', 'marker', 'route', '--skip-install']);
    expect(items.code).toBe(1);
    expect(items.err).toContain('npx ng-mapcn@latest add marker route');
    const overwrite = await run(cwd, ['init', '--overwrite', '--skip-install']);
    expect(overwrite.code).toBe(1);
    expect(overwrite.err).toContain('--overwrite');
    expect(existsSync(join(cwd, 'ng-mapcn.json'))).toBe(false);
  });

  it('init rejects an unknown --project, listing the projects', async () => {
    const { code, err } = await run(workspace('bad-project'), [
      'init',
      '--project',
      'nope',
      '--skip-install',
    ]);
    expect(code).toBe(1);
    expect(err).toContain('Project "nope" not found in angular.json. Projects: app.');
  });

  it('init reads an angular.json with comments to offer the app folder', async () => {
    const cwd = workspace('jsonc');
    const build = { builder: '@angular/build:application', options: { styles: [] } };
    const json = JSON.stringify(
      {
        version: 1,
        projects: {
          web: { projectType: 'application', root: 'projects/web', architect: { build } },
        },
      },
      null,
      2,
    );
    writeFileSync(
      join(cwd, 'angular.json'),
      `// workspace\n${json.replace('"version": 1,', '"version": 1, /* v1 */')}\n`,
    );
    const fallbacks: string[] = [];
    const ask: Ask = async (_q, fallback) => {
      fallbacks.push(fallback);
      return fallback;
    };
    expect((await run(cwd, ['init', '--skip-install'], ask)).code).toBe(0);
    expect(fallbacks[0]).toBe('projects/web/src/app/shared/components/map');
  });

  it('add and list without ng-mapcn.json ask to run init first', async () => {
    const cwd = workspace('no-config');
    for (const argv of [['add', 'marker'], ['list']]) {
      const { code, err } = await run(cwd, argv);
      expect(code).toBe(1);
      expect(err).toContain('ng-mapcn.json not found');
      expect(err).toContain('init');
    }
  });

  it('add copies a component after init', async () => {
    const cwd = workspace('add');
    await run(cwd, ['init', '--skip-install']);
    const { code, out } = await run(cwd, ['add', 'marker', '--skip-install']);
    expect(code).toBe(0);
    expect(out).toContain('CREATE');
    expect(existsSync(join(cwd, TARGET, 'components/map-marker/map-marker.component.ts'))).toBe(
      true,
    );
    expect(readFileSync(join(cwd, TARGET, 'index.ts'), 'utf8')).toContain('map-marker');
  });

  it('explains a missing devkit', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ng-mapcn-nodevkit-'));
    // Earlier tests leave the repo's devkit on NODE_PATH: start from a clean resolution path.
    const savedNodePath = process.env.NODE_PATH;
    delete process.env.NODE_PATH;
    Module._initPaths();
    try {
      writeFileSync(join(dir, 'package.json'), '{}');
      writeFileSync(join(dir, 'angular.json'), '{"version":1,"projects":{}}');
      const missing = await run(dir, ['init', '--skip-install']);
      expect(missing.code).toBe(1);
      expect(missing.err).toContain('Could not find @angular-devkit/schematics');
    } finally {
      if (savedNodePath !== undefined) process.env.NODE_PATH = savedNodePath;
      Module._initPaths();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('add without items prints usage', async () => {
    const cwd = initialized('add-usage');
    const { code, err } = await run(cwd, ['add']);
    expect(code).toBe(1);
    expect(err).toContain('marker');
  });

  it('fails outside an Angular workspace root', async () => {
    const cwd = workspace('outside', { empty: true });
    rmSync(join(cwd, 'src'), { recursive: true });
    const { code, err } = await run(cwd, ['init', '--skip-install']);
    expect(code).toBe(1);
    expect(err).toContain('Run this command from the root of an Angular workspace');
    expect(readdirSync(cwd)).toEqual([]);
  });

  it('list with an empty target shows no check marks', async () => {
    const cwd = initialized('list-empty');
    const { code, out } = await run(cwd, ['list']);
    expect(code).toBe(0);
    expect(out).toContain('core');
    expect(out).not.toContain('✓');
  });

  it('list marks installed items', async () => {
    const cwd = workspace('list-installed');
    await run(cwd, ['init', '--skip-install']);
    const { out } = await run(cwd, ['list']);
    expect(out.split('\n').find((l) => l.includes('core'))).toContain('✓');
  });

  it('unknown component exits 1', async () => {
    const cwd = initialized('unknown');
    const { code, err } = await run(cwd, ['add', 'nope', '--skip-install']);
    expect(code).toBe(1);
    expect(err).toMatch(/Unknown component/);
  });
});

describe('stripJsonc', () => {
  it('drops comments and trailing commas but keeps them inside strings', () => {
    const text = `{
  // line
  "a": "x // not a comment, }", /* block */
  "b": [1, 2, /* c */ ],
  "c": { "d": "\\"q\\"", },
}`;
    expect(JSON.parse(stripJsonc(text))).toEqual({
      a: 'x // not a comment, }',
      b: [1, 2],
      c: { d: '"q"' },
    });
  });
});

describe('askInitOptions', () => {
  it('offers the fallbacks, the alias one derived from the folder answered', async () => {
    const fallbacks: string[] = [];
    const echo = async (_q: string, fallback: string) => {
      fallbacks.push(fallback);
      return fallback;
    };
    const aliasFor = (path: string) => (path === 'src/app/maps' ? '@/maps' : '@x');
    expect(await askInitOptions(echo, { path: 'src/app/maps', aliasFor })).toEqual({
      path: 'src/app/maps',
      alias: '@/maps',
    });
    expect(fallbacks).toEqual(['src/app/maps', '@/maps']);
  });
});

describe('resolveDevkit', () => {
  const write = (file: string, content: string) => {
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, content);
  };

  it('resolves a devkit nested under @angular/cli (non-hoisted layout)', () => {
    const cwd = workspace('devkit-nested');
    const cli = join(cwd, 'node_modules', '@angular', 'cli');
    const nested = join(cli, 'node_modules');
    write(join(cli, 'package.json'), '{"name":"@angular/cli","version":"0.0.0"}');
    write(join(nested, '@angular-devkit', 'schematics', 'package.json'), '{"name":"s"}');
    write(
      join(nested, '@angular-devkit', 'schematics', 'tools', 'index.js'),
      'exports.NodeWorkflow = class NodeWorkflow {};',
    );
    write(join(nested, '@angular-devkit', 'core', 'package.json'), '{"name":"c","main":"i.js"}');
    write(
      join(nested, '@angular-devkit', 'core', 'i.js'),
      'exports.logging = { Logger: class {} };',
    );
    write(join(nested, 'rxjs', 'package.json'), '{"name":"rxjs","main":"i.js"}');
    write(join(nested, 'rxjs', 'i.js'), 'exports.lastValueFrom = () => 1;');

    expect(existsSync(join(cwd, 'node_modules', '@angular-devkit'))).toBe(false);
    const devkit = resolveDevkit(cwd);
    expect(devkit.nodeModulesDirs.map((d: string) => d.toLowerCase())).toContain(
      nested.toLowerCase(),
    );
    expect(typeof devkit.NodeWorkflow).toBe('function');
    expect(typeof devkit.logging.Logger).toBe('function');
    expect(devkit.lastValueFrom()).toBe(1);
  });

  it('also returns the node_modules that holds @angular/cli (pnpm: beside @schematics/angular)', () => {
    const cwd = workspace('devkit-pnpm');
    const store = join(cwd, 'node_modules', '.pnpm');
    const cliNm = join(store, '@angular+cli@1', 'node_modules');
    const devNm = join(store, '@angular-devkit+schematics@1', 'node_modules');
    write(join(cliNm, '@angular', 'cli', 'package.json'), '{"name":"@angular/cli"}');
    write(join(cliNm, '@schematics', 'angular', 'package.json'), '{"name":"@schematics/angular"}');
    write(join(devNm, '@angular-devkit', 'schematics', 'package.json'), '{"name":"s"}');
    write(
      join(devNm, '@angular-devkit', 'schematics', 'tools', 'index.js'),
      'exports.NodeWorkflow = class NodeWorkflow {};',
    );
    write(join(devNm, '@angular-devkit', 'core', 'package.json'), '{"name":"c","main":"i.js"}');
    write(join(devNm, '@angular-devkit', 'core', 'i.js'), 'exports.logging = {};');
    write(join(devNm, 'rxjs', 'package.json'), '{"name":"rxjs","main":"i.js"}');
    write(join(devNm, 'rxjs', 'i.js'), 'exports.lastValueFrom = () => 1;');
    // Simulate pnpm: the workspace sees @angular/cli by symlink, the devkit is only beside it.
    mkdirSync(join(cwd, 'node_modules', '@angular'), { recursive: true });
    symlinkSync(
      join(cliNm, '@angular', 'cli'),
      join(cwd, 'node_modules', '@angular', 'cli'),
      'junction',
    );
    symlinkSync(join(devNm, '@angular-devkit'), join(cliNm, '@angular-devkit'), 'junction');

    const dirs = resolveDevkit(cwd).nodeModulesDirs.map((d: string) => d.toLowerCase());
    expect(dirs).toContain(cliNm.toLowerCase());
    expect(dirs).toContain(devNm.toLowerCase());
    expect(new Set(dirs).size).toBe(dirs.length);
  });

  it('still resolves the hoisted layout (the repo)', () => {
    const devkit = resolveDevkit(ROOT);
    expect(typeof devkit.NodeWorkflow).toBe('function');
    expect(devkit.nodeModulesDirs.length).toBeGreaterThan(0);
    for (const d of devkit.nodeModulesDirs) expect(d.endsWith(`${sep}node_modules`)).toBe(true);
  });
});
