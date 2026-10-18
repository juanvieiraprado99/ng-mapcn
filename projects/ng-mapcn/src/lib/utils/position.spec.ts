import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { isValidLngLat, positionReady } from './position';

describe('isValidLngLat', () => {
  it('accepts finite coordinates within the latitude range', () => {
    expect(isValidLngLat(-46.6, -23.5)).toBe(true);
    expect(isValidLngLat(540, 90)).toBe(true);
  });

  it('rejects NaN, infinities, out-of-range latitudes and non-numbers', () => {
    expect(isValidLngLat(Number.NaN, 0)).toBe(false);
    expect(isValidLngLat(0, Number.POSITIVE_INFINITY)).toBe(false);
    expect(isValidLngLat(0, 91)).toBe(false);
    expect(isValidLngLat(undefined, 0)).toBe(false);
    expect(isValidLngLat('1', 2)).toBe(false);
  });
});

describe('positionReady', () => {
  it('turns true once the position is valid and stays true', () => {
    const lng = signal<number | undefined>(undefined);
    const lat = signal<number | undefined>(undefined);
    const ready = positionReady(lng, lat);

    expect(ready()).toBe(false);
    lng.set(1);
    lat.set(2);
    expect(ready()).toBe(true);
    lng.set(undefined);
    expect(ready()).toBe(true);
  });
});
