import { hash, TOP_Y, type Paint, type Tileset } from '../tilekit';

/* ============================================================
   LATE TILESETS: the top tiers, dreamlike and then cosmic.
   Dreamwood, Mirror Lake, Starfall Observatory, Void Garden.
   ============================================================ */

/** A 5-point twinkle centred on (x, y). */
const twinkle = (p: Paint, x: number, y: number, arm: string, core: string): void => {
  p(x - 1, y, arm, 3, 1); p(x, y - 1, arm, 1, 3); p(x, y, core);
};

/* ---------------- Dreamwood: pastel swirled soil, candy turf, lanterns, ribbons ---------------- */
const dreamwood: Tileset = {
  name: 'Dreamwood',
  sky: ['#6a5a9a', '#a088c8', '#e8c8e8'],
  fill(x, y, v) {
    // soft swirling pastel bands
    const t = y + 2.5 * Math.sin(x * 0.4 + v * 1.3) + 1.5 * Math.sin(y * 0.5 + v);
    const band = Math.floor(t / 3) & 3;
    let col = ['#b8a0d8', '#c8acdc', '#a890cc', '#c0a4e0'][band];
    if (hash(x, y, v + 140) < 0.025) col = '#fff8d8'; // a speck of starlight
    if (v === 2 && (x - 9) ** 2 + (y - 8) ** 2 <= 3) col = (x - 9) + (y - 8) < 0 ? '#ffd8f0' : '#e8a8d0'; // a sugar pebble
    return col;
  },
  surface(x, d, v) {
    if (d === 0) return '#fff0fa';
    if (d <= 2) return '#ffc8e8';
    // round candy scallops hanging into the soil
    const k = (x + v * 2) % 5;
    const depth = k === 0 ? 0 : k === 2 ? 3 : 2;
    if (d <= 2 + depth) return d === 2 + depth ? '#c888c0' : '#e8a8d8';
    return null;
  },
  edge: { outer: '#5a4a7a', inner: '#8a78b0', surfOuter: '#a868a0', surfInner: '#ffc8e8', style: 'round', r: 4 },
  top(p, v, w, e) {
    const y = TOP_Y;
    if (w) { p(0, y, '#ffc8e8', 2, 2); p(0, y, '#fff0fa', 2, 1); }
    if (e) { p(18, y, '#ffc8e8', 2, 2); p(18, y, '#fff0fa', 2, 1); }
    if (v === 1) { // a paper lantern on a curled stem
      p(9, y - 5, '#a8d8b8', 1, 5); p(10, y - 6, '#a8d8b8', 1, 1);
      p(10, y - 9, '#ffb070', 3, 3); p(10, y - 9, '#fff0b0', 1, 2); p(11, y - 10, '#c87040'); p(11, y - 6, '#c87040');
    }
    if (v === 2) { // a puffball sapling
      p(6, y - 3, '#a8d8b8', 1, 3); p(4, y - 7, '#ffd8f0', 5, 4); p(5, y - 8, '#ffd8f0', 3, 1); p(5, y - 7, '#ffffff', 2, 1);
    }
    if (v === 3) { p(13, y - 3, '#a8d8b8', 1, 3); p(12, y - 5, '#a8e8ff', 3, 2); p(13, y - 5, '#ffffff'); } // a bluebell
  },
  bottom(p, v) {
    // glowing pastel drops on thin threads
    for (let i = 0; i < 1 + (v >> 1); i++) {
      const x = 3 + Math.floor(hash(i, v, 141) * 10), len = 2 + Math.floor(hash(v, i, 142) * 5);
      p(x, 0, '#c8acdc', 1, len); p(x - 1, len, i ? '#a8e8ff' : '#ffd8f0', 3, 2); p(x - 1, len, '#ffffff');
    }
  },
  rope(p) { // a twisted two-colour ribbon
    for (let y = 0; y < 16; y++) {
      const s = Math.round(Math.sin(y * Math.PI / 4));
      p(7 + s, y, '#ffb0d8'); p(8 - s, y, '#a8d8ff');
    }
  },
  ladder(p) { // candy-striped rails
    for (let y = 0; y < 16; y++) { const c = ((y >> 1) & 1) ? '#ffffff' : '#ff90c0'; p(3, y, c, 2, 1); p(11, y, c, 2, 1); }
    p(5, 7, '#a8d8b8', 6, 2); p(5, 7, '#d8f8e0', 6, 1);
  },
};

