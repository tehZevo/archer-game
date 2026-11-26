import { WORLD } from './config';
import { game } from './state';
import * as TB from './tilebake';
import { BLOCK_VARIANTS, TOP_Y, variantAt, type Tileset } from './tileset';
import { lastTown, townIndex } from './world';
import { PROP_H, PROP_W, PROPS, propAt, propsFor } from './props';
import { art } from './artsheets';
import { BACK_DECOR, DECOR_FRAMES, DECOR_FPS, DECOR_SIZE, SMOKE, TOWN_PALS } from './towndecor';
import { NB } from './nb';
import type { Sprite } from './sprites';
import type { Climbable, Floor } from './types';

/* The floor's static scenery (town buildings, tiles, props, street
   furniture, ropes, ladders and the growth on tile edges), painted once per
   floor into one world-sized canvas, so a frame draws it with a single
   drawImage instead of hundreds. */

type Ctx = CanvasRenderingContext2D;

let baked: { floor: Floor; area: string; c: HTMLCanvasElement } | null = null;

/** The current floor's static layer, baked on first use (and again when the
 *  floor or its tileset changes). */
export function floorLayer(ts: Tileset): HTMLCanvasElement {
  if (baked && baked.floor === game.floor && baked.area === ts.name) return baked.c;
  const c = document.createElement('canvas');
  c.width = WORLD.w; c.height = WORLD.h;
  const g = c.getContext('2d') as Ctx;
  g.imageSmoothingEnabled = false;
  drawDecor(g, true); // buildings stand behind the town's levels...
  drawPlatforms(g, ts);
  drawProps(g, ts);
  drawDecor(g, false); // ...street furniture on them
  for (const r of game.floor.ropes) drawRope(g, ts, r);
  for (const l of game.floor.ladders) drawLadder(g, ts, l);
  drawDecorations(g, ts); // drawn over ropes and ladders, so they look tied on
  baked = { floor: game.floor, area: ts.name, c };
  return c;
}

const TS = 16;
/** Every block tile on the floor as (x, y, neighbours): the ground slab is
 *  split into its tiles so it gets the same variants and decorations. */
function eachTile(f: (x: number, y: number, nb: number) => void): void {
  for (const p of game.floor.platforms) {
    if (p.slope) continue;
    if (!p.ground) { f(p.x, p.y, p.nb ?? 0); continue; }
    for (let y = p.y; y < p.y + p.h; y += TS) for (let x = p.x; x < p.x + p.w; x += TS) {
      f(x, y, y === p.y ? NB.E | NB.W | NB.S | NB.SE | NB.SW : 255);
    }
  }
}

function drawPlatforms(g: Ctx, ts: Tileset): void {
  eachTile((x, y, nb) => g.drawImage(TB.block(ts, nb, variantAt(x / TS, y / TS, 0, BLOCK_VARIANTS)).c, x, y));
  for (const p of game.floor.platforms) {
    if (p.slope) g.drawImage(TB.slope(ts, p.dir ?? 1, p.part ?? 0).c, p.x, p.y);
    else if (p.foot) g.drawImage(TB.slopeFoot(ts, p.foot).c, p.x, p.y);
  }
}

/** What grows on exposed tops and hangs under exposed bottoms (drawn over
 *  ropes and ladders, so they look tied on). */
function drawDecorations(g: Ctx, ts: Tileset): void {
  eachTile((x, y, nb) => {
    const tx = x / TS, ty = y / TS;
    if (!(nb & NB.N) && !TB.sways(ts, variantAt(tx, ty, 1))) {
      const s = TB.topDeco(ts, variantAt(tx, ty, 1), !(nb & NB.W), !(nb & NB.E));
      if (s) g.drawImage(s.c, x - 2, y - TOP_Y);
    }
    if (!(nb & NB.S)) {
      const s = TB.bottomDeco(ts, variantAt(tx, ty, 2));
      if (s) g.drawImage(s.c, x, y + TS);
    }
  });
}

/** An area's props, one canvas each (see props.ts; baked, see artsheets.ts). */
function bakedProps(area: string): HTMLCanvasElement[] {
  const key = PROPS[area] ? area : 'Classic';
  return propsFor(area).map((_, i) => art(`prop/${key}/${i}`));
}

/** Props on exposed tops with ground either side, kept clear of portals,
 *  people, ropes and ladders (they never collide; they just shouldn't hide those). */
