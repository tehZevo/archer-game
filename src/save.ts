import { CARRY_MAX, wallet } from './economy';
import { cleanPlace, lastTown, START, type Place } from './world';
import { loadQuests, quests } from './quests';
import type { Quest } from './quests';
import { pet } from './pets';
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
const VERSION = 3; // 3: places (towns and paths) replaced stage numbers (older saves are dropped)
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
  };
}

const int = (v: unknown, lo: number, hi: number, dflt: number): number => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};


/** Apply a save to the player; returns the place to resume on, or null if the save is unusable. */
export function apply(d: unknown): Place | null {
  if (!d || typeof d !== 'object' || (d as SaveData).v !== VERSION) return null;
  const s = d as SaveData;
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
  wallet.hp = int(s.potions?.hp, 0, CARRY_MAX, 0);
  wallet.mp = int(s.potions?.mp, 0, CARRY_MAX, 0);
  loadQuests(s.quests);
  pet.owned = s.pet === true;
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
