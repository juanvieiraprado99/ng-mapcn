/**
 * Generates the offline fixtures of the 3D e2e specs:
 *
 * - `e2e/fixtures/terrarium.png`: a 256x256 Terrarium-encoded elevation tile (a smooth hill), served
 *   for every `raster-dem` tile request.
 * - `e2e/fixtures/buildings.mvt`: a vector tile with a `buildings` layer shaped like the one of
 *   the Carto `carto.streets/v2` tiles (`height`, `min_height`), served for the z14 tile over
 *   lower Manhattan and as an empty tile everywhere else.
 *
 * Both are written by hand (PNG chunks, MVT protobuf) so they regenerate anywhere with
 * `node scripts/generate-3d-fixtures.mjs`, with no tile tooling.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'e2e', 'fixtures');
mkdirSync(OUT, { recursive: true });

// ── Terrarium PNG ───────────────────────────────────────────────────────────
const SIZE = 256;
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
};

const rows = [];
for (let y = 0; y < SIZE; y++) {
  const row = Buffer.alloc(1 + SIZE * 3); // filter byte 0 + RGB
  for (let x = 0; x < SIZE; x++) {
    const dx = (x - SIZE / 2) / (SIZE / 4);
    const dy = (y - SIZE / 2) / (SIZE / 4);
    const elevation = Math.round(1200 * Math.exp(-(dx * dx + dy * dy))); // whole meters, keeps the PNG small
    // Terrarium: (R * 256 + G + B / 256) - 32768
    const value = elevation + 32768;
    row[1 + x * 3] = Math.floor(value / 256);
    row[2 + x * 3] = Math.floor(value) % 256;
    row[3 + x * 3] = Math.floor((value - Math.floor(value)) * 256);
  }
  rows.push(row);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // RGB
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(Buffer.concat(rows))),
  chunk('IEND', Buffer.alloc(0)),
]);
writeFileSync(join(OUT, 'terrarium.png'), png);

// ── Building tile ───────────────────────────────────────────────────────────
const Z = 14;
const CENTER = [-74.0134, 40.7061];
const EXTENT = 4096;

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
const double = (field, value) => {
  const bytes = Buffer.alloc(8);
  bytes.writeDoubleLE(value);
  return [...tag(field, 1), ...bytes];
};

const worldX = ((CENTER[0] + 180) / 360) * 2 ** Z;
const rad = (CENTER[1] * Math.PI) / 180;
const worldY = ((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * 2 ** Z;
const TILE_X = Math.floor(worldX);
const TILE_Y = Math.floor(worldY);
const centerPx = [Math.round((worldX - TILE_X) * EXTENT), Math.round((worldY - TILE_Y) * EXTENT)];

// A 3x3 block of buildings around the center, then a tall tower with a podium base.
const BUILDINGS = [];
const STEP = 90;
const SIDE = 70;
for (let row = -1; row <= 1; row++) {
  for (let col = -1; col <= 1; col++) {
    BUILDINGS.push({
      x: centerPx[0] + col * STEP - SIDE / 2,
      y: centerPx[1] + row * STEP - SIDE / 2,
      height: 20 + ((row + 1) * 3 + (col + 1)) * 25,
      base: 0,
    });
  }
}
BUILDINGS.push({
  x: centerPx[0] + 3 * STEP,
  y: centerPx[1],
  height: 200,
  base: 40,
});

const keys = ['height', 'min_height'];
const values = [];
const valueIndex = (value) => {
  values.push(value);
  return values.length - 1;
};
const features = BUILDINGS.map((b, i) => {
  const geometry = [
    9,
    zigzag(Math.round(b.x)),
    zigzag(Math.round(b.y)),
    26,
    zigzag(SIDE),
    zigzag(0),
    zigzag(0),
    zigzag(SIDE),
    zigzag(-SIDE),
    zigzag(0),
    15,
  ];
  const tags = [
    0,
    valueIndex(double(3, b.height)), // Value.double_value
    1,
    valueIndex(double(3, b.base)),
  ];
  return lengthDelimited(2, [
    ...uint(1, i),
    ...packed(2, tags),
    ...uint(3, 3), // POLYGON
    ...packed(4, geometry),
  ]);
});

const layer = [
  ...uint(15, 2),
  ...string(1, 'buildings'),
  ...features.flat(),
  ...keys.flatMap((key) => string(3, key)),
  ...values.flatMap((value) => lengthDelimited(4, value)),
  ...uint(5, EXTENT),
];
writeFileSync(join(OUT, 'buildings.mvt'), Buffer.from(lengthDelimited(3, layer)));

console.log(`wrote terrarium.png (${png.length} bytes) and buildings.mvt in ${OUT}`);
console.log(`building tile ${Z}/${TILE_X}/${TILE_Y}, center ${CENTER.join(', ')}`);
