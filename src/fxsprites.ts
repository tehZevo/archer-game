/**
 * Skill effect animations: original pixel art in the style of classic MMOs'
 * glowing skill effects (white-hot core, cyan/teal halo, soft outer glow,
 * drawn additively). Each effect is a short strip of frames painted from
 * simple light primitives (rays, rings, discs, sparkles), then quantized to
 * a few palette steps so it stays crisp pixel art. These generators are the
 * authoring source: `npm run bake` writes them to PNG sheets in assets/fx,
 * which is what the game ships and draws (see fxsheets.ts).
 */
import { anim, arc, rng, type FxSheet, type Light, type RampName } from './fxlight';

/** A hit's burst at (c, cy): a spiky starburst that collapses into an
 *  expanding oval shockwave and sparkle dust, over frames 0..5. */
function burst(L: Light, f: number, c: number, cy: number, big: boolean, rp: RampName): void {
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

/** Hit: a burst centred on the struck enemy. */
function hitAnim(big: boolean, rp: RampName): FxSheet {
  const S = big ? 41 : 31, c = S / 2;
  return anim(S, S, c, c, 6, (L, f) => burst(L, f, c, c, big, rp));
}

/** One falling spike: a pink-tipped purple shard, point down, with its
 *  streak trailing up behind it. `tip` is where its point is. */
function fallingSpike(L: Light, x: number, tip: number, len: number, I: number): void {
  L.line('purple', x, tip - len * 2.4, x, tip - len, 0.3, 2.0, 0.65 * I); // the streak
  L.line('purple', x, tip - len, x, tip, 3.8, 0.4, 1.2 * I);              // the shard
  L.line('pink', x, tip - len * 0.85, x, tip - 1, 1.4, 0.3, 1.15 * I);    // its bright core
}

/** Piercing Leap's hit: a spike drops out of the sky onto the enemy and
 *  bursts purple on it. Origin at the enemy's middle. */
function spikeHitAnim(): FxSheet {
  const W = 31, H = 52, c = W / 2, cy = H - W / 2;
  return anim(W, H, c, cy, 7, (L, f) => {
    if (f < 2) fallingSpike(L, c, f === 0 ? cy - 14 : cy, 16, 1);
    if (f >= 1) burst(L, f - 1, c, cy, false, f === 1 ? 'pink' : 'purple');
  });
}

/** Double Shot muzzle: a bright streak with teal crescents curling round the tip. Faces right. */
function muzzleAnim(): FxSheet {
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

/** Gale Stream muzzle: a small green gust ring snapping open at the bow,
 *  with leaf-like sparks spun off it. Faces right; origin at the muzzle. */
function galeMuzzleAnim(): FxSheet {
  const W = 20, H = 18, y = H / 2;
  return anim(W, H, 1, y, 4, (L, f) => {
    const R = rng(41 + f), fade = 1 - f / 4, cx = 4 + f * 1.5;
    L.ring('lime', cx, y, 2 + f * 1.2, 3.5 + f * 1.6, 1.1, 1.1 * fade, -1.5, 1.5);
    L.line('green', 1, y, 6 + f * 3, y, 0.4, 1.2, 1.15 * fade);
    for (let i = 0; i < 3; i++) L.spark(i ? 'green' : 'lime', cx + 2 + R() * 9, y - 6 + R() * 12, 0.95 * fade, i === 0);
  });
}

/** Gale Stream shot: one green bolt with a twist of wind wrapped round it,
 *  whipping out to the target. Faces right; origin at the muzzle; drawn W px long
 *  (the shot's own length), so it is never stretched. */
function galeShotAnim(W: number): FxSheet {
  const H = 11, y = 5.5;
  const spans: [number, number][] = [[0, 0.55], [0.2, 1], [0.6, 1], [0.88, 1]];
  return anim(W, H, 0, y, spans.length, (L, f) => {
    const [a, b] = spans[f], fade = f < 2 ? 1 : 1 - (f - 1) / 3;
    const x0 = 1 + a * (W - 2), x1 = b * (W - 2);
    L.line('lime', x0, y, x1, y, 0.3, 1.3, 1.2 * fade);
    // the wind twisting round the bolt: a sine strand either side
    const wy = (x: number): number => y + Math.sin((x + f * 6) / 4) * 3.2;
    for (let x = x0; x < x1 - 2; x += 2) L.line('green', x, wy(x), x + 2, wy(x + 2), 0.5, 0.5, 0.75 * fade);
  }, 0.35);
}

/** Arrow projectile: a long thin glowing streak. Faces right; origin at the tip. */
function arrowAnim(): FxSheet {
  return anim(26, 7, 24, 3.5, 1, (L) => {
    L.line('cyan', 1, 3.5, 24, 3.5, 0.3, 1.4, 1.2);
    L.line('teal', 8, 3.5, 22, 3.5, 0.2, 2.2, 0.55);
  }, 0.35);
}

/** Double Shot tracer: twin streaks whipping out from the bow across
 *  the range. Faces right; origin at the muzzle; drawn W px long (the shot's
 *  own length), so it is never stretched. */
function tracerAnim(W: number): FxSheet {
  const H = 9, y = 4.5;
  // [tail, head] of each streak per frame, as fractions of W
  const spans: [number, number][] = [[0, 0.45], [0.1, 1], [0.45, 1], [0.75, 1], [0.92, 1]];
  return anim(W, H, 0, y, spans.length, (L, f) => {
    const [a, b] = spans[f], fade = f < 2 ? 1 : 1 - (f - 1) / 4;
    L.line('cyan', 1 + a * (W - 2), y - 1.5, b * (W - 2), y - 1.5, 0.3, 1.1, 1.1 * fade);
    // the second shot trails slightly behind the first
    L.line('teal', 1 + Math.max(0, a - 0.08) * (W - 2), y + 1.5, Math.max(0.1, b - 0.08) * (W - 2), y + 1.5, 0.3, 1.0, 0.95 * fade);
  }, 0.35);
}

/** Piercing Leap: purple spikes rain out of a rift in the sky onto the
 *  ground in front of you, nearest first, each spearing in with a burst
 *  and a puff of dust, then sinking away. Faces right; origin at your feet,
 *  so the spikes land from just ahead of you out to SPIKE_REACH. */
function spikesAnim(): FxSheet {
  const REACH = 72, W = REACH + 16, H = 96, ox = 4, by = H - 4, N = 10;
  const r = rng(91);
  const spikes = Array.from({ length: 8 }, (_, i) => ({
    x: ox + 10 + i * ((REACH - 10) / 7) + (r() * 4 - 2), len: 17 + r() * 8, at: i * 0.45 + r() * 0.3,
  }));
  return anim(W, H, ox, by, N, (L, f) => {
    const R = rng(93 + f), fade = f < N - 3 ? 1 : (N - f) / 3;
    // the rift they fall from, tearing open across the sky
    const open = Math.min(1, (f + 1) / 3);
    L.line('purple', ox + REACH / 2 - (REACH / 2 + 4) * open, 6, ox + REACH / 2 + (REACH / 2 + 4) * open, 6, 1.6, 1.6, 0.9 * fade);
    L.line('pink', ox + REACH / 2 - REACH / 2 * open, 6, ox + REACH / 2 + REACH / 2 * open, 6, 0.6, 0.6, 1.0 * fade);
    for (const s of spikes) {
      const t = f - s.at; // frames since this one dropped
      if (t < 0) continue;
      if (t < 2) { fallingSpike(L, s.x, 8 + (by + 3 - 8) * ((t + 1) / 2) ** 2, s.len, 1); continue; }
      // landed: speared into the ground, sinking as it fades
      const k = t - 2, stuck = Math.max(0, 1 - k / 5);
      if (stuck <= 0) continue;
      L.line('purple', s.x, by + 2, s.x, by + 2 - s.len * 0.8 * stuck, 3.4, 0.4, 1.15 * stuck);
      L.line('pink', s.x, by + 1, s.x, by + 2 - s.len * 0.6 * stuck, 1.2, 0.3, 1.05 * stuck);
      if (k < 2) {
        L.disc(k === 0 ? 'pink' : 'purple', s.x, by - 2, 6 - k * 2, 1.25);
        L.ring('purple', s.x, by, 3 + k * 3, 1.2 + k * 0.6, 0.9, 0.85);
        for (let i = 0; i < 3; i++) L.spark(i ? 'purple' : 'pink', s.x + (R() * 2 - 1) * 6, by - 4 - R() * 12, 1.0, i === 0);
      }
      if (k < 3) for (let i = 0; i < 2; i++) L.disc('dust', s.x + (R() * 2 - 1) * 5, by - R() * 2, 1.4 + R(), 0.8 * (1 - k / 3));
    }
  }, 0.4);
}

/** Tempest: a large oval slash cuts all the way round you, then shots fire
 *  from the oval inward at you, one after another round the ring. Origin at
 *  your feet (the oval is centred on your middle). */
function tempestAnim(front: RampName = 'pink', tail: RampName = 'purple'): FxSheet {
  const RX = 78, RY = 30, W = RX * 2 + 12, H = RY * 2 + 12, cx = W / 2, cy = H / 2, by = cy + 12;
  const n = 10, SHOTS = 12, oval = (a: number, k = 1): [number, number] => [cx + Math.cos(a) * RX * k, cy + Math.sin(a) * RY * k];
  return anim(W, H, cx, by, n, (L, f) => {
    const R = rng(61 + f);
    // the slash: one fast turn round the oval (frames 0-2), a bright leading
    // edge with the cut it leaves behind, which lingers as a ring and fades
    const start = -Math.PI / 2, head = start + Math.min(1, (f + 1) / 3) * Math.PI * 2;
    if (f < 3) {
      arc(L, tail, cx, cy, RX, RY, 2, 0.9, start, head - 0.05);
      arc(L, front, cx, cy, RX, RY, 3.4, 1.3, head - 1.1, head);
      arc(L, front, cx, cy, RX * 0.94, RY * 0.9, 1.4, 0.8, head - 0.8, head - 0.1);
    }
    const ring = f < 3 ? 0 : 1 - (f - 3) / (n - 3);
    if (ring > 0) L.ring(tail, cx, cy, RX, RY, 2, 1.0 * ring);
    // the shots: each leaves its own point on the oval in turn and streaks
    // inward toward you over three frames, a pink head on a purple tail
    for (let i = 0; i < SHOTS; i++) {
      const born = 2 + (i % 6), t = (f - born) / 3;
      if (t < 0 || t > 1) continue;
      const a = -Math.PI / 2 + (i / SHOTS) * Math.PI * 2;
      const [hx, hy] = oval(a, 1 - t * 0.8), [mx, my] = oval(a, 1.1 - t * 0.8), [sx, sy] = oval(a, Math.min(1, 1.35 - t * 0.8));
      L.line(tail, sx, sy, mx, my, 0.4, 1.3, 0.95);
      L.line(front, mx, my, hx, hy, 1.3, 1.6, 1.2);
      L.spark(front, hx, hy, 1.1, true);
    }
    // where the shots meet: a pulse at your middle
    if (f >= 5) L.disc(front, cx, cy, 8 - (f - 5), 1.1 - (f - 5) * 0.15);
    for (let i = 0; i < 4; i++) {
      const [sx, sy] = oval(head - R() * 3);
      L.spark(i % 2 ? tail : front, sx + R() * 4 - 2, sy + R() * 4 - 2, 0.85 * (f < 3 ? 1 : ring), i === 0);
    }
  });
}

/** Cyclone Sweep: a storm of blades whirling round you out to the sweep's
 *  full reach (SPIN_R). Three thick crescents with white-hot leading edges
 *  turn a turn and a half, wind streaks race round with them, a shockwave
 *  ring bursts out to the edge of the reach, and sparks fling off the rim.
 *  Origin at your feet (the whirl is centred on your middle). */
function spinAnim(rp: RampName = 'red', wind: RampName = 'orange'): FxSheet {
  const RX = 44, RY = 34, W = RX * 2 + 10, H = RY * 2 + 10, cx = W / 2, cy = H / 2, MID = 12, N = 8;
  return anim(W, H, cx, cy + MID, N, (L, f) => {
    const R = rng(71 + f), t = f / N, fade = f < 5 ? 1 : 1 - (f - 4) / 4;
    const grow = Math.min(1, (f + 1) / 3); // the whirl flares out to full size over the first frames
    // the blades: each a stack of arcs, thickest and brightest at the front
    for (let b = 0; b < 3; b++) {
      const head = -Math.PI / 2 + t * Math.PI * 3 + b * (Math.PI * 2 / 3);
      const rx = RX * (0.55 + 0.4 * grow), ry = RY * (0.55 + 0.4 * grow);
      for (let k = 0; k < 4; k++) {
        const a1 = head - k * 0.32, kx = 1 - k * 0.07;
        arc(L, k < 2 ? rp : wind, cx, cy, rx * kx, ry * kx, 3.2 - k * 0.6, (1.3 - k * 0.22) * fade, a1 - 0.9 + k * 0.1, a1);
      }
      // the leading edge: a hot streak from the rim inward
      const ex = Math.cos(head), ey = Math.sin(head);
      L.line(rp, cx + ex * rx * 0.45, cy + ey * ry * 0.45, cx + ex * rx, cy + ey * ry, 0.8, 2.4, 1.25 * fade);
    }
    // wind streaks racing round between the blades
    for (let i = 0; i < 6; i++) {
      const a = t * Math.PI * 3.6 + i * 1.05 + R() * 0.3, k = 0.35 + R() * 0.45;
      arc(L, wind, cx, cy, RX * k, RY * k, 1.4, 1.0 * fade, a - 1.0, a);
    }
    // the shockwave: bursts out to the reach, then thins away
    if (f >= 1 && f <= 5) {
      const g = (f - 1) / 4;
      L.ring(rp, cx, cy, RX * (0.7 + 0.3 * g), RY * (0.7 + 0.3 * g), 2.2 - g, 1.1 * (1 - g * 0.7));
    }
    // the eye of the storm
    L.disc(rp, cx, cy, (f < 3 ? 8 : 6) * fade + 1, 1.0 * fade);
    // sparks flung off the rim
    for (let i = 0; i < 8; i++) {
      const a = R() * Math.PI * 2, d = 0.85 + R() * 0.2;
      L.spark(i % 3 ? rp : wind, cx + Math.cos(a) * RX * d, cy + Math.sin(a) * RY * d, 0.95 * fade, i < 3);
    }
  });
}

/** One arm of a spiral from the core outward: `turn` radians of sweep from
 *  angle a0, its radius growing from r0 to r1 (squashed to the body's
 *  height by `tall`), thick and bright at the core, thinning to its tip. */
function spiralArm(L: Light, rp: RampName, cx: number, cy: number, a0: number, turn: number, r0: number, r1: number, tall: number): void {
  const steps = 18;
  const at = (t: number): [number, number] => {
    const a = a0 + t * turn, r = r0 + t * (r1 - r0);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * tall];
  };
  for (let k = 0; k < steps; k++) {
    const t0 = k / steps, t1 = (k + 1) / steps, [x0, y0] = at(t0), [x1, y1] = at(t1);
    L.line(rp, x0, y0, x1, y1, 1.7 - t0 * 1.1, 1.7 - t1 * 1.1, 1.25 - t0 * 0.5);
  }
}

/** Cyclone Sweep's whirl, drawn in place of the archer while the sweep
 *  plays: a body-sized vortex of three spiral arms wound out of a white-hot
 *  core, trailing as they turn round it frame by frame so the spin is in the
 *  art. Origin at the middle (the archer's body middle). */
export const CYCLONE_FRAMES = 8;
function cycloneAnim(): FxSheet {
  const W = 36, H = 40, c = W / 2, m = H / 2, ARMS = 3, TURN = -Math.PI * 1.3, TALL = 1.15;
  return anim(W, H, c, m, CYCLONE_FRAMES, (L, f) => {
    const R = rng(131 + f), spin = (f / CYCLONE_FRAMES) * (Math.PI * 2 / ARMS);
    L.disc('red', c, m, 4.5, 1.3); // the white-hot core
    for (let b = 0; b < ARMS; b++) {
      const a0 = spin + b * (Math.PI * 2 / ARMS);
      spiralArm(L, 'red', c, m, a0, TURN, 2, 15, TALL);
      // the arm's tip flung off as an orange spark
      const tip = a0 + TURN;
      L.spark('orange', c + Math.cos(tip) * 16, m + Math.sin(tip) * 16 * TALL, 0.9, b === 0);
    }
    for (let i = 0; i < 2; i++) { const a = R() * 6.28, d = 6 + R() * 8; L.spark('orange', c + Math.cos(a) * d, m + Math.sin(a) * d * TALL, 0.7); }
  });
}

/** Level up: a gold pillar of light at the player's feet with rings and
 *  rising sparkles. Origin at the feet. */
function levelUpAnim(): FxSheet {
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

/** Rush Toss: a spiral horn of light erupting from the ground, dust at its base. Origin at the base.
 *  `hue`/`rim` colour the horn and its wings (the Meteor Dive's landing is yellow). */
function rushAnim(hue: RampName = 'cyan', rim: RampName = 'teal'): FxSheet {
  const W = 30, H = 52, bx = W / 2, by = H - 4;
  return anim(W, H, bx, by, 8, (L, f) => {
    const R = rng(11 + f);
    if (f === 0) {
      // a pillar of light shoots up first
      L.line(hue, bx, by, bx, 6, 3.5, 1, 0.9);
      L.ring(hue, bx, by, 9, 2.5, 1.5, 0.6);
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
        L.disc(hue, bx + xx + 0.5, yy + 0.5, 0.9, fade * (0.45 + edge * 0.75 * band));
      }
    }
    L.line(hue, bx, top, bx, base, 0.2, 1.1, 1.1 * fade);      // bright spine
    // swept-back "wings" at the hilt
    L.ring(rim, bx - 5, base - 1, 5, 4, 1.2, 0.9 * fade, -0.4, 1.6);
    L.ring(rim, bx + 5, base - 1, 5, 4, 1.2, 0.9 * fade, 1.5, 3.14);
    // dust puffs spreading at the base
    const spread = 4 + f * 2.2, dfade = Math.max(0, 1 - f / 7);
    for (let i = 0; i < 7; i++) {
      const sx = bx + (R() * 2 - 1) * spread, sy = by - R() * 3;
      L.disc('dust', sx, sy, 1.5 + R() * 1.5, 0.9 * dfade);
    }
  }, 0.4);
}

/** Skyward Assault strike: a white-blue crescent swoosh that sweeps and thins. Faces right. */
function swooshAnim(rp: RampName = 'cyan'): FxSheet {
  const W = 30, H = 30, c = W / 2;
  return anim(W, H, c, c, 4, (L, f) => {
    const R = rng(21 + f);
    const fade = 1 - f / 4, a0 = -2.2 + f * 0.35, a1 = 0.6 + f * 0.35;
    L.ring(rp, c - 3, c, 10, 12, 1.8 - f * 0.3, 1.15 * fade, a0, a1);
    L.ring(rp, c - 5, c + 1, 8, 10, 1.0, 0.7 * fade, a0 + 0.3, a1 - 0.2);
    for (let i = 0; i < 3; i++) L.spark(rp, c + R() * 12 - 2, c - 8 + R() * 16, 0.8 * fade);
  });
}

/** A blade of light sweeping round an ellipse: its head at angle `head`,
 *  trailing `trail` radians behind it the way it came (`dir` +1: sweeping
 *  to larger angles, -1: smaller), thickest and brightest at the head, with
 *  a white-hot tip. */
function crescent(L: Light, rp: RampName, wind: RampName, cx: number, cy: number, rx: number, ry: number,
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
function lance(L: Light, rp: RampName, x0: number, y0: number, x1: number, y1: number, w: number, I: number): void {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  L.line(rp, x0, y0, mx, my, 0.2, w, I);
  L.line(rp, mx, my, x1, y1, w, 0.2, I);
}

/** A four-point star glint: long thin rays across and up-down, a hot core. */
function glint(L: Light, rp: RampName, x: number, y: number, h: number, v: number, I: number): void {
  lance(L, rp, x - h, y, x + h, y, 1.6, I);
  lance(L, rp, x, y - v, x, y + v, 1.4, I);
  lance(L, rp, x - v * 0.4, y - v * 0.4, x + v * 0.4, y + v * 0.4, 0.9, I * 0.8);
  lance(L, rp, x - v * 0.4, y + v * 0.4, x + v * 0.4, y - v * 0.4, 0.9, I * 0.8);
  L.disc(rp, x, y, 2.5, 1.3 * I);
}

/** A spray of streaks and dust kicked up off the ground at (x, y), `g` 0..1 as it settles. */
function groundSpray(L: Light, R: () => number, x: number, y: number, g: number, n: number, reach: number): void {
  const I = 1 - g;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.2, l = reach * (0.5 + R() * 0.5) * (0.4 + g * 0.6);
    L.line(i % 2 ? 'sky' : 'cyan', x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 1.0, 0.2, 1.05 * I);
  }
  for (let i = 0; i < n; i++) L.spark('sky', x + (R() * 2 - 1) * reach * 0.8, y - R() * 5, 0.9 * I, i < 2);
}

/** Skyward Assault's leap: a big crescent hooking up from her feet round
 *  the front and over her head, a spray off the ground where she kicked off,
 *  and a wind streak up her path. Faces right; origin at her feet where she left. */
function assaultRiseAnim(): FxSheet {
  const W = 72, H = 128, ox = 24, oy = H - 10, N = 7;
  const cx = ox + 8, cy = oy - 54, rx = 28, ry = 54;
  return anim(W, H, ox, oy, N, (L, f) => {
    const R = rng(151 + f), p = Math.min(1, (f + 1) / 3), fade = f < 4 ? 1 : 1 - (f - 3) / 4;
    // the head sweeps from by her feet round the front to over the top
    crescent(L, 'sky', 'cyan', cx, cy, rx, ry, Math.PI / 2 + 0.2 - p * (Math.PI + 0.3), 0.6 + p * 1.9, -1, fade, 5);
    // her path up: a long lance from the ground
    lance(L, 'cyan', ox, oy, ox + 2, oy - 64 * p, 2.4, 0.9 * fade);
    if (f < 4) groundSpray(L, R, ox, oy, f / 4, 9, 18);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + R() * Math.PI, d = 0.9 + R() * 0.25;
      L.spark('sky', cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 0.9 * fade, i < 2);
    }
  });
}

