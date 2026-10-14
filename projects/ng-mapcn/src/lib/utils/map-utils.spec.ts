import { describe, expect, it } from 'vitest';

import {
  buildArcCoordinates,
  cumulativeLengths,
  getViewport,
  mergeHoverPaint,
  nextId,
  pointAlongLine,
  sliceLineByProgress,
} from './map-utils';

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

describe('sliceLineByProgress / pointAlongLine', () => {
  // Segment 1 is 1 degree long, segment 2 is 3 degrees (total 4).
  const line: [number, number][] = [
    [0, 0],
    [1, 0],
    [4, 0],
  ];

  it('gives identical results with a precomputed cumulative array', () => {
    const wiggly: [number, number][] = [
      [0, 0],
      [1, 1],
      [1, 1],
      [3, 2],
      [4, -1],
      [10, 5],
    ];
    const cum = cumulativeLengths(wiggly);
    expect(cum).toHaveLength(wiggly.length);
    expect(cum[0]).toBe(0);
    for (let i = 0; i <= 40; i++) {
      const f = i / 40;
      expect(sliceLineByProgress(wiggly, f, cum)).toEqual(sliceLineByProgress(wiggly, f));
      expect(pointAlongLine(wiggly, f, cum)).toEqual(pointAlongLine(wiggly, f));
    }
    expect(cumulativeLengths([])).toEqual([]);
  });

  it('returns the first vertex only at progress 0', () => {
    expect(sliceLineByProgress(line, 0)).toEqual([[0, 0]]);
    expect(pointAlongLine(line, 0)).toEqual([0, 0]);
  });

  it('returns the whole line (a copy) at progress 1', () => {
    const out = sliceLineByProgress(line, 1);
    expect(out).toEqual(line);
    expect(out).not.toBe(line);
    expect(pointAlongLine(line, 1)).toEqual([4, 0]);
  });

  it('interpolates inside a segment', () => {
    const two: [number, number][] = [
      [0, 0],
      [2, 0],
    ];
    const out = sliceLineByProgress(two, 0.5);
    expect(out).toHaveLength(2);
    expect(out[1][0]).toBeCloseTo(1, 6);
    expect(pointAlongLine(two, 0.5)![0]).toBeCloseTo(1, 6);
  });

  it('weights by distance, not by vertex count (uneven segments)', () => {
    const early = sliceLineByProgress(line, 0.125);
    expect(early).toHaveLength(2);
    expect(early[1][0]).toBeCloseTo(0.5, 6);
    const half = sliceLineByProgress(line, 0.5);
    expect(half).toHaveLength(3);
    expect(half[1]).toEqual([1, 0]);
    expect(half[2][0]).toBeCloseTo(2, 6);
  });

  it('clamps out-of-range and non-finite progress', () => {
    expect(sliceLineByProgress(line, -1)).toEqual([[0, 0]]);
    expect(sliceLineByProgress(line, 7)).toEqual(line);
    expect(pointAlongLine(line, Number.NaN)).toEqual([0, 0]);
  });

  it('handles degenerate inputs', () => {
    expect(sliceLineByProgress([], 0.5)).toEqual([]);
    expect(pointAlongLine([], 0.5)).toBeNull();
    expect(sliceLineByProgress([[3, 4]], 0.5)).toEqual([[3, 4]]);
    expect(pointAlongLine([[3, 4]], 0.5)).toEqual([3, 4]);
    const same: [number, number][] = [
      [1, 1],
      [1, 1],
    ];
    expect(sliceLineByProgress(same, 0.5)).toEqual([[1, 1]]);
    expect(pointAlongLine(same, 0.5)).toEqual([1, 1]);
  });
});
