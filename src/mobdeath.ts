import { box, eye, OUT, oval, type Feats, type Look, type MobPaint, type PlanKind } from './mobart';

/* ============================================================
   DRAWN DEATHS
   Each enemy dies in drawn frames, painted like its walk cycle from its
   own body plan, colours and features (no rotating or squashing of its
   sprite). Every plan has its own death stories, and features add their
   own beats: a helm flies off, a wind-up key spins out, a mushroom cap
   tumbles away, crystals scatter.
   A painter takes the death's progress t (0..1) and paints in the
   enemy's own box (facing right, feet on row h - 1); it may spill past
   the box (deathsheet.ts pads it).
   ============================================================ */

/** The drawn ways to die, by body plan (an enemy picks one in deaths.ts). */
export type DeathStory =
  | 'legsup' | 'slump'        // quad
  | 'flip' | 'crack'          // bug
  | 'splat' | 'faint'         // hopper
  | 'fold' | 'flutter'        // flier
  | 'deflate' | 'burst' | 'gutter' // blob
  | 'faceplant' | 'crumble'   // biped
  | 'wither'                  // bloom
  | 'retreat' | 'shellbreak'; // shell-dwellers (deathdrawn.ts)

/** Each plan's stories; the first is its default. */
export const PLAN_STORIES: Record<PlanKind, DeathStory[]> = {
  quad: ['legsup', 'slump'], bug: ['flip', 'crack'], hopper: ['splat', 'faint'],
  flier: ['fold', 'flutter'], blob: ['deflate', 'burst', 'gutter'],
  biped: ['faceplant', 'crumble'], bloom: ['wither'],
};

export type DeathPainter = (p: MobPaint, t: number) => void;

/* ---------------- drawing helpers ---------------- */

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
/** Progress through the phase [a, b) of the death. */
const seg = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));
const ease = (k: number): number => 1 - (1 - k) * (1 - k);
const r = Math.round;
/** A beat that flips every 1/16 of the death (twitches, kicks). */
const beat = (t: number): number => Math.floor(t * 16) % 2;

/** Dead eyes: a little X. */
export function xEye(p: MobPaint, x: number, y: number): void {
  p(x - 1, y - 1, OUT); p(x + 1, y - 1, OUT); p(x, y, OUT); p(x - 1, y + 1, OUT); p(x + 1, y + 1, OUT);
}
/** Dizzy stars circling a knocked-out head. */
export function stars(p: MobPaint, cx: number, cy: number, t: number): void {
  for (let i = 0; i < 3; i++) {
    const a = t * 14 + i * 2.1;
    p(r(cx + Math.cos(a) * 5), r(cy + Math.sin(a) * 1.5), '#ffe070');
  }
}
/** A filled oval keeping only the columns [from, to) of it, shifted by dx (half a shell). */
function ovalPart(p: MobPaint, x0: number, y0: number, w: number, h: number, fill: string, from: number, to: number, dx: number): void {
  const rec: [number, number, string, number][] = [];
  oval((x, y, col, gw = 1) => rec.push([x, y, col, gw]), x0, y0, w, h, fill);
  for (const [x, y, col, gw] of rec) {
    const a = Math.max(x, from), b = Math.min(x + gw, to);
    if (b > a) p(a + dx, y, col, b - a, 1);
  }
}
/** A body part tossed off: it arcs up and away, lands at `ground` and rolls to a stop. */
function tossed(t: number, x0: number, y0: number, vx: number, ground: number): { x: number; y: number; rolled: boolean } {
  const T = t * 1.6, y = y0 - 60 * T + 160 * T * T;
  if (y < ground) return { x: r(x0 + vx * T), y: r(y), rolled: false };
  const land = (60 + Math.sqrt(3600 + 640 * (ground - y0))) / 320; // when it hit the ground
  return { x: r(x0 + vx * land + vx * 0.4 * Math.min(0.5, T - land)), y: ground, rolled: true };
}

/* ---------------- quadrupeds ---------------- */

