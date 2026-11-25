import { MOB_TYPES, WORLD, TILE } from './config';
import { net, roomId } from './net';
import { AREAS, areaName, blockOf, isAreaEnd, isTown, placeName, townStage } from './world';
import { hashStr, seeded } from './rng';
import { surfaceYAt } from './surface';
import { NB } from './nb';
import { rollMods } from './floormods';
import type { Climbable, Floor, MobType, Platform, Portal, Spawn } from './types';

// One stream per floor generation, seeded from the room name (minus its hour) so every player
// in a channel gets the same layout (reseeded at the top of generateFloor).
let rng = seeded(hashStr(roomId(1, net.channel, net.code, net.area, '')));
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

/** The enemies an area can field: its own set, or the general pool for areas without one yet. */
export function areaMobs(area: string): MobType[] {
  const own = MOB_TYPES.filter((m) => m.areas?.includes(area));
  return own.length >= 2 ? own : MOB_TYPES.filter((m) => !m.areas || m.areas.includes('*'));
}

/** A floor's two enemy types, picked from its area's set (same for everyone
 *  in the room: own seeded stream, so layouts don't shift). Each platform
 *  then fields one of them or both (see generateFloor). */
export function floorMobs(_n: number, seed: () => number): [string, string] {
  const pool = areaMobs(areaName(net.area)).map((m) => m.n);
  const a = Math.floor(seed() * pool.length);
  const b = (a + 1 + Math.floor(seed() * (pool.length - 1))) % pool.length;
  return [pool[a], pool[b]];
}

/**
 * Build a single tile-based floor of the tower: a ground slab at the bottom and
 * 7 platforms of varying shape/size/thickness scattered up the map, each
 * connected to the next by a rope/ladder that runs from the top surface of the
 * lower platform to the top surface of the upper one. Enemies stand on the
 * ground and on platforms; a portal on the summit leads to the next floor.
 * The stage after every area's 10th floor is a town instead: a designed layout (see townFloor).
 */
/** Enemies in a platform's group, by its walkable tiles: 4 on the
 *  shortest tops (6 tiles or fewer), one more per 2 tiles, up to 8. */
export const groupSize = (tiles: number): number => Math.max(4, Math.min(8, 4 + Math.floor((tiles - 6) / 2)));

/** Floors are laid out in a world this tall, then trimmed to fit (see Floor.h). */
export const GEN_H = 640;
const SKY_MARGIN = 2 * TILE; // clear sky kept above the portal
const MIN_H = 180;           // never shorter than the view

