import { BACKDROPS, LAYER, wrapPaint } from './backdrop';
import { DECOR_FRAMES, DECOR_SIZE, paintDecor, paintSmoke, SMOKE, TOWN_PALS } from './towndecor';
import { PROP_H, PROP_W, PROPS } from './props';
import { canvasGrid, fillRect, flipGrid, gridCanvas, newGrid, type Grid } from './grid';
import { portalGrid } from './sprites';
import { boardGrid, NPC_FRAMES, npcGrid, type NpcLook } from './npcart';
import { PET_FRAMES, PET_LIST, petGrid } from './petart';
import { BAKED_ART } from './artbaked';
import type { DecorKind } from './types';

/* ============================================================
   SCENERY SHEETS
   The scenery ships as PNGs (assets/art/<key>.png), one image each:
     prop/<area>/<i>          an area's props (props.ts)
     decor/<kind>/<palette>/<frame>  town decor in each town palette (towndecor.ts), and decor/smoke/<frame>
     backdrop/<area>/far|mid  an area's two parallax layers (backdrop.ts)
     portal                   the warp pad
     npc/<kind>/<frame>       town NPCs (npcart.ts), and npc/board
     pet/<kind>/<frame>       the pets (petart.ts)
   baked from those painters by `npm run bake`. art(key) is the loaded
   PNG, or the painter's output until it has loaded.
   ============================================================ */

const DECOR_KINDS = Object.keys(DECOR_SIZE) as DecorKind[];

/** Paint into a fresh grid. */
function paint(w: number, h: number, draw: (p: (x: number, y: number, col: string, w?: number, h?: number) => void) => void): Grid {
  const g = newGrid(w, h);
  draw((x, y, col, pw = 1, ph = 1) => fillRect(g, x, y, pw, ph, col));
  return g;
}

/** Every piece of scenery's painter, by key. */
export const ART_GEN: Record<string, () => Grid> = {
  portal: portalGrid,
  'npc/board': boardGrid,
  ...Object.fromEntries((['shop', 'stylist', 'trainer', 'pets', 'sage'] as NpcLook[]).flatMap((k) =>
    Array.from({ length: NPC_FRAMES }, (_, f) => [`npc/${k}/${f}`, () => npcGrid(k, f)]))),
  ...Object.fromEntries(PET_LIST.flatMap((k) =>
    Array.from({ length: PET_FRAMES }, (_, f) => [`pet/${k}/${f}`, () => petGrid(k, f)]))),
  ...Object.fromEntries(Object.entries(PROPS).flatMap(([area, ps]) =>
    ps.map((p, i) => [`prop/${area}/${i}`, () => paint(PROP_W, PROP_H, p)]))),
  ...Object.fromEntries(DECOR_KINDS.flatMap((kind) => TOWN_PALS.flatMap((pal, i) => Array.from({ length: DECOR_FRAMES[kind] }, (_, f) =>
    [`decor/${kind}/${i}/${f}`, () => paint(DECOR_SIZE[kind].w, DECOR_SIZE[kind].h, (p) => paintDecor(kind, pal, p, false, f))])))),
  ...Object.fromEntries(Array.from({ length: SMOKE.frames }, (_, f) => [`decor/smoke/${f}`, () => paint(SMOKE.w, SMOKE.h, (p) => paintSmoke(p, f))])),
  ...Object.fromEntries(Object.entries(BACKDROPS).flatMap(([area, bd]) => (['far', 'mid'] as const).map((layer) =>
    [`backdrop/${area}/${layer}`, () => paint(LAYER, LAYER, (p) => bd[layer](wrapPaint((x, y, col, w, h) => p(x, y, col, w, h))))]))),
};

const loaded = new Map<string, Grid>();
const canvases = new Map<string, HTMLCanvasElement>();

/** Start decoding every baked piece of scenery (no-op headless). */
export function loadArtSheets(): void {
  if (typeof Image === 'undefined') return;
  for (const [key, src] of Object.entries(BAKED_ART)) {
    const img = new Image();
    img.onload = () => {
      loaded.set(key, canvasGrid(img, img.width, img.height));
      for (const k of [key, key + '|flip']) canvases.delete(k); // redraw from the PNG
    };
    img.src = src;
  }
}

/** A piece of scenery's pixels: the baked PNG, or its painter's until that loads. */
export function artGrid(key: string): Grid {
  let g = loaded.get(key);
  if (!g) { g = ART_GEN[key](); loaded.set(key, g); }
  return g;
}

/** A piece of scenery as a canvas (mirrored if `flip`), cached. */
export function art(key: string, flip = false): HTMLCanvasElement {
  const k = flip ? key + '|flip' : key;
  let c = canvases.get(k);
  if (!c) { const g = artGrid(key); c = gridCanvas(flip ? flipGrid(g) : g); canvases.set(k, c); }
  return c;
}
