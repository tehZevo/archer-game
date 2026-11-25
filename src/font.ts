// A 5x7 bitmap font. Each glyph is 7 rows of 5 chars ('1' = lit pixel).
// Drawn with fillRect so every glyph pixel is a crisp, un-antialiased block.

const G: Record<string, string[]> = {
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  '%': ['11001','11010','00010','00100','01000','01011','10011'],
  'A': ['01110','10001','10001','11111','10001','10001','10001'],
  'B': ['11110','10001','10001','11110','10001','10001','11110'],
  'C': ['01110','10001','10000','10000','10000','10001','01110'],
  'D': ['11100','10010','10001','10001','10001','10010','11100'],
  'E': ['11111','10000','10000','11110','10000','10000','11111'],
  'F': ['11111','10000','10000','11110','10000','10000','10000'],
  'G': ['01110','10001','10000','10111','10001','10001','01111'],
  'H': ['10001','10001','10001','11111','10001','10001','10001'],
  'I': ['11111','00100','00100','00100','00100','00100','11111'],
  'J': ['00111','00010','00010','00010','00010','10010','01100'],
  'K': ['10001','10010','10100','11000','10100','10010','10001'],
  'L': ['10000','10000','10000','10000','10000','10000','11111'],
  'M': ['10001','11011','10101','10101','10001','10001','10001'],
  'N': ['10001','11001','10101','10011','10001','10001','10001'],
  'O': ['01110','10001','10001','10001','10001','10001','01110'],
  'P': ['11110','10001','10001','11110','10000','10000','10000'],
  'Q': ['01110','10001','10001','10001','10101','10010','01101'],
  'R': ['11110','10001','10001','11110','10100','10010','10001'],
  'S': ['01111','10000','10000','01110','00001','00001','11110'],
  'T': ['11111','00100','00100','00100','00100','00100','00100'],
  'U': ['10001','10001','10001','10001','10001','10001','01110'],
  'V': ['10001','10001','10001','10001','10001','01010','00100'],
  'W': ['10001','10001','10001','10101','10101','11011','10001'],
  'X': ['10001','10001','01010','00100','01010','10001','10001'],
  'Y': ['10001','10001','01010','00100','00100','00100','00100'],
  'Z': ['11111','00001','00010','00100','01000','10000','11111'],
  '0': ['01110','10001','10011','10101','11001','10001','01110'],
  '1': ['00100','01100','00100','00100','00100','00100','01110'],
  '2': ['01110','10001','00001','00010','00100','01000','11111'],
  '3': ['11111','00010','00100','00010','00001','10001','01110'],
  '4': ['00010','00110','01010','10010','11111','00010','00010'],
  '5': ['11111','10000','11110','00001','00001','10001','01110'],
  '6': ['00110','01000','10000','11110','10001','10001','01110'],
  '7': ['11111','00001','00010','00100','01000','01000','01000'],
  '8': ['01110','10001','10001','01110','10001','10001','01110'],
  '9': ['01110','10001','10001','01111','00001','00010','01100'],
  '.': ['00000','00000','00000','00000','00000','01100','01100'],
  '/': ['00001','00010','00010','00100','01000','01000','10000'],
  ':': ['01100','01100','00000','01100','01100','00000','00000'],
  '+': ['00000','00100','00100','11111','00100','00100','00000'],
  '-': ['00000','00000','00000','11111','00000','00000','00000'],
  '<': ['00010','00100','01000','10000','01000','00100','00010'],
  '>': ['01000','00100','00010','00001','00010','00100','01000'],
  '_': ['00000','00000','00000','00000','00000','00000','11111'],
  '!': ['00100','00100','00100','00100','00100','00000','00100'],
  ',': ['00000','00000','00000','00000','01100','00100','01000'],
  "'": ['00100','00100','01000','00000','00000','00000','00000'],
  '(': ['00010','00100','01000','01000','01000','00100','00010'],
  ')': ['01000','00100','00010','00010','00010','00100','01000'],
  '=': ['00000','00000','11111','00000','11111','00000','00000'],
  '?': ['01110','10001','00001','00010','00100','00000','00100'],
  '·': ['00000','00000','00000','01100','01100','00000','00000'],
  '★': ['00100','00100','11111','01110','01010','10001','00000'],
};

const W = 5, H = 7, GAP = 1;

export type Align = 'left' | 'center' | 'right';

/** Draw pixel-perfect text. scale multiplies each glyph pixel. */
export function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  scale = 1,
  color = '#fff',
  align: Align = 'left',
  gap = GAP,
): void {
  const s = String(str).toUpperCase();
  const total = s.length * (W * scale + gap * scale) - gap * scale;
  // round the start so glyphs land on whole pixels (odd widths centre on a half pixel)
  let ox = Math.round(align === 'center' ? x - total / 2 : align === 'right' ? x - total : x);
  y = Math.round(y);
  ctx.fillStyle = color;
  for (const ch of s) {
    const g = G[ch] || G[' '];
    for (let r = 0; r < H; r++) {
      const row = g[r];
      for (let c = 0; c < W; c++) {
        if (row[c] === '1') ctx.fillRect(ox + c * scale, y + r * scale, scale, scale);
      }
    }
    ox += (W + gap) * scale;
  }
}

/** A hard 1px black shadow (down and right) so world labels read on bright art,
 *  the same treatment the HUD uses. */
export function labelShadow(ctx: CanvasRenderingContext2D, on = true): void {
  const k = ctx.getTransform().a; // offsets are in canvas pixels, not game pixels
  ctx.shadowColor = on ? '#000' : 'transparent';
  ctx.shadowOffsetX = on ? k : 0; ctx.shadowOffsetY = on ? k : 0; ctx.shadowBlur = 0;
}

/** Width of a string in pixels at the given scale. */
export function textWidth(str: string, scale = 1, gap = GAP): number {
  return String(str).length * (W * scale + gap * scale) - gap * scale;
}

/** Outline text drawn glyph by glyph: each character's 1px outline is painted
 *  with its own fill, so overlapping (tight-gap) digits keep their outlines —
 *  each one sits on top of the previous, left to right. */
export function outlinedText(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  scale: number,
  color: string,
  gap = GAP,
): void {
  const s = String(str).toUpperCase();
  const total = textWidth(s, scale, gap);
  y = Math.round(y);
  // draw right-to-left so the leftmost glyph sits on top of its neighbors
  let ox = Math.round(x - total / 2) + (s.length - 1) * (W + gap) * scale;
  for (const ch of [...s].reverse()) {
    const g = G[ch] || G[' '];
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.fillStyle = '#000';
      for (let r = 0; r < H; r++) {
        const row = g[r];
        for (let c = 0; c < W; c++) {
          if (row[c] === '1') ctx.fillRect(ox + dx + c * scale, y + dy + r * scale, scale, scale);
        }
      }
    }
    ctx.fillStyle = color;
    for (let r = 0; r < H; r++) {
      const row = g[r];
      for (let c = 0; c < W; c++) {
        if (row[c] === '1') ctx.fillRect(ox + c * scale, y + r * scale, scale, scale);
      }
    }
    ox -= (W + gap) * scale;
  }
}

/** Whether the font can draw a character (lower case counts: text() upper-cases). */
export const hasGlyph = (ch: string): boolean => ch.toUpperCase() in G;
