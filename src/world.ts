/* ============================================================
   WORLD MAP
   The world is towns joined by paths. A town is a junction: no path owns
   it, and any number of paths may start or end there (the map is a graph;
   today's happens to be a tree). A path is a run of combat floors climbed
   one way, from its start town up to its end town. Each town keeps a
   direct way back down to the start town of every path that ends there.

   Where you are is a Place: a town on its own, or a path and a floor on it
   (from 1). Towns and paths have short fixed ids (lowercase letters) that
   room names, floor seeds, saves and portals use, so a place's id never
   shifts when the map grows.

   Each path declares its own floor count, the level range its enemies
   climb through, and its own mix of the shared floor layouts (stack,
   zigzag, open: see LAYOUTS in floor.ts).
   ============================================================ */

import { BACKDROPS } from './backdrop';

/** A town: its id, its name, and (only where no path leads in) the area whose look it takes. */
export interface Town {
  id: string;
  name: string;
  /** The area it takes its tileset and enemies (for quests) from: the path
   *  leading into it unless set (the start town has no path in). */
  area?: string;
}

/** Layout weights for a path's floors (missing layouts never roll). */
export type LayoutMix = Partial<Record<'stack' | 'zigzag' | 'open', number>>;

/** A path: floors climbed from one town up to another. */
export interface Path {
  id: string;
  /** Its area name ("Whispering Woods"): the tileset, enemies and status effects. */
  name: string;
  from: string;
  to: string;
  floors: number;
  /** Enemy level on its first floor and its last, spread evenly between. */
  lvl: [number, number];
  layouts: LayoutMix;
}

export type Place = { town: string } | { path: string; floor: number };

// Towns in map order (left branches first): the order picks each town's
// layout and palette (see townPlanFor, townPal).
export const TOWNS: readonly Town[] = [
  // the start: a calm dock whose way up leads to the Beach
  { id: 'saltwick', name: 'Saltwick Port', area: 'Harbor' },
  { id: 'driftwood', name: 'Driftwood Rest' },
  { id: 'mossgate', name: 'Mossgate Village' },
  { id: 'fernwick', name: 'Fernwick Hamlet' },
  { id: 'sporehollow', name: 'Sporehollow Camp' },
  { id: 'glimmerdeep', name: 'Glimmerdeep Town' },
  { id: 'gearholm', name: 'Gearholm City' },
  { id: 'reedmouth', name: 'Reedmouth Village' },
  { id: 'tidewatch', name: 'Tidewatch Outpost' },
  { id: 'wrackhaven', name: 'Wrackhaven Cove' },
  { id: 'stillwater', name: 'Stillwater Town' },
  { id: 'thistledown', name: 'Thistledown Station' },
  { id: 'lanternhollow', name: 'Lanternhollow Town' },
  { id: 'emberfold', name: 'Emberfold Village' },
  { id: 'highcrag', name: 'Highcrag Hold' },
  { id: 'cloudharbor', name: 'Cloudharbor Town' },
  { id: 'windrest', name: 'Windrest Camp' },
  { id: 'summitlodge', name: 'Summit Lodge' },
  { id: 'hollowmere', name: 'Hollowmere Town' },
  { id: 'bellcourt', name: 'Bellcourt Abbey' },
  { id: 'willowmere', name: 'Willowmere Village' },
  { id: 'duskmeadow', name: 'Duskmeadow Hamlet' },
  { id: 'nullhaven', name: 'Nullhaven Refuge' },
  { id: 'ashengate', name: 'Ashen Gate Fort' },
];

