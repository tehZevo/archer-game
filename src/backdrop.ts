import { hash } from './tilekit';

/* ============================================================
   BACKDROPS
   Behind each area's floor: the sky gradient (tileset.sky), then two
   painted layers that scroll slower than the floor (parallax), then a
   few drifting particles. Floors are tall and narrow, so layers tile in
   both directions: they hold scattered motifs (trunks, clouds,
   pillars...) rather than a single horizon.

   Layers are painted once into a LAYER x LAYER tile (backdropdraw.ts
   bakes and draws them); everything painted wraps around the tile's
   edges so the tiling is seamless. Colours carry alpha so the layers
   sit back into the sky.
   ============================================================ */

export const LAYER = 256;
/** How fast each layer scrolls relative to the floor: far, mid. */
export const PARALLAX = [0.15, 0.35] as const;

export type BgPaint = (x: number, y: number, col: string, w?: number, h?: number) => void;

export type ParticleKind = 'snow' | 'leaves' | 'petals' | 'spores' | 'bubbles' | 'fireflies' | 'glints' | 'meteors';
export interface Particles { kind: ParticleKind; cols: string[]; n: number }

export interface Backdrop {
  far: (p: BgPaint) => void;
  mid: (p: BgPaint) => void;
  particles?: Particles;
}

/** A painter that wraps everything around the layer tile's edges. */
export function wrapPaint(put: (x: number, y: number, col: string, w: number, h: number) => void): BgPaint {
  return (x, y, col, w = 1, h = 1) => {
    x = Math.round(x); y = Math.round(y);
    const x0 = ((x % LAYER) + LAYER) % LAYER, y0 = ((y % LAYER) + LAYER) % LAYER;
    for (const dx of [0, -LAYER]) for (const dy of [0, -LAYER]) {
      const xx = x0 + dx, yy = y0 + dy;
      if (xx + w > 0 && xx < LAYER && yy + h > 0 && yy < LAYER) put(xx, yy, col, w, h);
    }
  };
}

/** A layer with nothing on it. */
const NONE = (): void => {};

/* ---------------- motifs ---------------- */

