import { CARRY_MAX, resetWallet, START_POTIONS, wallet } from './economy';
import { cleanPlace, lastTown, START, type Place } from './world';
import { loadQuests, quests } from './quests';
import type { Quest } from './quests';
import { pet } from './pets';
import { bag, BAG_SIZE, gear } from './gear';
import type { GearItem, GearKind } from './gear';
import { runBonus } from './achievements';
import { SKILL_ORDER, SKILLS } from './config';
import { game, player } from './state';
import { expToNext, jobForLevel, MAX_LEVEL, recalcStats, STAT_KEYS, upgradesOf } from './progress';
import type { SkillKey } from './types';

/* ============================================================
   SAVE / LOAD
   Progress lives in localStorage under one versioned key: level,
   EXP, unspent AP/SP, core stats, skill ranks (which also records
   the upgrade branch taken) and the floor. Saved every few seconds
   while playing and when the page is hidden or closed. Loading
   validates every field, so a corrupt or hand-edited save is
   ignored (or clamped) instead of breaking the game.
   ============================================================ */

const KEY = 'archer-game:save';
const VERSION = 4; // 4: the starting kit (3 HP + 3 MP potions)
export const SAVE_EVERY = 5; // s between autosaves

export interface SaveData {
  v: number;
  level: number;
  exp: number;
  ap: number;
  sp: number;
  stats: Record<string, number>;
  ranks: Record<string, number>;
  /** The town you resume in (its id, see world.ts): the latest one you passed. */
  town: string;
  /** Coins and potions (absent in older saves: start empty). */
  coins?: number;
  potions?: { hp: number; mp: number };
  /** Active quests (absent in older saves: none). */
  quests?: Quest[];
  /** Owns the pet (absent in older saves: no). */
  pet?: boolean;
  /** The equipped weapon and armor (absent in older saves: nothing worn). */
  gear?: { weapon: GearItem | null; armor: GearItem | null };
  /** Spare gear (absent in older saves: an empty bag). */
  bag?: GearItem[];
}

/** localStorage when available (absent in headless tests unless stubbed). */
const store = (): Storage | null => {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
};

export function snapshot(): SaveData {
  return {
    v: VERSION,
    level: player.level, exp: Math.floor(player.exp), ap: player.ap, sp: player.sp,
    stats: { ...player.stats }, ranks: { ...player.ranks },
    town: lastTown(game.floor.place),
    coins: wallet.coins, potions: { hp: wallet.hp, mp: wallet.mp },
    quests: quests.map((q) => ({ ...q })),
    pet: pet.owned,
    gear: { weapon: gear.weapon, armor: gear.armor },
    bag: bag.map((i) => ({ ...i })),
  };
}

/** Rebuild a saved piece of gear, discarding anything malformed. */
const cleanGear = (v: unknown, kind: GearKind): GearItem | null => {
  const i = v as GearItem | undefined;
  if (!i || i.kind !== kind || !i.name) return null;
  return { kind, name: i.name, lvl: int(i.lvl, 1, 99, 1) };
};

const int = (v: unknown, lo: number, hi: number, dflt: number): number => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};


/** Bring a save written by an older VERSION up to the current shape, so a
 *  format change keeps your run instead of resetting it. Each bump adds a
 *  case here; the fields every version shares (level, exp, ranks) pass
 *  through untouched. */
export function migrate(d: SaveData): SaveData {
  const v = d.v ?? 0;
  if (v >= VERSION) return d;
  // v2 and earlier saved a global stage number; v3 replaced it with a town id
  if (v < 3 && !d.town) d.town = 'mossgate';
  // v3 had no starting kit; v4 gives you potions, so an old save keeps what it stored
  d.v = VERSION;
  return d;
}

/** Apply a save to the player; returns the place to resume on, or null if the save is unusable. */
export function apply(d: unknown): Place | null {
  if (!d || typeof d !== 'object') return null;
  const s = migrate(d as SaveData);
  player.level = int(s.level, 1, MAX_LEVEL, 1);
  player.expNext = expToNext(player.level);
  player.exp = int(s.exp, 0, player.expNext - 1, 0);
  player.ap = int(s.ap, 0, 999, 0);
  player.sp = int(s.sp, 0, 999, 0);
  for (const k of STAT_KEYS) player.stats[k] = int(s.stats?.[k], 0, 999, 0);
  for (const k of Object.keys(SKILLS) as SkillKey[]) {
    if (s.ranks && k in s.ranks) player.ranks[k] = int(s.ranks[k], 0, SKILLS[k].maxLevel, player.ranks[k]);
  }
  // a slot can hold only one upgrade branch: if a save claims several, keep the first
  for (const base of SKILL_ORDER) {
    const taken = upgradesOf(base).filter((u) => player.ranks[u] > 0);
    taken.slice(1).forEach((u) => { player.ranks[u] = 0; });
  }
  player.job = jobForLevel(player.level);
  recalcStats();
  player.hp = player.hpMax; player.mp = player.mpMax;
  wallet.coins = int(s.coins, 0, 1e9, 0);
  wallet.hp = int(s.potions?.hp, 0, CARRY_MAX, START_POTIONS);
  wallet.mp = int(s.potions?.mp, 0, CARRY_MAX, START_POTIONS);
  loadQuests(s.quests);
  pet.owned = s.pet === true;
  gear.weapon = cleanGear(s.gear?.weapon, 'weapon');
  gear.armor = cleanGear(s.gear?.armor, 'armor');
  bag.length = 0;
  for (const v of Array.isArray(s.bag) ? s.bag.slice(0, BAG_SIZE) : []) {
    const i = cleanGear(v, (v as GearItem)?.kind === 'armor' ? 'armor' : 'weapon');
    if (i) bag.push(i);
  }
  // resume in the saved town (the start if it's gone from the map)
  return cleanPlace({ town: s.town }) ?? START;
}

/** Off after a reset, so the page-hide save can't write the old progress back. */
export const saving = { enabled: true };

export function save(): void {
  if (!saving.enabled) return;
  try { store()?.setItem(KEY, JSON.stringify(snapshot())); } catch { /* storage full or blocked */ }
}

/** Load the saved progress into the player; returns the place to resume on (the start if none). */
export function load(): Place {
  try {
    const raw = store()?.getItem(KEY);
    return (raw && apply(JSON.parse(raw))) || START;
  } catch { return START; }
}

export function hasSave(): boolean {
  try { return !!store()?.getItem(KEY); } catch { return false; }
}

/** Forget saved progress (a fresh start on the next reload). */
export function clearSave(): void {
  try { store()?.removeItem(KEY); } catch { /* ignore */ }
  resetWallet(); // gold and potions start over with the character
}

let since = 0;
/** Autosave timer; call on the fixed step while playing. */
export function tickSave(dt: number): void {
  since += dt;
  if (since >= SAVE_EVERY) { since = 0; save(); }
}

/** A new run (no save yet): hand out the achievements' run bonuses. */
export function startRun(): void {
  const b = runBonus();
  wallet.coins += b.coins;
  wallet.hp = Math.min(CARRY_MAX, wallet.hp + b.potions);
  player.sp += b.sp;
}
