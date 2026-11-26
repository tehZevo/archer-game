/** An RGBA pixel buffer (straight alpha), the common currency of baked art:
 *  generators paint into Grids headlessly, the bake script writes them to
 *  PNG, and the game turns them into canvases. */
export interface Grid { w: number; h: number; px: Uint8ClampedArray }

export const newGrid = (w: number, h: number): Grid => ({ w, h, px: new Uint8ClampedArray(w * h * 4) });

/** The grid mirrored left to right. */
export function flipGrid(g: Grid): Grid {
  const o = newGrid(g.w, g.h);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const i = (y * g.w + x) * 4, j = (y * g.w + g.w - 1 - x) * 4;
    o.px[j] = g.px[i]; o.px[j + 1] = g.px[i + 1]; o.px[j + 2] = g.px[i + 2]; o.px[j + 3] = g.px[i + 3];
  }
  return o;
}

/** Lay frames side by side in one strip (a sprite sheet: frame f at x = f * w). */
export function packStrip(frames: Grid[]): Grid {
  const w = frames[0].w, h = frames[0].h, o = newGrid(w * frames.length, h);
  frames.forEach((g, f) => {
    for (let y = 0; y < h; y++) o.px.set(g.px.subarray(y * w * 4, (y + 1) * w * 4), (y * o.w + f * w) * 4);
  });
  return o;
}

/** A grid as a canvas (browser only). */
export function gridCanvas(g: Grid): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = g.w; c.height = g.h;
  const x = c.getContext('2d')!, img = x.createImageData(g.w, g.h);
  img.data.set(g.px);
  x.putImageData(img, 0, 0);
  return c;
}

/** A canvas's (or image's) pixels as a grid (browser only). */
export function canvasGrid(src: CanvasImageSource, w: number, h: number, sx = 0, sy = 0): Grid {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  x.drawImage(src, sx, sy, w, h, 0, 0, w, h);
  return { w, h, px: x.getImageData(0, 0, w, h).data };
}

const RGB = new Map<string, [number, number, number]>();
/** '#rrggbb' (or '#rgb') as numbers (cached). */
export function hexRgb(col: string): [number, number, number] {
  let c = RGB.get(col);
  if (!c) {
    const full = col.length === 4 ? '#' + [...col.slice(1)].map((d) => d + d).join('') : col;
    RGB.set(col, (c = [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]));
  }
  return c;
}

/** Fill a rectangle with an opaque '#rrggbb' colour, snapped to whole pixels
 *  and clipped to the grid. */
export function fillRect(g: Grid, x: number, y: number, w: number, h: number, col: string): void {
  const [r, gg, b] = hexRgb(col);
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  for (let yy = Math.max(0, y); yy < Math.min(g.h, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(g.w, x + w); xx++) {
    const i = (yy * g.w + xx) * 4;
    g.px[i] = r; g.px[i + 1] = gg; g.px[i + 2] = b; g.px[i + 3] = 255;
  }
}