function quadDeath(story: DeathStory, L: Look, f: Feats): DeathPainter {
  const { w, h } = L, bw = w - 6, by = Math.round(h * 0.38), bh = h - 4 - by + 1;
  return (p, t) => {
    if (story === 'slump') {
      // the head sinks, the front legs fold, then the back; it lies down with its chin on the ground
      const a = ease(seg(t, 0, 0.3)), b = ease(seg(t, 0.25, 0.5));
      const front = 4 - r(4 * a), back = 4 - r(4 * b), drop = Math.min(front, back) === 0 ? 4 : 4 - Math.min(front, back);
      for (const [i, lx] of [3, 6, w - 10, w - 7].entries()) {
        const legH = i < 2 ? back : front;
        if (legH > 0) box(p, lx, h - legH - 1, 3, legH + 1, L.d);
        else p(lx, h - 1, L.d, 3, 1); // tucked under
      }
      const y = by + r(drop * (a + b) / 2);
      oval(p, 1, Math.min(h - bh, y), bw, bh, L.c);
      p(4, Math.min(h - bh, y) + bh - 3, L.l, w - 12, 1);
      const hy = Math.min(h - 6, Math.max(4, by - 4) + r(8 * a)), hx = w - 8 + r(a);
      box(p, hx, hy, 7, 6, L.c);
      if (f.snout) box(p, hx + 5, hy + 2, 3, 3, L.l);
      if (t > 0.5) p(hx + 3, hy + 3, OUT, 2, 1); else eye(p, hx + 4, hy + 2, L, a > 0.5);
      if (f.ears) { p(hx + 1, hy - 1, OUT, 3, 1); p(hx + 4, hy - 1, OUT, 3, 1); } // ears laid flat
      if (f.horns) p(hx + 1, hy - 1, L.a, 3, 1);
      if (f.tail) p(0, h - 2, L.a, 2, 1); // the tail drops limp
      if (t > 0.55 && t < 0.85) { const k = seg(t, 0.55, 0.85); p(hx + 9, hy + 1 - r(k * 5), '#e8f0ff'); } // a last breath
      return;
    }
    // legsup: it staggers, keels over and ends on its back, legs in the air
    const a = seg(t, 0, 0.22);
    if (t < 0.22) {
      const legH = 4 - r(2 * a), y = by + (4 - legH);
      for (const lx of [3, 6, w - 10, w - 7]) box(p, lx + (beat(t) ? 1 : 0), h - legH - 1, 3, legH + 1, L.d);
      oval(p, 1, y, bw, bh, L.c);
      const hx = w - 8, hy = Math.max(4, by - 4) + 1 + r(2 * a);
      box(p, hx, hy, 7, 6, L.c);
      eye(p, hx + 4, hy + 2, L, true);
      if (f.snout) box(p, hx + 5, hy + 2, 3, 3, L.l);
      return;
    }
    if (t < 0.34) {
      // mid-fall: low on the ground, legs swinging up behind it
      const gy = h - bh;
      for (const [i, lx] of [3, 6, w - 10, w - 7].entries()) { p(lx - 1, gy - 1 - i % 2, OUT, 2, 2); p(lx, gy - 3 - i % 2, L.d, 2, 2); }
      oval(p, 1, gy, bw, bh, L.c);
      box(p, w - 8, h - 6, 7, 6, L.c);
      xEye(p, w - 4, h - 3);
      return;
    }
    // on its back: belly up, legs stiff and kicking, then still
    const gy = h - bh, kick = t < 0.6 ? beat(t) : 0;
    for (const [i, lx] of [3, 6, w - 10, w - 7].entries()) {
      const legH = 4 + ((i + kick) % 2);
      box(p, lx, gy - legH + 1, 3, legH, L.d);
      p(lx + 1, gy - legH + 1, OUT); // a hoof
    }
    oval(p, 1, gy, bw, bh, L.c);
    p(4, gy + 1, L.l, w - 12, 1); // the pale belly, now on top
    const hx = w - 8, hy = h - 6;
    box(p, hx, hy, 7, 6, L.c);
    xEye(p, hx + 4, hy + 3);
    if (f.snout) { box(p, hx + 5, hy + 1, 3, 3, L.l); p(hx + 6, hy + 2, L.d); }
    p(hx + 7, hy + 4, '#e8708a', 1, 2); // tongue out
    if (f.horns) { p(hx + 7, hy - 1, L.a, 2, 1); p(hx + 7, hy + 5, L.a, 2, 1); }
    if (f.ears) p(hx - 1, h - 2, OUT, 2, 2); // an ear flopped on the ground
    if (f.tail) p(0, h - 1, L.a, 3, 1);
    if (t < 0.75) stars(p, hx + 3, hy - 3, t);
  };
}

/* ---------------- bugs ---------------- */

