import { FX_DUR, P } from './config';
import { game, later, player } from './state';
import { held } from './input';
import { damage, hitbox, NUM_GAP, spawnArrow } from './combat';
import { surfaceAt } from './physics';
import { sfx } from './audio';
import { netShot } from './net';
import { shotCount } from './progress';
import { endHover, openLink } from './links';
import { clearRushStrike, groundRush, startSlide } from './rush';
import { linkWindow, useTime } from './castrules';
import { alive, eachShot, fxUnder, nearest, pose, tracers } from './skillfx';
import type { SkillKey, SkillRank } from './types';

/**
 * What each skill does once cast() has let it through (and paid for it).
 * Every skill resolves on an instant hitbox; multi-hit skills re-evaluate the
 * box on each tick, exactly like classic MMOs' attack frames. Damage, MP cost,
 * hit count and target count all scale with the skill's SP rank (`r`).
 */
type Cast = (r: SkillRank) => void;

/** Twin Shot: draw the bow (a short windup), release a volley that whips
 *  out to the closest enemies (no projectile), then follow through. */
function twinShot(r: SkillRank): void {
  pose('shoot', P.Z_CAST);
  const face = player.face;
  const tg = nearest(player.x + face * 64, player.y + player.h / 2, 128, 56, r.targets);
  later(P.Z_WINDUP, () => {
    sfx.shoot();
    const mx = player.x + face * 8, my = player.y + 13;
    game.fx.push({ type: 'muzzle', x: mx, y: my, t: 0.18, face });
    // other players see the shot reach the first target (or whiff across the range)
    const near = alive(tg)[0];
    const shots = shotCount(r);
    netShot(mx, my, face, near ? Math.abs(near.x - mx) : 96, shots);
    // every arrow fires a tracer, so a miss shows as many arrows as a hit
    const hit = (more: boolean): void => {
      const live = alive(tg);
      tracers(live, mx, my, face);
      live.forEach((m) => damage(m, r.dmg, { more }));
    };
    // the first arrow lands on release; the rest follow at the number stack's
    // cadence, so the shadow's shot lands above the base hit's, not on top of it
    hit(shots > 1);
    eachShot(shots - 1, NUM_GAP, (more) => hit(more));
  });
}

/** Jump. Down + Jump drops through the platform underfoot (not the ground
 *  slab): a small hop, then fall; that whole block is ignored until the
 *  player lands on something else. */
function jump(): void {
  pose('jump', 0.16);
  sfx.jump();
  const under = player.onGround && held('down') ? surfaceAt(player.x, player.y + player.h, player.w) : null;
  player.onGround = false;
  if (under && !under.ground && under.block !== undefined) {
    player.dropBlock = under.block;
    player.dropY = player.y + player.h;
    player.vy = -P.DROP_HOP_V;
    return;
  }
  player.vy = -P.JUMP_V;
  if (held('left'))  { player.vx = -P.JUMP_H; player.face = -1; }
  if (held('right')) { player.vx =  P.JUMP_H; player.face =  1; }
}

/** Glide: acrobatic forward tumble; usable repeatedly in the air. Off a Sky
 *  Assault hover it ends the hover, so the tumble carries you (the hover's
 *  own per-frame vx/vy reset would otherwise eat it). */
function glide(): void {
  endHover();
  pose('jump', useTime('D'));
  sfx.glide();
  const dir = player.face;          // launch in the direction you're facing
  player.vx = dir * P.GLIDE_VX;     // launches forward...
  player.vy += -90;                 // ...adds to your current vertical velocity,
  player.vy = Math.max(player.vy, -P.GLIDE_VY_MAX); // capped so it can't rocket you up
  // rings open ahead of her and the streaks trail behind (the art faces right, so mirror it)
  game.fx.push({ type: 'spirit', x: player.x + dir * 10, y: player.y + player.h / 2, t: 0.3, face: -dir });
}

