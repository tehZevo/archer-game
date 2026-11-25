import type { DecorKind } from './types';

/* ============================================================
   TOWN DECOR
   Buildings and street furniture for towns: houses, a tower, lamps,
   benches, crates, barrels, flower boxes, a well, signposts, the shop's
   awning, fences. Painted in code like props.ts, each on its own
   canvas (DECOR_SIZE) whose bottom edge is the ground, centred on x.
   Each town gets a palette by its area id (roofs, cloth, walls), so
   towns differ from one another. Purely visual: nothing collides.
   ============================================================ */

export type DecorPaint = (x: number, y: number, col: string, w?: number, h?: number) => void;

export const DECOR_SIZE: Record<DecorKind, { w: number; h: number }> = {
  house: { w: 56, h: 46 }, tower: { w: 30, h: 64 }, lamp: { w: 10, h: 28 }, bench: { w: 20, h: 9 },
  crate: { w: 12, h: 12 }, barrel: { w: 10, h: 12 }, flowers: { w: 16, h: 9 }, well: { w: 24, h: 28 },
  sign: { w: 14, h: 18 }, awning: { w: 28, h: 30 }, fence: { w: 32, h: 10 },
};
/** Big pieces stand behind the town's levels; the rest stand in front of them (but behind people). */
export const BACK_DECOR: ReadonlySet<DecorKind> = new Set(['house', 'tower', 'well']);

export interface TownPal { roof: string; roofDk: string; wall: string; wallDk: string; cloth: string; cloth2: string }
/** Town palettes, picked by area id. */
export const TOWN_PALS: TownPal[] = [
  { roof: '#c8503a', roofDk: '#8a3424', wall: '#f0e2c4', wallDk: '#c8b48e', cloth: '#e85a4a', cloth2: '#f8f0e0' },
  { roof: '#3a6ab0', roofDk: '#24447a', wall: '#f4ecd8', wallDk: '#cabd9c', cloth: '#4a8ae8', cloth2: '#ffffff' },
  { roof: '#4a8a3a', roofDk: '#2e5e24', wall: '#e8dcc0', wallDk: '#b8a684', cloth: '#5aa84a', cloth2: '#f0e8c0' },
  { roof: '#8a4a9a', roofDk: '#5a2e66', wall: '#ece0e8', wallDk: '#bca8b8', cloth: '#b46ad0', cloth2: '#fff0fa' },
  { roof: '#b8862a', roofDk: '#7e5a18', wall: '#f2e6cc', wallDk: '#c4b08a', cloth: '#f0c040', cloth2: '#8a3424' },
  { roof: '#5a6070', roofDk: '#3a3e4a', wall: '#d8d4cc', wallDk: '#a8a49c', cloth: '#c84040', cloth2: '#e8e8e8' },
  { roof: '#2a8a8a', roofDk: '#1a5a5a', wall: '#f0ead8', wallDk: '#c4bca4', cloth: '#3ac0b0', cloth2: '#fff4d0' },
];
export const townPal = (areaId: number): TownPal => TOWN_PALS[areaId % TOWN_PALS.length];

const OUT = '#2a2018', WOOD = '#8a5e3a', WOOD_DK = '#5e3e24', STONE = '#9a96a0', STONE_DK = '#6a6670', GLASS = '#ffd98a', GLOW = '#fff4c0';

/** A sloped roof from (x0, y0) `w` wide and `h` tall, overhanging by a pixel. */
function roof(p: DecorPaint, x0: number, y0: number, w: number, h: number, c: TownPal): void {
  for (let y = 0; y < h; y++) {
    const inset = Math.round(((h - 1 - y) / h) * (w / 2 - 3));
    p(x0 + inset, y0 + y, y === h - 1 ? c.roofDk : c.roof, w - inset * 2, 1);
    p(x0 + inset, y0 + y, OUT, 1, 1); p(x0 + w - inset - 1, y0 + y, OUT, 1, 1);
    if (y % 3 === 2 && y < h - 1) p(x0 + inset + 2, y0 + y, c.roofDk, w - inset * 2 - 4, 1); // shingle rows
  }
}
/** A lit window with a cross frame. */
function window(p: DecorPaint, x: number, y: number, c: TownPal): void {
  p(x - 1, y - 1, c.wallDk, 8, 8); p(x, y, GLASS, 6, 6); p(x + 1, y + 1, GLOW, 2, 2); p(x + 3, y, c.wallDk, 1, 6); p(x, y + 3, c.wallDk, 6, 1);
}

