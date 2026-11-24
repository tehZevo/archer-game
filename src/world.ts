/* ============================================================
   WORLD MAP
   The tower is one run of numbered stages (the save, room ids and
   portals use that number), but players see places: an area's floors
   ("Forest 3") and the town at its top. The tower forks: every town
   has two ways up into two areas, and each of those areas has its own
   town, so a climb is a path of left/right choices.

   The stage number stores that path in binary. A block is BLOCK stages
   (the area's 10 floors, then its town), and the path reads from the
   top down, with a leading 1 marking the root:

     block = 1 r0 r1 r2 ... (binary)   r = 0 left, 1 right
     stage = block * BLOCK + floor     floor 1..11 (11 is the town)

   So "the town above the right-hand area of the second tier" is block
   0b101 = 5, stage 66. Walking down is `block >> 1`, walking up is
   `block * 2 + route`, and the floor's own number is one remainder.
   ============================================================ */

/** Floors per area. */
export const AREA_FLOORS = 10;
/** Stages per block: an area's floors, then its town. */
export const BLOCK = AREA_FLOORS + 1;

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
/** The top tier's town is the last stop; above it there is nowhere to go. */
export const TOP_BLOCK = TOWER.length - 1;

/** The block (tier) a stage belongs to. Stage 1 is block 0; each block's
 *  last stage (a multiple of BLOCK) is its town. */
export const blockOf = (n: number): number => Math.floor((n - 1) / BLOCK);
/** Floor within its area, 1-10 (a town is BLOCK). */
export const localFloor = (n: number): number => (n - 1) % BLOCK + 1;
export const isTown = (n: number): boolean => localFloor(n) === BLOCK;
/** The last floor of an area, right before its town (the boss floor, later). */
export const isAreaEnd = (n: number): boolean => localFloor(n) === AREA_FLOORS;

/** The area a block's floors are in on a route. The block is the height in the
 *  tower and the route is the branch taken at the town below, so the two ways
 *  up from a town are two distinct areas that each end in their own town. */
export function areaOf(block: number, route: number): string {
  return TOWER[Math.min(block, TOP_BLOCK)][route ? 1 : 0];
}
export const areaFor = (n: number, route: number): string => areaOf(blockOf(n), route);

/** Every area in the tower, in climbing order (the Beach's pair counts once). */
export const MAP_AREAS: readonly string[] = [...new Set(TOWER.flat())];

/** Towns' own names, in order up the tower (the tree reuses a name once the
 *  tiers run out, since two towns can sit at the same depth). */
export const TOWN_NAMES = [
  'Driftwood Rest', 'Mossgate', 'Lanternhollow', 'Fernwick', 'Emberfold',
  'Willowmere', 'Cloudharbor', 'Thistledown', 'Hollowmere', 'Ashen Gate', 'Summit',
];
export const townName = (n: number): string => TOWN_NAMES[(Math.max(1, blockOf(n)) - 1) % TOWN_NAMES.length];

/** What players call a stage: "Forest 3", or a town's name. */
export const placeName = (n: number, route: number): string =>
  isTown(n) ? townName(n) : `${areaFor(n, route)} ${localFloor(n)}`;

/** Towns are the save points: the latest town at or below a stage (stage 1 before the first). */
export const lastTown = (n: number): number => (n >= BLOCK ? n - (n % BLOCK) : 1);
