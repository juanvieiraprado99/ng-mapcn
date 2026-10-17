import { join } from 'node:path';

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.disable('x-powered-by');

/** Build output named after its content hash by the Angular CLI. */
const HASHED_FILE = /-[A-Za-z0-9_-]{8}\.(?:js|mjs|css|woff2?|ttf|png|jpe?g|svg|webp)$/;

const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    // Only content-hashed build files (chunk-XXXXXXXX.js, styles-XXXXXXXX.css, media) may be cached
    // for good; the rest keeps a fixed name across deploys (maplibre worker, llms.txt, sitemap.xml,
    // data files) and must be revalidated, or browsers keep a stale copy for a year.
    setHeaders: (res, path) => {
      res.setHeader(
        'Cache-Control',
        HASHED_FILE.test(path)
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=0, must-revalidate',
      );
    },
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
