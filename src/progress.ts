import type { JobDef, SkillDef, SkillKey, SkillRank, StatKey } from './types';
import { SKILLS } from './config';
import { player } from './state';
import { dev } from './dev';
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
  { job: 1, level: 1,  name: 'Archer',         title: '1st Job', sp: 10, hpmp: 0 },
  { job: 2, level: 10, name: 'Sky Archer',     title: '2nd Job', sp: 14, hpmp: 0.05 },
  { job: 3, level: 30, name: 'Mystic Archer',  title: '3rd Job', sp: 16, hpmp: 0.15 },
  { job: 4, level: 60, name: 'Adele',          title: '4th Job', sp: 14, hpmp: 0.30 },
];

/* The Sage (in every town) advances you: reaching a job's level only makes
   you eligible; you take the job by visiting the Sage, which unlocks that
   job's skills and adds to your HP and MP (+5% at the 2nd job, +10% more at
   the 3rd, +15% more at the 4th: +30% in all). */

/** The job the Sage would advance you to next (null at the last). */
export const nextJob = (): JobDef | null => JOBS[JOBS.findIndex((j) => j.job === player.job.job) + 1] ?? null;

/** Are you high enough level for the Sage to advance you? */
export const canAdvance = (): boolean => { const n = nextJob(); return !!n && player.level >= n.level; };

/** Take the next job (the Sage's advancement). False if you can't yet. */
export function advanceJob(): boolean {
  const n = nextJob();
  if (!n || player.level < n.level) return false;
  player.job = n;
  recalcStats();
  player.hp = player.hpMax; player.mp = player.mpMax;
  return true;
}

/** The job a saved job number means, no higher than the level allows (and the 1st job if unknown). */
export const jobOf = (job: unknown, level: number): JobDef => {
  const j = JOBS.find((x) => x.job === job) ?? NOVICE, cap = jobForLevel(level);
  return j.job > cap.job ? cap : j;
};

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
    war: 14 + n * 2.55, // steeper per-level growth (was 1.7): damage dealt climbs 1.5x as fast
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
  luk: { name: 'LUK', desc: 'Crit chance +2% a point, to 100%; extra points add crit damage' },
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
  // the Sage's job advancements add a share on top (see JOBS)
  const job = 1 + (player.job?.hpmp ?? 0);
  player.hpMax = Math.round(base.hpMax * (1 + s.vit * STAT_GAIN.vit) * job); // VIT is a % bonus so it keeps pace with level
  player.mpMax = Math.round((base.mpMax + s.spi * STAT_GAIN.spi) * job);
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

/**
 * Resolve a skill's live stats from its current SP rank. A skill that has not
 * been learned yet behaves as its Lv.1 self, matching classic MMOs' free skill grant.
 */
export function rank(key: SkillKey): SkillRank {
  const s = activeSkill(key);
  return {
    mp: s.mp1,
    dmg: s.dmg1 / 100,
    // The skill's own shots. Twin Echoes is a separate multiplier (see shots()):
    // keeping the two apart is what lets the shadow's arrows ride the same
    // damage-number stack as the base volley instead of colliding with it.
    hits: s.hits1 ?? 1,
    targets: s.targets1 ?? 1,
  };
}

/** How many arrows an attack fires: its own shots, doubled by the Twin Echoes
 *  passive's shadow archer. The shadow always procs (a minimum of one lot),
 *  and its arrows are counted here rather than folded into `hits`. */
export const shotCount = (r: SkillRank): number => r.hits * Math.max(1, Math.round(passiveBonus('es')));

/** A passive's current bonus: 0 until learned, then its authored value. */
export function passiveBonus(key: SkillKey): number {
  return player.ranks[key] ? (SKILLS[key].bonus1 ?? 0) : 0;
}

export const isLearned = (key: SkillKey): boolean => player.ranks[activeSkill(key).key];

/* ---------------- Nimble ----------------
   A passive that makes the archer quicker on her feet: +40% move speed and
   +20% jump height once learned. These two multipliers are applied where the
   base walk speed and jump velocity are read (see move.ts). */
export const nimbleSpeed = (): number => isLearned('ni') ? 1.4 : 1;
export const nimbleJump = (): number => isLearned('ni') ? 1.2 : 1;

/**
 * The skill currently bound to a bar slot. The Z slot starts as Double Shot
 * and is upgraded to Bolt Flurry (a strict upgrade) once it unlocks.
 */
export function activeSkill(key: SkillKey): SkillDef {
  const up = upgradesOf(key).find((u) => player.ranks[u]);
  return SKILLS[up ?? key];
}

