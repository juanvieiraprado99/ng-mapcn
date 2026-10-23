import { describe, expect, it } from 'vitest';

import { PLAYGROUND_EXAMPLES } from './playground-examples';
import { decodeScene, encodeScene, LAYER_SPECS } from './playground-scene';
import { findSpec } from './playground-specs';
import { STYLE_PRESETS } from './style-presets';

describe('playground examples', () => {
  it('have unique ids', () => {
    const ids = PLAYGROUND_EXAMPLES.map((example) => example.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const example of PLAYGROUND_EXAMPLES) {
    describe(example.id, () => {
      const scene = example.scene();

      it('lists the blocks of its stack', () => {
        expect(scene.layers.map((layer) => layer.specId)).toEqual(example.blocks);
        for (const id of example.blocks) {
          expect(LAYER_SPECS.map((spec) => spec.id)).toContain(id);
        }
      });

      it('only uses values its controls can take (survives a shared link unchanged)', () => {
        expect(decodeScene(encodeScene(scene))).toEqual(scene);
      });

      it('sets every changed value on a real control', () => {
        for (const layer of scene.layers) {
          const keys = findSpec(layer.specId).controls.map((control) => control.key);
          expect(Object.keys(layer.values).sort()).toEqual([...keys].sort());
        }
      });

      it('uses a known basemap', () => {
        expect(STYLE_PRESETS.map((preset) => preset.id)).toContain(scene.map.presetId);
      });
    });
  }
});
