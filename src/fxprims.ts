/**
 * The shared drawing primitives skill effects are built from (bursts,
 * crescents, lances, glints, sprays, zaps, falling spikes, rush streaks),
 * and the frame counts and sizes that effects and the game agree on.
 * fxsprites.ts holds the effects themselves; fxlight.ts the light buffer
 * these paint into.
 */
import { arc, rng, type Light, type RampName } from './fxlight';

/** Frames in Cyclone Sweep's whirl (cycloneAnim). */
export const CYCLONE_FRAMES = 8;
/** Frames in Bolt Flurry's looping volley (flurryAnim). */
export const FLURRY_FRAMES = 4;
/** Frames in a ground rush's looping aura (tossRushAnim, blitzRushAnim). */
export const RUSH_AURA_FRAMES = 4;
/** A ground rush aura's size, and its origin (her feet). */
export const AURA_W = 60, AURA_H = 36, AURA_X = 40, AURA_Y = AURA_H - 3;
/** Skyward Assault's last strike lands DROP_BACK px ahead of her and
 *  DROP_UP px below (assaultDropAnim). */
export const DROP_UP = 60, DROP_BACK = 16;

/** A hit's burst at (c, cy): a spiky starburst that collapses into an
 *  expanding oval shockwave and sparkle dust, over frames 0..5. */
export function burst(L: Light, f: number, c: number, cy: number, big: boolean, rp: RampName): void {
  const R = rng(7 + (big ? 100 : 0));
  const rays = big ? 10 : 8;
  if (f <= 1) {
    const len = (big ? 18 : 13) * (f === 0 ? 1 : 0.6);
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + 0.2, l = len * (i % 2 ? 0.55 : 1);
      L.line(rp, c, cy, c + Math.cos(a) * l, cy + Math.sin(a) * l, 1.6, 0.4, 1);
    }
    L.disc(rp, c, cy, f === 0 ? 4.5 : 3.5, 1.3);
  }
  if (f >= 1 && f <= 4) {
    const g = f / 4;
    L.ring(rp, c, cy, (big ? 6 : 4) + g * (big ? 8 : 6), (big ? 9 : 7) + g * (big ? 7 : 5), 1.0, 0.55 * (1 - g * 0.8));
  }
  if (f >= 2) {
    const n = big ? 12 : 8, fade = 1 - (f - 2) / 4;
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, d = 3 + R() * (big ? 12 : 9) + f * 1.5;
      L.spark(rp, c + Math.cos(a) * d, cy + Math.sin(a) * d, 0.9 * fade, R() < 0.25);
    }
    if (f === 2) L.disc(rp, c, cy, 2.5, 0.9);
  }
}

/** One falling spike: a pink-tipped purple shard, point down, with its
 *  streak trailing up behind it. `tip` is where its point is. */
export function fallingSpike(L: Light, x: number, tip: number, len: number, I: number): void {
  L.line('purple', x, tip - len * 2.4, x, tip - len, 0.3, 2.0, 0.65 * I); // the streak
  L.line('purple', x, tip - len, x, tip, 3.8, 0.4, 1.2 * I);              // the shard
  L.line('pink', x, tip - len * 0.85, x, tip - 1, 1.4, 0.3, 1.15 * I);    // its bright core
}

/** A blade of light sweeping round an ellipse: its head at angle `head`,
 *  trailing `trail` radians behind it the way it came (`dir` +1: sweeping
 *  to larger angles, -1: smaller), thickest and brightest at the head, with
 *  a white-hot tip. */
export function crescent(L: Light, rp: RampName, wind: RampName, cx: number, cy: number, rx: number, ry: number,
  head: number, trail: number, dir: 1 | -1, I: number, thick = 4): void {
  for (let k = 0; k < 5; k++) {
    const h = head - dir * k * trail * 0.16, len = trail * (1 - k * 0.12), kx = 1 - k * 0.05;
    const [a0, a1] = dir > 0 ? [h - len, h] : [h, h + len];
    arc(L, k < 2 ? rp : wind, cx, cy, rx * kx, ry * kx, thick - k * 0.6, (1.3 - k * 0.2) * I, a0, a1);
  }
  // the white-hot tip
  L.disc(rp, cx + Math.cos(head) * rx, cy + Math.sin(head) * ry, thick * 0.6, 1.3 * I);
}

/** A lance of light: thin at both ends, thick in the middle. */
export function lance(L: Light, rp: RampName, x0: number, y0: number, x1: number, y1: number, w: number, I: number): void {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  L.line(rp, x0, y0, mx, my, 0.2, w, I);
  L.line(rp, mx, my, x1, y1, w, 0.2, I);
}

/** A four-point star glint: long thin rays across and up-down, a hot core. */
export function glint(L: Light, rp: RampName, x: number, y: number, h: number, v: number, I: number): void {
  lance(L, rp, x - h, y, x + h, y, 1.6, I);
  lance(L, rp, x, y - v, x, y + v, 1.4, I);
  lance(L, rp, x - v * 0.4, y - v * 0.4, x + v * 0.4, y + v * 0.4, 0.9, I * 0.8);
  lance(L, rp, x - v * 0.4, y + v * 0.4, x + v * 0.4, y - v * 0.4, 0.9, I * 0.8);
  L.disc(rp, x, y, 2.5, 1.3 * I);
}

/** A spray of streaks and dust kicked up off the ground at (x, y), `g` 0..1 as it settles. */
export function groundSpray(L: Light, R: () => number, x: number, y: number, g: number, n: number, reach: number): void {
  const I = 1 - g;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.2, l = reach * (0.5 + R() * 0.5) * (0.4 + g * 0.6);
    L.line(i % 2 ? 'sky' : 'cyan', x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 1.0, 0.2, 1.05 * I);
  }
  for (let i = 0; i < n; i++) L.spark('sky', x + (R() * 2 - 1) * reach * 0.8, y - R() * 5, 0.9 * I, i < 2);
}

/** Speed lines streaming back from the body, and a bow wave at her feet. */
export function rushStreaks(L: Light, f: number, hue: RampName, rim: RampName, heavy: boolean): void {
  const rows = heavy ? [3, 7, 11, 15, 19, 23] : [4, 9, 14, 19];
  rows.forEach((up, i) => {
    const y = AURA_Y - up, len = 14 + ((i * 7 + f * 5) % 4) * 5 + (heavy ? 6 : 0);
    const x0 = AURA_X - 6 - ((i + f) % 2) * 2;
    L.line(hue, x0 - len, y, x0, y, 0.2, heavy ? 1.4 : 1.1, 0.95);
  });
  // the bow wave: a low arc of air pushed ahead of her feet
  L.ring(rim, AURA_X + 4, AURA_Y - 4, 7 + (f % 2), 6, 1.3, 1.0, -1.5, 0.4);
}

/** A jagged bolt from (x0,y0) to (x1,y1) in `n` kinks, the kinks from `R`. */
export function zap(L: Light, R: () => number, hue: RampName, x0: number, y0: number, x1: number, y1: number, n: number, I: number): void {
  let px = x0, py = y0;
  for (let k = 1; k <= n; k++) {
    const t = k / n, j = k < n ? (R() * 2 - 1) * 3 : 0;
    const nx = x0 + (x1 - x0) * t + j, ny = y0 + (y1 - y0) * t + (k < n ? (R() * 2 - 1) * 2 : 0);
    L.line(hue, px, py, nx, ny, 0.8, 0.8, I);
    px = nx; py = ny;
  }
}
