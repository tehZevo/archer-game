import { newGrid, type Grid } from './grid';

/* ============================================================
   DAMAGE NUMBERS
   A chunky bubble-letter font drawn at its natural size (never scaled):
   2px strokes, rounded corners, and one dark outline shared between
   neighbouring letters, so a number reads as one solid blob with no gaps
   (easy to read even when a stack of them overlaps). Each letter is lit
   on top and shaded underneath, in the number's own colour.
   ============================================================ */

/** The fill of each glyph, '#' on in the number's colour, 'o' on in orange
 *  and 'y' in yellow (8 rows; widths vary). */
const GLYPHS: Record<string, string[]> = {
  0: ['.####.', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
  1: ['.##.', '###.', '.##.', '.##.', '.##.', '.##.', '.##.', '####'],
  2: ['.####.', '##..##', '....##', '...##.', '..##..', '.##...', '##....', '######'],
  3: ['.####.', '##..##', '....##', '..###.', '....##', '....##', '##..##', '.####.'],
  4: ['...##.', '..###.', '.####.', '##.##.', '######', '...##.', '...##.', '...##.'],
  5: ['######', '##....', '#####.', '....##', '....##', '....##', '##..##', '.####.'],
  6: ['.####.', '##....', '##....', '#####.', '##..##', '##..##', '##..##', '.####.'],
  7: ['######', '....##', '...##.', '...##.', '..##..', '..##..', '.##...', '.##...'],
  8: ['.####.', '##..##', '##..##', '.####.', '##..##', '##..##', '##..##', '.####.'],
  9: ['.####.', '##..##', '##..##', '##..##', '.#####', '....##', '....##', '.####.'],
  M: ['##...##', '###.###', '#######', '##.#.##', '##...##', '##...##', '##...##', '##...##'],
  I: ['####', '.##.', '.##.', '.##.', '.##.', '.##.', '.##.', '####'],
  S: ['.####.', '##..##', '##....', '.####.', '....##', '....##', '##..##', '.####.'],
  // the bang ahead of a crit: a comic-style starburst, hot from the inside
  // out: a yellow core, an orange ring, and eight rays in the number's colour
  '✸': ['#...#...#', '.#.###.#.', '..#oyo#..', '##oyyyo##', '..#oyo#..', '.#.###.#.', '#...#...#', '.........'],
};

/** Glyph height (fill), and the whole number's height with its outline. */
export const DMG_GLYPH_H = 8, DMG_H = DMG_GLYPH_H + 2;
const OUTLINE: [number, number, number] = [0x14, 0x10, 0x18];
/** The fixed tones a glyph can use besides the number's own colour. */
const TONES: Record<string, string> = { o: '#ff9a3c', y: '#ffe14d' };

/** A damage number's text: a crit leads with a bang, a starburst (✸1234). */
export const dmgLabel = (v: number, crit: boolean): string => (crit ? '✸' : '') + v;

/** Can this string be drawn in the bubble font? */
export const bubbleable = (s: string): boolean => [...s].every((ch) => GLYPHS[ch]);

/** Width of a string in the bubble font, outline included. */
export const bubbleWidth = (s: string): number => [...s].reduce((w, ch) => w + GLYPHS[ch][0].length + 1, 1);

const rgb = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a: [number, number, number], b: number, k: number): [number, number, number] =>
  [Math.round(a[0] + (b - a[0]) * k), Math.round(a[1] + (b - a[1]) * k), Math.round(a[2] + (b - a[2]) * k)];

/** A string in the bubble font, in colour `col` ('#rrggbb'). */
export function bubbleText(s: string, col: string): Grid {
  const W = bubbleWidth(s), g = newGrid(W, DMG_H);
  // fill: 0 off, 1 the number's colour, 2+ a fixed tone
  const fill = new Uint8Array(W * DMG_H), keys = Object.keys(TONES), tone = [rgb(col), rgb(col), ...keys.map((k) => rgb(TONES[k]))];
  // each letter's fill, one outline column apart from the last
  let x0 = 1;
  for (const ch of s) {
    const rows = GLYPHS[ch];
    rows.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') fill[(y + 1) * W + x0 + x] = c === '#' ? 1 : 2 + keys.indexOf(c); }));
    x0 += rows[0].length + 1;
  }
  const on = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < W && y < DMG_H && !!fill[y * W + x];
  const put = (x: number, y: number, c: [number, number, number]): void => {
    const i = (y * W + x) * 4;
    g.px[i] = c[0]; g.px[i + 1] = c[1]; g.px[i + 2] = c[2]; g.px[i + 3] = 255;
  };
  for (let y = 0; y < DMG_H; y++) for (let x = 0; x < W; x++) {
    if (on(x, y)) {
      // lit along the top of each stroke, shaded along the bottom
      const base = tone[fill[y * W + x]];
      put(x, y, !on(x, y - 1) ? mix(base, 255, 0.45) : !on(x, y + 1) ? mix(base, 0, 0.35) : base);
      continue;
    }
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (on(x + dx, y + dy)) { near = true; break; }
    if (near) put(x, y, OUTLINE);
  }
  return g;
}
