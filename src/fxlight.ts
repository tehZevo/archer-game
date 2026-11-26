/**
 * The light primitives skill effects are painted with (fxsprites.ts holds the
 * effects themselves): a Light accumulates rays, rings, discs and sparkles
 * per colour ramp, glows, and bakes to a quantized pixel-art canvas.
 */
export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export type Ramp = [number, string][]; // intensity threshold → rgba colour
export const ramp = (rgb: [number, number, number][], alphas = [0.3, 0.55, 0.8, 1, 1]): Ramp =>
  rgb.map((c, i) => [[0.07, 0.2, 0.38, 0.6, 0.82][i], `rgba(${c[0]},${c[1]},${c[2]},${alphas[i]})`]);

export const RAMPS = {
  cyan: ramp([[26, 70, 210], [47, 140, 255], [63, 216, 255], [168, 244, 255], [255, 255, 255]]),
  teal: ramp([[12, 110, 100], [31, 191, 154], [63, 240, 192], [176, 255, 232], [255, 255, 255]]),
  green: ramp([[42, 110, 16], [79, 194, 26], [140, 240, 58], [216, 255, 154], [255, 255, 255]]),
  dust: ramp([[110, 124, 138], [170, 184, 196], [220, 230, 238], [245, 250, 255], [255, 255, 255]], [0.25, 0.45, 0.7, 0.9, 1]),
  lime: ramp([[70, 110, 10], [140, 200, 20], [214, 240, 60], [250, 250, 170], [255, 255, 255]]),
  gold: ramp([[150, 90, 10], [230, 160, 30], [255, 209, 102], [255, 240, 190], [255, 255, 255]]),
  // skill colours (match the icon palette): Meteor Dive yellow, Piercing Leap purple,
  // Tempest purple + pink, Skyward Assault light blue, Cyclone Sweep red
  yellow: ramp([[150, 120, 0], [230, 190, 20], [255, 225, 77], [255, 245, 170], [255, 255, 255]]),
  purple: ramp([[70, 20, 140], [120, 50, 210], [165, 100, 255], [215, 180, 255], [255, 255, 255]]),
  pink: ramp([[150, 30, 110], [230, 70, 170], [255, 130, 210], [255, 200, 235], [255, 255, 255]]),
  sky: ramp([[60, 130, 200], [110, 180, 240], [160, 215, 255], [210, 240, 255], [255, 255, 255]]),
  orange: ramp([[150, 60, 0], [230, 110, 20], [255, 160, 60], [255, 215, 160], [255, 255, 255]]),
  red: ramp([[130, 10, 10], [210, 30, 30], [255, 80, 60], [255, 170, 150], [255, 255, 255]]),
};
export type RampName = keyof typeof RAMPS;

/** A light buffer: one float intensity layer per ramp, combined by max. */
export class Light {
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
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export interface FxAnim { frames: HTMLCanvasElement[]; flipped: HTMLCanvasElement[]; ox: number; oy: number; }

export function anim(w: number, h: number, ox: number, oy: number, n: number, draw: (L: Light, f: number, n: number) => void, glowAmt = 0.45): FxAnim {
  const frames: HTMLCanvasElement[] = [], flipped: HTMLCanvasElement[] = [];
  for (let f = 0; f < n; f++) {
    const L = new Light(w, h);
    draw(L, f, n);
    L.glow(glowAmt);
    frames.push(L.bake(false)); flipped.push(L.bake(true));
  }
  return { frames, flipped, ox, oy };
}

/** An arc of a ring from a0 to a1 (any angles, a0 < a1 < a0 + 2pi): the
 *  ring itself only takes -pi..pi, so an arc across pi is drawn in two. */
export function arc(L: Light, r: RampName, cx: number, cy: number, rx: number, ry: number, thick: number, I: number, a0: number, a1: number): void {
  const w = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
  const b0 = w(a0), b1 = w(a1);
  if (b0 <= b1) L.ring(r, cx, cy, rx, ry, thick, I, b0, b1);
  else { L.ring(r, cx, cy, rx, ry, thick, I, b0, Math.PI); L.ring(r, cx, cy, rx, ry, thick, I, -Math.PI, b1); }
}
