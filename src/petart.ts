import { fillRect, newGrid, type Grid } from './grid';

/* ============================================================
   PET ART
   The four pets the pet keeper sells, each its own little creature
   (facing right, two frames of flapping / floating), and the keeper
   herself. Character grids: a palette key per pixel, '.' clear.
   Baked to PNG with the rest of the scenery (artsheets.ts:
   pet/<kind>/<frame>, npc/pets/<frame>).
   ============================================================ */

export type PetKind = 'goldfinch' | 'owl' | 'sprite' | 'puff';
export const PET_FRAMES = 2;

const OUT = '#0d1424';

interface PetArt { pal: Record<string, string>; frames: string[][] }

/* Goldfinch: a round gold bird with a white wing beating over its back. */
const GOLDFINCH: PetArt = {
  pal: { o: '#7a5414', y: '#ffd166', Y: '#e0a83a', k: OUT, b: '#ff8a3a', w: '#ffffff', W: '#c8d4e8' },
  frames: [[
    '............',
    '.ww.........',
    '.wWw..oooo..',
    '..wWwoyyyyo.',
    '...wWyyyykyb',
    '....oyyyyyyo',
    '....oYyyyyYo',
    '.....oYYYYo.',
    '............',
    '............',
  ], [
    '............',
    '............',
    '......oooo..',
    '.....oyyyyo.',
    '....oyyyykyb',
    '.wwwwyyyyyyo',
    '..wWWWyyyyYo',
    '...wWoYYYYo.',
    '....w.......',
    '............',
  ]],
};

/* Swift Owl: slate blue with ear tufts, a pale face disc round big yellow
   eyes, and broad wings swept up and down. */
const OWL: PetArt = {
  pal: { o: '#1a2236', B: '#5a6e9a', b: '#3e4e74', f: '#e8e0d0', y: '#ffd84a', k: OUT, n: '#e0a83a', w: '#8a9cc4' },
  frames: [[
    'w..........w',
    'ww.o....o.ww',
    '.wwBo..oBww.',
    '.wbBBBBBBbw.',
    '..oBffBffBo.',
    '..ofykfykfo.',
    '..oBffnffBo.',
    '..oBBbBbBBo.',
    '...obBBBbo..',
    '....oo.oo...',
  ], [
    '............',
    '...o....o...',
    '...Bo..oB...',
    '..oBBBBBBo..',
    '..oBffBffBo.',
    'w.ofykfykfo.w',
    'wwoBffnffBoww',
    '.wwBBbBbBBww.',
    '..wobBBBbow..',
    '....oo.oo...',
  ]],
};

/* Leaf Sprite: a little green bud of a creature with a leaf sprouting
   from its head and a pair of glassy dragonfly wings. */
const SPRITE: PetArt = {
  pal: { o: '#1e3a1e', g: '#7ed46a', G: '#4fa84a', l: '#b8f070', L: '#3a8a3a', k: OUT, c: '#ff9ab0', w: '#c8f4ff', W: '#8ad8f0' },
  frames: [[
    '.......ll...',
    '.ww...lLl...',
    'wWWw...L....',
    '.wWWw.ooo...',
    '..wwoggggo..',
    '....oggkgko.',
    '....oggcgco.',
    '....oGggggo.',
    '.....oGGGo..',
    '......ooo...',
  ], [
    '......ll....',
    '.....lLl....',
    '.......L....',
    '......ooo...',
    '..wwoggggo..',
    '.wWWwggkgko.',
    'wWWw.ggcgco.',
    '.ww.oGggggo.',
    '.....oGGGo..',
    '......ooo...',
  ]],
};

/* Star Puff: a soft pink cloud with a gold star on top, rosy cheeks and a
   twinkle orbiting it as it bobs. */
const PUFF: PetArt = {
  pal: { o: '#7a4a6a', p: '#ffd8ec', P: '#f0a8cc', s: '#ffe14d', S: '#d9a400', k: OUT, c: '#ff7aa8', t: '#ffffff' },
  frames: [[
    '.....s......',
    '....sSs.....',
    '.t...s......',
    '...oooooo...',
    '..oppppppo..',
    '.opppkppkpo.',
    '.oppcppppco.',
    '.oPpppppPpo.',
    '..oPPoPPPo..',
    '...oo.ooo...',
  ], [
    '............',
    '.....s.....t',
    '....sSs.....',
    '...oosooo...',
    '..oppppppo..',
    '.opppkppkpo.',
    '.oppcppppco.',
    '.oPpppppPpo.',
    '..oPPPPPPo..',
    '...oooooo...',
  ]],
};

const PET_ART: Record<PetKind, PetArt> = { goldfinch: GOLDFINCH, owl: OWL, sprite: SPRITE, puff: PUFF };
/** Every pet, in the keeper's order (cheapest first). */
export const PET_LIST = Object.keys(PET_ART) as PetKind[];

/** A pet's frame as pixels. */
export function petGrid(kind: PetKind, frame: number): Grid {
  const { pal, frames } = PET_ART[kind], rows = frames[frame % PET_FRAMES];
  // every frame the same size (the widest), so the pet doesn't jitter
  const g = newGrid(Math.max(...frames.flat().map((r) => r.length)), rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) fillRect(g, x, y, 1, 1, pal[ch]); }));
  return g;
}

/** Every pet's rows (for checks: sizes, palettes). */
export const petRows = (kind: PetKind): string[][] => PET_ART[kind].frames;
export const petPal = (kind: PetKind): Record<string, string> => PET_ART[kind].pal;
