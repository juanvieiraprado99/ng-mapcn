// Mirrors the library sources into schematics/map/files so the `map`
// schematic copies the exact same code the npm package ships. Run before
// building schematics (see build-schematics.mjs).
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const libSrc = join(root, 'projects', 'ng-mapcn', 'src');
const filesDir = join(root, 'projects', 'ng-mapcn', 'schematics', 'map', 'files');
const drawSrc = join(root, 'projects', 'ng-mapcn', 'draw', 'src');
const drawFilesDir = join(root, 'projects', 'ng-mapcn', 'schematics', 'map', 'draw-files');

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

// Opt-in `ng-mapcn/draw` sources (`ng add ng-mapcn --draw`), copied to <path>/draw. They stay out
// of `files/` because they import terra-draw, which apps without it do not have installed.
rmSync(drawFilesDir, { recursive: true, force: true });
mkdirSync(drawFilesDir, { recursive: true });
cpSync(drawSrc, drawFilesDir, {
  recursive: true,
  filter: (src) => !src.endsWith('.spec.ts'),
});
// The npm entry imports the core from the package; the copy imports the sibling index instead.
for (const file of readdirSync(drawFilesDir)) {
  const path = join(drawFilesDir, file);
  const code = readFileSync(path, 'utf8');
  if (code.includes("from 'ng-mapcn'")) {
    writeFileSync(path, code.replaceAll("from 'ng-mapcn'", "from '../index'"));
  }
}
cpSync(join(drawFilesDir, 'public-api.ts'), join(drawFilesDir, 'index.ts'));
rmSync(join(drawFilesDir, 'public-api.ts'));

console.log(`Synced library sources to ${filesDir} (draw: ${drawFilesDir})`);
