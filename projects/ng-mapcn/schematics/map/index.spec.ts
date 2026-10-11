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
  });
});
