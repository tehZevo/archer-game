import type { SkillKey } from './types';

/* ============================================================
   SKILL ICONS
   One 12x12 icon per skill (upgrades and passives included),
   authored as 10x10 glyph grids on a shared framed tile and
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
  // skill colours: each attack reads by its hue (effects use the same, fxsprites.ts)
  y: '#ffe14d', Y: '#d9a400', // Air Dive yellow
  P: '#9b5cff', D: '#4a2390', // Spike Lift / Tempest purple
  k: '#ff8ad8', // Tempest pink
  i: '#bfeeff', I: '#6cc8f5', // Sky Assault light blue
  n: '#ff5a4a', // Midair Spin red highlight
};

const GLYPHS: Record<SkillKey, string[]> = {
  // Twin Shot: two arrows side by side
  Z: [
    '..........',
    '.g....a...',
    '.gg.xxaa..',
    '.g....a...',
    '..........',
    '..........',
    '.g....a...',
    '.gg.xxaa..',
    '.g....a...',
    '..........',
  ],
  // Shell Barrage: a fan of green bolts with a stun star
  S: [
    '.......g..',
    '......ggg.',
    '..eeE..g..',
    'eeeeeE....',
    '..eeE.....',
    '..........',
    'eeeeeeeE..',
    '..........',
    '..eeE.....',
    'eeeeeE....',
  ],
  // Jump: a boot springing up
  C: [
    '....a.....',
    '...aaa....',
    '..a.a.a...',
    '....a.....',
    '..........',
    '...sss....',
    '...bbb....',
    '...bbbbb..',
    '..bbbbbbb.',
    '.aa.aa.aa.',
  ],
  // Glide: a feather with a swoosh
  D: [
    '.......xx.',
    '......xaax',
    '.....xaaax',
    '....xaaax.',
    '...xaaax..',
    '..xaaax...',
    '..xaax....',
    '.x.xx.....',
    'x.AA.AAA..',
    '...AAA.AA.',
  ],
  // Sky Toss: an arrow launching up off the ground, with lift lines
  Q: [
    '....aa....',
    '...aaaa...',
    '..aaaaaa..',
    '....xx....',
    '....xx....',
    '.a..xx..a.',
    '..a.xx.a..',
    '...axxa...',
    'gggggggggg',
    '.GGGGGGGG.',
  ],
  // Electric Blitz: a lightning bolt
  EB: [
    '.....aa...',
    '....aaa...',
    '...aaaa...',
    '..aaaaaa..',
    '.aaaaaaa..',
    '...aaaa...',
    '....aaa...',
    '...aaa....',
    '..aaa.....',
    '.aaa......',
  ],
  // Rising Arrow: an arrow climbing beside a launched target, with lift lines
  RA: [
    '....a.....',
    '...aaa....',
    '..a.x.a.r.',
    '....x..rRr',
    '.a..x...r.',
    '.a..x.....',
    '....x..a..',
    '....x..a..',
    '...w.w....',
    'gggggggggg',
  ],
  // Skyfall Volley: arrows raining down at an angle
  W: [
    '.x....x...',
    '..x....x..',
    '...a....a.',
    '..aaa..aaa',
    '..........',
    '....x....x',
    '.....x....',
    '......a...',
    '.....aaa..',
    'gggggggggg',
  ],
  // Sky Assault: rising chevrons with strike slashes
  AB: [
    '....ii....',
    '...iiii...',
    '..ii..ii..',
    '..........',
    '....ii....',
    '...iiii...',
    '..ii..ii..',
    '..........',
    '.I..II..I.',
    '..I.II.I..',
  ],
  // Spike Lift: purple spikes erupting from the ground
  E: [
    '....p.....',
    '....p.....',
    '...pPp....',
    '.p.pPp.p..',
    '.p.PPP.p..',
    'pPpPPPpPp.',
    'pPPPPPPPP.',
    'PPPPPPPPPp',
    'DDDDDDDDDD',
    '.D.D..D.D.',
  ],
  // Echo Shot: an arrow with a ghosted twin firing behind it
  ES: [
    '.......aa.',
    '......aaa.',
    '.....xaa..',
    '....x.....',
    '...x......',
    '..x.......',
    '.y....yy..',
    'yy...yyy..',
    '.y..y.....',
    '...y......',
  ],
  // Air Dive: an arrow diving down-right, with a speed streak
  AD: [
    'yy........',
    'yyy....YY.',
    '.yyy..YYY.',
    '..yyyYYYY.',
    '...yyYYY..',
    '....YY....',
    '....Y.....',
    '..........',
    '.b........',
    'bb........',
  ],
  // Midair Spin: a circular blade arc
  MS: [
    '...RRRR...',
    '.RR....RR.',
    '.R..n...R.',
    'R...n....R',
    'R..nnn...R',
    'R...n....R',
    '.R..n...R.',
    '.RR....RR.',
    '...RRRR...',
    '..........',
  ],
  // Plunging Volley: orange arrows (green fletching) raining onto a green target
  PV: [
    '.e..e..e..',
    '.r..r..r..',
    '.r..r..r..',
    '.r..r..r..',
    'RrRRrRRrR.',
    '.R..R..R..',
    '..........',
    '.EEEEEEE..',
    'E.e.e.e.E.',
    'EEEEEEEEE.',
  ],
  // Tempest: a purple storm ring with a pink swirl inside
  R: [
    '...PPPP...',
    '.PP....PP.',
    'P..kkk...P',
    'P.k...k..P',
    'P.k.P.k..P',
    'P.k...k..P',
    'P..kkk...P',
    '.PP....PP.',
    '...PPPP...',
    '..........',
  ],
  // Precision: a crosshair
  SA: [
    '....g.....',
    '...GgG....',
    '..G.g.G...',
    '.G.....G..',
    'gggg.gggg.',
    '.G.....G..',
    '..G.g.G...',
    '...GgG....',
    '....g.....',
    '..........',
  ],
  // Haste: an arrowhead with speed lines trailing it
  HA: [
    '..........',
    '.......g..',
    'aaa.....g.',
    'AAAAxxxxgg',
    'aaa.....g.',
    '.......g..',
    '..........',
    '.AAA......',
    '..........',
    '..........',
  ],
  // Power Surge: a lightning bolt
  PP: [
    '......rr..',
    '.....rr...',
    '....rr....',
    '...rrrrr..',
    '.....rr...',
    '....rr....',
    '...rr.....',
    '..rrrrr...',
    '....rr....',
    '...r......',
  ],
  // Agile Climbing: a rope ladder
  AC: [
    '...LLLL...',
    '...L..L...',
    '...LLLL...',
    '...L..L...',
    '...LLLL...',
    '...L..L...',
    '...LLLL...',
    '...L..L...',
    '...LLLL...',
    '...L..L...',
  ],
  // Fervor: a flame
  IR: [
    '....R.....',
    '...RR..R..',
    '...RRRRR..',
    '..RRrRRR..',
    '.RRrrrRRR.',
    '.RrrgrrRR.',
    '.RrgggrrR.',
    '.RrgggrrR.',
    '..RrgrrR..',
    '...RRRR...',
  ],
};

export const ICON_KEYS = Object.keys(GLYPHS) as SkillKey[];

/** The raw glyphs (for tests). */
export const ICON_GLYPHS = GLYPHS;

/** Icon size in px: a GLYPH x GLYPH grid inside a 1px frame. */
export const ICON = 12;
export const GLYPH = ICON - 2;

function bake(glyph: string[]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = ICON; c.height = ICON;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  // the shared tile: dark fill, lighter frame
  x.fillStyle = '#3c5478'; x.fillRect(0, 0, ICON, ICON);
  x.fillStyle = '#14203a'; x.fillRect(1, 1, GLYPH, GLYPH);
  glyph.forEach((row, gy) => {
    for (let gx = 0; gx < GLYPH; gx++) {
      const col = PAL[row[gx]];
      if (col) { x.fillStyle = col; x.fillRect(gx + 1, gy + 1, 1, 1); }
    }
  });
  return c;
}

let baked: Record<SkillKey, HTMLCanvasElement> | null = null;
/** A skill's icon (baked on first use). */
export function skillIcon(k: SkillKey): HTMLCanvasElement {
  baked ??= Object.fromEntries(ICON_KEYS.map((key) => [key, bake(GLYPHS[key])])) as Record<SkillKey, HTMLCanvasElement>;
  return baked[k];
}
