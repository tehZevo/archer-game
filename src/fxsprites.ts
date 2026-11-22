/**
 * Skill effect animations: original pixel art in the style of classic MMOs'
 * glowing skill effects (white-hot core, cyan/teal halo, soft outer glow,
 * drawn additively). Each effect is a short strip of frames rendered once at
 * boot from simple light primitives (rays, rings, discs, sparkles), then
 * quantized to a few palette steps so it stays crisp pixel art.
 */
function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

type Ramp = [number, string][]; // intensity threshold → rgba colour
const ramp = (rgb: [number, number, number][], alphas = [0.3, 0.55, 0.8, 1, 1]): Ramp =>
  rgb.map((c, i) => [[0.07, 0.2, 0.38, 0.6, 0.82][i], `rgba(${c[0]},${c[1]},${c[2]},${alphas[i]})`]);

export const RAMPS = {
  cyan: ramp([[26, 70, 210], [47, 140, 255], [63, 216, 255], [168, 244, 255], [255, 255, 255]]),
  teal: ramp([[12, 110, 100], [31, 191, 154], [63, 240, 192], [176, 255, 232], [255, 255, 255]]),
  green: ramp([[42, 110, 16], [79, 194, 26], [140, 240, 58], [216, 255, 154], [255, 255, 255]]),
  dust: ramp([[110, 124, 138], [170, 184, 196], [220, 230, 238], [245, 250, 255], [255, 255, 255]], [0.25, 0.45, 0.7, 0.9, 1]),
  lime: ramp([[70, 110, 10], [140, 200, 20], [214, 240, 60], [250, 250, 170], [255, 255, 255]]),
  gold: ramp([[150, 90, 10], [230, 160, 30], [255, 209, 102], [255, 240, 190], [255, 255, 255]]),
};
type RampName = keyof typeof RAMPS;

/** A light buffer: one float intensity layer per ramp, combined by max. */
class Light {
  layers = new Map<RampName, Float32Array>();
  constructor(public w: number, public h: number) {}
  private layer(r: RampName): Float32Array {
    let l = this.layers.get(r);
    if (!l) { l = new Float32Array(this.w * this.h); this.layers.set(r, l); }
    return l;
  }
  private put(r: RampName, x: number, y: number, v: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || v <= 0) return;
    const l = this.layer(r), i = y * this.w + x;
    if (v > l[i]) l[i] = v;
  }
  /** Tapered segment from (x0,y0) radius r0 to (x1,y1) radius r1. */
  line(r: RampName, x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, I: number): void {
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const px = x + 0.5, py = y + 0.5;
      const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L2));
      const d = Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
      const rad = r0 + (r1 - r0) * t;
      if (rad > 0) this.put(r, x, y, I * (1 - d / rad));
    }
  }
  disc(r: RampName, cx: number, cy: number, rad: number, I: number): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      this.put(r, x, y, I * (1 - d / rad));
    }
  }
  /** Thin elliptical ring (a shockwave), optionally only an arc a0..a1 (radians). */
  ring(r: RampName, cx: number, cy: number, rx: number, ry: number, thick: number, I: number, a0 = -Math.PI, a1 = Math.PI): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      const a = Math.atan2(dy, dx);
      if (a < a0 || a > a1) continue;
      const d = Math.abs(Math.hypot(dx, dy) - 1) * Math.min(rx, ry);
      // fade toward the arc's ends
      const span = a1 - a0, e = span < 6.2 ? Math.min(1, Math.min(a - a0, a1 - a) / (span * 0.3)) : 1;
      this.put(r, x, y, I * e * (1 - d / thick));
    }
  }
  /** A tiny + sparkle. */
  spark(r: RampName, x: number, y: number, I: number, big = false): void {
    x = Math.round(x); y = Math.round(y);
    this.put(r, x, y, I);
    const arm = big ? 2 : 1;
    for (let k = 1; k <= arm; k++) {
      const v = I * (k === 1 ? 0.6 : 0.3);
      this.put(r, x + k, y, v); this.put(r, x - k, y, v); this.put(r, x, y + k, v); this.put(r, x, y - k, v);
    }
  }
  /** Soft glow: add a blurred copy of each layer underneath. */
  glow(amount = 0.45): void {
    for (const [, l] of this.layers) {
      const src = l.slice();
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        let s = 0, n = 0;
        for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
          const xx = x + i, yy = y + j;
          if (xx < 0 || yy < 0 || xx >= this.w || yy >= this.h) continue;
          s += src[yy * this.w + xx]; n++;
        }
        const g = (s / n) * amount * 2;
        const i0 = y * this.w + x;
        if (g > l[i0]) l[i0] = Math.min(g, 0.45); // glow never reaches the bright steps
      }
    }
  }
  /** Quantize to palette steps and paint into a canvas (optionally mirrored). */
  bake(flip = false): HTMLCanvasElement {
    const c = makeCanvas(this.w, this.h), g = c.getContext('2d')!;
    for (const [name, l] of this.layers) {
      const rp = RAMPS[name];
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const v = l[y * this.w + x];
        let col: string | null = null;
        for (const [th, cc] of rp) if (v >= th) col = cc;
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(flip ? this.w - 1 - x : x, y, 1, 1);
      }
    }
    return c;
  }
}