export const DECOR: Record<DecorKind, (p: DecorPaint, c: TownPal) => void> = {
  house: (p, c) => {
    const { w, h } = DECOR_SIZE.house, wy = h - 26;
    p(40, 2, STONE_DK, 6, 12); p(41, 1, STONE, 4, 2); // chimney
    p(4, wy, OUT, 48, 26); p(5, wy, c.wall, 46, 26); p(5, h - 3, c.wallDk, 46, 3);
    for (const x of [5, 27, 50]) p(x, wy, WOOD_DK, 1, 26); // timber frame
    p(5, wy + 11, WOOD_DK, 46, 1);
    roof(p, 0, 4, w, wy - 3, c);
    p(30, h - 15, OUT, 12, 15); p(31, h - 14, WOOD, 10, 14); p(36, h - 14, WOOD_DK, 1, 14); p(39, h - 8, GLASS, 1, 1); // door
    window(p, 11, wy + 3, c); window(p, 11, wy + 15, c);
  },
  tower: (p, c) => {
    const { h } = DECOR_SIZE.tower, wy = 18;
    p(4, wy, OUT, 22, h - wy); p(5, wy, STONE, 20, h - wy);
    for (let y = wy + 4; y < h; y += 6) for (let x = 5 + ((y / 6) % 2) * 4; x < 25; x += 8) p(x, y, STONE_DK, 5, 1); // courses
    for (let y = 0; y < 18; y++) { const half = Math.round((y + 1) * 13 / 18); p(15 - half, y + 1, y === 17 ? c.roofDk : c.roof, half * 2, 1); p(15 - half, y + 1, OUT); p(14 + half, y + 1, OUT); }
    p(14, 0, OUT, 2, 2); p(16, 0, c.cloth, 4, 2); // a pennant
    window(p, 12, wy + 6, c); window(p, 12, wy + 24, c);
    p(11, h - 12, OUT, 8, 12); p(12, h - 11, WOOD, 6, 11);
  },
  lamp: (p) => {
    const { h } = DECOR_SIZE.lamp;
    p(4, 6, OUT, 2, h - 6); p(2, h - 2, OUT, 6, 2);
    p(1, 0, OUT, 8, 8); p(2, 1, GLASS, 6, 6); p(3, 2, GLOW, 4, 4); p(1, 0, OUT, 8, 1);
  },
  bench: (p) => {
    p(0, 0, WOOD_DK, 20, 2); p(0, 4, WOOD, 20, 2); p(0, 6, WOOD_DK, 20, 1);
    p(2, 2, OUT, 2, 7); p(16, 2, OUT, 2, 7);
  },
  crate: (p) => {
    p(0, 0, OUT, 12, 12); p(1, 1, WOOD, 10, 10); p(1, 1, '#a87a4e', 10, 1);
    for (let i = 0; i < 10; i++) p(1 + i, 1 + i, WOOD_DK); // a brace
  },
  barrel: (p) => {
    for (let y = 0; y < 12; y++) { const bulge = y > 1 && y < 10 ? 0 : 1; p(bulge, y, y === 2 || y === 9 ? '#3a3e48' : WOOD, 10 - bulge * 2, 1); }
    p(0, 0, OUT, 10, 1); p(2, 3, '#a87a4e', 1, 6);
  },
  flowers: (p, c) => {
    p(0, 4, OUT, 16, 5); p(1, 5, WOOD, 14, 3);
    for (const [x, col] of [[1, c.cloth], [5, '#ffd040'], [9, c.cloth2], [12, c.cloth]] as const) { p(x + 1, 2, '#4a8a3a', 1, 2); p(x, 0, col, 3, 2); }
  },
  well: (p, c) => {
    const { h } = DECOR_SIZE.well;
    p(2, h - 10, OUT, 20, 10); p(3, h - 9, STONE, 18, 9); p(3, h - 9, '#c8c4cc', 18, 1);
    for (let x = 4; x < 20; x += 5) p(x, h - 5, STONE_DK, 3, 1);
    p(4, 8, WOOD_DK, 2, h - 18); p(18, 8, WOOD_DK, 2, h - 18); p(4, 12, WOOD_DK, 16, 1); // posts and crossbar
    p(11, 13, '#c8c4cc', 1, 4); p(10, 17, WOOD, 4, 3); // the bucket
    roof(p, 0, 0, 24, 9, c);
  },
  sign: (p, c) => {
    const { h } = DECOR_SIZE.sign;
    p(6, 6, WOOD_DK, 2, h - 6);
    p(0, 0, OUT, 14, 8); p(1, 1, WOOD, 12, 6);
    p(5, 2, c.cloth2 === '#ffffff' ? '#f4ecd8' : c.cloth2, 4, 1); p(6, 3, c.cloth2, 2, 2); p(4, 4, c.cloth2, 6, 1); p(5, 5, c.cloth2, 4, 1); // an arrow, down
  },
  awning: (p, c) => {
    const { h } = DECOR_SIZE.awning;
    p(1, 6, WOOD_DK, 2, h - 6); p(25, 6, WOOD_DK, 2, h - 6);
    for (let x = 0; x < 28; x++) {
      const col = Math.floor(x / 4) % 2 ? c.cloth2 : c.cloth;
      p(x, 0, col, 1, 6);
      if (x % 4 < 3) p(x, 6, col, 1, x % 4 === 1 ? 2 : 1); // scalloped edge
    }
    p(0, 0, OUT, 28, 1);
    p(3, h - 10, OUT, 22, 2); p(4, h - 10, WOOD, 20, 1); // the counter
  },
  fence: (p) => {
    for (let x = 1; x < 32; x += 6) { p(x, 1, WOOD, 3, 9); p(x + 1, 0, WOOD, 1, 1); }
    p(0, 3, WOOD_DK, 32, 2); p(0, 7, WOOD_DK, 32, 1);
  },
};

/** Paint one decoration (mirrored if `flip`) with a town's palette. */
export function paintDecor(kind: DecorKind, c: TownPal, p: DecorPaint, flip = false): void {
  const W = DECOR_SIZE[kind].w;
  DECOR[kind](flip ? (x, y, col, w = 1, h = 1) => p(W - x - w, y, col, w, h) : p, c);
}
