import { fillRect, newGrid, type Grid } from './grid';

/* The HUD's baked chrome (art/hud/*), painted here and baked by `npm run bake`
   so its edges are hard pixels, never antialiased canvas strokes. */

/** The bottom bars' layout: three bars this wide, this far apart, this tall. */
export const BAR_W = 74, BAR_GAP = 3, BAR_H = 9;
/** The panel's margin around the bars (border included). */
const MARGIN = 3;
/** The panel behind the bottom bars: they sit MARGIN in from its edges. */
export const PANEL = { w: 3 * BAR_W + 2 * BAR_GAP + 2 * MARGIN, h: BAR_H + 2 * MARGIN, margin: MARGIN };

/** The bottom panel: light gray inside a 1px solid black border. */
export function panelGrid(): Grid {
  const { w, h } = PANEL, g = newGrid(w, h);
  fillRect(g, 0, 0, w, h, '#000000');         // border
  fillRect(g, 1, 1, w - 2, h - 2, '#c3c8d1'); // fill
  return g;
}
