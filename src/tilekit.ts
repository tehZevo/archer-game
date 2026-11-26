import type { Sprite } from './sprites';

/* Shared pieces for tilesets (tileset.ts and tilesets/*.ts). */

/** Top decoration sprite size: 2px of overhang each side, 10px above the tile, 4px into it. */
export const TOP_W = 20, TOP_H = 14, TOP_Y = 10;
/** Bottom decoration sprite size: hangs from just under the tile. */
export const BOT_H = 12;

export type Paint = (x: number, y: number, col: string, w?: number, h?: number) => void;

export interface Edge {
  outer: string;
  inner: string;
  /** outline where the surface layer meets an exposed side */
  surfOuter?: string;
  surfInner?: string;
  /** round: corners cut on a diagonal of `r` px; chip: like round, with chunks
   *  knocked out of the sides; bevel: square, lit on the left side */
  style: 'round' | 'chip' | 'bevel';
  r: number;
  light?: string;
}

export interface Tileset {
  name: string;
  /** background gradient, top / middle / bottom */
  sky: [string, string, string];
  fill(x: number, y: number, v: number): string;
  surface(x: number, d: number, v: number): string | null;
  edge: Edge;
  top?(p: Paint, v: number, w: boolean, e: boolean): void;
  /** Top decoration variants that are all plants, swaying in the breeze
   *  (drawn live, see SWAY); the others (stones, posts, stumps) hold still. */
  sway?: number[];
  /** Top decoration variants that glow, pulsing brighter (crystals, glowing caps). */
  glow?: number[];
  bottom?(p: Paint, v: number): void;
  rope(p: Paint): void;
  ladder(p: Paint): void;
}

/** Small integer hash → 0..1, for patterns and per-tile variants. */
export function hash(a: number, b: number, c = 0): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Fill variants per block piece (more than the decorations, so long floors don't repeat). */
export const BLOCK_VARIANTS = 8;
/** Which of `n` variants a tile at grid cell (tx, ty) uses; `salt` separates fill from decorations. */
export const variantAt = (tx: number, ty: number, salt = 0, n = 4): number => Math.floor(hash(tx, ty, salt + 11) * n);

/** Paint a sprite through a tileset painter. */
export const painter = (s: Sprite, put: (s: Sprite, x: number, y: number, c: string, w?: number, h?: number) => void): Paint =>
  (x, y, c, w, h) => put(s, x, y, c, w, h);
