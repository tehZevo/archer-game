import { WORLD } from './config';
import { surfaceBetween } from './physics';
import { game } from './state';
import type { Floor, Mob, MobType } from './types';

/* ============================================================
   ENEMY DEATHS
   Every enemy dies its own way: its body (its hurt pose) moves through
   one of a few motions, and bits of the right stuff fly off it (feathers
   from birds, gears from clockwork, shards from crystal, spores from
   fungi...). Each base enemy has its own recipe; a variant dies like
   the enemy it is a cousin of, in its own colours.

   A corpse is just where and when it died: everything it draws is worked
   out from its age (render.ts, drawCorpse), so nothing here needs a
   canvas and there is nothing to step but the clock.
   ============================================================ */

export type DeathMove =
  /** tips over sideways onto the ground */
  | 'topple'
  /** hops up and lands on its back */
  | 'flip'
  /** flattens and spreads into a puddle */
  | 'melt'
  /** swells up, then bursts */
  | 'pop'
  /** spins as it drops to the ground */
  | 'spiral'
  /** folds its wings and drops like a stone */
  | 'plummet'
  /** floats up and fades away */
  | 'rise'
  /** breaks into chunks of itself that tumble apart */
  | 'crumble'
  /** shrinks into its shell (or itself) and is gone */
  | 'retract'
  /** droops and sinks into the ground */
  | 'wilt'
  /** runs down like a clock: wobbles, then keels over */
  | 'winddown';

export type BitKind = 'dust' | 'feather' | 'shard' | 'gear' | 'spore' | 'spark' | 'drop' | 'petal' | 'rock' | 'ember' | 'star' | 'smoke' | 'shell';

export interface DeathRecipe {
  move: DeathMove;
  /** what flies off it, and in which colours */
  bits: BitKind;
  cols: string[];
  /** how many */
  n: number;
}

const R = (move: DeathMove, bits: BitKind, cols: string[], n = 8): DeathRecipe => ({ move, bits, cols, n });

