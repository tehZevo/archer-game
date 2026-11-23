import { NB } from './nb';
// Procedurally-built pixel-art sprites. Each sprite is a tiny canvas drawn with
// 1px blocks; the base-resolution canvas + image-rendering:pixelated keeps them
// crisp. Built once at boot, drawn with drawImage.

export interface Sprite {
  c: HTMLCanvasElement;
  x: CanvasRenderingContext2D;
  w: number;
  h: number;
}

function make(w: number, h: number): Sprite {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  x.imageSmoothingEnabled = false;
  return { c, x, w, h };
}

function px(s: Sprite, gx: number, gy: number, col: string, gw = 1, gh = 1): void {
  s.x.fillStyle = col;
  s.x.fillRect(gx, gy, gw, gh);
}

function snailSprite(): Sprite {
  const s = make(17, 14);
  px(s, 2, 4, '#5fb8f0', 13, 9);
  px(s, 5, 5, '#3f86c4', 6, 6);
  px(s, 11, 1, '#5fb8f0', 2, 4);
  px(s, 12, 0, '#ffffff', 2, 2);
  px(s, 3, 12, '#3f86c4', 11, 2);
  return s;
}

function pigSprite(): Sprite {
  const s = make(23, 18);
  px(s, 3, 4, '#e79ac4', 16, 11);
  px(s, 16, 6, '#d07fae', 5, 6);
  px(s, 19, 7, '#ffffff', 1, 1);
  px(s, 5, 15, '#c56f9f', 3, 3);
  px(s, 14, 15, '#c56f9f', 3, 3);
  return s;
}

function wispSprite(): Sprite {
  const s = make(16, 17);
  px(s, 3, 3, '#b98cf5', 10, 11);
  px(s, 5, 4, '#d9c2ff', 4, 4);
  px(s, 6, 8, '#1a1030', 2, 2);
  px(s, 10, 8, '#1a1030', 2, 2);
  return s;
}

function hogSprite(): Sprite {
  const s = make(26, 21);
  px(s, 3, 4, '#8fa2b8', 19, 13);
  px(s, 3, 4, '#6f8096', 19, 3);
  px(s, 19, 7, '#5a6b80', 5, 6);
  px(s, 22, 8, '#ffffff', 1, 1);
  px(s, 5, 17, '#5a6b80', 4, 4);
  px(s, 16, 17, '#5a6b80', 4, 4);
  return s;
}


const tileCache = new Map<number, Sprite>();

/** A 16x16 block tile drawn for its neighbourhood. Grass tiles (nothing above)
 *  get a grass cap; others are dirt. Exposed sides get a 2px border (dark
 *  outer, mid inner; the grass top gets a highlight instead), outer corners
 *  where two exposed sides meet are rounded by 2px, and inner (concave)
 *  corners get a pixel so the outline stays continuous. */
export function blockTile(nb: number): Sprite {
  const hit = tileCache.get(nb);
  if (hit) return hit;
  const s = make(16, 16);
  const solid = (b: number) => (nb & b) !== 0;
  const grass = !solid(NB.N);
  const n = !solid(NB.N), e = !solid(NB.E), so = !solid(NB.S), w = !solid(NB.W);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    // base colour
    // grass cap matches the slope tiles: 3px grass + 2px lip (+ top highlight)
    let col = grass && y < 3 ? '#57a34d' : grass && y < 5 ? '#3f7d3a' : '#6b4a2b';
    const speck = grass ? (x === 3 && y === 11) || (x === 11 && y === 13)
                        : (x === 4 && y === 4) || (x === 11 && y === 10);
    if (speck) col = '#5a3f24';
    const top = grass && y < 5;
    const outer = top ? '#2c5a28' : '#2a1b0e', inner = top ? '#3f7d3a' : '#4e3520';
    // Distance (in px) to the nearest exposed side; the grass top is handled
    // separately. Within 2px of an outer corner (two exposed sides) the
    // distance follows a 2px rounded curve: dx+dy < 2 is cut away.
    let d = 99;
    if (e) d = Math.min(d, 15 - x);
    if (w) d = Math.min(d, x);
    if (so) d = Math.min(d, 15 - y);
    let topD = n ? y : 99;
    const corners: [boolean, number, number, boolean][] = [
      [n && w, x, y, true], [n && e, 15 - x, y, true],
      [so && w, x, 15 - y, false], [so && e, 15 - x, 15 - y, false],
    ];
    let cut = false;
    for (const [on, dx, dy, isTop] of corners) {
      if (!on || dx > 2 || dy > 2) continue;
      const r = dx + dy - 2;               // -2,-1 cut; 0 outer ring; 1 inner ring
      if (r < 0) { cut = true; break; }
      if (r <= 1) { if (isTop && dy === 0) topD = 0; else d = Math.min(d, r); }
    }
    if (cut) continue;
    if (topD === 0 && d > 0) col = '#7ed36f';      // grass top highlight
    else if (d === 0) col = outer;
    else if (d === 1) col = inner;
    // inner corners: both neighbours solid but the diagonal open
    if (!n && !w && !solid(NB.NW) && x === 0 && y === 0) col = '#2a1b0e';
    if (!n && !e && !solid(NB.NE) && x === 15 && y === 0) col = '#2a1b0e';
    if (!so && !w && !solid(NB.SW) && x === 0 && y === 15) col = '#2a1b0e';
    if (!so && !e && !solid(NB.SE) && x === 15 && y === 15) col = '#2a1b0e';
    px(s, x, y, col);
  }
  tileCache.set(nb, s);
  return s;
}

