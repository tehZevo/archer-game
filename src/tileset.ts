import type { Sprite } from './sprites';

/* ============================================================
   TILESETS
   Each area has its own kit of tile pieces, painted in code (see
   tilebake.ts for how they become sprites). A tileset is not a palette:
   its fill pattern, its surface layer, how its corners are cut, what grows
   on top and hangs underneath, and its ropes and ladders are all its own.

   Pieces (all 16px tiles):
   - fill:    the inside of a block, per pixel, in 4 variants (picked per
              tile from its position, so every player sees the same tile)
   - surface: the layer under an exposed top (grass, sand, catwalk plate),
              by depth below the surface; null shows the fill
   - edge:    the outline on exposed sides and how corners are shaped
   - top:     decoration standing on an exposed top (it overhangs the tile:
              see TOP_W/TOP_H); `w`/`e` say if that end of the top is exposed
   - bottom:  decoration hanging under an exposed bottom
   - rope / ladder: one 16px segment, tiled down the climbable
   ============================================================ */

/** Top decoration sprite size: 2px of overhang each side, 10px above the tile, 4px into it. */
export const TOP_W = 20, TOP_H = 14, TOP_Y = 10;
/** Bottom decoration sprite size: hangs from just under the tile. */
export const BOT_H = 12;

export type Paint = (x: number, y: number, col: string, w?: number, h?: number) => void;

export interface Edge {
  outer: string;
  inner: string;
  /** outline where the surface layer meets an exposed side */
  surfOuter?: string;
  surfInner?: string;
  /** round: corners cut on a diagonal of `r` px; chip: like round, with chunks
   *  knocked out of the sides; bevel: square, lit on the left side */
  style: 'round' | 'chip' | 'bevel';
  r: number;
  light?: string;
}

export interface Tileset {
  name: string;
  /** background gradient, top / middle / bottom */
  sky: [string, string, string];
  fill(x: number, y: number, v: number): string;
  surface(x: number, d: number, v: number): string | null;
  edge: Edge;
  top?(p: Paint, v: number, w: boolean, e: boolean): void;
  bottom?(p: Paint, v: number): void;
  rope(p: Paint): void;
  ladder(p: Paint): void;
}

/** Small integer hash → 0..1, for patterns and per-tile variants. */
export function hash(a: number, b: number, c = 0): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Which of the 4 variants a tile at grid cell (tx, ty) uses; `salt` separates fill from decorations. */
export const variantAt = (tx: number, ty: number, salt = 0): number => Math.floor(hash(tx, ty, salt + 11) * 4);

/* ---------------- Classic: the original grass and dirt (areas without their own set yet) ---------------- */
const classic: Tileset = {
  name: 'Classic',
  sky: ['#1a3a54', '#20536b', '#16394f'],
  fill: (x, y, v) => ((x === 4 && y === 4) || (x === 11 && y === 10) || (v === 1 && x === 8 && y === 13)) ? '#5a3f24' : '#6b4a2b',
  surface: (_x, d) => (d === 0 ? '#7ed36f' : d < 3 ? '#57a34d' : d < 5 ? '#3f7d3a' : null),
  edge: { outer: '#2a1b0e', inner: '#4e3520', surfOuter: '#2c5a28', surfInner: '#3f7d3a', style: 'round', r: 2 },
  rope(p) {
    p(5, 0, '#c8a06a', 6, 16); p(5, 0, '#e0c088', 1, 16); p(10, 0, '#8a6a3c', 1, 16);
    for (const [x, y] of [[6, 0], [7, 4], [8, 8], [7, 12]]) p(x, y, '#d8b278', 2, 1);
  },
  ladder(p) {
    p(3, 0, '#a9762f', 2, 16); p(11, 0, '#a9762f', 2, 16);
    p(3, 0, '#c8944a', 1, 16); p(11, 0, '#c8944a', 1, 16);
    p(5, 7, '#a9762f', 6, 2); p(5, 7, '#c8944a', 6, 1);
  },
};

