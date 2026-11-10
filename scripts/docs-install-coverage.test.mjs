// Every registry item (except core, which `init` copies) must be imported by at least one docs
// snippet, so its page shows an `npx ng-mapcn@latest add <item>` command (see
// projects/demo/src/app/shared/example-section.ts). A new component fails here until a docs
// example imports it or uses its element.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const docs = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'projects',
  'demo',
  'src',
  'app',
  'pages',
  'docs',
);

const generated = readFileSync(join(docs, 'registry-items.generated.ts'), 'utf8');
const items = JSON.parse(
  generated
    .slice(generated.indexOf('= [') + 2)
    .trim()
    .replace(/;$/, ''),
);

// Snippets are template literals assigned to constants (`const SCALE_CODE = \`...\``).
const SNIPPET = /= `((?:\\.|[^`\\])*)`/g;
const IMPORT = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]ng-mapcn(?:\/draw)?['"]/g;

function snippets() {
  const dir = join(docs, 'components');
  return readdirSync(dir)
    .filter((f) => f.endsWith('-page.ts'))
    .flatMap((file) =>
      [...readFileSync(join(dir, file), 'utf8').matchAll(SNIPPET)].map((m) => m[1]),
    );
}

function importedNames(snippet) {
  return [...snippet.matchAll(IMPORT)].flatMap(([, list]) =>
    list.split(',').map((part) =>
      part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]
        .trim(),
    ),
  );
}

test('every registry item has a docs snippet that shows its add command', () => {
  const all = snippets();
  assert.ok(all.length > 50, `expected the docs snippets, found ${all.length}`);
  const imported = new Set(all.flatMap(importedNames));
  const tagged = (selector) => all.some((s) => new RegExp(`<${selector}(?=[\\s/>])`).test(s));
  const missing = items
    .filter(
      (item) =>
        item.name !== 'core' &&
        !item.exports.some((name) => imported.has(name)) &&
        !item.selectors.some(tagged),
    )
    .map((item) => item.name);
  assert.deepEqual(missing, []);
});

test('the generated registry docs list exports and selectors for every item', () => {
  for (const item of items) {
    assert.ok(item.exports.length > 0, `${item.name} has no exports`);
    assert.ok(item.selectors.length > 0, `${item.name} has no selectors`);
  }
});
