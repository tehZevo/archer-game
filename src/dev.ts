import { TIER_FLOORS, townName, townStage } from './world';

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
    stage: townStage(i + 1), name: townName(townStage(i + 1)), label: `${TIER_FLOORS[i + 1]}`,
  })),
];

/** Room id suffix for dev sessions. */
export const devTag = (): string => (dev.on ? '-dev' : '');
