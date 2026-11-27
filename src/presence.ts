import { INTERP_MS, type GhostTrack, type GhostView } from './ghost';
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

/** Change this player's name (cleaned; an empty name gets a random one). */
export function setMyName(s: string): string {
  mine = cleanName(s) || randomName();
  try { localStorage.setItem(KEY, mine); } catch { /* no storage */ }
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
 * Effects to spawn for a ghost this frame, from its pose. Each pose run fires
 * once: Rush Toss's horn of light as it begins. A
 * run is new when the pose changes or its age drops back (the same pose
 * started again). Shots don't come from the pose (back-to-back shots merge
 * into one long pose): each one arrives as its own message (see queueShot).
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
  if (g.pose === 'rush') {
    out.push({ type: 'rush', x: g.x + g.face * 24, y: g.y + 24, t: 0.4 });
  }
  run.fired = true; // poses without an effect are done too
  return out;
}

/* ---------------- ghost shots ---------------- */

/** One released shot, as sent: sender's clock (ms), muzzle point, facing, tracer length (px). */
/** A peer's shot: when, where, facing, tracer length, and how many arrows
 *  (`n`, one every SHOT_GAP ms; absent = 1). */
export interface ShotMsg { t: number; x: number; y: number; f: number; l: number; n?: number }
export const SHOT_GAP = 80;

/** Shots waiting for the ghost's playback to reach them (local clock, ms). */
const pending: { due: number; fx: Fx[] }[] = [];
const MAX_PENDING = 40; // a flood from one peer can't pile up effects

/** Schedule a peer's shot to show when their ghost (played back INTERP_MS
 *  behind, on their clock + offset) reaches the moment it was fired. */
export function queueShot(tr: GhostTrack | undefined, s: ShotMsg, now: number): void {
  if (!s || ![s.t, s.x, s.y, s.l].every(Number.isFinite) || pending.length >= MAX_PENDING) return;
  const face = s.f < 0 ? -1 : 1;
  const len = Math.max(12, Math.min(320, s.l));
  const due = tr && Number.isFinite(tr.offset) ? s.t + tr.offset + INTERP_MS : now;
  pending.push({ due, fx: [
    { type: 'muzzle', x: s.x, y: s.y, t: 0.18, face },
    { type: 'tracer', x: s.x, y: s.y, t: 0.14, face, len },
  ] });
  // the rest of a multi-arrow shot, one tracer each
  const n = Number.isFinite(s.n) ? Math.max(1, Math.min(8, Math.floor(s.n!))) : 1;
  for (let i = 1; i < n && pending.length < MAX_PENDING; i++) {
    pending.push({ due: due + i * SHOT_GAP, fx: [{ type: 'tracer', x: s.x, y: s.y, t: 0.14, face, len }] });
  }
}

/** Effects of queued shots whose moment has come. */
export function dueShots(now: number): Fx[] {
  const out: Fx[] = [];
  for (let i = pending.length - 1; i >= 0; i--) {
    if (pending[i].due <= now) { out.push(...pending[i].fx); pending.splice(i, 1); }
  }
  return out;
}

/** Forget queued shots (changing rooms). */
export const clearShots = (): void => { pending.length = 0; };
