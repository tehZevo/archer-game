/* ============================================================
   MOB ART
   Each area's enemies, painted from a handful of body plans
   (quadruped, bug, hopper, flier, blob, biped, bloom) with their own
   colours and features. Two frames each: a stride or a wing beat.
   Facing right (drawMob mirrors them), feet on the bottom row, inside
   a w x h box that is also the enemy's hitbox (config.ts uses mobSize).
   Painters only record rectangles, so they run headless in tests;
   sprites.ts bakes them into canvases.
   ============================================================ */

export type MobPaint = (x: number, y: number, col: string, w?: number, h?: number) => void;

interface Look {
  w: number; h: number;
  /** body, shade, light/belly, eye, accent */
  c: string; d: string; l: string; e: string; a: string;
}
type Plan = (p: MobPaint, f: number, L: Look) => void;
const OUT = '#141018';

/** A filled oval with a 1px outline. */
function oval(p: MobPaint, x0: number, y0: number, w: number, h: number, fill: string, out = OUT): void {
  const cx = x0 + w / 2, cy = y0 + h / 2, rx = w / 2, ry = h / 2;
  for (let y = 0; y < h; y++) {
    const t = (y + 0.5 - h / 2) / ry, half = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
    if (half <= 0) continue;
    p(Math.round(cx - half), y0 + y, out, half * 2, 1);
    if (half > 1) p(Math.round(cx - half) + 1, y0 + y, fill, half * 2 - 2, 1);
  }
  void cy;
}
/** A box with a 1px outline. */
function box(p: MobPaint, x: number, y: number, w: number, h: number, fill: string, out = OUT): void {
  p(x, y, out, w, h); if (w > 2 && h > 2) p(x + 1, y + 1, fill, w - 2, h - 2);
}

/* ---------------- body plans ---------------- */
/** Four legs, a long body and a head up front. Features: horns, ears, tail, mane. */
const quad = (feat: { horns?: boolean; ears?: boolean; tail?: boolean; snout?: boolean }): Plan => (p, f, L) => {
  const { w, h } = L, legH = 4, by = Math.round(h * 0.38), bh = h - legH - by + 1, up = f;
  for (const [i, lx] of [3, 6, w - 10, w - 7].entries()) {
    const s = (i % 2 === 0) === (f === 0) ? 0 : 1; // diagonal pairs step together
    box(p, lx + (s ? 1 : 0), h - legH - 1, 3, legH + 1, L.d);
  }
  oval(p, 1, by - up, w - 6, bh, L.c);
  p(4, by + bh - 3 - up, L.l, w - 12, 1);
  const hx = w - 8, hy = Math.max(4, by - 4) - up;
  box(p, hx, hy, 7, 6, L.c);
  if (feat.snout) box(p, w - 3, hy + 2, 3, 3, L.l);
  p(w - 4, hy + 2, L.e);
  if (feat.horns) { p(hx + 1, hy - 2, L.a, 2, 2); p(hx, hy - 3, L.a, 1, 1); p(hx + 4, hy - 2, L.a, 1, 2); }
  if (feat.ears) { p(hx + 1, hy - 3, OUT, 2, 3); p(hx + 4, hy - 3, OUT, 2, 3); p(hx + 1, hy - 2, L.a, 1, 2); p(hx + 4, hy - 2, L.a, 1, 2); }
  if (feat.tail) { p(0, by - 1 - up + f, L.a, 2, 3); }
};

/** Low and wide on many legs: a shell or carapace with a shine. */
const bug = (feat: { spikes?: boolean }): Plan => (p, f, L) => {
  const { w, h } = L;
  for (let i = 0; i < 3; i++) { const lx = 3 + i * Math.floor((w - 8) / 2) + ((i + f) % 2); p(lx, h - 3, OUT, 1, 3); p(lx + 1, h - 1, OUT, 1, 1); }
  oval(p, 0, 1, w - 3, h - 3, L.c);
  p(3, 3, L.l, Math.max(2, Math.floor(w / 3)), 1);
  p(2, h - 5, L.d, w - 7, 1);
  box(p, w - 5, h - 8, 5, 5, L.d);
  p(w - 2, h - 7, L.e);
  if (feat.spikes) for (let x = 3; x < w - 5; x += 3) p(x, 0, L.a, 1, 2);
};