/** One of Skyward Assault's strikes in the air: lances of light crossing
 *  ahead of her, a big star glint where they meet with a long streak
 *  through it, then a crescent whipping round the glint. Faces right;
 *  origin at the strike point. */
function assaultBangAnim(): FxSheet {
  const W = 96, H = 72, c = 48, m = 36, N = 6;
  return anim(W, H, c, m, N, (L, f) => {
    const R = rng(171 + f), fade = f < 3 ? 1 : 1 - (f - 2) / 4;
    // two lances crossing at the strike, stabbing in from up-back and down-back
    if (f < 3) {
      const k = Math.min(1, (f + 1) / 2);
      lance(L, 'sky', c - 34 * k, m - 24 * k, c + 30 * k, m + 18 * k, 2.6, 1.2);
      lance(L, 'cyan', c - 30 * k, m + 20 * k, c + 28 * k, m - 22 * k, 2.0, 1.0);
    }
    // the bang: a long horizontal streak and a star glint
    if (f >= 1 && f < 4) {
      const g = f === 1 ? 1 : f === 2 ? 0.8 : 0.45;
      lance(L, 'sky', c - 46 * g, m, c + 46 * g, m, 2.4, 1.2 * g);
      glint(L, 'sky', c, m, 16 * g, 12 * g, 1.2);
    }
    // a crescent whipping round the glint
    if (f >= 2) {
      const t = (f - 2) / 3;
      crescent(L, 'sky', 'cyan', c, m, 20, 13, -0.4 + t * 2.4, 1.6, 1, fade, 3);
    }
    for (let i = 0; i < 7; i++) {
      const a = R() * Math.PI * 2, d = 8 + f * 4 + R() * 8;
      L.spark(i % 3 ? 'sky' : 'cyan', c + Math.cos(a) * d * 1.4, m + Math.sin(a) * d, 0.9 * fade, i < 2);
    }
  });
}

