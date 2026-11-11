import { describe, expect, it } from 'vitest';

import { BARREL_HEADER, renderBarrel } from './barrel';
import type { Registry } from './types';

const registry: Registry = {
  version: '1',
  items: {},
  exports: [
    { line: "export * from './a';", file: 'a.ts' },
    { line: "export * from './b';", file: 'b.ts' },
    { line: "export * from './c';", file: 'c.ts' },
  ],
};

describe('renderBarrel', () => {
  it('keeps public-api order and filters by presence', () => {
    const out = renderBarrel(registry, (f) => f !== 'b.ts');
    expect(out.startsWith(BARREL_HEADER)).toBe(true);
    expect(out).toBe(`${BARREL_HEADER}\nexport * from './a';\nexport * from './c';\n`);
  });
});