/** Squat, crouched; on the second frame it's mid-hop. Features: long ears, wide mouth. */
const hopper = (feat: { ears?: boolean; mouth?: boolean }): Plan => (p, f, L) => {
  const { w, h } = L, lift = f ? 2 : 0, top = feat.ears ? 7 : 2;
  if (feat.ears) { box(p, w - 8, top - 5 - lift, 3, 6, L.c); box(p, w - 5, top - 5 - lift, 3, 6, L.c); p(w - 7, top - 4 - lift, L.a, 1, 3); p(w - 4, top - 4 - lift, L.a, 1, 3); }
  oval(p, 1, top - lift, w - 2, h - top - 2, L.c);
  oval(p, 3, h - 7 - lift, w - 8, 4, L.l, L.c);
  p(w - 5, top + 2 - lift, L.e, 2, 2);
  if (feat.mouth) p(w - 6, top + 5 - lift, OUT, 5, 1);
  // feet: tucked, or kicked out behind mid-hop
  if (f) { box(p, 0, h - 3, 5, 3, L.d); box(p, w - 6, h - 2, 4, 2, L.d); }
  else { box(p, 2, h - 3, 6, 3, L.d); box(p, w - 8, h - 3, 5, 3, L.d); }
};

/** A body between two wings that beat up and down. Features: beak, stripes, antennae, gears. */
const flier = (feat: { beak?: boolean; stripes?: boolean; antennae?: boolean; gear?: boolean }): Plan => (p, f, L) => {
  const { w, h } = L, cx = Math.floor(w / 2), by = Math.floor(h / 2) - 2;
  // wings: raised in a V, or swept down
  for (const side of [-1, 1]) {
    for (let i = 0; i < cx - 2; i++) {
      const x = side < 0 ? cx - 3 - i : cx + 2 + i, y = f ? by + 1 + Math.floor(i / 2) : by - Math.floor(i / 1.5);
      p(x, y, OUT, 1, 4); p(x, y + 1, i % 3 === 2 ? L.l : L.a, 1, 2);
    }
  }
  oval(p, cx - 4, by - 1, 9, 7, L.c);
  if (feat.stripes) { p(cx - 2, by, OUT, 1, 5); p(cx + 1, by, OUT, 1, 5); }
  if (feat.gear) { p(cx - 1, by + 1, L.l, 3, 3); p(cx, by + 2, OUT); }
  box(p, cx + 3, by - 3, 4, 4, L.c);
  p(cx + 5, by - 2, L.e);
  if (feat.beak) p(cx + 7, by - 1, L.d, 2, 1);
  if (feat.antennae) { p(cx + 4, by - 6, OUT, 1, 3); p(cx + 6, by - 6, OUT, 1, 3); }
  p(cx - 1, h - 2, OUT, 3, 1); // tail or stinger
};

/** A round floating or oozing body. Features: tentacles, drips, sparkle, hood. */
const blob = (feat: { tentacles?: boolean; drip?: boolean; sparkle?: boolean; hood?: boolean; spots?: boolean }): Plan => (p, f, L) => {
  const { w, h } = L, bh = h - (feat.tentacles ? 5 : 2), squash = feat.drip ? f : 0;
  oval(p, 0, squash, w, bh - squash, L.c);
  p(3, 2 + squash, L.l, 3, 2);
  if (feat.spots) { p(w - 6, 3, L.a, 2, 2); p(4, bh - 5, L.a, 2, 1); }
  p(w - 6, Math.floor(bh / 2), L.e, 2, 2); p(w - 10, Math.floor(bh / 2), L.e, 2, 2);
  if (feat.hood) { p(1, 0, L.d, w - 2, 2); }
  if (feat.tentacles) for (let i = 0; i < 4; i++) { const x = 2 + i * Math.floor((w - 4) / 4); p(x + ((i + f) % 2), bh, L.d, 1, 4); p(x + ((i + f + 1) % 2), h - 1, L.a); }
  if (feat.drip) { p(2, h - 2, L.d, w - 4, 2); }
  if (feat.sparkle) { const s = f ? 1 : 0; p(w - 2 - s, 0, L.a); p(1 + s, bh - 2, L.a); }
};

