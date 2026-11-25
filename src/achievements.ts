import { bannerMsg, logMsg } from './state';
import { OUTFITS, lookLocks } from './look';

/* ============================================================
   ACHIEVEMENTS
   Milestones counted across every run on this device (kills,
   elites, bosses, floors climbed, coins earned, areas visited).
   They live in localStorage apart from the progress save, so a
   progress reset keeps them. Some unlock something:
   - run bonuses, given at the start of each new run (a fresh save):
     starting coins, potions, an extra skill point
   - a cosmetic: the gold outfit at the stylist
   The list opens from the main menu and the Esc menu.
   ============================================================ */

export type StatId = 'kills' | 'elites' | 'bosses' | 'floors' | 'coins' | 'areas';
export type Reward =
  | { kind: 'coins'; n: number }
  | { kind: 'potions'; n: number }
  | { kind: 'sp'; n: number }
  | { kind: 'outfit' };

export interface Achievement { id: string; name: string; desc: string; stat: StatId; goal: number; reward?: Reward }

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'kill1', name: 'FIRST BLOOD', desc: 'Defeat an enemy', stat: 'kills', goal: 1 },
  { id: 'kill500', name: 'HUNTER', desc: 'Defeat 500 enemies', stat: 'kills', goal: 500, reward: { kind: 'potions', n: 5 } },
  { id: 'kill5000', name: 'SLAYER', desc: 'Defeat 5000 enemies', stat: 'kills', goal: 5000, reward: { kind: 'sp', n: 1 } },
  { id: 'elite1', name: 'GOLDEN TOUCH', desc: 'Defeat an elite', stat: 'elites', goal: 1 },
  { id: 'elite50', name: 'ELITE HUNTER', desc: 'Defeat 50 elites', stat: 'elites', goal: 50, reward: { kind: 'coins', n: 300 } },
  { id: 'boss1', name: 'GIANT SLAYER', desc: 'Defeat a boss', stat: 'bosses', goal: 1, reward: { kind: 'coins', n: 100 } },
  { id: 'boss10', name: 'WARDEN', desc: 'Defeat 10 bosses', stat: 'bosses', goal: 10, reward: { kind: 'outfit' } },
  { id: 'floor10', name: 'CLIMBER', desc: 'Climb 10 floors', stat: 'floors', goal: 10 },
  { id: 'floor100', name: 'MOUNTAINEER', desc: 'Climb 100 floors', stat: 'floors', goal: 100, reward: { kind: 'potions', n: 10 } },
  { id: 'coin1k', name: 'POCKET MONEY', desc: 'Earn 1000 coins', stat: 'coins', goal: 1000 },
  { id: 'coin20k', name: 'TYCOON', desc: 'Earn 20000 coins', stat: 'coins', goal: 20000, reward: { kind: 'coins', n: 500 } },
  { id: 'area5', name: 'WANDERER', desc: 'Visit 5 areas', stat: 'areas', goal: 5 },
  { id: 'area12', name: 'CARTOGRAPHER', desc: 'Visit 12 areas', stat: 'areas', goal: 12, reward: { kind: 'sp', n: 1 } },
];

/** The gold outfit: the last one, locked until WARDEN. */
export const GOLD_OUTFIT = OUTFITS.length - 1;

/** What a reward says, for the list. */
export function rewardText(r?: Reward): string {
  if (!r) return '';
  if (r.kind === 'coins') return `NEW RUNS START WITH +${r.n}G`;
  if (r.kind === 'potions') return `NEW RUNS START WITH +${r.n} HP POTIONS`;
  if (r.kind === 'sp') return `NEW RUNS START WITH +${r.n} SP`;
  return 'UNLOCKS THE GOLD OUTFIT';
}

interface Record_ { stats: Record<StatId, number>; areas: string[]; done: string[] }
const STORE = 'archer-game:achievements';
const empty = (): Record_ => ({ stats: { kills: 0, elites: 0, bosses: 0, floors: 0, coins: 0, areas: 0 }, areas: [], done: [] });

/** Validate a stored record (bad fields reset to 0 / empty). */
export function cleanRecord(v: unknown): Record_ {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<Record<keyof Record_, unknown>>;
  const r = empty();
  const st = (o.stats && typeof o.stats === 'object' ? o.stats : {}) as Record<string, unknown>;
  for (const k of Object.keys(r.stats) as StatId[]) {
    const n = Math.floor(Number(st[k]));
    r.stats[k] = Number.isFinite(n) && n > 0 ? Math.min(n, 1e12) : 0;
  }
  r.areas = Array.isArray(o.areas) ? [...new Set(o.areas.filter((a): a is string => typeof a === 'string'))].slice(0, 200) : [];
  r.stats.areas = r.areas.length;
  const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
  r.done = Array.isArray(o.done) ? o.done.filter((d): d is string => typeof d === 'string' && ids.has(d)) : [];
  return r;
}

export const record: Record_ = (() => {
  try { return cleanRecord(JSON.parse(localStorage.getItem(STORE) ?? 'null')); } catch { return empty(); }
})();
function store(): void {
  try { localStorage.setItem(STORE, JSON.stringify(record)); } catch { /* no storage */ }
}

export const isDone = (id: string): boolean => record.done.includes(id);
export const progress = (a: Achievement): number => Math.min(a.goal, record.stats[a.stat]);

/** Count toward a stat, unlocking whatever it completes. */
export function bump(stat: Exclude<StatId, 'areas'>, n = 1): void {
  if (n <= 0) return;
  record.stats[stat] += n;
  check();
  store();
}

/** You've set foot in an area. */
export function visitArea(name: string): void {
  if (record.areas.includes(name)) return;
  record.areas.push(name);
  record.stats.areas = record.areas.length;
  check();
  store();
}

function check(): void {
  for (const a of ACHIEVEMENTS) {
    if (isDone(a.id) || record.stats[a.stat] < a.goal) continue;
    record.done.push(a.id);
    bannerMsg('ACHIEVEMENT', a.name);
    logMsg(`Achievement: <b>${a.name}</b>${a.reward ? ` (${rewardText(a.reward).toLowerCase()})` : ''}`);
  }
}

/** Run bonuses from every unlocked achievement, summed. */
export function runBonus(): { coins: number; potions: number; sp: number } {
  const out = { coins: 0, potions: 0, sp: 0 };
  for (const a of ACHIEVEMENTS) {
    const r = a.reward;
    if (!r || r.kind === 'outfit' || !isDone(a.id)) continue;
    out[r.kind] += r.n;
  }
  return out;
}

// the stylist skips the gold outfit until it's earned
lookLocks.outfit = (i) => i === GOLD_OUTFIT && !isDone('boss10');

/** Forget every achievement (tests). */
export function clearAchievements(): void { Object.assign(record, empty()); store(); }

/* ---------------- the list window ---------------- */
export const achUi = { open: false, sel: 0 };
export function openAchievements(): void { achUi.open = true; achUi.sel = 0; }
export function achKey(k: string): void {
  const n = ACHIEVEMENTS.length;
  if (k === 'up') achUi.sel = (achUi.sel + n - 1) % n;
  else if (k === 'down') achUi.sel = (achUi.sel + 1) % n;
  else if (k === 'escape' || k === 'enter') achUi.open = false;
}
/** Rows shown at once, and the first one shown (keeps the cursor in view). */
export const ACH_ROWS = 10;
export const achScroll = (): number => Math.max(0, Math.min(achUi.sel - (ACH_ROWS >> 1), ACHIEVEMENTS.length - ACH_ROWS));
