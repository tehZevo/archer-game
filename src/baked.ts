import urls from 'sprite-urls';
import data from '../assets/sprites.json';
import type { ArcherPose, SheetRow } from './archer';

/* ============================================================
   BAKED SPRITES
   `npm run bake` writes every generated sheet as a PNG under assets/
   and indexes them all in assets/sprites.json (generated: never edit
   it by hand). This reads that index, swaps each sheet's file for its
   bundled URL, and types it: the one place the game finds its art.
   ============================================================ */

/** One baked sheet, as the index lists it: its PNG (a path under assets/),
 *  frame size, frame count, origin, and frame rate where it has one. */
interface SpriteEntry { file: string; w: number; h: number; frames: number; x: number; y: number; fps?: number }

/** A baked sheet, ready to load: its PNG's URL (`src`) in place of the path. */
export type BakedSprite = Omit<SpriteEntry, 'file'> & { src: string };

/** A tileset's atlases (one per piece size) and, per piece, its cell:
 *  sheet index * CELLS + cell, or -1 for a piece with no pixels (see tilebake.ts). */
export interface BakedTiles { sheets: BakedSprite[]; at: number[] }

/** The index's layout. Assigning the JSON to it checks the generated file
 *  against these types at compile time. */
interface SpriteIndex {
  /** Skill effects: a strip facing right, origin at (x, y). */
  fx: Record<string, SpriteEntry>;
  /** Enemies: `frames` walk/flap frames, then the hurt pose, in one strip. */
  mobs: Record<string, SpriteEntry & { fps: number }>;
  /** Enemy deaths: a strip, the body's middle at (x, y). */
  deaths: Record<string, SpriteEntry>;
  /** Scenery: one image per piece. */
  art: Record<string, SpriteEntry>;
  tiles: Record<string, { sheets: SpriteEntry[]; at: number[] }>;
  /** The archer: one sheet per "style-body", and where each pose's row sits on it. */
  archer: { sheets: Record<string, SpriteEntry>; rows: Record<ArcherPose, SheetRow> };
}
const index: SpriteIndex = data;

/** A sheet with its URL. A PNG missing from the bundle gets an empty URL:
 *  it never loads, so the game keeps drawing that art from its generator. */
function withSrc<E extends SpriteEntry>({ file, ...rest }: E): Omit<E, 'file'> & { src: string } {
  return { ...rest, src: urls[file] ?? '' };
}
const each = <T, U>(o: Record<string, T>, f: (v: T) => U): Record<string, U> =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)]));

export const BAKED_FX = each(index.fx, withSrc);
export const BAKED_MOBS = each(index.mobs, withSrc);
export const BAKED_DEATHS = each(index.deaths, withSrc);
export const BAKED_ART = each(index.art, withSrc);
export const BAKED_TILES: Record<string, BakedTiles> = each(index.tiles, (t) => ({ sheets: t.sheets.map(withSrc), at: t.at }));
export const BAKED_ARCHER = { sheets: each(index.archer.sheets, withSrc), rows: index.archer.rows };
