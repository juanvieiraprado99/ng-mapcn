import { defineConfig } from 'vitest/config';

// The packaged `ng-mapcn` (FESM in node_modules) is externalized by default, so Node would load the
// real CommonJS `maplibre-gl` and ignore the `vi.mock` from the setup file. Inlining it (and its
// `ng-mapcn/testing*` entry points, so the fake stays a single module instance) makes the mock
// reach the library.
export default defineConfig({
  test: {
    server: { deps: { inline: [/ng-mapcn/] } },
  },
});
