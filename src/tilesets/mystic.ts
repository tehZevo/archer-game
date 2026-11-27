import { hash, TOP_Y, type Paint, type Tileset } from '../tilekit';

/* ============================================================
   MYSTERIOUS TILESETS: the middle tier, where the tower gets strange.
   Mushroom Grotto, Crystal Caverns, Sunken Ruins.
   ============================================================ */

/** Wrapped offset from a point in a 16px tile (so patterns tile seamlessly). */
const wrap = (d: number): number => (d > 8 ? d - 16 : d < -8 ? d + 16 : d);

/** A crystal spike `h` px tall and `w` px wide at its base, rising from (x, y): lit left face, dark right. */
function spike(p: Paint, x: number, y: number, h: number, w: number, lit: string, dark: string, glint: string): void {
  for (let i = 0; i < h; i++) {
    const half = Math.max(0, Math.round((w / 2) * (i / h)));
    p(x - half, y - h + i, lit, half + 1, 1);
    if (half > 0) p(x + 1, y - h + i, dark, half, 1);
  }
  p(x, y - h, glint);
}

/* ---------------- Mushroom Grotto: giant mushroom caps with gills, glowing mycelium ---------------- */
const grotto: Tileset = {
  name: 'Mushroom Grotto',
  glow: [1],
  sky: ['#160e22', '#241634', '#0e0818'],
  fill(x, y, v) {
    // dark spongy loam threaded with glowing mycelium
    let col = hash(x >> 1, y >> 1, v + 110) < 0.3 ? '#2a1e30' : '#32243a';
    const thread = Math.round(4 + v * 3 + 2 * Math.sin(x * 0.45 + v)) % 16;
    if (y === thread && hash(x, v, 111) < 0.8) col = '#6a5a8a';
    if (y === thread && x % 5 === v && hash(x, y, v + 115) < 0.45) col = '#9ff3ea'; // a glowing bead, now and then
    if (hash(x, y, v + 112) < 0.006) col = '#5ad8c8'; // a spore
    return col;
  },
  surface(x, d, v) {
    // the top is a mushroom cap: speckled magenta, then cream gills underneath
    const spot = (x - 3 - v * 4) & 7;
    if (d === 0) return '#f0a0c8';
    if (d <= 3) return (spot <= 1 && (d === 1 || d === 2)) ? '#fff0f4' : d === 1 ? '#d46aa0' : '#b4508a';
    if (d <= 5) return x % 2 ? '#d8c8b0' : '#a89880';
    if (d === 6) return x % 2 ? '#a89880' : null;
    return null;
  },
  edge: { outer: '#0e0818', inner: '#22182a', surfOuter: '#6a2a52', surfInner: '#d46aa0', style: 'round', r: 4 },
  top(p, v, w, e) {
    const y = TOP_Y;
    // the cap's rim curls down past exposed ends
    if (w) { p(0, y, '#b4508a', 2, 3); p(0, y, '#f0a0c8', 2, 1); p(1, y + 3, '#d8c8b0', 1, 1); }
    if (e) { p(18, y, '#b4508a', 2, 3); p(18, y, '#f0a0c8', 2, 1); p(18, y + 3, '#d8c8b0', 1, 1); }
    if (v === 1) { // little glowing mushrooms
      p(6, y - 3, '#c8d4d0', 1, 3); p(4, y - 5, '#3fbfb4', 5, 2); p(5, y - 5, '#9ff3ea', 2, 1);
      p(10, y - 2, '#c8d4d0', 1, 2); p(9, y - 3, '#3fbfb4', 3, 1);
    }
    if (v === 2) { // a spore puff
      p(12, y - 3, '#8a6ab0', 3, 3); p(12, y - 3, '#c8a8f0', 1, 1); p(11, y - 6, '#c8a8f0'); p(14, y - 8, '#9ff3ea');
    }
    if (v === 3) { p(7, y - 4, '#e8d8c0', 2, 4); p(5, y - 6, '#f0a0c8', 6, 2); p(6, y - 6, '#fff0f4'); p(9, y - 5, '#fff0f4'); } // a baby cap
  },
  bottom(p, v) {
    // glowing mycelium strands with bright tips
    for (let i = 0; i < 1 + (v >> 1); i++) {
      let x = 3 + Math.floor(hash(i, v, 113) * 10);
      const len = 3 + Math.floor(hash(v, i, 114) * 7);
      for (let y = 0; y < len; y++) {
        if (hash(x, y, i + 7) < 0.25) x += hash(y, x, 3) < 0.5 ? -1 : 1;
        p(x, y, '#6a5a8a');
      }
      p(x, len, '#9ff3ea');
    }
  },
  rope(p) { // a mycelium cord with glowing nodes
    for (let y = 0; y < 16; y++) p(7 + (y % 4 === 3 ? 1 : 0), y, '#c8b8d8', 2, 1);
    p(7, 0, '#e8dcf0', 1, 16);
    for (const y of [3, 11]) { p(6, y, '#3fbfb4', 4, 2); p(7, y, '#9ff3ea', 2, 1); }
  },
  ladder(p) { // pale stalks with little cap rungs
    p(3, 0, '#d8c8b0', 2, 16); p(11, 0, '#d8c8b0', 2, 16);
    p(3, 0, '#f0e4d0', 1, 16); p(11, 0, '#f0e4d0', 1, 16);
    p(4, 7, '#b4508a', 8, 2); p(4, 7, '#f0a0c8', 8, 1); p(6, 7, '#fff0f4'); p(9, 8, '#fff0f4');
  },
};

