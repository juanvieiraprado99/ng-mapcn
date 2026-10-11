import { describe, expect, it } from 'vitest';

import { nextId } from './map-utils';

describe('nextId', () => {
  it('returns ids with the given prefix', () => {
    expect(nextId('src')).toMatch(/^src-\d+$/);
  });
});
