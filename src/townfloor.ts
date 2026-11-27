import { WORLD, TILE } from './config';
import { pathsFrom, pathsInto, placeName, townDepth, townIndex, type Place } from './world';
import type { Rng } from './rng';
import { makeShape } from './floorshape';
import { GEN_H, groundSlab } from './floorframe';
import type { Climbable, Decor, DecorKind, Floor, Npc, Platform, Portal } from './types';

/* Towns: the designed (not random) floors between each area's climbs. */

/** Town layouts, picked by the town's index in TOWNS (so each town is always the same): see townFloor. */
export const TOWN_PLANS = ['plaza', 'loft', 'market', 'terrace'] as const;
export type TownPlan = typeof TOWN_PLANS[number];
export const townPlanFor = (index: number): TownPlan => TOWN_PLANS[index % TOWN_PLANS.length];

/**
 * A town (the stop after each area's floors, see world.ts): a designed
 * layout, not random, and no enemies. Ways up stand at the ends of the
 * ground (left and right where the path forks, the left end alone where it
 * doesn't, none at the top of a branch); the way back down to the town below
 * stands up on the highest level (the first town has none). Players arrive on
 * the ground in the middle. The layout is one of TOWN_PLANS, by area id:
 *  - plaza: two decks over the ground (a balcony over the west one), the way down on the east one;
 *  - loft: the two decks, plus a loft over the west deck's right side holding the way down;
 *  - market: two stall decks either side, a bridge between them up top;
 *  - terrace: two terraces stepping up to the right, and a ledge off to the right.
 * Every town has at least two decks just over the ground with its people
 * spread across them, at heights a tile apart. Every level has two or three
 * tiles of headroom under the next one up. Houses,
 * lamps, benches and the like (decor) are drawn behind; they never collide.
 */
/** The pieces a town plan is built from: the ground height `G`, tile size `T`,
 *  and the helpers that place a level, climb, NPC and decoration. */
interface TownKit {
  G: number; T: number;
  level: (col: number, w: number, storey: 1 | 2, lift?: number) => { x: number; top: number; w: number };
  at: (col: number) => number;
  ladder: (col: number, top: number, bottom: number) => void;
  rope: (col: number, top: number, bottom: number) => void;
  npc: (kind: Npc['kind'], x: number, y: number) => void;
  deco: (kind: DecorKind, x: number, y: number, flip?: boolean) => void;
}

/** Lay out one town plan's decks, climbs, NPCs and decor, returning where its
 *  way down to the town below sits. */
function buildPlan(plan: TownPlan, k: TownKit): { x: number; y: number } {
  const { G, T, level, at, ladder, rope, npc, deco } = k;
  if (plan === 'plaza' || plan === 'loft') {
    // two decks over the ground, the east one a tile higher: the west deck
    // (columns 8-15, ladder left, rope right) holds the shop, the east one
    // (columns 21-28) the trainer and the sage
    const west = level(8, 8, 1);
    ladder(8, west.top, G); rope(15, west.top, G);
    npc('shop', at(9) + 4, west.top);
    deco('awning', at(9) + 4, west.top); deco('flowers', at(13), west.top);
    // the loft plan's loft goes over the west deck's right side (built second, so it's level 2)
    let loftTop = 0;
    if (plan === 'loft') {
      const loft = level(11, 5, 2);
      ladder(11, loft.top, west.top);
      deco('lamp', at(15) + 4, loft.top);
      loftTop = loft.top;
    }
    const east = level(21, 8, 1, 1);
    ladder(21, east.top, G); rope(28, east.top, G);
    npc('trainer', at(27) - 4, east.top); npc('sage', at(22) + 6, east.top);
    deco('flowers', at(26), east.top);
    npc('board', at(5) + T / 2, G); npc('stylist', at(30) - T / 2, G); npc('pets', at(18), G);
    deco('house', at(18) + T / 2, G); deco('lamp', at(6) - T / 2, G); deco('lamp', at(31) + T / 2, G);
    deco('bench', at(24), G); deco('crate', at(12) + 4, G);
    if (plan === 'loft') return { x: at(14), y: loftTop };
    // the plaza's own 2nd storey: a balcony over the west deck's left columns,
    // and the way down on the east deck between its ladder and rope
    const balcony = level(8, 5, 2);
    ladder(8, balcony.top, west.top);
    deco('lamp', at(12) - 4, balcony.top); deco('flowers', at(9) + 4, balcony.top);
    return { x: at(24) + T / 2, y: east.top };
  }
  if (plan === 'market') {
    // two stall decks (shop left, trainer right, the right a tile higher), a bridge
    // between them holding the way down
    const left = level(8, 8, 1), right = level(24, 8, 1, 1), bridge = level(15, 10, 2, 1);
    ladder(8, left.top, G); rope(25, right.top, G);
    ladder(15, bridge.top, left.top); rope(24, bridge.top, right.top);
    npc('shop', at(10) + 4, left.top); npc('trainer', at(30) - 4, right.top); npc('sage', at(13), left.top);
    npc('board', at(10) + T / 2, G); npc('stylist', at(30), G); npc('pets', at(27) + 2, right.top);
    deco('awning', at(10) + 4, left.top); deco('awning', at(30) - 4, right.top, true);
    deco('crate', at(13) - 4, left.top); deco('barrel', at(27) + 4, right.top);
    deco('lamp', at(17) + 4, bridge.top); deco('lamp', at(23) - 4, bridge.top);
    deco('well', at(19) + T / 2, G); deco('house', at(10) + 4, left.top); deco('house', at(30) - 4, right.top, true);
    deco('flowers', at(16) - 2, G); deco('flowers', at(26) + 2, G);
    return { x: at(19) + T / 2, y: bridge.top };
  }
  // terraces stepping up to the right: a low one on the left, a high one over
  // its right end, and a ledge a tile higher off to the right
  const low = level(6, 12, 1), high = level(14, 12, 2), ledge = level(27, 5, 1, 1);
  ladder(6, low.top, G); rope(15, high.top, low.top); rope(25, high.top, G); ladder(31, ledge.top, G);
  npc('shop', at(7) + 4, low.top); npc('trainer', at(13), low.top);
  npc('board', at(7) + 4, G); npc('stylist', at(13), G); npc('pets', at(28) + 4, ledge.top); npc('sage', at(22) - 4, high.top);
  deco('awning', at(7) + 4, low.top); deco('flowers', at(24) - 2, high.top); deco('flowers', at(30), ledge.top);
  deco('tower', at(22) + T / 2, high.top); deco('house', at(10), low.top);
  deco('lamp', at(20), G); deco('bench', at(23) + 4, G); deco('fence', at(30) - 4, G); deco('flowers', at(12) - 4, low.top);
  return { x: at(22), y: high.top };
}


