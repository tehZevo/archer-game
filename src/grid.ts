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
