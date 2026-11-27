import { SKILLS } from './config';
import { player } from './state';
import { assaultLeaping, rushHolding } from './castrules';
import type { SkillKey } from './types';

/* ============================================================
   LINKS
   The combo grammar, as a buffer rule: while you're in skill A's cast
   (its animation, its recovery, or the event it waits on), a press of a
   skill B that A links into (SKILLS[A].linksInto) is a link. It fires
   the moment A's recovery begins, skipping the rest of it, rather than
   waiting A out. There are no timers: once A's cast is over, a press is
   a normal cast.

   "Recovery begins" is the end of A's animation, except where A waits
   on an event:
     Rush Toss / Electric Blitz   the slide's strike landing (rushHolding)
     Meteor Dive                  the landing roll's strike (rushHolding)
     Skyward Assault              the leap's peak for the Cyclone Sweep,
                                  the hover's end for Tempest and Downpour
   ============================================================ */

/** The rushes: Double Shot chains off them (see skills.gate). */
const RUSHES = new Set<SkillKey>(['ground-q', 'eb', 'air-q']);

/** Whether a press of `kind` right now links off the current cast. */
export const linkable = (kind: SkillKey): boolean =>
  player.linkFrom !== null && (SKILLS[player.linkFrom].linksInto ?? []).includes(kind);

/** Whether Double Shot pressed now chains off a rush (skipping its ending lag once). */
export const chainsZ = (): boolean => player.linkFrom !== null && RUSHES.has(player.linkFrom);

/** Links off Skyward Assault that wait out the whole hover, firing as it ends
 *  (the rest fire once the opening leap is done, cutting the hover short). */
const HOVER_THROUGH = new Set<SkillKey>(['r', 'air-e']);

/** Whether a link into `kind` still waits for the current cast's recovery to begin. */
export function linkHeld(kind: SkillKey): boolean {
  const from = player.linkFrom;
  if (from === null) return false;
  if (RUSHES.has(from)) return rushHolding();
  if (from === 'ab') return HOVER_THROUGH.has(kind) ? player.hang.t > 0 : assaultLeaping();
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