function blob(p: BgPaint, cx: number, cy: number, r: number, col: string): void {
  for (let y = -r; y <= r; y++) { const half = Math.round(Math.sqrt(r * r - y * y)); p(cx - half, cy + y, col, half * 2 + 1, 1); }
}
function cloud(p: BgPaint, cx: number, cy: number, s: number, col: string): void {
  blob(p, cx, cy, s, col); blob(p, cx - s * 1.2, cy + s * 0.4, s * 0.7, col); blob(p, cx + s * 1.3, cy + s * 0.3, s * 0.8, col);
  p(cx - s * 1.8, cy + s * 0.5, col, s * 3.8, s * 0.6);
}
/** A tree trunk the full height of the tile, with a few branch stubs. */
function trunk(p: BgPaint, x: number, w: number, col: string, seed: number): void {
  p(x, 0, col, w, LAYER);
  for (let i = 0; i < 4; i++) {
    const y = hash(i, seed, 1) * LAYER, side = hash(seed, i, 2) < 0.5 ? -1 : 1, len = 4 + hash(i, i, seed) * 10;
    for (let j = 0; j < len; j++) p(side < 0 ? x - j : x + w + j - 1, y - j * 0.6, col, 1, 2);
  }
}
function scatter(n: number, seed: number, f: (x: number, y: number, r: number, i: number) => void): void {
  for (let i = 0; i < n; i++) f(hash(i, seed, 3) * LAYER, hash(seed, i, 4) * LAYER, hash(i, seed, 5), i);
}
function pillar(p: BgPaint, x: number, w: number, col: string, band: string, seed: number, broken: boolean): void {
  const top = broken ? hash(seed, 1, 6) * LAYER * 0.5 : 0, len = broken ? LAYER * 0.45 : LAYER;
  p(x, top, col, w, len);
  for (let y = top; y < top + len; y += 24) p(x - 1, y, band, w + 2, 3);
  if (broken) for (let i = 0; i < w; i += 2) p(x + i, top - 1 - (i * 3) % 4, col, 2, 2);
}
function gearShape(p: BgPaint, cx: number, cy: number, r: number, col: string, hole: string): void {
  for (let y = -r - 2; y <= r + 2; y++) for (let x = -r - 2; x <= r + 2; x++) {
    const d = Math.hypot(x, y), a = Math.atan2(y, x);
    if (d < r * 0.3) p(cx + x, cy + y, hole);
    else if (d <= r || (Math.cos(a * 10) > 0.5 && d <= r + 2)) p(cx + x, cy + y, col);
  }
}
function island(p: BgPaint, cx: number, cy: number, w: number, top: string, rock: string): void {
  p(cx - w / 2, cy, top, w, 3);
  for (let y = 3; y < w / 2; y++) { const half = (w / 2) * (1 - y / (w / 2)); p(cx - half, cy + y, rock, half * 2, 1); }
}
function mushroom(p: BgPaint, cx: number, cy: number, r: number, stem: string, cap: string): void {
  p(cx - r / 5, cy, stem, Math.max(2, (r * 2) / 5), r * 3);
  for (let y = 0; y < r; y++) { const half = Math.round(r * Math.sqrt(1 - (y / r) ** 2)); p(cx - half, cy - y, cap, half * 2, 1); }
}
function crystalCol(p: BgPaint, cx: number, base: number, h: number, w: number, col: string, dark: string): void {
  for (let y = 0; y < h; y++) {
    const half = y < w ? (w * y) / w : w;
    p(cx - half, base - h + y, col, half, 1); p(cx, base - h + y, dark, half, 1);
  }
}
const stars = (p: BgPaint, n: number, seed: number, cols: string[]): void =>
  scatter(n, seed, (x, y, r) => p(x, y, cols[Math.floor(r * cols.length)]));

/** A mountain peak (or a volcano's cone): a triangle up from `base`, with a cap
 *  of `cap` over its top `capH` rows. */
function peak(p: BgPaint, cx: number, base: number, h: number, col: string, cap: string, capH = 0): void {
  for (let y = 0; y < h; y++) { const half = Math.round((y / h) * h * 0.9); p(cx - half, base - h + y, y < capH ? cap : col, half * 2 + 1, 1); }
}
/** A castle tower the full height of the tile: crenels every so often and a few lit windows. */
function tower(p: BgPaint, x: number, w: number, col: string, lit: string, seed: number): void {
  p(x, 0, col, w, LAYER);
  for (let y = 0; y < LAYER; y += 64) for (let i = 0; i < w + 2; i += 3) p(x - 1 + i, y, col, 2, 3);
  for (let i = 0; i < 4; i++) { const y = hash(i, seed, 7) * LAYER; p(x + Math.floor(w / 2) - 1, y, lit, 2, 4); p(x + Math.floor(w / 2) - 1, y - 1, lit, 2, 1); }
}
/** A spire: a tower with a tall pointed roof, the point at `top`. */
function spire(p: BgPaint, x: number, top: number, w: number, col: string, roof: string): void {
  peak(p, x + w / 2, top + w * 2, w * 2, roof, roof);
  p(x, top + w * 2, col, w, LAYER - w * 2);
}
/** A round stained-glass window: segments of colour round a lead hub. */
function roseWindow(p: BgPaint, cx: number, cy: number, r: number, cols: string[], lead: string): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, y);
    if (d > r) continue;
    const seg = Math.floor(((Math.atan2(y, x) + Math.PI) / (Math.PI * 2)) * 8);
    p(cx + x, cy + y, d > r - 1 || d < 1.5 ? lead : cols[seg % cols.length]);
  }
}
/** A falling ribbon (a waterfall, a lava fall) the full height of the tile. */
function fall(p: BgPaint, x: number, w: number, col: string, streak: string): void {
  p(x, 0, col, w, LAYER);
  for (let y = 0; y < LAYER; y += 7) p(x + (y * 3) % Math.max(1, w - 2), y, streak, 1, 4);
}

