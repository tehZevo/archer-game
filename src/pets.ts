import { bump } from './achievements';
import { game, player } from './state';
import { pressed } from './input';
import { drink, drops, flying, wallet, type Coin } from './economy';
import { gearDrops, takeGear, type GearDrop } from './gear';
import { sfx } from './audio';
import { PET_LIST, type PetKind } from './petart';
import type { Floor } from './types';

/* ============================================================
   PETS
   Little companions sold by the pet keeper in every town. A pet
   floats behind your shoulder and, whenever a coin pile is lying
   near you, flies over, grabs it and sends the coins your way (as
   if you'd picked it up yourself), so you can keep fighting. Each
   kind has its own range and speed, and some have a knack of their
   own: fetching gear, or drinking an HP potion for you when you're
   low. You can own several; one at a time follows you. Your own pet
   only (others don't see it). Saved with your coins.
   ============================================================ */

export type { PetKind };
/** What a pet does on top of fetching coins. */
export type PetPerk = 'gear' | 'potion' | null;

export interface PetDef {
  name: string;
  price: number;
  /** px/s it flies at */
  speed: number;
  /** it goes for piles within this many px of you */
  range: number;
  perk: PetPerk;
  desc: string;
}

export const PET_KINDS: Record<PetKind, PetDef> = {
  goldfinch: { name: 'GOLDFINCH', price: 400, speed: 150, range: 130, perk: null, desc: 'FETCHES COINS NEAR YOU' },
  owl: { name: 'SWIFT OWL', price: 1500, speed: 240, range: 220, perk: null, desc: 'FETCHES COINS FASTER, FROM FARTHER' },
  sprite: { name: 'LEAF SPRITE', price: 3000, speed: 170, range: 150, perk: 'gear', desc: 'FETCHES COINS AND GEAR' },
  puff: { name: 'STAR PUFF', price: 5000, speed: 150, range: 130, perk: 'potion', desc: 'FETCHES COINS, DRINKS HP POTIONS FOR YOU' },
};

export const PET = {
  /** where it hovers: behind you and up by your head */
  BACK: 12, UP: 0,
  /** a potion pet drinks for you under this share of your max HP */
  LOW_HP: 0.3,
};

type Target = { kind: 'coin'; c: Coin } | { kind: 'gear'; d: GearDrop };

/** The pets you own, the one following you, and where it is. */
export const pet = {
  owned: [] as PetKind[],
  kind: null as PetKind | null,
  x: 0, y: 0, face: 1 as 1 | -1, anim: 0,
  target: null as Target | null,
};

let onFloor: Floor | null = null;

/** The pet following you (its stats), if any. */
export const activePet = (): PetDef | null => (pet.kind ? PET_KINDS[pet.kind] : null);

/** Follow, fetch, return. Call each step (after the coins have moved). */
export function updatePet(dt: number): void {
  const def = activePet();
  if (!def) return;
  pet.anim += dt;
  // a new floor: it arrives with you
  if (onFloor !== game.floor) { onFloor = game.floor; pet.target = null; home(true); return; }
  if (def.perk === 'potion' && player.hp > 0 && player.hp < player.hpMax * PET.LOW_HP) drink('hp');
  if (pet.target && !stillThere(pet.target)) pet.target = null;
  pet.target ??= findTarget(def);
  if (!pet.target) { home(false, dt); return; }
  const t = pet.target, at = t.kind === 'coin' ? t.c : t.d;
  if (fly(at.x, at.y - 6, def.speed * dt)) { grab(t); pet.target = null; }
}

const stillThere = (t: Target): boolean => (t.kind === 'coin' ? drops.includes(t.c) : gearDrops.includes(t.d));