/** Upright on two legs. Features: cap (mushroom), helm, key (wind-up), crystal, rocky, glow. */
const biped = (feat: { cap?: boolean; helm?: boolean; key?: boolean; crystal?: boolean; rocky?: boolean; arms?: boolean }): Plan => (p, f, L) => {
  const { w, h } = L, legH = 4, tx = Math.floor(w * 0.2), tw = w - tx * 2, ty = Math.floor(h * 0.35);
  box(p, tx + 1 + f, h - legH - 1, 3, legH + 1, L.d); box(p, tx + tw - 4 - f, h - legH - 1, 3, legH + 1, L.d);
  if (feat.cap) {
    box(p, tx + 1, ty, tw - 2, h - legH - ty, L.l);
    oval(p, 0, 0, w, ty + 3, L.c); p(3, 2, L.a, 2, 2); p(w - 7, 1, L.a, 2, 2); p(Math.floor(w / 2), 3, L.a, 2, 1);
    p(tx + tw - 5, ty + 3, L.e); p(tx + 3, ty + 3, L.e);
    return;
  }
  box(p, tx, ty, tw, h - legH - ty, L.c);
  p(tx + 1, ty + 1, L.l, 2, h - legH - ty - 2);
  if (feat.arms) { box(p, tx - 3, ty + 2 + f, 3, 6, L.d); box(p, tx + tw, ty + 2 - f + 1, 3, 6, L.d); }
  const hw = Math.min(tw, 8), hx = tx + Math.floor((tw - hw) / 2) + 1;
  box(p, hx, ty - 6, hw, 7, feat.helm ? L.d : L.c);
  p(hx + hw - 3, ty - 4, L.e, 2, feat.helm ? 1 : 2);
  if (feat.helm) p(hx + 1, ty - 7, L.a, hw - 2, 1);
  if (feat.key) { p(tx - 2, ty + 3, L.a, 2, 1); box(p, tx - 4, ty + 1 + f, 3, 5, L.a); }
  if (feat.crystal) { p(hx + 1, ty - 8, L.a, 2, 2); p(hx + hw - 3, ty - 8, L.a, 2, 2); p(tx + tw - 3, ty + 2, L.a, 2, 3); }
  if (feat.rocky) { p(tx + 3, ty + 3, L.d, 2, 1); p(tx + tw - 4, ty + 6, L.d, 2, 1); p(tx + 2, ty + 8, L.a, 2, 1); }
};

/** A flower on a stem, petals opening and closing. */
const bloom: Plan = (p, f, L) => {
  const { w, h } = L, cx = Math.floor(w / 2);
  p(cx - 1, Math.floor(h / 2), OUT, 3, h - Math.floor(h / 2)); p(cx, Math.floor(h / 2), L.d, 1, h - Math.floor(h / 2));
  box(p, cx - 4, h - 4, 3, 2, L.d); box(p, cx + 2, h - 6, 3, 2, L.d);
  const r = f ? 5 : 4;
  for (const [dx, dy] of [[-r, 0], [r, 0], [0, -r], [0, r - 1]]) oval(p, cx - 2 + dx, 5 + dy, 5, 5, L.c);
  oval(p, cx - 3, 4, 7, 7, L.a);
  p(cx + 1, 6, L.e, 2, 2);
};

/* ---------------- the roster ---------------- */
const L = (w: number, h: number, c: string, d: string, l: string, e: string, a: string): Look => ({ w, h, c, d, l, e, a });

