import { hash, TOP_Y, type Paint, type Tileset } from '../tilekit';

/* ============================================================
   NATURE TILESETS: the early, earthly areas.
   Tide Pools, Swamp, Mountain, Sky, Meadow, Riverbank, Hills.
   (Pieces and sizes: see tileset.ts / tilekit.ts.)
   ============================================================ */

/** A blade or stalk `h` px tall rising from (x, y), lit at the tip. */
const blade = (p: Paint, x: number, y: number, h: number, body: string, tip: string): void => {
  if (h <= 0) return;
  p(x, y - h, body, 1, h); p(x, y - h, tip);
};

/** A small flower: stem, then a plus-shaped head with a centre. */
const flower = (p: Paint, x: number, y: number, h: number, petal: string, mid: string, stem = '#4f9a3a'): void => {
  p(x, y - h, stem, 1, h);
  p(x - 1, y - h - 1, petal, 3, 1); p(x, y - h - 2, petal, 1, 3); p(x, y - h - 1, mid);
};

/* ---------------- Murky Swamp: black peat, slimy moss, cattails, dripping ooze ---------------- */
const swamp: Tileset = {
  name: 'Murky Swamp',
  sky: ['#1a2420', '#2a3a2c', '#121a16'],
  fill(x, y, v) {
    // peat: dark mud in soft blotches, with bubbles and sunken bits
    let col = hash(x >> 2, (y + x) >> 2, v + 50) < 0.35 ? '#2e2a1c' : '#383222';
    if (hash(x, y, v + 51) < 0.05) col = '#4a4230';
    const bx = 3 + v * 3, by = 4 + ((v * 5) % 9);
    if ((x - bx) ** 2 + (y - by) ** 2 <= 2) col = (x - bx) + (y - by) < 0 ? '#5e6a3a' : '#3e4a26'; // a gas bubble
    if (v === 1 && y === 11 && x >= 6 && x <= 12) col = (x & 1) ? '#c8c0a0' : '#a8a080'; // a sunken bone
    if (v === 3 && x + y === 18 && x > 4 && x < 13) col = '#4a3a26'; // a drowned twig
    return col;
  },
  surface(x, d, v) {
    if (d === 0) return '#8aa84a';
    if (d === 1) return '#6a8a36';
    if (d <= 3) return '#4a6428';
    // slime hangs into the peat in drips of 0-4px
    const drip = Math.floor(hash(x, v, 52) * 5);
    if (d <= 3 + drip) return d === 3 + drip ? '#2e3e1a' : '#3e5422';
    return null;
  },
  edge: { outer: '#0e120a', inner: '#24201a', surfOuter: '#26361a', surfInner: '#4a6428', style: 'round', r: 2 },
  top(p, v, w, e) {
    const y = TOP_Y;
    // moss lumps along the top
    for (let x = 2; x < 18; x++) if (hash(x, v, 53) < 0.35) p(x, y - 1, '#6a8a36');
    if (w) { p(0, y, '#6a8a36', 2, 1); p(1, y + 1, '#4a6428', 1, 3); }
    if (e) { p(18, y, '#6a8a36', 2, 1); p(18, y + 1, '#4a6428', 1, 3); }
    if (v === 1) { // cattails
      for (const [x, h] of [[6, 8], [8, 6], [11, 9]]) {
        blade(p, x, y, h, '#5a7a30', '#5a7a30');
        p(x, y - h + 1, '#6a3e1e', 1, 3); p(x, y - h + 1, '#8a5a2e');
      }
      blade(p, 9, y, 4, '#6a8a36', '#8aa84a'); blade(p, 13, y, 3, '#6a8a36', '#8aa84a');
    }
    if (v === 2) { // pale swamp toadstools
      p(6, y - 3, '#c8c4a8', 1, 3); p(5, y - 4, '#9aa870', 3, 1); p(6, y - 5, '#bcc890');
      p(12, y - 2, '#c8c4a8', 1, 2); p(11, y - 3, '#9aa870', 3, 1);
    }
    if (v === 3) { // a dead stump
      p(8, y - 5, '#4a3a2a', 4, 5); p(8, y - 5, '#6a5440', 1, 5); p(9, y - 6, '#5a4834', 2, 1);
      p(12, y - 7, '#4a3a2a', 1, 3); p(13, y - 8, '#4a3a2a', 1, 1); // a dead branch
    }
  },
  bottom(p, v) {
    // strands of ooze, each ending in a drop
    for (let i = 0; i <= v; i++) {
      const x = 2 + Math.floor(hash(i, v, 54) * 12), len = 2 + Math.floor(hash(v, i, 55) * 6);
      p(x, 0, '#4a6428', 1, len); p(x, len, '#6a8a36', 1, 1);
      if (i === 0 && v > 1) p(x, len + 2, '#8aa84a');
    }
  },
  rope(p) { // hanging moss: a dark vine with straggling beard
    p(7, 0, '#3e5422', 2, 16); p(7, 0, '#5a7a30', 1, 16);
    for (const [x, y, h] of [[6, 1, 4], [9, 5, 5], [5, 9, 3], [9, 11, 4], [6, 13, 3]]) p(x, y, '#6a8a36', 1, h);
  },
  ladder(p) { // rotting planks: crooked rails, a split rung
    p(2, 0, '#4a3a2a', 2, 16); p(12, 0, '#4a3a2a', 2, 16);
    p(2, 0, '#5e4a36', 1, 16); p(12, 0, '#5e4a36', 1, 16);
    p(2, 10, '#5a7a30', 2, 3); p(13, 3, '#5a7a30', 1, 2); // moss on the rails
    p(4, 6, '#5e4a36', 4, 2); p(9, 7, '#5e4a36', 3, 2); p(4, 6, '#7a6248', 4, 1); p(9, 7, '#7a6248', 3, 1);
  },
};

