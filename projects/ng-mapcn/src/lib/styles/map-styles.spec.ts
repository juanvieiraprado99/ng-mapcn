import { describe, expect, it } from 'vitest';

import { blankMapStyle, defaultStyles, getDarkMapStyle, getLightMapStyle } from './map-styles';

describe('map styles', () => {
  it('returns the Carto positron style for light', () => {
    expect(getLightMapStyle()).toBe(
      'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    );
    expect(getLightMapStyle()).toBe(defaultStyles.light);
  });

  it('returns the Carto dark-matter style for dark', () => {
    expect(getDarkMapStyle()).toBe(
      'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    );
    expect(getDarkMapStyle()).toBe(defaultStyles.dark);
  });

  it('blankMapStyle is a version 8 style without tile sources', () => {
    expect(blankMapStyle.version).toBe(8);
    expect(blankMapStyle.sources).toEqual({});
  });

  it('blankMapStyle only has a transparent background layer', () => {
    expect(blankMapStyle.layers).toHaveLength(1);
    expect(blankMapStyle.layers[0]).toMatchObject({
      type: 'background',
      paint: { 'background-color': 'rgba(0, 0, 0, 0)' },
    });
  });
});
