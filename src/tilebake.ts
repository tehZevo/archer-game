import { NB } from './nb';
import { make, px, type Sprite } from './sprites';
import { BOT_H, TOP_H, TOP_W, painter, type Tileset } from './tileset';

/* Turns a tileset's pieces (tileset.ts) into cached 16px sprites:
   block tiles autotiled by their neighbours, slope halves, the band under
   a slope's foot, top and bottom decorations, rope and ladder segments. */

const cache = new Map<string, Sprite>();
function cached(key: string, w: number, h: number, draw: (s: Sprite) => void): Sprite {
  let s = cache.get(key);
  if (!s) { s = make(w, h); draw(s); cache.set(key, s); }
  return s;
}

/** A block tile for its neighbourhood (`nb`, see NB) in fill variant `v`.
 *  Exposed sides get the edge outline, shaped by the edge style; an exposed
 *  top gets the surface layer. */
export function block(ts: Tileset, nb: number, v: number): Sprite {
  return cached(`${ts.name}|b|${nb}|${v}`, 16, 16, (s) => {
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
      const surf = n ? ts.surface(x, Math.max(0, topD), v) : null;
      let col: string;
      if (surf) {
        col = d === 0 ? edge.surfOuter ?? edge.outer : d === 1 ? edge.surfInner ?? surf : surf;
        if (topD === 0 && d > 0) col = ts.surface(x, 0, v) ?? col;
      } else if (n && topD === 0) col = edge.outer;
      else if (d === 0) col = edge.outer;
      else if (d === 1) col = edge.style === 'bevel' && dside === 3 && edge.light ? edge.light : edge.inner;
      else col = ts.fill(x, y, v);
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
  return cached(`${ts.name}|s|${dir}|${part}`, 16, 16, (s) => {
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
  return cached(`${ts.name}|f|${dir}`, 16, 16, (s) => {
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
  return cached(`${ts.name}|t|${v}|${+w}${+e}`, TOP_W, TOP_H, (s) => top(painter(s, px), v, w, e));
}

/** Decoration hanging under an exposed bottom (16 x BOT_H, drawn just under the tile). */
export function bottomDeco(ts: Tileset, v: number): Sprite | null {
  if (!ts.bottom) return null;
  const bottom = ts.bottom;
  return cached(`${ts.name}|u|${v}`, 16, BOT_H, (s) => bottom(painter(s, px), v));
}

export const rope = (ts: Tileset): Sprite => cached(`${ts.name}|rope`, 16, 16, (s) => ts.rope(painter(s, px)));
export const ladder = (ts: Tileset): Sprite => cached(`${ts.name}|ladder`, 16, 16, (s) => ts.ladder(painter(s, px)));