/* ---------------- per area ---------------- */
const CLOUDS = (col: string, n: number, s: number, seed: number) => (p: BgPaint): void =>
  scatter(n, seed, (x, y, r) => cloud(p, x, y, Math.round(s * (0.7 + r * 0.6)), col));

/** A calm sea's far layer: long swell lines and far sails. */
const harborFar = (p: BgPaint): void => {
  CLOUDS('#ffffff26', 5, 6, 50)(p);
  for (let i = 0; i < 6; i++) scatter(5, 51 + i, (x, y, r) => p(x, y, '#ffffff22', 10 + r * 24, 1)); // swell glints
  scatter(3, 52, (x, y) => { p(x, y - 8, '#f4f7fc40', 1, 8); for (let k = 0; k < 6; k++) p(x + 1, y - 8 + k, '#f4f7fc40', Math.ceil(k / 1.5), 1); p(x - 3, y, '#2e5a7a40', 9, 2); }); // far sails
};
/** A calm sea's mid layer: moored boats (hull, mast, furled sail). */
const harborMid = (p: BgPaint): void => scatter(4, 53, (x, y, r) => {
  const w = 16 + Math.round(r * 10);
  p(x, y, '#3a5a7a50', w, 3); p(x + 2, y + 3, '#3a5a7a50', w - 4, 2);
  p(x + w / 2, y - 20, '#3a5a7a50', 1, 20); p(x + w / 2 - 4, y - 16, '#3a5a7a50', 8, 2);
});
/** A riverbank's mid layer: a couple of waterfalls. */
const riverbankMid = (p: BgPaint): void => scatter(2, 23, (x) => {
  p(x, 0, '#7ac0e070', 12, LAYER);
  for (let y = 0; y < LAYER; y += 7) p(x + (y * 3) % 10, y, '#ffffff70', 1, 4);
});
/** The observatory's mid layer: a moon, a ringed planet, and a scatter of stars. */
const starfallMid = (p: BgPaint): void => {
  blob(p, 60, 70, 18, '#3a3a7a90'); blob(p, 54, 64, 10, '#4a4a8a90'); // a moon
  p(170, 190, '#d8b05080', 40, 1); blob(p, 190, 190, 9, '#8a5a3a90'); // a ringed planet
  stars(p, 30, 37, ['#ffffffc0']);
};

