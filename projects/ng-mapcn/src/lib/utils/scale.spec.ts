import { describe, expect, it } from 'vitest';

import { computeScale, metersPerPixel } from './scale';

describe('metersPerPixel', () => {
  it('is the equatorial resolution at zoom 0', () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(78271.517, 2);
  });
});

describe('computeScale', () => {
  it('metric, zoom 0 at the equator', () => {
    expect(computeScale(metersPerPixel(0, 0), 100, 'metric')).toEqual({
      value: 5000,
      unit: 'kilometer',
      width: expect.closeTo(63.88, 2),
    });
  });

  it('latitude shrinks the distance', () => {
    expect(computeScale(metersPerPixel(60, 0), 100, 'metric')).toMatchObject({
      value: 2000,
      unit: 'kilometer',
      width: expect.closeTo(51.1, 1),
    });
  });

  it('metres at street zoom', () => {
    expect(computeScale(metersPerPixel(0, 20), 100, 'metric')).toMatchObject({
      value: 5,
      unit: 'meter',
      width: expect.closeTo(66.98, 2),
    });
  });

  it('imperial miles', () => {
    expect(computeScale(metersPerPixel(0, 10), 100, 'imperial')).toMatchObject({
      value: 2,
      unit: 'mile',
      width: expect.closeTo(42.11, 2),
    });
  });

  it('imperial feet', () => {
    expect(computeScale(metersPerPixel(0, 20), 100, 'imperial')).toMatchObject({
      value: 20,
      unit: 'foot',
      width: expect.closeTo(81.67, 2),
    });
  });

  it('stays round and within maxWidth at the extremes', () => {
    for (const lat of [-85, -60, 0, 60, 85]) {
      for (let zoom = 0; zoom <= 22; zoom++) {
        for (const system of ['metric', 'imperial'] as const) {
          const { value, width } = computeScale(metersPerPixel(lat, zoom), 100, system);
          expect(width).toBeLessThanOrEqual(100);
          expect(width).toBeGreaterThan(0);
          const mantissa = value / 10 ** Math.floor(Math.log10(value));
          expect([1, 2, 5]).toContain(Math.round(mantissa * 1e9) / 1e9);
        }
      }
    }
  });
});
