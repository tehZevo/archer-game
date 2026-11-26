import { player } from './state';
import type { LinkKind, SkillKey } from './types';

/* ============================================================
   LINK WINDOWS
   The combo grammar: a skill opens a window (s) during which another
   skill links off it, firing without waiting out the first one's
   recovery. Every window lives in player.links and is only touched
   through these helpers, so "which skill opens what" reads at the cast
   (openLink) and "what fires out of it" at the gate (linkOpen).

     combo    Rush Toss / Meteor Dive / launchers -> the link skills (W, AB, Z chain, and
                W in the air: the Cyclone Sweep)
     assault  Skyward Assault's hover ending      -> Tempest (R)
     tempest  Tempest                         -> Dive (Q in the air)
     blitz    Electric Blitz                  -> the next blitz
     glide    the aerial skills               -> Glide (D)
     volley   Cyclone Sweep                     -> Downpour (E in the air)
     spin     Skyward Assault                     -> Cyclone Sweep (W in the air)
   ============================================================ */

export const LINK_KINDS: readonly LinkKind[] = ['combo', 'assault', 'blitz', 'glide', 'volley', 'spin', 'tempest'];

/** A fresh set of windows, all shut. */
export const noLinks = (): Record<LinkKind, number> =>
  ({ combo: 0, assault: 0, blitz: 0, glide: 0, volley: 0, spin: 0, tempest: 0 });

/** The window each skill links out of (besides the link skills and the
 *  Q slot, which ride the combo window: see linksIn). */
export const LINKS_INTO: Partial<Record<SkillKey, LinkKind>> = {
  R: 'assault', EB: 'blitz', D: 'glide', PV: 'volley', MS: 'spin',
};

/** Whether this cast is a link: a link skill, the Q slot (or W's air form,
 *  the Cyclone Sweep) inside the combo window, or a skill whose own window is
 *  open. */
export const linksIn = (kind: SkillKey, key: SkillKey, isLinkSkill: boolean): boolean => {
  const own = LINKS_INTO[kind];
  // The Q slot rides the combo window (the launchers' follow-up) and Tempest's
  // own window; W's air form rides the combo window too.
  const ridesQ = key === 'Q' && (linkOpen('combo') || linkOpen('tempest'));
  const ridesW = key === 'W' && kind === 'MS' && linkOpen('combo');
  return isLinkSkill || ridesQ || ridesW || (own !== undefined && linkOpen(own));
};

/** Open (or re-open) a window for s seconds. */
export function openLink(k: LinkKind, s: number): void { player.links[k] = s; }
/** Spend or cancel a window. */
export function closeLink(k: LinkKind): void { player.links[k] = 0; }
/** Shut every window (a respawn, a fresh arena). */
export function closeLinks(): void { for (const k of LINK_KINDS) player.links[k] = 0; }
export const linkOpen = (k: LinkKind): boolean => player.links[k] > 0;

/** Run the windows down (never below 0, so a shut one reads exactly 0). */
export function tickLinks(dt: number): void {
  for (const k of LINK_KINDS) if (player.links[k] > 0) player.links[k] = Math.max(0, player.links[k] - dt);
}

/** The windows that let a buffered skill fire past the current one's recovery. */
export const bufferWindowOpen = (): boolean => linkOpen('combo') || linkOpen('blitz') || linkOpen('spin');

/** Whether skill `kind` (resolved to its air form when airborne) has its own
 *  link window open, so a press of it buffered during the last cast can fire
 *  now rather than wait for that cast to finish. */
export const ownWindowOpen = (kind: SkillKey): boolean => {
  const own = LINKS_INTO[kind];
  return own !== undefined && linkOpen(own);
};

/** End a Skyward Assault hover (a dive, glide, spin or volley cutting it short). */
export function endHover(): void { player.hang.t = 0; player.hang.hits = 0; }