/** Skyward Assault's last strike: lances of light driving down and ahead
 *  from her into the ground, a star where they leave her, and a spray of
 *  streaks and dust thrown up where they land, settling. Faces right;
 *  origin on the ground where they land; she is `up` px above, `back` px behind. */
export const DROP_UP = 60, DROP_BACK = 16;
function assaultDropAnim(): FxSheet {
  const W = 84, H = DROP_UP + 32, ox = DROP_BACK + 14, oy = H - 10, N = 8;
  const sx = ox - DROP_BACK, sy = oy - DROP_UP;
  return anim(W, H, ox, oy, N, (L, f) => {
    const R = rng(191 + f), fade = f < 4 ? 1 : 1 - (f - 3) / 5;
    // the lances: a fan from her down into the ground, reaching it by frame 1
    if (f < 4) {
      const k = Math.min(1, (f + 1) / 2), I = f < 2 ? 1.2 : 0.8;
      for (const [dx, w] of [[-8, 1.4], [0, 3], [7, 1.8], [14, 1.2]] as const) {
        lance(L, dx ? 'cyan' : 'sky', sx, sy, sx + (ox + dx - sx) * k, sy + (oy - sy) * k, w, I * fade);
      }
      if (f < 2) glint(L, 'sky', sx, sy, 12, 9, 1.1);
    }
    // the impact: a flash, then the spray settling into dust
    if (f >= 1) {
      const g = (f - 1) / (N - 1);
      if (f < 3) L.disc('sky', ox, oy - 2, 6 - f, 1.3);
      groundSpray(L, R, ox, oy, g, 11, 28);
    }
  });
}

