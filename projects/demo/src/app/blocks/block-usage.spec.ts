import { describe, expect, it } from 'vitest';

import { BLOCK_SOURCES } from './block-sources.generated';
import { blockInstallCommands, blockUsage } from './block-usage';
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
    '%s adds the ng-mapcn items it uses, then its zard/ui components',
    (_name, block) => {
      const [mapcn, zard] = blockInstallCommands(block, BLOCK_SOURCES);

      expect(mapcn).toMatch(/^npx ng-mapcn@latest add [a-z-]+( [a-z-]+)*$/);
      expect(zard).toBe(
        block.zard.length ? `npx zard-cli@latest add ${block.zard.join(' ')}` : undefined,
      );
    },
  );

  it('lists the items of every file of the block', () => {
    const block = BLOCKS.find((b) => b.name === 'analytics-map')!;
    const [mapcn] = blockInstallCommands(block, BLOCK_SOURCES);
    expect(mapcn).toContain('marker-content');
  });

  it('falls back to init while the sources are missing', () => {
    expect(blockInstallCommands({ ...BLOCKS[0], zard: [] }, {})).toEqual([
      'npx ng-mapcn@latest init',
    ]);
  });
});
