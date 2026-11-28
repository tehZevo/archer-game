import { fillRect, newGrid, type Grid } from './grid';

/* ============================================================
   HATS
   The hats a town stylist sells (look.hat: 0 is none, then these
   in order). A hat is its own layer, drawn over the head after the
   archer's frame (see drawHat), so the archer sheets don't need a
   copy per hat. Each is authored facing right on the standing
   frame's grid: `left` and `top` place its first column and row
   there, with the gold circlet at column 7, row 3 (HAT_AT finds the
   circlet in every other frame and moves the hat with it). Baked to
   PNG with the rest of the scenery (artsheets.ts: hat/<n>).
   ============================================================ */

export interface HatDef { name: string; price: number; rows: string[]; pal: Record<string, string>; left: number; top: number }

const OUT = '#1b2235';

export const HATS: HatDef[] = [
  { name: 'STRAW HAT', price: 500, left: 1, top: -2, pal: { y: '#e8c870', Y: '#c8a048', r: '#c8443a' }, rows: [
    '.....oooooo.....',
    '....oyyyyyyo....',
    '....oYyyyyyo....',
    '...orrrrrrrro...',
    '.ooyyyyyyyyyyoo.',
    'oyyyyyyyyyyyyyyo',
    '.oooooooooooooo.',
  ] },
  { name: 'CAP', price: 1500, left: 0, top: 0, pal: { b: '#3a6ad0', B: '#284a98', w: '#ffffff' }, rows: [
    '......oooooo....',
    '.....obbwbbbo...',
    '....obbbbbbbbo..',
    '...obbbbbbbbbooo',
    '...ooooooooBBBBo',
    '...........oooo.',
  ] },
  { name: 'TOP HAT', price: 4000, left: 1, top: -6, pal: { k: '#2a2d3a', K: '#45495a', r: '#a8303a' }, rows: [
    '....ooooooo.....',
    '....oKkkkko.....',
    '....oKkkkko.....',
    '....oKkkkko.....',
    '....oKkkkko.....',
    '....oKkkkko.....',
    '....orrrrro.....',
    '....oKkkkko.....',
    '..ooKkkkkkkoo...',
    '..okkkkkkkkkko..',
    '..oooooooooooo..',
  ] },
  { name: 'WIZARD HAT', price: 10000, left: 1, top: -8, pal: { b: '#4a4ab8', B: '#34348a', y: '#ffd166' }, rows: [
    '.oo.............',
    'obbo............',
    '.oBbo...........',
    '..oBbo..........',
    '...oBbo.........',
    '...oBbbo........',
    '...oBbybo.......',
    '..oBbbbbbo......',
    '..oBbbbbbbo.....',
    '.oBbbbybbbbo....',
    '.oBbbbbbbbbbo...',
    'oyyyyyyyyyyyyo..',
    '.oooooooooooo...',
  ] },
  { name: 'CROWN', price: 25000, left: 0, top: -2, pal: { y: '#ffd166', Y: '#c9952f', r: '#e0405a', b: '#5ab0ff' }, rows: [
    '....o...o...o...',
    '...oyo.oyo.oyo..',
    '...oyyoyyyoyyo..',
    '...oyyyyyyyyyo..',
    '...oyryybyyryo..',
    '...oYYYYYYYYYo..',
    '...ooooooooooo..',
  ] },
];

/** Where the circlet sits on the standing frame (each hat's `left` / `top` count from there). */
export const CIRCLET = { x: 7, y: 3 };

/** Hat `n` (1 = the first in HATS) as pixels. */
export function hatGrid(n: number): Grid {
  const { rows, pal } = HATS[n - 1], all: Record<string, string> = { o: OUT, ...pal };
  const g = newGrid(rows[0].length, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (all[ch]) fillRect(g, x, y, 1, 1, all[ch]); }));
  return g;
}