/** Air Dive (Q's air form): plunge diagonally down, carrying the enemies
 *  under and in front of you, and roll into the ground rush on landing
 *  (see landDive). */
function airDive(r: SkillRank): void {
  endHover(); // the dive's own momentum takes over at once, no stuck dive pose
  sfx.jump();
  // The windup is the dive's coil: she hangs frozen for DIVE_WINDUP, the yellow
  // arrows leading the way, and the pose covers the coil as well as the plunge.
  pose('rush', P.DIVE_WINDUP + P.DIVE_TIME);
  player.vx = player.vy = 0;
  game.fx.push({ type: 'diveWindup', x: player.x, y: player.y + player.h / 2, t: FX_DUR.diveWindup, face: player.face });
  clearRushStrike(); // (a strike left over from an earlier rush must not land now)
  openLink('combo', linkWindow('AD'));
  openLink('glide', linkWindow('AD')); // and it links into a Glide
  // The plunge starts at the end of the coil, and lands on the enemies below.
  later(P.DIVE_WINDUP, () => {
    player.vx = player.face * P.DIVE_VX; // the diagonal plunge
    player.vy = P.DIVE_VY;
    startSlide(P.DIVE_TIME);
    player.diving = true;
    hitbox(player.x + player.face * 20, player.y + player.h / 2, 96, 140)
      .slice(0, r.targets).forEach((m) => damage(m, r.dmg, { fx: 'diveHit' }));
  });
}

/** Sky Toss (Q on the ground): the ground rush (see rush.ts). */
function skyToss(): void {
  groundRush(held('down'), false);
}

/** Electric Blitz: the charged rush. Its self-link window lets the next blitz
 *  (with a charge banked) fire at once, skipping this one's ending lag. */
function electricBlitz(): void {
  groundRush(held('down'), true);
  openLink('blitz', linkWindow('EB'));
}

/** Rising Arrow (retired): launch the enemies ahead and leap up with them,
 *  opening the link window for an airborne W. */
function launchLeap(kind: SkillKey, r: SkillRank, reach: number, w: number, back: boolean, vx: number, vy: number): void {
  pose('rush', 0.34);
  sfx.jump();
  const face = player.face;
  const cx = player.x + face * reach;
  const tg = hitbox(cx, player.y + player.h / 2, w, 64).slice(0, r.targets);
  fxUnder('rush', tg, cx, player.y + player.h, 0.4);
  tg.forEach((m) => damage(m, r.dmg, { launch: true }));
  player.onGround = false;
  const dir = back ? -face : face;
  player.vx = dir * vx;
  player.vy = -vy;
  game.fx.push({ type: 'swoosh', x: player.x, y: player.y + player.h, t: 0.2, face: dir });
  openLink('combo', linkWindow(kind));
}

/** Rising Arrow: jump up with the enemies it launches (the same launch speed,
 *  so you climb together). */
const risingArrow: Cast = (r) => launchLeap('RA', r, 30, 80, false, P.RISE_VX, P.RISE_VY);

/** Spike Lift (E's ground form): spikes erupt in a burst around you and throw
 *  you into the air. */
function spikeLift(r: SkillRank): void {
  pose('barrage', P.PLUNGE_POSE);
  sfx.jump();
  game.fx.push({ type: 'spikes', x: player.x, y: player.y + player.h, t: FX_DUR.spikes });
  hitbox(player.x, player.y + player.h / 2, P.SPIKE_R * 2, 64)
    .slice(0, r.targets).forEach((m) => damage(m, P.SPIKE_DMG, { fx: 'spikeHit' }));
  // The launch is a fixed lift off the floor, not a stack on top of a jump:
  // cast on the way up, you keep whatever the jump has already given you.
  const floor = game.floor.platforms[0].y - player.h;
  const gained = Math.max(0, floor - (player.y + player.h));
  player.vx = 0; // you plant in place and rise straight up, no run momentum carried
  player.vy = -Math.max(0, P.SPIKE_RISE_V - gained * 4);
  player.liftT = P.SPIKE_RISE_T * (1 - Math.min(1, gained / P.SPIKE_LIFT_H));
  player.onGround = false;
  // the launch opens the link window, so Air Dive (Q in the air) can start on the way up
  openLink('combo', linkWindow('E'));
}

