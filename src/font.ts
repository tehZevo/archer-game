import fontPng from '../assets/font.png';

/** The characters in assets/font.png, left to right: one 5x7 cell each,
 *  white pixels on transparent. Add a glyph by widening the PNG by one cell
 *  and appending its character here. */
export const FONT_CHARS = "0123456789 %ABCDEFGHIJKLMNOPQRSTUVWXYZ./:+-<>_!,'()=?·★";

const W = 5, H = 7, GAP = 1;

export type Align = 'left' | 'center' | 'right';

/** The 8 neighbours an outline is stamped at, 1px out. */
const OUTLINE = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];

/** Every glyph's column on the sheet. */
const COL = new Map([...FONT_CHARS].map((ch, i) => [ch, i]));

/** The font PNG, once decoded (never, headless: text just isn't drawn). */
let png: HTMLImageElement | null = null;
if (typeof Image !== 'undefined') {
  const img = new Image();
  img.onload = () => { png = img; };
  img.src = fontPng;
}

/** The font in one colour and scale (optionally with a 1px black outline),
 *  tinted from the PNG once, so drawing a character is a single drawImage. */
interface Sheet { c: HTMLCanvasElement; cw: number; ch: number; pad: number }
const sheets = new Map<string, Sheet>();

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  x.imageSmoothingEnabled = false;
  return [c, x];
}

/** The PNG scaled up by `scale` and recoloured to `color`. */
function tinted(img: HTMLImageElement, color: string, scale: number): HTMLCanvasElement {
  const [c, x] = canvas(img.width * scale, img.height * scale);
  x.drawImage(img, 0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

function sheet(img: HTMLImageElement, color: string, scale: number, outlined: boolean): Sheet {
  const key = `${color}|${scale}|${outlined ? 'o' : ''}`;
  const cached = sheets.get(key);
  if (cached) return cached;
  const pad = outlined ? 1 : 0, gw = W * scale, gh = H * scale;
  const [c, x] = canvas((gw + 2 * pad) * FONT_CHARS.length, gh + 2 * pad);
  const s: Sheet = { c, cw: gw + 2 * pad, ch: gh + 2 * pad, pad };
  const fill = tinted(img, color, scale);
  const black = outlined ? tinted(img, '#000', scale) : null;
  for (let i = 0; i < FONT_CHARS.length; i++) {
    const stamp = (src: HTMLCanvasElement, dx: number, dy: number): void =>
      x.drawImage(src, i * gw, 0, gw, gh, i * s.cw + pad + dx, pad + dy, gw, gh);
    if (black) for (const [dx, dy] of OUTLINE) stamp(black, dx, dy);
    stamp(fill, 0, 0);
  }
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
  if (!png) return;
  const sh = sheet(png, color, scale, false);
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
  if (!png) return;
  const sh = sheet(png, color, scale, true);
  const chars = [...s];
  for (let i = chars.length - 1; i >= 0; i--) drawGlyph(ctx, sh, chars[i], left + i * step, y);
}

/** Whether the font can draw a character (lower case counts: text() upper-cases). */
export const hasGlyph = (ch: string): boolean => COL.has(ch.toUpperCase());