/* ---------------- Beach: layered sand, shells, sea grass, driftwood ---------------- */
const beach: Tileset = {
  name: 'Beach',
  sky: ['#2f6f9e', '#4d93c2', '#2a5f8a'],
  fill(x, y, v) {
    // wavy strata of sand, with a darker seam every other band
    const wave = Math.round(1.5 * Math.sin((x + v * 5) * 0.55));
    const yy = y + wave + 16;
    if (yy % 8 === 0) return '#bf9353';
    let col = (yy >> 2) & 1 ? '#d9b26f' : '#cfa461';
    if (hash(x, y, v) < 0.05) col = '#e8c98a';
    // embedded bits: a shell, a pebble, a sliver of driftwood
    if (v === 1 && y >= 9 && y <= 10 && x >= 4 && x <= 6) col = y === 9 ? '#f4d4c8' : '#c99a8a';
    if (v === 2 && y >= 6 && y <= 7 && x >= 10 && x <= 11) col = '#9c8a78';
    if (v === 3 && y === 12 && x >= 2 && x <= 7) col = '#9a7a56';
    return col;
  },
  surface(x, d, v) {
    if (d === 0) return '#fff1c6';
    if (d <= 2) return '#f6dfa2';
    // a scalloped wet line where dry sand meets the strata
    if (d === 3) return (x + v) % 5 === 0 ? null : '#e4c27e';
    return null;
  },
  edge: { outer: '#8a6a3c', inner: '#b48b52', surfOuter: '#c9a768', surfInner: '#ecd394', style: 'round', r: 3 },
  top(p, v) {
    const y = TOP_Y;
    if (v === 1) { // sea grass tuft
      for (const [x, h] of [[7, 4], [8, 6], [9, 5], [10, 3], [12, 4]]) { p(x, y - h, '#4f8a44', 1, h); p(x, y - h, '#7fc06a'); }
    } else if (v === 2) { // fan shell
      p(13, y - 2, '#f4c8b8', 4, 2); p(14, y - 3, '#f4c8b8', 2, 1); p(14, y - 2, '#d99a8a', 1, 2); p(16, y - 2, '#d99a8a', 1, 1);
    } else if (v === 3) { // driftwood stick
      p(4, y - 2, '#8a7a66', 7, 2); p(4, y - 2, '#b0a08a', 7, 1); p(9, y - 4, '#8a7a66', 1, 2);
    }
  },
  bottom(p, v) {
    if (v === 0) return;
    // trickles of sand
    for (const [x, h] of [[3 + v, 2], [9, 1 + v], [13 - v, 2]]) p(x, 0, '#cfa461', 1, h);
  },
  rope(p) { // thick hemp rope with a knot
    p(6, 0, '#c8a06a', 4, 16); p(6, 0, '#e6c890', 1, 16); p(9, 0, '#8a6a3c', 1, 16);
    for (let y = 0; y < 16; y += 3) p(7, y, '#a8824e', 2, 1);
    p(5, 11, '#b08a56', 6, 3); p(5, 11, '#d8b47c', 6, 1); p(5, 13, '#7a5a30', 6, 1);
  },
  ladder(p) { // driftwood ladder lashed with rope
    p(2, 0, '#a89a86', 2, 16); p(12, 0, '#a89a86', 2, 16);
    p(2, 0, '#cfc2ae', 1, 16); p(12, 0, '#cfc2ae', 1, 16);
    p(2, 3, '#7c6e5c', 1, 2); p(13, 12, '#7c6e5c', 1, 2);
    p(4, 7, '#9a8c78', 8, 1); p(4, 8, '#9a8c78', 4, 1); p(8, 8, '#8a7c68', 4, 1); p(4, 7, '#c4b8a2', 4, 1);
    p(1, 6, '#d8b47c', 4, 1); p(1, 9, '#d8b47c', 4, 1); p(11, 6, '#d8b47c', 4, 1); p(11, 9, '#d8b47c', 4, 1);
  },
};