/* ---------------- Mirror Lake: polished ice with reflective streaks; reflections hang beneath ---------------- */
const mirror: Tileset = {
  name: 'Mirror Lake',
  sky: ['#3a4a6a', '#6a7a9a', '#a8b8cc'],
  fill(x, y, v) {
    // pale blue-silver glass with diagonal glints
    const diag = (x + y + v * 5) % 16;
    if (diag === 0 || diag === 1) return '#e8f4ff';
    if (diag === 3) return '#c8dcf0';
    let col = y < 8 ? '#9ab8d8' : '#8aa8cc';
    if (hash(x, y, v + 150) < 0.03) col = '#ffffff';
    if (v === 3 && x >= 4 && x <= 11 && y === 10) col = '#7a98bc'; // a hairline crack
    return col;
  },
  surface(x, d, v) {
    if (d === 0) return '#ffffff';
    if (d === 1) return '#d8ecfa';
    // a thin waterline shimmering along the top
    if (d === 2) return (x + v) % 4 === 0 ? '#ffffff' : '#a8c8e8';
    return null;
  },
  edge: { outer: '#3a4a68', inner: '#6a88ac', light: '#e8f4ff', surfOuter: '#5a7898', surfInner: '#d8ecfa', style: 'bevel', r: 0 },
  top(p, v) {
    const y = TOP_Y;
    if (v === 1) { // silver reeds
      for (const [x, h] of [[6, 6], [7, 8], [9, 5]]) { p(x, y - h, '#b8c8d8', 1, h); p(x, y - h, '#ffffff'); }
    }
    if (v === 2) { p(11, y - 3, '#d8ecfa', 3, 3); p(12, y - 5, '#d8ecfa', 1, 2); p(11, y - 3, '#ffffff', 1, 2); } // an ice crystal
    if (v === 3) { p(3, y - 2, '#e8f0f8', 6, 1); p(5, y - 3, '#e8f0f8', 3, 1); p(12, y - 4, '#e8f0f8', 4, 1); } // mist
  },
  bottom(p, v) {
    // the top's reflection, hanging upside down and paler
    if (v === 1) for (const [x, h] of [[6, 6], [7, 8], [9, 5]]) { p(x, 0, '#8aa8cc', 1, h); p(x, h - 1, '#c8dcf0'); }
    if (v === 2) { p(11, 0, '#a8c8e8', 3, 3); p(12, 3, '#a8c8e8', 1, 2); }
    if (v === 0 || v === 3) p(4 + v, 0, '#c8dcf0', 6, 1); // a faint ripple
  },
  rope(p) { // frosted silver chain
    for (let y = 0; y < 16; y += 4) { p(7, y, '#c8d4e4', 2, 3); p(7, y + 1, '#5a6a88', 2, 1); p(7, y, '#ffffff'); p(8, y + 3, '#8a98b0'); }
  },
  ladder(p) { // a glass ladder
    p(3, 0, '#a8c8e8', 2, 16); p(11, 0, '#a8c8e8', 2, 16);
    p(3, 0, '#ffffff', 1, 16); p(12, 0, '#7a98bc', 1, 16);
    p(5, 7, '#c8dcf0', 6, 2); p(5, 7, '#ffffff', 6, 1);
  },
};

/* ---------------- Starfall Observatory: midnight marble with gold constellations, brass floors ---------------- */
// one constellation per variant: a few stars joined in order
const STARS = [0, 1, 2, 3].map((v) => Array.from({ length: 2 + (v & 1) + (v >> 1) }, (_, i) =>
  [2 + Math.floor(hash(i, v, 160) * 12), 2 + Math.floor(hash(v, i, 161) * 12)] as const));