/* ---------------- Craggy Mountains: slanted rock strata, snow caps, drifts, icicles ---------------- */
const mountain: Tileset = {
  name: 'Craggy Mountains',
  sky: ['#3a5478', '#6a88ac', '#2e4462'],
  fill(x, y, v) {
    // tilted strata of grey rock
    const band = Math.floor((y + x * 0.4 + v * 3) / 4) % 4;
    let col = ['#6a6e78', '#5e626c', '#72767e', '#585c66'][band];
    if (((y + x * 0.4 + v * 3) % 4) < 0.45) col = '#464a54'; // seam
    if (hash(x, y, v + 60) < 0.04) col = '#8a8e98';
    if (v === 2 && Math.abs(x - 8 - Math.round(Math.sin(y * 0.8))) === 0 && y > 2 && y < 13) col = '#3a3e46'; // a crack
    if (v === 3 && x >= 9 && x <= 12 && y >= 4 && y <= 6) col = y === 4 ? '#c8d8e8' : '#9ab0c8'; // an ice vein
    return col;
  },
  surface(x, d, v) {
    if (d === 0) return '#ffffff';
    if (d <= 2) return '#eef4fa';
    // the snow's lower edge is wavy and blue-shadowed
    const lip = 3 + Math.round(1.2 * Math.sin(x * 0.9 + v));
    if (d < lip) return '#dce8f4';
    if (d === lip) return '#a8bcd4';
    return null;
  },
  edge: { outer: '#22262e', inner: '#464a54', surfOuter: '#8aa0bc', surfInner: '#dce8f4', style: 'chip', r: 1 },
  top(p, v, w, e) {
    const y = TOP_Y;
    // snow drifts pile over exposed ends
    if (w) { p(0, y - 1, '#ffffff', 3, 1); p(0, y, '#eef4fa', 2, 2); p(0, y + 2, '#a8bcd4', 1, 1); }
    if (e) { p(17, y - 1, '#ffffff', 3, 1); p(18, y, '#eef4fa', 2, 2); p(19, y + 2, '#a8bcd4', 1, 1); }
    if (v === 1) { // a little snowy pine
      p(10, y - 2, '#4a3a2a', 1, 2);
      for (let i = 0; i < 4; i++) p(10 - i, y - 3 - (3 - i) * 2, '#2e5a44', i * 2 + 1, 2);
      p(9, y - 9, '#ffffff', 1, 1); p(8, y - 5, '#ffffff', 1, 1); p(11, y - 7, '#ffffff', 1, 1); p(7, y - 3, '#ffffff', 2, 1);
    }
    if (v === 2) { // a rock poking through the snow
      p(5, y - 3, '#6a6e78', 4, 3); p(5, y - 3, '#8a8e98', 3, 1); p(6, y - 4, '#ffffff', 2, 1);
    }
    if (v === 3) { p(12, y - 2, '#ffffff', 4, 2); p(13, y - 3, '#ffffff', 2, 1); p(12, y - 1, '#dce8f4', 4, 1); } // snow lump
  },
  bottom(p, v) {
    // icicles: thin tapering spikes
    for (let i = 0; i < v + 1; i++) {
      const x = 2 + Math.floor(hash(i, v, 61) * 12), len = 3 + Math.floor(hash(v, i, 62) * 7);
      p(x, 0, '#c8dcf0', 2, Math.ceil(len / 2)); p(x, 0, '#ffffff', 1, Math.ceil(len / 2));
      p(x, Math.ceil(len / 2), '#a8c4e0', 1, Math.floor(len / 2));
    }
  },
  rope(p) { // braided red-and-white climbing rope
    for (let y = 0; y < 16; y++) { p(7, y, (y >> 1) % 2 ? '#d04a3a' : '#f4f0e8'); p(8, y, (y >> 1) % 2 ? '#f4f0e8' : '#a83a2e'); }
    p(6, 4, '#8a8e98', 4, 2); p(6, 4, '#c8ccd4', 4, 1); // a carabiner clip
  },
  ladder(p) { // steel rungs with snow on them
    p(3, 0, '#5e626c', 2, 16); p(11, 0, '#5e626c', 2, 16);
    p(3, 0, '#8a8e98', 1, 16); p(11, 0, '#8a8e98', 1, 16);
    p(5, 8, '#72767e', 6, 2); p(5, 7, '#ffffff', 6, 1); p(4, 7, '#eef4fa'); p(11, 7, '#eef4fa');
  },
};

