import { join } from 'node:path';

import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { beforeEach, describe, expect, it } from 'vitest';

// Runs against the compiled collection: `npm run test:schematics` builds it first.
const COLLECTION = join(process.cwd(), 'dist', 'ng-mapcn', 'schematics', 'collection.json');
const MAPLIBRE_CSS = 'node_modules/maplibre-gl/dist/maplibre-gl.css';
const DEFAULT_PATH = 'src/app/components/ui/map';

interface Workspace {
  pkg?: object | null;
  angularJson?: object | null;
  styles?: { path: string; content: string } | null;
}

function createTree({
  pkg = { name: 'app', dependencies: {} },
  angularJson = {
    projects: { app: { architect: { build: { options: { styles: ['src/styles.scss'] } } } } },
  },
  styles = { path: 'src/styles.scss', content: 'body { margin: 0; }\n' },
}: Workspace = {}): Tree {
  const tree = Tree.empty();
  if (pkg) tree.create('package.json', JSON.stringify(pkg, null, 2));
  if (angularJson) tree.create('angular.json', JSON.stringify(angularJson, null, 2));
  if (styles) tree.create(styles.path, styles.content);
  return tree;
}

const readJson = (tree: Tree, path: string) => JSON.parse(tree.readContent(path));
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const stylesOf = (tree: Tree, project = 'app'): string[] =>
  readJson(tree, 'angular.json').projects[project].architect.build.options.styles;