/** Deterministic pseudo-random so the baked frames are stable. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export interface FxAnim { frames: HTMLCanvasElement[]; flipped: HTMLCanvasElement[]; ox: number; oy: number; }

function anim(w: number, h: number, ox: number, oy: number, n: number, draw: (L: Light, f: number, n: number) => void, glowAmt = 0.45): FxAnim {
  const frames: HTMLCanvasElement[] = [], flipped: HTMLCanvasElement[] = [];
  for (let f = 0; f < n; f++) {
    const L = new Light(w, h);
    draw(L, f, n);
    L.glow(glowAmt);
    frames.push(L.bake(false)); flipped.push(L.bake(true));
  }
  return { frames, flipped, ox, oy };
}

/** Hit: a spiky starburst that collapses into an expanding oval shockwave and sparkle dust. */
function hitAnim(big: boolean, rp: RampName): FxAnim {
  const S = big ? 41 : 31, c = S / 2;
  return anim(S, S, c, c, 6, (L, f) => {
    const R = rng(7 + (big ? 100 : 0));
    const rays = big ? 10 : 8;
    if (f <= 1) {
      const len = (big ? 18 : 13) * (f === 0 ? 1 : 0.6);
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2 + 0.2, l = len * (i % 2 ? 0.55 : 1);
        L.line(rp, c, c, c + Math.cos(a) * l, c + Math.sin(a) * l, 1.6, 0.4, 1);
      }
      L.disc(rp, c, c, f === 0 ? 4.5 : 3.5, 1.3);
    }
    if (f >= 1 && f <= 4) {
      const g = f / 4;
      L.ring(rp, c, c, (big ? 6 : 4) + g * (big ? 8 : 6), (big ? 9 : 7) + g * (big ? 7 : 5), 1.0, 0.55 * (1 - g * 0.8));
    }
    if (f >= 2) {
      const n = big ? 12 : 8, fade = 1 - (f - 2) / 4;
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, d = 3 + R() * (big ? 12 : 9) + f * 1.5;
        L.spark(rp, c + Math.cos(a) * d, c + Math.sin(a) * d, 0.9 * fade, R() < 0.25);
      }
      if (f === 2) L.disc(rp, c, c, 2.5, 0.9);
    }
  });
}

/** Twin Shot muzzle: a bright streak with teal crescents curling round the tip. Faces right. */
function muzzleAnim(): FxAnim {
  // kept tight to the bow: the origin is the muzzle, everything within ~16px of it
  const W = 22, H = 18, y = H / 2;
  return anim(W, H, 1, y, 6, (L, f) => {
    const R = rng(3 + f);
    const fade = f < 3 ? 1 : 1 - (f - 2) / 4;
    const head = 7 + f * 1.5;
    // twin streaks (dual shot), core brightest at the head
    L.line('cyan', 1, y - 2, head, y - 2, 0.3, 1.3, 1.2 * fade);
    L.line('cyan', 1, y + 2, head - 2, y + 2, 0.3, 1.1, 1.0 * fade);
    // crescents swirling round the muzzle
    const cx = 4 + f;
    L.ring('teal', cx, y, 3 + f * 0.5, 5 + f * 0.5, 1.2, 1.0 * fade, -1.4, 1.4);
    if (f >= 1) L.ring('teal', cx + 5, y, 2 + f * 0.4, 4 + f * 0.4, 1.0, 0.8 * fade, -1.3, 1.3);
    for (let i = 0; i < 3; i++) L.spark('cyan', cx + R() * 10, y - 6 + R() * 12, 0.9 * fade, i === 0);
  });
}

