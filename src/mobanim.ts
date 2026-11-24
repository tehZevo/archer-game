import type { Mob } from './types';

/** Mob.anim counts up this many units a second (update.ts). */
export const ANIM_RATE = 6;

/** Which of an enemy's `n` animation frames to draw. Fliers always flap;
 *  walkers step only while moving, and stand on frame 0 when still or stunned. */
export function mobFrame(m: Pick<Mob, 'anim' | 'fly' | 'vx' | 'stun'>, n: number, fps: number): number {
  if (m.stun > 0 || (!m.fly && Math.abs(m.vx) < 5)) return 0;
  return Math.floor((m.anim / ANIM_RATE) * fps) % n;
}
