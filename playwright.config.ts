import { defineConfig, devices } from '@playwright/test';

const DEV_PORT = 4310;
const PROD_PORT = 4320;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 900 },
  },
  webServer: [
    {
      // Development build: exposes `window.ng`, used by the specs to reach the MapLibre instance.
      command: 'node dist/demo-e2e/server/server.mjs',
      env: { PORT: String(DEV_PORT) },
      url: `http://localhost:${DEV_PORT}/docs`,
      reuseExistingServer: !process.env['CI'],
    },
    {
      // Production build: the shipped bundle, used only by the smoke spec.
      command: 'node dist/demo/server/server.mjs',
      env: { PORT: String(PROD_PORT) },
      url: `http://localhost:${PROD_PORT}/docs`,
      reuseExistingServer: !process.env['CI'],
    },
  ],
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
