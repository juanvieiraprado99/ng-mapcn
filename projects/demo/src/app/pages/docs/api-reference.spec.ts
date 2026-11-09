import { describe, expect, it } from 'vitest';

import apiData from './api-reference.data.json';
import { API_REFERENCE_PT } from './api-reference.data.pt';

describe('API reference pt-BR glossary', () => {
  const rows = [
    ...apiData.provideStylesRows,
    ...apiData.provideLabelsRows,
    ...apiData.contextRows,
    ...apiData.sections.flatMap((section) => [...section.inputs, ...section.outputs]),
    ...apiData.testing.flatMap((entry) => entry.exports),
  ];
  const texts = [
    ...rows.map((row) => row.description),
    ...apiData.sections.map((section) => section.description),
    ...apiData.testing.map((entry) => entry.description),
  ];

  it('translates every description of the API reference data', () => {
    expect(texts.filter((text) => !(text in API_REFERENCE_PT))).toEqual([]);
  });

  it('has no entries left over from removed or reworded descriptions', () => {
    const current = new Set(texts);
    expect(Object.keys(API_REFERENCE_PT).filter((text) => !current.has(text))).toEqual([]);
  });
});
