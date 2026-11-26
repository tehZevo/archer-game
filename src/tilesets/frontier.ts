import { hash, TOP_Y, type Paint, type Tileset } from '../tilekit';

/* ============================================================
   FRONTIER TILESETS: the branches off the main roads.
   Ember Wastes (scorched lava rock), Old Keep (castle masonry),
   Chapel Spire (pale limestone and stained glass), Sky Reef (coral
   grown on cloud stone), Frozen Summit (packed snow over blue ice).
   ============================================================ */

/** A hanging icicle or drip: `len` px long, tapering to a point. */
const drip = (p: Paint, x: number, len: number, col: string, tip: string): void => {
  p(x - 1, 0, col, 3, Math.ceil(len / 3)); p(x, 0, col, 1, len - 1); p(x, len - 1, tip);
};

/* ---------------- Ember Wastes: cracked basalt with glowing lava veins, ash on top ---------------- */
const wastes: Tileset = {
  name: 'Ember Wastes',
  sky: ['#1a0a0a', '#4a160e', '#a8401a'],
  fill(x, y, v) {
    // cracked plates of basalt; the cracks glow where they run deep
    const crack = (x + Math.round(3 * Math.sin(y * 0.6 + v)) + v * 3) % 9 === 0 || (y + Math.round(2 * Math.sin(x * 0.5 + v * 2))) % 11 === 0;
    if (crack) return y > 8 && hash(x, y, v + 200) < 0.3 ? '#e85a14' : '#160c0a';
    if (hash(x, y, v + 201) < 0.008) return '#ffb040'; // an ember caught in the rock
    return (x >> 2) % 2 === (y >> 2) % 2 ? '#2e2220' : '#3a2a26';
  },
  surface(x, d, v) {
    // a crust of grey ash over a scorched band
    if (d === 0) return '#8a7a74';
    if (d === 1) return hash(x, v, 202) < 0.2 ? '#6a5a54' : '#a89890';
    if (d === 2) return '#4a3a34';
    if (d === 3 && (x + v) % 6 === 0) return '#ff7a1a';
    return null;
  },
  edge: { outer: '#0a0404', inner: '#1e1412', surfOuter: '#3a2a26', surfInner: '#8a7a74', style: 'chip', r: 2 },
  top(p, v, w, e) {
    const y = TOP_Y;
    if (w) p(0, y, '#6a5a54', 2, 2);
    if (e) p(18, y, '#6a5a54', 2, 2);
    if (v === 1) { // a smouldering vent
      p(7, y - 2, '#3a2a26', 6, 2); p(8, y - 3, '#3a2a26', 4, 1); p(9, y - 3, '#ff7a1a', 2, 1);
      p(9, y - 6, '#5a4a44', 1, 2); p(10, y - 8, '#4a3a34', 1, 2);
    }
    if (v === 2) { // a charred stump
      p(12, y - 5, '#1e1412', 3, 5); p(11, y - 1, '#1e1412', 5, 1); p(13, y - 4, '#ff7a1a'); p(12, y - 6, '#1e1412');
    }
    if (v === 3) { p(5, y - 2, '#ffb040', 1, 1); p(4, y - 1, '#ff7a1a', 3, 1); } // a glowing coal
  },
  glow: [1, 3],
  bottom(p, v) {
    // molten drips with bright tips
    for (let i = 0; i < 1 + (v >> 1); i++) drip(p, 3 + Math.floor(hash(i, v, 203) * 10), 3 + Math.floor(hash(v, i, 204) * 5), '#a8401a', '#ffd070');
  },
  rope(p) { // a scorched chain
    for (let y = 0; y < 16; y += 4) { p(7, y, '#4a3a34', 2, 3); p(7, y + 1, '#8a7a74', 1, 1); }
  },
  ladder(p) { // iron rails, rungs glowing with heat
    p(3, 0, '#2e2220', 2, 16); p(11, 0, '#2e2220', 2, 16);
    p(5, 7, '#a8401a', 6, 2); p(5, 7, '#ff9a40', 6, 1);
  },
};

