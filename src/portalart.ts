import { fillRect, newGrid, type Grid } from './grid';

/* ============================================================
   PORTAL
   The warp pad: a tall oval of light standing on a glowing ring on the
   ground, its inside wound into three spiral arms that turn frame by frame
   round a bright eye. Baked with the scenery (portal/<frame>, see
   artsheets.ts); drawworld.ts plays the frames and tints them (a way down,
   a sealed portal).
   ============================================================ */

export const PORTAL_FRAMES = 8, PORTAL_FPS = 10;
export const PORTAL_W = 20, PORTAL_H = 30;

/** The oval's half-width and half-height, and its centre (above the ground ring). */
const RX = 9, RY = 12.5, CX = PORTAL_W / 2, CY = 13;
/** From the rim inward: outline, rim, then the swirl's dark, mid and light bands, and the eye. */
const RIM_DARK = '#2a4f9a', RIM = '#bfefff', DEEP = '#2f6cc4', MID = '#4fb4f0', LIGHT = '#9fe6ff', EYE = '#ffffff';
const RING = '#3a6ea5', RING_LIT = '#6fd3ff';

/** Frame f of the portal. */
export function portalGrid(f = 0): Grid {
  const g = newGrid(PORTAL_W, PORTAL_H);
  const turn = (f / PORTAL_FRAMES) * (Math.PI * 2 / 3); // three arms: a third of a turn loops
  // the ground ring: a flat oval of light under the portal
  for (let x = 0; x < PORTAL_W; x++) for (let y = PORTAL_H - 4; y < PORTAL_H; y++) {
    const d = Math.hypot((x + 0.5 - CX) / (RX + 0.5), (y + 0.5 - (PORTAL_H - 2)) / 2.2);
    if (d <= 1) fillRect(g, x, y, 1, 1, d > 0.7 ? RING : RING_LIT);
  }
  for (let y = 0; y < PORTAL_H - 3; y++) for (let x = 0; x < PORTAL_W; x++) {
    const dx = (x + 0.5 - CX) / RX, dy = (y + 0.5 - CY) / RY, r = Math.hypot(dx, dy);
    if (r > 1) continue;
    let col: string;
    if (r > 0.88) col = RIM_DARK;
    else if (r > 0.74) col = RIM;
    else if (r < 0.16) col = EYE;
    else {
      // the spiral: the arms' angle winds further round the further in
      const arm = Math.cos(3 * (Math.atan2(dy, dx) - turn + r * 5));
      col = arm > 0.45 ? LIGHT : arm > -0.25 ? MID : DEEP;
    }
    fillRect(g, x, y, 1, 1, col);
  }
  return g;
}
