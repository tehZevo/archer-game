import { EMOTE_ART, EMOTE_PAL, emoteFor, emotes } from './emotes';
import { FX } from './fxsprites';
import { ELITE, FX_DUR, P, WORLD } from './config';
import { corpses, deathPose, DEATH_T, ghostRise, getPlayerDeath, tombDrop, type Corpse } from './deaths';
import { bakeDeathSheet, deathFrame } from './deathsheet';
import { ctx } from './canvas';
import { game, player } from './state';
import { HITSTUN } from './combat';
import { mobFrame } from './mobanim';
import { SPR } from './sprites';
import { tilesetFor, type Tileset } from './tileset';
import { areaOf } from './world';
import { drawBackdrop } from './backdropdraw';
import { floorLayer } from './floorlayer';
import { localPose, looks, names, peers } from './net';
import { DEFAULT_LOOK, myLook, type Look } from './look';
import { dueShots, ghostFx, tintFor } from './presence';
import { isLearned } from './progress';
import { view, type Pose } from './ghost';
import { ARCHER_H, ARCHER_W, archerFrame, archerFrames, climbPhase } from './archer';
import { clamp } from './util';
import { BOSS, portalOpen, quakes, QUAKE_T, windingUp } from './boss';
import { drawHUD } from './hud';
import { drawCoins, drawGearDrops, drawNpcs, drawPet } from './economydraw';
import { labelShadow, outlinedText, text, textWidth } from './font';
import { bubbleFor, SELF } from './chat';
import { settings } from './settings';
import { STATUS } from './status';
import type { DmgNum, Fx, Mob, Portal, Shot } from './types';

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
const tileset = (): Tileset => tilesetFor(previewArea ?? areaOf(game.floor.place));

function drawBackground(ts: Tileset): void {
  const { w, h } = game.view;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, ts.sky[0]); g.addColorStop(0.55, ts.sky[1]); g.addColorStop(1, ts.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // the area's parallax layers and drifting particles (towns use the area below them)
  drawBackdrop(ctx, ts.name, game.cam.x, game.cam.y, w, h, performance.now() / 1000);
}


/** The portal sprite recoloured by a canvas filter, baked once per filter
 *  (a live ctx.filter is slow, often a CPU fallback). */
const portalTints = new Map<string, HTMLCanvasElement>();
function portalSprite(filter: string): HTMLCanvasElement {
  const s = SPR.portal;
  if (filter === 'none') return s.c;
  let c = portalTints.get(filter);
  if (!c) {
    c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
    const g = c.getContext('2d')!;
    g.filter = filter;
    g.drawImage(s.c, 0, 0);
    portalTints.set(filter, c);
  }
  return c;
}

function drawPortal(p: Portal): void {
  const s = SPR.portal;
  const bob = Math.sin(performance.now() / 300) * 2;
  const down = !!p.down;
  // a way down glows a different colour; a sealed one (boss still up) is dark
  const filter = !portalOpen(p) ? 'grayscale(1) brightness(0.55)' : down ? 'hue-rotate(150deg)' : 'none';
  ctx.drawImage(portalSprite(filter), Math.round(p.x - s.w / 2), Math.round(p.y - s.h + bob));
  if (p.label) {
    // centred over the portal, but kept inside the world (town names are long)
    const half = textWidth(p.label) / 2 + 2;
    const lx = clamp(p.x, half, WORLD.w - half);
    // a way up from town also says the level it's meant for (under the name),
    // coloured by how you measure up
    const ly = Math.round(p.y - s.h - (p.lvl ? 18 : 9));
    labelShadow(ctx);
    text(ctx, p.label, Math.round(lx), ly, 1, down ? '#8fe3c4' : '#e6d6ff', 'center');
    if (p.lvl) text(ctx, `LV.${p.lvl}+`, Math.round(lx), ly + 9, 1, levelCol(p.lvl), 'center');
    labelShadow(ctx, false);
  }
}

/** Green when you're at least the level, gold within 5 under it, red further under. */
export const levelCol = (lvl: number): string =>
  player.level >= lvl ? '#9be89b' : player.level >= lvl - 5 ? '#ffd166' : '#ff8a8a';

