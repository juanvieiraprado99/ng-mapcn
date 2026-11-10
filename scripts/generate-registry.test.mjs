import assert from 'node:assert/strict';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildRegistry, RegistryError, realPaths } from './generate-registry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesRoot = join(root, 'tmp', 'registry-fixtures');

after(() => rmSync(fixturesRoot, { recursive: true, force: true }));

/** Writes a fixture tree and returns buildRegistry's options for it. */
function fixture(name, tree, { eol = '\n' } = {}) {
  const base = join(fixturesRoot, name);
  rmSync(base, { recursive: true, force: true });
  const all = {
    'public-api.ts': '',
    'draw-public-api.ts': '',
    'package.json': JSON.stringify({
      version: '1.0.0',
      peerDependencies: { 'terra-draw': '^1.37.0' },
    }),
    ...tree,
  };
  for (const [rel, content] of Object.entries(all)) {
    const file = join(base, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content.replace(/\n/g, eol));
  }
  mkdirSync(join(base, 'draw'), { recursive: true });
  mkdirSync(join(base, 'lib'), { recursive: true });
  return {
    libDir: join(base, 'lib'),
    drawDir: join(base, 'draw'),
    publicApiPath: join(base, 'public-api.ts'),
    drawPublicApiPath: join(base, 'draw-public-api.ts'),
    packageJsonPath: join(base, 'package.json'),
  };
}

const coreTree = {
  'lib/components/map/map.component.ts': "import './x';\nimport { a } from '../../utils/a';\n",
  'lib/components/map/x.ts': 'export const x = 1;\n',
  'lib/utils/a.ts': "import { b } from './b';\nexport const a = b;\n",
  'lib/utils/b.ts': 'export const b = 1;\n',
  'lib/styles/index.scss': "@use './variables';\n",
  'lib/styles/_variables.scss': '$a: 1;\n',
};

test('core includes map folder, styles and shared files it reaches', () => {
  const reg = buildRegistry(fixture('core', coreTree));
  assert.deepEqual(reg.items.core.files, [
    'components/map/map.component.ts',
    'components/map/x.ts',
    'styles/_variables.scss',
    'styles/index.scss',
    'utils/a.ts',
    'utils/b.ts',
  ]);
  assert.equal(reg.version, '1.0.0');
  assert.deepEqual(reg.items.core.registryDependencies, []);
});

test('component item lists other components as registryDependencies', () => {
  const reg = buildRegistry(
    fixture('component-deps', {
      ...coreTree,
      'lib/components/map-route/y.component.ts': 'export class Y {}\n',
      'lib/components/map-route-playback/x.component.ts':
        "import { Y } from '../map-route/y.component';\n",
    }),
  );
  assert.deepEqual(Object.keys(reg.items), ['core', 'route', 'route-playback']);
  assert.deepEqual(reg.items['route-playback'].registryDependencies, ['core', 'route']);
  assert.deepEqual(reg.items['route-playback'].files, [
    'components/map-route-playback/x.component.ts',
  ]);
  assert.deepEqual(reg.items.route.registryDependencies, ['core']);
});

test('templateUrl, styleUrl and scss url() are edges', () => {
  const reg = buildRegistry(
    fixture('urls', {
      ...coreTree,
      'lib/components/map-a/a.component.ts':
        "@Component({ templateUrl: './a.html', styleUrl: './a.scss', styleUrls: ['./b.scss', './c.scss'] })\nexport class A {}\n",
      'lib/components/map-a/a.html': '<p></p>\n',
      'lib/components/map-a/a.scss':
        "@import '../../shared/part';\n.x { background: url('../../assets/img.png'); }\n",
      'lib/components/map-a/b.scss': '.b {}\n',
      'lib/components/map-a/c.scss': '.c {}\n',
      'lib/shared/_part.scss': '.p {}\n',
      'lib/assets/img.png': 'png',
    }),
  );
  assert.deepEqual(reg.items.a.files, [
    'assets/img.png',
    'components/map-a/a.component.ts',
    'components/map-a/a.html',
    'components/map-a/a.scss',
    'components/map-a/b.scss',
    'components/map-a/c.scss',
    'shared/_part.scss',
  ]);
});

