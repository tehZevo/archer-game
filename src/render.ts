import { FX } from './fxsprites';
import { FX_DUR, WORLD } from './config';
import { ctx } from './canvas';
import { game, player } from './state';
import { mobFrame } from './mobanim';
import { SPR } from './sprites';
import * as TB from './tilebake';
import { TOP_Y, tilesetFor, variantAt, type Tileset } from './tileset';
import { areaName } from './world';
import { drawBackdrop } from './backdropdraw';
import { PROP_H, PROP_W, propAt, propsFor } from './props';
import { localPose, looks, names, net, peers } from './net';
import { DEFAULT_LOOK, myLook, type Look } from './look';
import { dueShots, ghostFx, tintFor } from './presence';
import { view, type Pose } from './ghost';
import { ARCHER_H, ARCHER_W, archerFrame, archerFrames, climbPhase } from './archer';
import { NB } from './nb';
import type { Sprite } from './sprites';
import { clamp } from './util';
import { BOSS, portalOpen, quakes, QUAKE_T, windingUp } from './boss';
import { drawHUD } from './hud';
import { drawCoins, drawNpcs } from './economydraw';
import { text, textWidth } from './font';
import { bubbleFor, SELF } from './chat';
import type { Climbable, DmgNum, Fx, Mob, Portal, Shot } from './types';

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

/** `?area=Cave` previews an area's tileset on any floor (e.g. one not on the map yet). */
const previewArea = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('area') : null;
/** The tileset of the floor being drawn. */
const tileset = (): Tileset => tilesetFor(previewArea ?? areaName(net.area));

function drawBackground(ts: Tileset): void {
  const { w, h } = game.view;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, ts.sky[0]); g.addColorStop(0.55, ts.sky[1]); g.addColorStop(1, ts.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // the area's parallax layers and drifting particles (towns use the area below them)
  drawBackdrop(ctx, ts.name, game.cam.x, game.cam.y, w, h, performance.now() / 1000);
}

const TS = 16;
/** Every block tile on the floor as (x, y, neighbours): the ground slab is
 *  split into its tiles so it gets the same variants and decorations. */
function eachTile(f: (x: number, y: number, nb: number) => void): void {
  for (const p of game.floor.platforms) {
    if (p.slope) continue;
    if (!p.ground) { f(p.x, p.y, p.nb ?? 0); continue; }
    for (let y = p.y; y < p.y + p.h; y += TS) for (let x = p.x; x < p.x + p.w; x += TS) {
      f(x, y, y === p.y ? NB.E | NB.W | NB.S | NB.SE | NB.SW : 255);
    }
  }
}

function drawPlatforms(ts: Tileset): void {
  eachTile((x, y, nb) => ctx.drawImage(TB.block(ts, nb, variantAt(x / TS, y / TS)).c, x, y));
  for (const p of game.floor.platforms) {
    if (p.slope) ctx.drawImage(TB.slope(ts, p.dir ?? 1, p.part ?? 0).c, p.x, p.y);
    else if (p.foot) ctx.drawImage(TB.slopeFoot(ts, p.foot).c, p.x, p.y);
  }
}

/** What grows on exposed tops and hangs under exposed bottoms (drawn over
 *  ropes and ladders, so they look tied on). */
function drawDecorations(ts: Tileset): void {
  eachTile((x, y, nb) => {
    const tx = x / TS, ty = y / TS;
    if (!(nb & NB.N)) {
      const s = TB.topDeco(ts, variantAt(tx, ty, 1), !(nb & NB.W), !(nb & NB.E));
      if (s) ctx.drawImage(s.c, x - 2, y - TOP_Y);
    }
    if (!(nb & NB.S)) {
      const s = TB.bottomDeco(ts, variantAt(tx, ty, 2));
      if (s) ctx.drawImage(s.c, x, y + TS);
    }
  });
}

/** Props baked per area: one canvas per prop (see props.ts). */
const propCanvases = new Map<string, HTMLCanvasElement[]>();
function bakedProps(area: string): HTMLCanvasElement[] {
  let cs = propCanvases.get(area);
  if (!cs) {
    cs = propsFor(area).map((paint) => {
      const c = document.createElement('canvas');
      c.width = PROP_W; c.height = PROP_H;
      const g = c.getContext('2d')!;
      paint((x, y, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); });
      return c;
    });
    propCanvases.set(area, cs);
  }
  return cs;
}

