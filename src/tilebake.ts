import { NB } from './nb';
import { make, px, Sprite } from './sprites';
import { BLOCK_VARIANTS, BOT_H, TOP_H, TOP_W, painter, type Tileset } from './tileset';
import { canvasGrid, newGrid, type Grid } from './grid';
import { BAKED_TILES } from './tilebaked';

/* Turns a tileset's pieces (tileset.ts) into cached 16px sprites:
   block tiles autotiled by their neighbours, slope halves, the band under
   a slope's foot, top and bottom decorations, rope and ladder segments.

   Tilesets ship as PNG atlases (assets/tiles/<slug>-<size>.png), baked
   from these painters by `npm run bake`: each distinct piece once, and an
   index (tilebaked.ts) from every piece, in pieces() order, to its cell.
   Once a tileset's atlases load, its pieces are cut from them on first use;
   until then the painters draw them. */

/** A tileset's atlases as baked: per piece size, the PNG and its cell size;
 *  `at` gives each piece (pieces() order) as sheet * CELLS + cell, or -1 for none. */
export interface BakedTiles { sheets: { src: string; w: number; h: number }[]; at: number[] }
/** Cells per atlas row, and the stride between sheets in `at`. */
export const ATLAS_COLS = 16, CELLS = 100000;

const cache = new Map<string, Sprite>();
/** Loaded atlases, by tileset name: each sheet's pixels and the key -> `at` lookup. */
const atlases = new Map<string, { sheets: Grid[]; cell: { w: number; h: number }[]; at: Map<string, number> }>();

function cached(ts: Tileset, key: string, w: number, h: number, draw: (s: Sprite) => void): Sprite {
  let s = cache.get(key);
  if (s) return s;
  const a = atlases.get(ts.name), at = a?.at.get(key) ?? -1;
  if (a && at >= 0) s = cut(a.sheets[Math.floor(at / CELLS)], a.cell[Math.floor(at / CELLS)], at % CELLS);
  else { s = make(w, h); draw(s); }
  cache.set(key, s);
  return s;
}

/** Cell i of an atlas, as a sprite. */
function cut(sheet: Grid, c: { w: number; h: number }, i: number): Sprite {
  const g = newGrid(c.w, c.h), x0 = (i % ATLAS_COLS) * c.w, y0 = Math.floor(i / ATLAS_COLS) * c.h;
  for (let y = 0; y < c.h; y++) g.px.set(sheet.px.subarray(((y0 + y) * sheet.w + x0) * 4, ((y0 + y) * sheet.w + x0 + c.w) * 4), y * c.w * 4);
  return new Sprite(c.w, c.h, g);
}

/** Every piece a tileset can draw, in a fixed order: its cache key and how
 *  to paint it (null: the tileset has no such piece). The bake and the
 *  atlas index both walk this list. */
export function pieces(ts: Tileset): [string, () => Sprite | null][] {
  const out: [string, () => Sprite | null][] = [];
  for (let nb = 0; nb < 256; nb++) for (let v = 0; v < BLOCK_VARIANTS; v++) out.push([K.block(ts, nb, v), () => block(ts, nb, v)]);
  for (const dir of [1, -1] as const) {
    for (const part of [0, 1] as const) out.push([K.slope(ts, dir, part), () => slope(ts, dir, part)]);
    out.push([K.foot(ts, dir), () => slopeFoot(ts, dir)]);
  }
  for (let v = 0; v < 4; v++) {
    for (const w of [false, true]) for (const e of [false, true]) out.push([K.top(ts, v, w, e), () => topDeco(ts, v, w, e)]);
    out.push([K.bottom(ts, v), () => bottomDeco(ts, v)]);
  }
  out.push([K.rope(ts), () => rope(ts)], [K.ladder(ts), () => ladder(ts)]);
  return out;
}

/** Start decoding every baked tileset's atlases (no-op headless). */
export function loadTileSheets(tilesets: Tileset[]): void {
  if (typeof Image === 'undefined') return;
  for (const ts of tilesets) {
    const b = BAKED_TILES[ts.name];
    if (!b) continue;
    const sheets: Grid[] = [];
    let left = b.sheets.length;
    b.sheets.forEach((s, i) => {
      const img = new Image();
      img.onload = () => {
        sheets[i] = canvasGrid(img, img.width, img.height);
        if (--left) return;
        const at = new Map(pieces(ts).map(([k], j) => [k, b.at[j]]));
        atlases.set(ts.name, { sheets, cell: b.sheets.map((c) => ({ w: c.w, h: c.h })), at });
      };
      img.src = s.src;
    });
  }
}

/** Cache keys, one per piece. */
const K = {
  block: (ts: Tileset, nb: number, v: number) => `${ts.name}|b|${nb}|${v}`,
  slope: (ts: Tileset, dir: number, part: number) => `${ts.name}|s|${dir}|${part}`,
  foot: (ts: Tileset, dir: number) => `${ts.name}|f|${dir}`,
  top: (ts: Tileset, v: number, w: boolean, e: boolean) => `${ts.name}|t|${v}|${+w}${+e}`,
  bottom: (ts: Tileset, v: number) => `${ts.name}|u|${v}`,
  rope: (ts: Tileset) => `${ts.name}|rope`,
  ladder: (ts: Tileset) => `${ts.name}|ladder`,
};

/** A block tile for its neighbourhood (`nb`, see NB) in fill variant `v`.
 *  Exposed sides get the edge outline, shaped by the edge style; an exposed
 *  top gets the surface layer. */
