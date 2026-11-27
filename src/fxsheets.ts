import { FX_GEN, FX_SIZED } from './fxsprites';
import { makeCanvas, sheetAnim, type FxAnim } from './fxlight';
import { BAKED_FX, type BakedSprite } from './baked';

/* ============================================================
   EFFECT SHEETS
   Skill effects ship as PNG sprite sheets (assets/fx/<name>.png): one
   horizontal strip per effect, frame f at x = f * w, facing right, drawn
   additively. The sheets are baked from the procedural generators in
   fxsprites.ts by `npm run bake` (scripts/bake.ts), which also indexes
   each sheet's frame size and origin in assets/sprites.json (see baked.ts).

   Each effect converts on its own: fx(name) draws the baked sheet once it
   has loaded, and falls back to running the generator (an effect not baked
   yet, or a sheet still decoding), so the game plays the same throughout.
   ============================================================ */

/** Baked sheets that have loaded, cut into frames. */
const loaded = new Map<string, FxAnim>();
/** Effects built from their generators (the fallback), built on first use. */
const generated = new Map<string, FxAnim>();

/** Cut a loaded sheet into frame canvases, and mirrored ones for facing left. */
function cut(img: HTMLImageElement, s: BakedSprite): FxAnim {
  const frames: HTMLCanvasElement[] = [], flipped: HTMLCanvasElement[] = [];
  for (let f = 0; f < s.frames; f++) {
    const a = makeCanvas(s.w, s.h), b = makeCanvas(s.w, s.h);
    a.getContext('2d')!.drawImage(img, f * s.w, 0, s.w, s.h, 0, 0, s.w, s.h);
    const g = b.getContext('2d')!;
    g.translate(s.w, 0); g.scale(-1, 1);
    g.drawImage(a, 0, 0);
    frames.push(a); flipped.push(b);
  }
  return { frames, flipped, ox: s.x, oy: s.y };
}

/** Start decoding every baked sheet (no-op headless). */
export function loadFxSheets(): void {
  if (typeof Image === 'undefined') return;
  for (const [name, s] of Object.entries(BAKED_FX)) {
    const img = new Image();
    img.onload = () => loaded.set(name, cut(img, s));
    img.src = s.src;
  }
}

/** An effect, ready to draw: its baked sheet, or its generator's output until then. */
export function fx(name: string): FxAnim {
  const got = loaded.get(name) ?? generated.get(name);
  if (got) return got;
  const a = sheetAnim(FX_GEN[name]());
  generated.set(name, a);
  return a;
}

/** A distance-spanning effect (see FX_SIZED) built `len` px long, cached per
 *  length: drawn 1:1, never stretched. */
export function fxSized(name: string, len: number): FxAnim {
  const w = Math.max(4, Math.round(len)), key = `${name}@${w}`;
  const got = generated.get(key);
  if (got) return got;
  const a = sheetAnim(FX_SIZED[name](w));
  generated.set(key, a);
  return a;
}