function bugDeath(story: DeathStory, L: Look, f: Feats): DeathPainter {
  const { w, h } = L, sw = w - 3, sh = h - 3;
  return (p, t) => {
    if (story === 'crack') {
      // legs draw in, the shell settles, a crack runs down it and it splits in two
      const a = seg(t, 0, 0.25), legH = 3 - r(3 * a), sink = r(2 * a);
      for (let i = 0; i < 3 && legH > 0; i++) { const lx = 3 + i * Math.floor((w - 8) / 2); p(lx, h - legH, OUT, 1, legH); }
      const y = 1 + sink, gap = t < 0.55 ? 0 : r(3 * ease(seg(t, 0.55, 0.8))), mid = Math.floor(sw / 2);
      ovalPart(p, 0, y, sw, sh, L.c, 0, mid, -gap);
      ovalPart(p, 0, y, sw, sh, L.c, mid, sw, gap);
      if (!gap) p(3, y + 2, L.l, Math.max(2, Math.floor(w / 3)), 1);
      // the crack, zig-zagging down from the top
      const c = seg(t, 0.25, 0.55), n = r(c * (sh - 1));
      if (!gap) for (let k = 0; k < n; k++) p(mid + (k % 2), y + 1 + k, OUT);
      if (f.spikes) for (let x = 3; x < w - 5; x += 3) p(x + (x < mid ? -gap : gap), y - 1, L.a, 1, 2);
      const hy = h - 6 + sink;
      box(p, w - 5 + gap, hy, 5, 5, L.d);
      if (t > 0.3) xEye(p, w - 2 + gap, hy + 2); else eye(p, w - 2, hy + 1, L, true);
      return;
    }
    // flip: a jolt into the air, down on its back, legs kicking, then curled still
    if (t < 0.25) {
      const lift = r(Math.sin(seg(t, 0, 0.25) * Math.PI) * 5);
      for (let i = 0; i < 3; i++) { const lx = 2 + i * Math.floor((w - 8) / 2) + i; p(lx, h - 2 - lift, OUT, 1, 2); }
      oval(p, 0, 1 - lift, sw, sh, L.c);
      box(p, w - 5, h - 9 - lift, 5, 5, L.d);
      eye(p, w - 2, h - 8 - lift, L, true);
      return;
    }
    const gy = h - sh, curl = t > 0.65, kick = curl ? 0 : beat(t);
    for (let i = 0; i < 3; i++) {
      const lx = 3 + i * Math.floor((w - 8) / 2);
      if (curl) { p(lx, gy - 1, OUT, 2, 1); p(lx + 1, gy - 2, OUT); } // curled up
      else { p(lx + kick, gy - 3, OUT, 1, 3); p(lx + 1 - kick, gy - 3, OUT); }
    }
    oval(p, 0, gy, sw, sh, L.c);
    p(2, gy + 1, L.d, w - 7, 1); // the underside, now on top
    for (let x = 3; x < w - 7; x += 3) p(x, gy + 2, L.l);
    if (f.spikes) for (let x = 3; x < w - 5; x += 3) p(x, h - 1, L.a);
    box(p, w - 5, h - 5, 5, 5, L.d);
    xEye(p, w - 3, h - 3);
  };
}

/* ---------------- hoppers ---------------- */

