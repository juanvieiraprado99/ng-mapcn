// Writes dist/demo/browser/sitemap.xml from the routes Angular actually
// prerendered (dist/demo/prerendered-routes.json), so it can never list a page
// that does not exist. Run after `ng build demo` (wired into build:demo).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_URL = 'https://ng-mapcn.vercel.app';

/** Block previews are `noindex` (the /blocks gallery is the indexed page). */
const EXCLUDED = [/^\/view(\/|$)/];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'demo');

const { routes } = JSON.parse(readFileSync(join(dist, 'prerendered-routes.json'), 'utf-8'));
const paths = Object.keys(routes)
  .filter((path) => !EXCLUDED.some((pattern) => pattern.test(path)))
  .sort();

function priority(path) {
  if (path === '/') return '1.0';
  if (path === '/docs' || path === '/blocks') return '0.9';
  if (path.startsWith('/docs/')) return '0.8';
  return '0.5';
}

const lastmod = new Date().toISOString().slice(0, 10);
const urls = paths.map(
  (path) => `  <url>
    <loc>${SITE_URL}${path === '/' ? '/' : path}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${priority(path)}</priority>
  </url>`,
);

writeFileSync(
  join(dist, 'browser', 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`,
);
console.log(`sitemap.xml: ${paths.length} URLs`);