/* ---------------- Old Keep: grey ashlar blocks, mossy battlements, banners ---------------- */
const keep: Tileset = {
  name: 'Old Keep',
  sky: ['#1e2430', '#3a4458', '#6a7488'],
  fill(x, y, v) {
    // staggered courses of dressed stone with dark mortar
    const row = y >> 2, off = row % 2 ? 4 : 0;
    if (y % 4 === 3 || (x + off) % 8 === 7) return '#2a2c34';
    const block = ((x + off) >> 3) + row * 3 + v;
    if (hash(x, y, v + 210) < 0.04) return '#4e5262'; // a chip
    if (v === 2 && row === 2 && (x + off) % 8 < 3) return '#4a6a3a'; // moss in a joint
    return ['#6a6e7c', '#62667a', '#70748a', '#5e6272'][block & 3];
  },
  surface(x, d) {
    // a worn flagstone walk
    if (d === 0) return '#a8acb8';
    if (d === 1) return x % 6 === 5 ? '#4e5262' : '#8a8e9c';
    if (d === 2) return '#4e5262';
    return null;
  },
  edge: { outer: '#14161c', inner: '#2a2c34', light: '#8a8e9c', surfOuter: '#2a2c34', surfInner: '#a8acb8', style: 'bevel', r: 0 },
  top(p, v, w, e) {
    const y = TOP_Y;
    if (w) { p(0, y - 3, '#6a6e7c', 4, 3); p(0, y - 3, '#a8acb8', 4, 1); } // a merlon
    if (e) { p(16, y - 3, '#6a6e7c', 4, 3); p(16, y - 3, '#a8acb8', 4, 1); }
    if (v === 1) { // a banner on a pole
      p(8, y - 10, '#4a3a2a', 1, 10); p(9, y - 9, '#a83a3a', 4, 5); p(9, y - 5, '#a83a3a', 1, 1); p(12, y - 5, '#a83a3a', 1, 1);
      p(10, y - 8, '#f0d060', 2, 2);
    }
    if (v === 2) { p(4, y - 1, '#4a6a3a', 5, 1); p(5, y - 2, '#5a8a4a', 3, 1); } // a tuft of moss
    if (v === 3) { // a lit brazier
      p(12, y - 3, '#3a3a42', 4, 3); p(13, y - 1, '#2a2c34', 2, 1); p(12, y - 5, '#ff9a40', 4, 2); p(13, y - 6, '#ffe070', 2, 1);
    }
  },
  sway: [1],
  glow: [3],
  bottom(p, v) {
    if (v === 1) { p(6, 0, '#4a6a3a', 1, 5); p(7, 2, '#4a6a3a', 1, 4); p(5, 3, '#5a8a4a', 1, 3); } // hanging ivy
    if (v >= 2) { p(10, 0, '#3a3a42', 1, 3); p(9, 3, '#3a3a42', 3, 1); p(9, 4, '#3a3a42', 1, 2); } // an iron hook
  },
  rope(p) { // a heavy hemp rope
    for (let y = 0; y < 16; y++) { p(7, y, '#8a6a3a', 2, 1); if (y % 3 === 0) p(7 + (y % 2), y, '#b89a5a'); }
  },
  ladder(p) { // a timber ladder
    p(3, 0, '#6a4a2a', 2, 16); p(11, 0, '#6a4a2a', 2, 16); p(3, 0, '#8a6a3a', 1, 16); p(11, 0, '#8a6a3a', 1, 16);
    p(5, 7, '#4a3a2a', 6, 2); p(5, 7, '#8a6a3a', 6, 1);
  },
};

