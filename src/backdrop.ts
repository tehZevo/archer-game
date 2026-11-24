import { hash } from './tilekit';

/* ============================================================
   BACKDROPS
   Behind each area's floor: the sky gradient (tileset.sky), then two
   painted layers that scroll slower than the floor (parallax), then a
   few drifting particles. Floors are tall and narrow, so layers tile in
   both directions: they hold scattered motifs (trunks, ridges, clouds,
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

/* ---------------- motifs ---------------- */
/** A smooth wave that repeats exactly across the tile (integer periods). */
const wave = (x: number, seed: number): number =>
  Math.sin((2 * Math.PI * x * 2) / LAYER + seed) * 0.6 + Math.sin((2 * Math.PI * x * 5) / LAYER + seed * 2.3) * 0.3 +
  Math.sin((2 * Math.PI * x * 11) / LAYER + seed * 4.1) * 0.1;

function blob(p: BgPaint, cx: number, cy: number, r: number, col: string): void {
  for (let y = -r; y <= r; y++) { const half = Math.round(Math.sqrt(r * r - y * y)); p(cx - half, cy + y, col, half * 2 + 1, 1); }
}
function cloud(p: BgPaint, cx: number, cy: number, s: number, col: string): void {
  blob(p, cx, cy, s, col); blob(p, cx - s * 1.2, cy + s * 0.4, s * 0.7, col); blob(p, cx + s * 1.3, cy + s * 0.3, s * 0.8, col);
  p(cx - s * 1.8, cy + s * 0.5, col, s * 3.8, s * 0.6);
}
/** Ridges: a wavy silhouette `depth` px deep starting near y0, repeated `n` times down the tile. */
function ridges(p: BgPaint, y0: number, amp: number, depth: number, col: string, seed: number, n = 2): void {
  for (let i = 0; i < n; i++) for (let x = 0; x < LAYER; x++) {
    const top = y0 + (i * LAYER) / n + amp * wave(x, seed + i * 1.7);
    p(x, top, col, 1, depth);
  }
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

/* ---------------- per area ---------------- */
const CLOUDS = (col: string, n: number, s: number, seed: number) => (p: BgPaint): void =>
  scatter(n, seed, (x, y, r) => cloud(p, x, y, Math.round(s * (0.7 + r * 0.6)), col));

export const BACKDROPS: Record<string, Backdrop> = {
  Classic: { far: CLOUDS('#ffffff14', 5, 6, 1), mid: CLOUDS('#ffffff20', 3, 10, 2) },
  'Tide Pools': {
    far: CLOUDS('#ffffff20', 5, 6, 40),
    mid: (p) => { ridges(p, 100, 8, 12, '#2e5a7a50', 41); scatter(4, 42, (x, _y, _r, i) => { const by = 100 + (i % 2) * 128; p(x, by - 14, '#2e5a7a50', 6, 14); p(x + 1, by - 22, '#f4f7fc50', 4, 8); }); }, // sea stacks and a lighthouse or two
    particles: { kind: 'bubbles', cols: ['#bfefff', '#ffffff'], n: 6 },
  },
  Beach: {
    far: CLOUDS('#ffffff22', 6, 6, 3),
    mid: (p) => { // distant islands with palms
      ridges(p, 90, 6, 10, '#1e5a7a60', 4);
      scatter(3, 5, (x, y, r, i) => { const by = 90 + (i % 2) * 128 - 6; p(x, by - 10, '#1e5a7a60', 2, 10); blob(p, x + 1, by - 11, 4, '#1e5a7a60'); void y; void r; });
    },
  },
  Forest: {
    far: (p) => scatter(7, 6, (x, _y, r, i) => trunk(p, x, 3 + Math.round(r * 3), '#0e2a1c80', i + 10)),
    mid: (p) => scatter(4, 7, (x, y, r, i) => { trunk(p, x, 6 + Math.round(r * 4), '#0a2216a0', i + 20); blob(p, x + 4, y, 14, '#123a24a0'); }),
    particles: { kind: 'leaves', cols: ['#7ab84a', '#c8a040', '#5a9a3a'], n: 10 },
  },
  Cave: {
    far: (p) => scatter(6, 8, (x, _y, r) => pillar(p, x, 6 + Math.round(r * 8), '#1e1c2a90', '#26243490', 9, false)),
    mid: (p) => scatter(8, 9, (x, y, r) => { for (let i = 0; i < 18 + r * 20; i++) p(x - Math.max(0, 6 - i / 4), y + i, '#0a0910b0', Math.max(1, 12 - i / 2), 1); }),
    particles: { kind: 'fireflies', cols: ['#3fbfb4', '#9ff3ea'], n: 6 },
  },
  Swamp: {
    far: (p) => scatter(6, 10, (x, _y, r, i) => trunk(p, x, 2 + Math.round(r * 3), '#0e1a1480', i + 30)),
    mid: (p) => { for (let i = 0; i < 3; i++) p(0, 40 + i * 85, '#8aa88a18', LAYER, 14 + i * 4); },
    particles: { kind: 'fireflies', cols: ['#d8f070', '#a8d040'], n: 10 },
  },
  Mountain: {
    far: (p) => ridges(p, 60, 22, 30, '#a8c0dc50', 11),
    mid: (p) => { ridges(p, 120, 26, 40, '#5a708c70', 12); ridges(p, 118, 26, 3, '#ffffff50', 12); },
    particles: { kind: 'snow', cols: ['#ffffff', '#e4eef8'], n: 22 },
  },
  Sky: {
    far: CLOUDS('#ffffff30', 7, 6, 13),
    mid: (p) => { scatter(3, 14, (x, y, r) => island(p, x, y, 26 + Math.round(r * 20), '#6ab84a90', '#5a6a8a90')); CLOUDS('#ffffff40', 3, 10, 15)(p); },
    particles: { kind: 'glints', cols: ['#ffe070', '#ffffff'], n: 6 },
  },
  'Clockwork Spire': {
    far: (p) => scatter(5, 16, (x, y, r) => gearShape(p, x, y, 14 + Math.round(r * 14), '#5a3e2060', '#20170e')),
    mid: (p) => { scatter(3, 17, (x) => { p(x, 0, '#7a828a50', 5, LAYER); p(x + 1, 0, '#a8b0c050', 1, LAYER); }); scatter(3, 18, (x, y, r) => gearShape(p, x, y, 8 + Math.round(r * 6), '#8a6a3080', '#2e2216')); },
  },
  Meadow: {
    far: CLOUDS('#ffffff38', 5, 7, 19),
    mid: (p) => { ridges(p, 110, 10, 24, '#6ab84a50', 20); scatter(20, 21, (x, _y, r) => p(x, 104 + (r < 0.5 ? 0 : 128) + r * 10, r < 0.3 ? '#ff8ac080' : '#ffffff80')); },
    particles: { kind: 'petals', cols: ['#ff8ac0', '#ffffff', '#ffe070'], n: 8 },
  },
  Riverbank: {
    far: (p) => ridges(p, 80, 14, 26, '#3a7a6a40', 22),
    mid: (p) => scatter(2, 23, (x) => { // waterfalls
      p(x, 0, '#7ac0e070', 12, LAYER);
      for (let y = 0; y < LAYER; y += 7) p(x + (y * 3) % 10, y, '#ffffff70', 1, 4);
    }),
    particles: { kind: 'fireflies', cols: ['#6ad8f0'], n: 4 },
  },
  Hills: {
    far: (p) => ridges(p, 70, 12, 20, '#6a9a5a40', 24),
    mid: (p) => {
      ridges(p, 130, 14, 26, '#4a7a3a60', 25, 1);
      scatter(2, 26, (x, _y, _r, i) => { // windmills on the ridge
        const by = 120 + i * 4;
        p(x, by - 16, '#e8e0d090', 3, 16);
        for (let k = 0; k < 8; k++) { p(x + 1 - k, by - 17 - k, '#e8e0d090'); p(x + 1 + k, by - 17 + k, '#e8e0d090'); }
      });
    },
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
    far: (p) => { ridges(p, 70, 16, 18, '#c8d8ec50', 35); ridges(p, 88, -16, 14, '#c8d8ec28', 35); }, // a skyline and its reflection
    mid: (p) => { for (let i = 0; i < 4; i++) p(0, 30 + i * 64, '#ffffff14', LAYER, 10); },
    particles: { kind: 'snow', cols: ['#ffffff'], n: 8 },
  },
  'Starfall Observatory': {
    far: (p) => stars(p, 120, 36, ['#ffffff80', '#a8c8ff80', '#fff0b080']),
    mid: (p) => {
      blob(p, 60, 70, 18, '#3a3a7a90'); blob(p, 54, 64, 10, '#4a4a8a90'); // a moon
      p(170, 190, '#d8b05080', 40, 1); blob(p, 190, 190, 9, '#8a5a3a90'); // a ringed planet
      stars(p, 30, 37, ['#ffffffc0']);
    },
    particles: { kind: 'meteors', cols: ['#fff0b0', '#ffffff'], n: 3 },
  },
  'Void Garden': {
    far: (p) => stars(p, 100, 38, ['#ffffff60', '#a890e060']),
    mid: (p) => scatter(4, 39, (x, y, r) => island(p, x, y, 20 + Math.round(r * 24), '#8a4ad870', '#1a0e2ad0')),
    particles: { kind: 'spores', cols: ['#d8a0ff', '#8a4ad8'], n: 12 },
  },
};

export const backdropFor = (name: string): Backdrop => BACKDROPS[name] ?? BACKDROPS.Classic;

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