/* ---------------- Endless Sky: cloud blocks, billowing undersides, golden ropes ---------------- */
// puffs inside the cloud: big soft circles, shaded only along their lower-right rim
const PUFFS = [0, 1, 2, 3].map((v) => Array.from({ length: 2 }, (_, i) =>
  [hash(i, v, 70) * 16, hash(v, i, 71) * 16, 4 + hash(i, i + v, 72) * 3] as const));
const sky: Tileset = {
  name: 'Endless Sky',
  sky: ['#2e64b0', '#4a86cc', '#7aaee0'],
  fill(x, y, v) {
    for (const [cx, cy, r] of PUFFS[v]) {
      let dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx > 8) dx -= 16; if (dx < -8) dx += 16; if (dy > 8) dy -= 16; if (dy < -8) dy += 16;
      const d = Math.hypot(dx, dy);
      if (d > r - 1.3 && d <= r && dx + dy > 1) return '#dfe8f6';
    }
    return '#f4f8fd';
  },
  surface(_x, d) {
    if (d === 0) return '#ffffff';
    if (d === 1) return '#fbfdff';
    return null;
  },
  edge: { outer: '#9ab0d8', inner: '#d4e0f4', surfOuter: '#c4d4ec', surfInner: '#ffffff', style: 'round', r: 4 },
  top(p, v) {
    const y = TOP_Y;
    if (v === 1) { p(5, y - 2, '#ffffff', 5, 2); p(6, y - 3, '#ffffff', 3, 1); p(5, y - 1, '#e4ecf8', 5, 1); } // a small puff
    if (v === 2) { // a golden sparkle
      p(12, y - 6, '#ffe070', 1, 5); p(10, y - 4, '#ffe070', 5, 1); p(12, y - 4, '#ffffff');
    }
    if (v === 3) { p(7, y - 1, '#c4d4ec', 6, 1); p(9, y - 2, '#e4ecf8', 3, 1); } // a wisp
  },
  bottom(p, v) {
    // billows: round lumps of cloud hanging off the underside
    for (let i = 0; i < 2 + (v & 1); i++) {
      const cx = 4 + Math.floor(hash(i, v, 74) * 8), r = 2 + Math.floor(hash(v, i, 75) * 2);
      for (let y = 0; y <= r; y++) {
        const half = Math.round(Math.sqrt(r * r - y * y));
        p(cx - half, y, '#9ab0d8', half * 2 + 1, 1);
        if (half > 0 && y < r) p(cx - half + 1, y, y < r - 1 ? '#e4ecf8' : '#d4e0f4', half * 2 - 1, 1);
      }
    }
  },
  rope(p) { // golden silk rope with a tassel knot
    for (let y = 0; y < 16; y++) { p(7, y, y % 3 === 0 ? '#c8962a' : '#ffd060'); p(8, y, y % 3 === 1 ? '#c8962a' : '#e8b440'); }
    p(6, 9, '#fff0b0', 4, 2); p(6, 11, '#c8962a', 4, 1);
  },
  ladder(p) { // white marble rails with gold rungs
    p(3, 0, '#d4e0f4', 2, 16); p(11, 0, '#d4e0f4', 2, 16);
    p(3, 0, '#ffffff', 1, 16); p(11, 0, '#ffffff', 1, 16);
    p(5, 7, '#e8b440', 6, 2); p(5, 7, '#fff0b0', 6, 1);
  },
};

