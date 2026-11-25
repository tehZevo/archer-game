import type { SkillKey } from './types';

/* ============================================================
   SKILL ICONS
   One 16x16 icon per skill (upgrades and passives included),
   authored as 14x14 glyph grids on a shared framed tile and
   baked once at boot. '.' is transparent (shows the tile).
   ============================================================ */

const PAL: Record<string, string> = {
  o: '#0d1424', // glyph outline
  x: '#dfe7f2', // silver shaft
  a: '#8fd6ff', // cyan glow
  A: '#3f9fdc', // deep cyan
  g: '#ffd166', // gold
  G: '#c9952f', // dark gold
  w: '#c8944a', // wood
  W: '#8a5f2a', // dark wood
  L: '#c8a06a', // rope tan
  e: '#7ef29a', // green
  E: '#2fa85f', // dark green
  r: '#ff9f6b', // orange
  R: '#e0552f', // red
  p: '#c9a6ff', // violet
  s: '#f2d0a9', // skin (boot cuff)
  b: '#7a5232', // boot leather
};

const GLYPHS: Record<SkillKey, string[]> = {
  // Twin Shot: two arrows side by side
  Z: [
    '..............',
    '.g.......a....',
    '.gg.xxxxxaa...',
    '.g.......a....',
    '..............',
    '..............',
    '..............',
    '..............',
    '.g.......a....',
    '.gg.xxxxxaa...',
    '.g.......a....',
    '..............',
    '..............',
    '..............',
  ],
  // Shell Barrage: a fan of green bolts with a stun star
  S: [
    '..........g...',
    '.........ggg..',
    '..........g...',
    '.....eeE......',
    '..eeeeeeE.....',
    '.....eeE......',
    '..............',
    '.eeeeeeeeE....',
    '..............',
    '.....eeE......',
    '..eeeeeeE.....',
    '.....eeE......',
    '..............',
    '..............',
  ],
  // Backstep Shot: arrow forward, chevrons stepping back
  BS: [
    '..............',
    '..............',
    '.......x....a.',
    '........x...aa',
    '.r.r.xxxxxxxaa',
    '........x...aa',
    '.......x....a.',
    '..............',
    '..r...r.......',
    '.r...r........',
    'r...r.........',
    '.r...r........',
    '..r...r.......',
    '..............',
  ],
  // Jump: a boot springing up
  C: [
    '......a.......',
    '.....aaa......',
    '....a.a.a.....',
    '......a.......',
    '......a.......',
    '..............',
    '....ssss......',
    '....bbbb......',
    '....bbbb......',
    '....bbbbbb....',
    '...bbbbbbbb...',
    '...bbbbbbbb...',
    '..............',
    '.aa.aa.aa.aa..',
  ],
  // Glide: a feather with a swoosh
  D: [
    '..........xx..',
    '.........xaax.',
    '........xaaax.',
    '.......xaaaax.',
    '......xaaaax..',
    '.....xaaaax...',
    '....xaaaax....',
    '...xaaaax.....',
    '...xaaax......',
    '..x.xxx.......',
    '.x............',
    'x.............',
    '..AA..AAAA....',
    '....AAA..AAA..',
  ],
  // Sky Toss: a horn of light bursting up from the ground
  // Electric Blitz: a lightning bolt
  EB: [
    '.......aa.....',
    '......aaaa....',
    '.....aaaaa....',
    '....aaaaaa....',
    '...aaaaaaaa...',
    '..aaaaaaaaa...',
    '....aaaaaa....',
    '.....aaaa.....',
    '......aaa.....',
    '.....aaa......',
    '....aaa.......',
    '...aaa........',
    '..aaa.........',
    '..............',
  ],
  Q: [
    '......aa......',
    '.....aaaa.....',
    '....aaaaaa....',
    '......xx......',
    '......xx......',
    '......xx......',
    '......xx......',
    '..a...xx...a..',
    '...a..xx..a...',
    '....a.xx.a....',
    '......xx......',
    '..gggggggggg..',
    '.GGGGGGGGGGGG.',
    '..............',
  ],
  // Vault Shot: a backward leap arc over a launched arrow
  VS: [
    '..............',
    '.....rrrr.....',
    '...rr....rr...',
    '..r........r..',
    '.r..........r.',
    '.r..........R.',
    'RRR...........',
    '.R............',
    '..............',
    '.......a......',
    '......aaa.....',
    '.......x......',
    '.......x......',
    '..gggggggggg..',
  ],
  // Rising Arrow: an arrow climbing beside a launched target, with lift lines
  RA: [
    '......a.......',
    '.....aaa......',
    '....a.x.a.....',
    '......x....r..',
    '..a...x...rRr.',
    '..a...x....r..',
    '......x.......',
    '..a...x...a...',
    '..a...x...a...',
    '......x.......',
    '.....w.w......',
    '..............',
    '..gggggggggg..',
    '.GGGGGGGGGGGG.',
  ],
  // Skyfall Volley: arrows raining down at an angle
  W: [
    '..x.....x.....',
    '...x.....x....',
    '....x.....x...',
    '.....a.....a..',
    '....aaa...aaa.',
    '..............',
    '.....x.....x..',
    '......x.....x.',
    '.......x......',
    '........a.....',
    '.......aaa....',
    '..............',
    '.gggggggggggg.',
    '..............',
  ],
  // Sky Assault: rising chevrons with strike slashes
  AB: [
    '......aa......',
    '.....aaaa.....',
    '....aa..aa....',
    '...aa....aa...',
    '..............',
    '......aa......',
    '.....aaaa.....',
    '....aa..aa....',
    '...aa....aa...',
    '..............',
    '.x..........x.',
    '..x...xx...x..',
    '...x..xx..x...',
    '......xx......',
  ],
  // Plunging Volley: three arrows driving straight down onto a target
  E: [
    '..g...g...g...',
    '..x...x...x...',
    '..x...x...x...',
    '..x...x...x...',
    '..x...x...x...',
    '..x...x...x...',
    '.aaa.aaa.aaa..',
    '..a...a...a...',
    '..............',
    '...RRRRRRR....',
    '..R.r.r.r.R...',
    '..RRRRRRRRR...',
    '..............',
    '.gggggggggggg.',
  ],
  // Piercing Arrow: one long arrow through two targets
  R: [
    '..............',
    '...RRR...RRR..',
    '..R...R.R...R.',
    '.R..r..R..r..R',
    '.R.rrr.R.rrr.R',
    'gxxxxxxxxxxxxa',
    'gxxxxxxxxxxxxa',
    '.R.rrr.R.rrr.R',
    '.R..r..R..r..R',
    '..R...R.R...R.',
    '...RRR...RRR..',
    '..............',
    '..............',
    '..............',
  ],
  // Precision: a crosshair
  SA: [
    '......g.......',
    '......g.......',
    '....GGgGG.....',
    '...G..g..G....',
    '..G...g...G...',
    '..G.......G...',
    'gggggg.gggggg.',
    '..G.......G...',
    '..G...g...G...',
    '...G..g..G....',
    '....GGgGG.....',
    '......g.......',
    '......g.......',
    '..............',
  ],
  // Haste: an arrowhead with speed lines trailing it
  HA: [
    '..............',
    '..............',
    '.........gg...',
    'aaaa......gg..',
    '...........gg.',
    'AAAAA.xxxxxxgg',
    '...........gg.',
    'aaaa......gg..',
    '.........gg...',
    '..............',
    '.AAA..........',
    '..............',
    '..............',
    '..............',
  ],
  // Power Surge: a lightning bolt
  PP: [
    '........rr....',
    '.......rr.....',
    '......rr......',
    '.....rr.......',
    '....rrrrrr....',
    '.......rr.....',
    '......rr......',
    '.....rr.......',
    '....rr........',
    '...rrrrrr.....',
    '......rr......',
    '.....rr.......',
    '....r.........',
    '..............',
  ],
  // Agile Climbing: a rope ladder
  AC: [
    '.....LLLL.....',
    '.....L..L.....',
    '.....L..L.....',
    '.....LLLL.....',
    '.....L..L.....',
    '.....L..L.....',
    '.....LLLL.....',
    '.....L..L.....',
    '.....L..L.....',
    '.....LLLL.....',
    '.....L..L.....',
    '.....L..L.....',
    '.....LLLL.....',
    '.....L..L.....',
  ],
  // Fervor: a flame
  IR: [
    '......R.......',
    '.....RR.......',
    '.....RRR..R...',
    '....RRRR.RR...',
    '...RRrRRRRR...',
    '...RrrrRRRR...',
    '..RRrrrrRRRR..',
    '..RrrgrrrRRR..',
    '..RrrggrrrRR..',
    '..RrgggggrRR..',
    '..RrgggggrrR..',
    '...RrgggrrR...',
    '....RRRRRR....',
    '..............',
  ],
};

export const ICON_KEYS = Object.keys(GLYPHS) as SkillKey[];

/** The raw glyphs (for tests). */
export const ICON_GLYPHS = GLYPHS;

function bake(glyph: string[]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  // the shared tile: dark fill, lighter frame
  x.fillStyle = '#3c5478'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#14203a'; x.fillRect(1, 1, 14, 14);
  glyph.forEach((row, gy) => {
    for (let gx = 0; gx < 14; gx++) {
      const col = PAL[row[gx]];
      if (col) { x.fillStyle = col; x.fillRect(gx + 1, gy + 1, 1, 1); }
    }
  });
  return c;
}

let baked: Record<SkillKey, HTMLCanvasElement> | null = null;
/** 16x16 icon for a skill (baked on first use). */
export function skillIcon(k: SkillKey): HTMLCanvasElement {
  baked ??= Object.fromEntries(ICON_KEYS.map((key) => [key, bake(GLYPHS[key])])) as Record<SkillKey, HTMLCanvasElement>;
  return baked[k];
}