/** Arrow projectile: a long thin glowing streak. Faces right; origin at the tip. */
function arrowAnim(): FxAnim {
  return anim(26, 7, 24, 3.5, 1, (L) => {
    L.line('cyan', 1, 3.5, 24, 3.5, 0.3, 1.4, 1.2);
    L.line('teal', 8, 3.5, 22, 3.5, 0.2, 2.2, 0.55);
  }, 0.35);
}

/** Twin Shot tracer: twin streaks whipping out from the bow across
 *  the range. Faces right; origin at the muzzle; stretched to the target. */
function tracerAnim(): FxAnim {
  const W = 64, H = 9, y = 4.5;
  // [tail, head] of each streak per frame, as fractions of W
  const spans: [number, number][] = [[0, 0.45], [0.1, 1], [0.45, 1], [0.75, 1], [0.92, 1]];
  return anim(W, H, 0, y, spans.length, (L, f) => {
    const [a, b] = spans[f], fade = f < 2 ? 1 : 1 - (f - 1) / 4;
    L.line('cyan', 1 + a * (W - 2), y - 1.5, b * (W - 2), y - 1.5, 0.3, 1.1, 1.1 * fade);
    // the second shot trails slightly behind the first
    L.line('teal', 1 + Math.max(0, a - 0.08) * (W - 2), y + 1.5, Math.max(0.1, b - 0.08) * (W - 2), y + 1.5, 0.3, 1.0, 0.95 * fade);
  }, 0.35);
}

/** Mob death: a soft puff of dust swelling from the body with a few motes
 *  drifting up. Origin at the mob's feet. */
function deathAnim(): FxAnim {
  const W = 34, H = 30, bx = W / 2, by = H - 3;
  return anim(W, H, bx, by, 7, (L, f) => {
    const R = rng(41), fade = 1 - f / 7;
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + 0.4, sp = 3 + R() * 3;
      const px = bx + Math.cos(ang) * sp * (0.6 + f * 0.9), py = by - 8 + Math.sin(ang) * sp * 0.6 * (0.6 + f * 0.9) - f * 1.5;
      L.disc('dust', px, py, 3.2 - f * 0.25, 0.8 * fade);
    }
    L.ring('dust', bx, by - 1, 6 + f * 2.2, 1.6 + f * 0.5, 1, 0.6 * fade);
    for (let i = 0; i < 3; i++) L.spark('cyan', bx - 8 + R() * 16, by - 10 - f * 2.5 - R() * 8, 0.8 * fade, i === 0);
  }, 0.3);
}

/** Level up: a gold pillar of light at the player's feet with rings and
 *  rising sparkles. Origin at the feet. */
function levelUpAnim(): FxAnim {
  const W = 44, H = 70, bx = W / 2, by = H - 4;
  return anim(W, H, bx, by, 10, (L, f) => {
    const R = rng(77 + f), rise = Math.min(1, (f + 1) / 3), fade = f < 6 ? 1 : 1 - (f - 5) / 5;
    const top = by - rise * (H - 10);
    L.line('gold', bx, by, bx, top, 7, 2, 0.75 * fade);
    L.line('gold', bx, by, bx, top, 2.5, 0.8, 1.1 * fade);
    for (let k = 0; k < 2; k++) {
      const g = ((f + k * 4) % 8) / 8;
      L.ring('gold', bx, by - g * 30, 6 + g * 10, 2 + g * 2.5, 1.2, (1 - g) * 0.9 * fade);
    }
    for (let i = 0; i < 6; i++) L.spark(i % 2 ? 'gold' : 'lime', bx - 14 + R() * 28, by - 8 - R() * (H - 20) * rise, 0.9 * fade, i === 0);
  });
}

