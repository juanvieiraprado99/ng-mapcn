import assert from 'node:assert/strict';
import { test } from 'node:test';

import { distTags } from './npm-dist-tags.mjs';

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