/** Pixels of a line from a to b, for constellation lines. */
function onLine(x: number, y: number, [ax, ay]: readonly [number, number], [bx, by]: readonly [number, number]): boolean {
  const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
  for (let i = 0; i <= n; i++) if (Math.round(ax + ((bx - ax) * i) / n) === x && Math.round(ay + ((by - ay) * i) / n) === y) return true;
  return false;
}
const starfall: Tileset = {
  name: 'Starfall Observatory',
  sky: ['#04041a', '#0c0c34', '#1a1450'],
  fill(x, y, v) {
    const s = v === 1 || v === 3 ? STARS[v] : [];
    if (s.some(([sx, sy]) => sx === x && sy === y)) return '#fff0b0';
    if (s.some(([sx, sy]) => Math.abs(sx - x) + Math.abs(sy - y) === 1)) return '#8a6a2a';
    for (let i = 1; i < s.length; i++) if (onLine(x, y, s[i - 1], s[i])) return '#4a4058';
    // midnight marble with faint veins
    const vein = Math.abs(Math.sin((x * 0.3 + y * 0.7 + v) * 1.1)) < 0.08;
    return vein ? '#3e3e74' : hash(x, y, v + 162) < 0.02 ? '#5a5a98' : y < 8 === (x < 8) ? '#2a2a5c' : '#262656';
  },
  surface(x, d) {
    // a brass floor with an engraved line
    if (d === 0) return '#ffe8a0';
    if (d === 1) return '#d8b050';
    if (d === 2) return x % 8 === 3 ? '#ffe8a0' : '#a8802e';
    if (d === 3) return '#5a4418';
    return null;
  },
  edge: { outer: '#04041a', inner: '#10103a', light: '#3a3a7a', surfOuter: '#5a4418', surfInner: '#d8b050', style: 'bevel', r: 0 },
  top(p, v, w, e) {
    const y = TOP_Y;
    if (w) { p(1, y, '#ffe8a0', 1, 1); p(1, y + 1, '#a8802e', 1, 3); }
    if (e) { p(18, y, '#ffe8a0', 1, 1); p(18, y + 1, '#a8802e', 1, 3); }
    if (v === 1) { // a little brass telescope on a tripod
      p(7, y - 3, '#a8802e', 1, 3); p(5, y - 1, '#a8802e', 1, 1); p(9, y - 1, '#a8802e', 1, 1); p(6, y - 2, '#a8802e', 3, 1);
      for (let i = 0; i < 5; i++) p(5 + i, y - 4 - (i >> 1), i < 2 ? '#d8b050' : '#ffe8a0', 1, 2);
      p(10, y - 7, '#a8e8ff');
    }
    if (v === 2) { // a celestial globe
      p(12, y - 2, '#a8802e', 1, 2); p(11, y - 1, '#a8802e', 3, 1);
      p(10, y - 7, '#2a3a8a', 5, 5); p(10, y - 7, '#4a6ad8', 2, 2); p(9, y - 5, '#d8b050', 7, 1); p(13, y - 6, '#fff0b0');
    }
    if (v === 3) twinkle(p, 6, y - 3, '#c8962a', '#fff8d8'); // a fallen star
  },
  bottom(p, v) {
    if (v < 2) return;
    // star ornaments on gold threads
    const x = v === 2 ? 5 : 11, len = v === 2 ? 4 : 7;
    p(x, 0, '#a8802e', 1, len); twinkle(p, x, len + 1, '#ffe070', '#ffffff');
  },
  rope(p) { // gold cord with a star charm
    p(7, 0, '#c8962a', 2, 16); p(7, 0, '#ffe070', 1, 16);
    twinkle(p, 8, 10, '#fff0b0', '#ffffff');
  },
  ladder(p) { // a brass library ladder
    p(3, 0, '#a8802e', 2, 16); p(11, 0, '#a8802e', 2, 16);
    p(3, 0, '#ffe8a0', 1, 16); p(11, 0, '#ffe8a0', 1, 16);
    p(5, 7, '#5a4418', 6, 2); p(5, 7, '#d8b050', 6, 1);
  },
};