/** A Skyward Assault hit on an enemy: a white flash with a crescent
 *  orbiting it, a spiky star, then the crescent's fading arc and specks. */
function assaultHitAnim(): FxSheet {
  const S = 44, c = S / 2;
  return anim(S, S, c, c, 6, (L, f) => {
    const R = rng(211 + f), fade = f < 2 ? 1 : 1 - (f - 1) / 5;
    if (f < 2) L.disc('sky', c, c, f === 0 ? 7 : 5, 1.35);
    if (f >= 1 && f < 3) {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + f * 0.3, l = (f === 1 ? 17 : 12) * (i % 2 ? 0.55 : 1);
        lance(L, 'sky', c, c, c + Math.cos(a) * l, c + Math.sin(a) * l, 1.6, 1.15);
      }
    }
    crescent(L, 'sky', 'cyan', c, c, 13 + f, 9 + f * 0.6, 2.2 + f * 0.7, 1.4, 1, fade, 2.4);
    for (let i = 0; i < 6; i++) {
      const a = R() * Math.PI * 2, d = 5 + f * 3 + R() * 6;
      L.spark('cyan', c + Math.cos(a) * d, c + Math.sin(a) * d, 0.85 * fade);
    }
  });
}

/** Rising Arrows: a volley of yellow-green arrows raining down onto the target,
 *  spiky gold impacts, a flat green crescent swirl and dust. Origin at the base. */
