import { drawFxFrame, drawLoop } from './drawfx';
import { EMOTE_ART, EMOTE_PAL, emoteFor, emotes } from './emotes';
import { ELITE, FX_DUR, P } from './config';
import { TOMB, TOMB_PAL } from './tombart';
import { deathPose, DEATH_T, ghostRise, getPlayerDeath, tombDrop, type Corpse } from './deaths';
import { bakeDeathSheet, deathFrame, loadedDeathSheet } from './deathsheet';
import { ctx } from './canvas';
import { game, player } from './state';
import { HITSTUN } from './combat';
import { BREATH, mobFrame } from './mobanim';
import { breath, lunge, mobAnim, recoil } from './sprites';
import { gridCanvas } from './grid';
import { localPose, roster } from './net';
import { DEFAULT_LOOK, myLook, type Look } from './look';
import { dueShots, ghostFx, tintFor } from './presence';
import { isLearned } from './progress';
import { view, type Pose } from './ghost';
import { ARCHER_H, ARCHER_W, archerFrame, archerFrames, poseCycle } from './archer';
import { clamp } from './util';
import { BOSS, windingUp } from './boss';
import { text, textWidth } from './font';
import { bubbleFor, SELF } from './chat';
import { STATUS } from './status';
import type { Mob } from './types';

/* Everyone in the world: enemies (and their corpses), the archer sprite,
   other players' ghosts, your own archer, and your death. */

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

/** Each enemy's death sheet as canvases: its baked strip, or (until that
 *  loads) one built from its painter, made on its first death. */
const deathSheets = new Map<string, { frames: HTMLCanvasElement[]; cx: number; cy: number; baked: boolean }>();
function deathSheetFor(c: Corpse): { frames: HTMLCanvasElement[]; cx: number; cy: number } | null {
  const d = deathSheets.get(c.name), baked = loadedDeathSheet(c.name);
  if (d && (d.baked || !baked)) return d;
  const sheet = baked ?? bakeDeathSheet(c.name, c.recipe);
  if (!sheet) return null;
  const made = { cx: sheet.cx, cy: sheet.cy, frames: sheet.frames.map(gridCanvas), baked: !!baked };
  deathSheets.set(c.name, made);
  return made;
}

export function drawCorpse(c: Corpse): void {
  const d = deathSheetFor(c);
  if (!d) return;
  const p = Math.min(1, c.age / DEATH_T);
  // the sheet dies on the spot; a flier killed in the air also falls to the ground
  const fall = deathPose(c, p).dy;
  const img = d.frames[deathFrame(c.age)], mid = c.feet - c.h / 2;
  ctx.save();
  ctx.translate(Math.round(c.x), Math.round(mid + fall));
  ctx.scale(c.dir * c.k, c.k); // sheets face right: mirrored for one heading left
  ctx.drawImage(img, -d.cx, -d.cy);
  ctx.restore();
}

/** A mob that just struck you (contact damage resets atkCd to 1.1) lunges for this long. */
const LUNGE_FROM = 0.85;

/** The training dummy: a straw target on a post, rocking when it's hit. */
function drawDummy(m: Mob): void {
  const x = Math.round(m.x), feet = Math.round(m.y + m.h);
  const rock = (m.hurt ?? 0) > 0 ? (Math.floor((m.hurt ?? 0) * 20) % 2 ? 1 : -1) : 0;
  const px = (c: string, dx: number, dy: number, w: number, h: number): void => { ctx.fillStyle = c; ctx.fillRect(x + dx, feet - dy, w, h); };
  px('#5a3a1e', -1, 14, 2, 14);             // the post
  px('#3b2412', -4, 2, 8, 2);               // its foot
  px('#2a1a0c', -6 + rock, 23, 12, 11);     // the body's outline
  px('#c9a36b', -5 + rock, 22, 10, 9);      // straw
  px('#e8d3a0', -5 + rock, 22, 10, 2);      // lit top
  px('#d94a3a', -2 + rock, 19, 4, 4);       // the target
  px('#fff1d6', -1 + rock, 18, 2, 2);
  px('#8a6a3a', -7 + rock, 17, 14, 2);      // the crossbar arms
  if (m.hitFlash > 0) { ctx.globalAlpha = 0.5; px('#ffffff', -5 + rock, 22, 10, 9); ctx.globalAlpha = 1; }
}