export const BACKDROPS: Record<string, Backdrop> = {
  Harbor: { // a calm sea: long swell lines, far sails, and moored boats' masts
    far: harborFar,
    mid: harborMid,
    particles: { kind: 'glints', cols: ['#ffffff', '#bfefff'], n: 5 },
  },
  'Tide Pools': {
    far: CLOUDS('#ffffff20', 5, 6, 40),
    mid: NONE,
    particles: { kind: 'bubbles', cols: ['#bfefff', '#ffffff'], n: 6 },
  },
  'Sunlit Shore': {
    far: CLOUDS('#ffffff22', 6, 6, 3),
    mid: NONE,
  },
  'Whispering Woods': {
    far: (p) => scatter(7, 6, (x, _y, r, i) => trunk(p, x, 3 + Math.round(r * 3), '#0e2a1c80', i + 10)),
    mid: (p) => scatter(4, 7, (x, y, r, i) => { trunk(p, x, 6 + Math.round(r * 4), '#0a2216a0', i + 20); blob(p, x + 4, y, 14, '#123a24a0'); }),
    particles: { kind: 'leaves', cols: ['#7ab84a', '#c8a040', '#5a9a3a'], n: 10 },
  },
  'Echoing Caves': {
    far: (p) => scatter(6, 8, (x, _y, r) => pillar(p, x, 6 + Math.round(r * 8), '#1e1c2a90', '#26243490', 9, false)),
    mid: (p) => scatter(8, 9, (x, y, r) => { for (let i = 0; i < 18 + r * 20; i++) p(x - Math.max(0, 6 - i / 4), y + i, '#0a0910b0', Math.max(1, 12 - i / 2), 1); }),
    particles: { kind: 'fireflies', cols: ['#3fbfb4', '#9ff3ea'], n: 6 },
  },
  'Murky Swamp': {
    far: (p) => scatter(6, 10, (x, _y, r, i) => trunk(p, x, 2 + Math.round(r * 3), '#0e1a1480', i + 30)),
    mid: (p) => { for (let i = 0; i < 3; i++) p(0, 40 + i * 85, '#8aa88a18', LAYER, 14 + i * 4); },
    particles: { kind: 'fireflies', cols: ['#d8f070', '#a8d040'], n: 10 },
  },
  'Craggy Mountains': {
    far: NONE,
    mid: NONE,
    particles: { kind: 'snow', cols: ['#ffffff', '#e4eef8'], n: 22 },
  },
  'Endless Sky': {
    far: CLOUDS('#ffffff30', 7, 6, 13),
    mid: (p) => { scatter(3, 14, (x, y, r) => island(p, x, y, 26 + Math.round(r * 20), '#6ab84a90', '#5a6a8a90')); CLOUDS('#ffffff40', 3, 10, 15)(p); },
    particles: { kind: 'glints', cols: ['#ffe070', '#ffffff'], n: 6 },
  },
  'Clockwork Spire': {
    far: (p) => scatter(5, 16, (x, y, r) => gearShape(p, x, y, 14 + Math.round(r * 14), '#5a3e2060', '#20170e')),
    mid: (p) => { scatter(3, 17, (x) => { p(x, 0, '#7a828a50', 5, LAYER); p(x + 1, 0, '#a8b0c050', 1, LAYER); }); scatter(3, 18, (x, y, r) => gearShape(p, x, y, 8 + Math.round(r * 6), '#8a6a3080', '#2e2216')); },
  },
  'Sunny Meadows': {
    far: CLOUDS('#ffffff38', 5, 7, 19),
    mid: NONE,
    particles: { kind: 'petals', cols: ['#ff8ac0', '#ffffff', '#ffe070'], n: 8 },
  },
  'Misty Riverbank': {
    far: NONE,
    mid: riverbankMid,
    particles: { kind: 'fireflies', cols: ['#6ad8f0'], n: 4 },
  },
  'Rolling Hills': {
    far: NONE,
    mid: NONE,
  },
  'Mushroom Grotto': {
    far: (p) => scatter(5, 27, (x, y, r) => mushroom(p, x, y, 10 + Math.round(r * 10), '#3a2a4a70', '#5a2a5a70')),
    mid: (p) => scatter(3, 28, (x, y, r) => mushroom(p, x, y, 16 + Math.round(r * 10), '#c8b8d830', '#b4508a50')),
    particles: { kind: 'spores', cols: ['#9ff3ea', '#c8a8f0'], n: 16 },
  },
  'Crystal Caverns': {
    far: (p) => scatter(6, 29, (x, y, r) => crystalCol(p, x, y, 30 + r * 40, 6 + r * 4, '#5a44b040', '#2a1a6a40')),
    mid: (p) => scatter(4, 30, (x, y, r) => crystalCol(p, x, y, 20 + r * 24, 4 + r * 3, '#a890f050', '#5a44b050')),
    particles: { kind: 'glints', cols: ['#d8ccff', '#a8e8ff'], n: 10 },
  },
  'Sunken Ruins': {
    far: (p) => scatter(5, 31, (x, _y, r, i) => pillar(p, x, 10 + Math.round(r * 6), '#0e3a4870', '#14505e70', i, i % 2 === 1)),
    mid: (p) => scatter(3, 32, (x) => { for (let y = 0; y < LAYER; y++) p(x + y / 4, y, '#bfefff12', 14, 1); }), // light shafts
    particles: { kind: 'bubbles', cols: ['#bfefff', '#7ac8e0'], n: 14 },
  },
  Dreamwood: {
    far: (p) => scatter(6, 33, (x, y, r, i) => { trunk(p, x, 3, '#8a78b050', i + 40); blob(p, x + 1, y, 10 + Math.round(r * 6), i % 2 ? '#ffc8e850' : '#a8d8ff50'); }),
    mid: (p) => scatter(8, 34, (x, y) => { p(x, y - 4, '#5a4a7a80', 1, 4); p(x - 1, y, '#ffb070a0', 3, 4); p(x - 1, y, '#fff0b0a0', 1, 2); }), // floating lanterns
    particles: { kind: 'spores', cols: ['#ffd8f0', '#a8e8ff', '#fff8d8'], n: 12 },
  },
  'Mirror Lake': {
    far: NONE,
    mid: NONE,
    particles: { kind: 'snow', cols: ['#ffffff'], n: 8 },
  },
  'Starfall Observatory': {
    far: (p) => stars(p, 120, 36, ['#ffffff80', '#a8c8ff80', '#fff0b080']),
    mid: starfallMid,
    particles: { kind: 'meteors', cols: ['#fff0b0', '#ffffff'], n: 3 },
  },
  'Void Garden': {
    far: (p) => stars(p, 100, 38, ['#ffffff60', '#a890e060']),
    mid: (p) => scatter(4, 39, (x, y, r) => island(p, x, y, 20 + Math.round(r * 24), '#8a4ad870', '#1a0e2ad0')),
    particles: { kind: 'spores', cols: ['#d8a0ff', '#8a4ad8'], n: 12 },
  },
  'Ember Wastes': {
    // far: smouldering volcano cones; near: lava falls and drifting smoke
    far: (p) => scatter(4, 60, (x, y, r) => { const h = 40 + Math.round(r * 40); peak(p, x, y, h, '#3a141070', '#ff7a1a90', 3); p(x - 2, y - h - 6, '#4a3a3440', 5, 6); }),
    mid: (p) => { scatter(2, 61, (x) => fall(p, x, 6, '#a8401a70', '#ffb04090')); CLOUDS('#2a1a1650', 3, 10, 62)(p); },
    particles: { kind: 'spores', cols: ['#ff9a40', '#ffd070', '#ff5a1a'], n: 18 },
  },
  'Old Keep': {
    // far: a curtain of towers with lit windows; near: hanging banners
    far: (p) => scatter(5, 63, (x, _y, r, i) => tower(p, x, 12 + Math.round(r * 10), '#1a1e2880', '#f0c06090', i + 64)),
    mid: (p) => scatter(4, 65, (x, y) => { p(x, y, '#2a2c34a0', 1, 30); p(x + 1, y + 2, '#a83a3a90', 9, 20); for (let k = 0; k < 4; k++) p(x + 1 + k, y + 22 + k, '#a83a3a90', 9 - k * 2, 1); p(x + 4, y + 8, '#f0d06090', 3, 3); }),
    particles: { kind: 'spores', cols: ['#c8c0b0', '#8a8478'], n: 8 },
  },
  'Chapel Spire': {
    // far: pale spires rising into the dusk; near: glowing rose windows and shafts of light
    far: (p) => scatter(5, 66, (x, y, r) => spire(p, x, y, 8 + Math.round(r * 6), '#d8d0c240', '#8a7ab050')),
    mid: (p) => {
      scatter(3, 67, (x) => { for (let y = 0; y < LAYER; y++) p(x + y / 5, y, '#fff0c014', 16, 1); });
      scatter(3, 68, (x, y, r) => roseWindow(p, x, y, 9 + Math.round(r * 5), ['#d83a5a90', '#3a7ad890', '#f0c04090', '#3ab87a90'], '#4a403890'));
    },
    particles: { kind: 'glints', cols: ['#fff0a0', '#ffffff'], n: 8 },
  },
  'Sky Reef': {
    // far: puffy clouds; near: floating islets crowned with coral
    far: CLOUDS('#ffffff38', 7, 7, 69),
    mid: (p) => scatter(4, 70, (x, y, r) => {
      island(p, x, y, 24 + Math.round(r * 18), '#ff9ab890', '#bcd4f090');
      for (let k = 0; k < 3; k++) p(x - 8 + k * 7, y - 4 - k % 2 * 2, k % 2 ? '#5ad8c890' : '#ff9ab890', 2, 4 + k % 2 * 2);
    }),
    particles: { kind: 'bubbles', cols: ['#ffffff', '#b8fff0'], n: 10 },
  },
  'Frozen Summit': {
    // far: snow-capped peaks; near: drifting mist and ice spires
    far: (p) => scatter(4, 71, (x, y, r) => { const h = 50 + Math.round(r * 50); peak(p, x, y, h, '#3a5a8a60', '#e8f4ff90', Math.round(h * 0.3)); }),
    mid: (p) => { CLOUDS('#ffffff24', 3, 12, 72)(p); scatter(4, 73, (x, y, r) => crystalCol(p, x, y, 20 + r * 24, 4 + r * 3, '#c8e8ff50', '#7ab0e050')); },
    particles: { kind: 'snow', cols: ['#ffffff', '#e4eef8', '#c8dcf0'], n: 30 },
  },
};