/** The nearest landed coin pile (or, for a gear pet, piece of gear) in range of you. */
function findTarget(def: PetDef): Target | null {
  let best = def.range, found: Target | null = null;
  const near = (x: number, y: number): boolean => {
    const d = Math.hypot(x - player.x, y - (player.y + player.h));
    if (d >= best) return false;
    best = d;
    return true;
  };
  for (const c of drops) if (c.landed && near(c.x, c.y)) found = { kind: 'coin', c };
  if (def.perk === 'gear') for (const d of gearDrops) if (near(d.x, d.y)) found = { kind: 'gear', d };
  return found;
}

/** Grabbed: coins fly to you, just like picking them up; gear goes on or into the bag. */
function grab(t: Target): void {
  if (t.kind === 'gear') { takeGear(t.d); return; }
  const c = t.c;
  drops.splice(drops.indexOf(c), 1);
  wallet.coins += c.v;
  bump('coins', c.v);
  flying.push({ x: c.x, y: c.y, v: c.v, t: 0 });
  sfx.coin();
}

/** Ease back to your shoulder (or jump there). */
function home(snap: boolean, dt = 0): void {
  const tx = player.x - player.face * PET.BACK, ty = player.y - PET.UP + Math.sin(pet.anim * 3) * 2;
  if (snap) { pet.x = tx; pet.y = ty; pet.face = player.face; return; }
  const k = Math.min(1, 6 * dt);
  pet.x += (tx - pet.x) * k; pet.y += (ty - pet.y) * k;
  if (Math.abs(tx - pet.x) < 2) pet.face = player.face;
}

/** Move toward (x, y) by up to `step` px; true once there. */
function fly(x: number, y: number, step: number): boolean {
  const dx = x - pet.x, dy = y - pet.y, d = Math.hypot(dx, dy);
  if (dx) pet.face = dx > 0 ? 1 : -1;
  if (d <= step + 2) { pet.x = x; pet.y = y; return true; }
  pet.x += (dx / d) * step; pet.y += (dy / d) * step;
  return false;
}

/** Call a pet you own to follow you (it appears at your shoulder). */
function summon(kind: PetKind): void {
  pet.kind = kind; pet.target = null; onFloor = null;
}

/** Buy a pet (it follows you at once); false if owned already or you can't afford it. */
export function buyPet(kind: PetKind): boolean {
  if (pet.owned.includes(kind) || wallet.coins < PET_KINDS[kind].price) return false;
  wallet.coins -= PET_KINDS[kind].price;
  pet.owned.push(kind);
  summon(kind);
  sfx.coin();
  return true;
}

/** Forget every pet (a fresh start). */
export function clearPets(): void {
  pet.owned = []; pet.kind = null; pet.target = null;
}

/** Restore saved pets, dropping anything that isn't one. */
export function loadPets(owned: unknown, kind: unknown): void {
  clearPets();
  if (Array.isArray(owned)) for (const k of owned) if (PET_LIST.includes(k) && !pet.owned.includes(k)) pet.owned.push(k);
  if (pet.owned.includes(kind as PetKind)) pet.kind = kind as PetKind;
}

/* ---------------- the pet keeper's window ----------------
   Every pet, cheapest first: Z buys one you don't have, or calls one you
   own to follow you (or sends the one following you home). */

export const petShop = { open: false, sel: 0 };

export function openPetShop(): void { petShop.open = true; petShop.sel = 0; }

/** Z on a row: buy it, swap to it, or (on the one following you) send it home. */
export function choosePet(kind: PetKind): boolean {
  if (!pet.owned.includes(kind)) return buyPet(kind);
  if (pet.kind === kind) pet.kind = null; else summon(kind);
  return true;
}

/** Up/Down pick, Z/Enter buys or summons, Esc or X closes. */
export function petShopInput(): void {
  const n = PET_LIST.length;
  if (pressed('up')) petShop.sel = (petShop.sel + n - 1) % n;
  if (pressed('down')) petShop.sel = (petShop.sel + 1) % n;
  if (pressed('z') || pressed('enter') || pressed(' ')) choosePet(PET_LIST[petShop.sel]);
  if (pressed('escape') || pressed('x')) petShop.open = false;
}
