import { describe, expect, it } from 'vitest';

import { buildArcCoordinates, getViewport, mergeHoverPaint, nextId } from './map-utils';

describe('nextId', () => {
  it('returns ids with the given prefix', () => {
    expect(nextId('src')).toMatch(/^src-\d+$/);
  });

  it('returns different ids for the same prefix', () => {
    expect(nextId('layer')).not.toBe(nextId('layer'));
  });
});

describe('getViewport', () => {
  it('maps the map camera to a MapViewport', () => {
    const map = {
      getCenter: () => ({ lng: 10, lat: 20 }),
      getZoom: () => 4,
      getBearing: () => 15,
      getPitch: () => 30,
    };
    expect(getViewport(map as any)).toEqual({
      center: [10, 20],
      zoom: 4,
      bearing: 15,
      pitch: 30,
    });
  });
});

describe('mergeHoverPaint', () => {
  const base = { 'line-color': '#000', 'line-width': 2 };

  it('returns the same object when there is no hover paint', () => {
    expect(mergeHoverPaint(base, undefined)).toBe(base);
  });

  it('wraps overridden keys in a feature-state hover case expression', () => {
    const merged = mergeHoverPaint(base, { 'line-color': '#f00' } as any);
    expect(merged['line-color']).toEqual([
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      '#f00',
      '#000',
    ]);
  });

  it('leaves keys that are not overridden untouched', () => {
    const merged = mergeHoverPaint(base, { 'line-color': '#f00' } as any);
    expect(merged['line-width']).toBe(2);
  });

  it('uses the plain hover value when the key has no base value', () => {
    const merged = mergeHoverPaint(
      { 'line-color': '#000' } as any,
      {
        'line-opacity': 0.5,
      } as any,
    ) as Record<string, unknown>;
    expect(merged['line-opacity']).toBe(0.5);
  });

  it('skips undefined hover values', () => {
    const merged = mergeHoverPaint(base, { 'line-color': undefined } as any);
    expect(merged['line-color']).toBe('#000');
  });

  it('does not mutate the base paint', () => {
    mergeHoverPaint(base, { 'line-color': '#f00' } as any);
    expect(base['line-color']).toBe('#000');
  });
});

describe('buildArcCoordinates', () => {
  it('returns just the endpoints when curvature is 0', () => {
    expect(buildArcCoordinates([0, 0], [10, 10], 0, 16)).toEqual([
      [0, 0],
      [10, 10],
    ]);
  });

  it('returns 2 points for identical points', () => {
    expect(buildArcCoordinates([5, 5], [5, 5], 0.3, 16)).toHaveLength(2);
  });

  it('returns samples + 1 points with exact endpoints', () => {
    const points = buildArcCoordinates([0, 0], [10, 20], 0.2, 16);
    expect(points).toHaveLength(17);
    expect(points[0]).toEqual([0, 0]);
    expect(points[16][0]).toBeCloseTo(10, 12);
    expect(points[16][1]).toBeCloseTo(20, 12);
  });

  it('clamps samples to at least 2 segments', () => {
    expect(buildArcCoordinates([0, 0], [10, 0], 0.2, 1)).toHaveLength(3);
  });

  it('unwraps the destination longitude across the antimeridian', () => {
    const points = buildArcCoordinates([139.7, 35.7], [-122.4, 37.8], 0.2, 16);
    expect(points[points.length - 1][0]).toBeCloseTo(237.6, 9);
  });

  it('bends towards positive y for positive curvature', () => {
    const points = buildArcCoordinates([0, 0], [10, 0], 0.2, 16);
    expect(points[8][1]).toBeGreaterThan(0);
  });

  it('bends towards negative y for negative curvature', () => {
    const points = buildArcCoordinates([0, 0], [10, 0], -0.2, 16);
    expect(points[8][1]).toBeLessThan(0);
  });
});
