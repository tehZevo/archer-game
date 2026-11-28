import { P, TILE, WORLD } from './config';
import { game, mobBounds, player } from './state';
import { STICK, surfaceBetween, surfaceYAt } from './physics';
import { killMob } from './combat';
import { ANIM_RATE } from './mobanim';
import { bossMove, hurtPlayer } from './boss';
import { INFLICT, maybeInflict, slowFactor, updateStatus } from './status';
import { clamp } from './util';
import type { Mob, Platform } from './types';

/** px either side of the player a chasing enemy stops turning toward them. */
export const CHASE_SLACK = 3;
/** Seconds a chasing enemy stops to turn round when you get past it. */
export const CHASE_TURN = 0.3;
/** Tiles past the player a chasing enemy runs to before turning back, so a
 *  chase sweeps past you and comes at you from the other side. */
export const CHASE_OVERSHOOT = 3 * TILE;

/** Every enemy, one fixed step: timers, AI, contact damage, then falling and
 *  staying on its own platform. */
export function updateMobs(dt: number): void {
  for (const m of [...game.mobs]) {
    updateStatus(m, dt, m);
    if (!game.mobs.includes(m)) continue; // poisoned or burned to death
    if (m.hitFlash > 0) m.hitFlash -= dt;
    if (m.barT > 0) m.barT -= dt;
    if (m.hurt) m.hurt = Math.max(0, m.hurt - dt);
    if (m.training) continue; // the training dummy just stands there
    if (m.dying !== undefined) {
      // dead, waiting on its attacker's last hits: frozen where it was struck
      // (one a rush is carrying stays alive, travelling with you, until the carry ends)
      if (player.rush.t > 0 && player.rush.carry.some((c) => c.m === m)) continue;
      m.dying -= dt; m.vx = 0; m.vy = 0;
      if (m.dying <= 0) killMob(m);
      continue;
    }
    m.anim += dt * ANIM_RATE;
    if (m.boss) { m.stun = 0; m.airTime = 0; } // bosses shrug off stuns and launches
    if (m.stun > 0) { m.stun -= dt; m.vx *= 0.8; }
    else if (m.airTime > 0) m.vx *= 0.9; // airborne: it stays up until it lands
    else if ((m.hurt ?? 0) > 0 && !m.boss) m.vx *= 0.7; // hitstun: flinch in place (bosses only flash)
    else { think(m, dt); contact(m, dt); }
    if (m.airTime > 0 || !m.fly) fall(m, dt);
    else m.y = clamp(m.y, 0, WORLD.h - m.h); // hover at a fixed height; the float is purely visual (see drawMob)
    m.x += m.vx * dt;
    // never off the edge of its own platform (knockback, pushes and chases
    // included); half a pixel in, so its middle never sits right on the edge
    const [lo, hi] = mobBounds(m);
    if (m.x < lo + 0.5 || m.x > hi - 0.5) { m.x = clamp(m.x, lo + 0.5, hi - 0.5); m.vx = 0; }
  }
}

/** A free enemy decides how to move: a boss its own way, else chase or patrol. */
function think(m: Mob, dt: number): void {
  const [lo, hi] = mobBounds(m);
  // mobs only chase the player after being attacked, and only while the
  // player is over their own platform: past its end they'd just stand
  // pressed against the edge, so they go back to patrolling
  const reachable = player.x >= lo - 8 && player.x <= hi + 8;
  const near = Math.abs(player.x - m.x) < 260 && Math.abs((m.y + m.h) - (player.y + player.h)) < 90;
  if (m.boss) bossMove(m, dt, lo, hi);
  else if (m.aggro && reachable && near) chase(m, dt, lo, hi);
  else patrol(m, dt, lo, hi);
}

/** Full speed at you, turning on the spot: no easing off as it closes in. It
 *  aims a few tiles past you, so it runs over you and turns round there,
 *  coming back from the other side instead of parking. */
function chase(m: Mob, dt: number, lo: number, hi: number): void {
  const toGoal = player.x + m.dir * CHASE_OVERSHOOT - m.x;
  // the sweep ends near the goal, once it is already past it (you moved),
  // or pinned at its platform's end (the goal lies beyond it)
  const pinned = (m.dir > 0 && m.x >= hi - 1) || (m.dir < 0 && m.x <= lo + 1);
  if (Math.abs(toGoal) > CHASE_SLACK && Math.sign(toGoal) === m.dir && !pinned) {
    m.turn = 0;
    m.vx = m.dir * m.spd * slowFactor(m);
    return;
  }
  // at the far end of the sweep: stop, then set off the other way
  m.turn = (m.turn ?? 0) + dt;
  m.vx = 0;
  if (m.turn < CHASE_TURN) return;
  // back toward you; pinned at an edge with you still beyond it, it sweeps
  // back the other way instead of pressing on the edge
  const toward = Math.sign(player.x - m.x) || m.dir;
  m.dir = pinned && toward === m.dir ? -m.dir : toward;
  m.turn = 0;
}

/** Walk back and forth around home, turning at the end of the patrol or at
 *  the platform's edge (which can come first: the map edge cuts some short). */
function patrol(m: Mob, dt: number, lo: number, hi: number): void {
  m.vx += (m.dir * m.spd * slowFactor(m) - m.vx) * Math.min(1, 12 * dt);
  if (Math.abs(m.x - m.home) > m.range || (m.dir > 0 && m.x >= hi - 0.5) || (m.dir < 0 && m.x <= lo + 0.5)) {
    m.dir = Math.sign(m.home - m.x) || -m.dir;
  }
}

/** Contact damage: only when the bodies actually overlap (x is centre, y is top). */
function contact(m: Mob, dt: number): void {
  const touching = Math.abs(player.x - m.x) < (m.w + player.w) / 2
    && player.y < m.y + m.h && m.y < player.y + player.h;
  if (touching && m.atkCd <= 0) {
    m.atkCd = 1.1;
    if (hurtPlayer(m.dmg, m.x, m.level)) maybeInflict(player, INFLICT.mob);
  }
  m.atkCd = Math.max(0, m.atkCd - dt);
}

/** Gravity and a swept landing that follows slopes up/down by STICK px. A
 *  mob only ever lands on its own platform (it passes through any other), so
 *  a launch can't knock it onto a different one. A boss is big enough to
 *  stride across the whole floor, so it lands on whatever is under it
 *  (except, slamming down at you, anything above where you stand). */
function fall(m: Mob, dt: number): void {
  const old = m.vy;
  const prevFeet = m.y + m.h;
  m.vy = Math.min(m.vy + P.GRAVITY * dt, P.TERMINAL);
  m.y += (old + m.vy) * 0.5 * dt;
  const drop = m.boss?.dropTo;
  const home = (p: Platform): boolean => m.boss
    ? drop === undefined || surfaceYAt(p, m.x) >= drop - 4
    : p.block === m.spawn?.block;
  const s = m.vy < 0 ? null : surfaceBetween(m.x, m.w, prevFeet - STICK, m.y + m.h + STICK, null, home);
  if (s) { m.y = surfaceYAt(s, m.x) - m.h; m.vy = 0; m.airTime = 0; }
}