export function drawMob(m: Mob): void {
  if (m.training) { drawDummy(m); return; }
  const a = mobAnim(m.type.n);
  // in hitstun it holds its hurt pose (eyes shut, recoiling); a boss shows its enemy's, grown huge
  const f = a ? mobFrame(m, a.frames.length, a.fps) : 0;
  // in hitstun it flinches: the hurt pose and a recoil, in turn
  const s = a && ((m.hurt ?? 0) > 0 && !m.dead ? (Math.floor((m.hurt ?? 0) * 14) % 2 ? recoil(a) : a.hurt)
    : m.atkCd > LUNGE_FROM && !m.dead ? lunge(a) : f === BREATH ? breath(a) : a.frames[f]);
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
    // hitstun: knocked a couple of pixels away from the player, easing back
    // as the flinch wears off (the squashed look is the sprited hurt pose)
    const f = m.hurt ? m.hurt / HITSTUN : 0, away = Math.sign(m.x - player.x) || 1;
    ctx.translate(Math.round(m.x) + shake + Math.round(away * 2 * f), Math.round(m.y + bob));
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

/** Draw an archer (the local player or a ghost) with feet at (x, feet), in a pose frame at cycle time t (s).
 *  `breathe` (off for the other players) cycles the idle's second frame, the
 *  one that sinks the body a pixel: a ghost standing still should stand still. */
export function drawArcher(look: Look, x: number, feet: number, face: number, pose: Pose, t: number, alpha = 1, since?: number, tint?: string, breathe = true): void {
  // Climbing steps hand over hand with distance climbed, not time, so it
  // holds still while hanging on the rope.
  const frame = archerFrame(archerFrames(look), pose, poseCycle(pose, feet, t, breathe), since);
  const img = tint ? tinted(frame, tint) : frame;
  ctx.save();
  ctx.globalAlpha = alpha * (pose === 'vanish' ? vanishAlpha(since ?? 0) : 1);
  if (pose === 'spin') {
    // Cyclone Sweep: the archer becomes the whirl itself, the turn drawn
    // into the sheet's frames (a ghost's, with no cast clock, just loops)
    const k = since !== undefined ? Math.min(0.999, since / FX_DUR.spin) : (t * 2) % 1;
    drawFxFrame('cyclone', x, feet - ARCHER_H / 2, k, face);
    ctx.restore();
    return;
  }
  ctx.translate(Math.round(x), Math.round(feet));
  if (pose !== 'climb') ctx.scale(face, 1); // climbing is seen from behind
  // every frame is centred on the middle of the body (a 24px frame sits on
  // the feet; the dive's and prone's bigger frames sit on the middle)
  ctx.drawImage(img, -img.width / 2, -ARCHER_H / 2 - img.height / 2);
  ctx.restore();
}
/** Tempest: you blink out, stay gone while the sweep goes round, and
 *  flicker back as it ends (s since the cast). */
function vanishAlpha(s: number): number {
  if (s < 0.06) return 1 - s / 0.06;
  if (s < 0.26) return 0;
  if (s < 0.36) return Math.floor(s * 60) % 2 ? (s - 0.26) / 0.1 : 0.2;
  return 1;
}

/** Meteor Dive's colour: its afterimages wash yellow. */
const DIVE_TINT = '#ffe14d';

/** Afterimages trailing a Meteor Dive, back along the line of the dive. */
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
  // the prone and dive frames are bigger than standing ones
  if (tintCv.width !== img.width || tintCv.height !== img.height) { tintCv.width = img.width; tintCv.height = img.height; }
  tintCtx.globalCompositeOperation = 'source-over';
  tintCtx.globalAlpha = 1;
  tintCtx.clearRect(0, 0, img.width, img.height);
  tintCtx.drawImage(img, 0, 0);
  tintCtx.globalCompositeOperation = 'source-atop';
  tintCtx.globalAlpha = 0.45;
  tintCtx.fillStyle = col;
  tintCtx.fillRect(0, 0, img.width, img.height);
  return tintCv;
}

/** Other players: in their own look, with a name tag in their colour, played back
 *  smoothly, their skill effects replayed from their poses. */