export const MOB_ART: Record<string, { look: Look; plan: Plan }> = {
  // Forest
  Beetle: { look: L(16, 11, '#3a7a4a', '#24402c', '#8ad89a', '#e8f0a0', '#5a9a6a'), plan: bug({}) },
  // Meadow
  Rabbit: { look: L(15, 16, '#f4eee4', '#c8bcac', '#ffffff', '#1a1010', '#f0a0b0'), plan: hopper({ ears: true }) },
  Bee: { look: L(18, 16, '#f0c030', '#2a2010', '#fff0a0', '#1a1010', '#d8ecff'), plan: flier({ stripes: true, antennae: true }) },
  // Riverbank
  Frog: { look: L(16, 11, '#5aa84a', '#3a7a2a', '#e8e0a0', '#101010', '#8ad07a'), plan: hopper({ mouth: true }) },
  Otter: { look: L(22, 14, '#8a5a34', '#6a4024', '#e8d0b0', '#101010', '#6a4024'), plan: quad({ tail: true, snout: true }) },
  // Hills (and the Mountain)
  Goat: { look: L(20, 17, '#e8e4dc', '#8a7a5a', '#ffffff', '#101010', '#b8a888'), plan: quad({ horns: true }) },
  Hawk: { look: L(20, 13, '#8a5a34', '#f0c040', '#e8dcc8', '#101010', '#5a3a20'), plan: flier({ beak: true }) },
  // Cave
  Bat: { look: L(18, 12, '#5a3a6a', '#3a2048', '#8a6a9a', '#ff5050', '#3a2048'), plan: flier({}) },
  'Rock Crawler': { look: L(18, 12, '#6a6878', '#44424e', '#9a98a8', '#ffd070', '#8a8898'), plan: bug({ spikes: true }) },
  // Swamp
  Slime: { look: L(16, 13, '#7ac04a', '#4a8a2a', '#c8f0a0', '#102010', '#a8e070'), plan: blob({ drip: true }) },
  // Mushroom Grotto
  Mushling: { look: L(16, 18, '#b4508a', '#6a4a5a', '#e8dcc8', '#1a1010', '#f8c8e8'), plan: biped({ cap: true }) },
  'Spore Puff': { look: L(14, 14, '#c8a8f0', '#8a6ab8', '#f0e8ff', '#2a1a3a', '#9ff3ea'), plan: blob({ sparkle: true, spots: true }) },
  // Crystal Caverns
  'Crystal Golem': { look: L(18, 24, '#7a6ac8', '#4a3a8a', '#b8a8f0', '#e8f8ff', '#c8f0ff'), plan: biped({ crystal: true, arms: true }) },
  'Shard Bat': { look: L(18, 12, '#5a44b0', '#2a1a6a', '#d8ccff', '#a8e8ff', '#a890f0'), plan: flier({}) },
  // Sunken Ruins
  'Ruin Guardian': { look: L(18, 22, '#5a7a7a', '#3a5a5a', '#8aaaaa', '#7af0e0', '#c8a040'), plan: biped({ helm: true, arms: true }) },
  Jellyfish: { look: L(14, 15, '#e8a0d8', '#b860a8', '#fff0fa', '#5a1a4a', '#f8d0f0'), plan: blob({ tentacles: true }) },
  // Clockwork Spire
  'Windup Soldier': { look: L(20, 20, '#a83a3a', '#6a2a2a', '#e86a5a', '#101010', '#d8b050'), plan: biped({ helm: true, key: true }) },
  'Clockwork Bird': { look: L(20, 13, '#a8803a', '#6a5030', '#e8c870', '#101010', '#c8a050'), plan: flier({ beak: true, gear: true }) },
  // Dreamwood
  'Dream Moth': { look: L(20, 16, '#c8b0e8', '#8a70b0', '#fff0fa', '#1a1030', '#ffc8e8'), plan: flier({ antennae: true }) },
  'Shadow Fox': { look: L(20, 15, '#3a2e4a', '#241a30', '#6a5a8a', '#ffd070', '#8a6ab8'), plan: quad({ ears: true, tail: true, snout: true }) },
  // Mirror Lake
  Reflection: { look: L(12, 22, '#a8c8e8', '#6a8ab0', '#e8f4ff', '#1a2a40', '#ffffff'), plan: biped({}) },
  'Ice Wisp': { look: L(14, 14, '#c8e8ff', '#7ab0e0', '#ffffff', '#1a3a5a', '#e8f8ff'), plan: blob({ sparkle: true }) },
  // Starfall Observatory
  'Star Sprite': { look: L(14, 14, '#fff0a0', '#d8b040', '#ffffff', '#3a2a10', '#ffffff'), plan: blob({ sparkle: true }) },
  'Meteor Golem': { look: L(20, 22, '#6a4a3a', '#3a2a20', '#a87a5a', '#ff8a3a', '#ff6a2a'), plan: biped({ rocky: true, arms: true }) },
  // Void Garden
  'Void Blossom': { look: L(18, 18, '#8a4ad8', '#3a1a5a', '#d8a0ff', '#f0d8ff', '#2a0e4a'), plan: bloom },
  'Null Wraith': { look: L(14, 18, '#2a1a3a', '#120a1a', '#5a3a7a', '#d8a0ff', '#8a4ad8'), plan: blob({ tentacles: true, hood: true }) },
};

/** Paint frame `f` (0 or 1) of an enemy. */
export function paintMob(name: string, f: number, p: MobPaint): void {
  const m = MOB_ART[name];
  if (m) m.plan(p, f, m.look);
}

/** An enemy's box (sprite and hitbox). */
export const mobSize = (name: string): { w: number; h: number } => ({ w: MOB_ART[name].look.w, h: MOB_ART[name].look.h });
