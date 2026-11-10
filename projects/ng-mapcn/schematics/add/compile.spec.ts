import { execFile } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { afterAll, describe, expect, it } from 'vitest';

import type { Registry } from '../registry/types';

// Runs against the compiled collection: `npm run test:schematics` builds it first.
const ROOT = process.cwd();
const DIST = join(ROOT, 'dist', 'ng-mapcn', 'schematics');
const COLLECTION = join(DIST, 'collection.json');
const OUT = join(ROOT, 'tmp', 'compile-check');
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const COPY_PATH = 'ui/map';
const CONCURRENCY = 4;

const registry = JSON.parse(readFileSync(join(DIST, 'registry.json'), 'utf8')) as Registry;
const itemNames = Object.keys(registry.items);

const cases = ['core', ...itemNames.filter((n) => n !== 'core'), '--all'];

const tsconfig = {
  compilerOptions: {
    strict: true,
    noEmit: true,
    target: 'es2022',
    module: 'es2022',
    moduleResolution: 'bundler',
    lib: ['es2022', 'dom'],
    skipLibCheck: true,
    types: [],
  },
  include: ['**/*.ts'],
};

const tsc = (dir: string) =>
  new Promise<{ code: number; out: string }>((resolveRun) => {
    execFile(
      process.execPath,
      [TSC, '-p', dir],
      { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 },
      (err, stdout, stderr) => {
        const code = err ? (typeof err.code === 'number' ? err.code : 1) : 0;
        resolveRun({ code, out: `${stdout}${stderr}` });
      },
    );
  });

const materialize = async (name: string): Promise<string> => {
  const runner = new SchematicTestRunner('ng-mapcn', COLLECTION);
  const tree = Tree.empty();
  tree.create(
    'package.json',
    JSON.stringify({ name: 'app', dependencies: { 'maplibre-gl': '^6.11.2' } }),
  );
  const options =
    name === 'core'
      ? { components: [], path: COPY_PATH }
      : name === '--all'
        ? { all: true, path: COPY_PATH }
        : { components: [name], path: COPY_PATH };
  const result = await runner.runSchematic('add', { ...options, skipInstall: true }, tree);

  const dir = join(OUT, name === '--all' ? 'all' : name);
  rmSync(dir, { recursive: true, force: true });
  for (const file of result.files) {
    if (!file.startsWith(`/${COPY_PATH}/`)) continue;
    const target = join(dir, file.slice(COPY_PATH.length + 2));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, result.read(file)!);
  }
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
  return dir;
};

describe('per-component copies type-check on their own', () => {
  afterAll(() => {
    rmSync(OUT, { recursive: true, force: true });
  });

  it('every case compiles', async () => {
    const failures: string[] = [];
    let next = 0;
    const worker = async () => {
      while (next < cases.length) {
        const name = cases[next++];
        const dir = await materialize(name);
        const { code, out } = await tsc(dir);
        if (code !== 0) failures.push(`[${name}] tsc exited ${code}\n${out}`);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    expect(failures, failures.join('\n')).toEqual([]);
  }, 300_000);

  it('a consumer file compiles importing from the alias that init maps', async () => {
    const runner = new SchematicTestRunner('ng-mapcn', COLLECTION);
    const tree = Tree.empty();
    tree.create(
      'package.json',
      JSON.stringify({ name: 'app', dependencies: { 'maplibre-gl': '^6.11.2' } }),
    );
    tree.create('tsconfig.json', JSON.stringify({ compilerOptions: tsconfig.compilerOptions }));
    tree.create(
      'angular.json',
      JSON.stringify({ version: 1, projects: { app: { root: '', architect: {} } } }),
    );
    const afterInit = await runner.runSchematic('ng-add', { skipInstall: true }, tree);
    const result = await runner.runSchematic(
      'add',
      { components: ['controls', 'draw'], skipInstall: true },
      afterInit,
    );

    const dir = join(OUT, 'consumer');
    rmSync(dir, { recursive: true, force: true });
    for (const file of result.files) {
      if (!file.startsWith('/src/') && file !== '/tsconfig.json') continue;
      const target = join(dir, file.slice(1));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, result.read(file)!);
    }
    // The snippet the docs show for the Controls page, as a copy-paste user pastes it.
    writeFileSync(
      join(dir, 'src', 'app', 'controls-map.ts'),
      `import { Component } from '@angular/core';
import { MapComponent, MapControlsComponent } from '@/shared/components/map';
import { MapDrawComponent } from '@/shared/components/map/draw';

@Component({
  selector: 'app-controls-map',
  imports: [MapComponent, MapControlsComponent, MapDrawComponent],
  template: '<ng-map><ng-map-controls /><ng-map-draw /></ng-map>',
})
export class ControlsMapComponent {}
`,
    );
    const generated = JSON.parse(readFileSync(join(dir, 'tsconfig.json'), 'utf8'));
    expect(generated.compilerOptions.paths).toEqual({ '@/*': ['./src/app/*'] });
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({ ...generated, include: ['src/**/*.ts'] }, null, 2),
    );

    const { code, out } = await tsc(dir);
    expect(code, out).toBe(0);
  }, 120_000);
});
