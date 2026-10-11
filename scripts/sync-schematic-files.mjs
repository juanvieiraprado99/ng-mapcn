// Mirrors the library sources into schematics/map/files so the `map`
// schematic copies the exact same code the npm package ships. Run before
// building schematics (see build-schematics.mjs).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const libSrc = join(root, 'projects', 'ng-mapcn', 'src');
const filesDir = join(root, 'projects', 'ng-mapcn', 'schematics', 'map', 'files');

rmSync(filesDir, { recursive: true, force: true });
mkdirSync(filesDir, { recursive: true });

cpSync(join(libSrc, 'lib'), filesDir, {
  recursive: true,
  filter: (src) => !src.endsWith('.spec.ts'),
});

// public-api.ts exports from './lib/...'; the copied tree drops the lib/ level.
const publicApi = readFileSync(join(libSrc, 'public-api.ts'), 'utf8');
const index = publicApi.replaceAll('./lib/', './');
writeFileSync(join(filesDir, 'index.ts'), index);

console.log(`Synced library sources to ${filesDir}`);
