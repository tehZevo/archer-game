/**
 * Gale Stream: holding Z. A Z press fires its Double Shot (or Bolt Flurry) as
 * usual; keep holding Z past that shot's use time and it turns into a stream
 * of quick shots (P.GALE_RATE a second, Haste speeds it up) into the closest
 * enemy ahead. You can walk while it streams; it keeps firing the way it
 * started, so walking backward doesn't turn you round. Letting go of Z, any
 * other skill, a climb or running out of MP ends it.
 */
import { P } from './config';
import { player } from './state';
import { held } from './input';
import { isLearned, passiveBonus, rank } from './progress';
import { CASTS } from './skillcasts';
import type { SkillKey } from './types';

/** The casts a held Z streams on from. */
const STREAMS_FROM = new Set<SkillKey | null>(['z', 's']);

/** A skill just went off (see skills.pay): a Z shot arms the stream, anything else ends it. */
export function armRapid(kind: SkillKey): void {
  player.rapid.armed = STREAMS_FROM.has(kind) && isLearned('held-z');
  player.rapid.on = false;
}

/** Whether a stream is running (it holds your facing: see move.steer). */
export const streaming = (): boolean => player.rapid.on;

/** Stop the stream (and don't restart it until the next Z shot). */
function stop(): void {
  player.rapid.armed = player.rapid.on = false;
}

/** On the fixed step, after the cast timers: start, run or end the stream. */
export function updateRapid(dt: number): void {
  const rp = player.rapid;
  if (!rp.armed) return;
  if (!held('z') || player.climb || player.hp <= 0) return stop();
  if (!rp.on) {
    // the Z shot plays out first; the stream starts once its full cast (the use
    // animation and the recovery that follows it) is done, not just the use
    if (player.casting.useT > 0 || player.casting.recoverT > 0) return;
    rp.on = true; rp.t = 0; rp.face = player.face;
  }
  rp.t -= dt;
  while (rp.t <= 0) {
    const r = rank('held-z');
    if (player.mp < r.mp) return stop();
    player.mp -= r.mp;
    player.combatT = P.COMBAT_TIME;
    CASTS['held-z']?.(r);
    rp.t += 1 / (P.GALE_RATE * (1 + passiveBonus('ha')));
  }
}