// A town's ways up are its paths in this order, left to right.
export const PATHS: readonly Path[] = [
  { id: 'shore', name: 'Sunlit Shore', from: 'saltwick', to: 'driftwood', floors: 3, lvl: [1, 3], layouts: { stack: 3, open: 2 } },
  { id: 'woods', name: 'Whispering Woods', from: 'driftwood', to: 'mossgate', floors: 5, lvl: [4, 8], layouts: { stack: 5, zigzag: 3, open: 1 } },
  { id: 'caves', name: 'Echoing Caves', from: 'mossgate', to: 'fernwick', floors: 5, lvl: [9, 13], layouts: { stack: 3, zigzag: 5 } },
  { id: 'grotto', name: 'Mushroom Grotto', from: 'fernwick', to: 'sporehollow', floors: 6, lvl: [14, 19], layouts: { stack: 4, zigzag: 3, open: 1 } },
  { id: 'crystal', name: 'Crystal Caverns', from: 'fernwick', to: 'glimmerdeep', floors: 6, lvl: [14, 19], layouts: { stack: 2, zigzag: 5 } },
  { id: 'clockwork', name: 'Clockwork Spire', from: 'glimmerdeep', to: 'gearholm', floors: 7, lvl: [20, 26], layouts: { stack: 2, zigzag: 6 } },
  { id: 'riverbank', name: 'Misty Riverbank', from: 'mossgate', to: 'reedmouth', floors: 5, lvl: [9, 13], layouts: { stack: 3, open: 4 } },
  { id: 'ruins', name: 'Sunken Ruins', from: 'reedmouth', to: 'tidewatch', floors: 6, lvl: [14, 19], layouts: { stack: 5, zigzag: 2, open: 2 } },
  { id: 'tidepools', name: 'Tide Pools', from: 'tidewatch', to: 'wrackhaven', floors: 7, lvl: [20, 26], layouts: { stack: 2, open: 5 } },
  { id: 'mirror', name: 'Mirror Lake', from: 'reedmouth', to: 'stillwater', floors: 6, lvl: [14, 19], layouts: { stack: 2, open: 5 } },
  { id: 'starfall', name: 'Starfall Observatory', from: 'stillwater', to: 'thistledown', floors: 7, lvl: [20, 26], layouts: { stack: 3, zigzag: 4 } },
  { id: 'meadows', name: 'Sunny Meadows', from: 'driftwood', to: 'lanternhollow', floors: 5, lvl: [4, 8], layouts: { stack: 3, open: 5 } },
  { id: 'hills', name: 'Rolling Hills', from: 'lanternhollow', to: 'emberfold', floors: 5, lvl: [9, 13], layouts: { stack: 5, open: 3 } },
  { id: 'crags', name: 'Craggy Mountains', from: 'emberfold', to: 'highcrag', floors: 6, lvl: [14, 19], layouts: { stack: 4, zigzag: 4 } },
  { id: 'sky', name: 'Endless Sky', from: 'highcrag', to: 'cloudharbor', floors: 7, lvl: [20, 26], layouts: { zigzag: 4, open: 3 } },
  { id: 'reef', name: 'Sky Reef', from: 'cloudharbor', to: 'windrest', floors: 8, lvl: [27, 34], layouts: { stack: 2, zigzag: 3, open: 3 } },
  { id: 'summit', name: 'Frozen Summit', from: 'cloudharbor', to: 'summitlodge', floors: 8, lvl: [27, 34], layouts: { stack: 3, zigzag: 5 } },
  { id: 'keep', name: 'Old Keep', from: 'emberfold', to: 'hollowmere', floors: 6, lvl: [14, 19], layouts: { stack: 6, zigzag: 2 } },
  { id: 'chapel', name: 'Chapel Spire', from: 'hollowmere', to: 'bellcourt', floors: 7, lvl: [20, 26], layouts: { stack: 2, zigzag: 6 } },
  { id: 'swamp', name: 'Murky Swamp', from: 'lanternhollow', to: 'willowmere', floors: 5, lvl: [9, 13], layouts: { stack: 3, open: 4 } },
  { id: 'dreamwood', name: 'Dreamwood', from: 'willowmere', to: 'duskmeadow', floors: 6, lvl: [14, 19], layouts: { stack: 4, zigzag: 2, open: 2 } },
  { id: 'void', name: 'Void Garden', from: 'duskmeadow', to: 'nullhaven', floors: 7, lvl: [20, 26], layouts: { stack: 3, zigzag: 3, open: 3 } },
  { id: 'wastes', name: 'Ember Wastes', from: 'willowmere', to: 'ashengate', floors: 6, lvl: [14, 19], layouts: { stack: 3, open: 5 } },
];

const TOWN_BY_ID = new Map(TOWNS.map((t) => [t.id, t]));
const PATH_BY_ID = new Map(PATHS.map((p) => [p.id, p]));

/** Where a new game starts. */
export const START_TOWN = 'saltwick';
export const START: { town: string } = { town: START_TOWN };

export const townById = (id: string): Town => TOWN_BY_ID.get(id) ?? TOWN_BY_ID.get(START_TOWN)!;
export const pathById = (id: string): Path | undefined => PATH_BY_ID.get(id);
export const isTownId = (id: string): boolean => TOWN_BY_ID.has(id);

