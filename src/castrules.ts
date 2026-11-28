import { P, SKILLS } from './config';
import { player } from './state';
import { passiveBonus } from './progress';
import type { SkillKey } from './types';

/** A skill's use time, shortened by Haste (+N% attack speed: time / (1 + N)). */
export const useTime = (kind: SkillKey): number => (SKILLS[kind].use ?? P.USE_TIME) / (1 + passiveBonus('ha'));

/** Recovery after the animation ends: movement frees up at useT's end, a new
 *  skill waits out this delay. Links skip it (see cast). Attack speed (Haste)
 *  shortens it, the same way it shortens the use time. */
export const delayTime = (kind: SkillKey): number => (SKILLS[kind].delay ?? P.DELAY_TIME) / (1 + passiveBonus('ha'));

/** Skills that pin you in place for their whole cast (gravity and all),
 *  rather than only locking out movement input. */
export const FREEZE_CAST = new Set<SkillKey>(['r']);

/** Whether a rush (or the Talon Dive that borrows its pose) is still in its
 *  slide-and-strike phase, holding back links pressed during it. This is a
 *  gameplay window, not the animation: the rush pose plays on for the whole
 *  use time, but a link fires once the strike has landed. */
export const rushHolding = (): boolean => {
  if (player.castT <= 0) return false;
  // the Talon Dive holds them through the coil, the plunge and the landing
  // roll: a follow-up pressed during it fires once the roll's strike lands
  if (player.cast === 'dive') return player.diving || player.rush.t > 0 || !player.onGround;
  return player.cast === 'rush' && player.castTotal - player.castT < P.RUSH_HOLD;
};


/** Movement skills a rope/ladder grab cuts short: grabbing the climb is the
 *  next move, so it doesn't wait out the Glide's use time the way an attack's
 *  animation would. (Jump already frees you — see move.climb.) */
export const GRAB_THROUGH = new Set<SkillKey>(['d']);

/** Whether a climbable can be grabbed right now: out of any use time, or in
 *  one belonging to a movement skill. */
export const grabCancels = (): boolean =>
  player.casting.useT <= 0 || (player.casting.key !== null && GRAB_THROUGH.has(player.casting.key));

/** Keys with an air form that is its own skill (its own row, rank and
 *  cooldown): Q (Talon Dive), W (Cyclone Sweep), E (Ember Rain). */
export const AIR_FORM: Partial<Record<SkillKey, SkillKey>> = { 'ground-q': 'air-q', 'ground-w': 'air-w', 'ground-e': 'air-e' };

/** The cooldown slot a key uses right now: its air form's ("E.air") in the
 *  air, else its own. (Skyward Assault is W's ground-only upgrade: W in the air
 *  is always Cyclone Sweep, on the W.air slot.) */
export function cdSlot(key: SkillKey, airborne = !player.onGround && !player.climb): string {
  return airborne && AIR_FORM[key] ? `${key}.air` : key;
}

/** Aerial skills need real height, not just any airtime: ~2/3 of the default
 *  jump's peak (v²/2g ≈ 35px), so shallow jumps don't trigger the full
 *  aerial combo. */
export const AIR_MIN_H = 1.1 * (2 / 3) * (P.JUMP_V * P.JUMP_V) / (2 * P.GRAVITY);

/** Skyward Assault's opening leap is still playing (a Cyclone Sweep pressed now is
 *  buffered; once it's done the sweep fires straight out of the hover). */
export const assaultLeaping = (): boolean =>
  player.cast === 'barrage' && player.hang.t > 0 && player.castTotal - player.castT < P.ASSAULT_LEAP;