/** Columns across the world, and the training dummy's perch against the right wall. */
const COLS = WORLD.w / TILE, PERCH_W = 3;

export function townFloor(town: string, rng: Rng): Floor {
  const ground = groundSlab(), G = ground.y, T = TILE;
  const plan = townPlanFor(townIndex(town));
  const P = (x: number, y: number, to: Place, label: string): Portal => ({ x, y, w: 40, h: 56, to, label });
  // ways up at the ends of the ground (more than two paths up would share the right end)
  const upX = [2 * T, WORLD.w - 6 * T];
  // ...labelled with where they lead, and the level of the enemies on the first floor up there
  const ups = pathsFrom(town).map((p, i) => {
    const to: Place = { path: p.id, floor: 1 };
    return { ...P(upX[Math.min(i, upX.length - 1)] - Math.max(0, i - 1) * 44, G, to, placeName(to)), lvl: p.lvl[0] };
  });
  const platforms: Platform[] = [ground], ladders: Climbable[] = [], ropes: Climbable[] = [];
  const npcs: Npc[] = [], decor: Decor[] = [];
  let blockId = 0;
  /** A level: a 3-tile block `w` tiles wide from column `col`, on storey 1 (over the
   *  ground) or 2 (over storey 1), each with two tiles of headroom under it, or
   *  three when lifted a tile (so the decks' heights vary a little). */
  const level = (col: number, w: number, storey: 1 | 2, lift = 0): { x: number; top: number; w: number } => {
    const sh = makeShape('flat', col * T, G - (3 + (storey - 1) * 5 + lift) * T, w, false, rng), id = ++blockId;
    sh.tiles.forEach((t) => { t.block = id; });
    platforms.push(...sh.tiles);
    return { x: col * T, top: Math.min(...sh.tiles.map((t) => t.y)), w: w * T };
  };
  const at = (col: number): number => col * T + T / 2; // the middle of a column
  const ladder = (col: number, top: number, bottom: number): void => { ladders.push({ x: at(col), y1: top, y2: bottom }); };
  const rope = (col: number, top: number, bottom: number): void => { ropes.push({ x: at(col), y1: top, y2: bottom }); };
  const npc = (kind: Npc['kind'], x: number, y: number): void => {
    const name = { shop: 'SHOP', trainer: 'TRAINER', stylist: 'STYLIST', board: 'QUESTS', pets: 'PETS', sage: 'SAGE' }[kind];
    if (kind !== 'trainer' || townDepth(town) >= 2) npcs.push({ x, y, kind, name }); // trainers from the third town up
  };
  const deco = (kind: DecorKind, x: number, y: number, flip = false): void => { decor.push({ x, y, kind, ...(flip ? { flip } : {}) }); };

  // The plan's decks, climbs, NPCs and decor, and where its way down sits.
  const downAt = buildPlan(plan, { G, T, level, at, ladder, rope, npc, deco });
  // a way down to the start of every path that ends here, side by side (the
  // start town is the bottom of the world: none)
  const down = pathsInto(town).map((p, i) => {
    const to: Place = { town: p.from };
    return { ...P(downAt.x + i * 44, downAt.y, to, placeName(to)), down: true };
  });
  if (down.length) deco('sign', downAt.x - 30, downAt.y);
  // the training dummy's perch against the right wall, high over the way up
  // under it; its ladder stands on a one-tile step you hop onto, so climbing
  // down never drops you into that portal
  const block = (kind: string, cols: number, base: number): number => {
    const sh = makeShape(kind, (COLS - cols) * T, base, cols, false, rng), id = ++blockId;
    sh.tiles.forEach((t) => { t.block = id; });
    platforms.push(...sh.tiles);
    return Math.min(...sh.tiles.map((t) => t.y));
  };
  // the dummy stands on its own low ledge against the right wall (clear of
  // the minimap up in the corner), one tile up a step and a short ladder
  const perchTop = block('perch', PERCH_W, G - 4 * T), stepTop = block('step', 1, G - T);
  ladder(COLS - 1, perchTop, stepTop);
  return {
    dummy: { x: (COLS - PERCH_W) * T + 4, y: perchTop },
    place: { town }, town: true, h: GEN_H, layout: plan,
    platforms, ladders, ropes, spawns: [],
    portal: ups[0] ?? down[0], portals: [...ups, ...down],
    npcs, decor,
  };
}
