import { AREA_FLOORS, BLOCK, townName } from './world';

/* ============================================================
   DEV MODE
   Open the page with ?dev to turn it on. It keeps dev sessions in
   their own rooms (every room id gets a -dev suffix, so testers never
   mix with players) and unlocks the dev keys:
   `  dev menu: warp to the start or any town
   [  level up
   ]  warp to the next floor
   ============================================================ */
export const dev = {
  on: typeof location !== 'undefined' && new URLSearchParams(location.search).has('dev'),
  /** the dev menu is open, and its selected row */
  open: false,
  sel: 0,
};

/** Towns the dev menu lists (the tower goes on; this is plenty for testing). */
export const DEV_TOWNS = 10;

/** The dev menu's rows: the start, then each town by name. `label` is the
 *  floor the row shows: towns by the floor they follow (10, 20, ...), not their stage number. */
export const devStops = (): { stage: number; name: string; label: string }[] => [
  { stage: 1, name: 'Beach 1 - start', label: '1' },
  ...Array.from({ length: DEV_TOWNS }, (_, i) => ({
    stage: (i + 1) * BLOCK, name: townName((i + 1) * BLOCK), label: `${(i + 1) * AREA_FLOORS}`,
  })),
];

/** Room id suffix for dev sessions. */
export const devTag = (): string => (dev.on ? '-dev' : '');