/* ---------------- Sunny Meadows: bright clover turf, rich loam, flowers, straw rope ---------------- */
const meadow: Tileset = {
  name: 'Sunny Meadows',
  sky: ['#5aa0d8', '#9ccaec', '#d8ecf8'],
  fill(x, y, v) {
    // soft brown loam in loose horizontal bands, with pebbles and roots
    let col = ((y + (hash(x >> 2, v, 80) * 3 | 0)) >> 2) % 2 ? '#8a5e36' : '#7e5430';
    if (hash(x, y, v + 81) < 0.04) col = '#a87a4c';
    if (v === 1 && y === 5 + (x >> 2) && x < 12) col = '#b08a5a'; // a pale root
    if (v === 2 && (x - 10) ** 2 + (y - 10) ** 2 <= 2) col = '#a8a090'; // a pebble
    if (v === 3 && x === 4 && y >= 3 && y <= 9) col = '#6a4426'; // a tap root
    return col;
  },
  surface(x, d, v) {
    if (d === 0) return '#c4f07a';
    if (d <= 2) return '#9ade5a';
    if (d <= 3) return '#7ac446';
    // clover scallops: half-round bumps hanging 0-2px into the soil
    const k = (x + v * 3) % 4;
    if (d === 4 && k !== 0) return '#5aa034';
    if (d === 5 && (k === 1 || k === 2)) return '#5aa034';
    return null;
  },
  edge: { outer: '#3a2414', inner: '#6a4426', surfOuter: '#3e7a26', surfInner: '#7ac446', style: 'round', r: 3 },
  top(p, v, w, e) {
    const y = TOP_Y;
    for (let x = 2; x < 18; x++) {
      const r = hash(x, v, 82);
      if (r < 0.45) blade(p, x, y, r < 0.3 ? 1 : 2, '#7ac446', '#c4f07a');
    }
    if (w) { p(0, y, '#9ade5a', 2, 2); p(0, y, '#c4f07a', 2, 1); }
    if (e) { p(18, y, '#9ade5a', 2, 2); p(18, y, '#c4f07a', 2, 1); }
    if (v === 0) flower(p, 6, y, 3, '#ff8ac0', '#ffe070');
    if (v === 1) { flower(p, 5, y, 4, '#ffffff', '#ffd040'); flower(p, 13, y, 2, '#ffe070', '#e8902a'); }
    if (v === 2) { flower(p, 9, y, 5, '#8ab4ff', '#ffffff'); flower(p, 14, y, 3, '#ff8ac0', '#ffe070'); }
    if (v === 3) { // a fence post
      p(10, y - 8, '#c8a070', 2, 8); p(10, y - 8, '#e8c898', 1, 8); p(10, y - 9, '#a87a4c', 2, 1);
      p(7, y - 6, '#c8a070', 8, 1);
    }
  },
  bottom(p, v) {
    if (v === 0) return;
    for (let i = 0; i < 2; i++) { // fine pale roots
      const x = 3 + Math.floor(hash(i, v, 83) * 10), len = 2 + Math.floor(hash(v, i, 84) * 4);
      p(x, 0, '#b08a5a', 1, len); p(x + (i ? 1 : -1), len, '#b08a5a');
    }
  },
  rope(p) { // twisted straw rope
    for (let y = 0; y < 16; y++) { p(7, y, (y & 1) ? '#d8b85a' : '#f0d888'); p(8, y, (y & 1) ? '#f0d888' : '#b8963a'); }
    p(6, 6, '#f0d888', 1, 2); p(9, 12, '#d8b85a', 1, 2); // loose straws
  },
  ladder(p) { // painted white wood
    p(3, 0, '#e8e4dc', 2, 16); p(11, 0, '#e8e4dc', 2, 16);
    p(4, 0, '#bcb6aa', 1, 16); p(12, 0, '#bcb6aa', 1, 16);
    p(5, 7, '#e8e4dc', 6, 2); p(5, 8, '#bcb6aa', 6, 1);
  },
};

