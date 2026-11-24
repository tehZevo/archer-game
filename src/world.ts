/* ============================================================
   WORLD MAP
   The tower is a run of numbered stages (the save, room ids and
   portals use that number), but players see places: an area's floors
   ("Forest 3") and the town at its top. The tower forks: every town
   has two ways up into two areas, and each of those areas has its own
   town, so a climb is a path of left/right choices.

   A stage number is a tier plus a floor within it, and the route
   (0 = left, 1 = right) says which of the tier's two areas you are in.
   The game keeps the current route in `net.route`, so a stage number
   on its own is enough for everything that doesn't care about the
   branch. Tiers are not all the same height (see TIER_FLOORS), so a
   tier's first stage is the sum of the blocks below it.
   ============================================================ */

/** The tower's plan, bottom to top. Each tier is the pair of areas a town's
 *  two portals lead into; the pair shares that one town. The first tier is
 *  the Beach, whose two ways lead into the same area. */
export const TOWER: readonly (readonly [string, string])[] = [
  ['Beach', 'Beach'],
  ['Forest', 'Meadow'],
  ['Riverbank', 'Hills'],
  ['Cave', 'Swamp'],
  ['Mushroom Grotto', 'Crystal Caverns'],
  ['Sunken Ruins', 'Clockwork Spire'],
  ['Dreamwood', 'Mirror Lake'],
  ['Starfall Observatory', 'Void Garden'],
  ['Old Keep', 'Ember Wastes'],
  ['Sky Reef', 'Chapel Spire'],
  ['Summit', 'Summit'],
];

/** Floors per tier. Lower tiers are shorter, so the climb picks up speed. */
export const TIER_FLOORS: readonly number[] = [3, 5, 5, 6, 6, 7, 8, 8, 9, 10, 5];

/** The top tier's town is the last stop; above it there is nowhere to go. */
export const TOP_BLOCK = TOWER.length - 1;

const clampTier = (tier: number): number => Math.min(tier, TOP_BLOCK);

/** Stages in a tier's block: its floors, then its town. */
export const blockSize = (tier: number): number => TIER_FLOORS[clampTier(tier)] + 1;

/** The first stage of a tier's block (the sum of all blocks below it). */
export const baseOf = (tier: number): number => {
  let base = 1;
  for (let t = 0; t < clampTier(tier); t++) base += blockSize(t);
  return base;
};

/** The tier a stage belongs to (0 = the Beach). */
export const blockOf = (n: number): number => tierOf(n);
export const tierOf = (n: number): number => {
  let tier = 0;
  while (tier < TOP_BLOCK && n >= baseOf(tier + 1)) tier++;
  return tier;
};

/** Floor within its area, from 1. */
export const localFloor = (n: number): number => n - baseOf(tierOf(n)) + 1;

/** A town is the last stage of its tier's block. */
export const isTown = (n: number): boolean => localFloor(n) === blockSize(tierOf(n));

/** The last floor of an area, right before its town (the boss floor, later). */
export const isAreaEnd = (n: number): boolean => localFloor(n) === TIER_FLOORS[clampTier(tierOf(n))];

/** The stage number of a tier's town. */
export const townStage = (tier: number): number => baseOf(clampTier(tier)) + TIER_FLOORS[clampTier(tier)];

/** True when a tier's town has two ways up (its two areas are a pair, not one). */
export const hasRoutes = (tier: number): boolean => TOWER[clampTier(tier)][0] !== TOWER[clampTier(tier)][1];

/** The area a stage's floors are in, on the given route. */
export const areaOf = (tier: number, route: number): string => TOWER[clampTier(tier)][route ? 1 : 0];

export const areaFor = (n: number, route: number): string => areaOf(tierOf(n), route);

/** Every area in the tower, in climbing order (the Beach's pair counts once). */
export const MAP_AREAS: readonly string[] = [...new Set(TOWER.flat())];

/** Towns' own names, in order up the tower (the tree reuses a name once the
 *  tiers run out, since two towns can sit at the same depth). */
export const TOWN_NAMES = [
  'Driftwood Rest', 'Mossgate', 'Lanternhollow', 'Fernwick', 'Emberfold',
  'Willowmere', 'Cloudharbor', 'Thistledown', 'Hollowmere', 'Ashen Gate', 'Summit',
];
export const townName = (n: number): string => TOWN_NAMES[clampTier(tierOf(n))];

/** What players call a stage: "Forest 3", or a town's name. */
export const placeName = (n: number, route: number): string =>
  isTown(n) ? townName(n) : `${areaFor(n, route)} ${localFloor(n)}`;

/** Towns are the save points: the latest town at or below a stage (stage 1 before the first). */
export const lastTown = (n: number): number => (isTown(n) ? n : baseOf(tierOf(n)) + TIER_FLOORS[clampTier(tierOf(n))]);
