/**
 * Generates `projects/demo/public/data/parcels.pmtiles`: a tiny PMTiles v3 archive holding ONE
 * vector tile (z10, over Manhattan) with a 5x5 grid of "parcels". It backs the PMTiles example of
 * the docs page and block, and stands in for a real archive in the offline e2e suite.
 *
 * It is written by hand (header + directory + MVT protobuf) on purpose: no tile tooling, so the
 * file can be regenerated anywhere with `node scripts/generate-pmtiles-fixture.mjs`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { zxyToTileId } from 'pmtiles';

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'projects',
  'demo',
  'public',
  'data',
  'parcels.pmtiles',
);

const Z = 10;
const CENTER = [-74.006, 40.7128];
const KINDS = ['residential', 'commercial', 'park'];
const EXTENT = 4096;
const CELL = 140;
const SIZE = 120;
const ORIGIN = 1700;

// ── protobuf helpers ────────────────────────────────────────────────────────
const varint = (value) => {
  const out = [];
  let v = value;
  while (v > 0x7f) {
    out.push((v & 0x7f) | 0x80);
    v = Math.floor(v / 128);
  }
  out.push(v);
  return out;
};
const zigzag = (n) => (n << 1) ^ (n >> 31);
const tag = (field, wire) => varint((field << 3) | wire);
const lengthDelimited = (field, bytes) => [...tag(field, 2), ...varint(bytes.length), ...bytes];
const string = (field, text) => lengthDelimited(field, [...Buffer.from(text, 'utf8')]);
const uint = (field, value) => [...tag(field, 0), ...varint(value)];
const packed = (field, values) => lengthDelimited(field, values.flatMap(varint));

// ── the tile ────────────────────────────────────────────────────────────────
const lon2x = (lon) => Math.floor(((lon + 180) / 360) * 2 ** Z);
const lat2y = (lat) => {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * 2 ** Z);
};
const TILE_X = lon2x(CENTER[0]);
const TILE_Y = lat2y(CENTER[1]);

// Geographic center of the 5x5 grid (tile coordinates ORIGIN..ORIGIN + 5 * CELL), for the header.
const GRID_MID = ORIGIN + (5 * CELL - (CELL - SIZE)) / 2;
const tileLon = (px) => ((TILE_X + px / EXTENT) / 2 ** Z) * 360 - 180;
const tileLat = (py) =>
  (Math.atan(Math.sinh(Math.PI * (1 - (2 * (TILE_Y + py / EXTENT)) / 2 ** Z))) * 180) / Math.PI;
const GRID_CENTER = [tileLon(GRID_MID), tileLat(GRID_MID)];

const keys = ['parcel', 'kind'];
const values = [
  ...KINDS.map((kind) => string(1, kind)), // Value.string_value
  ...Array.from({ length: 25 }, (_, i) => uint(5, i)), // Value.uint_value
];

const features = [];
for (let row = 0; row < 5; row++) {
  for (let col = 0; col < 5; col++) {
    const index = row * 5 + col;
    const x = ORIGIN + col * CELL;
    const y = ORIGIN + row * CELL;
    // MoveTo(1) + LineTo(3) + ClosePath, clockwise in tile coordinates.
    const geometry = [
      9,
      zigzag(x),
      zigzag(y),
      26,
      zigzag(SIZE),
      zigzag(0),
      zigzag(0),
      zigzag(SIZE),
      zigzag(-SIZE),
      zigzag(0),
      15,
    ];
    features.push(
      lengthDelimited(2, [
        ...uint(1, index),
        ...packed(2, [0, KINDS.length + index, 1, (row + col) % KINDS.length]),
        ...uint(3, 3), // POLYGON
        ...packed(4, geometry),
      ]),
    );
  }
}

const layer = [
  ...uint(15, 2),
  ...string(1, 'parcels'),
  ...features.flat(),
  ...keys.flatMap((key) => string(3, key)),
  ...values.flatMap((value) => lengthDelimited(4, value)),
  ...uint(5, EXTENT),
];
const tile = Buffer.from(lengthDelimited(3, layer));

// ── the archive ─────────────────────────────────────────────────────────────
const tileId = zxyToTileId(Z, TILE_X, TILE_Y);
const directory = Buffer.from([
  ...varint(1), // entries
  ...varint(tileId),
  ...varint(1), // run length
  ...varint(tile.length),
  ...varint(1), // offset 0, encoded as offset + 1
]);
const metadata = Buffer.from(
  JSON.stringify({
    name: 'ng-mapcn parcels fixture',
    attribution: 'ng-mapcn demo data',
    vector_layers: [
      { id: 'parcels', fields: { parcel: 'Number', kind: 'String' }, minzoom: Z, maxzoom: Z },
    ],
  }),
);

const HEADER = 127;
const rootOffset = HEADER;
const metadataOffset = rootOffset + directory.length;
const tileOffset = metadataOffset + metadata.length;

const header = Buffer.alloc(HEADER);
header.write('PMTiles', 0, 'latin1');
header.writeUInt8(3, 7);
const u64 = (offset, value) => header.writeBigUInt64LE(BigInt(value), offset);
u64(8, rootOffset);
u64(16, directory.length);
u64(24, metadataOffset);
u64(32, metadata.length);
u64(40, tileOffset); // leaf directories: none
u64(48, 0);
u64(56, tileOffset);
u64(64, tile.length);
u64(72, 1); // addressed tiles
u64(80, 1); // tile entries
u64(88, 1); // tile contents
header.writeUInt8(1, 96); // clustered
header.writeUInt8(1, 97); // internal compression: none
header.writeUInt8(1, 98); // tile compression: none
header.writeUInt8(1, 99); // tile type: MVT
header.writeUInt8(Z, 100); // min zoom
header.writeUInt8(Z, 101); // max zoom
const e7 = (degrees) => Math.round(degrees * 1e7);
header.writeInt32LE(e7(GRID_CENTER[0] - 0.1), 102);
header.writeInt32LE(e7(GRID_CENTER[1] - 0.1), 106);
header.writeInt32LE(e7(GRID_CENTER[0] + 0.1), 110);
header.writeInt32LE(e7(GRID_CENTER[1] + 0.1), 114);
header.writeUInt8(12, 118); // center zoom
header.writeInt32LE(e7(GRID_CENTER[0]), 119);
header.writeInt32LE(e7(GRID_CENTER[1]), 123);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.concat([header, directory, metadata, tile]));
console.log(`grid center ${GRID_CENTER.map((v) => v.toFixed(4)).join(', ')}`);
console.log(`wrote ${OUT} (tile ${Z}/${TILE_X}/${TILE_Y}, ${tile.length} bytes of MVT)`);