function rainAnim(): FxSheet {
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

/* Ground rush looks: a looping aura on the archer while she slides, and the
   scuffs it leaves behind. Rush Toss is wind and dust; Electric Blitz is
   the same family, heavier, with lightning crackling round her. Auras face
   right with the origin at her feet, the streaks trailing behind. */
const AURA_W = 60, AURA_H = 36, AURA_X = 40, AURA_Y = AURA_H - 3;
export const RUSH_AURA_FRAMES = 4;

/** Speed lines streaming back from the body, and a bow wave at her feet. */
function rushStreaks(L: Light, f: number, hue: RampName, rim: RampName, heavy: boolean): void {
  const rows = heavy ? [3, 7, 11, 15, 19, 23] : [4, 9, 14, 19];
  rows.forEach((up, i) => {
    const y = AURA_Y - up, len = 14 + ((i * 7 + f * 5) % 4) * 5 + (heavy ? 6 : 0);
    const x0 = AURA_X - 6 - ((i + f) % 2) * 2;
    L.line(hue, x0 - len, y, x0, y, 0.2, heavy ? 1.4 : 1.1, 0.95);
  });
  // the bow wave: a low arc of air pushed ahead of her feet
  L.ring(rim, AURA_X + 4, AURA_Y - 4, 7 + (f % 2), 6, 1.3, 1.0, -1.5, 0.4);
}

function tossRushAnim(): FxSheet {
  return anim(AURA_W, AURA_H, AURA_X, AURA_Y, RUSH_AURA_FRAMES, (L, f) => {
    const R = rng(61 + f);
    rushStreaks(L, f, 'cyan', 'teal', false);
    // dust kicked up behind her heels
    for (let i = 0; i < 4; i++) L.disc('dust', AURA_X - 6 - R() * 16, AURA_Y - R() * 4, 1.5, 0.7);
  }, 0.35);
}

/** A jagged bolt from (x0,y0) to (x1,y1) in `n` kinks, the kinks from `R`. */
function zap(L: Light, R: () => number, hue: RampName, x0: number, y0: number, x1: number, y1: number, n: number, I: number): void {
  let px = x0, py = y0;
  for (let k = 1; k <= n; k++) {
    const t = k / n, j = k < n ? (R() * 2 - 1) * 3 : 0;
    const nx = x0 + (x1 - x0) * t + j, ny = y0 + (y1 - y0) * t + (k < n ? (R() * 2 - 1) * 2 : 0);
    L.line(hue, px, py, nx, ny, 0.8, 0.8, I);
    px = nx; py = ny;
  }
}

function blitzRushAnim(): FxSheet {
  return anim(AURA_W, AURA_H, AURA_X, AURA_Y, RUSH_AURA_FRAMES, (L, f) => {
    const R = rng(71 + f * 13);
    rushStreaks(L, f, 'yellow', 'gold', true);
    // a crackling field round her body, flickering arc by arc
    L.ring('yellow', AURA_X, AURA_Y - 12, 10, 14, 1, 0.55, -Math.PI + f * 0.7, -Math.PI + f * 0.7 + 2.2);
    // lightning: two bolts jumping off her back, one forking to the ground ahead
    for (let k = 0; k < 2; k++) {
      const y0 = AURA_Y - 6 - R() * 16;
      zap(L, R, 'gold', AURA_X - 2, y0, AURA_X - 14 - R() * 10, y0 + (R() * 2 - 1) * 6, 3, 1.15);
    }
    zap(L, R, 'yellow', AURA_X + 4, AURA_Y - 10 - R() * 6, AURA_X + 10 + R() * 6, AURA_Y, 3, 1.2);
    for (let i = 0; i < 3; i++) L.spark('yellow', AURA_X - 4 + R() * 16 - 8, AURA_Y - R() * 24, 1.1, i === 0);
  }, 0.3);
}

/** A scuff left on the ground: Rush Toss dust and a skid line. Origin at the ground. */
function tossTrailAnim(): FxSheet {
  const W = 22, H = 10, bx = 11, by = H - 2;
  return anim(W, H, bx, by, 5, (L, f) => {
    const R = rng(81 + f), fade = 1 - f / 5;
    L.line('teal', bx - 9, by, bx + 3, by, 0.2, 0.9, 0.8 * fade);
    for (let i = 0; i < 3; i++) L.disc('dust', bx - 4 - R() * 6, by - f - R() * 2, 1.6, 0.7 * fade);
  });
}

/** Electric Blitz's scuff: a scorch line that sparks, and a little arc jumping off it. */
function blitzTrailAnim(): FxSheet {
  const W = 22, H = 14, bx = 11, by = H - 2;
  return anim(W, H, bx, by, 5, (L, f) => {
    const R = rng(91 + f * 7), fade = 1 - f / 5;
    L.line('gold', bx - 9, by, bx + 3, by, 0.3, 1.1, 0.9 * fade);
    if (f < 3) zap(L, R, 'yellow', bx - 6 + R() * 6, by, bx - 4 + R() * 6, by - 6 - R() * 4, 2, 1.1 * fade);
    L.spark('yellow', bx - R() * 10, by - 1 - R() * 3, fade);
  });
}

/** Bolt Flurry volley: 4 green bolts in a loose diamond, each a streak with a
 *  brighter head, jostling forward and back so the volley flickers as it
 *  flies. Loops (see drawShot). Faces right; origin at the lead bolt's tip. */
export const FLURRY_FRAMES = 4;
function flurryAnim(): FxSheet {
  const W = 44, H = 19, tip = W - 2, y = H / 2;
  const bolts = [[0, -1], [-9, -6], [-4, 4], [-13, 8]]; // each bolt on its own row, staggered back
  return anim(W, H, tip, y, FLURRY_FRAMES, (L, f) => {
    bolts.forEach(([dx, dy], i) => {
      const x = tip + dx - (((f + i) % FLURRY_FRAMES) - 1.5) * 1.5;
      L.line('green', x - 18, y + dy, x, y + dy, 0.2, 1.4, 1.15);
      L.line('lime', x - 8, y + dy, x - 1, y + dy, 0.3, 2.2, 0.6);
    });
  }, 0.35);
}

/** Bolt Flurry hit: green-white starburst with a long horizontal streak and a fading crescent
 *  (drawn mirrored so the streak points back toward the shooter). */
function stunHitAnim(): FxSheet {
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
function spiritAnim(): FxSheet {
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

/** Downpour, on the archer: an orange burst at the bow with green
 *  motes flung off it. Origin at her middle. */
function volleyFlareAnim(): FxSheet {
  const S = 40, c = S / 2;
  return anim(S, S, c, c, 5, (L, f) => {
    const R = rng(81 + f), fade = 1 - f / 5;
    if (f < 2) L.disc('orange', c, c + 4, 6 - f * 2, 1.2);
    L.ring('orange', c, c + 4, 6 + f * 3, 3 + f * 1.5, 1.2, 0.9 * fade);
    for (let i = 0; i < 6; i++) {
      const a = R() * Math.PI * 2, d = 4 + f * 3 + R() * 4;
      L.spark(i % 2 ? 'green' : 'lime', c + Math.cos(a) * d, c + 4 + Math.sin(a) * d * 0.7, 0.9 * fade, i === 0);
    }
  });
}

/** Downpour's blast: a flat tornado under the archer's feet:
 *  a low, wide whirl of orange rings sweeping out under her, with a
 *  green-shot impact ring. Origin at the top centre (her feet). */
function tornadoAnim(depth: number): FxSheet {
  const W = 84, H = Math.round(depth) + 14, cx = W / 2, top = 4;
  return anim(W, H, cx, top, 8, (L, f) => {
    const R = rng(131 + f), fade = f < 5 ? 1 : 1 - (f - 4) / 4;
    const reach = Math.min(1, (f + 1) / 3) * depth; // it drives down over the first frames
    for (let k = 0; k < 5; k++) {
      const t = k / 4, y = top + t * reach;
      const rx = 34 - t * 16, ry = 4 - t * 1.5; // a wide, flat whirl, tapering a little
      const spin = f * 1.3 + k * 0.55;
      // the whole ring faintly, its front half bright: a whirl, not stacked bars
      L.ring('orange', cx, y, rx, ry, 1.1, 0.45 * fade);
      arc(L, 'orange', cx, y, rx, ry, 1.4, (1.2 - t * 0.3) * fade, spin, spin + 2.4);
      if (k % 3 === 1) arc(L, 'green', cx, y, rx * 0.85, ry, 1.0, 0.9 * fade, spin + 2.8, spin + 4.2);
    }
    if (f >= 2) {
      const by = top + depth, g = (f - 2) / 6;
      L.ring('orange', cx, by, 18 + g * 20, 3 + g * 2, 1.3, 1.0 * (1 - g));
      L.disc('lime', cx, by - 1, 4 - g * 3, 1.1 * (1 - g));
      for (let i = 0; i < 6; i++) L.spark(i % 2 ? 'green' : 'orange', cx + (R() * 2 - 1) * (16 + f * 4), by - R() * 6, 0.9 * fade, i === 0);
    }
  }, 0.4);
}

/** Acrobatics's rush: green streaks shooting up past the archer with
 *  sparkles left behind. Origin at her feet. */
function climbRiseAnim(): FxSheet {
  const W = 24, H = 44, bx = W / 2, by = H - 2;
  const lanes = [-7, 6, -2, 9, -10, 3];
  return anim(W, H, bx, by, 6, (L, f) => {
    const R = rng(151 + f), fade = 1 - f / 6;
    lanes.forEach((dx, i) => {
      const head = by - 6 - ((f * 7 + i * 9) % 34), len = 10 + (i % 3) * 3;
      L.line(i % 2 ? 'green' : 'lime', bx + dx, head + len, bx + dx, head, 0.3, 1.1, 1.0 * fade);
    });
    for (let i = 0; i < 4; i++) L.spark('lime', bx + (R() * 2 - 1) * 10, by - R() * 30, 0.85 * fade, i === 0);
  }, 0.35);
}

/** Meteor Dive windup: three yellow arrows streak along curved paths diagonally
 *  down and forward, leading the dive. Faces right; origin at the player's middle. */
function diveWindupAnim(): FxSheet {
  const W = 56, H = 48, ox = 12, oy = 10, n = 6;
  // each arrow bows up, then sweeps down-right: a quadratic curve start -> end
  const paths = [
    { x0: -10, y0: -8, cx: 14, cy: -10, x1: 34, y1: 30 },
    { x0: -6, y0: 2, cx: 16, cy: 0, x1: 40, y1: 34 },
    { x0: -12, y0: 10, cx: 8, cy: 10, x1: 28, y1: 37 },
  ];
  const at = (p: typeof paths[number], t: number): [number, number] => {
    const u = 1 - t;
    return [ox + u * u * p.x0 + 2 * u * t * p.cx + t * t * p.x1, oy + u * u * p.y0 + 2 * u * t * p.cy + t * t * p.y1];
  };
  return anim(W, H, ox, oy, n, (L, f) => {
    const fade = 1 - f / n;
    paths.forEach((p, i) => {
      const head = Math.min(1, 0.3 + f * 0.16 + i * 0.05), tail = Math.max(0, head - 0.4);
      // the shaft: short tapered segments along the curve, brightest at the head
      const steps = 6;
      for (let k = 0; k < steps; k++) {
        const t0 = tail + (head - tail) * (k / steps), t1 = tail + (head - tail) * ((k + 1) / steps);
        const [ax, ay] = at(p, t0), [bx, by] = at(p, t1);
        L.line('yellow', ax, ay, bx, by, 0.4 + 0.15 * k, 0.55 + 0.15 * k, (0.55 + 0.08 * k) * fade);
      }
      // the arrowhead: two barbs swept back from the tip along the flight line
      const [hx, hy] = at(p, head), [px, py] = at(p, Math.max(0, head - 0.06));
      const dx = hx - px, dy = hy - py, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      for (const side of [-1, 1]) {
        L.line('yellow', hx, hy, hx - ux * 4 - uy * 3 * side, hy - uy * 4 + ux * 3 * side, 1.1, 0.5, 1.05 * fade);
      }
      L.spark('yellow', hx, hy, 0.9 * fade, f < 2);
    });
  }, 0.4);
}

/** Effects that span a distance (muzzle to target): built at runtime for each
 *  length they're drawn at (see fxSized), so they keep their natural
 *  resolution instead of a fixed sheet stretched to fit. Not baked. */
export const FX_SIZED: Record<string, (len: number) => FxSheet> = {
  tracer: (len) => tracerAnim(len),
  galeShot: (len) => galeShotAnim(len),
};

/** Every effect's generator, by name: the authoring source. The game draws
 *  the baked PNG sheets (assets/fx, see fxsheets.ts) and only runs these for
 *  an effect that hasn't been baked yet. */
export const FX_GEN: Record<string, () => FxSheet> = {
  hit: () => hitAnim(false, 'cyan'),
  crit: () => hitAnim(true, 'green'),
  muzzle: () => muzzleAnim(),
  arrow: () => arrowAnim(),
  spikes: () => spikesAnim(),
  tempest: () => tempestAnim(),
  spin: () => spinAnim(),
  cyclone: () => cycloneAnim(),
  levelUp: () => levelUpAnim(),
  rush: () => rushAnim(),
  diveLand: () => rushAnim('yellow', 'gold'),
  swoosh: () => swooshAnim(),
  skySwoosh: () => swooshAnim('sky'),
  // per-skill hit sparks, in each attack's colour
  diveHit: () => hitAnim(false, 'yellow'),
  spikeHit: () => spikeHitAnim(),
  tempestHit: () => hitAnim(false, 'pink'),
  skyHit: () => hitAnim(false, 'sky'),
  spinHit: () => hitAnim(false, 'red'),
  volleyFlare: () => volleyFlareAnim(),
  tornado: () => tornadoAnim(20), // a flat sweeping blast under her, not a tall column
  climbRise: () => climbRiseAnim(),
  diveWindup: () => diveWindupAnim(),
  rain: () => rainAnim(),
  rainHit: () => hitAnim(false, 'gold'),
  flurry: () => flurryAnim(),
  tossRush: () => tossRushAnim(),
  blitzRush: () => blitzRushAnim(),
  tossTrail: () => tossTrailAnim(),
  blitzTrail: () => blitzTrailAnim(),
  stunHit: () => stunHitAnim(),
  spirit: () => spiritAnim(),
  assaultRise: () => assaultRiseAnim(),
  assaultBang: () => assaultBangAnim(),
  assaultDrop: () => assaultDropAnim(),
  assaultHit: () => assaultHitAnim(),
  galeMuzzle: () => galeMuzzleAnim(),
  galeHit: () => hitAnim(false, 'lime'),
};