export function drawGhosts(): void {
  const now = performance.now();
  game.fx.push(...dueShots(now));
  for (const [id, tr] of roster.tracks) {
    const g = view(tr, now);
    if (!g) continue;
    const col = tintFor(id);
    game.fx.push(...ghostFx(tr, g));
    // ghosts use the same 16x24 box; one on an older version (no look sent)
    // is washed in their colour instead
    const look = roster.looks.get(id);
    if (g.pose === 'dive') drawDiveTrail(look ?? DEFAULT_LOOK, g.x, g.y + 24, g.face, now / 1000, 0.85, look ? undefined : col);
    drawArcher(look ?? DEFAULT_LOOK, g.x, g.y + 24, g.face, g.pose, now / 1000, 0.85, g.since,
      look ? undefined : col, false);
    const name = roster.names.get(id);
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

/** The Twin Echoes shadow's colour: a cool blue ghost of the archer's own look. */
const ECHO_TINT = '#7fb8ff';

/** A missed attack's i-frames are invisible (see combat's MISS_IFRAMES). */
const invulnAlpha = (): number => (player.invuln > 0 && !player.invulnQuiet ? 0.8 : 1);

export function drawPlayer(): void {
  if (getPlayerDeath()) return; // down: the tombstone and ghost stand in for her (drawPlayerDeath)
  if (player.hang.t > 0) return; // Skyward Assault: she's gone into the strikes for the whole hover
  if (player.diving && !player.rolling) drawDiveTrail(myLook(), player.x, player.y + player.h, player.face, performance.now() / 1000, invulnAlpha(), DIVE_TINT);
  // Twin Echoes: the shadow archer is a permanent companion at your side,
  // mirroring your pose. It fires (adds its extra hits) when you attack, and
  // stands ready the rest of the time.
  if (isLearned('es')) {
    const t = performance.now() / 1000;
    const pose = player.cast ? 'shoot' : localPose();
    drawArcher(myLook(), player.x - player.face * 14, player.y + player.h, player.face, pose, t, 0.45,
      player.cast ? player.castTotal - player.castT : undefined, ECHO_TINT);
  }
  // a ground rush's own aura streams behind her while she slides
  if (player.rush.t > 0 && player.rush.look) {
    drawLoop(player.rush.look, player.x, player.y + player.h, performance.now() / 1000, 16, Math.sign(player.vx) || player.face);
  }
  drawArcher(myLook(), player.x, player.y + player.h, player.face, localPose(), performance.now() / 1000,
    invulnAlpha(), player.castTotal - player.castT);
  // Bubble: the shield bubble surrounds her for as long as the passive is learned
  if (isLearned('bu')) drawLoop('bubble', player.x, player.y + player.h, performance.now() / 1000, 6);
  drawBubble(SELF, player.x, player.y + player.h - ARCHER_H - 2, performance.now()); // over the sprite's head
  drawEmote(SELF, player.x, player.y + player.h - ARCHER_H, player.face, performance.now());
}

/** A killed archer's own death: a tombstone drops out of the sky onto the
 *  spot she fell on, and her ghost rises out of it and fades (see deaths.ts).
 *  Drawn over the world, under the HUD. */
export function drawPlayerDeath(): void {
  const d = getPlayerDeath();
  if (!d) return;
  const drop = tombDrop(d), rise = ghostRise(d);

  // the stone, dropped from above the screen: pixel art on whole pixels
  const y = Math.round(d.y - (1 - drop) * 90), x0 = Math.round(d.x) - (TOMB[0].length >> 1);
  ctx.save();
  ctx.globalAlpha = Math.min(1, drop * 2);
  TOMB.forEach((row, j) => [...row].forEach((ch, i) => {
    const col = TOMB_PAL[ch];
    if (col) { ctx.fillStyle = col; ctx.fillRect(x0 + i, y - TOMB.length + j, 1, 1); }
  }));
  ctx.restore();

  // the ghost: her own sprite, rising off the stone and fading out
  if (rise > 0) {
    const alpha = 1 - rise;
    drawArcher(myLook(), d.x, d.y - 6 - rise * 34, game.player.face, 'idle', performance.now() / 1000, alpha * 0.85, undefined, '#cfe4ff');
  }
}
