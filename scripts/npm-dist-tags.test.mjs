import assert from 'node:assert/strict';
import { test } from 'node:test';

import { distTags, parseVersions } from './npm-dist-tags.mjs';

test('stable release goes to latest only', () => {
  assert.deepEqual(distTags('22.0.0', []), { publishTag: 'latest', alsoLatest: false });
});

test('prerelease without a stable of the same major also moves latest', () => {
  assert.deepEqual(distTags('22.0.0-beta.1', ['22.0.0-beta.0', '21.0.0-beta.7']), {
    publishTag: 'beta',
    alsoLatest: true,
  });
});

test('prerelease after a stable of the same major stays on beta', () => {
  assert.deepEqual(distTags('22.1.0-beta.0', ['22.0.0']), {
    publishTag: 'beta',
    alsoLatest: false,
  });
});

test('prerelease of a new major without a stable also moves latest', () => {
  assert.deepEqual(distTags('23.0.0-beta.0', ['22.0.0']), {
    publishTag: 'beta',
    alsoLatest: true,
  });
});

test('first prerelease with no published versions also moves latest', () => {
  assert.deepEqual(distTags('22.0.0-beta.2', []), { publishTag: 'beta', alsoLatest: true });
});

test('parses a version list', () => {
  assert.deepEqual(parseVersions('["21.0.0","22.0.0-beta.0"]'), ['21.0.0', '22.0.0-beta.0']);
});

test('parses a single version', () => {
  assert.deepEqual(parseVersions('"22.0.0"'), ['22.0.0']);
});

test('rejects unparseable output instead of assuming nothing is published', () => {
  assert.throws(() => parseVersions('npm error network'));
});
