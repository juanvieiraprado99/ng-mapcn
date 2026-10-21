/**
 * Checks the live basemap styles still have what the library and the demo rely on: the building
 * source and layer `ng-map-fill-extrusion` defaults to in the Carto styles, the height property in
 * their tiles, and the OpenMapTiles buildings of the OpenFreeMap presets.
 *
 * The e2e suite runs offline against copies of these styles (`e2e/fixtures.ts`), so it cannot see
 * a provider changing its schema; this script can. It needs the network:
 * `npm run check:basemaps` (also run weekly by the `basemaps` workflow).
 */

/** Lower Manhattan, the tile the 3D e2e fixture stands in for. */
const BUILDINGS_TILE = { z: 14, x: 4823, y: 6160 };

const CHECKS = [
  ...['positron', 'dark-matter', 'voyager'].map((name) => ({
    name: `Carto ${name}`,
    url: `https://basemaps.cartocdn.com/gl/${name}-gl-style/style.json`,
    // Keep in sync with CARTO_BUILDING_SCHEMAS (map-fill-extrusion.component.ts), first entry.
    source: 'protomaps',
    sourceLayer: 'buildings',
    tileStrings: ['buildings', 'height', 'min_height'],
  })),
  ...['positron', 'dark', 'liberty', 'bright'].map((name) => ({
    name: `OpenFreeMap ${name}`,
    url: `https://tiles.openfreemap.org/styles/${name}`,
    // The playground presets' buildingSource (style-presets.ts).
    source: 'openmaptiles',
    sourceLayer: 'building',
  })),
];

async function fetchOk(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

/** Tile URLs of a vector source, inline or from its TileJSON. */
async function tileUrls(source) {
  if (source.tiles) return source.tiles;
  if (source.url) return (await (await fetchOk(source.url)).json()).tiles ?? [];
  return [];
}

async function check({ name, url, source, sourceLayer, tileStrings }) {
  const problems = [];
  const style = await (await fetchOk(url)).json();
  const sources = Object.keys(style.sources ?? {});

  if (!sources.includes(source)) {
    problems.push(`no "${source}" source (sources: ${sources.join(', ') || 'none'})`);
  } else if (!style.layers.some((l) => l.source === source && l['source-layer'] === sourceLayer)) {
    const layers = new Set(
      style.layers.filter((l) => l.source === source).map((l) => l['source-layer']),
    );
    problems.push(
      `no layer reads "${source}" / "${sourceLayer}" (source layers: ${[...layers].join(', ')})`,
    );
  } else if (tileStrings) {
    // MVT layer names and property keys are plain strings in the tile bytes.
    const [template] = await tileUrls(style.sources[source]);
    const { z, x, y } = BUILDINGS_TILE;
    const tileUrl = template.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    const tile = Buffer.from(await (await fetchOk(tileUrl)).arrayBuffer()).toString('latin1');
    const missing = tileStrings.filter((s) => !tile.includes(s));
    if (missing.length) problems.push(`tile ${z}/${x}/${y} has no ${missing.join(', ')}`);
  }
  return { name, problems };
}

const results = await Promise.all(
  CHECKS.map((c) => check(c).catch((error) => ({ name: c.name, problems: [error.message] }))),
);
let failed = 0;
for (const { name, problems } of results) {
  if (problems.length) failed++;
  console.log(
    `${problems.length ? '✗' : '✓'} ${name}${problems.map((p) => `\n    ${p}`).join('')}`,
  );
}
if (failed) {
  console.error(`\n${failed} basemap(s) changed: update the defaults, the fixtures and the docs.`);
  process.exit(1);
}
