import { describe, expect, it } from 'vitest';

import { PLAYGROUND_PT, playgroundText } from './playground.pt';
import { PLAYGROUND_EXAMPLES } from './playground-examples';
import type { Control } from './playground-schema';
import { PLAYGROUND_SPECS } from './playground-specs';
import { MAP_CONTROLS, STYLE_PRESETS } from './style-presets';

/** Every text of a control the playground displays. Options whose label is their value
 * (anchor names like `top`) are code, not prose, and stay as they are. */
function controlTexts(control: Control): string[] {
  const texts = [control.label];
  if (control.description) texts.push(control.description);
  if (control.kind === 'select') {
    for (const option of control.options) {
      if (option.label !== option.value) texts.push(option.label);
    }
  }
  return texts;
}

describe('playground pt-BR glossary', () => {
  it('translates every displayed text of the specs, presets, map controls and examples', () => {
    const texts = [
      ...PLAYGROUND_SPECS.flatMap((spec) => [
        spec.label,
        spec.description,
        ...spec.controls.flatMap(controlTexts),
      ]),
      ...STYLE_PRESETS.flatMap((preset) => [
        preset.label,
        preset.description,
        ...(preset.note ? [preset.note] : []),
      ]),
      ...MAP_CONTROLS.flatMap(controlTexts),
      ...PLAYGROUND_EXAMPLES.flatMap((example) => [example.title, example.description]),
    ];

    expect(texts.filter((text) => !(text in PLAYGROUND_PT))).toEqual([]);
  });

  it('falls back to the English text', () => {
    expect(playgroundText('Opacity', true)).toBe('Opacidade');
    expect(playgroundText('Opacity', false)).toBe('Opacity');
    expect(playgroundText('not in the glossary', true)).toBe('not in the glossary');
  });
});
