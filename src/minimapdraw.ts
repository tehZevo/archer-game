import { ctx } from './canvas';
import { game, player } from './state';
import { peers } from './net';
import { view } from './ghost';
import { tintFor } from './presence';
import { MINI_SCALE, miniRect, toMini } from './minimap';

/* Drawing for the minimap (layout lives in minimap.ts). */

const dot = (x: number, y: number, col: string, s = 1): void => {
  const [mx, my] = toMini(x, y);
  ctx.fillStyle = col; ctx.fillRect(mx - (s >> 1), my - (s >> 1), s, s);
};

export function drawMinimap(): void {
  const r = miniRect();
  ctx.save();
  ctx.fillStyle = '#070c16b0'; ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
  ctx.strokeStyle = '#3c5478'; ctx.lineWidth = 1; ctx.strokeRect(r.x - 1.5, r.y - 1.5, r.w + 3, r.h + 3);
  ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();

  // platform tops (the ground as a solid band)
  for (const p of game.floor.platforms) {
    if (p.inner) continue;
    const [x, y] = toMini(p.x, p.y);
    ctx.fillStyle = p.ground ? '#3b6b4a' : '#7fbf6a';
    ctx.fillRect(x, y, Math.max(1, Math.ceil(p.w * MINI_SCALE)), p.ground ? r.y + r.h - y : 1);
  }
  // ropes and ladders
  ctx.fillStyle = '#a5875a';
  for (const c of [...game.floor.ropes, ...game.floor.ladders]) {
    const [x, y1] = toMini(c.x, c.y1), [, y2] = toMini(c.x, c.y2);
    ctx.fillRect(x, y1, 1, Math.max(1, y2 - y1));
  }
  // the screen's view of the floor
  const [vx, vy] = toMini(game.cam.x, game.cam.y);
  ctx.strokeStyle = '#ffffff40';
  ctx.strokeRect(vx + 0.5, vy + 0.5, Math.round(game.view.w * MINI_SCALE) - 1, Math.round(game.view.h * MINI_SCALE) - 1);

  for (const pt of game.floor.portals) dot(pt.x, pt.y - 4, pt.down ? '#8fe3c4' : '#c9a6ff', 2);
  for (const m of game.mobs) dot(m.x, m.y + m.h / 2, '#ff6b6b');
  const now = performance.now();
  for (const [id, tr] of peers) {
    const g = view(tr, now);
    if (g) dot(g.x, g.y + 12, tintFor(id), 2);
  }
  dot(player.x, player.y + player.h / 2, '#ffd166', 2);
  ctx.restore();
}