function hopperDeath(story: DeathStory, L: Look, f: Feats): DeathPainter {
  const { w, h } = L, top = f.ears ? 7 : 2;
  return (p, t) => {
    if (story === 'faint') {
      // wobbles dizzily, then keels over backwards onto its back, feet up
      if (t < 0.3) {
        const dx = beat(t) ? 1 : -1;
        if (f.ears) { box(p, w - 8 + dx, top - 5, 3, 6, L.c); box(p, w - 5 + dx, top - 4, 3, 5, L.c); }
        oval(p, 1 + dx, top, w - 2, h - top - 2, L.c);
        p(w - 5 + dx, top + 2, OUT, 2, 2); p(w - 5 + dx + beat(t), top + 2 + beat(t), '#ffffff'); // a swimming eye
        box(p, 2, h - 3, 6, 3, L.d); box(p, w - 8, h - 3, 5, 3, L.d);
        stars(p, w - 4, top - 2, t);
        return;
      }
      const bh = h - top - 2, gy = h - bh;
      box(p, 3, gy - 3, 4, 4, L.d); box(p, w - 8, gy - 3, 4, 4, L.d); // feet in the air
      oval(p, 1, gy, w - 2, bh, L.c);
      oval(p, 3, gy + 1, w - 8, 4, L.l, L.c); // the belly, on top now
      if (f.ears) { p(w - 1, h - 3, L.c, 5, 2); p(w, h - 3, L.a, 3, 1); } // ears flopped on the ground
      xEye(p, w - 4, h - 4);
      if (f.mouth) p(w - 2, h - 2, '#e8708a', 2, 1);
      if (t < 0.7) stars(p, w - 3, gy - 3, t);
      return;
    }
    // splat: a desperate leap, and a flat landing
    if (t < 0.5) {
      const k = seg(t, 0.08, 0.5), lift = t < 0.08 ? -1 : r(Math.sin(k * Math.PI) * 12);
      const y = top - lift;
      if (f.ears) { box(p, w - 8, y - 6, 3, 6, L.c); box(p, w - 5, y - 6, 3, 6, L.c); }
      oval(p, 1, y, w - 2, h - top - 2, L.c);
      p(w - 5, y + 2, '#ffffff', 2, 2); p(w - 4, y + 3, OUT); // eyes wide
      box(p, w - 6, y + 5, 3, 3, '#5a1a2a'); // mouth open
      box(p, -2, y + 5, 4, 3, L.d); box(p, w - 1, y + 6, 4, 3, L.d); // limbs splayed
      return;
    }
    const k = seg(t, 0.5, 0.56), fh = k < 1 ? 3 : 5, fw = w + 4; // squashes flat, then settles
    box(p, -6, h - 2, 5, 2, L.d); box(p, w + 1, h - 2, 5, 2, L.d); // feet flat out
    oval(p, -2, h - fh, fw, fh, L.c);
    p(1, h - fh + 1, L.l, fw - 8, 1);
    if (f.ears) { p(-5, h - 3, L.c, 4, 1); p(-5, h - 4, L.a, 3, 1); }
    xEye(p, w - 4, h - fh - 1);
    xEye(p, w - 8, h - fh - 1);
    if (f.mouth) p(w + 1, h - 3, '#e8708a', 3, 1); // tongue out
  };
}

/* ---------------- fliers ---------------- */

function flierDeath(story: DeathStory, L: Look, f: Feats): DeathPainter {
  const { w, h } = L, cx = Math.floor(w / 2), by0 = Math.floor(h / 2) - 2, gy = h - 5;
  return (p, t) => {
    const head = (hx: number, hy: number, dead: boolean): void => {
      box(p, hx, hy, 4, 4, L.c);
      if (dead) xEye(p, hx + 2, hy + 1); else eye(p, hx + 2, hy + 1, L, true);
      if (f.beak) { p(hx + 4, hy + 1, L.d, 2, 1); if (dead) p(hx + 4, hy + 3, L.d, 2, 1); }
      if (f.antennae) { p(hx + 1, hy - 2, OUT, 1, 2); p(hx + 3, hy - 1, OUT, 2, 1); } // drooping
    };
    if (story === 'flutter') {
      // wings go limp and it flutters down, swaying, to lie with its wings spread flat
      const k = ease(seg(t, 0, 0.55)), by = r(by0 + (gy - 2 - by0) * k), sway = t < 0.55 ? r(Math.sin(t * 22) * 2) : 0;
      if (t < 0.55) {
        for (const side of [-1, 1]) for (let i = 0; i < cx - 3; i++) {
          const x = (side < 0 ? cx - 3 - i : cx + 2 + i) + sway, y = by + 1 + Math.floor(i * 0.9);
          p(x, y, OUT, 1, 3); p(x, y + 1, L.a, 1, 1);
        }
        oval(p, cx - 4 + sway, by - 1, 9, 7, L.c);
        head(cx + 3 + sway, by - 3, false);
      } else {
        for (let i = 0; i < cx; i++) { p(cx - 4 - i, h - 2, OUT, 1, 2); p(cx - 4 - i, h - 2, i % 3 === 2 ? L.l : L.a); p(cx + 4 + i, h - 2, OUT, 1, 2); p(cx + 4 + i, h - 2, i % 3 === 2 ? L.l : L.a); }
        oval(p, cx - 4, h - 6, 9, 6, L.c);
        if (f.stripes) { p(cx - 2, h - 5, OUT, 1, 4); p(cx + 1, h - 5, OUT, 1, 4); }
        head(cx + 4, h - 5, true);
      }
      return;
    }
    // fold: wings snap shut and it drops, landing on its side with a wing draped over
    if (t < 0.15) {
      for (const side of [-1, 1]) for (let i = 0; i < cx - 2; i++) {
        const x = side < 0 ? cx - 3 - i : cx + 2 + i, y = by0 - Math.floor(i / 1.2);
        p(x, y, OUT, 1, 3); p(x, y + 1, L.a, 1, 1);
      }
      oval(p, cx - 4, by0 - 1, 9, 7, L.c);
      head(cx + 2, by0 - 4, false);
      return;
    }
    const k = seg(t, 0.15, 0.4), by = r(by0 + (gy - by0) * k * k);
    if (t < 0.4) {
      oval(p, cx - 4, by - 1, 9, 7, L.c);
      p(cx - 5, by, OUT, 7, 1); p(cx - 4, by + 1, L.a, 6, 2); // wings folded along its back
      head(cx + 3, by - 2, false);
      return;
    }
    const bounce = t < 0.46 ? 1 : 0;
    oval(p, cx - 5, h - 6 - bounce, 10, 6, L.c);
    if (f.stripes) { p(cx - 2, h - 5, OUT, 1, 4); p(cx + 1, h - 5, OUT, 1, 4); }
    if (f.gear) { p(cx - 1, h - 4, L.l, 3, 3); p(cx, h - 3, OUT); }
    for (let i = 0; i < cx - 1; i++) { p(cx - 6 - i, h - 2, OUT, 1, 2); p(cx - 6 - i, h - 2, i % 3 === 2 ? L.l : L.a); } // one wing out flat
    p(cx - 3, h - 8, OUT, 5, 1); p(cx - 2, h - 7, L.a, 3, 1); // the other draped over it
    head(cx + 4, h - 5 - bounce, true);
    p(cx - 6, h - 4, OUT, 2, 1); // tail
  };
}

