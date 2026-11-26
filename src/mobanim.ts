import type { Mob } from './types';

/** Mob.anim counts up this many units a second (update.ts). */
export const ANIM_RATE = 6;

/** mobFrame's answer for the standing breath: frame 0 sunk a pixel (see breath()). */
export const BREATH = -1;
/** Breaths a second (in, out) of a walker standing still. */
export const BREATH_RATE = 0.75;

/** Which of an enemy's `n` animation frames to draw. Fliers always flap;
 *  walkers step only while moving; standing, they breathe (frame 0 and
 *  BREATH in turn); stunned, they hold frame 0. */
export function mobFrame(m: Pick<Mob, 'anim' | 'fly' | 'vx' | 'stun'>, n: number, fps: number): number {
  if (m.stun > 0) return 0;
  if (!m.fly && Math.abs(m.vx) < 5) return Math.floor((m.anim / ANIM_RATE) * BREATH_RATE * 2) % 2 ? BREATH : 0;
  return Math.floor((m.anim / ANIM_RATE) * fps) % n;
}
