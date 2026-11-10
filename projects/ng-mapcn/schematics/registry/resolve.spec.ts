import { describe, expect, it } from 'vitest';

import { normalizeItemName, resolve } from './resolve';
import type { Registry, RegistryItem } from './types';

function item(name: string, over: Partial<RegistryItem> = {}): RegistryItem {
  return { name, description: '', files: [], registryDependencies: [], dependencies: {}, ...over };
}

const registry: Registry = {
  version: 1,
  items: {
    core: item('core', { files: ['utils/a.ts'] }),
    route: item('route', { files: ['utils/a.ts', 'route/r.ts'], registryDependencies: ['core'] }),
    'route-playback': item('route-playback', {
      files: ['route/r.ts', 'playback/p.ts'],
      registryDependencies: ['core', 'route'],
      dependencies: { foo: '^1.0.0' },
    }),
    draw: item('draw', {
      files: ['draw/d.ts'],
      registryDependencies: ['core'],
      dependencies: { 'terra-draw': '^1.37.0' },
    }),
  },
  exports: [],
};

describe('resolve', () => {
  it('resolves the closure with core first', () => {
    expect(resolve(registry, ['route-playback']).items).toEqual([
      'core',
      'route',
      'route-playback',
    ]);
  });

  it('always includes core for an empty list', () => {
    expect(resolve(registry, []).items).toEqual(['core']);
  });

  it('all selects every item except draw', () => {
    expect(resolve(registry, [], { all: true }).items).not.toContain('draw');
    expect(resolve(registry, ['draw'], { all: true }).items).toContain('draw');
  });

  it('normalizes item names', () => {
    expect(normalizeItemName('  Map-Route ')).toBe('route');
    expect(resolve(registry, ['Map-Route', 'route-playback,route']).items).toEqual([
      'core',
      'route',
      'route-playback',
    ]);
  });

  it('de-duplicates shared files and merges dependencies', () => {
    const r = resolve(registry, ['route-playback', 'draw']);
    expect(r.files).toEqual(['utils/a.ts', 'route/r.ts', 'playback/p.ts', 'draw/d.ts']);
    expect(r.dependencies).toEqual({ foo: '^1.0.0', 'terra-draw': '^1.37.0' });
  });

  it('rejects unknown names and lists the valid ones', () => {
    expect(() => resolve(registry, ['nope'])).toThrow(
      /Unknown component\(s\): nope\. Available: core, draw, route, route-playback/,
    );
  });
});