/** A sprite's silhouette in gold (cached per frame): an elite's outline. */
const glow = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
function goldSilhouette(c: HTMLCanvasElement): HTMLCanvasElement {
  let g = glow.get(c);
  if (!g) {
    g = document.createElement('canvas'); g.width = c.width; g.height = c.height;
    const x = g.getContext('2d')!;
    x.drawImage(c, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#ffd166'; x.fillRect(0, 0, g.width, g.height);
    glow.set(c, g);
  }
  return g;
}

/* ---------------- enemy deaths (see deaths.ts) ---------------- */

/** Each enemy's baked death sheet (deathsheet.ts), as canvases, built on its first death. */
const deathSheets = new Map<string, { frames: HTMLCanvasElement[]; cx: number; cy: number }>();
function deathSheetFor(c: Corpse): { frames: HTMLCanvasElement[]; cx: number; cy: number } | null {
  let d = deathSheets.get(c.name);
  if (!d) {
    const s = SPR.mob[c.name]?.hurt;
    if (!s) return null;
    const src = s.x.getImageData(0, 0, s.w, s.h);
    const sheet = bakeDeathSheet(c.name, c.recipe, { w: s.w, h: s.h, px: src.data });
    d = {
      cx: sheet.cx, cy: sheet.cy,
      frames: sheet.frames.map((g) => {
        const cv = document.createElement('canvas'); cv.width = g.w; cv.height = g.h;
        const x = cv.getContext('2d')!, id = x.createImageData(g.w, g.h);
        id.data.set(g.px); x.putImageData(id, 0, 0);
        return cv;
      }),
    };
    deathSheets.set(c.name, d);
  }
  return d;
}

function drawCorpse(c: Corpse): void {
  const d = deathSheetFor(c);
  if (!d) return;
  const p = Math.min(1, c.age / DEATH_T);
  // the sheet dies on the spot; a flier killed in the air also falls to the ground
  const fall = deathPose(c, p).dy - deathPose({ ...c, drop: 0 }, p).dy;
  const img = d.frames[deathFrame(c.age)], mid = c.feet - c.h / 2;
  ctx.save();
  ctx.translate(Math.round(c.x), Math.round(mid + fall));
  ctx.scale(c.dir * c.k, c.k); // sheets face right: mirrored for one heading left
  ctx.drawImage(img, -d.cx, -d.cy);
  ctx.restore();
}

function drawMob(m: Mob): void {
  const a = SPR.mob[m.type.n];
  // in hitstun it holds its hurt pose (eyes shut, recoiling); a boss shows its enemy's, grown huge
  const s = a && ((m.hurt ?? 0) > 0 && !m.dead ? a.hurt : a.frames[mobFrame(m, a.frames.length, a.fps)]);
  // a boss is its enemy grown huge; winding up an attack, it shakes and flashes
  const k = m.boss ? BOSS.SCALE : m.elite ? ELITE.SCALE : 1, wind = windingUp(m);
  const shake = wind ? (Math.floor(performance.now() / 50) % 2 ? 1 : -1) : 0;
  // Walkers animate through their frames; fliers also float. The HP bar and
  // stun star stay anchored to the mob's body position, so they never move with it.
  const bob = m.fly ? -Math.cos(m.anim * 1.6) * 3 : 0;
  ctx.save();
  if (m.hitFlash > 0) ctx.globalAlpha = 0.75;
  if (wind && Math.floor(performance.now() / 100) % 2) ctx.filter = 'brightness(1.8) saturate(0.6)';

  if (s) {
    // sprites face right: mirror them when the enemy heads left
    // hitstun: knocked a couple of pixels away from the player and squashed
    // down onto its feet, easing back as the flinch wears off
    const f = m.hurt ? m.hurt / HITSTUN : 0, away = Math.sign(m.x - player.x) || 1;
    ctx.translate(Math.round(m.x) + shake + Math.round(away * 2 * f), Math.round(m.y + bob));
    if (f) { const sq = 0.14 * f; ctx.translate(0, s.h * k * sq); ctx.scale(1 + sq, 1 - sq); }
    ctx.scale(m.dir < 0 ? -k : k, k);
    if (m.elite) {
      // a 1px (screen) gold outline: the silhouette nudged each way, under the sprite
      const g = goldSilhouette(s.c), o = 1 / k;
      for (const [ox, oy] of [[o, 0], [-o, 0], [0, o], [0, -o]]) ctx.drawImage(g, -Math.round(s.w / 2) + ox, oy);
    }
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
  // status effects: a coloured pip per effect (one per stack) over its head
  if (m.effects?.length) {
    let px = Math.round(m.x) - 1 - (m.effects.reduce((n, e) => n + e.stacks, 0) - 1) * 2;
    const py = Math.round(m.y) - (m.stun > 0 ? 11 : 5);
    for (const e of m.effects) for (let i = 0; i < e.stacks; i++) {
      ctx.fillStyle = '#000'; ctx.fillRect(px - 1, py - 1, 4, 4);
      ctx.fillStyle = STATUS[e.kind].col; ctx.fillRect(px, py, 2, 2);
      px += 4;
    }
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
  ctx.globalAlpha = alpha * (pose === 'vanish' ? vanishAlpha(since ?? 0) : 1);
  ctx.translate(Math.round(x), Math.round(feet));
  if (pose !== 'climb') ctx.scale(face, 1); // climbing is seen from behind
  if (pose === 'spin' || pose === 'dive') {
    // turned about the middle of the body: a whole turn through the spin,
    // or pitched head-first down the dive
    const turn = pose === 'dive' ? DIVE_PITCH : Math.min(1, (since ?? 0) / SPIN_TURN_T) * Math.PI * 2;
    ctx.translate(0, -ARCHER_H / 2); ctx.rotate(turn); ctx.translate(0, ARCHER_H / 2);
  }
  ctx.drawImage(img, -img.width / 2, -ARCHER_H);
  ctx.restore();
}

/** The Midair Spin's whole turn takes this long, s (its cast time). */
const SPIN_TURN_T = P.SPIN_ANIM;
/** How far the Air Dive pitches you head-down, radians. */
const DIVE_PITCH = 0.8;
/** Tempest: you blink out, stay gone while the sweep goes round, and
 *  flicker back as it ends (s since the cast). */
function vanishAlpha(s: number): number {
  if (s < 0.06) return 1 - s / 0.06;
  if (s < 0.26) return 0;
  if (s < 0.36) return Math.floor(s * 60) % 2 ? (s - 0.26) / 0.1 : 0.2;
  return 1;
}

/** Air Dive's colour: its afterimages wash yellow. */
const DIVE_TINT = '#ffe14d';

/** Afterimages trailing an Air Dive, back along the line of the dive. */
function drawDiveTrail(look: Look, x: number, feet: number, face: number, t: number, alpha: number, tint?: string): void {
  const len = Math.hypot(P.DIVE_VX, P.DIVE_VY), ux = (face * P.DIVE_VX) / len, uy = P.DIVE_VY / len;
  for (const [d, a] of [[14, 0.3], [7, 0.5]] as const) drawArcher(look, x - ux * d, feet - uy * d, face, 'dive', t, alpha * a, undefined, tint);
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
    if (g.pose === 'dive') drawDiveTrail(look ?? DEFAULT_LOOK, g.x, g.y + 24, g.face, now / 1000, 0.85, look ? undefined : col);
    drawArcher(look ?? DEFAULT_LOOK, g.x, g.y + 24, g.face, g.pose, now / 1000, 0.85, g.since, look ? undefined : col);
    const name = names.get(id);
    if (name) {
      const nx = Math.round(g.x), ny = Math.round(g.y) - 10;
      // 1px dark outline so the tag reads over any background
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) text(ctx, name, nx + dx, ny + dy, 1, '#0d1424', 'center');
      text(ctx, name, nx, ny, 1, col, 'center');
    }
    drawBubble(id, g.x, g.y - (name ? 12 : 2), now);
    drawEmote(id, g.x, g.y, g.face, now);
  }
}

/** A player's emote: a 9x9 face in a little bubble just above and in front
 *  of their head (`top` is the sprite's top). */
function drawEmote(id: string, x: number, top: number, face: number, now: number): void {
  const e = emoteFor(id, now);
  if (!e) return;
  const art = EMOTE_ART[e], age = now - (emotes.get(id)?.at ?? now);
  // pops in over the first 120ms
  const pop = age < 120 ? 1 : 0;
  const bx = Math.round(x + face * 9 - 6), by = Math.round(top - 10 + pop);
  ctx.fillStyle = '#0d1424'; ctx.fillRect(bx - 1, by, 13, 11); ctx.fillRect(bx, by - 1, 11, 13);
  ctx.fillStyle = '#f4f7fc'; ctx.fillRect(bx, by, 11, 11);
  art.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) {
    const c = row[rx];
    if (c !== '.') { ctx.fillStyle = EMOTE_PAL[c]; ctx.fillRect(bx + 1 + rx, by + 1 + ry, 1, 1); }
  } });
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

