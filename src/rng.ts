/** Deterministic RNG so everyone in a channel sees the same floor layout. */

/** FNV-1a string hash → 32-bit seed. */
export function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: small, fast, good enough for level layout. Returns 0..1. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A 0..1 random stream (a `seeded` one, or Math.random). */
export type Rng = () => number;

/** A float in [a, b). */
export const range = (r: Rng, a: number, b: number): number => a + r() * (b - a);
/** An integer in [a, b], both ends included. */
export const intIn = (r: Rng, a: number, b: number): number => Math.floor(range(r, a, b + 1));
/** One element of a non-empty list. */
export const pick = <T>(r: Rng, list: readonly T[]): T => list[intIn(r, 0, list.length - 1)];
/** True with probability p. */
export const chance = (r: Rng, p: number): boolean => range(r, 0, 1) < p;
