// Builds what the Playwright suite serves (see playwright.config.ts):
//   node scripts/e2e-build.mjs        prod build (dist/demo, smoke) + dev build (dist/demo-e2e)
//   node scripts/e2e-build.mjs --dev  dev build only, against the ng-mapcn already installed in
//                                     node_modules (run `npm run install:lib` after library changes)
import { execSync } from 'node:child_process';

// Prerendering every route runs out of the default heap on some machines; keep any explicit limit.
const nodeOptions = process.env.NODE_OPTIONS ?? '';
const env = {
  ...process.env,
  NODE_OPTIONS: nodeOptions.includes('--max-old-space-size')
    ? nodeOptions
    : `${nodeOptions} --max-old-space-size=8192`.trim(),
};

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', env });
}

if (process.argv.includes('--dev')) {
  run('node scripts/generate-block-sources.mjs');
} else {
  run('node scripts/vercel-build.mjs');
}
run('ng build demo --configuration development --output-path dist/demo-e2e');
