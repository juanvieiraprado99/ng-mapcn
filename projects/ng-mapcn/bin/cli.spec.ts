import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

// @ts-expect-error plain ESM module without type declarations
import { main, parseArgs, UsageError } from './cli.mjs';

// Runs against the compiled collection: `npm run test:schematics` builds it first.
const ROOT = process.cwd();
const COLLECTION = join(ROOT, 'dist', 'ng-mapcn', 'schematics', 'collection.json');
const TMP = join(ROOT, 'tmp', 'cli');
const MAPLIBRE_CSS = 'node_modules/maplibre-gl/dist/maplibre-gl.css';
const TARGET = 'src/app/components/ui/map';

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
  return dir;
}

async function run(cwd: string, argv: string[]) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code: number = await main(argv, {
    cwd,
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
  it('maps no command, -h and -v', () => {
    expect(parseArgs([]).command).toBe('help');
    expect(parseArgs(['-h']).command).toBe('help');
    expect(parseArgs(['--version']).command).toBe('version');
  });
  it('throws UsageError on unknown flags', () => {
    expect(() => parseArgs(['--nope'])).toThrow(UsageError);
  });
});

describe('main', () => {
  it('init copies the core and sets up angular.json', async () => {
    const cwd = workspace('init');
    const { code } = await run(cwd, ['init', '--skip-install']);
    expect(code).toBe(0);
    expect(existsSync(join(cwd, TARGET, 'components/map/map.component.ts'))).toBe(true);
    const styles = JSON.parse(readFileSync(join(cwd, 'angular.json'), 'utf8')).projects.app
      .architect.build.options.styles;
    expect(styles).toContain(MAPLIBRE_CSS);
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

  it('add without items prints usage', async () => {
    const cwd = workspace('add-usage');
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
    const cwd = workspace('list-empty');
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
    const cwd = workspace('unknown');
    const { code, err } = await run(cwd, ['add', 'nope', '--skip-install']);
    expect(code).toBe(1);
    expect(err).toMatch(/Unknown component/);
  });
});
