import { P } from './config';
import { game, mobBounds, player } from './state';
import { damage, hitbox } from './combat';
import { surfaceBetween, surfaceYAt } from './physics';
import { sfx } from './audio';
import { rank, shotCount } from './progress';
import { openLink } from './links';
import { alive, eachShot, fxUnder, pose } from './skillfx';

/** The pending Sky Toss strike, fired when the slide ends. */
let rushStrike: (() => void) | null = null;

/** Drop a strike left over from an earlier rush, so it can't land later. */
export function clearRushStrike(): void {
  rushStrike = null;
}

/** Start a slide (or the Air Dive's plunge) that scoops up enemies for `t` seconds. */
export function startSlide(t: number, goal = 0): void {
  player.rush.t = t;
  player.rush.dist = 0;
  player.rush.goal = goal;
  player.rush.carry = [];
}

/**
 * Sky Toss slide, on the fixed step (after the player moves): pick up the
 * enemies the slide runs into and push them along in front, and land the
 * strike when the slide ends (time up, slowed down, or left the ground).
 */
export function updateRush(dt: number): void {
  if (player.rush.t <= 0) return;
  player.rush.t -= dt;
  player.rush.dist += Math.abs(player.vx) * dt;
  const face = Math.sign(player.vx) || player.face;
  grab(face);
  push(face);
  // the slide covers its fixed distance: contact with an enemy slows you, but
  // the slide keeps going until the distance (or the ground, or the clock) ends
  if (player.rush.dist >= player.rush.goal || player.rush.t <= 0 || Math.abs(player.vx) < 30 || !player.onGround) endRush();
}

/** Scoop up the enemies the slide runs into; the charge itself hits each once. */
function grab(face: number): void {
  const r = rank('Q');
  // the grab reaches a little behind you too, so an enemy you just passed is still scooped up
  const grabX = player.x + face * (P.RUSH_GRAB - P.RUSH_GRAB_BACK) / 2;
  for (const m of hitbox(grabX, player.y + player.h / 2, P.RUSH_GRAB + P.RUSH_GRAB_BACK, 40)) {
    if (player.rush.carry.length >= r.targets) break; // carry only as many as it hits
    if (player.rush.carry.some((c) => c.m === m)) continue;
    player.rush.carry.push({ m, off: Math.max(10, (m.x - player.x) * face) });
    damage(m, r.dmg * P.RUSH_HIT); // (this can kill it)
  }
}

/** Push the carried enemies along in front of the slide. */
function push(face: number): void {
  player.rush.carry = player.rush.carry.filter((c) => game.mobs.includes(c.m));
  for (const { m, off } of player.rush.carry) {
    const [lo, hi] = mobBounds(m);
    m.x = Math.max(lo, Math.min(hi, player.x + face * off)); m.vx = 0;
    // keep the pushed enemy standing on its own platform's surface at its new
    // x (a slope can rise or drop more than a frame's landing reach)
    const feet = m.y + m.h;
    const s = surfaceBetween(m.x, m.w, feet - 24, feet + 24, null, (p) => p.block === m.spawn?.block);
    if (s && m.airTime <= 0) { m.y = surfaceYAt(s, m.x) - m.h; m.vy = 0; }
  }
}

/** End a Sky Toss slide now and land its strike. */
export function endRush(): void {
  player.rush.t = 0;
  rushStrike?.();
}

/**
 * The ground rush (Q on the ground, and the Air Dive's landing): slide
 * forward, scooping up the enemies in the way and pushing them along; the
 * strike lands when the slide ends: out of time, slowed, or at a platform
 * edge (see updateRush). In place (Down + Q) it strikes at once. Electric
 * Blitz is the charged version: a faster, longer slide that spends a banked
 * charge (`blitz`). Opens the link window.
 */
export function groundRush(inPlace: boolean, blitz: boolean): void {
  pose('rush', 0.34);
  sfx.shoot();
  const face = player.face;
  rushStrike = (): void => {
    rushStrike = null;
    strike(inPlace, face);
  };
  if (inPlace) rushStrike();
  else {
    player.vx = face * (blitz ? P.BLITZ_SLIDE_V : P.RUSH_SLIDE_V);
    startSlide(P.RUSH_MAX, blitz ? P.BLITZ_DIST : P.RUSH_DIST);
    if (blitz) player.blitz.charges--;
  }
  openLink('combo', 1.1);
}

/** The rush's strike: the carried enemies, then the nearest ones ahead. */
function strike(inPlace: boolean, face: number): void {
  const r = rank('Q');
  const carried = player.rush.carry.map((c) => c.m);
  player.rush.carry = [];
  const cx = inPlace ? player.x : player.x + face * 24;
  const near = hitbox(cx, player.y + player.h / 2, 96, 64).filter((m) => !carried.includes(m));
  const tg = alive([...carried, ...near]).slice(0, r.targets);
  // a horn of light erupts under each target (or ahead, if none)
  fxUnder('rush', tg, cx, player.y + player.h, 0.4);
  // the rush carries and hits (a Blitz strikes twice); the launch is the W's job
  eachShot(shotCount(r), 0, (more, h) => {
    alive(tg).forEach((m) => {
      damage(m, r.dmg, { more });
      if (!inPlace && h === 0) m.vx = face * 80; // a little follow-through drift
    });
  });
}

/** The Air Dive touched down: roll straight into the real ground rush (its
 *  slide, strike and link window), with no pause. */
export function landDive(): void {
  if (!player.diving || !player.onGround) return;
  player.diving = false;
  groundRush(false, false);
}