/* ---------------- Crystal Caverns: dark rock studded with crystals, a jagged crystal crust ---------------- */
// an embedded crystal in two of the four variants: centre and size (0 = none)
const SHARDS = [0, 1, 2, 3].map((v) => [3 + hash(v, 1, 120) * 10, 4 + hash(v, 2, 121) * 8, v === 1 ? 3.5 : v === 3 ? 2 : 0] as const);
const crystal: Tileset = {
  name: 'Crystal Caverns',
  glow: [0, 1, 2, 3],
  sky: ['#100c24', '#1c1640', '#0a0818'],
  fill(x, y, v) {
    // a crystal: a diamond, lit on its upper-left faces
    const [cx, cy, r] = SHARDS[v];
    const dx = wrap(x + 0.5 - cx), dy = wrap(y + 0.5 - cy);
    const k = Math.abs(dx) + Math.abs(dy) * 0.6;
    if (r && k < r) return dx < 0 ? (dy < 0 ? '#d8ccff' : '#9a80f0') : (dy < 0 ? '#7a60d0' : '#4a3a9a');
    if (r && k < r + 0.8) return '#1a1430';
    // dark rock in angular slabs
    const slab = Math.floor((x * 2 + y + v * 5) / 9) % 3;
    let col = ['#2a2440', '#322a4c', '#262036'][slab];
    if (hash(x, y, v + 123) < 0.03) col = '#8a7ad8'; // a glint
    return col;
  },
  surface(x, d, v) {
    // a crust of crystal whose lower edge is jagged teeth
    const tooth = 3 + Math.abs(((x + v * 3) % 6) - 3);
    if (d === 0) return '#f0ecff';
    if (d === 1) return x % 4 === v % 4 ? '#ffffff' : '#c0b0f8';
    if (d < tooth) return d < tooth - 1 ? '#8a70e0' : '#5a44b0';
    return null;
  },
  edge: { outer: '#0a0818', inner: '#1a1430', light: '#5a4c88', surfOuter: '#3a2a80', surfInner: '#c0b0f8', style: 'bevel', r: 0 },
  top(p, v, w, e) {
    const y = TOP_Y;
    if (w) spike(p, 1, y + 1, 3, 2, '#c0b0f8', '#5a44b0', '#ffffff');
    if (e) spike(p, 18, y + 1, 3, 2, '#c0b0f8', '#5a44b0', '#ffffff');
    if (v === 1) { spike(p, 8, y, 8, 4, '#a8e8ff', '#3a88c8', '#ffffff'); spike(p, 11, y, 4, 3, '#c0b0f8', '#5a44b0', '#ffffff'); }
    if (v === 2) { spike(p, 5, y, 5, 3, '#c0b0f8', '#5a44b0', '#ffffff'); spike(p, 14, y, 3, 2, '#ffb8e8', '#b04a90', '#ffffff'); }
    if (v === 3) { spike(p, 10, y, 6, 4, '#c0b0f8', '#5a44b0', '#ffffff'); spike(p, 7, y, 3, 2, '#a8e8ff', '#3a88c8', '#ffffff'); spike(p, 13, y, 4, 2, '#c0b0f8', '#5a44b0', '#ffffff'); }
  },
  bottom(p, v) {
    // hanging shards: upside-down spikes
    for (let i = 0; i < (v === 0 ? 1 : v === 3 ? 3 : 2); i++) {
      const x = 3 + Math.floor(hash(i, v, 124) * 10), h = 3 + Math.floor(hash(v, i, 125) * 6), wd = 2 + (h > 6 ? 1 : 0);
      for (let j = 0; j < h; j++) {
        const half = Math.max(0, Math.round((wd / 2) * (1 - j / h)));
        p(x - half, j, '#a890f0', half + 1, 1);
        if (half > 0) p(x + 1, j, '#5a44b0', half, 1);
      }
      p(x, h - 1, '#ffffff');
    }
  },
  rope(p) { // a chain of crystal beads on silver wire
    p(7, 0, '#8a8f9c', 1, 16); p(8, 0, '#c4c8d4', 1, 16);
    for (const [y, lit, dark] of [[1, '#a8e8ff', '#3a88c8'], [9, '#c0b0f8', '#5a44b0']] as const) {
      p(6, y + 1, lit, 2, 3); p(8, y + 1, dark, 2, 3); p(7, y, lit, 2, 1); p(7, y + 4, dark, 2, 1); p(6, y + 1, '#ffffff');
    }
  },
  ladder(p) { // silver rails with crystal-studded rungs
    p(3, 0, '#8a8f9c', 2, 16); p(11, 0, '#8a8f9c', 2, 16);
    p(3, 0, '#e8ecf4', 1, 16); p(11, 0, '#e8ecf4', 1, 16);
    p(5, 8, '#8a8f9c', 6, 2); p(5, 8, '#c4c8d4', 6, 1); p(7, 7, '#c0b0f8', 2, 3); p(7, 7, '#ffffff');
  },
};