/* ---------------- Forest: dark loam and roots, thick grass, vines, log ladders ---------------- */
const forest: Tileset = {
  name: 'Forest',
  sky: ['#1c3a2c', '#2a573a', '#173024'],
  fill(x, y, v) {
    let col = hash(x >> 1, y >> 1, v + 3) < 0.25 ? '#553a25' : '#4a3220';
    if (hash(x, y, v + 9) < 0.03) col = '#7a7468';
    if (v === 1 && x >= 2 && x <= 12 && y === 7 + Math.round(1.5 * Math.sin(x * 0.7))) col = '#7a5a36'; // a root piece
    if (v === 2 && x === 9 + Math.round(Math.sin(y * 0.6)) && y > 4) col = '#6e5030'; // a rootlet down
    if (v === 3 && x >= 4 && x <= 7 && y >= 9 && y <= 11) col = y === 9 ? '#8a857a' : '#6b665c'; // a buried stone
    return col;
  },
  surface(x, d, v) {
    if (d === 0) return '#8fdc6a';
    if (d <= 2) return '#5fb244';
    if (d <= 4) return '#3f8a34';
    // ragged underside: the turf hangs into the soil by 0-2px
    if (d <= 4 + ((x * 7 + v * 3) % 3)) return '#2f6c2a';
    return null;
  },
  edge: { outer: '#24170c', inner: '#3a2616', surfOuter: '#1f4a1c', surfInner: '#3f8a34', style: 'round', r: 2 },
  top(p, v, w, e) {
    const y = TOP_Y;
    // grass blades along the whole top, 0-4px tall
    for (let x = 2; x < 18; x++) {
      const r = hash(x, v, 5), h = r < 0.3 ? 0 : r < 0.7 ? 1 : r < 0.92 ? 2 : 4;
      if (h) { p(x, y - h, '#5fb244', 1, h); p(x, y - h, '#8fdc6a'); }
    }
    // the turf overhangs exposed ends
    if (w) { p(0, y, '#5fb244', 2, 2); p(1, y + 2, '#3f8a34', 1, 1); p(0, y, '#8fdc6a', 2, 1); }
    if (e) { p(18, y, '#5fb244', 2, 2); p(18, y + 2, '#3f8a34', 1, 1); p(18, y, '#8fdc6a', 2, 1); }
    if (v === 1) { p(6, y - 5, '#3f8a34', 1, 5); p(5, y - 7, '#f4f0e8', 3, 2); p(6, y - 7, '#f0c040'); } // daisy
    if (v === 3) { p(12, y - 3, '#efe6d6', 2, 3); p(11, y - 5, '#d04a3a', 4, 2); p(12, y - 5, '#ffffff'); } // mushroom
  },
  bottom(p, v) {
    if (v === 0) return;
    for (let i = 0; i < v; i++) { // 1-3 hanging roots
      let x = 3 + Math.floor(hash(i, v, 2) * 10);
      const len = 3 + Math.floor(hash(v, i, 4) * 8);
      for (let y = 0; y < len; y++) {
        if (hash(x, y, i) < 0.3) x += hash(y, x) < 0.5 ? -1 : 1;
        p(x, y, y < len - 2 ? '#5a3f24' : '#7a5a36');
      }
    }
  },
  rope(p) { // leafy vine
    for (let y = 0; y < 16; y++) {
      const x = 7 + Math.round(Math.sin(y * Math.PI / 8));
      p(x, y, '#3f7d3a', 2, 1); p(x, y, '#5fb244');
    }
    p(3, 3, '#5fb244', 4, 2); p(4, 3, '#8fdc6a', 2, 1); p(3, 5, '#2f6c2a', 3, 1);
    p(9, 11, '#5fb244', 4, 2); p(10, 11, '#8fdc6a', 2, 1); p(10, 13, '#2f6c2a', 3, 1);
  },
  ladder(p) { // rough log ladder
    p(2, 0, '#6b4a2b', 3, 16); p(11, 0, '#6b4a2b', 3, 16);
    for (let y = 1; y < 16; y += 5) { p(3, y, '#4e3520', 1, 2); p(12, y + 2, '#4e3520', 1, 2); }
    p(2, 0, '#8a6440', 1, 16); p(11, 0, '#8a6440', 1, 16);
    p(5, 7, '#7a5a36', 6, 2); p(5, 7, '#a07a4c', 6, 1); p(4, 7, '#c49a64', 1, 2); p(11, 7, '#c49a64', 1, 2);
  },
};