/** Props on exposed tops with ground either side, kept clear of portals,
 *  people, ropes and ladders (they never collide; they just shouldn't hide those). */
function drawProps(ts: Tileset): void {
  const cs = bakedProps(ts.name);
  const f = game.floor;
  const clear = (x: number, y: number): boolean =>
    !f.portals.some((p) => Math.abs(p.x - x) < 30 && Math.abs(p.y - y) < 8)
    && !(f.npcs ?? []).some((n) => Math.abs(n.x - x) < 24 && Math.abs(n.y - y) < 8)
    && ![...f.ropes, ...f.ladders].some((c) => Math.abs(c.x - x) < 18 && y >= c.y1 - 8 && y <= c.y2 + 8);
  eachTile((x, y, nb) => {
    if (nb & NB.N || !(nb & NB.W) || !(nb & NB.E)) return;
    const i = propAt(ts.name, x / TS, y / TS);
    if (i === null || !clear(x + TS / 2, y)) return;
    ctx.drawImage(cs[i], x + TS / 2 - PROP_W / 2, y - PROP_H);
  });
}

/** Tile a 16x16 sprite vertically between y1 and y2 at an integer x. */
function tileVertical(s: Sprite, x: number, y1: number, y2: number): void {
  for (let y = y1; y < y2; y += 16) {
    const h = Math.min(16, y2 - y);
    ctx.drawImage(s.c, 0, 0, 16, h, x, y, 16, h);
  }
}

function drawRope(ts: Tileset, r: Climbable): void {
  tileVertical(TB.rope(ts), Math.round(r.x) - 8, Math.round(r.y1), Math.round(r.y2));
}

function drawLadder(ts: Tileset, l: Climbable): void {
  tileVertical(TB.ladder(ts), Math.round(l.x) - 8, Math.round(l.y1), Math.round(l.y2));
}

function drawPortal(p: Portal): void {
  const s = SPR.portal;
  const bob = Math.sin(performance.now() / 300) * 2;
  const down = p.to < game.floor.number;
  // a way down glows a different colour; a sealed one (boss still up) is dark
  if (down) ctx.filter = 'hue-rotate(150deg)';
  if (!portalOpen(p.to)) ctx.filter = 'grayscale(1) brightness(0.55)';
  ctx.drawImage(s.c, Math.round(p.x - s.w / 2), Math.round(p.y - s.h + bob));
  ctx.filter = 'none';
  if (p.label) {
    // centred over the portal, but kept inside the world (town names are long)
    const half = textWidth(p.label) / 2 + 2;
    const lx = clamp(p.x, half, WORLD.w - half);
    text(ctx, p.label, Math.round(lx), Math.round(p.y - s.h - 9), 1, down ? '#8fe3c4' : '#e6d6ff', 'center');
  }
}

