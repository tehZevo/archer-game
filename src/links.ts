import { SKILLS } from './config';
import { player } from './state';
import { rushHolding } from './castrules';
import type { SkillKey } from './types';

/* ============================================================
   LINKS
   The combo grammar, as a buffer rule: while you're in skill A's cast
   (its animation, its recovery, or the event it waits on), a press of a
   skill B that A links into (SKILLS[A].linksInto) is a link. It fires
   the moment A's recovery begins, skipping the rest of it, rather than
   waiting A out. There are no timers: once A's cast is over, a press is
   a normal cast.

   "Recovery begins" is the end of A's animation (its use time), except
   where A waits on an event:
     Rush Toss / Electric Blitz   the end of the use time, after the slide's strike
     Talon Dive                  the end of the use time, after the landing roll
     Skyward Assault              the leap's peak for the Cyclone Sweep,
                                  the hover's end for Trefoil Tempest and Ember Rain
   ============================================================ */

/** The rushes: Double Shot chains off them (see skills.gate). */
const RUSHES = new Set<SkillKey>(['ground-q', 'eb', 'air-q']);

/** Whether a press of `kind` right now links off the current cast. */
export const linkable = (kind: SkillKey): boolean =>
  player.linkFrom !== null && (SKILLS[player.linkFrom].linksInto ?? []).includes(kind);

/** Whether Double Shot pressed now chains off a rush (skipping its ending lag once). */
export const chainsZ = (): boolean => player.linkFrom !== null && RUSHES.has(player.linkFrom);

/** Whether a link into `kind` still waits for the current cast's recovery to begin. */
export function linkHeld(_kind: SkillKey): boolean {
  const from = player.linkFrom;
  if (from === null) return false;
  // a rush waits out its strike (or the Dive its landing roll) and then the rest of its use time
  if (RUSHES.has(from)) return rushHolding() || player.casting.useT > 0;
  // every skill linked out of the Assault fires at the end of the hover
  if (from === 'ab') return player.hang.t > 0;
  return player.casting.useT > 0;
}

/** The current cast is still running (its animation, recovery, or the event it waits on). */
const castLive = (): boolean =>
  player.castT > 0 || player.casting.useT > 0 || player.casting.recoverT > 0 || player.hang.t > 0 || player.diving;

/** A cast starts: links now read off it. */
export function startLinks(kind: SkillKey): void { player.linkFrom = kind; }
/** Forget the cast links read off (a respawn, a fresh arena). */
export function closeLinks(): void { player.linkFrom = null; }
/** Once the cast is over, presses are normal casts again. Run after the
 *  buffer fires, so a link waiting on the cast's last moment still lands. */
export function tickLinks(): void { if (!castLive()) player.linkFrom = null; }

/** End a Skyward Assault hover (a dive, glide, spin or volley cutting it short). */
export function endHover(): void { player.hang.t = 0; player.hang.hits = 0; }