/** Every skill key, in SKILLS order. */
const ALL_SKILLS = Object.keys(SKILLS) as SkillKey[];

/** The upgrade branches available on a slot (e.g. Q → Electric Blitz). */
export const upgradesOf = (base: SkillKey): SkillKey[] => ALL_SKILLS.filter((u) => SKILLS[u].upgrades === base);

/** True once another branch on the same slot has been taken: this one is locked out. */
export const branchLocked = (key: SkillKey): boolean => {
  const base = SKILLS[key].upgrades;
  return !!base && upgradesOf(base).some((u) => u !== key && player.ranks[u]);
};

/** Spend one SP on the skill in a bar slot (its upgrade, if taken). */
export const spendSp = (key: SkillKey): boolean => spendSkill(activeSkill(key).key);

/* ---------------- skill picks ----------------
   Every level grants 1 AP; every 5th level also grants a skill point (SP).
   Both are spent from the pause menu. An SP learns a newly available skill,
   takes a slot upgrade (Double Shot -> Bolt Flurry, Rising Arrows ->
   Skyward Assault), or raises a learned skill's rank. */
export const SKILL_PICK_EVERY = 5;

// The air forms of Q, W and E (Meteor Dive, Cyclone Sweep, Downpour) are
// their own skills, but on the list they show the key they're used on, not
// their own abbreviation.
const AIR_FORM_KEY: Partial<Record<SkillKey, string>> = { 'air-q': 'ground-q', 'air-w': 'ground-w', 'air-e': 'ground-e' };

/** One line of the pause menu's skill list. */
export interface SkillRow {
  key: SkillKey;
  /** Bar key for actives, '' for passives. */
  slot: string;
  name: string;
  /** True once the skill is acquired (a skill is learned or not). */
  learned: boolean;
  /** What one SP would do here, or '' if nothing. */
  action: string;
  /** Why it can't be taken yet (an upgrade whose base isn't learned), if so. */
  need?: string;
}

/** Known skills (an upgrade hides its base) plus skills an SP could learn. */
export function skillRows(): SkillRow[] {
  const rows: SkillRow[] = [];
  for (const k of Object.keys(SKILLS) as SkillKey[]) {
    const s = SKILLS[k], learned = player.ranks[k], base = s.upgrades;
    const upgradedAway = upgradesOf(k).some((u) => player.ranks[u]);
    if (upgradedAway || branchLocked(k)) continue;
    const slot = s.passive ? '' : base ?? AIR_FORM_KEY[k] ?? k;
    if (!learned) {
      if (s.minLevel > player.level || s.job > player.job.job || (base && !player.ranks[base])) continue;
      // a prerequisite skill (e.g. Cyclone Sweep needs Skyward Assault) must be
      // learned first: the row shows what's needed until it is
      const req = s.requires ? SKILLS[s.requires] : null;
      if (req && !player.ranks[s.requires!]) {
        rows.push({ key: k, slot, name: s.name, learned: false, action: '',
          need: `Needs ${req.name}: ${s.desc}` });
        continue;
      }
      rows.push({ key: k, slot, name: s.name, learned: false,
        action: !base ? `Learn: ${s.desc}`
          : rivals(k) ? `${s.desc}. Locks ${rivals(k)}`
          : `Upgrade ${SKILLS[base].name}: ${s.desc}` });
    } else {
      rows.push({ key: k, slot, name: s.name, learned: true, action: '' });
    }
  }
  return rows;
}

/** The sibling branches taking this upgrade would lock out ('' if none). */
function rivals(k: SkillKey): string {
  const others = upgradesOf(SKILLS[k].upgrades as SkillKey).filter((u) => u !== k);
  return others.map((u) => SKILLS[u].name).join(', ');
}

/** Spend one SP on a skill row: learn, upgrade (keeping the base's rank), or rank up. */
/** Can you spend a skill point now? (Dev mode can always: SP goes below zero.) */
export const canSpendSp = (): boolean => player.sp > 0 || dev.on;

export function spendSkill(key: SkillKey): boolean {
  // In dev mode a skill toggles freely (no requirements): learning it still
  // spends a point, but you can keep going below zero, and unlearning it
  // gives the point back.
  if (dev.on) {
    player.ranks[key] = !player.ranks[key];
    player.sp += player.ranks[key] ? -1 : 1;
    return true;
  }
  const row = skillRows().find((r) => r.key === key);
  if (player.sp <= 0 || !row || !row.action) return false;
  player.ranks[key] = true;
  player.sp--;
  return true;
}