/** The Echo Shot shadow's colour: a cool blue ghost of the archer's own look. */
const ECHO_TINT = '#7fb8ff';

/** A missed attack's i-frames are invisible (see combat's MISS_IFRAMES). */
const invulnAlpha = (): number => (player.invuln > 0 && !player.invulnQuiet ? 0.8 : 1);

function drawPlayer(): void {
  if (player.diving) drawDiveTrail(myLook(), player.x, player.y + player.h, player.face, performance.now() / 1000, invulnAlpha(), DIVE_TINT);
  // Echo Shot: the shadow archer is a permanent companion at your side,
  // mirroring your pose. It fires (adds its extra hits) when you attack, and
  // stands ready the rest of the time.
  if (isLearned('ES')) {
    const t = performance.now() / 1000;
    const pose = player.cast ? 'shoot' : localPose();
    drawArcher(myLook(), player.x - player.face * 14, player.y + player.h, player.face, pose, t, 0.45,
      player.cast ? player.castTotal - player.castT : undefined, ECHO_TINT);
  }
  drawArcher(myLook(), player.x, player.y + player.h, player.face, localPose(), performance.now() / 1000,
    invulnAlpha(), player.castTotal - player.castT);
  drawBubble(SELF, player.x, player.y + player.h - ARCHER_H - 2, performance.now()); // over the sprite's head
  drawEmote(SELF, player.x, player.y + player.h - ARCHER_H, player.face, performance.now());
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

/** A killed archer's own death: a tombstone drops out of the sky onto the
 *  spot she fell on, and her ghost rises out of it and fades (see deaths.ts).
 *  Drawn over the world, under the HUD. */
function drawPlayerDeath(): void {
  const d = getPlayerDeath();
  if (!d) return;
  const drop = tombDrop(d), rise = ghostRise(d);

  // the stone: a rounded slab with a base, dropped from above the screen
  const W = 13, H = 18;
  const y = d.y - (1 - drop) * 90;
  ctx.save();
  ctx.globalAlpha = Math.min(1, drop * 2);
  ctx.fillStyle = '#8b93a6';
  ctx.beginPath();
  ctx.moveTo(d.x - W / 2, y);
  ctx.lineTo(d.x - W / 2, y - H + W / 2);
  ctx.arc(d.x, y - H + W / 2, W / 2, Math.PI, 0);
  ctx.lineTo(d.x + W / 2, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6f7789'; // base slab
  ctx.fillRect(d.x - W / 2 - 2, y - 3, W + 4, 3);
  ctx.fillStyle = '#5b6376'; // engraved lines
  ctx.fillRect(d.x - 3, y - H + 6, 6, 1);
  ctx.fillRect(d.x - 3, y - H + 9, 6, 1);
  ctx.restore();

  // the ghost: her own sprite, rising off the stone and fading out
  if (rise > 0) {
    const alpha = 1 - rise;
    drawArcher(myLook(), d.x, d.y - 6 - rise * 34, game.player.face, 'idle', performance.now() / 1000, alpha * 0.85, undefined, '#cfe4ff');
  }
}

export function render(): void {
  const { w, h } = game.view;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  const ts = tileset();
  drawBackground(ts);
  ctx.save();
  ctx.translate(-Math.round(game.cam.x), -Math.round(game.cam.y));
  ctx.drawImage(floorLayer(ts), 0, 0); // everything static, baked once per floor
  game.floor.portals.forEach(drawPortal);
  drawNpcs();
  corpses.forEach(drawCorpse);
  game.mobs.forEach(drawMob);
  quakes.forEach(drawQuake);
  game.shots.forEach(drawShot);
  drawGhosts();
  drawPlayer();
  drawPet();
  drawCoins(); // in front of the player, so you can see what you're standing on
  drawGearDrops(); // the same: you want to see what you're about to pick up
  game.fx.forEach(drawFx);
  if (settings.dmgNums) game.dmgNums.forEach(drawDmg);
  drawPlayerDeath(); // the tombstone and ghost sit above the action
  ctx.restore();
  drawHUD();
}
