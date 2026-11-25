/* ============================================================
   MOB ART
   Each area's enemies, painted from a handful of body plans
   (quadruped, bug, hopper, flier, blob, biped, bloom) with their own
   colours and features. Two frames each: a stride or a wing beat, plus
   a hurt frame (HURT) for hitstun: eyes squeezed shut, mouth open, body
   recoiling, like a MapleStory mob's hit1.
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
/** Frame index of the hurt pose (shown during hitstun instead of the walk cycle). */
export const HURT = 2;

/** An eye: open (sz x sz of the eye colour), or squeezed shut into a dark dash when hurt. */
function eye(p: MobPaint, x: number, y: number, L: Look, hurt: boolean, sz = 1): void {
  if (!hurt) { p(x, y, L.e, sz, sz); return; }
  p(x - (sz > 1 ? 0 : 1), y + sz - 1, OUT, Math.max(2, sz), 1);
  p(x + Math.max(1, sz) - 1, y + sz - 2, OUT); // the outer corner pinched up
}

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
const quad = (feat: { horns?: boolean; ears?: boolean; tail?: boolean; snout?: boolean }): Plan => (p, f0, L) => {
  const hurt = f0 === HURT, f = hurt ? 0 : f0;
  const { w, h } = L, legH = 4, by = Math.round(h * 0.38), bh = h - legH - by + 1, up = f;
  for (const [i, lx] of [3, 6, w - 10, w - 7].entries()) {
    // diagonal pairs step together; hurt, the legs brace apart (back legs back, front legs forward)
    const s = hurt ? (i < 2 ? -1 : 1) : (i % 2 === 0) === (f === 0) ? 0 : 1;
    box(p, lx + s, h - legH - 1, 3, legH + 1, L.d);
  }
  oval(p, 1, by - up, w - 6, bh, L.c);
  p(4, by + bh - 3 - up, L.l, w - 12, 1);
  // hurt: the head jerks back and up
  const hx = w - 8 - (hurt ? 1 : 0), hy = Math.max(4, by - 4) - up - (hurt ? 1 : 0);
  box(p, hx, hy, 7, 6, L.c);
  if (feat.snout) box(p, hx + 5, hy + 2, 3, 3, L.l);
  eye(p, hx + 4, hy + 2, L, hurt);
  if (hurt) p(hx + 5, hy + 4, OUT, 2, 1); // a yelp
  if (feat.horns) { p(hx + 1, hy - 2, L.a, 2, 2); p(hx, hy - 3, L.a, 1, 1); p(hx + 4, hy - 2, L.a, 1, 2); }
  if (feat.ears) { p(hx + 1, hy - 3, OUT, 2, 3); p(hx + 4, hy - 3, OUT, 2, 3); p(hx + 1, hy - 2, L.a, 1, 2); p(hx + 4, hy - 2, L.a, 1, 2); }
  if (feat.tail) { p(0, by - 1 - up + f, L.a, 2, 3); }
};

/** Low and wide on many legs: a shell or carapace with a shine. */
const bug = (feat: { spikes?: boolean }): Plan => (p, f0, L) => {
  const hurt = f0 === HURT, f = hurt ? 0 : f0, { w, h } = L;
  // hurt: the legs splay out flat and the head rears up a pixel
  for (let i = 0; i < 3; i++) {
    const lx = 3 + i * Math.floor((w - 8) / 2) + (hurt ? i - 1 : (i + f) % 2);
    if (hurt) { p(lx, h - 2, OUT, 1, 2); p(lx + (i < 1 ? -1 : 1), h - 1, OUT, 1, 1); }
    else { p(lx, h - 3, OUT, 1, 3); p(lx + 1, h - 1, OUT, 1, 1); }
  }
  oval(p, 0, 1, w - 3, h - 3, L.c);
  p(3, 3, L.l, Math.max(2, Math.floor(w / 3)), 1);
  p(2, h - 5, L.d, w - 7, 1);
  const ry = h - 8 - (hurt ? 1 : 0);
  box(p, w - 5, ry, 5, 5, L.d);
  eye(p, w - 2, ry + 1, L, hurt);
  if (hurt) p(w - 3, ry + 3, OUT, 2, 1);
  if (feat.spikes) for (let x = 3; x < w - 5; x += 3) p(x, 0, L.a, 1, 2);
};

