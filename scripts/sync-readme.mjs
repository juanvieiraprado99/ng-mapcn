// The root README.md is the single source of truth. Copy it to the library
// project so ng-packagr ships it as the npm package page. Runs before every
// library build / publish (see package.json).
import { copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'README.md');
const dest = join(root, 'projects', 'ng-mapcn', 'README.md');

copyFileSync(src, dest);

console.log(`Synced README.md to ${dest}`);
