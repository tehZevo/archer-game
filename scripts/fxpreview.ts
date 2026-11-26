import { writeFileSync } from 'node:fs';
import { FX_GEN } from '../src/fxsprites';
import { MOB_GEN } from '../src/sprites';
import { ART_GEN } from '../src/artsheets';
import { newGrid, type Grid } from '../src/grid';
import { encodePng } from './png';

/* npm run fxpreview [name...]: every effect's frames (or just the named
   ones), one row each, scaled up on a dark background with the origin
   marked, written to .tmp/fxpreview.png for reviewing the art.
   npm run fxpreview -- --mobs [name...]: the same for enemies (frames, then
   the hurt pose), drawn opaque. */

const SCALE = 4, PAD = 4, BG = [24, 26, 34];
const args = process.argv.slice(2), opaque = args[0] === '--mobs' || args[0] === '--art', mobs = args[0] === '--mobs';
const pick = opaque ? args.slice(1) : args;
/* --art <prefix>: scenery keys under the prefix, a row per parent ("npc/shop/0..3" in one row) */
const artRows = args[0] === '--art'
  ? [...Object.keys(ART_GEN).filter((k) => k.startsWith(pick[0] ?? '')).reduce((m, k) => {
      const parent = k.includes('/') ? k.slice(0, k.lastIndexOf('/')) : k;
      return m.set(parent, [...(m.get(parent) ?? []), k]);
    }, new Map<string, string[]>()).entries()]
  : null;
const names = artRows ? artRows.map(([p]) => p) : pick.length ? pick : Object.keys(mobs ? MOB_GEN : FX_GEN);
const sheets = names.map((n, i) => {
  if (artRows) {
    const frames = artRows[i][1].map((k) => ART_GEN[k]());
    return { w: Math.max(...frames.map((f) => f.w)), h: Math.max(...frames.map((f) => f.h)), ox: 0, oy: 0, frames };
  }
  if (!mobs) return FX_GEN[n]();
  const a = MOB_GEN[n]();
  return { w: a.hurt.w, h: a.hurt.h, ox: 0, oy: 0, frames: [...a.frames, a.hurt].map((s) => s.g) };
});
const W = Math.max(...sheets.map((s) => s.frames.length * (s.w + PAD))) * SCALE;
const H = sheets.reduce((a, s) => a + (s.h + PAD) * SCALE, 0);
const out = newGrid(W, H);
for (let i = 0; i < W * H; i++) out.px.set([...BG, 255], i * 4);

/** Draw a frame additively (as the game does) at (x0, y0), scaled. */
function blit(g: Grid, x0: number, y0: number): void {
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const i = (y * g.w + x) * 4, a = g.px[i + 3] / 255;
    if (!a) continue;
    for (let v = 0; v < SCALE; v++) for (let u = 0; u < SCALE; u++) {
      const o = ((y0 + y * SCALE + v) * W + x0 + x * SCALE + u) * 4;
      for (let k = 0; k < 3; k++) out.px[o + k] = opaque ? g.px[i + k] : Math.min(255, out.px[o + k] + g.px[i + k] * a);
    }
  }
}

let y = 0;
sheets.forEach((s) => {
  s.frames.forEach((g, f) => {
    const x = f * (s.w + PAD) * SCALE;
    blit(g, x, y);
    if (opaque) return;
    const ox = x + Math.floor(s.ox) * SCALE, oy = y + Math.floor(s.oy) * SCALE; // origin: a red dot
    for (let k = 0; k < 2; k++) out.px.set([255, 40, 40, 255], ((oy + k) * W + ox) * 4);
  });
  y += (s.h + PAD) * SCALE;
});
writeFileSync('.tmp/fxpreview.png', encodePng(out));
console.log(`.tmp/fxpreview.png: ${names.join(', ')}`);
