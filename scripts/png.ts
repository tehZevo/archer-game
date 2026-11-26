import { crc32, deflateSync, inflateSync } from 'node:zlib';
import type { Grid } from '../src/grid';

/* A minimal PNG codec for the bake: 8-bit RGBA, no interlace, filter 0.
   Deterministic, so a re-bake of unchanged art writes identical bytes. */

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
  return Buffer.concat([len, td, crc]);
}

export function encodePng(g: Grid): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(g.w, 0); ihdr.writeUInt32BE(g.h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((g.w * 4 + 1) * g.h);
  for (let y = 0; y < g.h; y++) Buffer.from(g.px.buffer, g.px.byteOffset + y * g.w * 4, g.w * 4).copy(raw, y * (g.w * 4 + 1) + 1);
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** Decode a PNG written by encodePng (only that format). */
export function decodePng(buf: Buffer): Grid {
  let o = 8, w = 0, h = 0;
  const idat: Buffer[] = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8), data = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); }
    if (type === 'IDAT') idat.push(data);
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) px.set(raw.subarray(y * (w * 4 + 1) + 1, (y + 1) * (w * 4 + 1)), y * w * 4);
  return { w, h, px };
}