export const backdropFor = (name: string): Backdrop => BACKDROPS[name] ?? BACKDROPS.Harbor;

/* ---------------- particles ----------------
   Stateless: each particle's position is a function of time and its
   index, in view space, so nothing needs updating or syncing. */
export interface Particle { x: number; y: number; col: string; w: number; h: number }
export function particlesAt(pt: Particles, t: number, w: number, h: number): Particle[] {
  const out: Particle[] = [];
  const mod = (a: number, m: number): number => ((a % m) + m) % m;
  for (let i = 0; i < pt.n; i++) {
    const a = hash(i, 7, 90), b = hash(i, 8, 91), c = hash(i, 9, 92);
    const col = pt.cols[i % pt.cols.length];
    let x = a * w, y = b * h, pw = 1, ph = 1;
    switch (pt.kind) {
      case 'snow': y = mod(b * h + t * (12 + c * 14), h + 4) - 2; x = mod(a * w + Math.sin(t * 0.8 + i) * 6 + t * 4, w); break;
      case 'leaves': case 'petals':
        y = mod(b * h + t * (10 + c * 8), h + 4) - 2; x = mod(a * w + Math.sin(t * 1.3 + i) * 10 - t * 6, w);
        pw = pt.kind === 'leaves' ? 2 : 1; ph = 1; break;
      case 'spores': y = mod(b * h - t * (4 + c * 6), h + 4) - 2; x = mod(a * w + Math.sin(t * 0.7 + i * 2) * 5, w); break;
      case 'bubbles': y = mod(b * h - t * (14 + c * 12), h + 4) - 2; x = mod(a * w + Math.sin(t * 2 + i) * 2, w); pw = ph = c < 0.4 ? 2 : 1; break;
      case 'fireflies': {
        x = mod(a * w + Math.sin(t * 0.5 + i) * 18, w); y = mod(b * h + Math.cos(t * 0.4 + i * 1.3) * 12, h);
        if (Math.sin(t * 2 + i * 3) < -0.3) continue; // they blink
        break;
      }
      case 'glints': if (mod(t * 0.6 + c * 5, 3) > 0.35) continue; break; // brief twinkles
      case 'meteors': {
        const ph2 = mod(t * 0.25 + c * 3, 3); // each falls for a moment every few seconds
        if (ph2 > 0.5) continue;
        x = mod(a * w + ph2 * 160, w); y = b * h * 0.6 + ph2 * 80;
        for (let k = 1; k < 8; k++) out.push({ x: x - k * 2, y: y - k, col: '#ffffff40', w: 1, h: 1 });
        break;
      }
    }
    out.push({ x, y, col, w: pw, h: ph });
  }
  return out;
}
