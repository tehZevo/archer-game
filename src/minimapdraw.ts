import { ctx } from './canvas';
import { game, player } from './state';
import { net, roster } from './net';
import { view } from './ghost';
import { tintFor } from './presence';
import { MINI_SCALE, miniMapH, miniMapW, miniRect, miniScroll, toMini } from './minimap';
import type { Floor } from './types';

/* Drawing for the minimap (layout lives in minimap.ts). */

const dot = (x: number, y: number, col: string, s = 1): void => {
  const [mx, my] = toMini(x, y);
  ctx.fillStyle = col; ctx.fillRect(mx - (s >> 1), my - (s >> 1), s, s);
};

/** The whole floor's layout (platform tops, the ground as a solid band,
 *  ropes and ladders), baked once per floor at 1:16; the 32×32 window
 *  scrolls over it. */
let baked: { floor: Floor; c: HTMLCanvasElement } | null = null;
function miniLayer(): HTMLCanvasElement {
  const w = miniMapW(), h = miniMapH();
  if (baked && baked.floor === game.floor) return baked.c;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const at = (x: number, y: number): [number, number] => [Math.floor(x * MINI_SCALE), Math.floor(y * MINI_SCALE)];
  for (const p of game.floor.platforms) {
    if (p.inner) continue;
    const [x, y] = at(p.x, p.y);
    g.fillStyle = p.ground ? '#3b6b4a' : '#7fbf6a';
    g.fillRect(x, y, Math.max(1, Math.ceil(p.w * MINI_SCALE)), p.ground ? h - y : 1);
  }
  g.fillStyle = '#a5875a';
  for (const cl of [...game.floor.ropes, ...game.floor.ladders]) {
    const [x, y1] = at(cl.x, cl.y1), [, y2] = at(cl.x, cl.y2);
    g.fillRect(x, y1, 1, Math.max(1, y2 - y1));
  }
  baked = { floor: game.floor, c };
  return c;
}

export function drawMinimap(): void {
  const r = miniRect(), s = miniScroll();
  ctx.save();
  // a lighter backdrop than the old b0; local play goes one step further
  ctx.fillStyle = net.offline ? '#070c1670' : '#070c1690';
  ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
  ctx.strokeStyle = '#3c5478'; ctx.lineWidth = 1; ctx.strokeRect(r.x - 1.5, r.y - 1.5, r.w + 3, r.h + 3);
  ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();

  ctx.drawImage(miniLayer(), r.x - s.x, r.y - s.y); // the floor's layout, baked once
  // the screen's view of the floor
  const [vx, vy] = toMini(game.cam.x, game.cam.y);
  ctx.strokeStyle = '#ffffff40';
  ctx.strokeRect(vx + 0.5, vy + 0.5, Math.round(game.view.w * MINI_SCALE) - 1, Math.round(game.view.h * MINI_SCALE) - 1);

  for (const pt of game.floor.portals) dot(pt.x, pt.y - 4, pt.down ? '#8fe3c4' : '#c9a6ff', 2);
  for (const m of game.mobs) dot(m.x, m.y + m.h / 2, '#ff6b6b');
  const now = performance.now();
  for (const [id, tr] of roster.tracks) {
    const g = view(tr, now);
    if (g) dot(g.x, g.y + 12, tintFor(id), 2);
  }
  dot(player.x, player.y + player.h / 2, '#ffd166', 2);
  ctx.restore();
}
