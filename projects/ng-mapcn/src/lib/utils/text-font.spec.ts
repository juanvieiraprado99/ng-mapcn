import { type Map as MapLibreMap } from 'maplibre-gl';
import { describe, expect, it } from 'vitest';

import { basemapTextFont, FALLBACK_TEXT_FONT, fontStack } from './text-font';

const mapWith = (layers: unknown[]) => ({ getStyle: () => ({ layers }) }) as unknown as MapLibreMap;
const symbol = (font: unknown) => ({ id: 'l', type: 'symbol', layout: { 'text-font': font } });

describe('fontStack', () => {
  it('accepts literal stacks and wrapped literals', () => {
    expect(fontStack(['Montserrat Medium'])).toEqual(['Montserrat Medium']);
    expect(fontStack(['literal', ['Stadia Bold']])).toEqual(['Stadia Bold']);
  });

  it('rejects expressions and non-arrays', () => {
    expect(fontStack(['get', 'font'])).toBeNull();
    expect(fontStack('Noto')).toBeNull();
    expect(fontStack([])).toBeNull();
  });
});

describe('basemapTextFont', () => {
  it('prefers upright stacks over italic ones', () => {
    const map = mapWith([symbol(['Noto Sans Italic']), symbol(['Noto Sans Regular'])]);
    expect(basemapTextFont(map)).toEqual(['Noto Sans Regular']);
  });

  it('falls back to italic, then to the default stack', () => {
    expect(basemapTextFont(mapWith([symbol(['Noto Sans Italic'])]))).toEqual(['Noto Sans Italic']);
    expect(basemapTextFont(mapWith([symbol(['get', 'f'])]))).toEqual(FALLBACK_TEXT_FONT);
  });
});
