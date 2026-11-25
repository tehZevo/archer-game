import { bump } from './achievements';
import { pressed } from './input';
import { gainExp, mobLevel } from './state';
import { mobExp } from './progress';
import { areaMobs } from './floor';
import { AREAS } from './world';
import { wallet } from './economy';
import { sfx } from './audio';

/* ============================================================
   QUESTS
   A notice board stands in every town. It posts kill quests for the
   enemies of the areas above it (at the end of a branch, the area the
   town tops): defeat N of one kind, then come back to any board for
   EXP and coins. Up to QUEST_MAX are active at once; progress counts
   on any floor and is saved.
   ============================================================ */

export interface Quest { mob: string; need: number; have: number; exp: number; coins: number }

export const QUEST_MAX = 3;

/** Your active quests (saved). */
export const quests: Quest[] = [];

/** The board's window: open while reading; the world waits. */
export const board = { open: false, sel: 0, area: 0, stage: 0 };

/** What a town's board posts: one quest per enemy kind of the areas it
 *  leads up into (its own area's at the end of a branch), at most four. */
export function boardOffers(stage: number, area: number): Quest[] {
  const a = AREAS[area];
  const from = a.up.length ? a.up : [a.id];
  const names = [...new Set(from.flatMap((id) => areaMobs(AREAS[id].name).map((m) => m.n)))].slice(0, 4);
  // the enemies upstairs are at about the level of the floors just above
  const level = mobLevel(a.up.length ? stage + 1 : Math.max(1, stage - 1));
  const need = 8 + 2 * a.depth;
  return names.map((mob) => ({
    mob, need, have: 0,
    exp: Math.round(mobExp(level) * need * 0.6),
    coins: need * (level + 2),
  }));
}

/** A defeated enemy counts toward every active quest for its kind. */
export function questKill(name: string): void {
  for (const q of quests) if (q.mob === name && q.have < q.need) q.have++;
}

export const isDone = (q: Quest): boolean => q.have >= q.need;

/** Take a posted quest (not if you're full or already on one for that enemy). */
export function accept(q: Quest): boolean {
  if (quests.length >= QUEST_MAX || quests.some((a) => a.mob === q.mob)) return false;
  quests.push({ ...q, have: 0 });
  return true;
}

/** Hand in a finished quest for its rewards. */
export function turnIn(i: number): boolean {
  const q = quests[i];
  if (!q || !isDone(q)) return false;
  quests.splice(i, 1);
  gainExp(q.exp);
  wallet.coins += q.coins;
  bump('coins', q.coins);
  return true;
}

/** Drop an active quest (its progress is lost). */
export function abandon(i: number): boolean {
  if (!quests[i]) return false;
  quests.splice(i, 1);
  return true;
}

/** The board's rows: your active quests first, then the postings you could take. */
export function boardRows(): { q: Quest; active: number | null }[] {
  const offers = boardOffers(board.stage, board.area).filter((o) => !quests.some((a) => a.mob === o.mob));
  return [...quests.map((q, i) => ({ q, active: i })), ...offers.map((q) => ({ q, active: null }))];
}

export function openBoard(stage: number, area: number): void {
  board.open = true; board.sel = 0; board.stage = stage; board.area = area;
}

/** Board input: Up/Down picks, Z takes a posting or hands in a finished
 *  quest, X drops an active one, Esc closes. */
export function boardInput(): void {
  const rows = boardRows(), n = rows.length;
  if (n && pressed('up')) board.sel = (board.sel + n - 1) % n;
  if (n && pressed('down')) board.sel = (board.sel + 1) % n;
  const r = rows[board.sel];
  if (r && (pressed('z') || pressed('enter') || pressed(' '))) {
    const ok = r.active === null ? accept(r.q) : turnIn(r.active);
    if (ok) { sfx.levelUp(); board.sel = Math.min(board.sel, Math.max(0, boardRows().length - 1)); }
  }
  if (r && r.active !== null && pressed('x')) { abandon(r.active); board.sel = Math.min(board.sel, Math.max(0, boardRows().length - 1)); }
  if (pressed('escape')) board.open = false;
}

/** Restore saved quests (dropping anything malformed). */
export function loadQuests(v: unknown): void {
  quests.length = 0;
  if (!Array.isArray(v)) return;
  for (const q of v.slice(0, QUEST_MAX)) {
    if (!q || typeof q.mob !== 'string') continue;
    const num = (x: unknown, hi: number): number => Math.max(0, Math.min(hi, Math.floor(Number(x)) || 0));
    const need = Math.max(1, num(q.need, 999));
    quests.push({ mob: q.mob, need, have: Math.min(need, num(q.have, 999)), exp: num(q.exp, 1e9), coins: num(q.coins, 1e9) });
  }
}

