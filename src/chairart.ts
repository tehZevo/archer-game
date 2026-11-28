import { fillRect, newGrid, type Grid } from './grid';

/* ============================================================
   CHAIR ART
   The four chairs the chair merchant sells (chairs.ts). Each is a
   16px-wide grid, seen side on with its back to the left (the archer
   faces right sitting on it, and both are mirrored together when she
   faces left). Column 8 sits under her middle, the bottom row on the
   ground. A chair is drawn behind her; she sits with her thighs on its
   seat (seatHeight is how high that is). Baked to PNG with the rest of the
   scenery (artsheets.ts: chair/<kind>).
   ============================================================ */

export const CHAIR_LIST = ['stool', 'wooden', 'armchair', 'throne'] as const;
export type ChairKind = typeof CHAIR_LIST[number];

const OUT = '#0d1424';

/* A three-legged milking stool: a round pale-wood top on splayed legs. */
const STOOL = [
  '....oooooooo....',
  '...owwwwwwwwo...',
  '...oWWWWWWWWo...',
  '....ooWooWoo....',
  '....oWo..oWo....',
  '...oWo....oWo...',
  '...oWo....oWo...',
  '...ooo....ooo...',
];

/* A ladder-back kitchen chair: two rungs across its tall back, a plank seat. */
const WOODEN = [
  '.oooo...........',
  '.owwo...........',
  '.oWWo...........',
  '.owwo...........',
  '.oWWo...........',
  '.owwo...........',
  '.oWWo...........',
  '.owwo...........',
  '.owwoooooooooo..',
  '.owwwwwwwwwwwwo.',
  '.oWWWWWWWWWWWWo.',
  '.oWWooooooooWWo.',
  '.oWWo......oWWo.',
  '.oWWo......oWWo.',
  '.oWWo......oWWo.',
  '.oooo......oooo.',
];

/* A deep red armchair: a buttoned plush back, a fat cushion with gold
   piping, on stubby turned feet. */
const ARMCHAIR = [
  '.ooooo..........',
  'orrrrro.........',
  'orRrrro.........',
  'orrrrRo.........',
  'orRrrro.........',
  'orrrrRo.........',
  'orRrrro.........',
  'orrrrrooooooooo.',
  'orrrrrrrrrrrrrro',
  'oyyyyyyyyyyyyyyo',
  'oRRRRRRRRRRRRRRo',
  'oRRRRRRRRRRRRRRo',
  '.oWWoooooooWWo..',
  '.oooo.....oooo..',
];

/* A gilded throne: a tall gold back crowned with a ruby, a red velvet
   panel set into it, a gold seat on a stepped plinth. */
const THRONE = [
  '...o............',
  '..ogo...........',
  '.ogego..........',
  '.oggo...........',
  'oggggo..........',
  'ogrrgo..........',
  'ogrRgo..........',
  'ogrrgo..........',
  'ogrRgo..........',
  'ogrrgo..........',
  'ogrRgo..........',
  'ogrrgo..........',
  'ogrRgo..........',
  'ogrrgoooooooooo.',
  'ogggggrrrrrrrrgo',
  'oGGGGGGGGGGGGGGo',
  'oGggggggggggggGo',
  '.oGGo......oGGo.',
  '.oGgo......oGgo.',
  'oGGGGo....oGGGGo',
  'oooooo....oooooo',
];

const ART: Record<ChairKind, { rows: string[]; pal: Record<string, string> }> = {
  stool: { rows: STOOL, pal: { w: '#d9b07a', W: '#9a6a3a' } },
  wooden: { rows: WOODEN, pal: { w: '#b0783e', W: '#7a4e26' } },
  armchair: { rows: ARMCHAIR, pal: { r: '#c8404a', R: '#8a2a34', y: '#ffd166', W: '#5e3b1f' } },
  throne: { rows: THRONE, pal: { g: '#ffd166', G: '#c9952f', r: '#b8303e', R: '#7a1e2a', e: '#ff5a6e' } },
};

/** How high (px, from the ground) a chair's seat is: from the bottom row up to
 *  the top of the seat's outline, under where the archer's knees go (column 10). */
export function seatHeight(kind: ChairKind): number {
  const rows = ART[kind].rows;
  return rows.length - rows.findIndex((r) => r[10] !== '.');
}

/** A chair as pixels. */
export function chairGrid(kind: ChairKind): Grid {
  const { rows, pal } = ART[kind], all: Record<string, string> = { o: OUT, ...pal };
  const g = newGrid(rows[0].length, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (all[ch]) fillRect(g, x, y, 1, 1, all[ch]); }));
  return g;
}
