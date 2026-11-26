import { MOB_TYPES, VARIANT_CHANCE, WORLD, TILE } from './config';
import { net, roomId } from './net';
import { areaOf, isPathEnd, isTown, lastTown, nextPlace, pathById, placeKey, placeName, type LayoutMix, type Place } from './world';
import { chance, hashStr, intIn, pick, range, seeded } from './rng';
import { surfaceYAt } from './surface';
import { rollMods } from './floormods';
import { makeShape, SHAPES, type Shape } from './floorshape';
import { GEN_H, groundSlab, trim } from './floorframe';
import { townFloor } from './townfloor';
import type { Climbable, Floor, MobType, Platform, Portal, Spawn } from './types';

/* Floor generation: the enemies a floor fields, its layout, and the seeded
   climb of blocks, ropes and ladders (towns: townfloor.ts; block shapes:
   floorshape.ts; the shared frame and trim: floorframe.ts). */

/** The enemies an area can field: its own set, or the general pool for areas without one yet. */
export function areaMobs(area: string): MobType[] {
  const own = MOB_TYPES.filter((m) => !m.of && m.areas?.includes(area));
  return own.length >= 2 ? own : MOB_TYPES.filter((m) => !m.of && (!m.areas || m.areas.includes('*')));
}

/** An enemy's variants that live in this area. */
export const variantsOf = (base: string, area: string): MobType[] =>
  MOB_TYPES.filter((m) => m.of === base && m.areas?.includes(area));

/** The enemy that actually spawns for a floor's type: now and then (VARIANT_CHANCE)
 *  one of its variants instead. `r` is a random number in [0, 1). */
export function pickVariant(type: MobType, area: string, r = Math.random()): MobType {
  const vs = variantsOf(type.n, area);
  if (!vs.length || r >= VARIANT_CHANCE) return type;
  return vs[Math.min(vs.length - 1, Math.floor(r / VARIANT_CHANCE * vs.length))];
}

/** A floor's two enemy types, picked from its area's set (same for everyone
 *  in the room: own seeded stream, so layouts don't shift). Each platform
 *  then fields one of them or both (see generateFloor). */