/* ---------------- Cave: cobbled stone, chipped edges, stalactites, chains ---------------- */
// Stone cells: a few points per variant, wrapped so the pattern tiles.
const CELLS = [0, 1, 2, 3].map((v) => Array.from({ length: 5 }, (_, i) => [hash(i, v, 21) * 16, hash(v, i, 22) * 16]));
const STONE = ['#4a4856', '#545262', '#403e4c', '#5a5868', '#4e4c5a'];
const cave: Tileset = {
  name: 'Cave',
  sky: ['#0e0c16', '#1a1726', '#0b0a12'],
  fill(x, y, v) {
    let d1 = 99, d2 = 99, c1 = 0;
    CELLS[v].forEach(([cx, cy], i) => {
      const dx = Math.min(Math.abs(x + 0.5 - cx), 16 - Math.abs(x + 0.5 - cx));
      const dy = Math.min(Math.abs(y + 0.5 - cy), 16 - Math.abs(y + 0.5 - cy));
      const d = Math.hypot(dx, dy);
      if (d < d1) { d2 = d1; d1 = d; c1 = i; } else if (d < d2) d2 = d;
    });
    if (d2 - d1 < 1.1) return '#1e1c24';                 // mortar crack
    if (d2 - d1 < 2.0 && hash(x, y, v) < 0.5) return '#353341';
    return hash(x, y, v + 30) < 0.04 ? '#6c6a7a' : STONE[c1];
  },
  surface(x, d, v) {
    const moss = Math.sin(x * 0.7 + v * 2.1) > 0.35;
    if (d === 0) return moss ? '#7aa860' : '#8a8798';
    if (d === 1) return moss ? '#4f7a40' : '#6c6a7a';
    if (d === 2 && moss && x % 3 !== 0) return '#3a5a30';
    return null;
  },
  edge: { outer: '#121018', inner: '#2a2834', surfOuter: '#3a3846', surfInner: '#545262', style: 'chip', r: 1 },
  top(p, v) {
    const y = TOP_Y;
    if (v === 0) { p(5, y - 1, '#6c6a7a', 2, 1); p(13, y - 2, '#5a5868', 3, 2); p(13, y - 2, '#8a8798', 2, 1); } // rubble
    if (v === 1) { // glowing mushrooms
      p(7, y - 3, '#c8d4d0', 1, 3); p(5, y - 5, '#3fbfb4', 5, 2); p(6, y - 5, '#9ff3ea', 2, 1);
      p(12, y - 2, '#c8d4d0', 1, 2); p(11, y - 3, '#3fbfb4', 3, 1);
    }
    if (v === 2) { // crystals
      p(10, y - 5, '#8a5ad8', 2, 5); p(10, y - 5, '#d8bcff', 1, 3); p(12, y - 3, '#6a3ab8', 2, 3); p(12, y - 3, '#b68cff', 1, 1);
    }
  },
  bottom(p, v) {
    // stalactites: 1-2 hanging cones
    const n = v === 0 ? 0 : v === 3 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const x0 = 2 + Math.floor(hash(v, i, 40) * 9), len = 4 + Math.floor(hash(i, v, 41) * 8), wd = 4 + (i ? 0 : 1);
      for (let y = 0; y < len; y++) {
        const half = Math.max(0, Math.round((wd / 2) * (1 - y / len)));
        const cx = x0 + 2;
        p(cx - half, y, '#2a2834', half * 2 + 1, 1);
        if (half > 0) p(cx - half + 1, y, '#4a4856', Math.max(1, half * 2 - 1), 1);
      }
      if (v === 3 && i === 0) p(x0 + 2, len + 1, '#7ab8e8'); // a drip
    }
  },
  rope(p) { // iron chain: links face-on and edge-on in turn
    for (let y = 0; y < 16; y += 8) {
      p(6, y, '#4a4e58', 4, 6); p(7, y + 1, '#1a1a20', 2, 4); p(6, y, '#c4c8d4', 1, 5);
      p(7, y + 6, '#8a8f9c', 2, 2); p(7, y + 6, '#c4c8d4', 1, 2);
    }
  },
  ladder(p) { // mine ladder: dark planks with iron bands
    p(3, 0, '#5a4632', 2, 16); p(11, 0, '#5a4632', 2, 16);
    p(3, 0, '#76604a', 1, 16); p(11, 0, '#76604a', 1, 16);
    p(3, 2, '#8a8f9c', 2, 1); p(11, 2, '#8a8f9c', 2, 1);
    p(5, 8, '#5a4632', 6, 2); p(5, 8, '#76604a', 6, 1); p(5, 9, '#c4c8d4'); p(10, 9, '#c4c8d4');
  },
};

