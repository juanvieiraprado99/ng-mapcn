// Mirrors the library sources into schematics/add/files (one tree laid out exactly as the copy) and
// emits schematics/registry.json, so the `add` schematic copies the exact same code the npm package
// ships. Run before building schematics (see build-schematics.mjs).
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRegistry, realPaths, writeRegistry } from './generate-registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schematicsDir = join(root, 'projects', 'ng-mapcn', 'schematics');
const filesDir = join(schematicsDir, 'add', 'files');
const paths = realPaths(root);

// Legacy layout of the `map` schematic, replaced by add/files.
rmSync(join(schematicsDir, 'map', 'files'), { recursive: true, force: true });
rmSync(join(schematicsDir, 'map', 'draw-files'), { recursive: true, force: true });

rmSync(filesDir, { recursive: true, force: true });
mkdirSync(filesDir, { recursive: true });

const isSpec = (src) => src.endsWith('.spec.ts');
const isTesting = (src) => /[\/]testing([\/]|$)/.test(src);

cpSync(paths.libDir, filesDir, {
  recursive: true,
  filter: (src) => !isSpec(src) && !isTesting(src),
});

// Opt-in `ng-mapcn/draw` sources, copied to <path>/draw. The npm entry imports the core from the
// package; the copy imports the sibling index instead.
const drawFilesDir = join(filesDir, 'draw');
mkdirSync(drawFilesDir, { recursive: true });
cpSync(paths.drawDir, drawFilesDir, {
  recursive: true,
  filter: (src) => !isSpec(src) && !isTesting(src),
});
for (const file of readdirSync(drawFilesDir)) {
  const path = join(drawFilesDir, file);
  const code = readFileSync(path, 'utf8');
  if (code.includes("from 'ng-mapcn'")) {
    writeFileSync(path, code.replaceAll("from 'ng-mapcn'", "from '../index'"));
  }
}
cpSync(join(drawFilesDir, 'public-api.ts'), join(drawFilesDir, 'index.ts'));
rmSync(join(drawFilesDir, 'public-api.ts'));

const registryFile = join(schematicsDir, 'registry.json');
writeRegistry(registryFile, buildRegistry(paths));

console.log(`Synced library sources to ${filesDir} and registry to ${registryFile}`);
