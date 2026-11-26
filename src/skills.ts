import { LINKED_SKILLS, P, SKILLS } from './config';
import { game, player, USE_FLASH } from './state';
import { held } from './input';
import { airborneInBox } from './combat';
import { activeSkill, isLearned, rank } from './progress';
import type { SkillKey, SkillRank } from './types';
import { closeLink, closeLinks, linkOpen, linksIn } from './links';
import { AIR_FORM, AIR_MIN_H, FREEZE_CAST, assaultLeaping, cdSlot, delayTime, offHover, useTime } from './castrules';
import { CASTS } from './skillcasts';

/** Airborne enemies Sky Assault can reach: around and below the player. */
export function barrageTargets() {
  return airborneInBox(player.x, player.y + player.h, 120, 140);
}

/** How a cast that got through fires: as a link (skips use time and
 *  cooldown, spends the open windows) and/or chained off a Q rush. */
interface Fire { linked: boolean; chained: boolean }

/**
 * Press a skill key. `chained`: fired off the end of a Q rush (see gate), so
 * the rush's use time doesn't hold it.
 */
export function cast(key: SkillKey, chained = false): void {
  const airborne = !player.onGround && !player.climb;
  // In the air the key fires its own skill (Air Dive, Midair Spin, Plunging
  // Volley), with its own rank, MP cost and use time. Sky Assault is W's
  // ground-only upgrade: W in the air is always Midair Spin.
  const airKey = airborne ? AIR_FORM[key] : undefined;
  const kind = airKey ?? activeSkill(key).key;
  if (!isLearned(kind)) return;
  // Air Dive, Midair Spin and Plunging Volley want you properly airborne:
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
  const linkSkill = LINKED_SKILLS.includes(kind);
  // Which presses count as links: see linksIn. (Sky Toss off the Air Dive's
  // window, a blitz off its own, the aerial kit off each other's windows.)
  const linked = linksIn(kind, key, linkSkill);
  // Link skills only work right after Sky Toss, once per Sky Toss.
  if (linkSkill && !linkOpen('combo')) return null;
  const rushPlaying = player.cast === 'rush' && player.castT > 0;
  // A link pressed while Sky Toss is still playing waits for it to finish.
  if (linked && rushPlaying) return buffer(key);
  // Sky Assault's leap buffers the sweep it links into, so pressing W on the
  // way up lands as the leap peaks.
  if (kind === 'MS' && linkOpen('spin') && assaultLeaping()) return buffer(key);
  // Q rushes chain into Twin Shot: Z pressed during the rush fires the moment
  // it ends, and right after it (while its link window is open) at once. The
  // chain skips the rush's ending lag once: one quick shot, not repeated uses.
  if (kind === 'Z' && !chained && (player.rush.t > 0 || rushPlaying)) return buffer('Z');
  if (kind === 'Z' && linkOpen('combo')) { chained = true; closeLink('combo'); }

  // The Midair Spin and Tempest keep their own cooldown even as a link, so one
  // jump can't chain sweeps all the way up and a Storm isn't ready next Assault.
  if (player.cd[cdSlot(key, airborne)] > 0 && (!linked || kind === 'MS' || kind === 'R')) return null;
  // Electric Blitz spends a banked charge (Down + Q, the strike in place, needs none).
  if (kind === 'EB' && !airborne && !held('down') && player.blitz.charges <= 0) return null;
  if (player.mp < r.mp) return null;
  // An attack skill's use time (and its recovery) blocks every other skill;
  // a link bypasses it. So does the airborne kit (Plunging Volley, Glide,
  // Midair Spin, the Q-slot rush) pulled out of a Sky Assault hover, which
  // ends the hover and fires on the press rather than at its end.
  const busy = player.casting.useT > 0 || player.casting.recoverT > 0;
  if (busy && !linked && !chained && !offHover(kind)) return buffer(key);

  // Attack skills need both hands on the bow: on a ladder only Jump/Glide work.
  if (player.climb && kind !== 'C' && kind !== 'D') return null;
  if (kind === 'C' && (airborne || player.climb)) return null;
  if (kind === 'D' && !airborne) return null;
  if ((kind === 'VS' || kind === 'RA') && !player.onGround) return null;
  return { linked, chained };
}

/** Spend the cast's MP, start its cooldown and use time, and cash in a link. */
function pay(key: SkillKey, kind: SkillKey, airborne: boolean, r: SkillRank, linked: boolean): void {
  const slot = cdSlot(key, airborne);
  player.usedT[slot] = USE_FLASH; // the bar flashes the key you just pressed
  player.mp -= r.mp;
  player.cd[slot] = player.cdMax[slot] = SKILLS[kind].cd;
  // Jump has no animation of its own; Glide commits you for its use time.
  if (kind !== 'C') {
    player.casting.key = kind; // the use time belongs to this skill (see castrules)
    player.casting.useT = useTime(kind);
    player.casting.recoverT = delayTime(kind);
    player.casting.freeze = FREEZE_CAST.has(kind);
    player.combatT = P.COMBAT_TIME;
  }
  player.liftT = 0; // any other skill ends a Spike Lift's push (Spike Lift starts a new one)
  player.skillPose = null; // the spin / vanish of the last cast is over
  if (!linked) return;
  // Fervor: each link stacks final damage, and spends every open window, so
  // one link ends the whole combo. And it shaves the two long cooldowns and
  // refills a Blitz.
  closeLinks();
  player.fervor = Math.min(5, player.fervor + 1);
  player.fervorT = 9;
  player.cd.R = Math.max(0, player.cd.R - 1);
  player.cd.E = Math.max(0, player.cd.E - 1);
  if (player.blitz.charges < P.BLITZ_MAX) player.blitz.t += 1;
}
