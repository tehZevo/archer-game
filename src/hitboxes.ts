import { ctx } from './canvas';
import { game, player } from './state';

/* ============================================================
   HITBOX OVERLAY
   The `.` dev key toggles it: every body's collision box, a translucent
   red fill with a solid border, drawn over the world. A body's x is its
   centre and y its top, so the box straddles x and hangs below it.
   ============================================================ */

interface Boxed { x: number; y: number; w: number; h: number }

const box = (b: Boxed): [number, number, number, number] =>
  [Math.round(b.x - b.w / 2), Math.round(b.y), b.w, b.h];

function drawBox(b: Boxed): void {
  const [x, y, w, h] = box(b);
  ctx.fillStyle = '#ff0000';
  ctx.globalAlpha = 0.1;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h); // the half pixel keeps the line crisp
}

export function drawHitboxes(): void {
  for (const m of game.mobs) drawBox(m);
  drawBox(player);
}