export function block(ts: Tileset, nb: number, v: number): Sprite {
  return cached(ts, K.block(ts, nb, v), 16, 16, (s) => {
    const solid = (b: number) => (nb & b) !== 0;
    const n = !solid(NB.N), e = !solid(NB.E), so = !solid(NB.S), w = !solid(NB.W);
    const { edge } = ts, r = edge.r;
    // chip: some 4px runs of an exposed side are knocked in by 1px (never at the tile's ends, so neighbours meet)
    const chip = (side: number, along: number): number =>
      edge.style === 'chip' && along > 1 && along < 14 && (side * 7 + (along >> 2) + v) % 3 === 0 ? 1 : 0;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      // distance to the nearest exposed side (the top is the surface's job)
      let d = 99, dside = -1;
      const sides: [boolean, number, number, number][] = [[e, 15 - x, y, 1], [w, x, y, 3], [so, 15 - y, x, 2]];
      for (const [on, dist, along, side] of sides) {
        if (!on) continue;
        const dd = dist - chip(side, along);
        if (dd < d) { d = dd; dside = side; }
      }
      let topD = n ? y - chip(0, x) : 99;
      let cut = d < 0 || topD < 0;
      // outer corners where two exposed sides meet: cut on a diagonal of r px
      if (r > 0) {
        const corners: [boolean, number, number, boolean][] = [
          [n && w, x, y, true], [n && e, 15 - x, y, true], [so && w, x, 15 - y, false], [so && e, 15 - x, 15 - y, false],
        ];
        for (const [on, dx, dy, isTop] of corners) {
          if (!on || dx > r || dy > r) continue;
          const k = dx + dy - r;
          if (k < 0) { cut = true; break; }
          if (k <= 1) { if (isTop && dy === 0) topD = 0; else d = Math.min(d, k); }
        }
      }
      if (cut) continue;
      const surf = n ? ts.surface(x, Math.max(0, topD), v & 3) : null;
      let col: string;
      if (surf) {
        col = d === 0 ? edge.surfOuter ?? edge.outer : d === 1 ? edge.surfInner ?? surf : surf;
        if (topD === 0 && d > 0) col = ts.surface(x, 0, v & 3) ?? col;
      } else if (n && topD === 0) col = edge.outer;
      else if (d === 0) col = edge.outer;
      else if (d === 1) col = edge.style === 'bevel' && dside === 3 && edge.light ? edge.light : edge.inner;
      else col = v < 4 ? ts.fill(x, y, v) : ts.fill(15 - x, y, v - 4); // 4-7: 0-3's fill mirrored
      // inner corners: both neighbours solid but the diagonal open
      if ((!n && !w && !solid(NB.NW) && x === 0 && y === 0) || (!n && !e && !solid(NB.NE) && x === 15 && y === 0) ||
          (!so && !w && !solid(NB.SW) && x === 0 && y === 15) || (!so && !e && !solid(NB.SE) && x === 15 && y === 15)) col = edge.outer;
      px(s, x, y, col);
    }
  });
}

/** Height (px) of a 2:1 slope half at column x: part 0 rises 0-8px, part 1 8-16px. */
const slopeH = (dir: 1 | -1, part: 0 | 1, x: number): number => part * 8 + Math.ceil((dir === 1 ? x + 1 : 16 - x) / 2);

/** One half of a 2:1 slope: the surface layer follows the slope, the fill shows below it. */
export function slope(ts: Tileset, dir: 1 | -1, part: 0 | 1): Sprite {
  return cached(ts, K.slope(ts, dir, part), 16, 16, (s) => {
    for (let x = 0; x < 16; x++) {
      const top = 16 - slopeH(dir, part, x);
      for (let y = top; y < 16; y++) px(s, x, y, ts.surface(x, y - top, 0) ?? ts.fill(x, y, 0));
    }
  });
}

/** Overlay for the tile under a slope's lower half: near the low end the slope
 *  is only a few px tall, so its surface layer carries on into this tile to
 *  meet the neighbouring flat top. */
export function slopeFoot(ts: Tileset, dir: 1 | -1): Sprite {
  return cached(ts, K.foot(ts, dir), 16, 16, (s) => {
    for (let x = 0; x < 16; x++) {
      const h = slopeH(dir, 0, x);
      for (let r = 0; r < 16; r++) {
        const c = ts.surface(x, h + r, 0);
        if (!c) break;
        px(s, x, r, c);
      }
    }
  });
}

/** Decoration standing on an exposed top (TOP_W x TOP_H; drawn 2px left of and TOP_Y above the tile). */
export function topDeco(ts: Tileset, v: number, w: boolean, e: boolean): Sprite | null {
  if (!ts.top) return null;
  const top = ts.top;
  return cached(ts, K.top(ts, v, w, e), TOP_W, TOP_H, (s) => top(painter(s, px), v, w, e));
}

/** Decoration hanging under an exposed bottom (16 x BOT_H, drawn just under the tile). */
export function bottomDeco(ts: Tileset, v: number): Sprite | null {
  if (!ts.bottom) return null;
  const bottom = ts.bottom;
  return cached(ts, K.bottom(ts, v), 16, BOT_H, (s) => bottom(painter(s, px), v));
}

export const rope = (ts: Tileset): Sprite => cached(ts, K.rope(ts), 16, 16, (s) => ts.rope(painter(s, px)));
export const ladder = (ts: Tileset): Sprite => cached(ts, K.ladder(ts), 16, 16, (s) => ts.ladder(painter(s, px)));