/** A town's index in TOWNS (picks its layout and palette). */
export const townIndex = (id: string): number => Math.max(0, TOWNS.findIndex((t) => t.id === id));

/** A path is warpable (reachable from a town's portals) when its area has a
 *  backdrop. The backdrop-less maps stay in PATHS for the dev menu, which
 *  warps to towns directly, so they remain testable. */
export const isWarpable = (p: Path): boolean => p.name in BACKDROPS;

/** The paths a town leads up into, left to right (backdrop-less ones hidden). */
export const pathsFrom = (town: string): Path[] => PATHS.filter((p) => p.from === town && isWarpable(p));
/** The paths that end at a town (each gives it a way back down to the path's start). */
export const pathsInto = (town: string): Path[] => PATHS.filter((p) => p.to === town);

/** The area a town takes its look from. */
export const townArea = (id: string): string => townById(id).area ?? pathsInto(id)[0]?.name ?? 'Harbor';

/** Steps up from the start to each town (fewest paths climbed). Depth spans
 *  the whole map, including the backdrop-less paths hidden from portals. */
const allPathsFrom = (town: string): Path[] => PATHS.filter((p) => p.from === town);
const DEPTH = new Map<string, number>([[START_TOWN, 0]]);
for (let q = [START_TOWN]; q.length;) {
  const next: string[] = [];
  for (const t of q) for (const p of allPathsFrom(t)) {
    if (!DEPTH.has(p.to)) { DEPTH.set(p.to, DEPTH.get(t)! + 1); next.push(p.to); }
  }
  q = next;
}
/** How many paths up from the start a town is (the start is 0). */
export const townDepth = (id: string): number => DEPTH.get(id) ?? 0;

export const isTown = (p: Place): p is { town: string } => 'town' in p;

/** A place's short id, for room names and seeds: "woods-3", or a town's own id. */
export const placeKey = (p: Place): string => (isTown(p) ? p.town : `${p.path}-${p.floor}`);

export const samePlace = (a: Place, b: Place): boolean => placeKey(a) === placeKey(b);

/** Read a place back from untrusted data (a save, a dev command): null if it isn't one. */
export function cleanPlace(v: unknown): Place | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.town === 'string') return isTownId(o.town) ? { town: o.town } : null;
  const path = typeof o.path === 'string' ? pathById(o.path) : undefined;
  const floor = Number(o.floor);
  return path && Number.isInteger(floor) && floor >= 1 && floor <= path.floors ? { path: path.id, floor } : null;
}

/** The area a place is in ("Whispering Woods"): its tileset, enemies and status effects. */
export const areaOf = (p: Place): string => (isTown(p) ? townArea(p.town) : pathById(p.path)?.name ?? 'Harbor');

/** What players call a place: "Whispering Woods 3", or the town's name. */
export const placeName = (p: Place): string => (isTown(p) ? townById(p.town).name : areaOf(p));

/** The last floor of a path, right before its end town: the boss floor. */
export const isPathEnd = (p: Place): boolean => !isTown(p) && p.floor === pathById(p.path)?.floors;

/** Where a place's way up leads: the next floor, the path's end town, or
 *  (from a town) the first floor of its leftmost path. */
export function nextPlace(p: Place): Place {
  if (isTown(p)) {
    const up = pathsFrom(p.town)[0];
    return up ? { path: up.id, floor: 1 } : p;
  }
  const path = pathById(p.path)!;
  return p.floor < path.floors ? { path: path.id, floor: p.floor + 1 } : { town: path.to };
}

/** The level of a path floor's enemies: its path's range, spread evenly over
 *  its floors. In a town, the level of the floors just around it. */
export function mobLevel(p: Place): number {
  if (isTown(p)) {
    const up = pathsFrom(p.town)[0], into = pathsInto(p.town)[0];
    return up ? up.lvl[0] : into ? into.lvl[1] : 1;
  }
  const path = pathById(p.path);
  if (!path) return 1;
  const [lo, hi] = path.lvl;
  return path.floors > 1 ? Math.round(lo + (hi - lo) * (p.floor - 1) / (path.floors - 1)) : lo;
}

/** Towns are the save points: a town itself, or the town a path floor started from. */
export const lastTown = (p: Place): string => (isTown(p) ? p.town : pathById(p.path)?.from ?? START_TOWN);

/** Every area name in the world, in map order (each once). */
export const MAP_AREAS: readonly string[] = [...new Set([townArea(START_TOWN), ...PATHS.map((p) => p.name)])];
