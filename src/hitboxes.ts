import { ctx } from './canvas';
import { game, player } from './state';

/* ============================================================
   BOX OVERLAY
   The `.` dev key toggles it. Two kinds of box show at once: the bodies'
   own collision boxes (green) and the skills' damage areas (red), which
   hang around for a moment after the hit so you can see what a cast
   covered. A body's x is its centre and y its top; a damage area is
   centred on its x and y.
   ============================================================ */

/** A skill's damage area, kept on screen for a beat after it fires. */
interface Hurtbox { x: number; y: number; w: number; h: number; t: number }

export const HURT_T = 0.5; // s a damage area stays visible
const live: Hurtbox[] = [];

/** Record a damage area (see combat.hitbox): centred on (cx, cy). */
export function showHurtbox(cx: number, cy: number, w: number, h: number): void {
  live.push({ x: cx - w / 2, y: cy - h / 2, w, h, t: HURT_T });
}

/** Age out the damage areas, one fixed step. */
export function tickBoxes(dt: number): void {
  for (let i = live.length - 1; i >= 0; i--) if ((live[i].t -= dt) <= 0) live.splice(i, 1);
}

const rect = (x: number, y: number, w: number, h: number, col: string): void => {
  ctx.fillStyle = col;
  ctx.globalAlpha = 0.1;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h); // the half pixel keeps the line crisp
};

export function drawBoxes(): void {
  for (const b of live) rect(b.x, b.y, b.w, b.h, '#ff0000');
  for (const m of game.mobs) rect(m.x - m.w / 2, m.y, m.w, m.h, '#00ff00');
  rect(player.x - player.w / 2, player.y, player.w, player.h, '#00ff00');
}
