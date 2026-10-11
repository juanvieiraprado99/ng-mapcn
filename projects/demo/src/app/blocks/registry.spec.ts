import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { serverRoutes } from '../app.routes.server';
import { BLOCK_SOURCES } from './block-sources.generated';
import { BLOCK_COMPONENTS, BLOCKS, findBlock, type ZardComponentName } from './registry';

// Typed as a Record so adding a name to `ZardComponentName` without listing it here fails to compile.
const ZARD_COMPONENTS: Record<ZardComponentName, true> = {
  badge: true,
  button: true,
  card: true,
  chart: true,
  input: true,
  separator: true,
  sidebar: true,
};

describe('blocks registry', () => {
  it('has unique block names', () => {
    const names = BLOCKS.map((b) => b.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it.each(BLOCKS.map((b) => [b.name, b] as const))('%s has complete metadata', (_name, block) => {
    expect(block.title).not.toBe('');
    expect(block.description).not.toBe('');
    expect(block.iframeHeight).toMatch(/^\d+px$/);
    expect(block.files.length).toBeGreaterThan(0);
  });

  it('only references known zard components, each one installed in the demo', () => {
    for (const block of BLOCKS) {
      for (const name of block.zard) {
        expect(Object.keys(ZARD_COMPONENTS), `${block.name} -> ${name}`).toContain(name);
        expect(
          existsSync(resolve(process.cwd(), 'projects/demo/src/app/shared/components', name)),
          `${block.name} -> shared/components/${name}`,
        ).toBe(true);
      }
    }
  });

  it('every listed file exists in the generated sources and is not empty', () => {
    for (const block of BLOCKS) {
      for (const file of block.files) {
        expect(Object.keys(BLOCK_SOURCES), `${block.name}: ${file.path}`).toContain(file.path);
        expect(BLOCK_SOURCES[file.path].length, file.path).toBeGreaterThan(0);
      }
    }
  });

  it('every generated source belongs to a registered block', () => {
    const listed = new Set(BLOCKS.flatMap((b) => b.files.map((f) => f.path)));

    expect(Object.keys(BLOCK_SOURCES).filter((path) => !listed.has(path))).toEqual([]);
  });

  it('every block has a lazy component loader and vice versa', () => {
    expect(Object.keys(BLOCK_COMPONENTS).sort()).toEqual(BLOCKS.map((b) => b.name).sort());
  });

  it('findBlock resolves a registered block and nothing else', () => {
    expect(findBlock(BLOCKS[0].name)).toBe(BLOCKS[0]);
    expect(findBlock('nope')).toBeUndefined();
  });

  it('prerenders one /view/:name page per block', async () => {
    const route = serverRoutes.find((r) => r.path === 'view/:name')!;
    const params = await (
      route as { getPrerenderParams: () => Promise<Record<string, string>[]> }
    ).getPrerenderParams();

    expect(params).toEqual(BLOCKS.map((b) => ({ name: b.name })));
  });
});
