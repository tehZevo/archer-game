import type { JobDef, PauseMenu, SkillDef, SkillKey, SkillRank, StatKey } from './types';
import { SKILLS, SKILL_ORDER } from './config';
import { player } from './state';
import { fmtNum } from './util';

/* ============================================================
   EXPERIENCE
   Leveling pace is set in kills. Two curves, tied together:
   - mobExp(m): what one level-m enemy is worth (7% more per level)
   - killsToLevel(L): how many kills of your own level a level-up takes,
     10 at Lv.1 rising evenly (geometrically) to 100 at Lv.99
   and expToNext(L) = killsToLevel(L) * mobExp(L). A new enemy only needs a
   level to plug in; `mul` scales one up (e.g. a boss worth 10 kills).
   ============================================================ */
export const MAX_LEVEL = 100;
export const KILLS_FIRST = 10;   // same-level kills to go from Lv.1 to 2
export const KILLS_LAST = 100;   // ...and from Lv.99 to 100
const MOB_EXP_BASE = 10;         // a level-1 enemy's EXP
const MOB_EXP_GROWTH = 1.07;     // each enemy level is worth 7% more

const clampLv = (l: number): number => Math.max(1, Math.min(MAX_LEVEL, Math.floor(l)));

/** Same-level kills a level-up takes at level `l`. */
export const killsToLevel = (l: number): number =>
  KILLS_FIRST * (KILLS_LAST / KILLS_FIRST) ** ((clampLv(l) - 1) / (MAX_LEVEL - 2));

/** EXP one enemy of level `m` is worth. */
export const mobExp = (m: number, mul = 1): number =>
  Math.round(MOB_EXP_BASE * MOB_EXP_GROWTH ** (Math.max(1, Math.floor(m)) - 1) * mul);

/** EXP needed to go from level `l` to the next. */
export const expToNext = (l: number): number => Math.round(killsToLevel(l) * mobExp(clampLv(l)));

/** The HUD's EXP bar readout: at max level it shows the level (LV.100) and
 *  the bar stays full, since there is no next level to progress toward. */
export const expBar = (): { text: string; pct: number } =>
  player.level >= MAX_LEVEL
    ? { text: `LV.${player.level}`, pct: 1 }
    : { text: `${fmtNum(player.exp)}/${fmtNum(player.expNext)}`, pct: player.exp / player.expNext };

/* ---------------- job advancement ----------------
   Archer is created already wielding her 1st Job skills, so the tree opens
   at Lv.1 and advances twice more before the Lv.100 cap. */
export const JOBS: JobDef[] = [
  { job: 1, level: 1,  name: 'Archer',         title: '1st Job', sp: 10 },
  { job: 2, level: 10, name: 'Sky Archer',     title: '2nd Job', sp: 14 },
  { job: 3, level: 30, name: 'Mystic Archer',  title: '3rd Job', sp: 16 },
  { job: 4, level: 60, name: 'Adele',          title: '4th Job', sp: 14 },
];

export function jobForLevel(level: number): JobDef {
  const idx = JOBS.reduce((acc, j, i) => (level >= j.level ? i : acc), -1);
  return idx >= 0 ? JOBS[idx] : NOVICE;
}

export const NOVICE: JobDef = JOBS[0];

/* ---------------- stat growth ---------------- */
/** Bowman-line growth: HP/MP per level, DEX drives weapon attack. */
export function statsForLevel(level: number): { hpMax: number; mpMax: number; dex: number; war: number } {
  const n = level - 1;
  return {
    hpMax: Math.round(100 * 1.05 ** n), // ~100 HP / 50 MP at Lv.1, +5% per level
    mpMax: Math.round(50 * 1.05 ** n),
    dex: 24 + n * 4,
    war: 14 + n * 1.7, // ~18 per Twin Shot arrow at Lv.1: a Garden Snail takes ~3 casts; tracks mob HP growth
  };
}

/* ---------------- core stats ----------------
   Four stats upgraded with ability points (AP). Each point buys a different
   aspect: DEX attack, VIT health, SPI mana, LUK crit. */
export const AP_PER_LEVEL = 1;

export const STAT_INFO: Record<StatKey, { name: string; desc: string }> = {
  dex: { name: 'DEX', desc: 'Attack +3%' },
  vit: { name: 'VIT', desc: 'Max HP +5%' },
  spi: { name: 'SPI', desc: 'Max MP' },
  luk: { name: 'LUK', desc: 'Crit chance' },
};

export const STAT_KEYS = Object.keys(STAT_INFO) as StatKey[];

/** Per-point contribution of each stat. */
export const STAT_GAIN: Record<StatKey, number> = { dex: 0.03, vit: 0.05, spi: 4, luk: 0.4 };

