import { WORLD } from './config';
import { game } from './state';

/* ============================================================
   MINIMAP
   The whole floor at 1:10 in the top-right corner, under the
   skill bar: platform tops, ropes and ladders, the portal, the
   enemies, other players (in their tint), you, and the part of
   the floor on screen.
   ============================================================ */

export const MINI_SCALE = 0.1;
export const MINI_W = Math.ceil(WORLD.w * MINI_SCALE);

/** Minimap position and size for the current world and view (top-right, under the skill bar). */
export function miniRect(): { x: number; y: number; w: number; h: number } {
  const w = MINI_W, h = Math.ceil(WORLD.h * MINI_SCALE);
  return { x: game.view.w - w - 7, y: 28, w, h };
}

/** A world point on the minimap (whole pixels). */
export function toMini(x: number, y: number): [number, number] {
  const r = miniRect();
  return [r.x + Math.floor(x * MINI_SCALE), r.y + Math.floor(y * MINI_SCALE)];
}