export function floorMobs(place: Place, seed: () => number): [string, string] {
  const pool = areaMobs(areaOf(place)).map((m) => m.n);
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

/** Floor layouts (each floor rolls one from its own seeded stream, so the
 *  classic layout of a floor doesn't shift):
 *  - stack: 4 wide blocks, each placed near the one below (the classic climb);
 *  - zigzag: 5 narrow blocks that switch sides, a switchback up the screen;
 *  - open: 3 long, low blocks spanning most of the map, with more enemies
 *    roaming the ground. */
export const LAYOUTS = {
  stack:  { weight: 5, count: 4, minW: 12, maxW: 24, shapes: SHAPES, groundCap: 4 },
  zigzag: { weight: 3, count: 5, minW: 7, maxW: 10, shapes: ['flat', 'low', 'ledge', 'hill', 'shelf', 'dip', 'waves'], groundCap: 4 },
  open:   { weight: 2, count: 3, minW: 20, maxW: 24, shapes: ['low', 'flat', 'shelf', 'waves', 'dip', 'hill'], groundCap: 6 },
};
export type Layout = keyof typeof LAYOUTS;

/** Roll a layout by a path's own mix of them (LAYOUTS' weights when it has none). */
export function pickLayout(seed: () => number, mix?: LayoutMix): Layout {
  const ks = Object.keys(LAYOUTS) as Layout[];
  const w = (k: Layout): number => (mix ? mix[k] ?? 0 : LAYOUTS[k].weight);
  let r = seed() * ks.reduce((a, k) => a + w(k), 0);
  for (const k of ks) { r -= w(k); if (r < 0) return k; }
  return ks.find((k) => w(k) > 0) ?? 'stack';
}

export function generateFloor(place: Place): Floor {
  // layouts don't change with the hour: seeded from the room id without it
  const seedId = roomId(placeKey(place), net.channel, net.code, '');
  // One stream per floor, seeded from the room name (minus its hour) so every
  // player in a channel gets the same layout. Everything below draws from it
  // in a fixed order: that order is part of the layout.
  const rng = seeded(hashStr(seedId));
  if (isTown(place)) return trim(townFloor(place.town, rng));
  const ground = groundSlab();
  const groundY = ground.y;

  const mrng = seeded(hashStr(seedId + '-mobs'));
  const pair = floorMobs(place, mrng);
  /** A platform fields one of the floor's two enemies (half the time) or both. */
  const zoneTypes = (): string[] => (mrng() < 0.5 ? [pair[mrng() < 0.5 ? 0 : 1]] : [...pair]);
  const platforms: Platform[] = [ground];
  const ropes: Climbable[] = [];
  const ladders: Climbable[] = [];
  const spawns: Spawn[] = [];

  const layout = pickLayout(seeded(hashStr(seedId + '-layout')), pathById(place.path)?.layouts);
  const L = LAYOUTS[layout];
  const COUNT = L.count;     // platforms per floor (was 14, then 7: floors halved twice)
  const step = 3 * TILE;     // summit to the next block's base (+0-1 tile): 2-3 tiles of headroom
  const startY = groundY - step;

  let prev: Platform = ground;
  let y = startY;
  let summitTop: Platform = ground;
  // the highest block's full walkable top row (not just the tile the climb
  // ends on) — the exit portal picks a spot along it so the climb's finish varies
  let summitTops: Platform[] = [ground];
  for (let i = 0; i < COUNT; i++) {
    // A rope must hang where the player can reach it: the player's centre is
    // clamped a body half-width from the map edges and a grab reaches
    // 6.5px, so the outermost tile column on each side is out of reach.
    const reachable = (t: Platform, dx: number) => t.x + dx >= TILE && t.x + dx + 2 * TILE <= WORLD.w;
    // The surface a climb hanging at cx from height y lands on: the first
    // walkable top below it (an earlier, lower block or the ground).
    const below = platforms.filter((p) => !p.inner);
    const landingAt = (cx: number, y: number) => {
      let best: Platform = ground, bestY = ground.y;
      for (const p of below) {
        if (cx < p.x || cx >= p.x + p.w) continue;
        const sy = surfaceYAt(p, cx);
        if (sy > y && sy < bestY) { best = p; bestY = sy; }
      }
      return { p: best, y: bestY };
    };
    // Never stack climbs: a column where this one's foot would meet (or
    // overlap) the top of a climb further down reads as one long rope.
    const stacked = (cx: number, y: number) => [...ropes, ...ladders].some((c) =>
      Math.abs(c.x - cx) < TILE && landingAt(cx, y).y >= c.y1 - 1);
    const hangs = (t: Platform, dx: number) => reachable(t, dx) && !stacked(t.x + dx + TILE / 2, t.y);
    let shape: Shape, minY: number, x: number;
    for (;;) {
      const kind = pick(rng, L.shapes);
      const width = intIn(rng, L.minW, L.maxW); // stack: 12-24 tiles wide (the map is 20)
      shape = makeShape(kind, 0, y, width, chance(rng, 0.5), rng);
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
      // zigzag: hug alternate sides of the map; otherwise near the last block
      const target = layout === 'zigzag'
        ? (i % 2 ? WORLD.w - shape.w - range(rng, 0, 2) * TILE : range(rng, 0, 2) * TILE)
        : prev.x + range(rng, -160, 160);
      let best: number | null = null;
      for (let cx = -EDGE; cx <= WORLD.w - shape.w + EDGE; cx += TILE) {
        const visible = Math.min(cx + shape.w, WORLD.w) - Math.max(cx, 0);
        if (visible < 6 * TILE || !summit.some((t) => hangs(t, cx))) continue;
        if (best === null || Math.abs(cx - target) < Math.abs(best - target)) best = cx;
      }
      if (best !== null) { x = best; break; }
    }
    shape.tiles.forEach((t) => { t.x += x; t.block = i + 1; platforms.push(t); });
    const tops = shape.tiles.filter((t) => t.y === minY && !t.slope && hangs(t, 0));

    // Rope/ladder hangs from a summit tile, centred on it, down through its
    // own block to the first walkable surface below. Prefer summit columns
    // that land on a flat tile so the bottom of the rope is easy to catch.
    const landing = (t: Platform) => landingAt(t.x + TILE / 2, t.y);
    const flatLanding = tops.filter((t) => !landing(t).p.slope);
    const pool = flatLanding.length ? flatLanding : tops;
    const top = pick(rng, pool);
    const climb: Climbable = { x: top.x + TILE / 2, y1: top.y, y2: landing(top).y };
    if (chance(rng, 0.5)) ropes.push(climb); else ladders.push(climb);

    if (chance(rng, 0.85)) {
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
    summitTops = pool; // this block's walkable summit tiles (the last block's win)
    // the next block sits a fixed gap above this one's summit (not its base), so
    // a tall block doesn't squeeze the gap above it and every gap matches the
    // ground-to-first one
    y = minY - step - TILE * intIn(rng, 0, 1); // stays on the 16px grid
  }

  // The ground slab is one zone holding up to 4 enemies (6 on open floors).
  {
    const spots: { x: number; y: number }[] = [];
    for (let x = 48; x <= WORLD.w - 48; x += TILE) spots.push({ x, y: ground.y });
    spawns.push({ x: WORLD.w / 2, y: ground.y, types: [...pair], spots, cap: L.groundCap, minX: 24, maxX: WORLD.w - 24 });
  }

  // The exit portal sits on the highest platform's walkable top, at a random
  // spot along it (not always the middle), so the top of the climb varies.
  const pad = summitTops.find((t) => !t.slope) ?? summitTop;
  const landing = summitTops.length ? summitTops[Math.floor(rng() * summitTops.length)] : pad;
  const portal: Portal = { x: landing.x + landing.w / 2, y: landing.y, w: 40, h: 56, to: nextPlace(place) };
  if (isPathEnd(place)) portal.label = placeName(portal.to); // the way into the town names it
  // And a way back down on the ground, at the far end from where you arrive:
  // it takes you to the town below and asks before it sends you.
  const back: Portal = { x: WORLD.w - 4 * TILE, y: ground.y, w: 40, h: 56, to: { town: lastTown(place) }, down: true, label: placeName({ town: lastTown(place) }) };

  // its own stream, so rolling a modifier never changes the layout
  const mods = rollMods(areaOf(place), seeded(hashStr(seedId + '-mods')));
  return trim({ place, platforms, ropes, ladders, spawns, portal, portals: [portal, back], town: false, h: GEN_H, layout, ...(mods.length ? { mods } : {}) });
}
