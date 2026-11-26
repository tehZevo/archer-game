import { FX_DUR, P, WORLD } from './config';
import { game, player } from './state';
import { held, pressed } from './input';
import { catchClimbable, collideGround, integrate, surfaceBetween } from './physics';
import { damage } from './combat';
import { passiveBonus } from './progress';
import { sfx } from './audio';
import { grip } from './floormods';
import { slowFactor } from './status';
import { clamp } from './util';
import { barrageTargets } from './skills';
import { landDive } from './rush';
import { openLink } from './links';

/** Countdown to Acrobatics's next rising-streak effect. */
let climbFxT = 0;

/** -1 / 1 while Left / Right is held (Left wins), else 0. */
export const heldDir = (): -1 | 0 | 1 => held('left') ? -1 : held('right') ? 1 : 0;

/**
 * The player's movement for one fixed step: on a rope or ladder, hovering in
 * a Skyward Assault, or walking / falling under physics. `locked` (a skill's use
 * time) blocks movement input.
 */
export function movePlayer(dt: number, locked: boolean): void {
  // A freezing cast (Tempest) pins you in place: no gravity, no drift.
  if (player.casting.freeze) {
    player.vx = 0; player.vy = 0;
    player.animState = 'jump';
    return;
  }
  // Jump only leaves a climbable with Left/Right held; otherwise it does nothing.
  const offDir = heldDir();
  if (player.climb && (!pressed('c') || locked || offDir === 0)) climb(dt, locked);
  else {
    if (player.climb) jumpOffClimb(offDir);
    if (player.hang.t > 0) hover(dt);
    else walk(dt, locked);
  }
  player.x = clamp(player.x, player.w / 2, WORLD.w - player.w / 2); // x is the centre
  player.anim += dt * (player.animState === 'walk' ? 9 : 4);
}

/** On a rope / ladder (v83 rules: see catchClimbable): Up/Down climbs, and
 *  with Acrobatics, Up + Jump rushes up and pops off the top. */
function climb(dt: number, locked: boolean): void {
  const r = player.climb!;
  if (!locked && pressed('c') && held('up') && player.ranks.AC > 0) { player.climbRush = true; sfx.jump(); }
  if (player.climbRush) {
    player.y -= P.CLIMB_RUSH * (1 + passiveBonus('AC')) * dt;
    // green streaks shoot up past her as she rushes
    climbFxT -= dt;
    if (climbFxT <= 0) { climbFxT = 0.1; game.fx.push({ type: 'climbRise', x: player.x, y: player.y + player.h, t: FX_DUR.climbRise }); }
  } else {
    climbFxT = 0;
    if (!locked && held('up')) player.y -= P.CLIMB * (1 + passiveBonus('AC')) * dt;
    else if (!locked && held('down')) player.y += P.CLIMB * dt;
  }
  const top = r.y1 - player.h, bot = r.y2 - player.h;
  player.y = clamp(player.y, top, bot);
  player.x = r.x;
  player.vx = 0; player.vy = 0;
  player.animState = 'climb';
  if (player.climbRush && player.y <= top + 0.5) {
    // reached the top mid-rush: jump up off it, then land on the platform
    player.climb = null;
    player.climbRush = false;
    player.onGround = false;
    player.vy = -P.JUMP_V * P.CLIMB_RUSH_POP;
  } else if (player.y <= top + 0.5 || player.y >= bot - 0.5) {
    player.climb = null;
    player.onGround = true;
  }
}

/** Jump off a climbable, in the held direction. */
function jumpOffClimb(dir: -1 | 1 | 0): void {
  player.climb = null;
  player.climbRush = false;
  player.onGround = false;
  player.vy = -P.JUMP_V * 0.45;
  player.vx = dir * P.JUMP_H;
  player.face = dir as 1 | -1;
  // holding Up would otherwise re-catch this rope the same frame
  player.leftClimbX = player.x;
}