/* ---------------- Void Garden: starry black ground, violet glowing growth, floating-island undersides ---------------- */
const voidGarden: Tileset = {
  name: 'Void Garden',
  sky: ['#000004', '#05021a', '#0c0624'],
  fill(x, y, v) {
    // black earth full of stars, split by glowing violet veins
    const vein = Math.round(8 + 5 * Math.sin(y * 0.5 + v * 1.9));
    if (x === vein && v === 1) return '#8a4ad8';
    if (Math.abs(x - vein) === 1 && v === 1 && hash(x, y, 170) < 0.5) return '#3a1a6a';
    const r = hash(x, y, v + 171);
    if (r < 0.01) return '#ffffff';
    if (r < 0.02) return '#a890e0';
    return hash(x >> 2, y >> 2, v + 172) < 0.3 ? '#1e1230' : '#1a0e2a';
  },
  surface(x, d, v) {
    // violet moss whose glow fades into the dark
    if (d === 0) return '#d8a0ff';
    if (d === 1) return '#8a4ad8';
    if (d === 2) return '#5a2a98';
    if (d <= 3 + ((x * 3 + v) % 3)) return '#2a1048';
    return null;
  },
  edge: { outer: '#000000', inner: '#2a1a40', surfOuter: '#2a1048', surfInner: '#8a4ad8', style: 'round', r: 3 },
  top(p, v) {
    const y = TOP_Y;
    // glowing tips along the top
    for (let x = 2; x < 18; x++) if (hash(x, v, 173) < 0.3) { p(x, y - 2, '#5a2a98', 1, 2); p(x, y - 2, '#d8a0ff'); }
    if (v === 1) { // a void blossom: black petals around a violet glow
      p(9, y - 4, '#2a1048', 1, 4);
      p(7, y - 7, '#000000', 5, 3); p(8, y - 8, '#000000', 3, 5); p(9, y - 7, '#f0c8ff'); p(8, y - 6, '#b878f0', 3, 1); p(9, y - 7, '#ffffff');
    }
    if (v === 2) { p(13, y - 6, '#d8a0ff'); p(5, y - 8, '#a890e0'); p(11, y - 10, '#ffffff'); } // drifting motes
    if (v === 3) { p(5, y - 5, '#3a1a6a', 3, 5); p(6, y - 6, '#5a2a98', 1, 1); p(5, y - 5, '#8a4ad8', 1, 2); } // an obelisk shard
  },
  bottom(p, v) {
    // a floating island's underside: jagged rock tapering away, with a loose chunk below
    const len = 3 + v * 2;
    for (let y = 0; y < len; y++) {
      const half = Math.round(6 * (1 - y / len) + (hash(y, v, 174) - 0.5) * 2);
      if (half <= 0) break;
      p(8 - half, y, '#1a0e2a', half * 2, 1);
      p(8 - half, y, '#5a2a98', 1, 1); p(7 + half, y, '#0e0818', 1, 1);
    }
    p(7, len, '#8a4ad8', 2, 1);
    if (v & 1) { p(11, len + 1, '#1a0e2a', 2, 2); p(11, len + 1, '#5a2a98'); }
  },
  rope(p) { // a thread of violet energy
    for (let y = 0; y < 16; y++) p(8, y, y % 4 === 0 ? '#ffffff' : y % 2 ? '#8a4ad8' : '#d8a0ff');
    p(7, 4, '#5a2a98', 3, 1); p(7, 12, '#5a2a98', 3, 1);
  },
  ladder(p) { // obsidian rails with glowing rungs
    p(3, 0, '#1a1028', 2, 16); p(11, 0, '#1a1028', 2, 16);
    p(3, 0, '#3a2a58', 1, 16); p(11, 0, '#3a2a58', 1, 16);
    p(5, 7, '#8a4ad8', 6, 2); p(5, 7, '#d8a0ff', 6, 1);
  },
};

export const LATE: Record<string, Tileset> = {
  Dreamwood: dreamwood, 'Mirror Lake': mirror, 'Starfall Observatory': starfall, 'Void Garden': voidGarden,
};
