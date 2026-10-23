import { defineConfig, devices } from '@playwright/test';

const DEV_PORT = 4310;
const PROD_PORT = 4320;

// `--project=dev` (npm run e2e:dev) only needs the dev build, so the prod server is not started.
const args = process.argv.slice(2);
const devOnly = args.some(
  (arg, i) => arg === '--project=dev' || (arg === '--project' && args[i + 1] === 'dev'),
);

// E2E_GPU=1 renders WebGL on the local GPU instead of SwiftShader (Windows: D3D11 via ANGLE).
// Opt-in: CI has no GPU, and the GPU path can differ from what CI renders.
const gpuArgs =
  process.env['E2E_GPU'] === '1'
    ? [
        '--use-angle=' + (process.platform === 'win32' ? 'd3d11' : 'default'),
        '--enable-gpu',
        '--ignore-gpu-blocklist',
      ]
    : [];

const devServer = {
  // Development build: exposes `window.ng`, used by the specs to reach the MapLibre instance.
  command: 'node dist/demo-e2e/server/server.mjs',
  env: { PORT: String(DEV_PORT) },
  url: `http://localhost:${DEV_PORT}/docs`,
  reuseExistingServer: !process.env['CI'],
};

const prodServer = {
  // Production build: the shipped bundle, used only by the smoke spec.
  command: 'node dist/demo/server/server.mjs',
  env: { PORT: String(PROD_PORT) },
  url: `http://localhost:${PROD_PORT}/docs`,
  reuseExistingServer: !process.env['CI'],
};

export default defineConfig({
  testDir: 'e2e',
  // Software-rendered WebGL (SwiftShader) slows down when several maps load in parallel.
  timeout: 60_000,
  fullyParallel: true,
  // SwiftShader is CPU-bound: locally, more than 4 browsers only compete for the same cores
  // (8 workers were barely faster than 4). Override with --workers.
  workers: process.env['CI'] ? undefined : 4,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 900 },
    launchOptions: { args: gpuArgs },
  },
  webServer: devOnly ? [devServer] : [devServer, prodServer],
  projects: [
    {
      name: 'dev',
      testIgnore: /smoke/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${DEV_PORT}`,
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: 'prod',
      testMatch: /smoke/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${PROD_PORT}`,
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
});
