import { P, SKILLS } from './config';
import { player } from './state';
import { passiveBonus } from './progress';
import type { SkillKey } from './types';

/** A skill's use time, shortened by Haste (+N% attack speed: time / (1 + N)). */
export const useTime = (kind: SkillKey): number => (SKILLS[kind].use ?? P.USE_TIME) / (1 + passiveBonus('HA'));

/** Recovery after the animation ends: movement frees up at useT's end, a new
 *  skill waits out this delay. Links skip it (see cast). Attack speed (Haste)
 *  shortens it, the same way it shortens the use time. */
export const delayTime = (kind: SkillKey): number => (SKILLS[kind].delay ?? P.DELAY_TIME) / (1 + passiveBonus('HA'));

/** The link window a skill opens: its whole animation, plus a beat of free
 *  time (LINK_BUFFER) before the linked skill's animation starts. Scales with
 *  Haste, since use/delay do. */
export const linkWindow = (kind: SkillKey): number => useTime(kind) + delayTime(kind) + P.LINK_BUFFER;

/** Keys with an air form that is its own skill (its own row, rank and
 *  cooldown): Q (Air Dive), W (Midair Spin), E (Plunging Volley). */
export const AIR_FORM: Partial<Record<SkillKey, SkillKey>> = { Q: 'AD', W: 'MS', E: 'PV' };

/** The cooldown slot a key uses right now: its air form's ("E.air") in the
 *  air, else its own. (Sky Assault is W's ground-only upgrade: W in the air
 *  is always Midair Spin, on the W.air slot.) */
export function cdSlot(key: SkillKey, airborne = !player.onGround && !player.climb): string {
  return airborne && AIR_FORM[key] ? `${key}.air` : key;
}

/** Aerial skills need real height, not just any airtime: ~2/3 of the default
 *  jump's peak (v²/2g ≈ 35px), so shallow jumps don't trigger the full
 *  aerial combo. */
export const AIR_MIN_H = (2 / 3) * (P.JUMP_V * P.JUMP_V) / (2 * P.GRAVITY);

/** Sky Assault's opening leap is still playing (a Midair Spin pressed now is
 *  buffered; once it's done the sweep fires straight out of the hover). */
export const assaultLeaping = (): boolean =>
  player.cast === 'barrage' && player.hang.t > 0 && player.castTotal - player.castT < P.ASSAULT_LEAP;
