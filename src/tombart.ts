/* The player's tombstone (see drawPlayerDeath in drawentities.ts): pixel
   art in a grid, so it draws crisp on whole pixels. No DOM, so tests read it. */

/** The tombstone, feet on its bottom row: a weathered, chipped slab with an
 *  engraved cross and lines, a crack, moss at its foot, and a plinth, in a
 *  dark outline (lit from the left). */
export const TOMB = [
  '......ooooooo......',
  '....oolllmmmmoo....',
  '...olllmmmmmmmdo...',
  '...ollmmmmmmmmdo...',
  '..olmmmmmeemmmmdo..',
  '..olmmmmmeemmmmdo..',
  '..olmmmeeeeeemmdo..',
  '..olmmmmmeemmmmdo..',
  '..olmmdmmeemmmmco..',
  '..olmmmmmmmmmmcdo..',
  '..olmmmmmmmmmcmdo..',
  '..olmeeeeemmmcmdo..',
  '..olmmmmmmmmcmmdo..',
  '..olmmeeeemmmmmdo..',
  '..olmmmmmmmdmmmdo..',
  '..olgmmmmmmmmmddo..',
  '..oggmmdmmmmmdgdo..',
  '.oobbbbbbbbbbbbboo.',
  'oBBBBBBBBBBBBBBBBdo',
  'ooooooooooooooooooo',
];
export const TOMB_PAL: Record<string, string> = {
  o: '#22262f', // outline
  l: '#b4bccb', m: '#8b93a6', d: '#666e80', // lit, stone, shade (and grit)
  e: '#4a5163', c: '#3c4252', // engraving, crack
  g: '#5d7a45', // moss
  b: '#a3abbc', B: '#6c7487', // plinth top (lit), plinth face
};