/* ---------------- Sunken Ruins: mossy brick ruins underwater, kelp, coral ---------------- */
const ruins: Tileset = {
  name: 'Sunken Ruins',
  sky: ['#0a3a4a', '#14586a', '#06283a'],
  fill(x, y, v) {
    // offset rows of big carved bricks (8x4), stained with algae
    const row = y >> 2, bx = (x + (row & 1) * 4) & 7;
    if ((y & 3) === 0 || bx === 0) return '#1e3a3a';
    let col = hash((x + (row & 1) * 4) >> 3, row, v + 130) < 0.3 ? '#5a7a74' : '#6a8a82';
    if ((y & 3) === 1 && bx !== 0) col = '#7e9e94';
    if (hash(x >> 1, y >> 1, v + 131) < 0.12) col = '#4e7a5a'; // algae
    if (v === 3 && row === 1 && bx >= 2 && bx <= 5 && (y & 3) === 2 && x < 8) col = '#2e4a48'; // a carved glyph
    if (v === 2 && x === 10 + (y >> 2) && y > 4) col = '#2e4a48'; // a crack
    return col;
  },
  surface(x, d, v) {
    // a ragged carpet of sea moss
    const patch = Math.sin(x * 0.6 + v * 1.7) > -0.3;
    if (d === 0) return patch ? '#7ad8b0' : '#8aa8a0';
    if (d === 1) return patch ? '#3a9a78' : null;
    if (d === 2 && patch && (x + v) % 3 !== 0) return '#2a7a60';
    return null;
  },
  edge: { outer: '#0a1e20', inner: '#3e5e5a', light: '#9ab8ae', surfOuter: '#1a4a40', surfInner: '#3a9a78', style: 'bevel', r: 0 },
  top(p, v) {
    const y = TOP_Y;
    if (v === 1 || v === 3) { // kelp fronds, swaying
      for (const [x0, h] of v === 1 ? [[6, 10], [9, 7]] : [[13, 9]]) {
        for (let i = 0; i < h; i++) {
          const x = x0 + Math.round(Math.sin(i * 0.8) * 1.2);
          p(x, y - 1 - i, i % 3 === 0 ? '#5ab060' : '#3a8a48');
        }
        p(x0 + 1, y - 4, '#c8b040'); // a float bladder
      }
    }
    if (v === 2) { // branching coral
      p(9, y - 5, '#ff7a8a', 1, 5); p(7, y - 4, '#ff7a8a', 1, 3); p(11, y - 6, '#ff7a8a', 1, 4);
      p(7, y - 2, '#ff7a8a', 3, 1); p(10, y - 3, '#ff7a8a', 2, 1); p(9, y - 6, '#ffb0b8'); p(7, y - 5, '#ffb0b8'); p(11, y - 7, '#ffb0b8');
    }
    if (v === 0) { p(4, y - 2, '#a8a090', 3, 2); p(4, y - 2, '#d8d0c0', 2, 1); p(13, y - 5, '#bfefff'); } // a stone and a bubble
  },
  bottom(p, v) {
    // straggling algae and the odd rising bubble
    for (let i = 0; i < 1 + (v & 1); i++) {
      const x = 3 + Math.floor(hash(i, v, 132) * 10), len = 2 + Math.floor(hash(v, i, 133) * 6);
      for (let j = 0; j < len; j++) p(x + (j % 3 === 2 ? 1 : 0), j, '#3a8a48');
    }
    if (v >= 2) { p(10, 7, '#bfefff'); p(12, 10, '#7ac8e0'); }
  },
  rope(p) { // a kelp strand with float bladders
    for (let y = 0; y < 16; y++) { const x = 7 + Math.round(Math.sin(y * Math.PI / 8)); p(x, y, '#3a8a48', 2, 1); p(x, y, '#5ab060'); }
    p(5, 4, '#c8b040', 2, 2); p(10, 12, '#c8b040', 2, 2); p(5, 4, '#f0e070'); p(10, 12, '#f0e070');
  },
  ladder(p) { // corroded bronze, gone verdigris
    p(3, 0, '#3a8a78', 2, 16); p(11, 0, '#3a8a78', 2, 16);
    p(3, 0, '#7ac8a8', 1, 16); p(11, 0, '#7ac8a8', 1, 16);
    p(4, 4, '#8a6a3a', 1, 2); p(12, 12, '#8a6a3a', 1, 2); // bronze showing through
    p(5, 8, '#3a8a78', 6, 2); p(5, 8, '#7ac8a8', 6, 1);
  },
};

export const MYSTIC: Record<string, Tileset> = {
  'Mushroom Grotto': grotto, 'Crystal Caverns': crystal, 'Sunken Ruins': ruins,
};
