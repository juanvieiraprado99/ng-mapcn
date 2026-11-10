// The docs show every ng-mapcn import as the alias `init` maps by default: the two constants must
// agree (projects/demo/src/app/shared/copy-paste-imports.ts and schematics/utils/defaults.ts).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const constant = (file, name) => {
  const match = new RegExp(`export const ${name} = '([^']+)'`).exec(
    readFileSync(join(root, file), 'utf8'),
  );
  assert.ok(match, `${name} not found in ${file}`);
  return match[1];
};

test('the docs alias is the CLI default alias', () => {
  assert.equal(
    constant('projects/demo/src/app/shared/copy-paste-imports.ts', 'COPY_PASTE_ALIAS'),
    constant('projects/ng-mapcn/schematics/utils/defaults.ts', 'DEFAULT_ALIAS'),
  );
});
