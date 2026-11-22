import { P } from './config';
import { game, player } from './state';
import { held } from './input';
import type { Climbable, Platform } from './types';
import { surfaceYAt } from './surface';
export { surfaceYAt };

/** Candidate surfaces under a body at x: tiles containing x, or (only when
 *  standing past a block's edge) tiles the body merely overlaps. Only a
 *  block's top tiles are walkable; inner tiles (with a tile above) are not. */
function surfacesAt(x: number, w: number, ignoreBlock: number | null = null): Platform[] {
  const plats = game.floor.platforms.filter((p) => !p.inner && (ignoreBlock === null || p.block !== ignoreBlock));
  const under = plats.filter((p) => x >= p.x && x < p.x + p.w);
  if (under.length) return under;
  return plats.filter((p) => !p.slope && x + w * 0.5 > p.x && x - w * 0.5 < p.x + p.w);
}

/** The topmost surface in [yTop, yBot] under a body at x (y grows downward). */
export function surfaceBetween(x: number, w: number, yTop: number, yBot: number, ignoreBlock: number | null = null): Platform | null {
  let best: Platform | null = null, bestY = Infinity;
  for (const p of surfacesAt(x, w, ignoreBlock)) {
    const sy = surfaceYAt(p, x);
    if (sy >= yTop && sy <= yBot && sy < bestY) { best = p; bestY = sy; }
  }
  return best;
}

/** The platform under a body's feet, or null if airborne. */
export function surfaceAt(x: number, y: number, w: number): Platform | null {
  return surfaceBetween(x, w, y - 1, y + 1);
}

/** Max height a grounded body follows a surface up or down in one frame
 *  (covers walking along a slope at full speed). */
export const STICK = 4;

/** Horizontal reach (px) for catching a rope/ladder. */
const GRAB_R = 6.5;

/** Trapezoidal integration: position uses the average of pre- and post-gravity velocity. */
export function integrate(o: { x: number; y: number; vx: number; vy: number }, dt: number): void {
  const oldVy = o.vy;
  o.vy = Math.min(o.vy + P.GRAVITY * dt, P.TERMINAL);
  o.y += (oldVy + o.vy) * 0.5 * dt;
  o.x += o.vx * dt;
}

export function collideGround(
  o: { x: number; y: number; w: number; h: number; vy: number; onGround: boolean; plat: Platform | null; dropBlock?: number | null; dropY?: number },
  prevFeet: number,
  prevX: number = o.x,
): boolean {
  const feet = o.y + o.h;
  // A down-jumped block is ignored only until the feet were below its surface
  // at the start of a frame; after that it's solid again from above.
  if (o.dropBlock != null && prevFeet > (o.dropY ?? 0) + 2) o.dropBlock = null;
  // Swept test: walk the feet's path from (prevX, prevFeet) to (x, feet) in
  // short sub-segments (<=2px across) and land on the first surface a
  // sub-segment crosses from above, so a fast diagonal move can't skip a
  // ramp or a tile it only passes over mid-frame. Slopes count even while
  // rising (a fast horizontal move can outrun the climb into a ramp); flat
  // tiles only when falling.
  // A grounded body (walking) tests only its final x, so it keeps its full
  // horizontal move; the sweep is for airborne bodies.
  const ignore = o.dropBlock ?? null;
  const air = !o.onGround;
  const n = air ? Math.max(1, Math.ceil(Math.abs(o.x - prevX) / 2)) : 1;
  let surf: Platform | null = null, landX = o.x;
  for (let j = 1; j <= n && !surf; j++) {
    const xa = prevX + (o.x - prevX) * (j - 1) / n, fa = prevFeet + (feet - prevFeet) * (j - 1) / n;
    const xb = prevX + (o.x - prevX) * j / n, fb = prevFeet + (feet - prevFeet) * j / n;
    let bestY = Infinity, bestIn = false;
    // airborne: tiles under either end, so a sub-segment that leaves a tile still tests it
    const cands = new Set(air ? [...surfacesAt(xb, o.w, ignore), ...surfacesAt(xa, o.w, ignore)] : surfacesAt(xb, o.w, ignore));
    for (const p of cands) {
      if (o.vy < 0 && !p.slope) continue;
      const syA = surfaceYAt(p, xa), syB = surfaceYAt(p, xb);
      const inB = !air || (xb >= p.x && xb < p.x + p.w);
      // on/above it at the sub-segment's start, at/below it at the end;
      // on a tie prefer the tile under the end point (keeps the full move)
      if (fa <= syA + 0.01 && fb >= syB - 0.01 && (syB < bestY || (syB === bestY && inB && !bestIn))) {
        surf = p; bestY = syB; bestIn = inB; landX = inB ? xb : xa;
      }
    }
  }
  // A grounded body also follows the surface up/down by STICK px.
  if (!surf && o.onGround && o.vy >= 0) {
    let bestY = Infinity;
    for (const p of surfacesAt(o.x, o.w, ignore)) {
      const sy = surfaceYAt(p, o.x);
      if (sy >= feet - STICK && sy <= feet + STICK && sy < bestY) { surf = p; bestY = sy; }
    }
  }
  if (surf) {
    o.dropBlock = null; // landed on something else: the dropped-through block is solid again
    o.x = landX;
    o.y = surfaceYAt(surf, o.x) - o.h;
    o.vy = 0;
    o.onGround = true;
    o.plat = surf;
    return true;
  }
  o.onGround = false;
  return false;
}

/**
 * v83 rope rules: holding Up catches a climbable whose bottom reaches within
 * 20px above the feet (the feet rise to it); Down grabs one whose top sits just
 * below the feet. Called every frame, not only on key-down.
 */
export function catchClimbable(): Climbable | null {
  // The rope just jumped off stays ungrabbable until we clear its grab range
  // or land; any other rope can be caught immediately.
  const left = player.leftClimbX;
  if (left !== null && (player.onGround || Math.abs(player.x - left) > GRAB_R)) player.leftClimbX = null;
  const up = held('up'), down = held('down');
  if (!up && !down) return null;
  if (player.useT > 0) return null;    // skill use time locks movement
  const feet = player.y + player.h;
  for (const c of [...game.floor.ropes, ...game.floor.ladders]) {
    if (Math.abs(player.x - c.x) > GRAB_R) continue;
    if (c.x === player.leftClimbX) continue;
    if (up) {
      // ±8: a rope may end on a slope, whose surface shifts within grab range
      if (player.onGround && Math.abs(feet - c.y2) <= 8) return c;
      if (!player.onGround && feet > c.y1 && feet < c.y2) return c;
    }
    if (down && player.onGround && feet >= c.y1 - 6 && feet <= c.y1 + 14) return c;
  }
  return null;
}
