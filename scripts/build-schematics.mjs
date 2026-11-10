// Builds the schematics into dist/ng-mapcn/schematics. Run after
// `ng build ng-mapcn` (which creates dist/ng-mapcn).
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schematicsSrc = join(root, 'projects', 'ng-mapcn', 'schematics');
const outDir = join(root, 'dist', 'ng-mapcn', 'schematics');

execSync('node scripts/sync-schematic-files.mjs', { cwd: root, stdio: 'inherit' });
execSync('npx --no-install tsc -p projects/ng-mapcn/tsconfig.schematics.json', {
  cwd: root,
  stdio: 'inherit',
});

mkdirSync(outDir, { recursive: true });

// The schematics compile to CommonJS (module: node16 + no "type" in the schematics package),
// but dist/ng-mapcn/package.json declares "type": "module". Without this marker, loading the
// compiled files through an ESM-aware loader fails with "exports is not defined in ES module
// scope". Making the format explicit keeps plain `require()` (used by `ng add`) working.
writeFileSync(join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
cpSync(join(schematicsSrc, 'collection.json'), join(outDir, 'collection.json'));
cpSync(join(schematicsSrc, 'ng-add', 'schema.json'), join(outDir, 'ng-add', 'schema.json'));
cpSync(join(schematicsSrc, 'map', 'schema.json'), join(outDir, 'map', 'schema.json'));
cpSync(join(schematicsSrc, 'registry.json'), join(outDir, 'registry.json'));
cpSync(join(schematicsSrc, 'add', 'files'), join(outDir, 'add', 'files'), { recursive: true });
// Task 4 creates add/schema.json; the legacy map/* copies go away with it.
if (existsSync(join(schematicsSrc, 'add', 'schema.json'))) {
  cpSync(join(schematicsSrc, 'add', 'schema.json'), join(outDir, 'add', 'schema.json'));
}
for (const legacy of ['files', 'draw-files']) {
  const from = join(schematicsSrc, 'map', legacy);
  if (existsSync(from)) cpSync(from, join(outDir, 'map', legacy), { recursive: true });
}

console.log(`Schematics built to ${outDir}`);
