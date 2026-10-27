import { describe, expect, it } from 'vitest';

import { clamp01 } from './clamp';

describe('clamp01', () => {
  it('clamps to 0-1 and maps NaN to 0', () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
  });
});