/** One recipe per base enemy (variants use their base's). */
export const DEATHS: Record<string, DeathRecipe> = {
  'Garden Snail': R('retract', 'drop', ['#b8e070', '#e8f8b0'], 5),
  'Enemy Crab': R('flip', 'shell', ['#e0503a', '#ff9070'], 6),
  'Hermit Crab': R('retract', 'shell', ['#d8b890', '#f4e0c0', '#e0503a'], 7),
  Gull: R('spiral', 'feather', ['#ffffff', '#c8d0dc'], 9),
  Boar: R('topple', 'dust', ['#a08060', '#d0b898'], 9),
  Wisp: R('rise', 'spark', ['#9fe8ff', '#ffffff'], 10),
  'Iron Hog': R('topple', 'gear', ['#8a8f9c', '#c8ccd6'], 6),
  Beetle: R('flip', 'dust', ['#506040', '#8aa070'], 6),
  Rabbit: R('flip', 'feather', ['#f0e8e0', '#d8c8b8'], 7),
  Bee: R('plummet', 'spark', ['#ffd166', '#2a2a2a'], 6),
  Frog: R('pop', 'drop', ['#60c050', '#a0f090'], 9),
  Otter: R('topple', 'drop', ['#6ac8ff', '#c8ecff'], 8),
  Goat: R('topple', 'rock', ['#9a9488', '#d0ccc0'], 7),
  Hawk: R('plummet', 'feather', ['#8a5a30', '#d8b080'], 10),
  Bat: R('plummet', 'smoke', ['#4a3a5a', '#7a6a8a'], 7),
  'Rock Crawler': R('crumble', 'rock', ['#7a6a5a', '#b0a090'], 6),
  Slime: R('melt', 'drop', ['#70d070', '#c0ffb0'], 10),
  Mushling: R('wilt', 'spore', ['#e8d8a0', '#ff9080'], 12),
  'Spore Puff': R('pop', 'spore', ['#d8c8f0', '#fff0ff'], 16),
  'Crystal Golem': R('crumble', 'shard', ['#9fe8ff', '#e0f8ff'], 10),
  'Shard Bat': R('plummet', 'shard', ['#b0a0ff', '#e8e0ff'], 9),
  'Ruin Guardian': R('winddown', 'rock', ['#a89870', '#d8c8a0', '#6ac8ff'], 8),
  Jellyfish: R('wilt', 'drop', ['#ffa0d0', '#ffe0f0'], 10),
  'Windup Soldier': R('winddown', 'gear', ['#c8a050', '#e8c870'], 7),
  'Clockwork Bird': R('spiral', 'gear', ['#a8803a', '#e8c870'], 7),
  'Dream Moth': R('rise', 'star', ['#e0c0ff', '#fff0b0'], 10),
  'Shadow Fox': R('rise', 'smoke', ['#2a2040', '#5a4a80'], 12),
  Reflection: R('rise', 'shard', ['#d0e8ff', '#ffffff'], 12),
  'Ice Wisp': R('pop', 'shard', ['#c8f0ff', '#ffffff'], 12),
  'Star Sprite': R('pop', 'star', ['#ffd166', '#fff6c0'], 12),
  'Meteor Golem': R('crumble', 'ember', ['#ff8040', '#ffd060', '#5a4a40'], 12),
  'Void Blossom': R('wilt', 'petal', ['#b060e0', '#e0a0ff'], 10),
  'Cinder Hound': R('topple', 'ember', ['#ff6a2a', '#ffc060', '#3a2a24'], 10),
  'Ash Wisp': R('rise', 'ember', ['#ff9040', '#8a8080', '#ffe0a0'], 12),
  'Armor Knight': R('crumble', 'gear', ['#9aa0b0', '#d8dce8', '#5a2a3a'], 9),
  'Keep Rat': R('flip', 'spark', ['#ffe080', '#ffffff'], 6),
  Gargoyle: R('plummet', 'rock', ['#6a6a78', '#a8a8b8'], 10),
  'Choir Spirit': R('spiral', 'star', ['#fff0c0', '#ffd870', '#c8e0ff'], 12),
  'Reef Ray': R('spiral', 'drop', ['#5ac8e8', '#c8f4ff'], 10),
  'Coral Crawler': R('retract', 'rock', ['#f07a8a', '#ffc0c8', '#8a5a5a'], 8),
  Yeti: R('topple', 'shard', ['#e8f4ff', '#a8d0f0', '#ffffff'], 12),
  'Frost Wolf': R('flip', 'shard', ['#c8e8ff', '#ffffff'], 8),
  'Null Wraith': R('retract', 'smoke', ['#101018', '#5a5a7a'], 12),
};

/** Fallback for an enemy with no recipe of its own. */
export const PLAIN_DEATH = R('topple', 'dust', ['#c8d0dc', '#ffffff'], 7);

/** The recipe an enemy dies by (a variant goes the way its base does). */
export const deathOf = (t: MobType): DeathRecipe =>
  DEATHS[t.n] ?? (t.of ? DEATHS[t.of] : undefined) ?? PLAIN_DEATH;

/** How long a death plays, s. */
export const DEATH_T = 0.8;

export interface Corpse {
  /** the enemy's name (its sprite) and recipe */
  name: string;
  recipe: DeathRecipe;
  /** its middle, its feet and its size where it died */
  x: number; feet: number; w: number; h: number;
  /** sprite scale (bosses and elites are drawn bigger) and facing */
  k: number; dir: number;
  /** how far above the ground it died, px (fliers fall there first) */
  drop: number;
  /** s since it died */
  age: number;
  /** a per-death seed, so the bits scatter differently each time */
  seed: number;
}

export const corpses: Corpse[] = [];
let onFloor: Floor | null = null;

/** Lay an enemy down to die (called as it is removed from the floor). */
export function addCorpse(m: Mob, k: number): void {
  if (onFloor !== game.floor) { corpses.length = 0; onFloor = game.floor; }
  const feet = m.y + m.h;
  const under = m.fly ? surfaceBetween(m.x, m.w, feet, WORLD.h) : null;
  const drop = under ? Math.max(0, under.y - feet) : 0;
  corpses.push({
    name: m.type.n, recipe: deathOf(m.type),
    x: m.x, feet, w: m.w, h: m.h, k, dir: m.dir < 0 ? -1 : 1, drop,
    age: 0, seed: (Math.random() * 1e9) | 0,
  });
}