/* ---------------- blobs ---------------- */

function blobDeath(story: DeathStory, L: Look, f: Feats): DeathPainter {
  const { w, h } = L, bh = h - (f.tentacles ? 5 : 2);
  const face = (y: number, x0: number, dead: boolean, gap = 4): void => {
    if (dead) { xEye(p0!, x0 + gap, y); xEye(p0!, x0, y); } else { eye(p0!, x0 + gap, y, L, true, 2); eye(p0!, x0, y, L, true, 2); }
  };
  let p0: MobPaint | null = null;
  return (p, t) => {
    p0 = p;
    if (story === 'burst') {
      // it swells up, light cracks through it, and it bursts into splats
      if (t < 0.42) {
        const s = r(3 * ease(seg(t, 0, 0.42)));
        oval(p, -s, -2 * s, w + 2 * s, bh + 2 * s, L.c);
        p(3 - s, 2 - s, L.l, 3, 2);
        face(Math.floor(bh / 2) - s, w - 10, false);
        if (t > 0.25) { p(2 - s, bh / 2 | 0, L.l, 3, 1); p(w - 4 + s, 3 - s, L.l, 1, 3); p(w / 2 | 0, -s, L.l, 1, 2); } // light cracks
        return;
      }
      const k = seg(t, 0.42, 1);
      if (k < 0.12) { // the flash
        const c = w / 2 | 0, m = bh / 2 | 0;
        p(c - 6, m, '#ffffff', 13, 1); p(c, m - 6, '#ffffff', 1, 13); p(c - 2, m - 2, '#ffffff', 5, 5);
      }
      for (let i = 0; i < 7; i++) { // gobs flung out, landing as splats
        const a = -Math.PI * (0.1 + 0.8 * (i / 6)), v = 30 + (i % 3) * 12, T = k * 0.8;
        const x = r(w / 2 + Math.cos(a) * v * T), y = r(bh / 2 + Math.sin(a) * v * T + 120 * T * T);
        if (y >= h - 1) p(x - 1, h - 1, L.c, 3, 1); else oval(p, x - 1, y - 1, 3, 3, L.c);
      }
      p(w / 2 - 3 | 0, h - 1, L.d, 7, 1);
      return;
    }
    if (story === 'gutter') {
      // a flame guttering out: it dwindles to an ember, eyes closing, and a curl of smoke rises
      const k = seg(t, 0, 0.75), hh = Math.max(2, r(bh * (1 - k))), ww = Math.max(3, r(w * (1 - k * 0.7)));
      const x0 = r((w - ww) / 2);
      oval(p, x0, h - 2 - hh, ww, hh, k < 0.6 ? L.c : L.d);
      if (hh > 5) { p(x0 + 2, h - 1 - hh, L.l, 2, 2); face(h - 2 - r(hh / 2), x0 + ww - 8, false, 3); }
      p(r(w / 2) - 1 + (beat(t) ? 1 : 0), h - 2, L.a, 2, 1); // the last flicker underneath
      if (t > 0.45) for (let i = 0; i < 4; i++) { // smoke curling up
        const s = seg(t, 0.45 + i * 0.06, 1);
        if (s > 0 && s < 1) p(r(w / 2 + Math.sin(s * 6 + i) * 2), r(h - 4 - s * 18), '#8a8aa0');
      }
      return;
    }
    // deflate: it sags, wider and lower each frame, eyes gone to X, down to a puddle that bubbles and shrinks
    const k = seg(t, 0.05, 0.7), hh = Math.max(3, r(bh * (1 - k * 0.8))), ww = r(w + 6 * k), x0 = r(-3 * k);
    const shrink = r(4 * seg(t, 0.75, 1));
    if (f.tentacles) for (let i = 0; i < 4; i++) p(x0 - 2 + i * (ww + 4) / 3 | 0, h - 1, L.d, 2, 1); // limp on the ground
    oval(p, x0 + shrink, h - hh - (f.tentacles ? 1 : 0), ww - 2 * shrink, hh, L.c);
    if (hh > 3) p(x0 + 3, h - hh + 1, L.l, 3, 1);
    if (f.hood) p(x0 + 1 + shrink, h - hh - 1, L.d, ww - 2 - 2 * shrink, 2);
    if (hh > 4) face(h - Math.max(3, hh - 2), r(w / 2), t > 0.2); else if (t < 0.75) { xEye(p, r(w / 2) + 3, h - 3); xEye(p, r(w / 2) - 2, h - 3); }
    for (let i = 0; i < 2; i++) { // bubbles rising from the puddle and popping
      const s = seg(t, 0.55 + i * 0.15, 0.75 + i * 0.15);
      if (s > 0 && s < 1) { const bx = r(w * (0.3 + i * 0.4)), y = r(h - 4 - s * 6); if (s < 0.8) { p(bx, y, L.l); p(bx - 1, y + 1, L.l); p(bx + 1, y + 1, L.l); } else p(bx, y, '#ffffff'); }
    }
    if (f.sparkle && t < 0.5) p(w - 2, r(h - hh - 2), L.a);
  };
}

