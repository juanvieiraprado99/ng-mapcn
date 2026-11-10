import { type SchematicContext, Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import { ensureAlias } from './tsconfig';

const ANGULAR_TSCONFIG = `/* To learn more about Typescript configuration file: https://www.typescriptlang.org/docs/handbook/tsconfig-json.html. */
/* To learn more about Angular compiler options: https://angular.dev/reference/configs/angular-compiler-options. */
{
  "compileOnSave": false,
  "compilerOptions": {
    "strict": true,
    "module": "preserve"
  },
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }]
}
`;

function context() {
  const logs: string[] = [];
  const log = (message: string) => logs.push(message);
  const ctx = { logger: { info: log, warn: log } } as unknown as SchematicContext;
  return { ctx, logs };
}

/** `compilerOptions.paths` of a tsconfig (comments stripped first). */
function pathsOf(tree: Tree, file = 'tsconfig.json'): Record<string, string[]> | undefined {
  const text = tree
    .read(file)!
    .toString()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  return JSON.parse(text).compilerOptions?.paths;
}

const text = (tree: Tree, file: string) => tree.read(file)!.toString();

const PATH = 'src/app/shared/components/map';
const ALIAS = '@/shared/components/map';

describe('ensureAlias', () => {
  it('adds "@/*" -> ./src/app/* to a fresh Angular tsconfig, keeping its comments, no baseUrl', () => {
    const tree = Tree.empty();
    tree.create('tsconfig.json', ANGULAR_TSCONFIG);
    const { ctx } = context();
    expect(ensureAlias(tree, ctx, { path: PATH, alias: ALIAS })).toEqual({
      'tsconfig.json': 'wildcard',
    });
    expect(pathsOf(tree)).toEqual({ '@/*': ['./src/app/*'] });
    const content = text(tree, 'tsconfig.json');
    expect(content).toContain('/* To learn more about Angular compiler options');
    expect(content).not.toContain('baseUrl');
  });

  it('keeps an "@/*" mapping that already covers the folder', () => {
    const tree = Tree.empty();
    tree.create(
      'tsconfig.json',
      JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/app/*'] } } }),
    );
    const before = text(tree, 'tsconfig.json');
    const { ctx } = context();
    expect(ensureAlias(tree, ctx, { path: PATH, alias: ALIAS })['tsconfig.json']).toBe('present');
    expect(text(tree, 'tsconfig.json')).toBe(before);
  });

  it('adds exact entries when "@/*" points elsewhere', () => {
    const { ctx } = context();
    const other = Tree.empty();
    other.create(
      'tsconfig.json',
      JSON.stringify({ compilerOptions: { paths: { '@/*': ['./lib/*'] } } }),
    );
    expect(ensureAlias(other, ctx, { path: PATH, alias: ALIAS })['tsconfig.json']).toBe('exact');
    expect(pathsOf(other)).toEqual({
      '@/*': ['./lib/*'],
      [ALIAS]: [`./${PATH}`],
      [`${ALIAS}/*`]: [`./${PATH}/*`],
    });
  });

  it('adds exact entries for a custom path and alias', () => {
    const tree = Tree.empty();
    tree.create('tsconfig.json', '{ "compilerOptions": {} }');
    const { ctx } = context();
    ensureAlias(tree, ctx, { path: 'libs/maps', alias: '@maps' });
    expect(pathsOf(tree)).toEqual({ '@maps': ['./libs/maps'], '@maps/*': ['./libs/maps/*'] });
  });

  it('resolves targets against baseUrl when the tsconfig sets one', () => {
    const tree = Tree.empty();
    tree.create(
      'tsconfig.json',
      JSON.stringify({ compilerOptions: { baseUrl: 'src', paths: { '@/*': ['app/*'] } } }),
    );
    const { ctx } = context();
    expect(ensureAlias(tree, ctx, { path: PATH, alias: ALIAS })['tsconfig.json']).toBe('present');
  });

  it('also edits a project tsconfig that declares its own paths (they replace the inherited ones)', () => {
    const tree = Tree.empty();
    tree.create('tsconfig.json', '{ "compilerOptions": {} }');
    tree.create(
      'projects/web/tsconfig.app.json',
      JSON.stringify({
        extends: '../../tsconfig.json',
        compilerOptions: { paths: { '~/*': ['./src/*'] } },
      }),
    );
    tree.create(
      'projects/web/tsconfig.spec.json',
      JSON.stringify({ extends: '../../tsconfig.json' }),
    );
    const { ctx } = context();
    const changes = ensureAlias(tree, ctx, {
      path: 'projects/web/src/app/shared/components/map',
      alias: ALIAS,
      projectTsconfigs: ['projects/web/tsconfig.app.json', 'projects/web/tsconfig.spec.json'],
    });
    expect(changes).toEqual({
      'tsconfig.json': 'wildcard',
      'projects/web/tsconfig.app.json': 'wildcard',
    });
    expect(pathsOf(tree)).toEqual({ '@/*': ['./projects/web/src/app/*'] });
    expect(pathsOf(tree, 'projects/web/tsconfig.app.json')).toEqual({
      '~/*': ['./src/*'],
      '@/*': ['./src/app/*'],
    });
  });

  it('warns and changes nothing without a tsconfig.json', () => {
    const tree = Tree.empty();
    const { ctx, logs } = context();
    expect(ensureAlias(tree, ctx, { path: PATH, alias: ALIAS })).toEqual({});
    expect(logs.join('\n')).toContain('tsconfig.json not found');
  });
});
