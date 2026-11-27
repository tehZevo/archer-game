import { bitFly, DEATH_T, deathBits, type Corpse, type DeathRecipe } from './deaths';
import { deathPainter } from './deathdrawn';
import { shade, Sprite } from './sprites';

/* ============================================================
   ENEMY DEATH SHEETS
   Each enemy's death is a baked strip of frames (assets/mobs/death, written
   by `npm run bake`); drawing a death is just picking the frame for its age.
   The strips are authored here, from
   its death painter (mobdeath.ts / deathdrawn.ts: its own body, in its
   own colours, keeling over, cracking, splatting, crumbling...), cel
   shaded like its walk cycle, fading out with an ordered dither at the
   very end, with the bits that fly off it (feathers, gears, shards...)
   painted in as pixels. Drawing a death is just picking the frame for
   its age. Pure pixel buffers here; drawentities.ts turns them into
   canvases. Until its PNG has loaded (or headless), a sheet is built from
   its painter instead.
   ============================================================ */

/** Frames per death (DEATH_T long, so ~13fps). */
export const DEATH_FRAMES = 14;

import { canvasGrid, fillRect, type Grid } from './grid';
import { BAKED_DEATHS } from './mobbaked';
export type { Grid } from './grid';

export interface DeathSheet {
  frames: Grid[];
  /** where the body's middle sits in each frame (facing right) */
  cx: number; cy: number;
}

/** 4x4 Bayer matrix: a pixel shows while alpha beats its threshold. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dithered = (x: number, y: number, a: number): boolean => a > BAYER[(y & 3) * 4 + (x & 3)];

/** A stable seed from the enemy's name, so its sheet is always the same. */
const seedOf = (name: string): number => [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

const hex = (c: string): [number, number, number] =>
  [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

/** When the dead body starts to fade out (progress 0..1). */
const FADE_FROM = 0.8;

/** Bake an enemy's death (facing right), or null if it has no art. */
export function bakeDeathSheet(name: string, recipe: DeathRecipe): DeathSheet | null {
  const art = deathPainter(name, recipe.story);
  if (!art) return null;
  const { w: sw, h: sh } = art.look;
  const pad = 22, W = sw + pad * 2, H = sh + pad * 2;
  const cx = pad + Math.floor(sw / 2), cy = pad + Math.floor(sh / 2); // the body's middle
  const c: Corpse = { name, recipe, x: 0, feet: sh / 2, w: sw, h: sh, k: 1, dir: 1, drop: 0, age: 0, seed: seedOf(name) };
  const floor = pad + sh - 1; // the ground row
  const frames: Grid[] = [];
  for (let f = 0; f < DEATH_FRAMES; f++) {
    const p = (f + 0.5) / DEATH_FRAMES, t = p * DEATH_T;
    // the body, drawn dying, then shaded like the living sprite
    const body = new Sprite(W, H);
    art.paint((x, y, col, gw = 1, gh = 1) => {
      const y0 = pad + y, y1 = Math.min(floor + 1, y0 + gh);
      if (y1 > y0) fillRect(body.g, pad + x, y0, gw, y1 - y0, col);
    }, p);
    const g = shade(body).g;
    if (p > FADE_FROM) {
      const a = 1 - (p - FADE_FROM) / (1 - FADE_FROM);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!dithered(x, y, a)) g.px[(y * W + x) * 4 + 3] = 0;
    }
    const put = (x: number, y: number, r: number, gg: number, b: number): void => {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H || y > floor) return;
      const i = (y * W + x) * 4;
      g.px[i] = r; g.px[i + 1] = gg; g.px[i + 2] = b; g.px[i + 3] = 255;
    };
    // the bits, as pixels in the recipe's colours
    const kind = recipe.bits, fly = bitFly(kind);
    for (const b of deathBits(c, t)) {
      const x = cx + b.x, y = Math.min(floor - 1, cy + b.y);
      if (!dithered(Math.round(x), Math.round(y), b.alpha)) continue;
      const [r, gg, bb] = hex(b.col);
      const dot = (dx: number, dy: number): void => put(x + dx, y + dy, r, gg, bb);
      switch (kind) {
        case 'feather': case 'petal': case 'shell':
          if (Math.abs(Math.sin(b.rot)) < 0.5) { dot(-1, 0); dot(0, 0); dot(1, 0); } else { dot(0, -1); dot(0, 0); dot(0, 1); }
          break;
        case 'gear':
          for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) dot(i, j);
          dot(Math.cos(b.rot) > 0 ? 2 : -2, 0);
          put(x, y, 0x2a, 0x20, 0x18);
          break;
        case 'star':
          dot(-1, 0); dot(0, 0); dot(1, 0); dot(0, -1); dot(0, 1);
          break;
        case 'shard':
          if (Math.sin(b.rot) > 0) { dot(0, -1); dot(0, 0); } else { dot(-1, 0); dot(0, 0); }
          break;
        default:
          for (let j = 0; j < fly.size; j++) for (let i = 0; i < fly.size; i++) dot(i - (fly.size >> 1), j - (fly.size >> 1));
      }
    }
    frames.push(g);
  }
  return { frames, cx, cy };
}

/** The frame a death shows at its age. */
export const deathFrame = (age: number): number => Math.min(DEATH_FRAMES - 1, Math.floor((age / DEATH_T) * DEATH_FRAMES));

/** A baked death strip's PNG (a data URL) and layout: n frames of w x h, the body's middle at (cx, cy). */
export interface BakedDeath { src: string; w: number; h: number; n: number; cx: number; cy: number }

const loaded = new Map<string, DeathSheet>();

/** Start decoding every baked death strip (no-op headless). */
export function loadDeathSheets(): void {
  if (typeof Image === 'undefined') return;
  for (const [name, s] of Object.entries(BAKED_DEATHS)) {
    const img = new Image();
    img.onload = () => {
      loaded.set(name, { frames: Array.from({ length: s.n }, (_, f) => canvasGrid(img, s.w, s.h, f * s.w)), cx: s.cx, cy: s.cy });
    };
    img.src = s.src;
  }
}

/** An enemy's baked death sheet, once its PNG has loaded. */
export const loadedDeathSheet = (name: string): DeathSheet | undefined => loaded.get(name);
