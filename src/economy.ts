import { bump } from './achievements';
import { P, SKILLS } from './config';
import { game, player } from './state';
import { pressed } from './input';
import { surfaceBetween, surfaceYAt } from './physics';
import { sfx } from './audio';
import { openStylist } from './stylist';
import { openBoard } from './quests';
import { lastTown, placeName } from './world';
import { coinMult } from './floormods';
import { buyPet } from './pets';
import { activeSkill, recalcStats, STAT_KEYS, upgradesOf } from './progress';
import type { Floor, Mob, Npc, SkillKey } from './types';

/* ============================================================
   ECONOMY
   Coins and potions. A defeated enemy drops a pile of coins
   (worth more on higher floors) that falls onto the platform;
   stand on it and press X to pick it up (it flies to you with a
   chime). Landed piles bob gently and fade after 5 minutes. Coins buy potions from the town shopkeeper (press Up
   beside them); A drinks an HP potion, S an MP potion. All of it
   is local (enemies are local too) and saved.
   ============================================================ */

/** What you carry (saved). */
export const wallet = { coins: 0, hp: 0, mp: 0 };

/** A pile of coins on the floor. */
export interface Coin { x: number; y: number; vy: number; v: number; t: number; landed: boolean }
export const drops: Coin[] = [];
/** Piles just picked up, flying into you (already in the wallet): t counts up to FLY_T. */
export interface Flying { x: number; y: number; v: number; t: number }
export const flying: Flying[] = [];
export const FLY_T = 0.25;       // s a picked-up pile takes to reach you

export const COIN_LIFE = 300;    // s before an uncollected pile vanishes (5 minutes)
export const PICK_R = 16;        // px from your centre a pile can be picked up
export const POTION_HEAL = 0.4;  // a potion restores 40% of max HP / MP
export const POTION_CD = 0.6;    // s between potions
export const PRICES = { hp: 30, mp: 30 };
export const CARRY_MAX = 99;     // potions of each kind

/** Coins a defeated enemy drops: more on higher floors (by its level). */
export function coinValue(level: number, r = Math.random()): number {
  const lo = level + 1, hi = 2 * level + 2;
  return lo + Math.floor(r * (hi - lo + 1));
}

export function dropCoins(m: Mob): void {
  sameFloor();
  drops.push({ x: m.x, y: m.y + m.h - 6, vy: -150, v: Math.round(coinValue(m.level) * coinMult()), t: COIN_LIFE, landed: false });
}

let potT = 0;
let onFloor: Floor | null = null;
/** On a new floor, the piles left behind are gone. */
function sameFloor(): void {
  if (onFloor !== game.floor) { drops.length = 0; flying.length = 0; onFloor = game.floor; }
}

/** Fall, land, fade; pick up with X; drink with A / S. Call each step. */
export function updateEconomy(dt: number): void {
  sameFloor();
  for (let i = flying.length - 1; i >= 0; i--) if ((flying[i].t += dt) >= FLY_T) flying.splice(i, 1);
  for (let i = drops.length - 1; i >= 0; i--) {
    const c = drops[i];
    c.t -= dt;
    if (c.t <= 0) { drops.splice(i, 1); continue; }
    if (c.landed) continue;
    const prev = c.y;
    c.vy = Math.min(c.vy + P.GRAVITY * dt, P.TERMINAL);
    c.y += c.vy * dt;
    const s = c.vy > 0 ? surfaceBetween(c.x, 6, prev - 2, c.y + 2) : null;
    if (s) { c.y = surfaceYAt(s, c.x); c.vy = 0; c.landed = true; }
  }

  if (pressed('x')) pickUp();
  potT = Math.max(0, potT - dt);
  if (pressed('a')) drink('hp');
  if (pressed('s')) drink('mp');
}

/** Piles near your feet go into the wallet. Returns how many coins. */
export function pickUp(): number {
  const feet = player.y + player.h;
  let got = 0;
  for (let i = drops.length - 1; i >= 0; i--) {
    const c = drops[i];
    if (Math.abs(c.x - player.x) <= PICK_R && Math.abs(c.y - feet) <= 12) {
      got += c.v; drops.splice(i, 1);
      flying.push({ x: c.x, y: c.y, v: c.v, t: 0 });
    }
  }
  wallet.coins += got;
  bump('coins', got);
  if (got) sfx.coin();
  return got;
}

/** Drink a potion (if you have one, need it, and aren't still drinking). */
export function drink(kind: 'hp' | 'mp'): boolean {
  const cur = kind === 'hp' ? player.hp : player.mp, max = kind === 'hp' ? player.hpMax : player.mpMax;
  if (wallet[kind] <= 0 || cur >= max || potT > 0 || player.hp <= 0) return false;
  wallet[kind]--;
  potT = POTION_CD;
  const v = Math.min(max, cur + Math.ceil(max * POTION_HEAL));
  if (kind === 'hp') player.hp = v; else player.mp = v;
  game.fx.push({ type: 'hit', x: player.x, y: player.y + 6, t: 0.2 });
  return true;
}

/* ---------------- NPCs and the shop ---------------- */

/** How close (px) you must stand to talk (clear of the deck's portal and ladder). */
export const NPC_R = 8;

/** The NPC you're standing next to, if any. */
export function npcNear(): Npc | null {
  const feet = player.y + player.h;
  return (game.floor.npcs ?? []).find((n) => Math.abs(n.x - player.x) < NPC_R && Math.abs(n.y - feet) < 6) ?? null;
}

