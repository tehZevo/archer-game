import { mkdirSync, writeFileSync } from 'node:fs';
import { FX_GEN } from '../src/fxsprites';
import { MOB_GEN } from '../src/sprites';
import { MOB_TYPES } from '../src/config';
import { deathOf } from '../src/deaths';
import { bakeDeathSheet } from '../src/deathsheet';
import { newGrid, packStrip, type Grid } from '../src/grid';
import { TILESETS } from '../src/tileset';
import { ART_GEN } from '../src/artsheets';
import { archerShape, sheetRows } from '../src/archer';
import { LOOK_COUNTS } from '../src/look';
import { ATLAS_COLS, CELLS, pieces } from '../src/tilebake';
import { encodePng } from './png';
import { slug } from './slug';

/* npm run bake: run the art generators and write their output as PNG sheets
   under assets/ (the game ships and loads the PNGs), plus one index of them
   all, assets/sprites.json (read by src/baked.ts):
     skill effects (fxsprites.ts)   -> assets/fx/<name>.png
     enemies (sprites.ts/mobart.ts) -> assets/mobs/<slug>.png
     enemy deaths (deathsheet.ts)   -> assets/mobs/death/<slug>.png
     tilesets (tilebake.ts)         -> assets/tiles/<slug>-<w>x<h>.png
     scenery (artsheets.ts)         -> assets/art/<slug>.png
     the archer (archer.ts)         -> assets/archer/<style>-<body>.png
   Re-run after changing any of that art; the smoke test fails on a sheet
   that no longer matches its generator. */

/** One sheet's index entry (see baked.ts): its file under assets/, frame
 *  size and count, origin, and frame rate where it has one. */
interface Entry { file: string; w: number; h: number; frames: number; x: number; y: number; fps?: number }

/** Write a sheet's PNG under assets/ and return its index entry. */
function sheet(file: string, g: Grid, e: Omit<Entry, 'file'>): Entry {
  writeFileSync(`assets/${file}`, encodePng(g));
  return { file, ...e };
}

for (const dir of ['fx', 'mobs/death', 'tiles', 'art', 'archer']) mkdirSync(`assets/${dir}`, { recursive: true });

/* ---- skill effects: every generator in FX_GEN ---- */
const fx: Record<string, Entry> = {};
for (const name of Object.keys(FX_GEN)) {
  const s = FX_GEN[name]();
  fx[name] = sheet(`fx/${name}.png`, packStrip(s.frames), { w: s.w, h: s.h, frames: s.frames.length, x: s.ox, y: s.oy });
}

/* ---- enemies: every base enemy in MOB_GEN (frames, then the hurt pose),
   and every enemy's death strip (variants included: each dies in its own colours) ---- */
const mobs: Record<string, Entry> = {}, deaths: Record<string, Entry> = {};
for (const name of Object.keys(MOB_GEN)) {
  const a = MOB_GEN[name]();
  const strip = packStrip([...a.frames, a.hurt].map((s) => s.g));
  mobs[name] = sheet(`mobs/${slug(name)}.png`, strip, { w: a.hurt.w, h: a.hurt.h, frames: a.frames.length, x: 0, y: 0, fps: a.fps });
}
for (const t of MOB_TYPES) {
  const d = bakeDeathSheet(t.n, deathOf(t));
  if (!d) continue;
  const f0 = d.frames[0];
  deaths[t.n] = sheet(`mobs/death/${slug(t.n)}.png`, packStrip(d.frames), { w: f0.w, h: f0.h, frames: d.frames.length, x: d.cx, y: d.cy });
}

/* ---- tilesets: every piece, deduped into one atlas per piece size ---- */
const tiles: Record<string, { sheets: Entry[]; at: number[] }> = {};
for (const [name, ts] of Object.entries(TILESETS)) {
  const sizes: { w: number; h: number; cells: Grid[]; seen: Map<string, number> }[] = [];
  const at = pieces(ts).map(([, paint]) => {
    const s = paint();
    if (!s) return -1;
    let k = sizes.findIndex((z) => z.w === s.w && z.h === s.h);
    if (k < 0) k = sizes.push({ w: s.w, h: s.h, cells: [], seen: new Map() }) - 1;
    const z = sizes[k], sig = Buffer.from(s.g.px).toString('base64');
    let i = z.seen.get(sig);
    if (i === undefined) { i = z.cells.push(s.g) - 1; z.seen.set(sig, i); }
    return k * CELLS + i;
  });
  const sheets = sizes.map((z) =>
    sheet(`tiles/${slug(name)}-${z.w}x${z.h}.png`, packAtlas(z.cells, z.w, z.h), { w: z.w, h: z.h, frames: z.cells.length, x: 0, y: 0 }));
  tiles[name] = { sheets, at };
}

/* ---- scenery: props, town decor, backdrop layers, the portal (one PNG each) ---- */
const art: Record<string, Entry> = {};
for (const key of Object.keys(ART_GEN)) {
  const g = ART_GEN[key]();
  art[key] = sheet(`art/${slug(key)}.png`, g, { w: g.w, h: g.h, frames: 1, x: 0, y: 0 });
}

/* ---- the archer: one sheet per hair style x body type, a row per pose ---- */
// every sheet has the same rows (the poses' frame sizes and counts don't vary by look)
const archer = { sheets: {} as Record<string, Entry>, rows: sheetRows(archerShape(0, 0)) };
for (let style = 0; style < LOOK_COUNTS.style; style++) for (let body = 0; body < LOOK_COUNTS.body; body++) {
  const shape = archerShape(style, body), r = sheetRows(shape);
  const W = Math.max(...Object.values(r).map((x) => x.w * x.n)), H = Object.values(r).reduce((a, x) => a + x.h, 0);
  const g = newGrid(W, H);
  for (const [p, row] of Object.entries(r)) shape[p as keyof typeof shape].forEach((f, i) => {
    for (let y = 0; y < f.h; y++) g.px.set(f.px.subarray(y * f.w * 4, (y + 1) * f.w * 4), ((row.y + y) * W + i * row.w) * 4);
  });
  archer.sheets[`${style}-${body}`] = sheet(`archer/${style}-${body}.png`, g, { w: W, h: H, frames: 1, x: 0, y: 0 });
}

writeFileSync('assets/sprites.json', indexJson({ fx, mobs, deaths, art, tiles, archer }));

/** The index as JSON, one entry per line under each kind (diffs stay readable). */
function indexJson(kinds: Record<string, Record<string, unknown>>): string {
  const kind = (o: Record<string, unknown>): string =>
    Object.entries(o).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n');
  return `{\n${Object.entries(kinds).map(([k, o]) => `  ${JSON.stringify(k)}: {\n${kind(o)}\n  }`).join(',\n')}\n}\n`;
}

/** Cells laid out ATLAS_COLS to a row. */
function packAtlas(cells: Grid[], w: number, h: number): Grid {
  const cols = Math.min(ATLAS_COLS, cells.length), o = newGrid(cols * w, Math.ceil(cells.length / ATLAS_COLS) * h);
  cells.forEach((g, i) => {
    const x0 = (i % ATLAS_COLS) * w, y0 = Math.floor(i / ATLAS_COLS) * h;
    for (let y = 0; y < h; y++) o.px.set(g.px.subarray(y * w * 4, (y + 1) * w * 4), ((y0 + y) * o.w + x0) * 4);
  });
  return o;
}

console.log(`baked ${Object.keys(FX_GEN).length} effect, ${Object.keys(MOB_GEN).length} enemy (with deaths), ${Object.keys(TILESETS).length} tileset and ${Object.keys(ART_GEN).length} scenery sheet(s)`);