/* ---------------- Clockwork Spire: riveted brass plate, catwalk tops, pipes, cables ---------------- */
function gear(p: Paint, cx: number, cy: number, r: number, body: string, hi: string): void {
  for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
    const d = Math.hypot(x, y), a = Math.atan2(y, x);
    const tooth = Math.cos(a * 6) > 0.4 && d <= r + 1.2;
    if (d <= 1.2) p(cx + x, cy + y, '#2a1a08');
    else if (d <= r || tooth) p(cx + x, cy + y, x + y < 0 ? hi : body);
  }
}
const clockwork: Tileset = {
  name: 'Clockwork Spire',
  sky: ['#2e2216', '#4e3620', '#20170e'],
  fill(x, y, v) {
    const px = x % 8, py = y % 8, plate = (x >> 3) + 2 * (y >> 3);
    const steel = v === 3 && plate === 1;
    if (px === 0 || py === 0) return '#4a3418';
    if (v === 2 && plate === 3 && py % 2 === 0 && px >= 2 && px <= 6) return '#2a1a08'; // vent slots
    if ((px === 2 || px === 6) && (py === 2 || py === 6)) return steel ? '#e8ecf4' : '#fff0b0'; // rivets
    if ((px === 3 || px === 7) && (py === 3 || py === 7) && (px === 3 || py === 3)) return steel ? '#5a6272' : '#7a5420';
    if (px === 1 || py === 1) return steel ? '#c8cfdc' : '#e8c068';
    if (px === 7 || py === 7) return steel ? '#6a7282' : '#9a6e2c';
    return steel ? '#8f98a8' : '#c99a46';
  },
  surface(x, d) {
    if (d === 0) return '#e8ecf4';
    if (d === 1) return '#a8b0c0';
    if (d === 2) return x % 3 === 0 ? '#c8cfdc' : '#7a8292'; // tread
    if (d === 3) return '#3a3f4a';
    return null;
  },
  edge: { outer: '#2a1a08', inner: '#7a5420', light: '#f4d88a', surfOuter: '#3a3f4a', surfInner: '#a8b0c0', style: 'bevel', r: 0 },
  top(p, v, w, e) {
    const y = TOP_Y;
    // the catwalk's trim rail sticks out past exposed ends
    if (w) { p(1, y, '#e8ecf4', 1, 1); p(1, y + 1, '#7a8292', 1, 2); }
    if (e) { p(18, y, '#e8ecf4', 1, 1); p(18, y + 1, '#7a8292', 1, 2); }
    if (v === 1) gear(p, 10, y - 4, 3, '#b08a3a', '#e8c068');          // a gear stood on its edge
    if (v === 2) { p(5, y - 6, '#7a8292', 3, 6); p(5, y - 6, '#c8cfdc', 1, 6); p(4, y - 7, '#a8b0c0', 5, 1); p(13, y - 2, '#c99a46', 2, 2); } // pipe stub + bolt
    if (v === 3) { p(12, y - 1, '#d04a3a', 3, 1); p(13, y - 3, '#3a3f4a', 1, 2); } // valve wheel
  },
  bottom(p, v) {
    if (v === 1) { // a pipe dropping out with a flange
      const x = 4;
      p(x, 0, '#7a8292', 3, 6); p(x, 0, '#c8cfdc', 1, 6); p(x - 1, 6, '#5a6272', 5, 2); p(x - 1, 6, '#a8b0c0', 5, 1);
    }
    if (v === 3) { // a little cog on a chain
      p(8, 0, '#8a8f9c', 1, 4); gear(p, 8, 7, 2, '#9a6e2c', '#e8c068');
    }
  },
  rope(p) { // braided steel cable with a clamp
    for (let y = 0; y < 16; y++) { p(7, y, y % 2 ? '#8f98a8' : '#c8cfdc'); p(8, y, y % 2 ? '#c8cfdc' : '#6a7282'); }
    p(6, 10, '#c99a46', 4, 3); p(6, 10, '#fff0b0', 4, 1); p(6, 12, '#7a5420', 4, 1);
  },
  ladder(p) { // riveted steel ladder, two round rungs per tile
    p(3, 0, '#6a7282', 2, 16); p(11, 0, '#6a7282', 2, 16);
    p(3, 0, '#c8cfdc', 1, 16); p(11, 0, '#c8cfdc', 1, 16);
    for (const y of [3, 11]) { p(5, y, '#8f98a8', 6, 2); p(5, y, '#e8ecf4', 6, 1); p(4, y, '#fff0b0'); p(11, y, '#fff0b0'); }
  },
};

export const TILESETS: Record<string, Tileset> = {
  Classic: classic, Beach: beach, Forest: forest, Cave: cave, 'Clockwork Spire': clockwork,
};
/** The tileset an area is drawn with (areas without their own yet use Classic). */
export const tilesetFor = (area: string): Tileset => TILESETS[area] ?? classic;

/** Paint a sprite through a tileset painter. */
export const painter = (s: Sprite, put: (s: Sprite, x: number, y: number, c: string, w?: number, h?: number) => void): Paint =>
  (x, y, c, w, h) => put(s, x, y, c, w, h);
