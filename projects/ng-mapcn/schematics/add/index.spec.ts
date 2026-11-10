import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { resolve } from '../registry/resolve';
import type { Registry } from '../registry/types';

// Runs against the compiled collection: `npm run test:schematics` builds it first.
const DIST = join(process.cwd(), 'dist', 'ng-mapcn', 'schematics');
const COLLECTION = join(DIST, 'collection.json');
const DEFAULT_PATH = 'src/app/components/ui/map';
const registry = JSON.parse(readFileSync(join(DIST, 'registry.json'), 'utf8')) as Registry;

const pkgTree = (pkg: object = { name: 'app', dependencies: { 'maplibre-gl': '^6.11.2' } }) => {
  const tree = Tree.empty();
  tree.create('package.json', JSON.stringify(pkg, null, 2));
  return tree;
};

describe('add schematic', () => {
  let runner: SchematicTestRunner;
  let warnings: string[];
  let infos: string[];

  beforeEach(() => {
    runner = new SchematicTestRunner('ng-mapcn', COLLECTION);
    warnings = [];
    infos = [];
    runner.logger.subscribe((entry) => {
      if (entry.level === 'warn') warnings.push(entry.message);
      if (entry.level === 'info') infos.push(entry.message);
    });
  });

  const run = (options: object = {}, tree: Tree = pkgTree()) =>
    runner.runSchematic('add', options, tree);
  const copied = (tree: Tree, root = DEFAULT_PATH) =>
    tree.files.filter((f) => f.startsWith(`/${root}/`)).map((f) => f.slice(root.length + 2));

  it('copies only the closure of one component', async () => {
    const tree = await run({ components: ['marker'] });
    const expected = resolve(registry, ['marker']).files;

    expect(copied(tree).sort()).toEqual([...expected, 'index.ts'].sort());
    expect(copied(tree).some((f) => f.startsWith('components/map-route/'))).toBe(false);
  });

  it('copies core only with no components', async () => {
    const tree = await run();

    expect(copied(tree).sort()).toEqual([...resolve(registry, []).files, 'index.ts'].sort());
    expect(tree.exists(`${DEFAULT_PATH}/components/map/map.component.ts`)).toBe(true);
  });

  it('all copies every registry file', async () => {
    const tree = await run({ all: true });
    const expected = resolve(registry, [], { all: true }).files;

    expect(copied(tree).sort()).toEqual([...expected, 'index.ts'].sort());
    expect(copied(tree).some((f) => f.startsWith('draw/'))).toBe(false);
  });

  it('skips existing files and keeps their content', async () => {
    const tree = pkgTree();
    tree.create(`${DEFAULT_PATH}/utils/map-utils.ts`, '// mine');
    const result = await run({ components: ['marker'] }, tree);

    expect(result.readContent(`${DEFAULT_PATH}/utils/map-utils.ts`)).toBe('// mine');
  });

  it('logs one skipped line for a customized file and none for untouched ones', async () => {
    let tree = await run();
    infos.length = 0;
    tree = await run({ components: ['marker'] }, tree);
    expect(infos.filter((m) => m.startsWith('skipped'))).toEqual([]);

    tree.overwrite(`${DEFAULT_PATH}/utils/map-utils.ts`, '// mine');
    infos.length = 0;
    await run({ components: ['marker'] }, tree);
    const skipped = infos.filter((m) => m.startsWith('skipped'));
    expect(skipped).toEqual([
      `skipped ${DEFAULT_PATH}/utils/map-utils.ts (exists, differs; use --overwrite to replace)`,
    ]);
    expect(
      infos.some((m) => /Created 0, overwritten 0, skipped 1, unchanged \d+ file\(s\)/.test(m)),
    ).toBe(true);
  });

  it('does not touch index.ts when the barrel is identical', async () => {
    const first = await run({ components: ['marker'] });
    const second = await run({ components: ['marker'] }, first);

    expect(second.actions.filter((a) => a.kind === 'o' && a.path.endsWith('/index.ts'))).toEqual(
      [],
    );
  });

  it('counts overwritten files separately', async () => {
    const tree = pkgTree();
    tree.create(`${DEFAULT_PATH}/utils/map-utils.ts`, '// mine');
    await run({ components: ['marker'], overwrite: true }, tree);

    expect(infos.some((m) => /overwritten 1,/.test(m))).toBe(true);
  });

  it('overwrite replaces existing files', async () => {
    const tree = pkgTree();
    tree.create(`${DEFAULT_PATH}/utils/map-utils.ts`, '// mine');
    const result = await run({ components: ['marker'], overwrite: true }, tree);

    expect(result.readContent(`${DEFAULT_PATH}/utils/map-utils.ts`)).not.toBe('// mine');
  });

  it('incremental run keeps earlier components in the barrel', async () => {
    let tree = await run({ components: ['marker'] });
    tree = await run({ components: ['route'] }, tree);
    const index = tree.readContent(`${DEFAULT_PATH}/index.ts`);

    expect(index).toContain('map-marker/');
    expect(index).toContain('map-route/');
  });

  it('barrel drops exports of deleted components', async () => {
    let tree = await run({ components: ['marker'] });
    for (const f of copied(tree).filter((f) => f.startsWith('components/map-marker/'))) {
      tree.delete(`${DEFAULT_PATH}/${f}`);
    }
    tree = await run({ components: ['route'] }, tree);

    expect(tree.readContent(`${DEFAULT_PATH}/index.ts`)).not.toContain('map-marker/');
    expect(copied(tree).some((f) => f.startsWith('components/map-marker/'))).toBe(false);
  });

  it('unknown component fails before writing', async () => {
    const tree = pkgTree();
    await expect(runner.runSchematic('add', { components: ['nope'] }, tree)).rejects.toThrow(
      /Unknown component/,
    );
    expect(tree.exists(DEFAULT_PATH + '/index.ts')).toBe(false);
  });

  it('warns when maplibre-gl is missing', async () => {
    await run({ components: ['marker'] }, pkgTree({ name: 'app', dependencies: {} }));

    expect(warnings.some((w) => w.includes('maplibre-gl is not in package.json'))).toBe(true);
  });

  it('does not warn when maplibre-gl is present', async () => {
    await run({ components: ['marker'] });

    expect(warnings).toEqual([]);
  });

  it('copies to a custom path', async () => {
    const tree = await run({ components: ['marker'], path: 'libs/maps/ui' });

    expect(tree.exists('libs/maps/ui/index.ts')).toBe(true);
    expect(tree.exists('libs/maps/ui/components/map/map.component.ts')).toBe(true);
    expect(tree.files.some((f) => f.startsWith(`/${DEFAULT_PATH}/`))).toBe(false);
  });

  it('rejects invalid paths', async () => {
    for (const path of ['', '/abs', '../up', 'a/../b', 'it"s']) {
      await expect(run({ path })).rejects.toThrow(/--path/);
    }
  });

  it('ships no spec files and nothing from the test helpers', async () => {
    const tree = await run({ all: true });

    expect(tree.files.filter((f) => f.endsWith('.spec.ts'))).toEqual([]);
    expect(tree.files.filter((f) => /\/testing\//.test(f))).toEqual([]);
    const code = tree.files.filter((f) => f.endsWith('.ts')).map((f) => tree.readContent(f));
    expect(code.some((c) => c.includes('ng-mapcn/testing'))).toBe(false);
    expect(code.some((c) => c.includes('configureFakeMapLibre'))).toBe(false);
  });

  describe('draw (opt-in)', () => {
    it('adds the terra-draw dependencies and a relative core import', async () => {
      const tree = await run({ components: ['draw'] });

      expect(JSON.parse(tree.readContent('package.json')).dependencies).toEqual({
        'maplibre-gl': '^6.11.2',
        'terra-draw': '^1.37.0',
        'terra-draw-maplibre-gl-adapter': '^1.5.0',
      });
      expect(tree.readContent(`${DEFAULT_PATH}/draw/map-draw.component.ts`)).toContain(
        "from '../index'",
      );
      expect(tree.exists(`${DEFAULT_PATH}/draw/index.ts`)).toBe(true);
    });

    it('is not added by all, nor is a terra-draw dependency', async () => {
      const tree = await run({ all: true });

      expect(tree.files.some((f) => f.includes('/draw/'))).toBe(false);
      expect(tree.readContent('package.json')).not.toContain('terra-draw');
    });

    it('keeps the versions the app already pins', async () => {
      const tree = await run(
        { components: ['draw'] },
        pkgTree({
          name: 'app',
          dependencies: { 'maplibre-gl': '^6.11.2', 'terra-draw': '^1.40.0' },
          devDependencies: { 'terra-draw-maplibre-gl-adapter': '^1.6.0' },
        }),
      );
      const pkg = JSON.parse(tree.readContent('package.json'));

      expect(pkg.dependencies['terra-draw']).toBe('^1.40.0');
      expect(pkg.dependencies['terra-draw-maplibre-gl-adapter']).toBeUndefined();
    });

    it('still copies the sources without a package.json', async () => {
      const tree = await run({ components: ['draw'] }, Tree.empty());

      expect(tree.exists(`${DEFAULT_PATH}/draw/map-draw.component.ts`)).toBe(true);
    });
  });

  it('schedules an install only when dependencies were added', async () => {
    await run({ components: ['marker'] });
    expect(runner.tasks.length).toBe(0);
    await run({ components: ['draw'] });
    expect(runner.tasks.length).toBe(1);
    await run({ components: ['draw'], skipInstall: true });
    expect(runner.tasks.length).toBe(0);
  });
});
