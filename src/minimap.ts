import { WORLD } from './config';
import { game } from './state';

/* ============================================================
   MINIMAP
   The floor at 1:16 (one tile per pixel) in a 32×32 window in
   the top-right corner, under the skill bar: platform tops,
   ropes and ladders, the portal, the enemies, other players
   (in their tint), you, and the part of the floor on screen.
   The window shows the whole floor when it fits; a taller floor
   scrolls, keeping the camera centred.
   ============================================================ */

export const MINI_SCALE = 1 / 16;
export const MINI_PX = 32;

/** The whole floor at 1:16, in minimap pixels. */
export const miniMapW = (): number => Math.ceil(WORLD.w * MINI_SCALE);
export const miniMapH = (): number => Math.ceil(WORLD.h * MINI_SCALE);

/** Minimap position and size (top-right, under the two-row skill bar). */
export function miniRect(): { x: number; y: number; w: number; h: number } {
  const w = Math.min(MINI_PX, miniMapW()), h = Math.min(MINI_PX, miniMapH());
  return { x: game.view.w - w - 7, y: 6, w, h };
}

/** The window's top-left within the whole-floor map, centred on the camera
 *  and clamped so it never runs off the floor's edges. */
export function miniScroll(): { x: number; y: number } {
  const clamp = (v: number, max: number): number => Math.max(0, Math.min(max, Math.round(v - MINI_PX / 2)));
  return {
    x: clamp((game.cam.x + game.view.w / 2) * MINI_SCALE, miniMapW() - MINI_PX),
    y: clamp((game.cam.y + game.view.h / 2) * MINI_SCALE, miniMapH() - MINI_PX),
  };
}

/** A world point on the minimap (whole pixels, relative to the window). */
export function toMini(x: number, y: number): [number, number] {
  const r = miniRect(), s = miniScroll();
  return [r.x + Math.floor(x * MINI_SCALE) - s.x, r.y + Math.floor(y * MINI_SCALE) - s.y];
}