function drawProps(g: Ctx, ts: Tileset): void {
  const cs = bakedProps(ts.name);
  const f = game.floor;
  const clear = (x: number, y: number): boolean =>
    !f.portals.some((p) => Math.abs(p.x - x) < 30 && Math.abs(p.y - y) < 8)
    && !(f.npcs ?? []).some((n) => Math.abs(n.x - x) < 24 && Math.abs(n.y - y) < 8)
    && ![...f.ropes, ...f.ladders].some((c) => Math.abs(c.x - x) < 18 && y >= c.y1 - 8 && y <= c.y2 + 8);
  eachTile((x, y, nb) => {
    if (nb & NB.N || !(nb & NB.W) || !(nb & NB.E)) return;
    const i = propAt(ts.name, x / TS, y / TS);
    if (i === null || !clear(x + TS / 2, y)) return;
    g.drawImage(cs[i], x + TS / 2 - PROP_W / 2, y - PROP_H);
  });
}

/** Town decor that holds still, in the town's palette and facing (see
 *  towndecor.ts; baked, see artsheets.ts). The moving pieces are drawn live. */
function drawDecor(g: Ctx, back: boolean): void {
  const pal = townIndex(lastTown(game.floor.place)) % TOWN_PALS.length;
  for (const d of game.floor.decor ?? []) {
    if (BACK_DECOR.has(d.kind) !== back || DECOR_FRAMES[d.kind] > 1) continue;
    const { w, h } = DECOR_SIZE[d.kind];
    g.drawImage(art(`decor/${d.kind}/${pal}/0`, d.flip), Math.round(d.x - w / 2), Math.round(d.y - h));
  }
}

/** Houses stand behind the town's levels, so a chimney (and the air over
 *  it) can be hidden behind a platform: its smoke, drawn over the static
 *  layer, would then hang in front of the platform, so it isn't drawn. */
export function smokeHidden(sx: number, sy: number): boolean {
  const x1 = sx + SMOKE.w, y1 = sy + SMOKE.h + 14; // down to the chimney's base
  return game.floor.platforms.some((p) => p.x < x1 && p.x + p.w > sx && p.y < y1 && p.y + p.h > sy);
}

/** The town's moving decor, each frame over the static layer: flickering
 *  lamps, nodding flowers, rippling awnings, creaking signs, and smoke from
 *  every house's chimney. Each piece runs in its own phase. */
export function drawDecorLive(ctx: Ctx, t: number): void {
  const pal = townIndex(lastTown(game.floor.place)) % TOWN_PALS.length;
  for (const d of game.floor.decor ?? []) {
    const { w, h } = DECOR_SIZE[d.kind], phase = Math.abs(Math.round(d.x * 0.13));
    const x0 = Math.round(d.x - w / 2), y0 = Math.round(d.y - h);
    if (d.kind === 'house') {
      const f = (Math.floor(t * SMOKE.fps) + phase) % SMOKE.frames;
      const sx = x0 + (d.flip ? w - SMOKE.x - SMOKE.w : SMOKE.x), sy = y0 + SMOKE.y - SMOKE.h;
      if (!smokeHidden(sx, sy)) ctx.drawImage(art(`decor/smoke/${f}`, d.flip), sx, sy);
    }
    const n = DECOR_FRAMES[d.kind];
    if (n > 1) ctx.drawImage(art(`decor/${d.kind}/${pal}/${(Math.floor(t * DECOR_FPS) + phase) % n}`, d.flip), x0, y0);
  }
}

/** The swaying plants on exposed tops, each frame over the static layer
 *  (only those in view: x0..x1, y0..y1), a gust rolling along the floor. */
export function drawTopsLive(ctx: Ctx, ts: Tileset, t: number, x0: number, y0: number, x1: number, y1: number): void {
  if (!ts.sway) return;
  eachTile((x, y, nb) => {
    if (nb & NB.N || x < x0 - TS || x > x1 + TS || y < y0 - TS || y > y1 + TS) return;
    const tx = x / TS, ty = y / TS, v = variantAt(tx, ty, 1);
    if (!TB.sways(ts, v)) return;
    const f = Math.floor(t * TB.SWAY_FPS - tx * 0.25) & 3;
    const s = TB.topDeco(ts, v, !(nb & NB.W), !(nb & NB.E), f);
    if (s) ctx.drawImage(s.c, x - 2, y - TOP_Y);
  });
}

/** Tile a 16x16 sprite vertically between y1 and y2 at an integer x. */
function tileVertical(g: Ctx, s: Sprite, x: number, y1: number, y2: number): void {
  for (let y = y1; y < y2; y += 16) {
    const h = Math.min(16, y2 - y);
    g.drawImage(s.c, 0, 0, 16, h, x, y, 16, h);
  }
}

function drawRope(g: Ctx, ts: Tileset, r: Climbable): void {
  tileVertical(g, TB.rope(ts), Math.round(r.x) - 8, Math.round(r.y1), Math.round(r.y2));
}

function drawLadder(g: Ctx, ts: Tileset, l: Climbable): void {
  tileVertical(g, TB.ladder(ts), Math.round(l.x) - 8, Math.round(l.y1), Math.round(l.y2));
}