/* ---------------- Misty Riverbank: wet clay, river pebbles, reeds, bamboo ladders ---------------- */
const riverbank: Tileset = {
  name: 'Misty Riverbank',
  sky: ['#3a7aa0', '#6aa4c0', '#a8d0d8'],
  fill(x, y, v) {
    // grey-brown clay with fine sediment lines and a few smooth river pebbles
    for (let i = 0; i < 1 + (v & 1); i++) {
      const cx = 3 + hash(i, v, 91) * 10, cy = 4 + hash(v, i, 92) * 9;
      const rx = 1.8 + hash(i, v, 93) * 1.4, ry = 1.3 + hash(v, i, 94) * 0.6;
      const k = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (k < 0.45 && x + 0.5 < cx && y + 0.5 < cy) return '#c4c0b2';
      if (k < 1) return ['#9a968a', '#8a8070', '#a8a89a', '#7a8088'][(i + v) % 4];
      if (k < 1.5 && y + 0.5 > cy) return '#4e3e2e';
    }
    let col = (y + Math.round(Math.sin(x * 0.5 + v))) % 5 === 0 ? '#5e4a36' : '#6e5842';
    if (hash(x, y, v + 90) < 0.05) col = '#857060';
    if (v === 2 && y === 4 && x >= 3 && x <= 6) col = '#e8e0d0'; // a shell fragment
    return col;
  },
  surface(x, d, v) {
    if (d === 0) return '#9ad864';
    if (d === 1) return '#6aa844';
    if (d === 2) return '#4a7e32';
    // a dark wet mud line under the turf
    if (d <= 4 - ((x + v) % 3 === 0 ? 1 : 0)) return '#4a3a28';
    return null;
  },
  edge: { outer: '#2a2018', inner: '#4a3a28', surfOuter: '#2e5a22', surfInner: '#4a7e32', style: 'round', r: 2 },
  top(p, v, w, e) {
    const y = TOP_Y;
    if (w) { p(0, y, '#6aa844', 2, 1); p(0, y + 1, '#4a3a28', 2, 1); }
    if (e) { p(18, y, '#6aa844', 2, 1); p(18, y + 1, '#4a3a28', 2, 1); }
    if (v === 1 || v === 3) { // reeds, leaning
      for (const [x, h] of [[4, 7], [5, 9], [7, 6], [8, 10]]) {
        const sx = x + (v === 3 ? 6 : 0);
        p(sx, y - h + 2, '#6a9a3a', 1, h - 2); p(sx + 1, y - h, '#8aba4a', 1, 2);
      }
    }
    if (v === 2) { // a wet stone
      p(9, y - 2, '#8a8070', 5, 2); p(10, y - 3, '#a8a89a', 3, 1); p(10, y - 2, '#c8c8c0', 1, 1);
    }
  },
  bottom(p, v) {
    // water seeping out: drips and a damp dark streak
    p(4 + v * 2, 0, '#3a2e22', 2, 2);
    if (v) { const x = 5 + v * 2; p(x, 2, '#6aa4c0', 1, 2); p(x, 5 + v, '#a8d0e8'); }
  },
  rope(p) { // wet hemp, darkened, with a knot
    p(7, 0, '#8a7454', 2, 16); p(7, 0, '#a8906a', 1, 16);
    for (let y = 1; y < 16; y += 3) p(7, y, '#6a5a40', 2, 1);
    p(6, 8, '#8a7454', 4, 3); p(6, 8, '#a8906a', 4, 1);
  },
  ladder(p) { // bamboo: green segmented rails, lashed rung
    p(3, 0, '#8ab44a', 2, 16); p(11, 0, '#8ab44a', 2, 16);
    p(3, 0, '#b4d870', 1, 16); p(11, 0, '#b4d870', 1, 16);
    p(3, 3, '#5a7e2a', 2, 1); p(11, 12, '#5a7e2a', 2, 1);
    p(5, 8, '#a8c860', 6, 2); p(5, 8, '#c8e488', 6, 1); p(4, 7, '#c8a870', 1, 3); p(11, 7, '#c8a870', 1, 3);
  },
};