function drawMob(m: Mob): void {
  const a = SPR.mob[m.type.n];
  const s = a?.frames[mobFrame(m, a.frames.length, a.fps)];
  // a boss is its enemy grown huge; winding up an attack, it shakes and flashes
  const k = m.boss ? BOSS.SCALE : 1, wind = windingUp(m);
  const shake = wind ? (Math.floor(performance.now() / 50) % 2 ? 1 : -1) : 0;
  // Walkers animate through their frames; fliers also float. The HP bar and
  // stun star stay anchored to the mob's body position, so they never move with it.
  const bob = m.fly ? -Math.cos(m.anim * 1.6) * 3 : 0;
  ctx.save();
  if (m.hitFlash > 0) ctx.globalAlpha = 0.75;
  if (wind && Math.floor(performance.now() / 100) % 2) ctx.filter = 'brightness(1.8) saturate(0.6)';
  if (s) {
    // sprites face right: mirror them when the enemy heads left
    ctx.translate(Math.round(m.x) + shake, Math.round(m.y + bob));
    ctx.scale(m.dir < 0 ? -k : k, k);
    ctx.drawImage(s.c, -Math.round(s.w / 2), 0);
  }
  ctx.restore();
  if (wind) {
    const ex = Math.round(m.x), ey = Math.round(m.y) - 18;
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) text(ctx, '!', ex + ox, ey + oy, 2, '#000', 'center');
    text(ctx, '!', ex, ey, 2, '#ff6b6b', 'center');
  }

  // HP bar under the enemy, for BAR_SHOW s after each hit: a 2px fill in a 1px black frame, corners cut.
  if (m.barT > 0 && !m.boss) {
    const bw = Math.max(12, Math.round(m.w * 0.8)), pct = clamp(m.hp / m.hpMax, 0, 1);
    const bx = Math.round(m.x - bw / 2), by = Math.round(m.y + m.h) + 2;
    const fill = pct > 0 ? Math.max(1, Math.round((bw - 2) * pct)) : 0;
    ctx.fillStyle = '#000';
    ctx.fillRect(bx + 1, by, bw - 2, 4); ctx.fillRect(bx, by + 1, bw, 2);
    ctx.fillStyle = '#3a1a1a'; ctx.fillRect(bx + 1, by + 1, bw - 2, 2);
    ctx.fillStyle = pct > 0.5 ? '#6ee86e' : pct > 0.25 ? '#ffd166' : '#ff6b6b';
    ctx.fillRect(bx + 1, by + 1, fill, 2);
  }
  if (m.stun > 0) {
    // a small pixel star over the enemy's head
    const sx = Math.round(m.x), sy = Math.round(m.y) - 6;
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(sx - 2, sy, 5, 1); ctx.fillRect(sx, sy - 2, 1, 5); ctx.fillRect(sx - 1, sy - 1, 3, 3);
  }
}

/** A slam's shockwave: dust kicked up along the ground, spreading and fading. */
function drawQuake(q: { x: number; y: number; t: number }): void {
  const u = 1 - q.t / QUAKE_T, r = BOSS.QUAKE_R * (0.3 + 0.7 * u);
  ctx.fillStyle = `rgba(230, 210, 170, ${(1 - u) * 0.9})`;
  for (let i = -6; i <= 6; i++) {
    const x = q.x + (i / 6) * r, hgt = Math.round((1 - Math.abs(i) / 7) * 8 * (1 - u) + 2);
    ctx.fillRect(Math.round(x) - 2, Math.round(q.y) - hgt, 4, hgt);
  }
}

/** Draw an archer (the local player or a ghost) with feet at (x, feet), in a pose frame at cycle time t (s). */
function drawArcher(look: Look, x: number, feet: number, face: number, pose: Pose, t: number, alpha = 1, since?: number, tint?: string): void {
  // Climbing steps hand over hand with distance climbed, not time, so it
  // holds still while hanging on the rope.
  const frame = archerFrame(archerFrames(look), pose, pose === 'climb' ? climbPhase(feet) : t, since);
  const img = tint ? tinted(frame, tint) : frame;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(feet));
  if (pose !== 'climb') ctx.scale(face, 1); // climbing is seen from behind
  ctx.drawImage(img, -img.width / 2, -ARCHER_H);
  ctx.restore();
}

// scratch canvas for tinting a ghost's frame
const tintCv = document.createElement('canvas');
tintCv.width = ARCHER_W; tintCv.height = ARCHER_H;
const tintCtx = tintCv.getContext('2d') as CanvasRenderingContext2D;
/** The frame washed with a colour (only where the frame has pixels). */
function tinted(img: HTMLCanvasElement, col: string): HTMLCanvasElement {
  if (tintCv.width !== img.width) tintCv.width = img.width; // the prone frame is wider
  tintCtx.globalCompositeOperation = 'source-over';
  tintCtx.globalAlpha = 1;
  tintCtx.clearRect(0, 0, img.width, ARCHER_H);
  tintCtx.drawImage(img, 0, 0);
  tintCtx.globalCompositeOperation = 'source-atop';
  tintCtx.globalAlpha = 0.45;
  tintCtx.fillStyle = col;
  tintCtx.fillRect(0, 0, img.width, ARCHER_H);
  return tintCv;
}