/** Plunging Volley (E's air form): a small upward bump (no freeze: you keep
 *  your drift and fall right after) as arrows rain straight down into a
 *  column beneath you, hitting every enemy in it. */
function plungingVolley(r: SkillRank): void {
  endHover();
  pose('barrage', P.PLUNGE_POSE);
  sfx.shoot();
  const feet = player.y + player.h;
  const tg = hitbox(player.x, feet + P.PLUNGE_DEPTH / 2, P.PLUNGE_W, P.PLUNGE_DEPTH)
    .filter((m) => m.y + m.h > feet) // beneath you, not beside you
    .sort((a, b) => a.y - b.y)
    .slice(0, r.targets);
  player.vy -= P.PLUNGE_HOP; // stacks on the current momentum, not a fixed reset
  // one flare on her and a single tornado blast driving down below her (no
  // per-enemy rain: the blast is the hit effect)
  game.fx.push({ type: 'volleyFlare', x: player.x, y: player.y + player.h / 2, t: FX_DUR.volleyFlare });
  game.fx.push({ type: 'tornado', x: player.x, y: feet, t: FX_DUR.tornado });
  eachShot(shotCount(r), 0.08, (more) => {
    alive(tg).forEach((m) => damage(m, r.dmg, { noFx: true, more }));
  });
  // a hit opens the link window, so Midair Spin follows the rain at once
  if (tg.length) openLink('combo', linkWindow('PV'));
  openLink('glide', linkWindow('PV')); // and into a Glide
}

/** Tempest: you vanish as an oval of energy sweeps up and around you,
 *  striking every enemy in a wide radius (nearest first). */
function tempest(r: SkillRank): void {
  pose('shoot', useTime('R'));
  player.skillPose = 'vanish';
  player.invuln = player.castT; // you're untouchable while the storm sweeps out
  // the storm links straight into Dive (Q in the air); its own window, so it
  // doesn't also hand you the Sky Toss follow-ups
  openLink('tempest', linkWindow('R'));
  sfx.shoot();
  const mx = player.x + player.face * 8, my = player.y + 13;
  const tg = nearest(player.x, player.y + player.h / 2, P.TEMPEST_R * 2, P.TEMPEST_R * 2, r.targets);
  game.fx.push({ type: 'tempest', x: player.x, y: player.y + player.h, t: FX_DUR.tempest, follow: true });
  netShot(mx, my, player.face, P.TEMPEST_R);
  tg.forEach((m) => later(Math.abs(m.x - mx) / P.ARROW_V, () => {
    if (game.mobs.includes(m)) damage(m, r.dmg, { fx: 'tempestHit' });
  }));
}

/** Midair Spin (W's air form): a 360° sweep around you, cutting every enemy
 *  in reach several times. */
function midairSpin(r: SkillRank): void {
  pose('shoot', P.SPIN_ANIM);
  player.vx = player.vy = 0; // the sweep holds its spot: no drifting on the jump's momentum
  player.skillPose = 'spin';
  endHover(); // swept out of a Sky Assault hover: the spin takes over
  sfx.shoot();
  game.fx.push({ type: 'spin', x: player.x, y: player.y + player.h, t: FX_DUR.spin, follow: true });
  const tg = hitbox(player.x, player.y + player.h / 2, P.SPIN_R * 2, P.SPIN_R * 2).slice(0, r.targets);
  eachShot(shotCount(r), 0, (more) => {
    alive(tg).forEach((m) => damage(m, r.dmg, { fx: 'spinHit', more }));
  });
  // The sweep lands, and only then does it link out: a press inside this gap
  // is buffered and fires as the window opens, so the chain reads as
  // spin-then-hit rather than both at once. (SPIN_LINK_DELAY.)
  later(P.SPIN_LINK_DELAY, () => {
    openLink('glide', linkWindow('MS')); // the spin links into a Glide...
    openLink('volley', linkWindow('MS')); // ...and into a Plunging Volley
  });
}