/** The shop window (open while browsing; the world waits). */
export const shop = { open: false, sel: 0 };
export const SHOP_ITEMS = [
  { kind: 'hp' as const, name: 'HP POTION', key: 'A', desc: 'RESTORES 40% HP' },
  { kind: 'mp' as const, name: 'MP POTION', key: 'S', desc: 'RESTORES 40% MP' },
  { kind: 'pet' as const, name: 'PET', key: '', desc: 'FETCHES COINS FOR YOU' },
];
export type ShopKind = (typeof SHOP_ITEMS)[number]['kind'];

/* ---------------- the trainer (respec) ----------------
   From the third town (Lanternhollow) up, a trainer stands beside the
   shopkeeper. Two services, both paid in coins: swap a skill slot over to
   its other branch (keeping the rank you put into it), or refund every AP
   and SP spent and start the build over. */

/** The trainer's window (open while browsing; the world waits). */
export const trainer = { open: false, sel: 0 };

/** What each service costs. Swapping one slot is cheap; rebuilding the whole
 *  build costs more. */
export const RESPEC_PRICES = { swap: 100, reset: 500 };

/** The slots the trainer can respec, and the label the menu gives each. */
export const TRAINER_SLOTS: { slot: SkillKey; label: string }[] = [
  { slot: 'Z', label: 'MAIN' }, { slot: 'Q', label: 'LAUNCH' }, { slot: 'W', label: 'LINK' },
];

/** Every skill the slot can be: its base first, then each competing branch. */
export const slotBranches = (slot: SkillKey): SkillKey[] => [slot, ...upgradesOf(slot)];

/** Swap a slot to its next branch, keeping the rank you paid for (clamped to
 *  what the new skill can take). False if you can't afford it. */
export function swapBranch(slot: SkillKey): boolean {
  if (wallet.coins < RESPEC_PRICES.swap) return false;
  const list = slotBranches(slot), cur = activeSkill(slot).key;
  const next = list[(list.indexOf(cur) + 1) % list.length];
  const keep = Math.min(player.ranks[cur] || 1, SKILLS[next].maxLevel);
  list.forEach((k) => { player.ranks[k] = k === next ? keep : 0; });
  wallet.coins -= RESPEC_PRICES.swap;
  sfx.coin();
  return true;
}

/** Ranks the Archer starts with (free, so a reset gives them back). */
const FREE_RANKS = (Object.keys(SKILLS) as SkillKey[]).filter((k) => SKILLS[k].minLevel <= 1).length;

/** Refund every AP and SP spent, back to the starting skills. */
export function resetPoints(): boolean {
  if (wallet.coins < RESPEC_PRICES.reset) return false;
  player.ap += STAT_KEYS.reduce((n, k) => n + player.stats[k], 0);
  STAT_KEYS.forEach((k) => { player.stats[k] = 0; });
  player.sp += (Object.keys(player.ranks) as SkillKey[]).reduce((n, k) => n + (player.ranks[k] || 0), 0) - FREE_RANKS;
  (Object.keys(player.ranks) as SkillKey[]).forEach((k) => { player.ranks[k] = SKILLS[k].minLevel <= 1 ? 1 : 0; });
  recalcStats();
  wallet.coins -= RESPEC_PRICES.reset;
  sfx.coin();
  return true;
}

/** Buy one of an item; false if you can't afford it or can't carry more. */
export function buy(kind: ShopKind): boolean {
  if (kind === 'pet') return buyPet();
  if (wallet.coins < PRICES[kind] || wallet[kind] >= CARRY_MAX) return false;
  wallet.coins -= PRICES[kind];
  wallet[kind]++;
  return true;
}

/** Up beside an NPC talks to them (the shopkeeper opens the shop). */
export function talk(): boolean {
  if (!player.onGround || player.climb || !pressed('up')) return false;
  const n = npcNear();
  if (!n) return false;
  if (n.kind === 'shop') { shop.open = true; shop.sel = 0; }
  if (n.kind === 'trainer') { trainer.open = true; trainer.sel = 0; }
  if (n.kind === 'stylist') openStylist(placeName(game.floor.place));
  if (n.kind === 'board') openBoard(lastTown(game.floor.place));
  return true;
}

/** Shop input: Up/Down pick, Z/Enter buys, Esc or X closes. */
export function shopInput(): void {
  const n = SHOP_ITEMS.length;
  if (pressed('up')) shop.sel = (shop.sel + n - 1) % n;
  if (pressed('down')) shop.sel = (shop.sel + 1) % n;
  if (pressed('z') || pressed('enter') || pressed(' ')) buy(SHOP_ITEMS[shop.sel].kind);
  if (pressed('escape') || pressed('x')) shop.open = false;
}

/** The trainer's menu: Up/Down picks a service, Z takes it, Esc or X closes.
 *  The rows are the three skill slots (swap that slot's branch), then the
 *  full reset at the bottom. */
export const TRAINER_ITEMS = [...TRAINER_SLOTS.map((s) => s.label), 'FULL RESET'];

export function trainerInput(): void {
  const n = TRAINER_ITEMS.length;
  if (pressed('up')) trainer.sel = (trainer.sel + n - 1) % n;
  if (pressed('down')) trainer.sel = (trainer.sel + 1) % n;
  if (pressed('z') || pressed('enter') || pressed(' ')) {
    if (trainer.sel === n - 1) resetPoints();
    else swapBranch(TRAINER_SLOTS[trainer.sel].slot);
  }
  if (pressed('escape') || pressed('x')) trainer.open = false;
}