/** Skyward Assault: hover in place, striking airborne enemies at intervals. */
function hover(dt: number): void {
  player.hang.t -= dt;
  // the hover ends here: landing opens the link window, so Tempest (R) fires
  // as a finisher on the Q -> W -> AB chain
  if (player.hang.t <= 0) openLink('assault', 1.1);
  player.vx = 0; player.vy = 0;
  player.hang.hitT -= dt;
  if (player.hang.hits > 0 && player.hang.hitT <= 0) {
    player.hang.hitT = P.BARRAGE_HANG / 7; // 6 strikes spread through the hover
    player.hang.hits--;
    const more = player.hang.hits > 0;
    game.fx.push({ type: 'skySwoosh', x: player.x + player.face * 10, y: player.y + player.h, t: 0.2, face: player.hang.hits % 2 ? -player.face : player.face });
    barrageTargets().slice(0, player.hang.targets).forEach((m) => damage(m, player.hang.dmg, { airborne: true, fx: 'skyHit', more }));
  }
  player.animState = 'jump';
}

/** Walking, jumping and falling: steer, apply the skills' pushes, integrate
 *  and collide, then catch a climbable or pick the animation. */
function walk(dt: number, locked: boolean): void {
  // holding Down on the ground lies you flat, but Left/Right wins: you
  // stand straight up and walk, and lie back down when you let go
  const walking = !locked && held('left') !== held('right');
  const prone = player.onGround && !locked && held('down') && !walking;
  steer(dt, locked);
  skillForces(dt);
  const prevFeet = player.y + player.h, prevX = player.x;
  integrate(player, dt);
  // clamp to the world before colliding, so the ground test uses the final x;
  // vertically too: chained aerial hops (Downpour's stacked momentum)
  // can't carry you off the top of the map
  player.x = clamp(player.x, player.w / 2, WORLD.w - player.w / 2);
  player.y = clamp(player.y, 0, WORLD.h - player.h);
  collideGround(player, prevFeet, prevX);
  landDive(); // a Meteor Dive touching down rolls into the rush this same frame
  // grab a rope/ladder first, so a rope hanging from the platform you're
  // standing on is caught before the drop-through consumes the Down press
  if (grabClimbable()) return;
  player.animState = !player.onGround ? 'jump'
    : prone ? 'prone' : Math.abs(player.vx) > 12 ? 'walk' : 'idle';
}

/** Horizontal control: accelerate toward the walk speed on the ground (ice
 *  slows the pickup and the stop); in the air, keep momentum and only brake. */
function steer(dt: number, locked: boolean): void {
  const slow = (player.cast === 'rush' ? 0.55 : 1) * slowFactor(player); // chill slows you
  let target = 0;
  if (!locked && held('left'))  { target = -P.WALK * slow; player.face = -1; }
  if (!locked && held('right')) { target =  P.WALK * slow; player.face =  1; }
  if (!player.onGround) {
    // holding against your motion brakes toward a standstill but never turns you around
    if (target !== 0 && Math.sign(target) === -Math.sign(player.vx)) {
      const b = P.AIR_BRAKE * dt;
      player.vx = player.vx > 0 ? Math.max(0, player.vx - b) : Math.min(0, player.vx + b);
    } else {
      player.vx *= 0.995;
    }
  } else {
    const a = (target !== 0 ? P.ACCEL : P.FRICTION) * grip() * dt;
    player.vx += clamp(target - player.vx, -a, a);
  }
}

/** Skills that push the player around while they play. */
function skillForces(dt: number): void {
  // Rush Toss never slides you off a platform: stop at the edge instead
  if (player.rush.t > 0 && player.onGround) {
    const feet = player.y + player.h, nx = player.x + player.vx * dt;
    if (!surfaceBetween(nx, 1, feet - 12, feet + 12)) player.vx = 0;
  }
  // Piercing Leap: the spikes push you up steadily, against gravity
  if (player.liftT > 0) { player.liftT -= dt; player.vy = -P.SPIKE_RISE_V - P.GRAVITY * dt; }
  // Cyclone Sweep: the sweep holds you steady, so you don't fall straight through the animation
  if (player.cast === 'shoot' && player.skillPose === 'spin' && !player.onGround) player.vy = 0;

}

/** Catch a rope / ladder in reach (see catchClimbable); true if caught. */
function grabClimbable(): boolean {
  const c = catchClimbable();
  if (!c) return false;
  player.climb = c;
  player.dropBlock = null;
  player.liftT = 0;
  // Grabbing the climb ends a movement skill's commitment: the rope takes
  // over from the Glide's tumble rather than waiting it out.
  player.casting.useT = 0;
  player.casting.recoverT = 0;
  player.casting.key = null;
  player.x = c.x;
  player.y = clamp(player.y, c.y1 - player.h, c.y2 - player.h);
  player.vx = 0; player.vy = 0;
  player.onGround = false;
  player.animState = 'climb';
  return true;
}

