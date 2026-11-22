import { FX } from './fxsprites';
import { WORLD } from './config';
import { ctx } from './canvas';
import { game, player } from './state';
import { SPR, blockTile } from './sprites';
import { NB } from './nb';
import type { Sprite } from './sprites';
import { clamp } from './util';
import { drawHUD } from './hud';
import { text } from './font';
import type { Climbable, DmgNum, Fx, Mob, Platform, Portal, Shot } from './types';

// Base (internal) resolution. The canvas backing store IS this size; everything
// is drawn at integer pixel coordinates, then CSS upscales it to fit the screen
// with image-rendering:pixelated (nearest-neighbour) — crisp, no AA.
const BASE_W = 240;
const BASE_H = 180;
const SCALE = 1;

export function resize(): void {
  ctx.canvas.width = BASE_W * SCALE;
  ctx.canvas.height = BASE_H * SCALE;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;
  game.view.w = BASE_W;
  game.view.h = BASE_H;
  WORLD.h = Math.max(BASE_H, WORLD.h);
}

function drawBackground(): void {
  const { w, h } = game.view;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1a3a54'); g.addColorStop(0.55, '#20536b'); g.addColorStop(1, '#16394f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawPlatform(p: Platform): void {
  if (p.slope) {
    const R = p.dir === 1, hi = p.part === 1;
    const s = R ? (hi ? SPR.slopeR1 : SPR.slopeR0) : (hi ? SPR.slopeL1 : SPR.slopeL0);
    ctx.drawImage(s.c, p.x, p.y);
    return;
  }
  if (!p.ground) {
    ctx.drawImage(blockTile(p.nb ?? 0).c, p.x, p.y);
    if (p.foot) ctx.drawImage((p.foot === 1 ? SPR.slopeFootR : SPR.slopeFootL).c, p.x, p.y);
    return;
  }
  // Ground slab: grass along the top, solid dirt below; it runs off-screen
  // on both sides, so only its top is exposed.
  const ts = 16;
  const top = blockTile(NB.E | NB.W | NB.S | NB.SE | NB.SW).c, body = blockTile(255).c;
  for (let y = p.y; y < p.y + p.h; y += ts) {
    const h = Math.min(ts, p.y + p.h - y);
    for (let x = p.x; x < p.x + p.w; x += ts) {
      const w = Math.min(ts, p.x + p.w - x);
      ctx.drawImage(y === p.y ? top : body, 0, 0, w, h, x, y, w, h);
    }
  }
}

/** Tile a 16x16 sprite vertically between y1 and y2 at an integer x. */
function tileVertical(s: Sprite, x: number, y1: number, y2: number): void {
  for (let y = y1; y < y2; y += 16) {
    const h = Math.min(16, y2 - y);
    ctx.drawImage(s.c, 0, 0, 16, h, x, y, 16, h);
  }
}

function drawRope(r: Climbable): void {
  tileVertical(SPR.rope, Math.round(r.x) - 8, Math.round(r.y1), Math.round(r.y2));
}

function drawLadder(l: Climbable): void {
  tileVertical(SPR.ladder, Math.round(l.x) - 8, Math.round(l.y1), Math.round(l.y2));
}

function drawPortal(p: Portal): void {
  const s = SPR.portal;
  const bob = Math.sin(performance.now() / 300) * 2;
  ctx.drawImage(s.c, Math.round(p.x - s.w / 2), Math.round(p.y - s.h + bob));
}