export function generateFloor(n: number): Floor {
  // layouts don't change with the hour: seeded from the room id without it
  rng = seeded(hashStr(roomId(n, net.channel, net.code, net.area, '')));
  if (isTown(n)) return trim(townFloor(n));
  const ground = groundSlab();
  const groundY = ground.y;

  const mrng = seeded(hashStr(roomId(n, net.channel, net.code, net.area, '') + '-mobs'));
  const pair = floorMobs(n, mrng);
  /** A platform fields one of the floor's two enemies (half the time) or both. */
  const zoneTypes = (): string[] => (mrng() < 0.5 ? [pair[mrng() < 0.5 ? 0 : 1]] : [...pair]);
  const platforms: Platform[] = [ground];
  const ropes: Climbable[] = [];
  const ladders: Climbable[] = [];
  const spawns: Spawn[] = [];

  const COUNT = 4;          // platforms per floor (was 14, then 7: floors halved twice)
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
      const width = randInt(12, 24); // 12-24 tiles wide (the map is 20)
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

    if (rand(0, 1) < 0.85) {
      // most platforms hold a group: 4 enemies on the shortest tops, up to 8
      // on the longest, spread over the on-screen flat top tiles
      const spots = shape.tiles
        .filter((t) => !t.inner && !t.slope && t.x >= 0 && t.x + TILE <= WORLD.w)
        .map((t) => ({ x: t.x + TILE / 2, y: t.y }));
      if (spots.length) {
        const xs = spots.map((s) => s.x);
        spawns.push({
          x: Math.round(top.x + top.w / 2), y: top.y, types: zoneTypes(), spots,
          cap: groupSize(spots.length), minX: Math.min(...xs), maxX: Math.max(...xs), block: i + 1,
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
  {
    const spots: { x: number; y: number }[] = [];
    for (let x = 48; x <= WORLD.w - 48; x += TILE) spots.push({ x, y: ground.y });
    spawns.push({ x: WORLD.w / 2, y: ground.y, types: [...pair], spots, cap: 4, minX: 24, maxX: WORLD.w - 24 });
  }

  // The exit portal sits centred on the highest platform's walkable top tile.
  const portal: Portal = { x: summitTop.x + summitTop.w / 2, y: summitTop.y, w: 40, h: 56, to: n + 1 };
  if (isAreaEnd(n)) portal.label = placeName(n + 1, net.area); // the way into the town names it

  // its own stream, so rolling a modifier never changes the layout
  const mods = rollMods(areaName(net.area), seeded(hashStr(roomId(n, net.channel, net.code, net.area, '') + '-mods')));
  return trim({ number: n, platforms, ropes, ladders, spawns, portal, portals: [portal], town: false, h: GEN_H, ...(mods.length ? { mods } : {}) });
}

/** The full-width ground slab every floor stands on: 4 tiles, not a wall
 *  (it was 8, mostly unseen). */
function groundSlab(): Platform {
  const h = 4 * TILE;
  return { x: 0, y: snap(GEN_H - h), w: WORLD.w, h, ground: true };
}

/**
 * A town (the stop after each area's 10 floors, see world.ts): one designed layout, not random, and no enemies.
 * Ways up from the ends of the ground into the areas above this one (left
 * and right where the path forks, the left end alone where it doesn't,
 * none at the top of a branch); on a floating plaza deck in the middle
 * (ladder on its left, rope on its right) a way back down to the town
 * below (the first town's leads to the floor below it). Players arrive
 * under the deck, between the up portals. Every other town (odd area ids)
 * has a second level: a loft over the deck's right side, up a ladder, where
 * the way down moves.
 */
export function townFloor(n: number): Floor {
  const ground = groundSlab();
  const deckW = 8, deckX = (WORLD.w - deckW * TILE) / 2;
  // a 3-tile block whose bottom leaves 2 tiles (32px) of headroom over the ground
  const deck = makeShape('flat', deckX, ground.y - 3 * TILE, deckW);
  deck.tiles.forEach((t) => { t.block = 1; });
  const deckTop = Math.min(...deck.tiles.map((t) => t.y));
  const P = (x: number, y: number, to: number, label: string, area: number): Portal =>
    ({ x, y, w: 40, h: 56, to, label, area });
  // labelled with where they lead: the areas ahead, and the town you came from
  const here = AREAS[net.area];
  const upX = [2 * TILE, WORLD.w - 2 * TILE];
  const ups = here.up.map((a, i) => P(upX[i], ground.y, n + 1, placeName(n + 1, a), a));
  // the loft: 5 tiles over the deck's columns 3-7, the same headroom over the
  // deck as the deck has over the ground; its ladder at its left end stays
  // clear of the way down further along it
  const loft = here.id % 2 === 1 ? makeShape('flat', deckX + 3 * TILE, deckTop - 3 * TILE, 5) : null;
  loft?.tiles.forEach((t) => { t.block = 2; });
  const loftTop = loft ? Math.min(...loft.tiles.map((t) => t.y)) : deckTop;
  const downX = loft ? deckX + 6 * TILE : WORLD.w / 2;
  const down = here.parent >= 0
    ? P(downX, loftTop, townStage(here.depth - 1), AREAS[here.parent].town, here.parent)
    : P(downX, loftTop, n - 1, placeName(n - 1, here.id), here.id);
  return {
    number: n, town: true, h: GEN_H,
    platforms: [ground, ...deck.tiles, ...(loft?.tiles ?? [])],
    ladders: [
      { x: deckX + TILE / 2, y1: deckTop, y2: ground.y },
      ...(loft ? [{ x: deckX + 3 * TILE + TILE / 2, y1: loftTop, y2: deckTop }] : []),
    ],
    ropes: [{ x: deckX + (deckW - 1) * TILE + TILE / 2, y1: deckTop, y2: ground.y }],
    spawns: [],
    portal: ups[0] ?? down, portals: [...ups, down],
    // the shopkeeper keeps a stall on the deck, left of the way down; from the
    // third town up (Lanternhollow) a trainer stands to the right of it;
    // the stylist works on the ground right of the deck, and a quest
    // board stands on the ground left of the ladder
    npcs: [
      { x: deckX + TILE + TILE / 2, y: deckTop, kind: 'shop', name: 'SHOP' },
      { x: deckX - TILE, y: ground.y, kind: 'board', name: 'QUESTS' },
      { x: deckX + (deckW + 1) * TILE, y: ground.y, kind: 'stylist', name: 'STYLIST' },
      ...(blockOf(n) >= 2 ? [{ x: deckX + (deckW - 2) * TILE, y: deckTop, kind: 'trainer' as const, name: 'TRAINER' }] : []),
    ],
  };
}

/** Trim the sky: shift everything up so the highest portal sits a couple of
 *  tiles under the top of the world, and size the floor to fit (never
 *  shorter than the view). Whole tiles, so the 16px grid stays put. */
function trim(f: Floor): Floor {
  const { platforms, ropes, ladders, spawns, portals } = f;
  const top = Math.min(...portals.map((p) => p.y - p.h), ...platforms.map((p) => p.y)) - SKY_MARGIN;
  const shift = Math.max(0, Math.min(Math.floor(top / TILE) * TILE, GEN_H - MIN_H));
  for (const p of platforms) p.y -= shift;
  for (const c of [...ropes, ...ladders]) { c.y1 -= shift; c.y2 -= shift; }
  for (const s of spawns) { s.y -= shift; s.spots?.forEach((q) => { q.y -= shift; }); }
  for (const p of portals) p.y -= shift;
  for (const n of f.npcs ?? []) n.y -= shift;
  f.h = GEN_H - shift;
  return f;
}
