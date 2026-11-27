/* ============================================================
   TINY FONT
   A compact 5x5 pixel font for the HUD's HP / MP / EXP bars and level
   line, where the 5x7 font is too tall for the bars. Only the characters
   those readouts use (digits, K/M, '.', '%', the bar labels and LV).
   ============================================================ */

/** Each glyph's rows, '#' on; 5 rows, widths vary ('.' is one wide). */
const GLYPHS: Record<string, string[]> = {
  0: ['.###.', '#..##', '#.#.#', '##..#', '.###.'],
  1: ['.##..', '#.#..', '..#..', '..#..', '#####'],
  2: ['####.', '....#', '.###.', '#....', '#####'],
  3: ['####.', '....#', '.###.', '....#', '####.'],
  4: ['#..#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '####.'],
  6: ['.###.', '#....', '####.', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '..#..'],
  8: ['.###.', '#...#', '.###.', '#...#', '.###.'],
  9: ['.###.', '#...#', '.####', '....#', '.###.'],
  E: ['#####', '#....', '####.', '#....', '#####'],
  H: ['#...#', '#...#', '#####', '#...#', '#...#'],
  K: ['#...#', '#..#.', '###..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  P: ['####.', '#...#', '####.', '#....', '#....'],
  V: ['#...#', '#...#', '#...#', '.#.#.', '..#..'],
  X: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  '%': ['##..#', '##.#.', '..#..', '.#.##', '#..##'],
  '.': ['.', '.', '.', '.', '#'],
  ' ': ['..', '..', '..', '..', '..'],
};

export const TINY_H = 5;
const GAP = 1;

/** Whether the tiny font can draw every character of a string. */
export const tinyable = (s: string): boolean => [...s.toUpperCase()].every((ch) => GLYPHS[ch]);

/** Width of a string in the tiny font, in pixels. */
export function tinyWidth(s: string): number {
  const known = [...s.toUpperCase()].filter((ch) => GLYPHS[ch]);
  return Math.max(0, known.reduce((w, ch) => w + GLYPHS[ch][0].length + GAP, 0) - GAP);
}

/** Draw a string in the tiny font with its top at y (characters it lacks are skipped). */
export function tinyText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, align: 'left' | 'right' = 'left'): void {
  let ox = Math.round(align === 'right' ? x - tinyWidth(s) : x);
  y = Math.round(y);
  ctx.fillStyle = color;
  for (const ch of s.toUpperCase()) {
    const g = GLYPHS[ch];
    if (!g) continue;
    g.forEach((row, gy) => [...row].forEach((px, gx) => { if (px === '#') ctx.fillRect(ox + gx, y + gy, 1, 1); }));
    ox += g[0].length + GAP;
  }
}