/* ---------------- Chapel Spire: pale limestone, gilt trim, stained-glass rounds ---------------- */
const GLASS = ['#d83a5a', '#3a7ad8', '#f0c040', '#3ab87a'];
const chapel: Tileset = {
  name: 'Chapel Spire',
  sky: ['#2a2450', '#6a5a9a', '#e8c8a8'],
  fill(x, y, v) {
    // a rose window on some blocks
    if (v === 1 || v === 5) {
      const dx = x - 7.5, dy = y - 7.5, r = Math.hypot(dx, dy);
      if (r < 6) {
        if (r > 5 || Math.abs(dx) < 0.6 || Math.abs(dy) < 0.6) return '#b89a4a'; // the lead
        return GLASS[(Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 2)) + v) & 3];
      }
    }
    // large smooth blocks
    if (y % 8 === 7 || (x + (y >> 3) * 6) % 12 === 11) return '#a89c8c';
    return hash(x, y, v + 220) < 0.03 ? '#c8bcac' : y < 8 ? '#e0d8cc' : '#d8d0c2';
  },
  surface(x, d) {
    // a gilt-edged marble walk
    if (d === 0) return '#fff8e8';
    if (d === 1) return '#f0c860';
    if (d === 2) return x % 4 === 0 ? '#c89a3a' : '#e8e0d4';
    if (d === 3) return '#a89c8c';
    return null;
  },
  edge: { outer: '#4a4038', inner: '#8a7e70', light: '#fff8e8', surfOuter: '#a8803a', surfInner: '#f0c860', style: 'bevel', r: 0 },
  top(p, v, w, e) {
    const y = TOP_Y;
    if (w) { p(1, y - 2, '#e0d8cc', 2, 2); p(1, y - 3, '#f0c860', 2, 1); }
    if (e) { p(17, y - 2, '#e0d8cc', 2, 2); p(17, y - 3, '#f0c860', 2, 1); }
    if (v === 1) { // a candle stand
      p(9, y - 2, '#c89a3a', 3, 2); p(10, y - 6, '#fff8e8', 1, 4); p(10, y - 8, '#ffe070', 1, 2); p(10, y - 9, '#ffffff');
    }
    if (v === 2) { // a little bell on a frame
      p(5, y - 8, '#8a6a3a', 1, 8); p(10, y - 8, '#8a6a3a', 1, 8); p(5, y - 8, '#8a6a3a', 6, 1);
      p(7, y - 7, '#f0c860', 2, 1); p(6, y - 6, '#f0c860', 4, 2); p(7, y - 4, '#8a6a3a');
    }
    if (v === 3) { p(13, y - 3, '#3ab87a', 1, 3); p(12, y - 4, '#ffffff', 3, 1); p(13, y - 5, '#fff0a0'); } // a white lily
  },
  sway: [3],
  glow: [1],
  bottom(p, v) {
    if (v < 2) return;
    // a censer on a gold chain
    const x = v === 2 ? 6 : 10;
    p(x, 0, '#c89a3a', 1, 5); p(x - 1, 5, '#f0c860', 3, 2); p(x, 7, '#a8803a');
  },
  rope(p) { // a bell rope, red with a gold tassel
    p(7, 0, '#a83a3a', 2, 16); p(8, 0, '#d85a5a', 1, 16);
    p(7, 12, '#f0c860', 2, 2);
  },
  ladder(p) { // polished oak with brass caps
    p(3, 0, '#8a5a2a', 2, 16); p(11, 0, '#8a5a2a', 2, 16);
    p(5, 7, '#f0c860', 6, 2); p(5, 7, '#fff0b0', 6, 1);
  },
};

/* ---------------- Sky Reef: cloud stone grown over with coral ---------------- */
const reef: Tileset = {
  name: 'Sky Reef',
  sky: ['#3a8ad8', '#7ac0f0', '#d8f0ff'],
  fill(x, y, v) {
    // soft billows of cloud stone, pocked with holes
    const t = Math.sin(x * 0.7 + v) + Math.sin(y * 0.6 + v * 2) + Math.sin((x + y) * 0.4);
    if (t > 2.1) return '#9ab8d8'; // a pocket
    if (v === 3 && (x - 10) ** 2 + (y - 9) ** 2 <= 4) return (x - 10) + (y - 9) < 0 ? '#ffb0c8' : '#e87a9a'; // a coral polyp
    return t > 0.8 ? '#e8f4ff' : t > -0.8 ? '#d0e4f8' : '#bcd4f0';
  },
  surface(x, d, v) {
    // a crust of pink and teal coral, frilled into the cloud
    if (d === 0) return (x + v) % 5 < 3 ? '#ff9ab8' : '#5ad8c8';
    if (d === 1) return (x + v) % 5 < 3 ? '#e8708e' : '#2ab0a0';
    const k = (x * 3 + v) % 7, depth = k < 2 ? 2 : k < 4 ? 1 : 0;
    if (d <= 1 + depth) return '#c85a78';
    return null;
  },
  edge: { outer: '#5a7aa8', inner: '#9ab8d8', surfOuter: '#a84a68', surfInner: '#ff9ab8', style: 'round', r: 4 },
  top(p, v, w, e) {
    const y = TOP_Y;
    if (w) p(0, y, '#ff9ab8', 2, 2);
    if (e) p(18, y, '#5ad8c8', 2, 2);
    if (v === 1) { // a branching coral
      p(8, y - 6, '#ff9ab8', 1, 6); p(6, y - 8, '#ff9ab8', 1, 4); p(7, y - 5, '#ff9ab8', 1, 1);
      p(10, y - 7, '#ff9ab8', 1, 4); p(9, y - 4, '#ff9ab8', 1, 1); p(6, y - 9, '#ffd8e4'); p(10, y - 8, '#ffd8e4'); p(8, y - 7, '#ffd8e4');
    }
    if (v === 2) { // sea fans of teal
      for (let i = 0; i < 4; i++) p(11 + i, y - 2 - i, '#5ad8c8', 1, 2 + i);
      p(12, y - 6, '#b8fff0', 2, 1);
    }
    if (v === 3) { p(4, y - 3, '#f0e8a0', 3, 3); p(5, y - 2, '#ffffff'); } // a pearl in an open shell
  },
  sway: [1, 2],
  bottom(p, v) {
    // wisps of cloud trailing underneath
    for (let i = 0; i < 1 + (v >> 1); i++) {
      const x = 2 + Math.floor(hash(i, v, 230) * 9);
      p(x, 0, '#d0e4f8', 5, 2); p(x + 1, 2, '#bcd4f0', 3, 2);
    }
  },
  rope(p) { // a kelp strand
    for (let y = 0; y < 16; y++) { const s = Math.round(Math.sin(y * Math.PI / 5)); p(7 + s, y, '#2ab0a0', 2, 1); }
    p(8, 5, '#5ad8c8', 2, 1);
  },
  ladder(p) { // whitewashed driftwood
    p(3, 0, '#e8dcc8', 2, 16); p(11, 0, '#e8dcc8', 2, 16);
    p(5, 7, '#2ab0a0', 6, 2); p(5, 7, '#5ad8c8', 6, 1);
  },
};

