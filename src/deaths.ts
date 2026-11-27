import { WORLD } from './config';
import { surfaceBetween } from './physics';
import { game } from './state';
import type { DeathStory } from './mobdeath';
import type { Floor, Mob, MobType } from './types';

/* ============================================================
   ENEMY DEATHS
   Every enemy dies its own way, in drawn frames (mobdeath.ts,
   deathdrawn.ts): a boar keels over onto its back with its legs in the
   air, a beetle's shell cracks in two, a frog leaps and lands splat, a
   bird folds its wings and drops, a slime sags into a puddle, a knight
   falls on its face as its helm flies off, a flower drops its petals...
   Each base enemy has a recipe: which of its body plan's stories it dies
   by, and the bits of the right stuff that fly off it (feathers from
   birds, gears from clockwork, shards from crystal, spores from fungi).
   A variant dies like the enemy it is a cousin of, in its own colours.

   A corpse is just where and when it died: everything it draws is worked
   out from its age (drawentities.ts, drawCorpse), so nothing here needs a
   canvas and there is nothing to step but the clock.
   ============================================================ */

export type BitKind = 'dust' | 'feather' | 'shard' | 'gear' | 'spore' | 'spark' | 'drop' | 'petal' | 'rock' | 'ember' | 'star' | 'smoke' | 'shell';

export interface DeathRecipe {
  /** how it is drawn dying (one of its body plan's stories, see mobdeath.ts) */
  story: DeathStory;
  /** what flies off it, and in which colours */
  bits: BitKind;
  cols: string[];
  /** how many */
  n: number;
}

const R = (story: DeathStory, bits: BitKind, cols: string[], n = 8): DeathRecipe => ({ story, bits, cols, n });

/** One recipe per base enemy (variants use their base's). */
export const DEATHS: Record<string, DeathRecipe> = {
  'Garden Snail': R('retreat', 'drop', ['#b8e070', '#e8f8b0'], 4),
  'Enemy Crab': R('flip', 'shell', ['#e0503a', '#ff9070'], 4),
  'Hermit Crab': R('shellbreak', 'shell', ['#d8b890', '#f4e0c0', '#e0503a'], 5),
  Gull: R('fold', 'feather', ['#ffffff', '#c8d0dc'], 7),
  Boar: R('legsup', 'dust', ['#a08060', '#d0b898'], 6),
  Wisp: R('gutter', 'spark', ['#9fe8ff', '#ffffff'], 6),
  'Iron Hog': R('slump', 'gear', ['#8a8f9c', '#c8ccd6'], 4),
  Beetle: R('flip', 'dust', ['#506040', '#8aa070'], 4),
  Rabbit: R('faint', 'feather', ['#f0e8e0', '#d8c8b8'], 4),
  Bee: R('fold', 'spark', ['#ffd166', '#2a2a2a'], 4),
  Frog: R('splat', 'drop', ['#60c050', '#a0f090'], 6),
  Otter: R('legsup', 'drop', ['#6ac8ff', '#c8ecff'], 5),
  Goat: R('slump', 'rock', ['#9a9488', '#d0ccc0'], 4),
  Hawk: R('flutter', 'feather', ['#8a5a30', '#d8b080'], 8),
  Bat: R('flutter', 'smoke', ['#4a3a5a', '#7a6a8a'], 4),
  'Rock Crawler': R('crack', 'rock', ['#7a6a5a', '#b0a090'], 5),
  Slime: R('deflate', 'drop', ['#70d070', '#c0ffb0'], 6),
  Mushling: R('faceplant', 'spore', ['#e8d8a0', '#ff9080'], 8),
  'Spore Puff': R('burst', 'spore', ['#d8c8f0', '#fff0ff'], 12),
  'Crystal Golem': R('crumble', 'shard', ['#9fe8ff', '#e0f8ff'], 8),
  'Shard Bat': R('fold', 'shard', ['#b0a0ff', '#e8e0ff'], 6),
  'Ruin Guardian': R('crumble', 'rock', ['#a89870', '#d8c8a0', '#6ac8ff'], 6),
  Jellyfish: R('burst', 'drop', ['#ffa0d0', '#ffe0f0'], 6),
  'Windup Soldier': R('faceplant', 'gear', ['#c8a050', '#e8c870'], 5),
  'Clockwork Bird': R('fold', 'gear', ['#a8803a', '#e8c870'], 5),
  'Dream Moth': R('flutter', 'star', ['#e0c0ff', '#fff0b0'], 6),
  'Shadow Fox': R('slump', 'smoke', ['#2a2040', '#5a4a80'], 8),
  Reflection: R('faceplant', 'shard', ['#d0e8ff', '#ffffff'], 8),
  'Ice Wisp': R('burst', 'shard', ['#c8f0ff', '#ffffff'], 8),
  'Star Sprite': R('burst', 'star', ['#ffd166', '#fff6c0'], 8),
  'Meteor Golem': R('crumble', 'ember', ['#ff8040', '#ffd060', '#5a4a40'], 8),
  'Void Blossom': R('wither', 'petal', ['#b060e0', '#e0a0ff'], 5),
  'Cinder Hound': R('legsup', 'ember', ['#ff6a2a', '#ffc060', '#3a2a24'], 8),
  'Ash Wisp': R('gutter', 'ember', ['#ff9040', '#8a8080', '#ffe0a0'], 8),
  'Armor Knight': R('crumble', 'gear', ['#9aa0b0', '#d8dce8', '#5a2a3a'], 6),
  'Keep Rat': R('legsup', 'spark', ['#ffe080', '#ffffff'], 4),
  Gargoyle: R('fold', 'rock', ['#6a6a78', '#a8a8b8'], 6),
  'Choir Spirit': R('gutter', 'star', ['#fff0c0', '#ffd870', '#c8e0ff'], 8),
  'Reef Ray': R('flutter', 'drop', ['#5ac8e8', '#c8f4ff'], 6),
  'Coral Crawler': R('crack', 'shell', ['#f07a8a', '#ffc0c8', '#8a5a5a'], 6),
  Yeti: R('faceplant', 'dust', ['#e8f4ff', '#a8d0f0', '#ffffff'], 8),
  'Frost Wolf': R('slump', 'shard', ['#c8e8ff', '#ffffff'], 6),
  'Null Wraith': R('deflate', 'smoke', ['#101018', '#5a5a7a'], 8),
};

/** Fallback for an enemy with no recipe of its own. */
export const PLAIN_DEATH = R('legsup', 'dust', ['#c8d0dc', '#ffffff'], 5);

/** The recipe an enemy dies by (a variant goes the way its base does). */
export const deathOf = (t: MobType): DeathRecipe =>
  DEATHS[t.n] ?? (t.of ? DEATHS[t.of] : undefined) ?? PLAIN_DEATH;

/** How long a death plays, s. */
export const DEATH_T = 1.1;

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

/** Where the whole death is drawn at progress p (0..1), from where it died:
 *  only ever a shift, for an enemy killed in the air falling to the ground
 *  (the dying itself is drawn frame by frame). */
export interface Pose { dx: number; dy: number }
export const deathPose = (c: Corpse, p: number): Pose => ({ dx: 0, dy: c.drop * Math.min(1, (p / 0.45) ** 2) });

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
  // bursts let go at once; the rest shed bits through the first half
  const burst = c.recipe.story === 'burst' ? 0.42 * DEATH_T : 0;
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

/** Start a fresh arena with nobody down. */
export function clearPlayerDeath(): void {
  death = null;
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
