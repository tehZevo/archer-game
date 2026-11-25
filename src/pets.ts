import { game, player } from './state';
import { drops, flying, wallet } from './economy';
import { sfx } from './audio';
import type { Floor } from './types';

/* ============================================================
   PET
   A little flying companion, bought once from the town shop. It
   floats behind your shoulder and, whenever a coin pile is lying
   near you, flies over, grabs it and sends the coins your way (as
   if you'd picked it up yourself), so you can keep fighting.
   Your own pet only (others don't see it). Saved with your coins.
   ============================================================ */

export const PET = {
  PRICE: 400,
  /** px/s it flies at */
  SPEED: 150,
  /** it goes for piles within this many px of you */
  RANGE: 130,
  /** where it hovers: behind you and up by your head */
  BACK: 12, UP: 0,
};

export const pet = { owned: false, x: 0, y: 0, face: 1 as 1 | -1, anim: 0, target: null as null | (typeof drops)[number] };

let onFloor: Floor | null = null;

/** Follow, fetch, return. Call each step (after the coins have moved). */
export function updatePet(dt: number): void {
  if (!pet.owned) return;
  pet.anim += dt;
  // a new floor: it arrives with you
  if (onFloor !== game.floor) { onFloor = game.floor; pet.target = null; home(true); return; }
  // still a pile to fetch? else find the nearest landed one near you
  if (pet.target && !drops.includes(pet.target)) pet.target = null;
  if (!pet.target) {
    let best = PET.RANGE;
    for (const c of drops) {
      if (!c.landed) continue;
      const d = Math.hypot(c.x - player.x, c.y - (player.y + player.h));
      if (d < best) { best = d; pet.target = c; }
    }
  }
  if (!pet.target) { home(false, dt); return; }
  const c = pet.target, tx = c.x, ty = c.y - 6;
  if (fly(tx, ty, PET.SPEED * dt)) {
    // grabbed: the coins fly to you, just like picking them up
    drops.splice(drops.indexOf(c), 1);
    wallet.coins += c.v;
    flying.push({ x: c.x, y: c.y, v: c.v, t: 0 });
    sfx.coin();
    pet.target = null;
  }
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

/** Buy the pet (once); false if owned already or you can't afford it. */
export function buyPet(): boolean {
  if (pet.owned || wallet.coins < PET.PRICE) return false;
  wallet.coins -= PET.PRICE;
  pet.owned = true; onFloor = null;
  sfx.coin();
  return true;
}