/** Recompute the live derived stats from base growth + core stat points. */
export function recalcStats(): void {
  const base = statsForLevel(player.level);
  const s = player.stats;
  player.dex = base.dex + s.dex;
  // attack grows with level and DEX: each DEX point is a % of the level's
  // attack, so it stays worth the same at Lv.5 and Lv.50 (a flat +1 didn't)
  player.war = base.war * (1 + s.dex * STAT_GAIN.dex);
  player.hpMax = Math.round(base.hpMax * (1 + s.vit * STAT_GAIN.vit)); // VIT is a % bonus so it keeps pace with level
  player.mpMax = base.mpMax + s.spi * STAT_GAIN.spi;
}

/** Spend one AP to raise a core stat. */
export function spendStat(key: StatKey): boolean {
  if (player.ap <= 0) return false;
  player.ap--;
  player.stats[key]++;
  recalcStats();
  return true;
}

/* ---------------- skill ranks ---------------- */
/** SP awarded on top of the per-level point when reaching each job. */
export const SP_PER_LEVEL = 1;

export const UNLOCKED_AT: Record<SkillKey, number> = SKILL_ORDER.reduce(
  (o, k) => ((o[k] = SKILLS[k].minLevel), o),
  {} as Record<SkillKey, number>,
);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Resolve a skill's live stats from its current SP rank. A skill that has not
 * been learned yet behaves as its Lv.1 self, matching classic MMOs' free skill grant.
 */
export function rank(key: SkillKey): SkillRank {
  const s = activeSkill(key);
  const level = Math.max(1, player.ranks[s.key] || 1);
  const t = s.maxLevel === 1 ? 0 : (Math.min(level, s.maxLevel) - 1) / (s.maxLevel - 1);
  return {
    level,
    maxLevel: s.maxLevel,
    mp: Math.round(lerp(s.mp1, s.mpMax, t)),
    dmg: lerp(s.dmg1, s.dmgMax, t) / 100,
    // The skill's own shots. Echo Shot is a separate multiplier (see shots()):
    // keeping the two apart is what lets the shadow's arrows ride the same
    // damage-number stack as the base volley instead of colliding with it.
    hits: Math.round(lerp(s.hits1 ?? 1, s.hitsMax ?? 1, t)),
    targets: Math.round(lerp(s.targets1 ?? 1, s.targetsMax ?? 1, t)),
  };
}

/** How many arrows an attack fires: its own shots, doubled by the Echo Shot
 *  passive's shadow archer. The shadow always procs (a minimum of one lot),
 *  and its arrows are counted here rather than folded into `hits`. */
export const shotCount = (r: SkillRank): number => r.hits * Math.max(1, Math.round(passiveBonus('ES')));

/** A passive's current bonus: 0 until learned, then steps up per rank. */
export function passiveBonus(key: SkillKey): number {
  const s = SKILLS[key], r = player.ranks[key] || 0;
  if (!r) return 0;
  const t = s.maxLevel === 1 ? 0 : (Math.min(r, s.maxLevel) - 1) / (s.maxLevel - 1);
  return lerp(s.bonus1 ?? 0, s.bonusMax ?? 0, t);
}

export const isLearned = (key: SkillKey): boolean => (player.ranks[activeSkill(key).key] || 0) > 0;

/**
 * The skill currently bound to a bar slot. The Z slot starts as Twin Shot
 * and is upgraded to Shell Barrage (a strict upgrade) once it unlocks.
 */
export function activeSkill(key: SkillKey): SkillDef {
  const up = upgradesOf(key).find((u) => player.ranks[u] > 0);
  return SKILLS[up ?? key];
}

/** The upgrade branches available on a slot (e.g. Z → Shell Barrage or Backstep Shot). */
export const upgradesOf = (base: SkillKey): SkillKey[] =>
  (Object.keys(UPGRADES) as SkillKey[]).filter((u) => UPGRADES[u] === base);

/** True once another branch on the same slot has been taken: this one is locked out. */
export const branchLocked = (key: SkillKey): boolean => {
  const base = UPGRADES[key];
  return !!base && upgradesOf(base).some((u) => u !== key && player.ranks[u] > 0);
};

/** Spend one SP on the skill in a bar slot (its upgrade, if taken). */
export const spendSp = (key: SkillKey): boolean => spendSkill(activeSkill(key).key);

/* ---------------- skill picks ----------------
   Every level grants 1 AP; every 5th level also grants a skill point (SP).
   Both are spent from the pause menu. An SP learns a newly available skill,
   takes a slot upgrade (Twin Shot -> Shell Barrage, Skyfall Volley ->
   Sky Assault), or raises a learned skill's rank. */
export const SKILL_PICK_EVERY = 5;
/** Slot upgrades: the upgrade replaces the base skill on its key. A slot with
 *  several upgrades is a branch: taking one locks the others out for good. */
const UPGRADES: Partial<Record<SkillKey, SkillKey>> = { S: 'Z', BS: 'Z', AB: 'W', VS: 'Q', RA: 'Q', EB: 'Q' };