/* ---------------- Rolling Hills: windswept grass, chalky soil with boulders, pegged rope ---------------- */
const hills: Tileset = {
  name: 'Rolling Hills',
  sky: ['#4a8ac4', '#8cc0e4', '#e8f0e0'],
  fill(x, y, v) {
    // pale chalky soil, with a big embedded boulder in some tiles
    if (v === 3) {
      const cx = 8, cy = 8, rx = 5, ry = 3.5;
      const k = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (k < 0.7) return x + 0.5 < cx && y + 0.5 < cy ? '#a8a49a' : hash(x, y, 101) < 0.2 ? '#7a766c' : '#8e8a80';
      if (k < 1) return '#5e5a50';
    }
    let col = hash(x >> 1, y >> 1, v + 100) < 0.3 ? '#a08a64' : '#ae9870';
    if (hash(x, y, v + 102) < 0.05) col = '#c8b890';
    if (v === 1 && (x === 5 || x === 11) && y > 6 && y < 11) col = '#7a6646';
    if (v === 2 && (x - 11) ** 2 + (y - 5) ** 2 <= 2) col = x <= 11 && y <= 5 ? '#a8a49a' : '#8e8a80'; // a small stone
    return col;
  },
  surface(x, d, v) {
    if (d === 0) return '#d4e888';
    if (d <= 2) return '#a8d060';
    if (d <= 4) return '#86b448';
    // the turf thins into the soil in a sawtooth
    if (d === 5 && (x + v) % 3 !== 2) return '#6a9a3a';
    return null;
  },
  edge: { outer: '#3a3020', inner: '#7a6646', surfOuter: '#4a7a2a', surfInner: '#86b448', style: 'round', r: 3 },
  top(p, v, w, e) {
    const y = TOP_Y;
    // long grass leaning with the wind (to the right)
    for (let x = 2; x < 18; x += 2) {
      const h = 1 + Math.floor(hash(x, v, 103) * 4);
      for (let i = 0; i < h; i++) p(x + (i >= 2 ? 1 : 0), y - 1 - i, i === h - 1 ? '#d4e888' : '#86b448');
    }
    if (w) { p(0, y, '#a8d060', 2, 2); p(0, y, '#d4e888', 2, 1); }
    if (e) { p(18, y, '#a8d060', 2, 2); p(18, y, '#d4e888', 2, 1); }
    if (v === 2) { // a rocky outcrop
      p(4, y - 5, '#8e8a80', 6, 5); p(5, y - 6, '#8e8a80', 3, 1); p(4, y - 5, '#a8a49a', 3, 2);
      p(9, y - 3, '#5e5a50', 1, 3);
    }
    if (v === 3) { flower(p, 12, y, 3, '#ffffff', '#ffe070', '#86b448'); flower(p, 15, y, 2, '#ffffff', '#ffe070', '#86b448'); }
  },
  bottom(p, v) {
    if (v === 0) return;
    // a few grass roots, one carrying a pebble
    for (let i = 0; i < v; i++) { const x = 3 + Math.floor(hash(i, v, 104) * 10); p(x, 0, '#7a6646', 1, 2 + i); }
    if (v === 3) p(8, 3, '#8e8a80', 2, 2);
  },
  rope(p) { // plain rope with wooden pegs
    p(7, 0, '#b89a6a', 2, 16); p(7, 0, '#d4b888', 1, 16);
    for (let y = 2; y < 16; y += 4) p(8, y, '#8a6e44', 1, 1);
    p(5, 10, '#6a5030', 6, 2); p(5, 10, '#8a6e44', 6, 1);
  },
  ladder(p) { // weathered grey wood
    p(3, 0, '#8a8478', 2, 16); p(11, 0, '#8a8478', 2, 16);
    p(3, 0, '#aaa498', 1, 16); p(11, 0, '#aaa498', 1, 16);
    p(4, 4, '#6a6458', 1, 3); p(12, 11, '#6a6458', 1, 2); // grain
    p(5, 8, '#8a8478', 6, 2); p(5, 8, '#aaa498', 6, 1);
  },
};

