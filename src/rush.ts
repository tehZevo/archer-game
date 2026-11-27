import { FX_DUR, P } from './config';
import type { FxKind, RushLook, SkillKey } from './types';
import { game, mobBounds, player } from './state';
import { damage, hitbox } from './combat';
import { surfaceBetween, surfaceYAt } from './physics';
import { sfx } from './audio';
import { rank, shotCount } from './progress';
import { alive, eachShot, fxUnder, pose, setPose } from './skillfx';

/** The pending Rush Toss strike, fired when the slide ends. */
let rushStrike: (() => void) | null = null;

/** Drop a strike left over from an earlier rush, so it can't land later. */
export function clearRushStrike(): void {
  rushStrike = null;
}

/** Start a slide (or the Meteor Dive's plunge) that scoops up enemies for `t` seconds. */
export function startSlide(t: number, goal = 0, look: RushLook | null = null): void {
  player.rush.t = t;
  player.rush.dist = 0;
  player.rush.goal = goal;
  player.rush.carry = [];
  player.rush.look = look;
  player.rush.scuff = 0;
}

/** px between the scuffs a ground rush leaves on the floor. */
const SCUFF_GAP = 12;
/** Leave a fading scuff where the slide has been (Rush Toss: dust and wind;
 *  Electric Blitz: scorch and sparks). */
function scuff(dx: number): void {
  const look = player.rush.look;
  if (!look || !player.onGround) return;
  player.rush.scuff = (player.rush.scuff ?? 0) + dx;
  if (player.rush.scuff < SCUFF_GAP) return;
  player.rush.scuff -= SCUFF_GAP;
  const type = look === 'blitzRush' ? 'blitzTrail' : 'tossTrail';
  game.fx.push({ type, x: player.x, y: player.y + player.h, t: FX_DUR[type], face: Math.sign(player.vx) || player.face });
}

/**
 * Rush Toss slide, on the fixed step (after the player moves): pick up the
 * enemies the slide runs into and push them along in front, and land the
 * strike when the slide ends (time up, slowed down, or left the ground).
 */
export function updateRush(dt: number): void {
  if (player.rush.t <= 0) return;
  player.rush.t -= dt;
  player.rush.dist += Math.abs(player.vx) * dt;
  scuff(Math.abs(player.vx) * dt);
  const face = Math.sign(player.vx) || player.face;
  grab(face);
  push(face);
  // the slide covers its fixed distance: contact with an enemy slows you, but
  // the slide keeps going until the distance (or the ground, or the clock) ends
  if (player.rush.dist >= player.rush.goal || player.rush.t <= 0 || Math.abs(player.vx) < 30 || !player.onGround) endRush();
}

/** Scoop up the enemies the slide runs into; the charge itself hits each once. */
function grab(face: number): void {
  const r = rank('ground-q');
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

/** End a Rush Toss slide now and land its strike. */
export function endRush(): void {
  player.rush.t = 0;
  rushStrike?.();
}

/**
 * The ground rush (Q on the ground): slide
 * forward, scooping up the enemies in the way and pushing them along; the
 * strike lands when the slide ends: out of time, slowed, or at a platform
 * edge (see updateRush). In place (Down + Q) it strikes at once. Electric
 * Blitz is the charged version: a faster, longer slide that spends a banked
 * charge (`blitz`).
 */
export function groundRush(inPlace: boolean, blitz: boolean): void {
  pose('rush', blitz ? 'eb' : 'ground-q');
  if (inPlace) armStrike(true, blitz ? 'eb' : 'ground-q')();
  else {
    slide(blitz ? P.BLITZ_SLIDE_V : P.RUSH_SLIDE_V, P.RUSH_MAX, blitz ? P.BLITZ_DIST : P.RUSH_DIST, blitz ? 'eb' : 'ground-q', 'rush', blitz ? 'blitzRush' : 'tossRush');
    if (blitz) player.blitz.charges--;
  }
}

/** Set up the strike that lands when the slide ends (see endRush), and return it. */
function armStrike(inPlace: boolean, key: SkillKey, fx: FxKind = 'rush'): () => void {
  if (fx === 'blitzRush') sfx.blitz(); else sfx.rushToss();
  const face = player.face;
  rushStrike = (): void => {
    rushStrike = null;
    strike(inPlace, face, fx, key);
  };
  return rushStrike;
}

/** Slide forward at `v` px/s, for at most `t` s or `dist` px, striking (with
 *  burst `fx`) at the end; `look` is the slide's own effect on the archer. */
function slide(v: number, t: number, dist: number, key: SkillKey, fx: FxKind = 'rush', look: RushLook | null = null): void {
  armStrike(false, key, fx);
  player.vx = player.face * v;
  startSlide(t, dist, look);
}

/** The rush's strike: the carried enemies, then the nearest ones ahead. `fx`
 *  is the burst under each target (the dive's landing has its own). `key` is
 *  the skill being cast (Rush Toss or its Electric Blitz upgrade). */
function strike(inPlace: boolean, face: number, fx: FxKind, key: SkillKey): void {
  const r = rank(key);
  const carried = player.rush.carry.map((c) => c.m);
  player.rush.carry = [];
  const cx = inPlace ? player.x : player.x + face * 24;
  const near = hitbox(cx, player.y + player.h / 2, 96, 64).filter((m) => !carried.includes(m));
  const tg = alive([...carried, ...near]).slice(0, r.targets);
  // a horn of light erupts under each target (or ahead, if none)
  fxUnder(fx, tg, cx, player.y + player.h, FX_DUR[fx]);
  // the rush carries and hits (a Blitz strikes twice), tossing the targets
  // skyward; a link fires off this strike, so chaining out of the rush cuts
  // the toss short (the next cast picks the enemy up where it lies)
  eachShot(shotCount(r), 0, (more, h) => {
    alive(tg).forEach((m) => {
      damage(m, r.dmg, { more, launch: true });
      if (!inPlace && h === 0) m.vx = face * 80; // a little follow-through drift
    });
  });
}

/** The Meteor Dive touched down: roll out of it with no pause, a slide of its
 *  own (DIVE_ROLL_*, tuned apart from Rush Toss's) that scoops up and strikes
 *  like the rush. Its links fire off the landing roll's strike, not off
 *  the coil. */
export function landDive(): void {
  if (!player.diving || !player.onGround) return;
  player.diving = false;
  player.rolling = false;
  setPose('dive', P.DIVE_ROLL_MAX); // the roll is the tail of the dive's own animation
  slide(P.DIVE_ROLL_V, P.DIVE_ROLL_MAX, P.DIVE_ROLL_DIST, 'ground-q', 'diveLand');
}