/** Grass band under a slope surface, by depth below the surface (px). */
const BAND = ['#7ed36f', '#57a34d', '#57a34d', '#3f7d3a', '#3f7d3a'];

/** Overlay for the tile under a slope's lower half. Near the low end the
 *  slope is only 1-4px tall, so its 5px grass band would be cut off at the
 *  cell bottom; this continues the band into the top of the cell below so it
 *  meets the neighbouring flat grass seamlessly. */
function slopeFootSprite(dir: 1 | -1): Sprite {
  const s = make(16, 16);
  for (let x = 0; x < 16; x++) {
    const step = dir === 1 ? x + 1 : 16 - x;
    const hgt = Math.ceil(step / 2);                     // matches the lower-half slope
    for (let r = 0; hgt + r < BAND.length; r++) px(s, x, r, BAND[hgt + r]);
  }
  return s;
}

/** A 16x16 grass-topped slope tile whose surface matches `surfaceYAt`: one
 *  half of a 2:1 slope spanning two tiles side by side. part 0 rises 0-8px,
 *  part 1 8-16px. dir 1 rises to the right, dir -1 rises to the left. */
function slopeSprite(dir: 1 | -1, part: 0 | 1): Sprite {
  const s = make(16, 16);
  for (let x = 0; x < 16; x++) {
    const step = dir === 1 ? x + 1 : 16 - x;            // 1..16 toward the high end
    const hgt = part * 8 + Math.ceil(step / 2);
    const top = 16 - hgt;
    px(s, x, top, '#6b4a2b', 1, hgt);                     // dirt
    px(s, x, top, '#57a34d', 1, Math.min(3, hgt));        // grass cap
    if (hgt > 3) px(s, x, top + 3, '#3f7d3a', 1, Math.min(2, hgt - 3)); // grass lip
    px(s, x, top, '#7ed36f', 1, 1);                       // top highlight
  }
  return s;
}

/** A glowing warp pad. */
function portalSprite(): Sprite {
  const s = make(20, 28);
  px(s, 2, 2, '#6fd3ff', 16, 24);
  px(s, 4, 4, '#bfefff', 12, 20);
  px(s, 6, 6, '#ffffff', 8, 16);
  px(s, 0, 24, '#3a6ea5', 20, 4);
  return s;
}

/** A 16x16 rope segment, tiled top-to-bottom (rope centred in the tile). */
function ropeSprite(): Sprite {
  const s = make(16, 16);
  px(s, 5, 0, '#c8a06a', 6, 16);
  px(s, 5, 0, '#e0c088', 1, 16);
  px(s, 10, 0, '#8a6a3c', 1, 16);
  // twist: a diagonal highlight every 4px so tiling reads as a twisted rope
  px(s, 6, 0, '#d8b278', 2, 1);
  px(s, 7, 4, '#d8b278', 2, 1);
  px(s, 8, 8, '#d8b278', 2, 1);
  px(s, 7, 12, '#d8b278', 2, 1);
  return s;
}

/** A 16x16 ladder segment (two rails + a rung), tiled top-to-bottom. */
function ladderSprite(): Sprite {
  const s = make(16, 16);
  px(s, 3, 0, '#a9762f', 2, 16);
  px(s, 11, 0, '#a9762f', 2, 16);
  px(s, 3, 0, '#c8944a', 1, 16);
  px(s, 11, 0, '#c8944a', 1, 16);
  px(s, 5, 7, '#a9762f', 6, 2);
  px(s, 5, 7, '#c8944a', 6, 1);
  return s;
}

export const SPR = {
  slopeFootR: slopeFootSprite(1),
  slopeFootL: slopeFootSprite(-1),
  slopeL0: slopeSprite(-1, 0),
  slopeL1: slopeSprite(-1, 1),
  slopeR0: slopeSprite(1, 0),
  slopeR1: slopeSprite(1, 1),
  portal: portalSprite(),
  rope: ropeSprite(),
  ladder: ladderSprite(),
  mob: {
    'Garden Snail': snailSprite(),
    'Boar': pigSprite(),
    'Wisp': wispSprite(),
    'Iron Hog': hogSprite(),
  } as Record<string, Sprite>,
};