/* ---------------- Frozen Summit: packed snow over clear blue ice ---------------- */
const summit: Tileset = {
  name: 'Frozen Summit',
  sky: ['#1a2a4a', '#4a6a9a', '#c8dcf0'],
  fill(x, y, v) {
    // layered glacier ice: bands, bubbles and a frozen crack
    const band = Math.floor((y + 1.5 * Math.sin(x * 0.4 + v)) / 4) & 1;
    if (hash(x, y, v + 240) < 0.025) return '#ffffff'; // a trapped bubble
    if (v === 2 && Math.abs(x - y - 2) === 0 && y > 3 && y < 13) return '#e8f8ff';
    return band ? '#7ab0e0' : '#6aa0d4';
  },
  surface(x, d, v) {
    // a thick snow cap that sags in drifts
    if (d === 0) return '#ffffff';
    const k = (x + v * 3) % 6, depth = k === 0 || k === 5 ? 3 : k === 1 || k === 4 ? 4 : 5;
    if (d < depth) return d === depth - 1 ? '#c8dcf0' : '#f0f6ff';
    return null;
  },
  edge: { outer: '#2a4a7a', inner: '#4a7ab0', surfOuter: '#a8c0dc', surfInner: '#ffffff', style: 'round', r: 3 },
  top(p, v, w, e) {
    const y = TOP_Y;
    if (w) p(0, y - 1, '#ffffff', 3, 2);
    if (e) p(17, y - 1, '#ffffff', 3, 2);
    if (v === 1) { // a snowy fir
      p(9, y - 2, '#4a3a2a', 1, 2);
      for (let i = 0; i < 4; i++) { p(9 - i, y - 3 - (3 - i) * 2, '#2a5a4a', i * 2 + 1, 2); p(9 - i, y - 3 - (3 - i) * 2, '#ffffff', i + 1, 1); }
    }
    if (v === 2) { p(12, y - 3, '#c8e8ff', 2, 3); p(14, y - 5, '#c8e8ff', 1, 5); p(14, y - 5, '#ffffff'); } // ice shards
    if (v === 3) { p(4, y - 2, '#f0f6ff', 5, 2); p(5, y - 3, '#ffffff', 3, 1); } // a snow mound
  },
  glow: [2],
  bottom(p, v) {
    for (let i = 0; i < 1 + (v >> 1); i++) drip(p, 3 + Math.floor(hash(i, v, 241) * 10), 3 + Math.floor(hash(v, i, 242) * 6), '#c8e8ff', '#ffffff'); // icicles
  },
  rope(p) { // a frost-rimed rope
    for (let y = 0; y < 16; y++) { p(7, y, '#8a7a6a', 2, 1); if (y % 4 === 1) p(6, y, '#ffffff', 4, 1); }
  },
  ladder(p) { // frozen wooden rails
    p(3, 0, '#6a5a4a', 2, 16); p(11, 0, '#6a5a4a', 2, 16); p(3, 0, '#e8f4ff', 1, 16); p(11, 0, '#e8f4ff', 1, 16);
    p(5, 7, '#6a5a4a', 6, 2); p(5, 7, '#ffffff', 6, 1);
  },
};

export const FRONTIER: Record<string, Tileset> = {
  'Ember Wastes': wastes, 'Old Keep': keep, 'Chapel Spire': chapel, 'Sky Reef': reef, 'Frozen Summit': summit,
};