/** Skyfall Volley (W's ground form): knock the enemies ahead into the air and
 *  shoot them before they land. Q's rush gathers them up first, and its link
 *  window is what makes this available. */
function skyfallVolley(r: SkillRank): void {
  pose('shoot', 0.30);
  sfx.shoot();
  const face = player.face;
  const tg = hitbox(player.x + face * 30, player.y + player.h / 2, 110, 80).slice(0, r.targets);
  // the volley rains onto each target, or onto the ground just ahead if there are none
  fxUnder('rain', tg, player.x + face * 40, player.y + player.h, 0.4);
  tg.forEach((m) => damage(m, r.dmg, { launch: true, fx: 'rainHit' }));
}

/** Sky Assault: knock the enemies ahead into the air and warp straight up
 *  with them (no horizontal movement), hovering to strike every airborne
 *  enemy in reach for a moment before dropping with normal gravity. The
 *  strikes run on the fixed step in update (see the hang block). */
function skyAssault(r: SkillRank): void {
  pose('barrage', P.BARRAGE_HANG);
  sfx.shoot();
  hitbox(player.x + player.face * 30, player.y + player.h / 2, 110, 80)
    .slice(0, r.targets).forEach((m) => damage(m, r.dmg, { launch: true, fx: 'skyHit' }));
  const from = player.y + player.h / 2;
  // always the same rise (scaling it with the launched enemies' height sent
  // you ~3x higher off the top of their arc)
  player.y = Math.max(0, player.y - P.BARRAGE_UP);
  player.vx = 0; player.vy = 0; player.onGround = false;
  game.fx.push({ type: 'skySwoosh', x: player.x, y: from, t: 0.2, face: player.face }); // where she left
  player.hang.t = P.BARRAGE_HANG; player.hang.hits = r.hits; player.hang.hitT = 0;
  player.hang.dmg = r.dmg; player.hang.targets = r.targets;
  // the leap links into Midair Spin: the window stays open through the
  // hover, so the sweep fires out of it with no extra lag
  openLink('spin', P.BARRAGE_HANG + P.ASSAULT_SPIN_LINK);
}

/** Shell Barrage: a stream of slower green bolts; each stuns on arrival. */
function shellBarrage(r: SkillRank): void {
  pose('shoot', 0.36);
  sfx.shoot();
  const tg = hitbox(player.x + player.face * 72, player.y + player.h / 2, 144, 72).slice(0, r.targets);
  const x0 = player.x + player.face * 8, y0 = player.y + 13;
  const shots = shotCount(r);
  for (let h = 0; h < shots; h++) {
    const t = tg[h % (tg.length || 1)];
    // fanned a few px apart so every bolt of the burst reads, even on a whiff
    const fan = (h % 2 ? 1 : -1) * Math.ceil(h / 2) * 3;
    const onHit = t ? (): void => {
      if (game.mobs.includes(t)) damage(t, r.dmg, { stun: true, fx: 'stunHit', more: h + tg.length < shots });
    } : undefined;
    // launched one after another from the bow
    spawnArrow(x0, y0 + fan, t ? t.x : x0 + player.face * 200, !!t, onHit,
      { speed: P.BOLT_V, sprite: 'bolt', dir: player.face, delay: h * NUM_GAP });
  }
}

export const CASTS: Partial<Record<SkillKey, Cast>> = {
  Z: twinShot, C: jump, D: glide,
  Q: skyToss, EB: electricBlitz, AD: airDive,
  W: skyfallVolley, AB: skyAssault, MS: midairSpin,
  E: spikeLift, PV: plungingVolley,
  R: tempest, S: shellBarrage,
  RA: risingArrow,
};
