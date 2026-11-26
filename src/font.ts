// A 5x7 bitmap font. Each glyph is 7 rows of 5 chars ('1' = lit pixel).
// Each colour/scale gets a baked sheet of every glyph (see sheet), so a
// character is one drawImage of crisp, un-antialiased blocks.

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

/** The 8 neighbours an outline is stamped at, 1px out. */
const OUTLINE = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];

/** Every glyph's column on a sheet. */
const CHARS = Object.keys(G);
const COL = new Map(CHARS.map((ch, i) => [ch, i]));

/** A tileset of every glyph in one colour and scale (optionally outlined),
 *  painted once, so drawing a character is a single drawImage. */
interface Sheet { c: HTMLCanvasElement; cw: number; ch: number; pad: number }
const sheets = new Map<string, Sheet>();

/** Paint one glyph's lit pixels as `scale`-sized blocks. */
function paintGlyph(ctx: CanvasRenderingContext2D, g: string[], x: number, y: number, scale: number): void {
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (g[r][c] === '1') ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
    }
  }
}

function sheet(color: string, scale: number, outlined: boolean): Sheet {
  const key = `${color}|${scale}|${outlined ? 'o' : ''}`;
  const cached = sheets.get(key);
  if (cached) return cached;
  const pad = outlined ? 1 : 0;
  const s: Sheet = { c: document.createElement('canvas'), cw: W * scale + 2 * pad, ch: H * scale + 2 * pad, pad };
  s.c.width = s.cw * CHARS.length; s.c.height = s.ch;
  const x = s.c.getContext('2d') as CanvasRenderingContext2D;
  CHARS.forEach((k, i) => {
    const ox = i * s.cw + pad;
    if (outlined) {
      x.fillStyle = '#000';
      for (const [dx, dy] of OUTLINE) paintGlyph(x, G[k], ox + dx, pad + dy, scale);
    }
    x.fillStyle = color;
    paintGlyph(x, G[k], ox, pad, scale);
  });
  sheets.set(key, s);
  return s;
}

/** Draw one character from a sheet with its glyph's top-left at (x, y). */
function drawGlyph(ctx: CanvasRenderingContext2D, s: Sheet, ch: string, x: number, y: number): void {
  const i = COL.get(ch);
  if (i === undefined || ch === ' ') return; // (an unknown character draws as a space)
  ctx.drawImage(s.c, i * s.cw, 0, s.cw, s.ch, x - s.pad, y - s.pad, s.cw, s.ch);
}

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
  const total = textWidth(s, scale, gap);
  // round the start so glyphs land on whole pixels (odd widths centre on a half pixel)
  let ox = Math.round(align === 'center' ? x - total / 2 : align === 'right' ? x - total : x);
  y = Math.round(y);
  ctx.fillStyle = color; // (callers may draw on in the text's colour)
  const sh = sheet(color, scale, false);
  for (const ch of s) {
    drawGlyph(ctx, sh, ch, ox, y);
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

/** Outline text: each character carries its own 1px black outline, drawn
 *  right to left so overlapping (tight-gap) digits keep their outlines, each
 *  one sitting on top of the one to its right. */
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
  const step = (W + gap) * scale;
  const left = Math.round(x - textWidth(s, scale, gap) / 2);
  y = Math.round(y);
  ctx.fillStyle = color;
  const sh = sheet(color, scale, true);
  const chars = [...s];
  for (let i = chars.length - 1; i >= 0; i--) drawGlyph(ctx, sh, chars[i], left + i * step, y);
}

/** Whether the font can draw a character (lower case counts: text() upper-cases). */
export const hasGlyph = (ch: string): boolean => ch.toUpperCase() in G;
