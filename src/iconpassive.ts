import type { SkillKey } from './types';

/** Glyphs for the passive skills. 10x10, in iconpal.ts's colours (see icons.ts). */
export const PASSIVE_GLYPHS: Partial<Record<SkillKey, string[]>> = {
  // Twin Echoes: an arrow with a ghosted twin firing behind it
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
  // Acrobatics: a rope ladder
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
  // Nimble: a boot (quick on her feet)
  NI: [
    '..........',
    '.......aa.',
    '......aaa.',
    '.....aaa..',
    '....aaa...',
    '...aaa....',
    '..aaaa....',
    '.aaaaaaa..',
    '.aaaaaaa..',
    '.aaaaaa...',
  ],
};
