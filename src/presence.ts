import { P } from './config';
import type { GhostTrack, GhostView } from './ghost';
import type { Fx } from './types';

/* ============================================================
   PRESENCE
   What makes other players readable: a name (random, kept in
   localStorage), a tint per player so a ghost never blends into
   your own archer, and the effects of their skills replayed
   locally from their networked poses (visual only, no damage).
   ============================================================ */

const ADJ = ['SWIFT', 'BOLD', 'KEEN', 'SLY', 'WILD', 'CALM', 'BRAVE', 'QUICK', 'SHY', 'RED', 'BLUE', 'GOLD', 'IRON', 'MOSS', 'STAR', 'DUSK'];
const NOUN = ['FOX', 'OWL', 'HAWK', 'WREN', 'LYNX', 'ELK', 'HARE', 'KITE', 'MOTH', 'BEAR', 'WOLF', 'CROW', 'DOVE', 'FAWN', 'ROOK', 'TERN'];

/** Names are short: the pixel font is 6px a letter on a 320px screen. */
export const NAME_MAX = 9;

/** Keep only what the pixel font can draw, upper-cased and capped. */
export const cleanName = (s: unknown): string =>
  String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, NAME_MAX);

export function randomName(rand: () => number = Math.random): string {
  const pick = (a: string[]): string => a[Math.floor(rand() * a.length)];
  return cleanName(pick(ADJ) + pick(NOUN));
}

const KEY = 'archer-game:name';
let mine = '';
/** This player's name: made up on first play, then kept. */
export function myName(): string {
  if (mine) return mine;
  try { mine = cleanName(localStorage.getItem(KEY)); } catch { /* no storage */ }
  if (!mine) {
    mine = randomName();
    try { localStorage.setItem(KEY, mine); } catch { /* no storage */ }
  }
  return mine;
}

/** Bright tints that stand apart from the archer's teal and gold. */
const TINTS = ['#ff7a9c', '#9f8cff', '#ffa04d', '#5fd3ff', '#b6f05a', '#ff6bd5', '#ffe05a', '#6bffc0'];
/** A stable tint for a peer id (the same player keeps their colour). */
export function tintFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

/* ---------------- ghost skill effects ---------------- */

interface Run { pose: string; since: number; fired: boolean }
const runs = new WeakMap<GhostTrack, Run>();

/**
 * Effects to spawn for a ghost this frame. Each pose run fires its effect
 * once: a shot at the release (after the draw), Sky Toss's horn of light and
 * Sky Assault's swoosh as they begin. A run is new when the pose changes or
 * its age drops back (the same pose started again).
 */
export function ghostFx(tr: GhostTrack, g: GhostView): Fx[] {
  const prev = runs.get(tr);
  const run: Run = !prev || prev.pose !== g.pose || g.since + 0.05 < prev.since
    ? { pose: g.pose, since: g.since, fired: false }
    : prev;
  run.since = g.since;
  runs.set(tr, run);
  if (run.fired) return [];

  const out: Fx[] = [];
  if (g.pose === 'shoot') {
    if (g.since < P.Z_WINDUP) return out; // still drawing the bow
    const mx = g.x + g.face * 8, my = g.y + 13;
    out.push({ type: 'muzzle', x: mx, y: my, t: 0.18, face: g.face });
    out.push({ type: 'tracer', x: mx, y: my, t: 0.14, face: g.face, sx: 96 / 64 });
  } else if (g.pose === 'rush') {
    out.push({ type: 'rush', x: g.x + g.face * 24, y: g.y + 24, t: 0.4 });
  } else if (g.pose === 'barrage') {
    out.push({ type: 'swoosh', x: g.x, y: g.y + 12, t: 0.2, face: g.face });
  }
  run.fired = true; // poses without an effect are done too
  return out;
}