/** Age the deaths, dropping the ones that are over (or on another floor). */
export function updateCorpses(dt: number): void {
  if (onFloor !== game.floor) { corpses.length = 0; onFloor = game.floor; return; }
  for (let i = corpses.length - 1; i >= 0; i--) {
    corpses[i].age += dt;
    if (corpses[i].age >= DEATH_T) corpses.splice(i, 1);
  }
}

/** Where the body is at progress p (0..1): an offset (px, from where it
 *  died), a turn (radians), a squash (x, y scale) and how solid it is. */
export interface Pose { dx: number; dy: number; rot: number; sx: number; sy: number; alpha: number }

/** Ease out. */
const out = (p: number): number => 1 - (1 - p) * (1 - p);
/** Fades over the last part of the death. */
const tail = (p: number, from = 0.6): number => (p < from ? 1 : Math.max(0, 1 - (p - from) / (1 - from)));

/** How far it falls to the ground. */
const air = (c: Corpse): number => c.drop;

export function deathPose(c: Corpse, p: number): Pose {
  const P0: Pose = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, alpha: 1 };
  const fall = (q: number): number => air(c) * Math.min(1, q * q); // a flier dropping to the ground
  switch (c.recipe.move) {
    case 'topple': {
      // a tall body falls flat; a long one (seen side-on, a quarter turn
      // would stand it on its tail) rolls over onto its back
      const turn = c.w > c.h * 1.1 ? Math.PI : Math.PI / 2;
      return { ...P0, rot: -c.dir * turn * out(Math.min(1, p * 2.2)), dy: fall(p * 2), alpha: tail(p) };
    }
    case 'flip': {
      const q = Math.min(1, p * 2.2), hop = Math.sin(q * Math.PI) * 10;
      return { ...P0, dy: -hop + fall(p * 2), rot: c.dir * Math.PI * out(q), alpha: tail(p) };
    }
    case 'melt':
      return { ...P0, sx: 1 + out(p) * 0.9, sy: Math.max(0.12, 1 - out(p) * 0.88), dy: fall(p * 2), alpha: tail(p, 0.5) };
    case 'pop': {
      if (p < 0.3) { const s = 1 + (p / 0.3) * 0.35; return { ...P0, sx: s, sy: s }; }
      return { ...P0, sx: 1.5, sy: 1.5, alpha: 0 }; // burst: only the bits are left
    }
    case 'spiral':
      return { ...P0, dy: air(c) * out(Math.min(1, p * 1.6)), dx: Math.sin(p * 12) * 4, rot: p * Math.PI * 4 * c.dir, alpha: tail(p) };
    case 'plummet':
      return { ...P0, dy: air(c) * Math.min(1, p * p * 4), sx: 0.7, rot: c.dir * 0.4, alpha: tail(p) };
    case 'rise':
      return { ...P0, dy: -out(p) * 18, sx: 1 - p * 0.4, sy: 1 + p * 0.3, alpha: 1 - out(p) };
    case 'crumble':
      // the body shows only for a blink: it breaks into its chunks (see drawCorpse)
      return { ...P0, alpha: p < 0.08 ? 1 : 0 };
    case 'retract':
      return { ...P0, sx: Math.max(0.1, 1 - out(Math.min(1, p * 1.6)) * 0.85), sy: Math.max(0.3, 1 - out(p) * 0.5), dy: fall(p * 2), alpha: tail(p, 0.55) };
    case 'wilt':
      return { ...P0, rot: c.dir * 0.5 * out(Math.min(1, p * 2)), sy: Math.max(0.05, 1 - Math.max(0, p - 0.3) * 1.4), dy: fall(p * 2), alpha: tail(p, 0.7) };
    case 'winddown': {
      const wob = p < 0.45 ? Math.sin(p * 40) * 0.12 * (1 - p / 0.45) : 0;
      const tip = p < 0.45 ? 0 : -c.dir * (Math.PI / 2) * out(Math.min(1, (p - 0.45) * 3));
      return { ...P0, rot: wob + tip, dy: fall(p * 2), alpha: tail(p, 0.7) };
    }
  }
}