/* ---------------- Tide Pools: wet slate, algae, anemones, starfish, kelp ---------------- */
const tidePools: Tileset = {
  name: 'Tide Pools',
  sky: ['#3a7aa8', '#6aa6c8', '#2e6a92'],
  fill(x, y, v) {
    // layered slate: blue-grey bands broken into blocks, with barnacle specks
    const band = (y + (x >> 3) * 2 + v) % 6;
    let col = band < 3 ? '#4e5e6e' : '#56687a';
    if (band === 0 && hash(x, y, v + 60) < 0.7) col = '#3e4c5a';
    if (hash(x, y, v + 61) < 0.04) col = '#d8dcd0'; // a barnacle
    // a little pool of trapped water in the rock
    if (v === 1 && y >= 8 && y <= 10 && x >= 5 && x <= 10 && !(y === 8 && (x === 5 || x === 10)))
      col = y === 8 ? '#9ad4e8' : '#4a9ac0';
    if (v === 2 && x >= 10 && x <= 11 && y >= 4 && y <= 5) col = '#e8eee4'; // a white shell
    return col;
  },
  surface(x, d, v) {
    if (d === 0) return '#8ad07a';
    if (d === 1) return '#5aa85e';
    // dark wet rock, with algae straggling down
    if (d === 2) return (x + v) % 4 === 0 ? '#5aa85e' : '#3a4856';
    if (d === 3) return '#3a4856';
    return null;
  },
  edge: { outer: '#1e2a36', inner: '#3a4856', surfOuter: '#2e6a3a', surfInner: '#4a8e4e', style: 'round', r: 3 },
  top(p, v) {
    const y = TOP_Y;
    if (v === 1) { // a pink anemone: a stubby body and waving tendrils
      p(8, y - 2, '#c85a7a', 4, 2);
      for (const [x, h] of [[7, 3], [8, 4], [9, 5], [10, 4], [11, 4], [12, 3]]) { p(x, y - 2 - h, '#f08aa8', 1, h); p(x, y - 2 - h, '#ffc8d8'); }
    } else if (v === 2) { // an orange starfish
      p(12, y - 2, '#f08a3a', 5, 1); p(14, y - 4, '#f08a3a', 1, 3); p(13, y - 1, '#f08a3a'); p(15, y - 1, '#f08a3a'); p(14, y - 2, '#ffc070');
    } else if (v === 3) { // a mussel cluster
      for (const [x, yy] of [[4, 2], [6, 3], [7, 2], [9, 2]]) { p(x, y - yy, '#2a2e4a', 2, yy); p(x, y - yy, '#5a6088'); }
    }
  },
  bottom(p, v) {
    // strands of kelp, each ending in a drop of seawater
    for (let i = 0; i <= v; i++) {
      const x = 2 + Math.floor(hash(i, v, 62) * 12), len = 3 + Math.floor(hash(v, i, 63) * 6);
      p(x, 0, '#2e7a4a', 1, len); p(x + 1, 1, '#2e7a4a', 1, len - 2); p(x, len, '#6ab87a');
      if (i === 0 && v > 1) p(x, len + 2, '#9ad4e8');
    }
  },
  rope(p) { // a knotted net cord, blue and weathered
    p(6, 0, '#4a7a98', 4, 16); p(6, 0, '#7ab0cc', 1, 16); p(9, 0, '#2e5a76', 1, 16);
    for (const y of [2, 10]) { p(5, y, '#4a7a98', 6, 2); p(5, y, '#7ab0cc', 6, 1); }
  },
  ladder(p) { // bleached driftwood rails with rope lashings
    p(3, 0, '#b8b0a0', 2, 16); p(11, 0, '#b8b0a0', 2, 16);
    p(3, 0, '#d8d0c0', 1, 16); p(11, 0, '#d8d0c0', 1, 16);
    p(5, 7, '#a89e8a', 6, 2); p(5, 7, '#c8c0ae', 6, 1);
    p(3, 6, '#4a7a98', 2, 1); p(11, 9, '#4a7a98', 2, 1);
  },
};

