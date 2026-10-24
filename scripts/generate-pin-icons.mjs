// Generates the coloured pin PNGs used by the symbols docs page (no dependencies).
// Saturated fill + white outline so they read on both light and dark basemaps.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const SIZE = 128;
const SS = 4;
const CX = 64;
const CY = 48;

function crc32(buf) {
  let c;
  let crc = 0xffffffff;
  for (const b of buf) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) {
    raw[y * (SIZE * 4 + 1)] = 0;
    rgba.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Teardrop: circle of radius r at (CX, CY) plus the triangle from its tangent points to the tip.
function inPin(x, y, r, tipY) {
  if ((x - CX) ** 2 + (y - CY) ** 2 <= r * r) return true;
  const d = tipY - CY;
  const half = (r * Math.sqrt(d * d - r * r)) / d; // tangent half-width
  const ty = CY + (r * r) / d;
  if (y < ty || y > tipY) return false;
  return Math.abs(x - CX) <= (half * (tipY - y)) / (tipY - ty);
}

function render(fill) {
  const out = Buffer.alloc(SIZE * SIZE * 4);
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS;
          const y = py + (sy + 0.5) / SS;
          let c = null;
          if (inPin(x, y, 36, 126)) c = [255, 255, 255];
          if (inPin(x, y, 29, 117)) c = fill;
          if ((x - CX) ** 2 + (y - CY) ** 2 <= 12 * 12) c = [255, 255, 255];
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a++;
          }
        }
      }
      const i = (py * SIZE + px) * 4;
      if (a) {
        out[i] = r / a;
        out[i + 1] = g / a;
        out[i + 2] = b / a;
        out[i + 3] = Math.round((255 * a) / (SS * SS));
      }
    }
  }
  return out;
}

writeFileSync('projects/demo/public/pin-blue.png', png(render([37, 99, 235])));
writeFileSync('projects/demo/public/pin-orange.png', png(render([234, 88, 12])));
writeFileSync('projects/demo/public/pin-green.png', png(render([22, 163, 74])));
