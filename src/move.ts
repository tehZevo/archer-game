import { FX_DUR, P, WORLD } from './config';
import { game, player } from './state';
import { held, pressed } from './input';
import { catchClimbable, collideGround, integrate, surfaceAt, surfaceBetween } from './physics';
import { damage } from './combat';
import { nimbleJump, nimbleSpeed, passiveBonus } from './progress';
import { sfx } from './audio';
import { grip } from './floormods';
import { slowFactor } from './status';
import { clamp } from './util';
import { barrageTargets } from './skills';
import { landDive } from './rush';
import { setPose } from './skillfx';

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
  if (!locked && pressed('c') && held('up') && player.ranks.AC) { player.climbRush = true; sfx.jump(); }
  if (player.climbRush) {
    player.y -= P.CLIMB_RUSH * (1 + passiveBonus('AC')) * dt;
    // green streaks shoot up past her as she rushes
    climbFxT -= dt;
    if (climbFxT <= 0) { climbFxT = 0.1; game.fx.push({ type: 'climbRise', x: player.x, y: player.y + player.h, t: FX_DUR.climbRise }); }
  } else {
    climbFxT = 0;
    if (!locked && held('up')) player.y -= P.CLIMB * dt;
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
  // (a Tempest pressed during the hover fires as it ends: the finisher on
  // the Q -> W -> AB chain, see links.linkHeld)
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
  // Jump is movement, like walking: it reads the key directly, fires on the
  // ground whenever a skill's use time isn't locking movement, and is never
  // buffered. Holding it re-jumps on every landing.
  if (!locked && player.onGround && held('c')) jump();
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
  player.animState = !player.onGround ? (player.vy > 60 ? 'fall' : 'jump')
    : prone ? 'prone' : Math.abs(player.vx) > 12 ? 'walk' : 'idle';
}

/** Horizontal control: accelerate toward the walk speed on the ground (ice
 *  slows the pickup and the stop); in the air, keep momentum and only brake. */
function steer(dt: number, locked: boolean): void {
  const slow = (player.cast === 'rush' || player.cast === 'dive' ? 0.55 : 1) * slowFactor(player); // chill slows you
  // Facing follows the held direction even during a cast's lock, so you can
  // turn around mid-combo (the buffered window) without losing your momentum.
  if (held('left')) player.face = -1;
  if (held('right')) player.face = 1;
  let target = 0;
  const speed = P.WALK * nimbleSpeed();
  if (!locked && held('left'))  target = -speed * slow;
  if (!locked && held('right')) target = speed * slow;
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

/** s of the jump's takeoff pose. */
const JUMP_POSE = 0.16;

/** Jump. Down + Jump drops through the platform underfoot (not the ground
 *  slab): a small hop, then fall; that whole block is ignored until the
 *  player lands on something else. */
function jump(): void {
  setPose('jump', JUMP_POSE);
  sfx.jump();
  player.skillPose = null; // a jump ends the last cast's spin / vanish pose
  const under = held('down') ? surfaceAt(player.x, player.y + player.h, player.w) : null;
  player.onGround = false;
  if (under && !under.ground && under.block !== undefined) {
    player.dropBlock = under.block;
    player.dropY = player.y + player.h;
    player.vy = -P.DROP_HOP_V;
    return;
  }
  player.vy = -P.JUMP_V * nimbleJump();
  if (held('left'))  { player.vx = -P.JUMP_H; player.face = -1; }
  if (held('right')) { player.vx =  P.JUMP_H; player.face =  1; }
}

/** Skills that push the player around while they play. */
function skillForces(dt: number): void {
  // Rush Toss never slides you off a platform: stop at the edge instead
  if (player.rush.t > 0 && player.onGround) {
    const feet = player.y + player.h, nx = player.x + player.vx * dt;
    if (!surfaceBetween(nx, 1, feet - 12, feet + 12)) player.vx = 0;
  }
  // Piercing Leap: the spikes push you up steadily, against gravity, until you
  // reach the top; then you hold there (vy cancels gravity) until the cast ends
  if (player.liftT > 0) {
    player.liftT -= dt;
    const left = Math.max(0, player.y + player.h - player.liftTop);
    // half a step of gravity: integrate() moves on the average of the pre- and
    // post-gravity speeds, so this moves you exactly `rise` px/s this step
    player.vy = -Math.min(P.SPIKE_RISE_V, left / dt) - P.GRAVITY * dt / 2;
  }
  // Cyclone Sweep: the sweep lifts you gently, so you rise slowly through the animation
  if (player.cast === 'shoot' && player.skillPose === 'spin' && !player.onGround) {
    // half a step of gravity: integrate() moves on the average of the pre- and
    // post-gravity speeds, so this lifts you exactly SPIN_RISE_V px/s this step
    player.vy = -P.SPIN_RISE_V - P.GRAVITY * dt / 2;
  }

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

