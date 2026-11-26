import { FX } from './fxsprites';
import { FX_DUR } from './config';
import { ctx } from './canvas';
import { clamp } from './util';
import { BOSS, QUAKE_T } from './boss';
import { outlinedText } from './font';
import type { DmgNum, Fx, Shot } from './types';

/* Effects over the action: arrows, skill effects, damage numbers, boss quakes. */

/** A slam's shockwave: dust kicked up along the ground, spreading and fading. */
export function drawQuake(q: { x: number; y: number; t: number }): void {
  const u = 1 - q.t / QUAKE_T, r = BOSS.QUAKE_R * (0.3 + 0.7 * u);
  ctx.fillStyle = `rgba(230, 210, 170, ${(1 - u) * 0.9})`;
  for (let i = -6; i <= 6; i++) {
    const x = q.x + (i / 6) * r, hgt = Math.round((1 - Math.abs(i) / 7) * 8 * (1 - u) + 2);
    ctx.fillRect(Math.round(x) - 2, Math.round(q.y) - hgt, 4, hgt);
  }
}

export function drawShot(s: Shot): void {
  if (s.delay && s.delay > 0) return; // not launched yet
  const A = FX()[s.sprite ?? 'arrow'];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // never rotated: arrows fly horizontally, mirrored when going left;
  // a looping sheet (the flurry's volley) steps a frame every 1/20s of flight
  const f = Math.floor(Math.max(0, s.t) * 20) % A.frames.length;
  const left = s.vx < 0, img = left ? A.flipped[f] : A.frames[f];
  const ox = left ? img.width - A.ox : A.ox;
  ctx.drawImage(img, Math.round(s.x - ox), Math.round(s.y - Math.floor(A.oy)));
  ctx.restore();
}

/** Draw the frame of a baked effect animation for progress k (0..1), additively. */
function drawAnim(name: string, x: number, y: number, k: number, face = 1, sx = 1): void {
  const A = FX()[name];
  // clamped both ways: an effect living longer than its animation holds the first frame
  const f = Math.max(0, Math.min(A.frames.length - 1, Math.floor(k * A.frames.length)));
  const img = face < 0 ? A.flipped[f] : A.frames[f];
  const ox = (face < 0 ? img.width - A.ox : A.ox) * sx;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(img, Math.round(x - ox), Math.round(y - A.oy), Math.round(img.width * sx), img.height);
  ctx.restore();
}


export function drawFx(f: Fx): void {
  drawAnim(f.type, f.x, f.y, 1 - f.t / FX_DUR[f.type], f.face ?? 1, f.sx ?? 1);
}

export function drawDmg(d: DmgNum): void {
  if (d.delay && d.delay > 0) return;
  // pixel font with a black outline (d.y is the old text baseline); the 2x
  // scale keeps damage readable at a glance
  ctx.save();
  ctx.globalAlpha = clamp(d.t, 0, 1);
  const s = d.txt ?? String(d.v), y = Math.round(d.y) - 10;
  // tight tracking: digits overlap by a column (negative gap); outlinedText
  // centers the string on d.x
  outlinedText(ctx, s, d.x, y, 2, d.col, -1);
  ctx.restore();
}
