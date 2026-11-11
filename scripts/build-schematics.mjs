// Builds the schematics into dist/ng-mapcn/schematics. Run after
// `ng build ng-mapcn` (which creates dist/ng-mapcn).
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
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
cpSync(join(schematicsSrc, 'registry.json'), join(outDir, 'registry.json'));
cpSync(join(schematicsSrc, 'add', 'files'), join(outDir, 'add', 'files'), { recursive: true });
cpSync(join(schematicsSrc, 'add', 'schema.json'), join(outDir, 'add', 'schema.json'));

console.log(`Schematics built to ${outDir}`);
