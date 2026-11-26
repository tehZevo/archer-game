import { PATHS, START_TOWN, TOWNS, townArea, townDepth, type Place } from './world';
import { bannerMsg, player } from './state';
import { AP_PER_LEVEL, expToNext, jobForLevel, MAX_LEVEL, recalcStats } from './progress';
import { SKILLS } from './config';
import type { SkillKey } from './types';

/* ============================================================
   DEV MODE
   Open the page with ?dev to turn it on. It keeps dev sessions in
   their own rooms (every room id gets a -dev suffix, so testers never
   mix with players) and unlocks the dev keys:
   `  dev menu: warp to the start or any town
   [  level up
   ]  warp to the next place (the next floor, or the path's town)
   ============================================================ */
export const dev = {
  on: typeof location !== 'undefined' && new URLSearchParams(location.search).has('dev'),
  /** the dev menu is open, and its selected row */
  open: false,
  sel: 0,
};

/** The dev menu's rows: the first combat floor (the first floor up from
 *  the start town), then every town (in map order, indented by depth).
 *  `label` is the area the town takes its look from. */
export const devStops = (): { place: Place; name: string; label: string }[] => {
  const first = PATHS.find((p) => p.from === START_TOWN)!;
  return [
    { place: { path: first.id, floor: 1 }, name: `${first.name} 1 - first floor`, label: '' },
    ...TOWNS.map((t) => ({ place: { town: t.id }, name: ' '.repeat(townDepth(t.id)) + t.name, label: townArea(t.id) })),
  ];
};

/** Dev menu rows shown at once (it scrolls to keep the selection in view). */
export const DEV_ROWS = 12;

/** Room id suffix for dev sessions. */
export const devTag = (): string => (dev.on ? '-dev' : '');

/** Max the player out for testing: level 100 (with its job and a stack of
 *  ability points) and every skill learned, except Haste. Bound to the `\` key. */
export const maxOut = (): void => {
  player.level = MAX_LEVEL;
  player.exp = 0;
  player.expNext = expToNext(MAX_LEVEL);
  player.job = jobForLevel(MAX_LEVEL);
  player.ap += AP_PER_LEVEL;
  recalcStats();
  player.hp = player.hpMax;
  player.mp = player.mpMax;
  for (const k of Object.keys(SKILLS) as SkillKey[]) {
    if (k !== 'ha') player.ranks[k] = true;
  }
  bannerMsg('MAXED', 'LEVEL 100 - SKILL BAR MAXED');
};
