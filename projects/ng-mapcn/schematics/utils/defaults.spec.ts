import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ALIAS,
  DEFAULT_PATH,
  defaultAliasFor,
  defaultPathFor,
  initTarget,
  LEGACY_PATH,
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

  it('throws on invalid JSON (a hand edit left a trailing comma), saying what to fix', () => {
    expect(() => parseConfig('{ "path": "libs/maps", }')).toThrow(
      /ng-mapcn\.json is not valid JSON/,
    );
  });

  it('throws without a usable path', () => {
    for (const text of ['[]', 'null', '{"alias":"@maps"}', '{"path":"  "}', '{"path":3}']) {
      expect(() => parseConfig(text)).toThrow(/needs a "path"/);
    }
  });
});

describe('pickProject', () => {
  const app = { projectType: 'application' };
  const lib = { projectType: 'library' };

  it('throws on a requested project that does not exist, listing the projects', () => {
    expect(() => pickProject({ myapp: app }, 'myap')).toThrow(
      'Project "myap" not found in angular.json. Projects: myapp.',
    );
  });

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

describe('initTarget', () => {
  const saved = { path: 'projects/a/src/app/maps', alias: '@a/maps', project: 'a' };
  const projectB = { root: 'projects/b' };

  it('keeps the saved folder and alias for the saved project', () => {
    const target = initTarget({
      saved,
      legacyExists: false,
      projectName: 'a',
      project: { root: 'projects/a' },
    });
    expect(target).toMatchObject({ path: saved.path, alias: '@a/maps', legacy: false });
    expect(target.aliasFor(saved.path)).toBe('@a/maps');
  });

  it('gives another project its own default folder and alias', () => {
    const target = initTarget({ saved, legacyExists: false, projectName: 'b', project: projectB });
    expect(target).toMatchObject({
      path: 'projects/b/src/app/shared/components/map',
      alias: '@/shared/components/map',
      legacy: false,
    });
    expect(target.aliasFor(saved.path)).not.toBe('@a/maps');
  });

  it('adopts an earlier copy only without a saved config', () => {
    expect(
      initTarget({ saved: null, legacyExists: true, projectName: 'x', project: undefined }),
    ).toMatchObject({ path: LEGACY_PATH, alias: '@/components/ui/map', legacy: true });
    expect(
      initTarget({ saved, legacyExists: true, projectName: 'a', project: undefined }).path,
    ).toBe(saved.path);
  });

  it('falls back to the project default folder', () => {
    expect(
      initTarget({ saved: null, legacyExists: false, projectName: 'b', project: projectB }),
    ).toMatchObject({
      path: 'projects/b/src/app/shared/components/map',
      alias: '@/shared/components/map',
    });
  });
});
