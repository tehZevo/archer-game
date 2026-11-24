
/* ============================================================
   WORLD MAP
   The tower is one run of numbered stages (the save, room ids and
   portals use that number), but players see places: each block of
   BLOCK stages is an area's floors 1-10 ("Forest 3") and then a
   named town. Towns are stops between areas, not numbered floors.
   Leaving a town, the left and right portals lead into two
   different areas (routes 0 and 1); the first area is the Beach.
   ============================================================ */

/** Floors per area. */
export const AREA_FLOORS = 10;
/** Stages per block: an area's floors, then its town. */
export const BLOCK = AREA_FLOORS + 1;

export const isTown = (n: number): boolean => n % BLOCK === 0;
/** Which block a stage is in (0 = the first area and the town after it). */
export const blockOf = (n: number): number => Math.floor((n - 1) / BLOCK);
/** Floor within its area, 1-10 (a town is BLOCK). */
export const localFloor = (n: number): number => ((n - 1) % BLOCK) + 1;
/** The last floor of an area, right before its town (the boss floor, later). */
export const isAreaEnd = (n: number): boolean => localFloor(n) === AREA_FLOORS;

/** The tower's plan, straight up: one tier per block, each tier a pair of
 *  areas (left portal = index 0, right = index 1). Each pair has its own
 *  town, so no two areas lead to the same town. The tower tops out at the
 *  last tier's town. */
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
/** The top block's town is the last stop; above it there is nowhere to go. */
export const TOP_BLOCK = TOWER.length - 1;
/** Only the Beach's town has a single way up; the rest branch into two. */
export const hasRoutes = (block: number): boolean => TOWER[Math.min(block, TOP_BLOCK)][0] !== TOWER[Math.min(block, TOP_BLOCK)][1];

/** The area a block's floors are in on a route (0 = left way, 1 = right). */
export function areaOf(block: number, route: number): string {
  return TOWER[Math.min(block, TOP_BLOCK)][route ? 1 : 0];
}
export const areaFor = (n: number, route: number): string => areaOf(blockOf(n), route);

/** Towns' own names, in order up the tower (cycling if the tower is taller). */
export const TOWN_NAMES = [
  'Driftwood Rest', 'Mossgate', 'Lanternhollow', 'Fernwick', 'Emberfold',
  'Willowmere', 'Cloudharbor', 'Thistledown', 'Brambleford', 'Stonehearth',
];
export const townName = (n: number): string => TOWN_NAMES[(Math.max(1, Math.floor(n / BLOCK)) - 1) % TOWN_NAMES.length];

/** What players call a stage: "Forest 3", or a town's name. */
export const placeName = (n: number, route: number): string =>
  isTown(n) ? townName(n) : `${areaFor(n, route)} ${localFloor(n)}`;

/** Towns are the save points: the latest town at or below a stage (stage 1 before the first). */
export const lastTown = (n: number): number => (n >= BLOCK ? n - (n % BLOCK) : 1);
