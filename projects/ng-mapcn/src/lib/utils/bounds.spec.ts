import { describe, expect, it } from 'vitest';

import { coordinatesBounds, geoJsonBounds, sameBounds, toBoundsTuple, unionBounds } from './bounds';

describe('bounds utils', () => {
  it('normalizes the LngLatBoundsLike shapes', () => {
    expect(toBoundsTuple([1, 2, 3, 4])).toEqual([1, 2, 3, 4]);
    expect(
      toBoundsTuple([
        [1, 2],
        [3, 4],
      ]),
    ).toEqual([1, 2, 3, 4]);
    expect(
      toBoundsTuple([
        { lng: 1, lat: 2 },
        { lon: 3, lat: 4 },
      ] as any),
    ).toEqual([1, 2, 3, 4]);
    const lngLatBounds = {
      getWest: () => 1,
      getSouth: () => 2,
      getEast: () => 3,
      getNorth: () => 4,
    };
    expect(toBoundsTuple(lngLatBounds as any)).toEqual([1, 2, 3, 4]);
  });

  it('rejects invalid input', () => {
    expect(toBoundsTuple(null)).toBeNull();
    expect(toBoundsTuple([1, 2] as any)).toBeNull();
    expect(toBoundsTuple([1, 2, NaN, 4])).toBeNull();
  });

  it('unions bounds and ignores empty contributions', () => {
    expect(unionBounds([[0, 0, 1, 1], null, [-2, 3, 0.5, 4], undefined])).toEqual([-2, 0, 1, 4]);
    expect(unionBounds([null])).toBeNull();
  });

  it('computes bounds of positions', () => {
    expect(coordinatesBounds([[1, 5], [-3, 2], null, [4, 0]])).toEqual([-3, 0, 4, 5]);
    expect(coordinatesBounds([])).toBeNull();
  });

  it('computes bounds of GeoJSON of every shape and skips URLs', () => {
    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: null, geometry: { type: 'Point', coordinates: [10, 20] } },
        {
          type: 'Feature',
          properties: null,
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-5, 0],
                [5, 0],
                [5, 8],
                [-5, 0],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: null,
          geometry: {
            type: 'GeometryCollection',
            geometries: [
              {
                type: 'LineString',
                coordinates: [
                  [30, -4],
                  [31, 1],
                ],
              },
            ],
          },
        },
      ],
    };
    expect(geoJsonBounds(fc)).toEqual([-5, -4, 31, 20]);
    expect(geoJsonBounds({ type: 'Point', coordinates: [1, 2] })).toEqual([1, 2, 1, 2]);
    expect(geoJsonBounds('https://x/y.json')).toBeNull();
    expect(geoJsonBounds({ type: 'FeatureCollection', features: [] })).toBeNull();
  });

  it('compares bounds by value', () => {
    expect(sameBounds([1, 2, 3, 4], [1, 2, 3, 4])).toBe(true);
    expect(sameBounds([1, 2, 3, 4], [1, 2, 3, 5])).toBe(false);
    expect(sameBounds(null, null)).toBe(true);
    expect(sameBounds(null, [1, 2, 3, 4])).toBe(false);
  });
});
