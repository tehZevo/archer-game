import { game, later, player } from './state';
import { hitbox, NUM_GAP } from './combat';
import { useTime } from './castrules';
import type { CastName, FxKind, Mob, SkillKey } from './types';

/** Play cast animation `name` for exactly `t` seconds. */
export function setPose(name: CastName, t: number): void {
  player.cast = name; player.castT = t; player.castTotal = t;
}

/** Start skill `kind`'s cast animation: it lasts the skill's use time, so the
 *  animation and the movement lock are one number (Haste shortens both). The
 *  recovery after it (delayTime) is not part of the animation: that is the
 *  bit a link skips. */
export const pose = (name: CastName, kind: SkillKey): void => setPose(name, useTime(kind));

/** The targets still alive (a delayed hit skips the ones already killed). */
export const alive = (tg: Mob[]): Mob[] => tg.filter((m) => game.mobs.includes(m));

/** Enemies in a box, closest to the player first, at most `n` of them. */
export function nearest(cx: number, cy: number, w: number, h: number, n: number): Mob[] {
  return hitbox(cx, cy, w, h)
    .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))
    .slice(0, n);
}

/** A multi-hit skill: `fn` runs once per shot `gap` apart from `start` (the
 *  default cadence, `NUM_GAP`), on the targets still alive; `more` is set on
 *  every shot but the last. Pass a `gap` when the volley should fit a fixed
 *  window rather than stretch with the hit count. */
export function eachShot(shots: number, start: number, fn: (more: boolean, h: number) => void, gap = NUM_GAP): void {
  for (let h = 0; h < shots; h++) later(start + h * gap, () => fn(h < shots - 1, h));
}

/** An effect at each target's feet, or at (x, y) when there are none. */
export function fxUnder(type: FxKind, tg: Mob[], x: number, y: number, t: number): void {
  const at = tg.length ? tg.map((m) => [m.x, m.y + m.h]) : [[x, y]];
  for (const [fx, fy] of at) game.fx.push({ type, x: fx, y: fy, t });
}

/** Tracers whipping out from (x, y) to each target, or across the range on a whiff. */
export function tracers(tg: Mob[], x: number, y: number, face: number): void {
  const ends = tg.length ? tg.map((m) => m.x) : [x + face * 96];
  for (const ex of ends) {
    game.fx.push({ type: 'tracer', x, y, t: 0.14, face, len: Math.max(12, Math.abs(ex - x)) });
  }
}