describe('ng-add schematic', () => {
  let runner: SchematicTestRunner;
  let warnings: string[];

  beforeEach(() => {
    runner = new SchematicTestRunner('ng-mapcn', COLLECTION);
    warnings = [];
    runner.logger.subscribe((entry) => {
      if (entry.level === 'warn') warnings.push(entry.message);
    });
  });

  const run = (options: object = {}, tree: Tree = createTree()) =>
    runner.runSchematic('ng-add', { path: DEFAULT_PATH, ...options }, tree);

  describe('maplibre-gl dependency', () => {
    it('adds maplibre-gl ^6.11.2 when it is missing', async () => {
      const tree = await run();

      expect(readJson(tree, 'package.json').dependencies['maplibre-gl']).toBe('^6.11.2');
    });

    it('creates the dependencies block when the package has none', async () => {
      const tree = await run({}, createTree({ pkg: { name: 'app' } }));

      expect(readJson(tree, 'package.json').dependencies).toEqual({ 'maplibre-gl': '^6.11.2' });
      expect(readJson(tree, 'package.json').devDependencies).toEqual({
        '@types/geojson': '^7946.0.16',
      });
    });

    it('keeps an existing maplibre-gl version', async () => {
      const tree = await run(
        {},
        createTree({ pkg: { name: 'app', dependencies: { 'maplibre-gl': '^4.0.0' } } }),
      );

      expect(readJson(tree, 'package.json').dependencies['maplibre-gl']).toBe('^4.0.0');
      // The copied sources need v6, and <=6.4.0 has GHSA-jrc7-96c5-q579.
      expect(warnings.some((w) => w.includes('maplibre-gl ^6.11.2') && w.includes('^4.0.0'))).toBe(
        true,
      );
    });

    it('does not warn about an existing v6 range', async () => {
      await run(
        {},
        createTree({ pkg: { name: 'app', dependencies: { 'maplibre-gl': '^6.12.0' } } }),
      );

      expect(warnings.some((w) => w.includes('maplibre-gl ^6.11.2'))).toBe(false);
    });

    it('keeps an existing @types/geojson version', async () => {
      const tree = await run(
        {},
        createTree({ pkg: { name: 'app', devDependencies: { '@types/geojson': '7946.0.10' } } }),
      );

      expect(readJson(tree, 'package.json').devDependencies['@types/geojson']).toBe('7946.0.10');
    });

    it('does not fail when there is no package.json', async () => {
      const tree = await run({}, createTree({ pkg: null }));

      expect(tree.exists('package.json')).toBe(false);
      expect(tree.exists(`${DEFAULT_PATH}/index.ts`)).toBe(true);
    });
  });

  describe('maplibre-gl worker', () => {
    const WORKER_ASSETS = [
      { glob: 'maplibre-gl-worker.mjs', input: 'node_modules/maplibre-gl/dist', output: '/' },
      { glob: 'maplibre-gl-shared.mjs', input: 'node_modules/maplibre-gl/dist', output: '/' },
    ];
    const assetsOf = (tree: Tree): unknown[] =>
      readJson(tree, 'angular.json').projects.app.architect.build.options.assets;

    it('copies the module worker and its shared chunk next to the app bundles', async () => {
      const tree = await run();

      expect(assetsOf(tree)).toEqual(WORKER_ASSETS);
    });

    it('appends to existing assets once, even when run twice', async () => {
      const angularJson = {
        projects: {
          app: {
            architect: {
              build: { options: { styles: [], assets: [{ glob: '**/*', input: 'public' }] } },
            },
          },
        },
      };
      const first = await run({}, createTree({ angularJson }));
      const second = await run({}, first);

      expect(assetsOf(second)).toEqual([{ glob: '**/*', input: 'public' }, ...WORKER_ASSETS]);
    });
  });

  describe('maplibre-gl css', () => {
    it('registers the css first in the styles array', async () => {
      const tree = await run();

      expect(stylesOf(tree)).toEqual([MAPLIBRE_CSS, 'src/styles.scss']);
    });

    it('does not duplicate the css when it is already registered', async () => {
      const angularJson = {
        projects: {
          app: { architect: { build: { options: { styles: ['src/styles.scss', MAPLIBRE_CSS] } } } },
        },
      };
      const tree = await run({}, createTree({ angularJson }));

      expect(stylesOf(tree)).toEqual(['src/styles.scss', MAPLIBRE_CSS]);
    });

    it('is idempotent when run twice', async () => {
      const first = await run();
      const second = await run({}, first);

      expect(stylesOf(second).filter((s) => s === MAPLIBRE_CSS)).toHaveLength(1);
      expect(count(second.readContent('src/styles.scss'), '.maplibregl-popup-content')).toBe(1);
      expect(count(second.readContent('src/styles.scss'), '@use ')).toBe(1);
      expect(readJson(second, 'package.json').dependencies['maplibre-gl']).toBe('^6.11.2');
    });

    it('uses the project option', async () => {
      const angularJson = {
        projects: {
          first: { architect: { build: { options: { styles: ['a.scss'] } } } },
          second: { architect: { build: { options: { styles: ['b.scss'] } } } },
        },
      };
      const tree = await run({ project: 'second' }, createTree({ angularJson }));

      expect(stylesOf(tree, 'second')).toEqual([MAPLIBRE_CSS, 'b.scss']);
      expect(stylesOf(tree, 'first')).toEqual(['a.scss']);
    });

    it('falls back to the first project', async () => {
      const angularJson = {
        projects: {
          first: { architect: { build: { options: { styles: ['a.scss'] } } } },
          second: { architect: { build: { options: { styles: ['b.scss'] } } } },
        },
      };
      const tree = await run({}, createTree({ angularJson }));

      expect(stylesOf(tree, 'first')).toEqual([MAPLIBRE_CSS, 'a.scss']);
      expect(stylesOf(tree, 'second')).toEqual(['b.scss']);
    });

    it('warns and leaves the workspace alone when angular.json is missing', async () => {
      const tree = await run({}, createTree({ angularJson: null }));

      expect(tree.exists('angular.json')).toBe(false);
      expect(warnings.some((w) => w.includes('angular.json not found'))).toBe(true);
    });

    it('warns and does not create a styles array when it is missing', async () => {
      const angularJson = { projects: { app: { architect: { build: { options: {} } } } } };
      const tree = await run({}, createTree({ angularJson }));

      // The worker assets are still registered; only the css step is skipped.
      expect(stylesOf(tree)).toBeUndefined();
      expect(warnings.some((w) => w.includes('Could not locate the styles array'))).toBe(true);
    });
  });

  describe('global styles', () => {
    it('appends the popup overrides to styles.scss once', async () => {
      const tree = await run();
      const scss = tree.readContent('src/styles.scss');

      expect(scss).toContain('.maplibregl-popup-content');
      expect(scss).toContain('.maplibregl-popup-tip');
      // Same overrides as the npm package's styles.scss
      expect(scss).toContain('max-width: none !important;');
      expect(count(scss, '.maplibregl-popup-content')).toBe(1);
      expect(scss.indexOf('body { margin: 0; }')).toBeLessThan(
        scss.indexOf('.maplibregl-popup-content'),
      );
    });

    it('prepends the shared styles @use line for scss', async () => {
      const tree = await run();

      expect(
        tree
          .readContent('src/styles.scss')
          .startsWith("@use './app/components/ui/map/styles/index' as *;\n"),
      ).toBe(true);
    });

    it('reflects a custom path in the @use line', async () => {
      const tree = await run({ path: 'src/lib/ui/map/' });

      expect(tree.readContent('src/styles.scss')).toContain(
        "@use './lib/ui/map/styles/index' as *;",
      );
    });

    it('uses styles.css when there is no scss file, without a @use line', async () => {
      const tree = await run(
        {},
        createTree({ styles: { path: 'src/styles.css', content: 'body {}\n' } }),
      );
      const css = tree.readContent('src/styles.css');

      expect(css).toContain('.maplibregl-popup-content');
      expect(css).not.toContain('@use');
    });

    it('does not append the overrides again when they are already present', async () => {
      const content = '.maplibregl-popup-content { padding: 0; }\n';
      const tree = await run({}, createTree({ styles: { path: 'src/styles.css', content } }));

      expect(tree.readContent('src/styles.css')).toBe(content);
    });

    it('warns when no global stylesheet exists', async () => {
      const tree = await run({}, createTree({ styles: null }));

      expect(tree.exists('src/styles.scss')).toBe(false);
      expect(tree.exists('src/styles.css')).toBe(false);
      expect(warnings.some((w) => w.includes('No global stylesheet found'))).toBe(true);
    });
  });

  describe('component sources and tasks', () => {
    it('copies the map sources to the default path', async () => {
      const tree = await run();
      const copied = tree.files.filter((f) => f.startsWith(`/${DEFAULT_PATH}/`));

      expect(copied.length).toBeGreaterThan(10);
      expect(tree.exists(`${DEFAULT_PATH}/components/map/map.component.ts`)).toBe(true);
      expect(copied.filter((f) => f.endsWith('.spec.ts'))).toEqual([]);
    });

    it('copies the sources to a custom path', async () => {
      const tree = await run({ path: 'src/vendor/map' });

      expect(tree.exists('src/vendor/map/components/map/map.component.ts')).toBe(true);
      expect(tree.exists(`${DEFAULT_PATH}/index.ts`)).toBe(false);
    });

    it('schedules a node-package install task', async () => {
      await run();

      expect(runner.tasks.map((t) => t.name)).toContain('node-package');
    });
  });
});
