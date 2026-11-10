import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ALIAS,
  DEFAULT_PATH,
  defaultAliasFor,
  defaultPathFor,
  parseConfig,
  pickProject,
} from './defaults';

describe('parseConfig', () => {
  it('reads path, alias and project', () => {
    expect(parseConfig('{"path":"libs/maps","alias":"@maps","project":"web"}')).toEqual({
      path: 'libs/maps',
      alias: '@maps',
      project: 'web',
    });
  });

  it('defaults a missing alias (a hand-written file with only the path)', () => {
    expect(parseConfig('{"path":"libs/maps"}')).toEqual({
      path: 'libs/maps',
      alias: DEFAULT_ALIAS,
    });
  });

  it('rejects invalid JSON, a missing or blank path', () => {
    for (const text of ['{', '[]', 'null', '{"alias":"@maps"}', '{"path":"  "}', '{"path":3}']) {
      expect(parseConfig(text)).toBeNull();
    }
  });
});

describe('pickProject', () => {
  const app = { projectType: 'application' };
  const lib = { projectType: 'library' };

  it('prefers the requested project, then the saved one if it still exists', () => {
    expect(pickProject({ a: app, b: app }, 'b')).toEqual({ name: 'b' });
    expect(pickProject({ a: app, b: app }, undefined, 'b')).toEqual({ name: 'b' });
    expect(pickProject({ a: app }, undefined, 'gone').name).toBe('a');
  });

  it('picks the only application over a library listed first', () => {
    expect(pickProject({ ui: lib, web: app })).toEqual({ name: 'web' });
  });

  it('picks the first of several applications with a warning', () => {
    const choice = pickProject({ a: app, b: app });
    expect(choice.name).toBe('a');
    expect(choice.warning).toContain('--project');
  });

  it('falls back to the first project, or none', () => {
    expect(pickProject({ ui: lib })).toEqual({ name: 'ui' });
    expect(pickProject({})).toEqual({ name: undefined });
  });
});

describe('defaultPathFor', () => {
  it('puts the copy under the project source root', () => {
    expect(defaultPathFor(undefined)).toBe(DEFAULT_PATH);
    expect(defaultPathFor({ root: '', sourceRoot: 'src' })).toBe(DEFAULT_PATH);
    expect(defaultPathFor({ root: 'projects/web' })).toBe(
      'projects/web/src/app/shared/components/map',
    );
    expect(defaultPathFor({ sourceRoot: './projects/web/src/' })).toBe(
      'projects/web/src/app/shared/components/map',
    );
  });
});

describe('defaultAliasFor', () => {
  it('is @/ plus the folder inside the project app folder', () => {
    expect(defaultAliasFor(DEFAULT_PATH)).toBe('@/shared/components/map');
    expect(defaultAliasFor('src/app/components/ui/map')).toBe('@/components/ui/map');
    expect(defaultAliasFor('./src/app/maps/')).toBe('@/maps');
    expect(
      defaultAliasFor('projects/web/src/app/shared/components/map', { root: 'projects/web' }),
    ).toBe('@/shared/components/map');
  });

  it('falls back to the default alias outside the app folder', () => {
    expect(defaultAliasFor('libs/maps')).toBe(DEFAULT_ALIAS);
    expect(defaultAliasFor('src/app')).toBe(DEFAULT_ALIAS);
  });
});
