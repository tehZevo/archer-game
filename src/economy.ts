import { P } from './config';
import { game, player } from './state';
import { pressed } from './input';
import { surfaceBetween, surfaceYAt } from './physics';
import { sfx } from './audio';
import type { Floor, Mob, Npc } from './types';

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
  drops.push({ x: m.x, y: m.y + m.h - 6, vy: -150, v: coinValue(m.level), t: COIN_LIFE, landed: false });
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
  { kind: 'hp' as const, name: 'HP POTION', key: 'A' },
  { kind: 'mp' as const, name: 'MP POTION', key: 'S' },
];

/** Buy one of an item; false if you can't afford it or can't carry more. */
export function buy(kind: 'hp' | 'mp'): boolean {
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