/* ---------------- bipeds ---------------- */

function bipedDeath(story: DeathStory, L: Look, f: Feats): DeathPainter {
  const { w, h } = L, legH = 4, tx = Math.floor(w * 0.2), tw = w - tx * 2, ty = Math.floor(h * 0.35), th = h - legH - ty;
  const hw = Math.min(tw, 8);
  /** Whatever flies off it as it goes down: the helm, the key, the cap, its crystals. */
  const flyOff = (p: MobPaint, t: number): void => {
    const k = seg(t, 0.2, 1);
    if (k <= 0) return;
    if (f.helm) { const a = tossed(k, tx + 1, ty - 7, 30, h - 2); p(a.x, a.y, L.a, hw - 2, 1); p(a.x, a.y + 1, L.d, hw - 2, 1); }
    if (f.key) { // spins as it flies: flat, then upright, then flat
      const a = tossed(k, tx - 4, ty + 1, -26, h - 2), up = !a.rolled && beat(t);
      if (up) { p(a.x + 1, a.y - 2, L.a, 1, 5); p(a.x, a.y - 3, L.a, 3, 2); } else { p(a.x - 2, a.y, L.a, 5, 1); p(a.x - 3, a.y - 1, L.a, 2, 3); }
    }
    if (f.crystal) for (let i = 0; i < 3; i++) { const a = tossed(k, tx + 2 + i * 3, ty - 8, (i - 1) * 24, h - 2); p(a.x, a.y, L.a, 2, 2); }
  };
  return (p, t) => {
    if (story === 'crumble') {
      // cracks spread through it, then it falls apart into a heap of blocks, head on top, eye going dark
      if (t < 0.35) {
        box(p, tx + 1, h - legH - 1, 3, legH + 1, L.d); box(p, tx + tw - 4, h - legH - 1, 3, legH + 1, L.d);
        box(p, tx, ty, tw, th, L.c);
        if (f.arms) { box(p, tx - 3, ty + 3, 3, 6, L.d); box(p, tx + tw, ty + 3, 3, 6, L.d); }
        const hx = tx + Math.floor((tw - hw) / 2) + 1;
        box(p, hx, ty - 6, hw, 7, f.helm ? L.d : L.c);
        p(hx + hw - 3, ty - 4, L.e, 2, 2);
        const n = r(seg(t, 0, 0.35) * 8); // the cracks, growing
        for (let k = 0; k < n; k++) { p(tx + 2 + (k % 3), ty + 1 + k, OUT); p(tx + tw - 3 - (k % 2), ty + th - 2 - k, OUT); }
        return;
      }
      const k = seg(t, 0.35, 0.7), cw = Math.ceil(tw / 2), ch = Math.ceil(th / 2);
      const chunks: [number, number, number][] = [[tx - 2, 0, 0], [tx + cw + 2, 0, 1], [tx - 1, 1, 2], [tx + cw + 1, 1, 3]];
      for (const [x, row, i] of chunks) { // each block drops to the heap
        const from = ty + row * ch, to = h - ch * (row === 0 ? 1 : 2) + (row === 0 ? 0 : ch) - (i % 2);
        const y = r(from + (Math.max(from, h - ch - (i < 2 ? ch : 0)) - from) * k * k);
        box(p, x + (i % 2 ? r(2 * k) : -r(2 * k)), Math.min(y, h - ch), cw, ch, i % 2 ? L.d : L.c);
        void to;
      }
      if (f.rocky || f.crystal) { p(tx + 1, h - 2, L.a, 2, 1); p(tx + tw - 2, h - ch - 1, L.a, 2, 1); }
      const hx = tx + Math.floor((tw - hw) / 2) + 1, hy = r(ty - 6 + (h - ch - 7 - (ty - 6)) * k * k);
      box(p, hx, Math.min(hy, h - ch - 6), hw, 7, f.helm ? L.d : L.c);
      p(hx + hw - 3, Math.min(hy, h - ch - 6) + 2, t > 0.75 ? OUT : L.e, 2, 2); // the eye light goes out
      flyOff(p, t);
      return;
    }
    // faceplant: knees buckle, it sways, and falls flat on its face; whatever it wears flies off
    if (t < 0.25) {
      const a = seg(t, 0, 0.25), lh = legH - r(2 * a), drop = legH - lh;
      box(p, tx + 1 - r(a), h - lh - 1, 3, lh + 1, L.d); box(p, tx + tw - 4 + r(a), h - lh - 1, 3, lh + 1, L.d);
      if (f.cap) {
        box(p, tx + 1, ty + drop, tw - 2, h - legH - ty, L.l);
        oval(p, 0, drop + r(a), w, ty + 3, L.c);
        eye(p, tx + tw - 5, ty + 3 + drop, L, true); eye(p, tx + 3, ty + 3 + drop, L, true);
        return;
      }
      box(p, tx, ty + drop, tw, th, L.c);
      if (f.arms) { box(p, tx - 3, ty + 4 + drop, 3, 6, L.d); box(p, tx + tw, ty + 4 + drop, 3, 6, L.d); }
      const hx = tx + Math.floor((tw - hw) / 2) + 1 + r(a);
      box(p, hx, ty - 6 + drop + r(a), hw, 7, f.helm ? L.d : L.c);
      eye(p, hx + hw - 3, ty - 4 + drop + r(a), L, true, 2);
      if (f.key) box(p, tx - 4, ty + 1 + drop, 3, 5, L.a);
      return;
    }
    if (t < 0.38) {
      // on its knees, toppling forward: legs folded under, body pitched low, head out front
      const lean = r(3 * seg(t, 0.25, 0.38));
      box(p, tx, h - 3, 6, 3, L.d); box(p, tx + tw - 5, h - 3, 6, 3, L.d);
      if (f.cap) {
        box(p, tx + 1 + lean, h - th - 2, tw - 2, th, L.l);
        oval(p, lean + 2, h - th - 7, w, ty + 3, L.c);
        return;
      }
      box(p, tx + lean, h - th - 2, tw, th, L.c);
      if (f.arms) { box(p, tx + tw + lean - 1, h - 7, 6, 3, L.d); box(p, tx - 3 + lean, h - 8, 3, 6, L.d); }
      box(p, tx + tw - 2 + lean * 2, h - th - 4, hw, 7, f.helm ? L.d : L.c);
      eye(p, tx + tw + hw - 5 + lean * 2, h - th - 2, L, true, 2);
      return;
    }
    // flat on its face: legs trailing behind, body along the ground, head at the front
    const bounce = t < 0.43 ? 1 : 0, len = th + 2, lh = Math.min(7, tw - 2), gy = h - lh - bounce, bx = tx - 3;
    box(p, bx - legH - 2, h - 3, legH + 3, 3, L.d); box(p, bx - legH - 1, h - 5 + (beat(t) && t < 0.6 ? 1 : 0), legH + 3, 3, L.d);
    if (f.cap) {
      box(p, bx, h - 5, len, 5, L.l); // the stem, fallen
      const cap = tossed(seg(t, 0.38, 1), bx + len - 4, h - 12, 12, h - 8); // the cap tumbles off and rocks on the ground
      oval(p, cap.x, cap.y + (cap.rolled && beat(t) && t < 0.8 ? 1 : 0), w - 4, 8, L.c);
      p(cap.x + 3, cap.y + 1, L.a, 2, 2); p(cap.x + w - 9, cap.y + 2, L.a, 2, 1);
      xEye(p, bx + len - 3, h - 3);
      return;
    }
    box(p, bx, gy, len, lh, L.c);
    p(bx + 1, gy + 1, L.l, len - 2, 1);
    if (f.rocky) { p(bx + 3, gy + 2, L.d, 1, 2); p(bx + len - 4, gy + 3, L.d, 1, 2); }
    if (f.arms) { box(p, bx + 3, h - 3, 6, 3, L.d); box(p, bx + len - 1, h - 3, 7, 3, L.d); } // arms out flat
    const hh = Math.min(hw, 7);
    box(p, bx + len - 1, h - hh - bounce, 7, hh, f.helm && seg(t, 0.2, 1) <= 0 ? L.d : L.c); // the head, face down
    p(bx + len + 2, h - hh + 1 - bounce, OUT, 2, 1); // a shut eye
    if (!f.helm) p(bx + len + 5, h - 3, OUT, 1, 2); // the mouth squashed on the ground
    flyOff(p, t);
  };
}