// The air forms of Q, W and E (Air Dive, Midair Spin, Plunging Volley) are
// their own skills, but on the list they show the key they're used on, not
// their own abbreviation.
const AIR_FORM_KEY: Partial<Record<SkillKey, string>> = { AD: 'Q', MS: 'W', PV: 'E' };

// TODO: Vault Shot, Rising Arrow and Backstep Shot stay in the game's code
// (their cast cases, stats and icons) but are off the acquirable list for now;
// reconsider bringing them back once the Q/W combo (rush, then launch) is in.
const RETIRED: SkillKey[] = ['BS', 'VS', 'RA'];

/** One line of the pause menu's skill list. */
export interface SkillRow {
  key: SkillKey;
  /** Bar key for actives, '' for passives. */
  slot: string;
  name: string;
  rank: number;
  max: number;
  /** What one SP would do here, or '' if nothing. */
  action: string;
  /** Why it can't be taken yet (an upgrade whose base isn't maxed), if so. */
  need?: string;
}

/** Known skills (an upgrade hides its base) plus skills an SP could learn. */
export function skillRows(): SkillRow[] {
  const rows: SkillRow[] = [];
  for (const k of Object.keys(SKILLS) as SkillKey[]) {
    if (RETIRED.includes(k)) continue;
    const s = SKILLS[k], have = player.ranks[k] || 0, base = UPGRADES[k];
    const upgradedAway = Object.entries(UPGRADES).some(([u, b]) => b === k && player.ranks[u as SkillKey] > 0);
    if (upgradedAway || branchLocked(k)) continue;
    const slot = s.passive ? '' : base ?? AIR_FORM_KEY[k] ?? k;
    if (have === 0) {
      if (s.minLevel > player.level || (base && !(player.ranks[base] > 0))) continue;
      // a prerequisite skill (e.g. Midair Spin needs Sky Assault) must be
      // mastered first: the row shows what's needed until it is
      const req = s.requires ? SKILLS[s.requires] : null;
      if (req && player.ranks[s.requires!] < req.maxLevel) {
        rows.push({ key: k, slot, name: s.name, rank: 0, max: s.maxLevel, action: '',
          need: `Needs ${req.name} at max rank (${player.ranks[s.requires!]}/${req.maxLevel}): ${s.desc}` });
        continue;
      }
      // an upgrade builds on its base skill: shown once the base is learned,
      // but only taken once the base is at its max rank
      const b = base ? SKILLS[base] : null;
      if (b && player.ranks[base!] < b.maxLevel) {
        rows.push({ key: k, slot, name: s.name, rank: 0, max: s.maxLevel, action: '',
          need: `Needs ${b.name} at max rank (${player.ranks[base!]}/${b.maxLevel}): ${s.desc}` });
        continue;
      }
      rows.push({ key: k, slot, name: s.name, rank: 0, max: s.maxLevel,
        action: !base ? `Learn: ${s.desc}`
          : rivals(k) ? `${s.desc}. Locks ${rivals(k)}`
          : `Upgrade ${SKILLS[base].name}: ${s.desc}` });
    } else {
      rows.push({ key: k, slot, name: s.name, rank: have, max: s.maxLevel,
        action: have < s.maxLevel ? `Rank ${have + 1}: ${s.desc}` : '' });
    }
  }
  return rows;
}

/** The sibling branches taking this upgrade would lock out ('' if none). */
function rivals(k: SkillKey): string {
  const others = upgradesOf(UPGRADES[k] as SkillKey).filter((u) => u !== k);
  return others.map((u) => SKILLS[u].name).join(', ');
}

/** Spend one SP on a skill row: learn, upgrade (keeping the base's rank), or rank up. */
export function spendSkill(key: SkillKey): boolean {
  const row = skillRows().find((r) => r.key === key);
  if (player.sp <= 0 || !row || !row.action) return false;
  // an upgrade starts at rank 1, not at its base skill's rank: the first SP
  // on Sky Assault buys rank 1, whatever rank Skyfall Volley is at
  player.ranks[key] = row.rank > 0 ? row.rank + 1 : 1;
  player.sp--;
  return true;
}

/** Skill rows the Esc menu shows at once (more scroll; see pauseScroll). */
export const PAUSE_ROWS = 10;

/** First skill row to show so the selected one stays in view: the window
 *  only moves when the cursor walks off its top or bottom. */
export function pauseScroll(m: PauseMenu, n: number): number {
  let s = m.scroll ?? 0;
  if (m.col === 1) {
    if (m.row < s) s = m.row;
    if (m.row >= s + PAUSE_ROWS) s = m.row - PAUSE_ROWS + 1;
  }
  s = Math.max(0, Math.min(s, n - PAUSE_ROWS));
  m.scroll = s;
  return s;
}
