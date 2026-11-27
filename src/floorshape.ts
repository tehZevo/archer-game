import { TILE } from './config';
import { pick, type Rng } from './rng';
import { NB } from './nb';
import type { Platform } from './types';

/* Platform shapes: the per-column profile DSL a floor's blocks are built
   from, and the autotile mask each tile is drawn by. */

// Tile builders: a flat tile, and the two halves of a 2:1 slope.
type Top = 'flat' | 'u2lo' | 'u2hi' | 'd2hi' | 'd2lo';
function tileFor(top: Top, x: number, y: number): Platform {
  const t: Platform = { x, y, w: TILE, h: TILE };
  switch (top) {
    case 'u2lo': return { ...t, slope: true, dir: 1, part: 0 };
    case 'u2hi': return { ...t, slope: true, dir: 1, part: 1 };
    case 'd2hi': return { ...t, slope: true, dir: -1, part: 1 };
    case 'd2lo': return { ...t, slope: true, dir: -1, part: 0 };
    default: return t;
  }
}

/** A platform shape: a solid, contiguous block of tiles described by a
 *  per-column profile. Each column is `level` solid tiles tall, plus one slope
 *  tile on top when the column is part of a slope. */
export interface Shape { tiles: Platform[]; w: number; baseY: number; baseX: number; }
/** One column of a shape: `level` solid tiles, topped by `top`. */
interface Col { level: number; top: Top; }

/**
 * A shape's profile, read left to right, one character per step:
 *   '2'-'4'  a flat column that many tiles tall
 *   'U'      a 2:1 slope up: two columns (lower + upper half), rising one tile
 *   'D'      a 2:1 slope down: two columns, falling one tile
 * Every slope rises from and falls into a flat column, never at an edge
 * (spec: specs/platforms). '2U3U4D3' is: 2 tall, up, 3, up, 4, down, 3.
 */
type Profile = string;

const PROFILES: Record<string, Profile> = {
  flat:   '333333',
  low:    '222222',
  tall:   '444444',
  stair:  '2U3U4',     // two rises
  ledge:  '22U333',    // one rise
  hill:   '2U33D2',    // up, flat top, down
  mesa:   '3U444D3',   // taller hill
  bump:   '33U4D33',   // small hill on a thick slab
  valley: '4D33U4',    // down, flat dip, up
  dip:    '33D2U33',   // small dip in a slab
  waves:  '2U3D2U3',   // rolling: up, down, up
  tiers:  '2U3U4D3',   // climb two, step back down
  shelf:  '2222U3',    // long low run, then a step
};
export const SHAPES = Object.keys(PROFILES);

/** Town-only profiles, kept out of SHAPES so climb floors never pick them:
 *  `perch` is the training dummy's narrow ledge against the wall, `step` the
 *  one-tile hop up to its ladder. */
const TOWN_PROFILES: Record<string, Profile> = { perch: '333', step: '1' };

/** Expand a profile into its columns. */
function parseProfile(p: Profile): Col[] {
  const cols: Col[] = [];
  let level = Number(p[0]);
  for (const ch of p) {
    if (ch >= '0' && ch <= '9') { level = Number(ch); cols.push({ level, top: 'flat' }); }
    else if (ch === 'U') { cols.push({ level, top: 'u2lo' }, { level, top: 'u2hi' }); level++; }
    else if (ch === 'D') { level--; cols.push({ level, top: 'd2hi' }, { level, top: 'd2lo' }); }
  }
  return cols;
}

/** The same profile read right to left: rises become falls and vice versa. */
const mirrorProfile = (p: Profile): Profile =>
  [...p].reverse().map((c) => (c === 'U' ? 'D' : c === 'D' ? 'U' : c)).join('');

/** Duplicate random flat columns until there are `width`, so slopes keep their flat landings. */
function widen(cols: Col[], width: number, rng: Rng): void {
  while (cols.length < width) {
    const flats = cols.map((c, i) => (c.top === 'flat' ? i : -1)).filter((i) => i >= 0);
    const i = pick(rng, flats);
    cols.splice(i, 0, { ...cols[i] });
  }
}

/** Lay the columns out as tiles from (x, baseY), the top of the bottom row. */
function columnTiles(cols: Col[], x: number, baseY: number): Platform[] {
  const T = TILE, tiles: Platform[] = [];
  cols.forEach((c, i) => {
    const cx = x + i * T;
    // Only the column's top tile gets a grass cap; the tiles under it are dirt.
    const cells = c.level + (c.top === 'flat' ? 0 : 1);
    for (let t = 0; t < c.level; t++) {
      const tile = tileFor('flat', cx, baseY - t * T);
      if (t < cells - 1) tile.inner = true;
      tiles.push(tile);
    }
    if (c.top !== 'flat') {
      tiles.push(tileFor(c.top, cx, baseY - c.level * T));
      if (c.top === 'u2lo' || c.top === 'd2lo') tiles[tiles.length - 2].foot = c.top === 'u2lo' ? 1 : -1;
    }
  });
  return tiles;
}

/** Each NB bit and the neighbour (in tiles) it stands for. */
const NEIGHBOURS: [bit: number, dx: number, dy: number][] = [
  [NB.N, 0, -1], [NB.E, 1, 0], [NB.S, 0, 1], [NB.W, -1, 0],
  [NB.NE, 1, -1], [NB.SE, 1, 1], [NB.SW, -1, 1], [NB.NW, -1, -1],
];

/** Autotile: set each flat tile's `nb` to the NB bits of its solid neighbours
 *  (slope tiles count), so tileset.ts draws borders only on exposed sides,
 *  with rounded corners. */
function autotile(tiles: Platform[]): void {
  const at = new Set(tiles.map((t) => `${t.x},${t.y}`));
  for (const t of tiles) {
    if (t.slope) continue;
    t.nb = NEIGHBOURS.reduce((nb, [bit, dx, dy]) => (at.has(`${t.x + dx * TILE},${t.y + dy * TILE}`) ? nb | bit : nb), 0);
  }
}

/** Build a solid block from a named profile, anchored at (x, baseY) = the top
 *  of its bottom row, `width` tiles wide (6-10; see widen), optionally
 *  mirrored. `rng` picks which flat columns widen it. */
export function makeShape(kind: string, x: number, baseY: number, width: number, mirror: boolean, rng: Rng): Shape {
  const prof = PROFILES[kind] ?? TOWN_PROFILES[kind] ?? PROFILES.flat;
  const cols = parseProfile(mirror ? mirrorProfile(prof) : prof);
  widen(cols, width, rng);
  const tiles = columnTiles(cols, x, baseY);
  autotile(tiles);
  return { tiles, w: cols.length * TILE, baseY, baseX: x };
}
