import { P } from './config';
import { game, player } from './state';
import { pressed } from './input';
import { wallet } from './economy';
import { heldDir } from './move';
import { sfx } from './audio';
import { CHAIR_LIST, type ChairKind } from './chairart';
import type { Floor } from './types';

/* ============================================================
   CHAIRS
   The chair merchant (in about a third of the towns) sells four
   chairs, cosmetic apart from the price. You carry one at a time:
   buying another replaces it. F sits you down on it anywhere, and
   while seated you restore a share of your max HP and MP every
   second. You can't sit while in combat (see player.combatT), and
   F again, moving, jumping, attacking or taking damage stands you
   up. Other players see the chair and the pose (see net.ts). Saved
   with your coins.
   ============================================================ */

export { CHAIR_LIST, type ChairKind };

export interface ChairDef { name: string; price: number; desc: string }

export const CHAIR_KINDS: Record<ChairKind, ChairDef> = {
  stool: { name: 'STOOL', price: 300, desc: 'A SIMPLE THREE-LEGGED STOOL' },
  wooden: { name: 'WOODEN CHAIR', price: 1500, desc: 'A STURDY LADDER-BACK CHAIR' },
  armchair: { name: 'ARMCHAIR', price: 5000, desc: 'DEEP RED VELVET, GOLD PIPING' },
  throne: { name: 'THRONE', price: 15000, desc: 'FIT FOR A QUEEN OF THE TOWER' },
};

/** The chair you carry (null: none yet), and whether you're sitting on it. */
export const chair = { kind: null as ChairKind | null, sitting: false };

let seatedHp = 0;
let seatedOn: Floor | null = null;

/** Whether you could sit down right now: a chair to sit on, standing still on
 *  the ground, not mid-skill, and out of combat. */
export function canSit(): boolean {
  return !!chair.kind && player.hp > 0 && player.onGround && !player.climb && !player.cast
    && player.casting.useT <= 0 && player.combatT <= 0 && heldDir() === 0;
}

/** Sit down on your chair (if you can). */
export function sit(): boolean {
  if (!canSit()) return false;
  chair.sitting = true;
  player.vx = 0;
  seatedHp = player.hp;
  seatedOn = game.floor;
  return true;
}

export function stand(): void { chair.sitting = false; }

/** Whatever stands you up: moving, jumping or leaving the ground, a skill,
 *  combat (dealing or taking damage), losing HP, or a new floor. */
function standsYouUp(): boolean {
  return heldDir() !== 0 || !player.onGround || !!player.climb || !!player.cast
    || player.casting.useT > 0 || player.combatT > 0 || player.hp < seatedHp || game.floor !== seatedOn;
}

/** F sits or stands; seated, you restore HP and MP. Call each step, after the enemies move. */
export function updateChair(dt: number): void {
  if (!chair.sitting) {
    if (pressed('f')) sit();
    return;
  }
  if (pressed('f') || standsYouUp()) { stand(); return; }
  player.hp = Math.min(player.hpMax, player.hp + player.hpMax * P.SIT_REGEN * dt);
  player.mp = Math.min(player.mpMax, player.mp + player.mpMax * P.SIT_REGEN * dt);
  seatedHp = player.hp;
}

/** Buy a chair: it replaces the one you carry. False if it's the one you have
 *  already or you can't afford it. */
export function buyChair(kind: ChairKind): boolean {
  if (chair.kind === kind || wallet.coins < CHAIR_KINDS[kind].price) return false;
  wallet.coins -= CHAIR_KINDS[kind].price;
  chair.kind = kind;
  sfx.coin();
  return true;
}

/** Forget your chair (a fresh start). */
export function clearChair(): void { chair.kind = null; chair.sitting = false; }

/** Restore a saved chair, dropping anything that isn't one. */
export function loadChair(kind: unknown): void {
  clearChair();
  if (CHAIR_LIST.includes(kind as ChairKind)) chair.kind = kind as ChairKind;
}

/* ---------------- the chair merchant's window ---------------- */

export const chairShop = { open: false, sel: 0 };

export function openChairShop(): void { chairShop.open = true; chairShop.sel = 0; }

/** Up/Down pick a chair, Z/Enter buys it, Esc/X closes. */
export function chairShopInput(): void {
  const n = CHAIR_LIST.length;
  if (pressed('up')) chairShop.sel = (chairShop.sel + n - 1) % n;
  if (pressed('down')) chairShop.sel = (chairShop.sel + 1) % n;
  if (pressed('z') || pressed('enter') || pressed(' ')) buyChair(CHAIR_LIST[chairShop.sel]);
  if (pressed('escape') || pressed('x')) chairShop.open = false;
}