/** Sky Toss: a spiral horn of light erupting from the ground, dust at its base. Origin at the base. */
function rushAnim(): FxAnim {
  const W = 30, H = 52, bx = W / 2, by = H - 4;
  return anim(W, H, bx, by, 8, (L, f) => {
    const R = rng(11 + f);
    if (f === 0) {
      // a pillar of light shoots up first
      L.line('cyan', bx, by, bx, 6, 3.5, 1, 0.9);
      L.ring('cyan', bx, by, 9, 2.5, 1.5, 0.6);
      return;
    }
    const fade = f < 5 ? 1 : 1 - (f - 4) / 4;
    const tip = 4 + Math.max(0, 3 - f) * 3, base = by - 6, top = tip;
    // the horn: a cone with spiral bands
    for (let yy = top; yy <= base; yy++) {
      const t = (yy - top) / (base - top);            // 0 tip → 1 base
      const half = 0.6 + t * 5.2;
      for (let xx = -Math.ceil(half); xx <= Math.ceil(half); xx++) {
        const edge = 1 - Math.abs(xx) / (half + 0.5);
        if (edge <= 0) continue;
        const band = 0.55 + 0.45 * Math.sin(yy * 0.9 + xx * 0.7 - f * 1.2); // spiral stripes
        L.disc('cyan', bx + xx + 0.5, yy + 0.5, 0.9, fade * (0.45 + edge * 0.75 * band));
      }
    }
    L.line('cyan', bx, top, bx, base, 0.2, 1.1, 1.1 * fade);      // bright spine
    // swept-back "wings" at the hilt
    L.ring('teal', bx - 5, base - 1, 5, 4, 1.2, 0.9 * fade, -0.4, 1.6);
    L.ring('teal', bx + 5, base - 1, 5, 4, 1.2, 0.9 * fade, 1.5, 3.14);
    // dust puffs spreading at the base
    const spread = 4 + f * 2.2, dfade = Math.max(0, 1 - f / 7);
    for (let i = 0; i < 7; i++) {
      const sx = bx + (R() * 2 - 1) * spread, sy = by - R() * 3;
      L.disc('dust', sx, sy, 1.5 + R() * 1.5, 0.9 * dfade);
    }
  }, 0.4);
}

/** Sky Assault strike: a white-blue crescent swoosh that sweeps and thins. Faces right. */
function swooshAnim(): FxAnim {
  const W = 30, H = 30, c = W / 2;
  return anim(W, H, c, c, 4, (L, f) => {
    const R = rng(21 + f);
    const fade = 1 - f / 4, a0 = -2.2 + f * 0.35, a1 = 0.6 + f * 0.35;
    L.ring('cyan', c - 3, c, 10, 12, 1.8 - f * 0.3, 1.15 * fade, a0, a1);
    L.ring('cyan', c - 5, c + 1, 8, 10, 1.0, 0.7 * fade, a0 + 0.3, a1 - 0.2);
    for (let i = 0; i < 3; i++) L.spark('cyan', c + R() * 12 - 2, c - 8 + R() * 16, 0.8 * fade);
  });
}

/** Skyfall Volley: a volley of yellow-green arrows raining down onto the target,
 *  spiky gold impacts, a flat green crescent swirl and dust. Origin at the base. */
function rainAnim(): FxAnim {
  const W = 40, H = 64, bx = W / 2, by = H - 6;
  const cols = [-7, 3, -2, 8, -10, 5]; // streak x offsets
  return anim(W, H, bx, by, 8, (L, f) => {
    const R = rng(31 + f);
    const fade = f < 5 ? 1 : 1 - (f - 4) / 4;
    // arrows streaking down, staggered
    cols.forEach((dx, i) => {
      const head = -10 + (f * 2 + i) * 9 % 72;           // head y from the top
      if (head < 4 || head > by + 2) return;
      const tail = Math.max(0, head - 22);
      L.line('lime', bx + dx, tail, bx + dx, head, 0.3, 1.3, 1.05 * fade);
    });
    // spiky gold impact at the base
    if (f < 7) {
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.45, l = 6 + R() * 5;
        L.line('gold', bx + (R() * 6 - 3), by - 2, bx + Math.cos(a) * l, by - 2 + Math.sin(a) * l, 1.2, 0.3, 1.1 * fade);
      }
      L.disc('gold', bx, by - 2, 3, 1.1 * fade);
    }
    // flat green crescent swirling round the base (on the 1st and 4th frames)
    if (f % 3 === 0 && f < 6) L.ring('lime', bx, by, 14, 4, 1.4, 1.0, -0.4, 2.9);
    // dust
    if (f >= 2) for (let i = 0; i < 6; i++) L.disc('dust', bx + (R() * 2 - 1) * (6 + f * 2), by + 1 - R() * 3, 1.6, 0.8 * (1 - f / 8));
  }, 0.4);
}

