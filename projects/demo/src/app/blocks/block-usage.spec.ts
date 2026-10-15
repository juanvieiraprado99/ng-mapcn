import { describe, expect, it } from 'vitest';

import { BLOCK_SOURCES } from './block-sources.generated';
import { blockUsage } from './block-usage';
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