/** Squat, crouched; on the second frame it's mid-hop. Features: long ears, wide mouth. */
const hopper = (feat: { ears?: boolean; mouth?: boolean }): Plan => (p, f0, L) => {
  const hurt = f0 === HURT, f = hurt ? 0 : f0;
  const { w, h } = L, lift = f ? 2 : 0, top = feat.ears ? 7 : 2;
  if (feat.ears) {
    // hurt: the ears fold back flat
    if (hurt) { box(p, w - 11, top - 3, 6, 3, L.c); box(p, w - 10, top - 5, 6, 3, L.c); p(w - 10, top - 2, L.a, 4, 1); }
    else { box(p, w - 8, top - 5 - lift, 3, 6, L.c); box(p, w - 5, top - 5 - lift, 3, 6, L.c); p(w - 7, top - 4 - lift, L.a, 1, 3); p(w - 4, top - 4 - lift, L.a, 1, 3); }
  }
  oval(p, 1, top - lift, w - 2, h - top - 2, L.c);
  oval(p, 3, h - 7 - lift, w - 8, 4, L.l, L.c);
  eye(p, w - 5, top + 2 - lift, L, hurt, 2);
  if (hurt) box(p, w - 6, top + 5, 4, 3, '#5a1a2a'); // mouth wide open
  else if (feat.mouth) p(w - 6, top + 5 - lift, OUT, 5, 1);
  // feet: tucked, or kicked out behind mid-hop (hurt: both braced forward)
  if (hurt) { box(p, 3, h - 3, 5, 3, L.d); box(p, w - 7, h - 3, 5, 3, L.d); }
  else if (f) { box(p, 0, h - 3, 5, 3, L.d); box(p, w - 6, h - 2, 4, 2, L.d); }
  else { box(p, 2, h - 3, 6, 3, L.d); box(p, w - 8, h - 3, 5, 3, L.d); }
};

/** A body between two wings that beat up and down. Features: beak, stripes, antennae, gears. */
const flier = (feat: { beak?: boolean; stripes?: boolean; antennae?: boolean; gear?: boolean }): Plan => (p, f0, L) => {
  // hurt: wings flung up in the V, head knocked back a pixel
  const hurt = f0 === HURT, f = hurt ? 0 : f0;
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
  const hx = cx + 3 - (hurt ? 1 : 0);
  box(p, hx, by - 3, 4, 4, L.c);
  eye(p, hx + 2, by - 2, L, hurt);
  if (feat.beak) { if (hurt) { p(hx + 4, by - 2, L.d, 2, 1); p(hx + 4, by, L.d, 2, 1); } else p(cx + 7, by - 1, L.d, 2, 1); }
  else if (hurt) p(hx + 3, by - 1, OUT, 2, 1);
  if (feat.antennae) { p(cx + 4, by - 6, OUT, 1, 3); p(cx + 6, by - 6, OUT, 1, 3); }
  p(cx - 1, h - 2, OUT, 3, 1); // tail or stinger
};

/** A round floating or oozing body. Features: tentacles, drips, sparkle, hood. */
const blob = (feat: { tentacles?: boolean; drip?: boolean; sparkle?: boolean; hood?: boolean; spots?: boolean }): Plan => (p, f0, L) => {
  // hurt: squashed down a pixel, eyes screwed shut, mouth open
  const hurt = f0 === HURT, f = hurt ? 1 : f0;
  const { w, h } = L, bh = h - (feat.tentacles ? 5 : 2), squash = hurt ? 1 : feat.drip ? f : 0;
  oval(p, 0, squash, w, bh - squash, L.c);
  p(3, 2 + squash, L.l, 3, 2);
  if (feat.spots) { p(w - 6, 3, L.a, 2, 2); p(4, bh - 5, L.a, 2, 1); }
  const ey = Math.floor(bh / 2);
  eye(p, w - 6, ey, L, hurt, 2); eye(p, w - 10, ey, L, hurt, 2);
  if (hurt) p(w - 8, ey + 3, OUT, 2, 2);
  if (feat.hood) { p(1, 0, L.d, w - 2, 2); }
  if (feat.tentacles) for (let i = 0; i < 4; i++) { const x = 2 + i * Math.floor((w - 4) / 4); p(x + ((i + f) % 2), bh, L.d, 1, 4); p(x + ((i + f + 1) % 2), h - 1, L.a); }
  if (feat.drip) { p(2, h - 2, L.d, w - 4, 2); }
  if (feat.sparkle) { const s = f ? 1 : 0; p(w - 2 - s, 0, L.a); p(1 + s, bh - 2, L.a); }
};