/** Other players: in their own look, with a name tag in their colour, played back
 *  smoothly, their skill effects replayed from their poses. */
function drawGhosts(): void {
  const now = performance.now();
  game.fx.push(...dueShots(now));
  for (const [id, tr] of peers) {
    const g = view(tr, now);
    if (!g) continue;
    const col = tintFor(id);
    game.fx.push(...ghostFx(tr, g));
    // ghosts use the same 16x24 box; one on an older version (no look sent)
    // is washed in their colour instead
    const look = looks.get(id);
    drawArcher(look ?? DEFAULT_LOOK, g.x, g.y + 24, g.face, g.pose, now / 1000, 0.85, g.since, look ? undefined : col);
    const name = names.get(id);
    if (name) {
      const nx = Math.round(g.x), ny = Math.round(g.y) - 10;
      // 1px dark outline so the tag reads over any background
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) text(ctx, name, nx + dx, ny + dy, 1, '#0d1424', 'center');
      text(ctx, name, nx, ny, 1, col, 'center');
    }
    drawBubble(id, g.x, g.y - (name ? 12 : 2), now);
  }
}

/** A sender's speech bubble, its bottom (tail tip) at (x, bottom). */
function drawBubble(id: string, x: number, bottom: number, now: number): void {
  const lines = bubbleFor(id, now);
  if (!lines) return;
  const bw = Math.max(...lines.map((l) => textWidth(l))) + 6, bh = lines.length * 9 + 3;
  const bx = Math.round(x - bw / 2), by = Math.round(bottom - 3 - bh);
  ctx.fillStyle = '#0d1424'; ctx.fillRect(bx - 1, by, bw + 2, bh); ctx.fillRect(bx, by - 1, bw, bh + 2);
  ctx.fillStyle = '#f4f7fc'; ctx.fillRect(bx, by, bw, bh);
  // tail
  const tx = Math.round(x);
  ctx.fillRect(tx - 1, by + bh, 3, 1); ctx.fillRect(tx, by + bh + 1, 1, 1);
  lines.forEach((l, i) => text(ctx, l, tx, by + 2 + i * 9, 1, '#1a2438', 'center'));
}

function drawPlayer(): void {
  drawArcher(myLook(), player.x, player.y + player.h, player.face, localPose(), performance.now() / 1000,
    player.invuln > 0 ? 0.8 : 1, player.castTotal - player.castT);
  drawBubble(SELF, player.x, player.y + player.h - ARCHER_H - 2, performance.now()); // over the sprite's head
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
  // clamped both ways: an effect living longer than its animation holds the first frame
  const f = Math.max(0, Math.min(A.frames.length - 1, Math.floor(k * A.frames.length)));
  const img = face < 0 ? A.flipped[f] : A.frames[f];
  const ox = (face < 0 ? img.width - A.ox : A.ox) * sx;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(img, Math.round(x - ox), Math.round(y - A.oy), Math.round(img.width * sx), img.height);
  ctx.restore();
}


function drawFx(f: Fx): void {
  drawAnim(f.type, f.x, f.y, 1 - f.t / FX_DUR[f.type], f.face ?? 1, f.sx ?? 1);
}

function drawDmg(d: DmgNum): void {
  if (d.delay && d.delay > 0) return;
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
  const ts = tileset();
  drawBackground(ts);
  ctx.save();
  ctx.translate(-Math.round(game.cam.x), -Math.round(game.cam.y));
  drawPlatforms(ts);
  drawProps(ts);
  for (const r of game.floor.ropes) drawRope(ts, r);
  for (const l of game.floor.ladders) drawLadder(ts, l);
  drawDecorations(ts);
  game.floor.portals.forEach(drawPortal);
  drawNpcs();
  game.mobs.forEach(drawMob);
  quakes.forEach(drawQuake);
  game.shots.forEach(drawShot);
  drawGhosts();
  drawPlayer();
  drawCoins(); // in front of the player, so you can see what you're standing on
  game.fx.forEach(drawFx);
  game.dmgNums.forEach(drawDmg);
  ctx.restore();
  drawHUD();
}
