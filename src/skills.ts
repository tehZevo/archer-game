import { LINKED_SKILLS, P, SKILLS } from './config';
import { game, player, USE_FLASH } from './state';
import { held } from './input';
import { airborneInBox } from './combat';
import { activeSkill, isLearned, rank } from './progress';
import type { SkillKey, SkillRank } from './types';
import { chainsZ, linkable, linkHeld, startLinks } from './links';
import { AIR_FORM, AIR_MIN_H, FREEZE_CAST, cdSlot, delayTime, rushHolding, useTime } from './castrules';
import { CASTS } from './skillcasts';

/** Airborne enemies Skyward Assault can reach: around and below the player. */
export function barrageTargets() {
  return airborneInBox(player.x, player.y + player.h, 120, 140);
}

/** How a cast that got through fires: as a link (skips the last cast's
 *  recovery) and/or chained off a Q rush. */
interface Fire { linked: boolean; chained: boolean }

/**
 * Press a skill key. `chained`: fired off the end of a Q rush (see gate), so
 * the rush's use time doesn't hold it.
 */
export function cast(key: SkillKey, chained = false): void {
  const airborne = !player.onGround && !player.climb;
  // In the air the key fires its own skill (Meteor Dive, Cyclone Sweep, Plunging
  // Volley), with its own rank, MP cost and use time. Skyward Assault is W's
  // ground-only upgrade: W in the air is always Cyclone Sweep.
  const airKey = airborne ? AIR_FORM[key] : undefined;
  const kind = airKey ?? activeSkill(key).key;
  if (!isLearned(kind)) return;
  // Meteor Dive, Cyclone Sweep and Downpour want you properly airborne:
  // at least ~2/3 of a full jump's peak above the floor.
  if (airKey && game.floor.platforms[0].y - (player.y + player.h) < AIR_MIN_H) return;
  const r = rank(kind);
  const fire = gate(key, kind, airborne, chained, r);
  if (!fire) return;
  pay(key, kind, airborne, r, fire.linked);
  CASTS[kind]?.(r);
}

/** Put a key on the input buffer: it fires on the first free frame (see update). */
function buffer(key: SkillKey): null {
  player.casting.queued = key;
  return null;
}

/**
 * Whether a key press fires now, and how: null when it's blocked, or
 * buffered to fire once the skill it links off finishes.
 */
function gate(key: SkillKey, kind: SkillKey, airborne: boolean, chained: boolean, r: SkillRank): Fire | null {
  // Whether this press links off the cast you're in (see links.ts).
  const linked = linkable(kind);
  // Link skills only work as a link (right after Rush Toss, once per Rush Toss).
  if (LINKED_SKILLS.includes(kind) && !linked) return null;
  // A link waits for the cast it links off to reach its recovery, then fires
  // at once (Rush Toss's strike, the Assault's peak, the end of an animation).
  if (linked && linkHeld(kind)) return buffer(key);
  // Q rushes chain into Double Shot: Z pressed during the rush fires the moment
  // it ends, and right after it at once. The chain skips the rush's ending lag
  // once: one quick shot, not repeated uses.
  if (kind === 'Z' && !chained && (player.rush.t > 0 || rushHolding())) return buffer('Z');
  if (kind === 'Z' && chainsZ()) chained = true;

  // A link doesn't skip the skill's cooldown.
  if (player.cd[cdSlot(key, airborne)] > 0) return null;
  // Electric Blitz spends a banked charge (Down + Q, the strike in place, needs none).
  if (kind === 'EB' && !airborne && !held('down') && player.blitz.charges <= 0) return null;
  if (player.mp < r.mp) return null;
  // An attack skill's use time (and its recovery) blocks every other skill;
  // a link bypasses it. Only a skill the current cast links into is buffered to
  // fire as that cast ends; anything else is dropped.
  const busy = player.casting.useT > 0 || player.casting.recoverT > 0;
  if (busy && !linked && !chained) return null;

  // Attack skills need both hands on the bow: on a ladder only Glide works.
  if (player.climb && kind !== 'D') return null;
  if (kind === 'D' && !airborne) return null;
  return { linked, chained };
}

/** Spend the cast's MP, start its cooldown and use time, and cash in a link. */
function pay(key: SkillKey, kind: SkillKey, airborne: boolean, r: SkillRank, linked: boolean): void {
  const slot = cdSlot(key, airborne);
  player.usedT[slot] = USE_FLASH; // the bar flashes the key you just pressed
  player.mp -= r.mp;
  player.cd[slot] = player.cdMax[slot] = SKILLS[kind].cd;
  player.casting.key = kind; // the use time belongs to this skill (see castrules)
  player.casting.useT = useTime(kind);
  player.casting.recoverT = delayTime(kind);
  player.casting.freeze = FREEZE_CAST.has(kind);
  player.combatT = P.COMBAT_TIME;
  player.liftT = 0; // any other skill ends a Piercing Leap's push (Piercing Leap starts a new one)
  player.skillPose = null; // the spin / vanish of the last cast is over
  startLinks(kind); // presses now link off this cast (so one link ends the last one's combo)
  if (!linked) return;
  // Fervor: each link stacks final damage. And it shaves the long cooldowns,
  // refills a Blitz, and the Cyclone Sweep's cooldown.
  player.fervor = Math.min(5, player.fervor + 1);
  player.fervorT = 9;
  player.cd.R = Math.max(0, player.cd.R - 1);
  player.cd.E = Math.max(0, player.cd.E - 1);
  player.cd['W.air'] = Math.max(0, player.cd['W.air'] - 1);
  if (player.blitz.charges < P.BLITZ_MAX) player.blitz.t += 1;
}