/** Upright on two legs. Features: cap (mushroom), helm, key (wind-up), crystal, rocky, glow. */
const biped = (feat: { cap?: boolean; helm?: boolean; key?: boolean; crystal?: boolean; rocky?: boolean; arms?: boolean }): Plan => (p, f0, L) => {
  // hurt: legs braced apart, head knocked back, arms flung up
  const hurt = f0 === HURT, f = hurt ? 0 : f0;
  const { w, h } = L, legH = 4, tx = Math.floor(w * 0.2), tw = w - tx * 2, ty = Math.floor(h * 0.35);
  const spread = hurt ? 1 : 0;
  box(p, tx + 1 + f - spread, h - legH - 1, 3, legH + 1, L.d); box(p, tx + tw - 4 - f + spread, h - legH - 1, 3, legH + 1, L.d);
  if (feat.cap) {
    box(p, tx + 1, ty, tw - 2, h - legH - ty, L.l);
    oval(p, 0, hurt ? 1 : 0, w, ty + 3 - (hurt ? 1 : 0), L.c); p(3, 2, L.a, 2, 2); p(w - 7, 1 + spread, L.a, 2, 2); p(Math.floor(w / 2), 3, L.a, 2, 1);
    eye(p, tx + tw - 5, ty + 3, L, hurt); eye(p, tx + 3, ty + 3, L, hurt);
    if (hurt) p(tx + Math.floor(tw / 2) - 1, ty + 5, OUT, 2, 2);
    return;
  }
  box(p, tx, ty, tw, h - legH - ty, L.c);
  p(tx + 1, ty + 1, L.l, 2, h - legH - ty - 2);
  if (feat.arms) {
    if (hurt) { box(p, tx - 3, ty - 3, 3, 6, L.d); box(p, tx + tw, ty - 3, 3, 6, L.d); }
    else { box(p, tx - 3, ty + 2 + f, 3, 6, L.d); box(p, tx + tw, ty + 2 - f + 1, 3, 6, L.d); }
  }
  const hw = Math.min(tw, 8), hx = tx + Math.floor((tw - hw) / 2) + 1 - spread;
  box(p, hx, ty - 6, hw, 7, feat.helm ? L.d : L.c);
  if (hurt) { eye(p, hx + hw - 3, ty - 4, L, true, 2); p(hx + hw - 3, ty - 1, OUT, 2, 1); }
  else p(hx + hw - 3, ty - 4, L.e, 2, feat.helm ? 1 : 2);
  if (feat.helm) p(hx + 1, ty - 7, L.a, hw - 2, 1);
  if (feat.key) { p(tx - 2, ty + 3, L.a, 2, 1); box(p, tx - 4, ty + 1 + f, 3, 5, L.a); }
  if (feat.crystal) { p(hx + 1, ty - 8, L.a, 2, 2); p(hx + hw - 3, ty - 8, L.a, 2, 2); p(tx + tw - 3, ty + 2, L.a, 2, 3); }
  if (feat.rocky) { p(tx + 3, ty + 3, L.d, 2, 1); p(tx + tw - 4, ty + 6, L.d, 2, 1); p(tx + 2, ty + 8, L.a, 2, 1); }
};

/** A flower on a stem, petals opening and closing. */
const bloom: Plan = (p, f0, L) => {
  // hurt: petals clench shut, the eye squeezes
  const hurt = f0 === HURT, f = hurt ? 0 : f0;
  const { w, h } = L, cx = Math.floor(w / 2);
  p(cx - 1, Math.floor(h / 2), OUT, 3, h - Math.floor(h / 2)); p(cx, Math.floor(h / 2), L.d, 1, h - Math.floor(h / 2));
  box(p, cx - 4, h - 4, 3, 2, L.d); box(p, cx + 2, h - 6, 3, 2, L.d);
  const r = hurt ? 3 : f ? 5 : 4;
  for (const [dx, dy] of [[-r, 0], [r, 0], [0, -r], [0, r - 1]]) oval(p, cx - 2 + dx, 5 + dy, 5, 5, L.c);
  oval(p, cx - 3, 4, 7, 7, L.a);
  eye(p, cx + 1, 6, L, hurt, 2);
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

/** Paint frame `f` of an enemy: 0 or 1 for its walk cycle, HURT for its hit pose. */
export function paintMob(name: string, f: number, p: MobPaint): void {
  const m = MOB_ART[name];
  if (m) m.plan(p, f, m.look);
}

/** An enemy's box (sprite and hitbox). */
export const mobSize = (name: string): { w: number; h: number } => ({ w: MOB_ART[name].look.w, h: MOB_ART[name].look.h });
