import { mobLevel, PATHS, placeTier, TOWNS, type Place } from './world';
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

/** The dev menu's rows: a single flat list of every area — each path's first
 *  floor (with the level its mobs are) and every town (marked "(town)"). Each
 *  row is prefixed with its tier ("T1", "T2", …): the tier of the town you
 *  climb up from to reach it. */
export const devStops = (): { place: Place; name: string }[] => [
  ...PATHS.map((p) => ({ place: { path: p.id, floor: 1 }, name: `T${placeTier({ path: p.id, floor: 1 })} ${p.name} Lv.${mobLevel({ path: p.id, floor: 1 })}` })),
  ...TOWNS.map((t) => ({ place: { town: t.id }, name: `T${placeTier({ town: t.id })} ${t.name} (town)` })),
];

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
