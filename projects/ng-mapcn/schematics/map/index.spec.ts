import { join } from 'node:path';

import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { describe, expect, it } from 'vitest';

// Runs against the compiled collection: `npm run test:schematics` builds it first.
const COLLECTION = join(process.cwd(), 'dist', 'ng-mapcn', 'schematics', 'collection.json');
const DEFAULT_PATH = 'src/app/components/ui/map';

describe('map schematic', () => {
  const runner = new SchematicTestRunner('ng-mapcn', COLLECTION);
  const run = (options: object = {}) => runner.runSchematic('map', options, Tree.empty());

  it('copies the sources to the default path', async () => {
    const tree = await run();
    const copied = tree.files.filter((f) => f.startsWith(`/${DEFAULT_PATH}/`));

    expect(copied.length).toBeGreaterThan(10);
    expect(tree.files.every((f) => f.startsWith(`/${DEFAULT_PATH}/`))).toBe(true);
  });

  it('copies the sources to a custom path', async () => {
    const tree = await run({ path: 'libs/maps/ui' });

    expect(tree.exists('libs/maps/ui/index.ts')).toBe(true);
    expect(tree.exists('libs/maps/ui/components/map/map.component.ts')).toBe(true);
    expect(tree.files.some((f) => f.startsWith(`/${DEFAULT_PATH}/`))).toBe(false);
  });

  it('includes the map component and an index without the lib/ level', async () => {
    const tree = await run();

    expect(tree.exists(`${DEFAULT_PATH}/components/map/map.component.ts`)).toBe(true);
    const index = tree.readContent(`${DEFAULT_PATH}/index.ts`);
    expect(index).toContain("from './");
    expect(index).not.toContain('./lib/');
  });

  it('ships no spec files and nothing from the test helpers', async () => {
    const tree = await run();

    expect(tree.files.filter((f) => f.endsWith('.spec.ts'))).toEqual([]);
    expect(tree.files.filter((f) => /\/testing\//.test(f))).toEqual([]);
    expect(tree.files.filter((f) => f.includes('maplibre-fake'))).toEqual([]);
    // The `ng-mapcn/testing` and `ng-mapcn/testing/maplibre` entry points are npm-only.
    const code = tree.files.filter((f) => f.endsWith('.ts')).map((f) => tree.readContent(f));
    expect(code.some((c) => c.includes('ng-mapcn/testing'))).toBe(false);
    expect(code.some((c) => c.includes('configureFakeMapLibre'))).toBe(false);
    expect(code.some((c) => c.includes('resetMapTesting'))).toBe(false);
  });

  describe('draw (opt-in)', () => {
    const pkgTree = (pkg: object = { name: 'app', dependencies: {} }) => {
      const tree = Tree.empty();
      tree.create('package.json', JSON.stringify(pkg, null, 2));
      return tree;
    };
    const runDraw = (options: object = {}, tree: Tree = pkgTree()) =>
      runner.runSchematic('map', { draw: true, ...options }, tree);

    it('does not copy the draw sources or add terra-draw by default', async () => {
      const tree = await runner.runSchematic('map', {}, pkgTree());

      expect(tree.files.some((f) => f.includes('/draw/'))).toBe(false);
      expect(tree.readContent('package.json')).not.toContain('terra-draw');
      // The core never references terra-draw, so apps without it keep building.
      const core = tree.files.filter((f) => f.endsWith('.ts'));
      expect(core.some((f) => tree.readContent(f).includes('terra-draw'))).toBe(false);
    });

    it('copies the draw sources under <path>/draw with a relative core import', async () => {
      const tree = await runDraw();

      expect(tree.exists(`${DEFAULT_PATH}/draw/index.ts`)).toBe(true);
      expect(tree.exists(`${DEFAULT_PATH}/draw/map-draw.component.ts`)).toBe(true);
      expect(tree.exists(`${DEFAULT_PATH}/draw/draw-styles.ts`)).toBe(true);
      const component = tree.readContent(`${DEFAULT_PATH}/draw/map-draw.component.ts`);
      expect(component).toContain("from '../index'");
      expect(component).not.toContain("from 'ng-mapcn'");
      expect(component).toContain("from 'terra-draw'");
      expect(tree.readContent(`${DEFAULT_PATH}/draw/index.ts`)).toContain("'./map-draw.component'");
    });

    it('ships no spec files or test helpers with the draw sources', async () => {
      const tree = await runDraw();

      expect(tree.files.filter((f) => f.endsWith('.spec.ts'))).toEqual([]);
      expect(tree.files.filter((f) => /\/testing\//.test(f))).toEqual([]);
    });

    it('follows a custom path', async () => {
      const tree = await runDraw({ path: 'libs/maps/ui' });

      expect(tree.exists('libs/maps/ui/draw/map-draw.component.ts')).toBe(true);
    });

    it('adds terra-draw and its MapLibre adapter to the dependencies', async () => {
      const tree = await runDraw();

      expect(JSON.parse(tree.readContent('package.json')).dependencies).toEqual({
        'terra-draw': '^1.37.0',
        'terra-draw-maplibre-gl-adapter': '^1.5.0',
      });
    });

    it('keeps the versions the app already pins', async () => {
      const tree = await runDraw(
        {},
        pkgTree({
          name: 'app',
          dependencies: { 'terra-draw': '^1.40.0' },
          devDependencies: { 'terra-draw-maplibre-gl-adapter': '^1.6.0' },
        }),
      );
      const pkg = JSON.parse(tree.readContent('package.json'));

      expect(pkg.dependencies).toEqual({ 'terra-draw': '^1.40.0' });
      expect(pkg.devDependencies).toEqual({ 'terra-draw-maplibre-gl-adapter': '^1.6.0' });
    });

    it('still copies the sources without a package.json', async () => {
      const tree = await runDraw({}, Tree.empty());

      expect(tree.exists(`${DEFAULT_PATH}/draw/map-draw.component.ts`)).toBe(true);
    });
  });
});
