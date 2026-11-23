import { MOB_TYPES, WORLD, TILE } from './config';
import { net, roomId } from './net';
import { hashStr, seeded } from './rng';
import { surfaceYAt } from './surface';
import { NB } from './nb';
import type { Climbable, Floor, MobType, Platform, Portal, Spawn } from './types';

// One stream per floor generation, seeded from the room name so every player
// in a channel gets the same layout (reseeded at the top of generateFloor).
let rng = seeded(hashStr(roomId(1, net.channel)));
const rand = (a: number, b: number): number => a + rng() * (b - a);
const randInt = (a: number, b: number): number => Math.floor(rand(a, b + 1));
/** Snap a coordinate to the tile grid. */
const snap = (v: number): number => Math.round(v / TILE) * TILE;

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
interface Col { level: number; top: Top; }

/** Profiles (spec: specs/platforms). Digits are flat columns at that height in
 *  tiles (2-4); `U` / `D` are 2:1 slopes up / down (two side-by-side columns,
 *  lower + upper half, rising one tile). Every slope rises from and falls into
 *  a flat column, never at an edge. */
const PROFILES: Record<string, string> = {
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

function parseProfile(p: string): Col[] {
  const cols: Col[] = [];
  let level = Number(p[0]);
  for (const ch of p) {
    if (ch >= '0' && ch <= '9') { level = Number(ch); cols.push({ level, top: 'flat' }); }
    else if (ch === 'U') { cols.push({ level, top: 'u2lo' }, { level, top: 'u2hi' }); level++; }
    else if (ch === 'D') { level--; cols.push({ level, top: 'd2hi' }, { level, top: 'd2lo' }); }
  }
  return cols;
}

/** Build a solid block from a named profile, anchored at (x, baseY) = the top
 *  of its bottom row. Flat columns are duplicated at random until the block is
 *  `width` tiles wide (6-10), so slopes always keep their flat landings. */
export function makeShape(kind: string, x: number, baseY: number, width = 6, mirror = false): Shape {
  const T = TILE;
  let prof = PROFILES[kind] ?? PROFILES.flat;
  // mirrored: reverse the profile, so rises become falls and vice versa
  if (mirror) prof = [...prof].reverse().map((c) => (c === 'U' ? 'D' : c === 'D' ? 'U' : c)).join('');
  const cols = parseProfile(prof);
  while (cols.length < width) {
    const flats = cols.map((c, i) => (c.top === 'flat' ? i : -1)).filter((i) => i >= 0);
    const i = flats[randInt(0, flats.length - 1)];
    cols.splice(i, 0, { ...cols[i] });
  }
  const tiles: Platform[] = [];
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
  // Autotile: record which of each tile's 8 neighbours are solid (slope tiles
  // count), so it draws borders only on exposed sides with rounded corners.
  const at = new Set(tiles.map((t) => `${t.x},${t.y}`));
  const has = (tx: number, ty: number) => at.has(`${tx},${ty}`);
  for (const t of tiles) {
    if (t.slope) continue;
    let nb = 0;
    if (has(t.x, t.y - T)) nb |= NB.N;
    if (has(t.x + T, t.y)) nb |= NB.E;
    if (has(t.x, t.y + T)) nb |= NB.S;
    if (has(t.x - T, t.y)) nb |= NB.W;
    if (has(t.x + T, t.y - T)) nb |= NB.NE;
    if (has(t.x + T, t.y + T)) nb |= NB.SE;
    if (has(t.x - T, t.y + T)) nb |= NB.SW;
    if (has(t.x - T, t.y - T)) nb |= NB.NW;
    t.nb = nb;
  }
  return { tiles, w: cols.length * T, baseY, baseX: x };
}

/** A mob type appropriate to the floor's height (higher floors = tougher mobs). */
function mobForFloor(n: number): MobType {
  const t = Math.min(MOB_TYPES.length - 1, Math.floor((n - 1) / 3));
  return MOB_TYPES[t];
}

/**
 * Build a single tile-based floor of the tower: a ground slab at the bottom and
 * 7 platforms of varying shape/size/thickness scattered up the map, each
 * connected to the next by a rope/ladder that runs from the top surface of the
 * lower platform to the top surface of the upper one. Enemies stand on the
 * ground and on platforms; a portal on the summit leads to the next floor.
 * Every 10th floor is a town (no enemies; its portal leads on up).
 */
export function generateFloor(n: number): Floor {
  rng = seeded(hashStr(roomId(n, net.channel)));
  const town = n % 10 === 0;
  const groundH = 8 * TILE;
  const groundY = snap(WORLD.h - groundH);
  const ground: Platform = { x: 0, y: groundY, w: WORLD.w, h: groundH, ground: true };

  const platforms: Platform[] = [ground];
  const ropes: Climbable[] = [];
  const ladders: Climbable[] = [];
  const spawns: Spawn[] = [];

  const COUNT = 7;          // platforms per floor (was 14: floors are half as tall)
  const step = 3 * TILE;     // summit to the next block's base (+0-1 tile): 2-3 tiles of headroom
  const startY = groundY - step;

  let prev: Platform = ground;
  let y = startY;
  let summitTop: Platform = ground;
  for (let i = 0; i < COUNT; i++) {
    // A rope must hang where the player can reach it: the player's centre is
    // clamped a body half-width from the map edges and a grab reaches
    // 6.5px, so the outermost tile column on each side is out of reach.
    const reachable = (t: Platform, dx: number) => t.x + dx >= TILE && t.x + dx + 2 * TILE <= WORLD.w;
    let shape: Shape, minY: number, x: number;
    for (;;) {
      const kind = SHAPES[randInt(0, SHAPES.length - 1)];
      const width = randInt(6, 24); // 6-24 tiles wide (the map is 20)
      shape = makeShape(kind, 0, y, width, rand(0, 1) < 0.5);
      // The walkable summit: flat tiles on the block's highest row (slope
      // tiles share that row's y but their surface is lower).
      const top = shape.tiles.reduce((m, t) => Math.min(m, t.y), Infinity);
      minY = top;
      const summit = shape.tiles.filter((t) => t.y === top && !t.slope);
      // Place x near the previous platform. Blocks 12+ tiles wide may run off
      // either side of the map (by up to EDGE tiles) as long as 6+ columns
      // stay on screen; narrower blocks stay fully on screen. Either way a
      // summit tile must be reachable for the rope. Pick the valid position
      // nearest a random target; if none exists, try another shape.
      const EDGE = width >= 12 ? 4 * TILE : 0;
      const target = prev.x + rand(-160, 160);
      let best: number | null = null;
      for (let cx = -EDGE; cx <= WORLD.w - shape.w + EDGE; cx += TILE) {
        const visible = Math.min(cx + shape.w, WORLD.w) - Math.max(cx, 0);
        if (visible < 6 * TILE || !summit.some((t) => reachable(t, cx))) continue;
        if (best === null || Math.abs(cx - target) < Math.abs(best - target)) best = cx;
      }
      if (best !== null) { x = best; break; }
    }
    shape.tiles.forEach((t) => { t.x += x; t.block = i + 1; platforms.push(t); });
    const tops = shape.tiles.filter((t) => t.y === minY && !t.slope && reachable(t, 0));

    // Rope/ladder hangs from a summit tile, centred on it, down through its
    // own block to the first walkable surface of anything below (an earlier,
    // lower platform or the ground). Prefer summit columns that land on a flat
    // tile so the bottom of the rope is easy to catch.
    const placed = new Set<Platform>(shape.tiles);
    const below = platforms.filter((p) => !p.inner && !placed.has(p));
    const landing = (t: Platform) => {
      const cx = t.x + TILE / 2;
      let best: Platform = ground, bestY = ground.y;
      for (const p of below) {
        if (cx < p.x || cx >= p.x + p.w) continue;
        const sy = surfaceYAt(p, cx);
        if (sy > t.y && sy < bestY) { best = p; bestY = sy; }
      }
      return { p: best, y: bestY };
    };
    const flatLanding = tops.filter((t) => !landing(t).p.slope);
    const pool = flatLanding.length ? flatLanding : tops;
    const top = pool[randInt(0, pool.length - 1)];
    const climb: Climbable = { x: top.x + TILE / 2, y1: top.y, y2: landing(top).y };
    if (rand(0, 1) < 0.5) ropes.push(climb); else ladders.push(climb);

    if (!town && rand(0, 1) < 0.6) {
      // a spawn zone on this platform's on-screen flat top tiles; long tops hold 2
      const spots = shape.tiles
        .filter((t) => !t.inner && !t.slope && t.x >= 0 && t.x + TILE <= WORLD.w)
        .map((t) => ({ x: t.x + TILE / 2, y: t.y }));
      if (spots.length) {
        const xs = spots.map((s) => s.x);
        spawns.push({
          x: Math.round(top.x + top.w / 2), y: top.y, t: mobForFloor(n).lvl, spots,
          cap: spots.length >= 10 ? 2 : 1, minX: Math.min(...xs), maxX: Math.max(...xs),
        });
      }
    }
    prev = top;
    summitTop = top;
    // the next block sits a fixed gap above this one's summit (not its base), so
    // a tall block doesn't squeeze the gap above it and every gap matches the
    // ground-to-first one
    y = minY - step - TILE * randInt(0, 1); // stays on the 16px grid
  }

  // The ground slab is one zone holding up to 4 enemies.
  if (!town) {
    const spots: { x: number; y: number }[] = [];
    for (let x = 48; x <= WORLD.w - 48; x += TILE) spots.push({ x, y: ground.y });
    spawns.push({ x: WORLD.w / 2, y: ground.y, t: mobForFloor(n).lvl, spots, cap: 4, minX: 24, maxX: WORLD.w - 24 });
  }

  // The exit portal sits centred on the highest platform's walkable top tile.
  const portal: Portal = { x: summitTop.x + summitTop.w / 2, y: summitTop.y, w: 40, h: 56 };

  return { number: n, platforms, ropes, ladders, spawns, portal, town };
}