/* ---------------- blooms ---------------- */

function bloomDeath(_story: DeathStory, L: Look): DeathPainter {
  const { w, h } = L, cx = Math.floor(w / 2), stemTop = Math.floor(h / 2);
  const petals: [number, number][] = [[-4, 0], [4, 0], [0, -4], [0, 3]];
  return (p, t) => {
    // petals drop one by one, the stem bows over, and the head sinks to the ground
    const bend = ease(seg(t, 0.35, 0.85)), sh = h - stemTop;
    let topX = cx, topY = stemTop;
    for (let y = 0; y < sh; y++) {
      const k = 1 - y / sh, x = cx + r(bend * 8 * k * k), yy = r(stemTop + y + bend * k * k * (sh - 3));
      p(x - 1, yy, OUT, 3, 1); p(x, yy, L.d, 1, 1);
      if (y === 0) { topX = x; topY = yy; }
    }
    box(p, cx - 4, h - 4, 3, 2, L.d); box(p, cx + 2, h - 5 + r(bend), 3, 2, L.d);
    petals.forEach(([dx, dy], i) => {
      const go = 0.08 + i * 0.12, k = seg(t, go, go + 0.4);
      if (k <= 0) { oval(p, topX - 2 + dx, topY - 5 + dy, 5, 5, L.c); return; }
      // a falling petal: drifts down swaying and settles flat
      const x = r(topX - 2 + dx + Math.sin(k * 9 + i) * 3), y = r(topY - 5 + dy + (h - 2 - (topY - 5 + dy)) * k);
      if (k < 1) oval(p, x, y, 4, 3, L.c); else p(x, h - 1, L.c, 4, 1);
    });
    oval(p, topX - 3, topY - 6, 7, 7, L.a);
    if (t < 0.3) eye(p, topX + 1, topY - 4, L, true, 2); else xEye(p, topX + 1, topY - 3);
  };
}

/** The painter for an enemy dying by `story`, from its body plan (the plan's
 *  default story if this one isn't one of its own). */
export function planDeath(kind: PlanKind, story: DeathStory, L: Look, f: Feats): DeathPainter {
  const s = PLAN_STORIES[kind].includes(story) ? story : PLAN_STORIES[kind][0];
  switch (kind) {
    case 'quad': return quadDeath(s, L, f);
    case 'bug': return bugDeath(s, L, f);
    case 'hopper': return hopperDeath(s, L, f);
    case 'flier': return flierDeath(s, L, f);
    case 'blob': return blobDeath(s, L, f);
    case 'biped': return bipedDeath(s, L, f);
    case 'bloom': return bloomDeath(s, L);
  }
}