/** Deterministic pseudo-random from a corpse's seed. */
export function rand(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** A flying bit at age t: where it is (from the body's middle), its turn
 *  and size, how solid, and its colour. Thrown out and pulled down (or,
 *  for light stuff, drifting up). */
export interface Bit { x: number; y: number; rot: number; size: number; alpha: number; col: string }

/** How each kind of bit flies: speed out, lift, gravity, drag, spin, size. */
const FLY: Record<BitKind, { v: number; up: number; g: number; spin: number; size: number; light?: boolean }> = {
  dust: { v: 30, up: 10, g: 0, spin: 0, size: 2, light: true },
  feather: { v: 40, up: 30, g: 40, spin: 6, size: 2 },
  shard: { v: 70, up: 50, g: 260, spin: 14, size: 2 },
  gear: { v: 50, up: 90, g: 300, spin: 10, size: 3 },
  spore: { v: 24, up: 26, g: -10, spin: 0, size: 1, light: true },
  spark: { v: 50, up: 20, g: 0, spin: 0, size: 1, light: true },
  drop: { v: 45, up: 60, g: 320, spin: 0, size: 2 },
  petal: { v: 30, up: 20, g: 50, spin: 5, size: 2 },
  rock: { v: 45, up: 60, g: 340, spin: 8, size: 3 },
  ember: { v: 50, up: 70, g: 120, spin: 0, size: 1 },
  star: { v: 40, up: 30, g: 0, spin: 4, size: 2, light: true },
  smoke: { v: 16, up: 24, g: -20, spin: 0, size: 3, light: true },
  shell: { v: 55, up: 80, g: 320, spin: 12, size: 2 },
};

export const bitFly = (k: BitKind): typeof FLY[BitKind] => FLY[k];

export function deathBits(c: Corpse, t: number): Bit[] {
  const r = rand(c.seed), f = FLY[c.recipe.bits], out: Bit[] = [];
  // pops and crumbles let go at once; the rest shed bits through the first half
  const burst = c.recipe.move === 'pop' ? 0.3 * DEATH_T : 0;
  for (let i = 0; i < c.recipe.n; i++) {
    const a = r() * Math.PI * 2, v = f.v * (0.5 + r()) * Math.sqrt(c.k), delay = burst || r() * 0.25;
    const col = c.recipe.cols[Math.floor(r() * c.recipe.cols.length)], spin = (r() - 0.5) * f.spin;
    const s = t - delay;
    if (s < 0) continue;
    const vx = Math.cos(a) * v, vy = Math.sin(a) * v * 0.6 - f.up;
    out.push({
      x: vx * s, y: vy * s + 0.5 * f.g * s * s,
      rot: spin * s, size: f.size, col,
      alpha: Math.max(0, 1 - s / (DEATH_T - delay)),
    });
  }
  return out;
}

/* ============================================================
   PLAYER DEATH
   Killed archers don't just blink out: a tombstone drops in from the sky
   where they fell, and their ghost rises out of it and fades. The clock is
   the same idea as a Corpse's age (see above), so the animation is pure
   function-of-time and needs no canvas of its own.
   ============================================================ */

/** s the tombstone takes to drop in, and the ghost to rise and fade. */
export const TOMB_DROP_T = 0.35, GHOST_RISE_T = 1.0;
export const PLAYER_DEATH_T = TOMB_DROP_T + GHOST_RISE_T;

export interface PlayerDeath {
  /** where the archer fell */
  x: number;
  /** the ground she fell on */
  y: number;
  /** s since she died */
  age: number;
  /** her own look, so the ghost is her (see look.ts) */
  seed: number;
}

let death: PlayerDeath | null = null;
export const getPlayerDeath = (): PlayerDeath | null => death;

export function setPlayerDeath(x: number, y: number): void {
  if (death) return; // one animation per knockout, not one per frame
  death = { x, y, age: 0, seed: (Math.random() * 1e9) | 0 };
}

export function updatePlayerDeath(dt: number): void {
  if (!death) return;
  death.age += dt;
  if (death.age >= PLAYER_DEATH_T) death = null;
}

/** 0..1 of the tombstone's drop (it lands with a small bounce). */
export function tombDrop(d: PlayerDeath): number {
  const p = Math.min(1, d.age / TOMB_DROP_T);
  return 1 - (1 - p) * (1 - p); // ease-out: it settles onto the ground
}

/** 0..1 of the ghost's rise, starting once the stone has landed. */
export function ghostRise(d: PlayerDeath): number {
  const p = (d.age - TOMB_DROP_T) / GHOST_RISE_T;
  return p <= 0 ? 0 : Math.min(1, p);
}
