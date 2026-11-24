/* ============================================================
   WORLD MAP
   The tower is a tree of areas. Each area is a run of floors with its
   own town at the top, and a town's portals lead up into its child
   areas (two where the path forks, one, or none at the top of a branch).
   No two areas share a town, and paths never rejoin or cycle. A town's
   way down returns to its parent area's town.

   Where you are is two plain numbers: the stage (depth in the tower,
   used for room ids, mob levels and floor layouts) and the area id
   (`net.area`, an index into AREAS) that says which branch you're on.
   Every area at the same depth has the same height (see TIER_FLOORS), so
   a stage number on its own gives the depth and the floor within it.
   ============================================================ */

/** One area in the plan: its name, its town's name, and the areas above it. */
interface Plan { area: string; town: string; up?: Plan[] }

const PLAN: Plan = { area: 'Tide Pools', town: 'Saltwick', up: [
  { area: 'Beach', town: 'Driftwood Rest', up: [
    { area: 'Forest', town: 'Mossgate', up: [
      { area: 'Cave', town: 'Fernwick', up: [
        { area: 'Mushroom Grotto', town: 'Sporehollow' },
        { area: 'Crystal Caverns', town: 'Glimmerdeep', up: [
          { area: 'Clockwork Spire', town: 'Gearholm' },
        ] },
      ] },
      { area: 'Riverbank', town: 'Reedmouth', up: [
        { area: 'Sunken Ruins', town: 'Tidewatch' },
        { area: 'Mirror Lake', town: 'Stillwater', up: [
          { area: 'Starfall Observatory', town: 'Thistledown' },
        ] },
      ] },
    ] },
    { area: 'Meadow', town: 'Lanternhollow', up: [
      { area: 'Hills', town: 'Emberfold', up: [
        { area: 'Mountain', town: 'Highcrag', up: [
          { area: 'Sky', town: 'Cloudharbor', up: [
            { area: 'Sky Reef', town: 'Windrest' },
            { area: 'Summit', town: 'Summit' },
          ] },
        ] },
        { area: 'Old Keep', town: 'Hollowmere', up: [
          { area: 'Chapel Spire', town: 'Bellcourt' },
        ] },
      ] },
      { area: 'Swamp', town: 'Willowmere', up: [
        { area: 'Dreamwood', town: 'Duskmeadow', up: [
          { area: 'Void Garden', town: 'Nullhaven' },
        ] },
        { area: 'Ember Wastes', town: 'Ashen Gate' },
      ] },
    ] },
  ] },
] };

export interface Area {
  id: number;
  name: string;
  town: string;
  depth: number;
  /** the area below (whose town leads here); -1 for the first area */
  parent: number;
  /** the areas this one's town leads up into, left to right */
  up: number[];
}

/** Every area in the tower, depth-first from the first one (id 0). */
export const AREAS: Area[] = [];
(function flatten(p: Plan, depth: number, parent: number): number {
  const a: Area = { id: AREAS.length, name: p.area, town: p.town, depth, parent, up: [] };
  AREAS.push(a);
  a.up = (p.up ?? []).map((c) => flatten(c, depth + 1, a.id));
  return a.id;
})(PLAN, 0, -1);

/** The first area, where a new game starts. */
export const START_AREA = 0;

/** Floors per depth. Lower areas are shorter, so the climb picks up speed. */
export const TIER_FLOORS: readonly number[] = [2, 3, 5, 5, 6, 7, 8];

/** The deepest depth any branch reaches. */
export const TOP_BLOCK = TIER_FLOORS.length - 1;

const clampTier = (tier: number): number => Math.max(0, Math.min(tier, TOP_BLOCK));

/** Stages in a depth's block: its floors, then its town. */
export const blockSize = (tier: number): number => TIER_FLOORS[clampTier(tier)] + 1;

/** The first stage of a depth's block (the sum of all blocks below it). */
export const baseOf = (tier: number): number => {
  let base = 1;
  for (let t = 0; t < clampTier(tier); t++) base += blockSize(t);
  return base;
};

/** The depth a stage belongs to (0 = the first area). */
export const tierOf = (n: number): number => {
  let tier = 0;
  while (tier < TOP_BLOCK && n >= baseOf(tier + 1)) tier++;
  return tier;
};
export const blockOf = tierOf;

/** Floor within its area, from 1. */
export const localFloor = (n: number): number => n - baseOf(tierOf(n)) + 1;

/** A town is the last stage of its depth's block. */
export const isTown = (n: number): boolean => localFloor(n) === blockSize(tierOf(n));

/** The last floor of an area, right before its town (the boss floor, later). */
export const isAreaEnd = (n: number): boolean => localFloor(n) === TIER_FLOORS[clampTier(tierOf(n))];

/** The stage number of the towns at a depth. */
export const townStage = (tier: number): number => baseOf(clampTier(tier)) + TIER_FLOORS[clampTier(tier)];

const areaAt = (area: number): Area => AREAS[area] ?? AREAS[START_AREA];

/** An area's name ("Forest"). */
export const areaName = (area: number): string => areaAt(area).name;

/** What players call a stage: "Forest 3", or the area's town's name. */
export const placeName = (n: number, area: number): string =>
  isTown(n) ? areaAt(area).town : `${areaAt(area).name} ${localFloor(n)}`;

/** Every area name in the tower, in plan order (each once). */
export const MAP_AREAS: readonly string[] = [...new Set(AREAS.map((a) => a.name))];

/** Fit an area to a stage: walk down to the area at the stage's depth, or up
 *  its leftmost branch. Returns null if the branch ends below that depth. */
export function areaFor(n: number, area: number): number | null {
  let a = areaAt(area);
  const tier = tierOf(n);
  while (a.depth > tier) a = AREAS[a.parent];
  while (a.depth < tier) {
    if (!a.up.length) return null;
    a = AREAS[a.up[0]];
  }
  return a.id;
}

/** Towns are the save points: the latest town at or below a stage on a
 *  branch (the start of the tower before the first town). */
export function lastTown(n: number, area: number): { stage: number; area: number } {
  const a = areaAt(area);
  if (isTown(n)) return { stage: n, area: a.id };
  if (a.parent < 0) return { stage: 1, area: START_AREA };
  return { stage: townStage(a.depth - 1), area: a.parent };
}
