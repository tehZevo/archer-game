import { mobLevel, PATHS, placeTier, TOWNS, townDepth, type Path, type Place, type Town } from './world';
import { bannerMsg, player } from './state';
import { AP_PER_LEVEL, expToNext, jobForLevel, MAX_LEVEL, recalcStats } from './progress';
import { P, SKILLS } from './config';
import type { SkillKey } from './types';

/* ============================================================
   DEV MODE
   Open the page with ?dev to turn it on. It keeps dev sessions in
   their own rooms (every room id gets a -dev suffix, so testers never
   mix with players) and unlocks the dev keys:
   `  dev menu: warp to the start or any town
   [  level up
   ]  warp to the next place (the next floor, or the path's town)
   /  toggle 1 damage mode (every hit you deal does exactly 1)
   ============================================================ */
export const dev = {
  on: typeof location !== 'undefined' && new URLSearchParams(location.search).has('dev'),
  /** the dev menu is open, and its selected row */
  open: false,
  sel: 0,
  /** / toggles 1 damage mode: every hit you deal does exactly 1 damage */
  oneDamage: false,
};

/** The dev menu's rows: a single flat list of every town (marked "(town)") and
 *  every area's first floor (with the level its mobs are), sorted by tier, each
 *  town placed right before the areas it links up to. Each row is prefixed with
 *  its tier ("T1", "T2", …): the tier of the town you climb up from to reach it. */
export const devStops = (): { place: Place; name: string }[] => {
  const area = (p: Path): { place: Place; name: string } => {
    const place = { path: p.id, floor: 1 };
    return { place, name: `T${placeTier(place)} ${p.name} Lv.${mobLevel(place)}` };
  };
  const town = (t: Town): { place: Place; name: string } => ({ place: { town: t.id }, name: `T${placeTier({ town: t.id })} ${t.name} (town)` });
  // by tier; each town comes right before the areas that climb up out of it
  const towns = [...TOWNS].sort((a, b) => townDepth(a.id) - townDepth(b.id));
  return towns.flatMap((t) => [town(t), ...PATHS.filter((p) => p.from === t.id).map(area)]);
};

/** Dev menu rows shown at once (it scrolls to keep the selection in view). */
export const DEV_ROWS = 12;

/** Room id suffix for dev sessions. */
export const devTag = (): string => (dev.on ? '-dev' : '');

/** Max the player out for testing: level 100 (with its job and a stack of
 *  ability points), every skill learned except Haste, every cooldown reset
 *  and every charge restored. Bound to the `\` key. */
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
  for (const k of Object.keys(player.cd)) player.cd[k] = 0;
  player.blitz.charges = P.BLITZ_MAX;
  player.blitz.t = 0;
  bannerMsg('MAXED', 'LEVEL 100 - SKILL BAR MAXED');
};