/** Shell Barrage bolt: a green streak with a brighter, wider head. Faces right; origin at the tip. */
function boltAnim(): FxAnim {
  return anim(30, 9, 28, 4.5, 1, (L) => {
    L.line('green', 1, 4.5, 28, 4.5, 0.3, 1.6, 1.2);
    L.line('lime', 14, 4.5, 27, 4.5, 0.3, 2.6, 0.6);
  }, 0.35);
}

/** Shell Barrage hit: green-white starburst with a long horizontal streak and a fading crescent
 *  (drawn mirrored so the streak points back toward the shooter). */
function stunHitAnim(): FxAnim {
  const W = 56, H = 34, c = 22, y = H / 2;
  return anim(W, H, c, y, 6, (L, f) => {
    const R = rng(41 + f);
    const fade = 1 - f / 6;
    if (f <= 2) {
      const len = 13 - f * 3;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.3, l = len * (i % 2 ? 0.5 : 1);
        L.line('green', c, y, c + Math.cos(a) * l, y + Math.sin(a) * l, 1.5, 0.3, 1.1);
      }
      L.disc('green', c, y, 4 - f, 1.3);
    }
    L.line('green', c - 6, y, c + 30 - f * 2, y, 0.4, 1.0, 0.9 * fade); // horizontal streak
    if (f >= 2) L.ring('lime', c + 4 + f * 2, y - 6, 4, 4, 1, 0.8 * fade, -2.6, 1.0); // crescent
    if (f >= 1) for (let i = 0; i < 4; i++) L.spark('green', c + R() * 20 - 6, y + R() * 14 - 7, 0.8 * fade);
  });
}

/** Glide launch: concentric green rings (a portal seen side-on) with
 *  streaks extending to the right of them. Drawn mirrored so the rings are
 *  ahead of the player and the streaks trail behind. */
function spiritAnim(): FxAnim {
  const W = 44, H = 34, cx = 10, y = H / 2;
  return anim(W, H, cx, y, 7, (L, f) => {
    const R = rng(51 + f);
    const fade = f < 3 ? 1 : 1 - (f - 2) / 5;
    for (let k = 0; k < 3; k++) {
      const ry = 5 + k * 4 + f * 0.8;
      L.ring('green', cx + k * 2, y, 2 + k, ry, 1.1, (1 - k * 0.2) * fade);
    }
    if (f >= 1) {
      const len = 8 + f * 5;
      L.line('lime', cx + 2, y, cx + 2 + len, y, 0.4, 1.4, 1.1 * fade);
      L.ring('green', cx + len * 0.6, y - 1, len * 0.5, 5, 1, 0.8 * fade, -2.4, -0.4);
      L.ring('green', cx + len * 0.6, y + 1, len * 0.5, 5, 1, 0.8 * fade, 0.4, 2.4);
    }
    for (let i = 0; i < 3; i++) L.spark('lime', cx + 4 + R() * 26, y - 10 + R() * 20, 0.8 * fade);
  });
}

let cache: Record<string, FxAnim> | null = null;
/** Lazily build every effect (needs a canvas, so not at import time). */
export function FX(): Record<string, FxAnim> {
  if (!cache) {
    cache = {
      hit: hitAnim(false, 'cyan'),
      crit: hitAnim(true, 'green'),
      muzzle: muzzleAnim(),
      arrow: arrowAnim(),
      tracer: tracerAnim(),
      death: deathAnim(),
      levelUp: levelUpAnim(),
      rush: rushAnim(),
      swoosh: swooshAnim(),
      rain: rainAnim(),
      rainHit: hitAnim(false, 'gold'),
      bolt: boltAnim(),
      stunHit: stunHitAnim(),
      spirit: spiritAnim(),
    };
  }
  return cache;
}