test('npm dependencies come from peer ranges', () => {
  const reg = buildRegistry(
    fixture('npm', {
      ...coreTree,
      'draw/d.component.ts':
        "import { Component } from '@angular/core';\nimport { of } from 'rxjs';\nimport maplibregl from 'maplibre-gl';\nimport { TerraDraw } from 'terra-draw';\n",
    }),
  );
  assert.deepEqual(reg.items.draw.dependencies, { 'terra-draw': '^1.37.0' });
  assert.deepEqual(reg.items.core.dependencies, {});
});

test('draw maps ng-mapcn symbols through public-api', () => {
  const reg = buildRegistry(
    fixture('draw-symbols', {
      ...coreTree,
      'lib/services/map-context.service.ts': 'export class MapContextService {}\n',
      'lib/components/map/map.component.ts':
        "import '../../services/map-context.service';\nimport { a } from '../../utils/a';\n",
      'public-api.ts': "export * from './lib/services/map-context.service';\n",
      'draw/d.component.ts':
        "import { MapContextService } from 'ng-mapcn';\nimport { s } from './s';\n",
      'draw/s.ts': 'export const s = 1;\n',
      'draw-public-api.ts': "export * from './d.component';\n",
    }),
  );
  assert.deepEqual(reg.items.draw.registryDependencies, ['core']);
  assert.ok(reg.items.draw.files.every((f) => f.startsWith('draw/')));
  assert.deepEqual(reg.items.draw.files, ['draw/d.component.ts', 'draw/index.ts', 'draw/s.ts']);
});

test('exports rewrite ./lib/ and record the target file', () => {
  const reg = buildRegistry(
    fixture('exports', { ...coreTree, 'public-api.ts': "export * from './lib/utils/a';\n" }),
  );
  assert.deepEqual(reg.exports, [{ line: "export * from './utils/a';", file: 'utils/a.ts' }]);
});

test('reports orphans, testing imports and unresolved imports together', () => {
  const opts = fixture('problems', {
    ...coreTree,
    'lib/components/map/map.component.ts':
      "import { a } from '../../utils/a';\nimport { t } from '../../testing/helper';\nimport { m } from './missing';\n",
    'lib/orphan.ts': 'export const o = 1;\n',
  });
  assert.throws(
    () => buildRegistry(opts),
    (error) => {
      assert.ok(error instanceof RegistryError);
      assert.equal(error.problems.length, 3, error.problems.join('\n'));
      return true;
    },
  );
});

test('normalizes CRLF and backslashes', () => {
  const tree = {
    ...coreTree,
    'lib/components/map-route/y.component.ts': "import { a } from '../../utils/a';\n",
    'public-api.ts': "export * from './lib/utils/a';\n",
  };
  const lf = buildRegistry(fixture('lf', tree));
  const crlf = buildRegistry(fixture('crlf', tree, { eol: '\r\n' }));
  assert.deepEqual(crlf, lf);

  const backslashed = buildRegistry(
    fixture('backslash', {
      ...tree,
      'lib/components/map-route/y.component.ts': "import { a } from '..\\..\\utils\\a';\n",
    }),
  );
  assert.deepEqual(backslashed, lf);
});

test('real sources', () => {
  const reg = buildRegistry(realPaths());
  const libComponents = join(realPaths().libDir, 'components');
  const expected = readdirSync(libComponents)
    .map((f) => (f === 'map' ? 'core' : f.replace(/^map-/, '')))
    .concat('draw')
    .sort();
  assert.deepEqual(Object.keys(reg.items).sort(), expected);
  assert.equal(Object.keys(reg.items)[0], 'core');

  for (const file of reg.items.core.files) {
    assert.ok(!file.startsWith('components/') || file.startsWith('components/map/'), file);
  }
  for (const name of ['marker-content', 'marker-popup', 'marker-tooltip']) {
    // The import graph runs child -> marker (they inject MarkerContextService), not marker -> child.
    assert.ok(reg.items[name].registryDependencies.includes('marker'), name);
  }
  for (const [name, item] of Object.entries(reg.items)) {
    if (name !== 'core') assert.ok(item.registryDependencies.includes('core'), name);
    assert.deepEqual(item.files, [...item.files].sort());
    for (const file of item.files) {
      assert.ok(!/testing\//.test(file) && !file.endsWith('.spec.ts'), file);
    }
  }
  assert.ok(reg.items.draw.files.includes('draw/index.ts'));
  assert.ok(reg.items.draw.files.every((f) => f.startsWith('draw/')));
});