function drawMob(m: Mob): void {
  const s = SPR.mob[m.name];
  // Sprite-only motion: walkers bob, fliers float. The HP bar and stun star
  // stay anchored to the mob's body position, so they never move with it.
  const bob = m.fly ? -Math.cos(m.anim * 1.6) * 3 : Math.sin(m.anim) * 2;
  ctx.save();
  if (m.hitFlash > 0) ctx.globalAlpha = 0.75;
  if (s) ctx.drawImage(s.c, Math.round(m.x - s.w / 2), Math.round(m.y + bob));
  ctx.restore();

  // HP bar: integer position and size, fill rounded to whole pixels.
  const bw = Math.max(24, Math.round(m.w * 0.9)), pct = clamp(m.hp / m.hpMax, 0, 1);
  const bx = Math.round(m.x - bw / 2), by = Math.round(m.y) - 10;
  const fill = pct > 0 ? Math.max(1, Math.round(bw * pct)) : 0;
  ctx.fillStyle = '#0009'; ctx.fillRect(bx, by, bw, 4);
  ctx.fillStyle = pct > 0.5 ? '#6ee86e' : pct > 0.25 ? '#ffd166' : '#ff6b6b';
  ctx.fillRect(bx, by, fill, 4);
  if (m.stun > 0) {
    // a small pixel star above the HP bar
    const sx = Math.round(m.x), sy = by - 5;
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(sx - 2, sy, 5, 1); ctx.fillRect(sx, sy - 2, 1, 5); ctx.fillRect(sx - 1, sy - 1, 3, 3);
  }
}

function drawPlayer(): void {
  const s = SPR.player;
  ctx.save();
  if (player.invuln > 0) ctx.globalAlpha = 0.8;
  const w = s.w, h = s.h;
  const x = Math.round(player.x - w / 2);
  const y = Math.round(player.y + player.h - h);
  ctx.translate(x + w / 2, y);
  ctx.scale(player.face, 1);
  ctx.drawImage(s.c, -w / 2, 0);
  ctx.restore();
}

function drawShot(s: Shot): void {
  if (s.delay && s.delay > 0) return; // not launched yet
  const A = FX()[s.sprite ?? 'arrow'];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // never rotated: arrows fly horizontally, mirrored when going left
  const left = s.vx < 0, img = left ? A.flipped[0] : A.frames[0];
  const ox = left ? img.width - A.ox : A.ox;
  ctx.drawImage(img, Math.round(s.x - ox), Math.round(s.y - Math.floor(A.oy)));
  ctx.restore();
}

/** Draw the frame of a baked effect animation for progress k (0..1), additively. */
function drawAnim(name: string, x: number, y: number, k: number, face = 1, sx = 1): void {
  const A = FX()[name];
  const f = Math.min(A.frames.length - 1, Math.floor(k * A.frames.length));
  const img = face < 0 ? A.flipped[f] : A.frames[f];
  const ox = (face < 0 ? img.width - A.ox : A.ox) * sx;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(img, Math.round(x - ox), Math.round(y - A.oy), Math.round(img.width * sx), img.height);
  ctx.restore();
}

const FX_DUR: Record<Fx['type'], number> = {
  tracer: 0.14, death: 0.35, levelUp: 0.9,
  muzzle: 0.18, hit: 0.24, crit: 0.28, rush: 0.4, swoosh: 0.2,
  rain: 0.4, rainHit: 0.24, stunHit: 0.3, spirit: 0.3,
};

function drawFx(f: Fx): void {
  drawAnim(f.type, f.x, f.y, 1 - f.t / FX_DUR[f.type], f.face ?? 1, f.sx ?? 1);
}

function drawDmg(d: DmgNum): void {
  // pixel font with a 1px black outline (d.y is the old text baseline)
  ctx.save();
  ctx.globalAlpha = clamp(d.t, 0, 1);
  const s = String(d.v), x = Math.round(d.x), y = Math.round(d.y) - 7;
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    text(ctx, s, x + ox, y + oy, 1, '#000', 'center');
  }
  text(ctx, s, x, y, 1, d.col, 'center');
  ctx.restore();
}

export function render(): void {
  const { w, h } = game.view;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  drawBackground();
  ctx.save();
  ctx.translate(-Math.round(game.cam.x), -Math.round(game.cam.y));
  game.floor.platforms.forEach(drawPlatform);
  game.floor.ropes.forEach(drawRope);
  game.floor.ladders.forEach(drawLadder);
  drawPortal(game.floor.portal);
  game.mobs.forEach(drawMob);
  game.shots.forEach(drawShot);
  drawPlayer();
  game.fx.forEach(drawFx);
  game.dmgNums.forEach(drawDmg);
  ctx.restore();
  drawHUD();
}
