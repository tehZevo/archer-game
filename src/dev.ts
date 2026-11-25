import { AREAS, townStage } from './world';

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

/** The dev menu's rows: the first combat floor (Beach 1, above the Harbor
 *  where you start), then every area's town (in tree order, indented by
 *  depth). `label` is the area the town sits on top of. */
export const devStops = (): { stage: number; area: number; name: string; label: string }[] => [
  { stage: 2, area: AREAS[0].up[0], name: `${AREAS[AREAS[0].up[0]].name} 1 - first floor`, label: '' },
  ...AREAS.map((a) => ({ stage: townStage(a.depth), area: a.id, name: ' '.repeat(a.depth) + a.town, label: a.name })),
];

/** Dev menu rows shown at once (it scrolls to keep the selection in view). */
export const DEV_ROWS = 12;

/** Room id suffix for dev sessions. */
export const devTag = (): string => (dev.on ? '-dev' : '');
