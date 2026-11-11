import { describe, expect, it } from 'vitest';

import { BLOCK_SOURCES } from './block-sources.generated';
import { blockInstallCommands, blockItemsFromSources, blockUsage } from './block-usage';
import { BLOCKS } from './registry';

describe('blockUsage', () => {
  it.each(BLOCKS.map((block) => [block.name, block] as const))(
    '%s has a usage snippet built from its entry file',
    (_name, block) => {
      const usage = blockUsage(block, BLOCK_SOURCES)!;
      const entry = block.files[0].path;
      const selector = /selector:\s*'([^']+)'/.exec(BLOCK_SOURCES[entry])![1];

      expect(usage).toContain(`from './${entry.replace(/\.ts$/, '')}';`);
      expect(usage).toContain(`template: \`<${selector} />\``);
    },
  );

  it('returns null when the entry source is missing', () => {
    expect(blockUsage(BLOCKS[0], {})).toBeNull();
  });
});

describe('blockInstallCommands', () => {
  it.each(BLOCKS.map((block) => [block.name, block] as const))(
    '%s declares the ng-mapcn items its sources use',
    (_name, block) => {
      expect(block.mapcn).toEqual(blockItemsFromSources(block, BLOCK_SOURCES));
    },
  );

  it.each(BLOCKS.map((block) => [block.name, block] as const))(
    '%s adds its ng-mapcn items, then its zard/ui components',
    (_name, block) => {
      const [mapcn, zard] = blockInstallCommands(block);

      expect(mapcn).toBe(`npx ng-mapcn@latest add ${block.mapcn.join(' ')}`);
      expect(zard).toBe(
        block.zard.length ? `npx zard-cli@latest add ${block.zard.join(' ')}` : undefined,
      );
    },
  );

  it('falls back to init for a block that only needs the core', () => {
    expect(blockInstallCommands({ ...BLOCKS[0], mapcn: [], zard: [] })).toEqual([
      'npx ng-mapcn@latest init',
    ]);
  });
});