/* ---------------- Harbor: weathered dock planks, rope coils, bollards, barnacled pilings ---------------- */
const harbor: Tileset = {
  name: 'Harbor',
  sky: ['#5a9ac8', '#8cc0dc', '#4a88b8'],
  fill(x, y, v) {
    // horizontal boards, 4px tall, with a dark seam under each and staggered butt joints
    const row = y >> 2, ry = y & 3;
    if (ry === 3) return '#4a3222';
    const joint = (row * 5 + v * 3) % 16;
    if (x === joint) return '#4a3222';
    let col = row % 2 ? '#8a6040' : '#7e5638';
    if (ry === 0) col = row % 2 ? '#9a6e4a' : '#8e6442';              // the board's lit upper edge
    if (hash(x >> 1, row, v + 70) < 0.12) col = '#6e4a30';           // grain streaks
    if ((x === joint + 2 || x === joint - 2) && ry === 1) col = '#3a3a40'; // nail heads beside each joint
    return col;
  },
  surface(x, d, v) {
    // the deck: two pale sun-bleached boards on top
    if (d === 0) return '#d8b88a';
    if (d <= 2) return (x + v * 7) % 9 === 0 ? '#9a7652' : '#bf9a6a';
    if (d === 3) return '#5a3e28';
    return null;
  },
  edge: { outer: '#2e1e14', inner: '#4a3222', surfOuter: '#6a4a30', surfInner: '#a8845a', style: 'chip', r: 1 },
  top(p, v) {
    const y = TOP_Y;
    if (v === 1) { // a coil of rope
      p(5, y - 3, '#c8a06a', 8, 3); p(6, y - 4, '#c8a06a', 6, 1); p(6, y - 3, '#8a6a3c', 6, 1); p(8, y - 2, '#e0c088', 2, 1);
    } else if (v === 2) { // an iron bollard
      p(12, y - 4, '#3a3e48', 4, 4); p(11, y - 5, '#4a505c', 6, 2); p(12, y - 5, '#6a7280', 2, 1);
    } else if (v === 3) { // a gull feather and a dropped fish
      p(4, y - 1, '#f4f7fc', 4, 1); p(3, y - 1, '#c8ccd4');
      p(10, y - 2, '#8ab0c8', 5, 2); p(15, y - 3, '#8ab0c8', 1, 1); p(15, y - 1, '#8ab0c8', 1, 1); p(10, y - 2, '#1e2a36');
    }
  },
  bottom(p, v) {
    // the tops of the pilings under the boards, crusted with barnacles and weed
    for (const x of [2, 11]) {
      p(x, 0, '#5a3e28', 3, 5 + v); p(x, 0, '#7a5638', 1, 5 + v);
      p(x, 3 + v, '#d8dcd0'); p(x + 2, 4, '#d8dcd0');
      if (v) p(x + 1, 5 + v, '#2e7a4a', 1, 2);
    }
  },
  rope(p) { // a thick, tarred mooring line
    p(6, 0, '#a8844e', 4, 16); p(6, 0, '#d0ac74', 1, 16); p(9, 0, '#6a4e2a', 1, 16);
    for (let y = 1; y < 16; y += 4) { p(6, y, '#6a4e2a', 2, 1); p(8, y + 1, '#6a4e2a', 2, 1); }
  },
  ladder(p) { // a dock ladder: plank rails, rungs on iron brackets
    p(2, 0, '#6e4a30', 3, 16); p(11, 0, '#6e4a30', 3, 16);
    p(2, 0, '#9a6e4a', 1, 16); p(11, 0, '#9a6e4a', 1, 16);
    p(5, 6, '#8e6442', 6, 3); p(5, 6, '#b08a5e', 6, 1); p(4, 7, '#3a3e48', 1, 1); p(11, 7, '#3a3e48', 1, 1);
  },
};

export const NATURE: Record<string, Tileset> = {
  'Murky Swamp': swamp, 'Craggy Mountains': mountain, 'Endless Sky': sky, 'Sunny Meadows': meadow, 'Misty Riverbank': riverbank, 'Rolling Hills': hills,
  'Tide Pools': tidePools, Harbor: harbor,
};
