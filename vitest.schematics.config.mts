import { defineConfig } from 'vitest/config';

// Schematics run in plain Node against the compiled collection in dist/ng-mapcn/schematics
// (see `npm run test:schematics`), separate from the Angular unit-test builder used for components.
export default defineConfig({
  test: {
    include: ['projects/ng-mapcn/schematics/**/*.spec.ts', 'projects/ng-mapcn/bin/**/*.spec.ts'],
    environment: 'node',
  },
});
