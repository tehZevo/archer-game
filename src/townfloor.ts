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
 *  - plaza: a floating deck in the middle, ladder on its left, rope on its right;
 *  - loft: the plaza, plus a loft over the deck's right side holding the way down;
 *  - market: two stall decks either side, a bridge between them up top;
 *  - terrace: two terraces stepping up to the right.
 * Every level has two tiles (32px) of headroom under the next one up. Houses,
 * lamps, benches and the like (decor) are drawn behind; they never collide.
 */
/** The pieces a town plan is built from: the ground height `G`, tile size `T`,
 *  and the helpers that place a level, climb, NPC and decoration. */
interface TownKit {
  G: number; T: number;
  level: (col: number, w: number, storey: 1 | 2) => { x: number; top: number; w: number };
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
    // a deck over columns 6-13 (ladder on its left, rope on its right)...
    const deck = level(6, 8, 1);
    ladder(6, deck.top, G); rope(13, deck.top, G);
    npc('shop', at(7), deck.top); npc('trainer', at(12) - T / 2, deck.top);
    npc('board', at(4) + T / 2, G); npc('stylist', at(15) - T / 2, G); npc('pets', at(10), G); npc('sage', at(7) + 4, G);
    deco('awning', at(7), deck.top); deco('flowers', at(10) - T / 2, deck.top);
    deco('house', at(9) + T / 2, G); deco('lamp', at(4) - T / 2, G); deco('lamp', at(15) + T / 2, G);
    deco('bench', at(11), G); deco('crate', at(12) + 4, G);
    if (plan === 'loft') {
      // ...and a loft over the deck's columns 9-13, up a ladder at its left end
      const loft = level(9, 5, 2);
      ladder(9, loft.top, deck.top);
      deco('lamp', at(13) + 4, loft.top); deco('barrel', at(10) + 4, loft.top);
      return { x: 12 * T, y: loft.top };
    }
    return { x: WORLD.w / 2, y: deck.top };
  }
  if (plan === 'market') {
    // two stall decks (shop left, trainer right), a bridge between them holding the way down
    const left = level(4, 5, 1), right = level(11, 5, 1), bridge = level(7, 6, 2);
    ladder(4, left.top, G); rope(15, right.top, G);
    ladder(7, bridge.top, left.top); rope(12, bridge.top, right.top);
    npc('shop', at(5) + 4, left.top); npc('trainer', at(14) - 4, right.top);
    npc('board', at(5) + T / 2, G); npc('stylist', at(14), G); npc('pets', at(11) + 2, G); npc('sage', at(8) + 4, G);
    deco('awning', at(5) + 4, left.top); deco('awning', at(14) - 4, right.top, true);
    deco('crate', at(8) - 4, left.top); deco('barrel', at(11) + 4, right.top);
    deco('lamp', at(8) + 4, bridge.top); deco('lamp', at(11) - 4, bridge.top);
    deco('well', at(9) + T / 2, G); deco('house', at(5) + 4, left.top); deco('house', at(14) - 4, right.top, true);
    deco('flowers', at(8) - 2, G); deco('flowers', at(11) + 2, G);
    return { x: at(9) + T / 2, y: bridge.top };
  }
  // terraces stepping up to the right: a low one on the left, a high one on the right
  const low = level(4, 7, 1), high = level(9, 7, 2);
  ladder(4, low.top, G); rope(9, high.top, low.top); rope(15, high.top, G);
  npc('shop', at(5) + 4, low.top); npc('trainer', at(8), low.top);
  npc('board', at(5) + 4, G); npc('stylist', at(8), G); npc('pets', at(12) + 4, G); npc('sage', at(10) - 4, high.top);
  deco('awning', at(5) + 4, low.top); deco('flowers', at(14) - 2, high.top);
  deco('tower', at(12) + T / 2, high.top); deco('house', at(7), low.top);
  deco('lamp', at(10), G); deco('bench', at(11) + 4, G); deco('fence', at(14) - 4, G); deco('flowers', at(10) - 4, low.top);
  return { x: at(12) + T / 2, y: high.top };
}

export function townFloor(town: string, rng: Rng): Floor {
  const ground = groundSlab(), G = ground.y, T = TILE;
  const plan = townPlanFor(townIndex(town));
  const P = (x: number, y: number, to: Place, label: string): Portal => ({ x, y, w: 40, h: 56, to, label });
  // ways up at the ends of the ground (more than two paths up would share the right end)
  const upX = [2 * T, WORLD.w - 2 * T];
  // ...labelled with where they lead, and the level of the enemies on the first floor up there
  const ups = pathsFrom(town).map((p, i) => {
    const to: Place = { path: p.id, floor: 1 };
    return { ...P(upX[Math.min(i, upX.length - 1)] - Math.max(0, i - 1) * 44, G, to, placeName(to)), lvl: p.lvl[0] };
  });
  const platforms: Platform[] = [ground], ladders: Climbable[] = [], ropes: Climbable[] = [];
  const npcs: Npc[] = [], decor: Decor[] = [];
  let blockId = 0;
  /** A level: a 3-tile block `w` tiles wide from column `col`, on storey 1 (over the
   *  ground) or 2 (over storey 1), each with two tiles of headroom under it. */
  const level = (col: number, w: number, storey: 1 | 2): { x: number; top: number; w: number } => {
    const sh = makeShape('flat', col * T, G - (3 + (storey - 1) * 5) * T, w, false, rng), id = ++blockId;
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
  return {
    place: { town }, town: true, h: GEN_H, layout: plan,
    platforms, ladders, ropes, spawns: [],
    portal: ups[0] ?? down[0], portals: [...ups, ...down],
    npcs, decor,
  };
}
