// Procedurally-built pixel-art sprites, painted with 1px blocks into pixel
// grids (so they run headless: the bake writes them to PNG, see
// scripts/bake.ts), and turned into canvases when first drawn.

import { FRAMES, HURT, MOB_ART, mobSize, paintMob } from './mobart';
import { VARIANT_ART } from './variantart';
import { canvasGrid, fillRect, gridCanvas, newGrid, type Grid } from './grid';
import { BAKED_MOBS } from './mobbaked';

/** A sprite's pixels, and its canvas (made on first draw). */
export class Sprite {
  readonly g: Grid;
  private canvas: HTMLCanvasElement | null = null;
  constructor(readonly w: number, readonly h: number, g?: Grid) { this.g = g ?? newGrid(w, h); }
  get c(): HTMLCanvasElement { return (this.canvas ??= gridCanvas(this.g)); }
}

export const make = (w: number, h: number): Sprite => new Sprite(w, h);

export function px(s: Sprite, gx: number, gy: number, col: string, gw = 1, gh = 1): void {
  fillRect(s.g, gx, gy, gw, gh, col);
}

/* Enemy walk cycles take a frame index f (0-3): 0 and 2 are the passing
   poses, 1 and 3 the strides. Each enemy also has a hurt frame for its
   hitstun (eyes squeezed shut, mouth open, recoiling), like a MapleStory
   mob's hit1. */
const SHUT = '#1a1010';

/* Garden Snail: a boxy shell with a squared spiral groove, on a soft blue
   foot; eyes up on stalks. It glides: the stalks sway and the foot ripples. */
const SNAIL_SHELL = [
  '.ooooooooo.',
  'ossssssssSo',
  'osdddddddSo',
  'osSSSSSSdSo',
  'osdddddSdSo',
  'osdSSSdSdSo',
  'osdSdddSdSo',
  'osdSSSSSdSo',
  'osdddddddSo',
  '.ooooooooo.',
];
const SNAIL_HEAD = [
  '..b.b.',
  '..b.b.',
  '.oBBBo',
  'oBwBBo',
  'BBBBBo',
  'BBBBmo',
  'bBBBBo',
  'bBBBo.',
  'bBBBo.',
  'bBBBo.',
];
const snailRows = (f: number): string[] => {
  const sway = f === 1 ? 1 : f === 3 ? -1 : 0, ripple = f % 2;
  const eyes = [...'.'.repeat(17)]; eyes[13 + sway] = 'k'; eyes[15 + sway] = 'k';
  return [
    eyes.join(''),
    ...SNAIL_SHELL.map((r, y) => r + SNAIL_HEAD[y]),
    'oBwBwBwBwBwBBBBBo',
    'o' + Array.from({ length: 15 }, (_, x) => (x % 2 === ripple ? 'b' : 'B')).join('') + 'o',
    '.ooooooooooooooo.',
  ];
};
const SNAIL_PAL = { o: '#14304a', S: '#3f86c4', s: '#7fcaf8', d: '#24568a', B: '#5fb8f0', b: '#3a8ccc', w: '#a8dcfa', k: '#0d1424', m: '#24568a' };
const snailSprite = (f: number): Sprite => grid(snailRows(f), SNAIL_PAL);
/** Hurt: the stalks snap down into the head and the eyes screw shut. */
const snailHurt = (): Sprite => grid(marked(snailRows(0), [
  [13, 0, '.'], [15, 0, '.'], [13, 1, '.'], [15, 1, '.'], [13, 2, '.'], [15, 2, '.'],
  [13, 4, 'k'], [14, 4, 'k'], [15, 4, 'k'], [15, 6, 'k'], [15, 7, 'k'],
]), SNAIL_PAL);

/** A four-legged trotter: on a stride the body lifts 1px and the legs splay. */
function quadruped(s: Sprite, f: number, legs: [number, number], legY: number, legW: number, col: string): number {
  const up = f % 2, lean = f === 1 ? 1 : f === 3 ? -1 : 0;
  px(s, legs[0] - lean, legY - up, col, legW, legW + up);
  px(s, legs[1] + lean, legY - up, col, legW, legW + up);
  return up;
}

function pigSprite(f: number): Sprite {
  const s = make(23, 18);
  const up = quadruped(s, f, [5, 14], 15, 3, '#c56f9f');
  px(s, 3, 4 - up, '#e79ac4', 16, 11);
  px(s, 16, 6 - up, '#d07fae', 5, 6);
  px(s, 19, 7 - up, '#ffffff', 1, 1);
  return s;
}
/** Hurt: legs braced apart, snout tossed up, eye shut, squealing. */
function pigHurt(): Sprite {
  const s = make(23, 18);
  px(s, 4, 15, '#c56f9f', 3, 3); px(s, 15, 15, '#c56f9f', 3, 3);
  px(s, 3, 4, '#e79ac4', 16, 11);
  px(s, 16, 4, '#d07fae', 5, 6);
  px(s, 18, 6, SHUT, 2, 1); px(s, 19, 5, SHUT);
  px(s, 19, 9, SHUT, 2, 2);
  return s;
}

function wispSprite(f: number): Sprite {
  // the flame-tail under it flickers side to side
  const s = make(16, 17), t = [0, -1, 0, 1][f];
  px(s, 6 + t, 14, '#9a6fe0', 4, 1);
  px(s, 7 + t * 2, 15, '#9a6fe0', 2, 1);
  px(s, 7 + t * 3, 16, '#b98cf5', 1, 1);
  px(s, 3, 3, '#b98cf5', 10, 11);
  px(s, 5, 4, f % 2 ? '#e8dcff' : '#d9c2ff', 4, 4);
  px(s, 6, 8, '#1a1030', 2, 2);
  px(s, 10, 8, '#1a1030', 2, 2);
  return s;
}
/** Hurt: squeezed ">  <" eyes, an "o" mouth, its flame tail flared wide. */
function wispHurt(): Sprite {
  const s = make(16, 17);
  px(s, 4, 14, '#9a6fe0', 8, 1);
  px(s, 6, 15, '#9a6fe0', 4, 1);
  px(s, 3, 4, '#b98cf5', 10, 10);
  px(s, 5, 5, '#e8dcff', 4, 3);
  px(s, 5, 8, '#1a1030', 1, 1); px(s, 6, 9, '#1a1030', 1, 1); px(s, 5, 10, '#1a1030', 1, 1);
  px(s, 11, 8, '#1a1030', 1, 1); px(s, 10, 9, '#1a1030', 1, 1); px(s, 11, 10, '#1a1030', 1, 1);
  px(s, 7, 11, '#1a1030', 2, 2);
  return s;
}

function hogSprite(f: number): Sprite {
  const s = make(26, 21);
  const up = quadruped(s, f, [5, 16], 17, 4, '#5a6b80');
  px(s, 3, 4 - up, '#8fa2b8', 19, 13);
  px(s, 3, 4 - up, '#6f8096', 19, 3);
  px(s, 19, 7 - up, '#5a6b80', 5, 6);
  px(s, 22, 8 - up, '#ffffff', 1, 1);
  return s;
}
function hogHurt(): Sprite {
  const s = make(26, 21);
  px(s, 4, 17, '#5a6b80', 4, 4); px(s, 17, 17, '#5a6b80', 4, 4);
  px(s, 3, 4, '#8fa2b8', 19, 13);
  px(s, 3, 4, '#6f8096', 19, 3);
  px(s, 19, 5, '#5a6b80', 5, 6);
  px(s, 21, 7, SHUT, 2, 1); px(s, 22, 6, SHUT);
  px(s, 22, 10, SHUT, 2, 2);
  return s;
}

/** An enemy's walk/flap cycle, how fast it plays, and its hurt pose. */
export interface MobAnim { frames: Sprite[]; fps: number; hurt: Sprite }
const anim = (draw: (f: number) => Sprite, n: number, fps: number, hurt: () => Sprite): MobAnim =>
  ({ frames: Array.from({ length: n }, (_, f) => draw(f)), fps, hurt: hurt() });
/** Cel shading over a mob frame: inside the outline, the pixel just over the
 *  lower outline darkens and the one just under the upper outline lightens,
 *  so every body reads round. (Done on load.) */
export function shade(src: Sprite): Sprite {
  const g = src.g, w = g.w, h = g.h, out = newGrid(w, h);
  out.px.set(g.px);
  const a = (x: number, y: number): number => (x < 0 || y < 0 || x >= w || y >= h ? 0 : g.px[(y * w + x) * 4 + 3]);
  // the outline: opaque pixels touching the outside
  const rim = (x: number, y: number): boolean => !!a(x, y) && (!a(x - 1, y) || !a(x + 1, y) || !a(x, y - 1) || !a(x, y + 1));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!a(x, y) || rim(x, y)) continue;
    const k = rim(x, y + 1) ? -0.22 : rim(x, y - 1) ? 0.16 : 0;
    if (!k) continue;
    const i = (y * w + x) * 4;
    for (let c = 0; c < 3; c++) out.px[i + c] = Math.round(k < 0 ? g.px[i + c] * (1 + k) : g.px[i + c] + (255 - g.px[i + c]) * k);
  }
  return new Sprite(w, h, out);
}
const shadedAnims = new WeakMap<MobAnim, MobAnim>();
const shaded = (a: MobAnim): MobAnim => {
  let s = shadedAnims.get(a);
  if (!s) shadedAnims.set(a, (s = { frames: a.frames.map(shade), fps: a.fps, hurt: shade(a.hurt) }));
  return s;
};

/** A standing enemy's out-breath: frame 0 with its upper half sunk a pixel
 *  onto the lower (made once per animation, so baked sheets get it too). */
const breaths = new WeakMap<MobAnim, Sprite>();
export function breath(a: MobAnim): Sprite {
  let s = breaths.get(a);
  if (s) return s;
  const g = a.frames[0].g, w = g.w, out = newGrid(w, g.h);
  out.px.set(g.px);
  let top = 0;
  while (top < g.h && !Array.from({ length: w }, (_, x) => g.px[(top * w + x) * 4 + 3]).some(Boolean)) top++;
  const mid = top + Math.floor((g.h - top) / 2);
  for (let y = mid; y > top; y--) out.px.copyWithin(y * w * 4, (y - 1) * w * 4, y * w * 4);
  out.px.fill(0, top * w * 4, (top + 1) * w * 4);
  breaths.set(a, (s = new Sprite(w, g.h, out)));
  return s;
}
/** A frame with its upper half leant a pixel: back (dx -1, away from the
 *  facing) or forward (dx 1). */
function lean(src: Sprite, dx: 1 | -1): Sprite {
  const g = src.g, w = g.w, out = newGrid(w, g.h);
  out.px.set(g.px);
  let top = 0;
  while (top < g.h && !Array.from({ length: w }, (_, x) => g.px[(top * w + x) * 4 + 3]).some(Boolean)) top++;
  const mid = top + Math.floor((g.h - top) / 2);
  for (let y = top; y < mid; y++) {
    const row = y * w * 4;
    if (dx < 0) { out.px.copyWithin(row, row + 4, row + w * 4); out.px.fill(0, row + (w - 1) * 4, row + w * 4); }
    else { out.px.copyWithin(row + 4, row, row + (w - 1) * 4); out.px.fill(0, row, row + 4); }
  }
  return new Sprite(w, g.h, out);
}
const leans = new WeakMap<MobAnim, { recoil: Sprite; lunge: Sprite }>();
const leansOf = (a: MobAnim): { recoil: Sprite; lunge: Sprite } => {
  let l = leans.get(a);
  if (!l) leans.set(a, (l = { recoil: lean(a.hurt, -1), lunge: lean(a.frames[0], 1) }));
  return l;
};
/** The flinch's second beat: the hurt pose thrown back, alternating with the hurt pose in hitstun. */
export const recoil = (a: MobAnim): Sprite => leansOf(a).recoil;
/** The strike: frame 0 thrown forward, just as it bumps into you. */
export const lunge = (a: MobAnim): Sprite => leansOf(a).lunge;
/** A glowing warp pad. */
/** A sprite from a character grid: each character is a palette key, '.' is clear. */
function grid(rows: string[], pal: Record<string, string>): Sprite {
  const s = make(rows[0].length, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) px(s, x, y, pal[ch]); }));
  return s;
}

/** A grid sprite with some cells changed: [col, row, char]. */
const marked = (rows: string[], marks: [number, number, string][]): string[] => {
  const g = rows.map((r) => r.split(''));
  for (const [x, y, c] of marks) g[y][x] = c;
  return g.map((r) => r.join(''));
};

/* Beach enemies (facing right, like the others: drawMob mirrors them). */
/** Crab: 4 frames, legs scuttling every frame and claws snapping at half that. */
const crabRows = (f: number): string[] => { const c = f === 1 || f === 2, l = f % 2; return [
  c ? 'o....o......o....o..' : '..oo..........oo....',
  c ? 'oR..Ro......oR..Ro..' : '.oRRo........oRRo...',
  'oRrRRo......oRRrRo..',
  'oRRoRo..wo..oRoRRo..',
  '.oo.oRo.ko.oRo.oo...',
  '.....oRooooooRo.....',
  '....oRRRRRRRRRRo....',
  '...oRRrRRRRRRrRRo...',
  '...oRRRRRRRRRRRRo...',
  '....oDDDDDDDDDDo....',
  '...oDo.oDo.oDo.oDo..',
  ...l ? ['....oDo.oDo.oDo.oDo.', '.....o...o...o...o..'] : ['..oDo..oDo..oDo.oDo.', '..o.....o....o...o..'],
]; };
const CRAB_PAL = { o: '#3a1208', R: '#e8643c', r: '#ff9a6a', D: '#b8401f', w: '#ffffff', k: '#0d1424' };
const crabSprite = (f: number): Sprite => grid(crabRows(f), CRAB_PAL);
/** Hurt: claws thrown up, eye stalks squeezed to dark dashes, mouth open. */
const crabHurt = (): Sprite => grid(marked(crabRows(1), [[8, 3, 'o'], [9, 3, 'o'], [8, 4, 'k'], [9, 4, 'k'], [9, 6, 'k'], [10, 6, 'k']]), CRAB_PAL);

/** Hermit crab: 4 frames, legs every frame, the eye stalk blinking on the last. */
const hermitRows = (f: number): string[] => marked([
  '.....oooooo.......',
  '...ooSSSSSSoo.....',
  '..oSSsssssSSSo....',
  '.oSSsSSSSSsSSo....',
  '.oSsSSoooSSsSSo...',
  'oSSsSo...oSsSSo...',
  'oSSsSo.oooSsSSo.wo',
  'oSSsSSooSSSsSSo.ko',
  'oSSSsSSSSSsSSSooRo',
  '.oSSSsssssSSSoRRRo',
  '.oSSSSSSSSSSSoRrRRo',
  '..ooSSSSSSSSoRRRRo',
  '....oooooooooRRoo.',
  '.....oDo.oDo.oDo..',
  ...f % 2 ? ['......oDo..oDo.oDo', '.......o....o....o'] : ['....oDo..oDo..oDo.', '....o.....o....o..'],
].map((r) => r.padEnd(19, '.')), f === 3 ? [[16, 6, 'o']] : []);
const HERMIT_PAL = { o: '#2a1a10', S: '#e8b48a', s: '#f4d8bc', R: '#d9563a', r: '#ff8a64', D: '#a8402a', w: '#ffffff', k: '#0d1424' };
const hermitSprite = (f: number): Sprite => grid(hermitRows(f), HERMIT_PAL);
/** Hurt: it ducks back toward its shell, eye squeezed shut. */
const hermitHurt = (): Sprite => grid(marked(hermitRows(0), [[16, 6, '.'], [17, 6, '.'], [16, 7, 'o'], [17, 7, 'o'], [17, 8, 'k']]), HERMIT_PAL);

/** Gull: a 4-frame wingbeat, up → level → down → level. */
const GULL_LEVEL = [
  '..................',
  '..................',
  '..................',
  '..................',
  '.......oowwoo.....',
  '.....oowwwwwwkwo..',
  'ogggowwwwwwwwwYYo.',
  '.gggooowwwwwoggo..',
  '........oowwo.oggg',
  '.........oggo.....',
  '..........oo......',
  '..................',
];
const gullRows = (f: number): string[] => f % 2 ? GULL_LEVEL : f ? [
  '..................',
  '..................',
  '........oo........',
  '......oowwoo......',
  '....oowwwwwwkwo...',
  '..oggowwwwwwwwYYo.',
  '.oggo.oowwwwwoggo.',
  'oggo....oowwo.oggo',
  'gg.......oggo...gg',
  '..........oo......',
  '..................',
  '..................',
] : [
  '..................',
  '.gg............gg.',
  '.oggg........gggo.',
  '..oggg..oo..gggo..',
  '...oggoowwooggo...',
  '....oowwwwwwkwo...',
  '.....owwwwwwwwYYo.',
  '......oowwwwwooo..',
  '........oowwo.....',
  '.........oggo.....',
  '..........oo......',
  '..................',
];
const GULL_PAL = { o: '#2a3442', w: '#f4f7fc', g: '#9aa6b8', k: '#0d1424', Y: '#f0c040' };
const gullSprite = (f: number): Sprite => grid(gullRows(f), GULL_PAL);
/** Hurt: wings flung up, eye shut, beak gaping. */
const gullHurt = (): Sprite => grid(marked(gullRows(0), [[11, 4, 'k'], [12, 4, 'k'], [14, 4, 'Y'], [15, 4, 'Y'], [16, 4, 'o'], [14, 5, 'k'], [15, 5, 'k'], [14, 6, 'Y'], [15, 6, 'Y'], [16, 6, 'o']]), GULL_PAL);

/** An enemy from mobart.ts, baked into its FRAMES-step cycle and its hurt pose. */
const artMob = (name: string, fps: number): MobAnim => {
  const { w, h } = mobSize(name);
  const bake = (f: number): Sprite => { const s = make(w, h); paintMob(name, f, (x, y, col, gw = 1, gh = 1) => px(s, x, y, col, gw, gh)); return s; };
  return anim(bake, FRAMES, fps, () => bake(HURT));
};

/* ---------------- enemy sheets ----------------
   Enemies ship as PNG sheets (assets/mobs/<name>.png): the walk/flap
   frames then the hurt pose, in one strip, facing right. They are baked
   from the painters above (npm run bake), which stay as the source and as
   the fallback until a sheet has loaded. The hand-drawn enemies' variants
   (Red Snail, Blue Crab...) are drawn as their own creatures (variantart.ts). */

/** Every base enemy's painter: its frames in order, how fast they play, and its hurt pose. */
export const MOB_GEN: Record<string, () => MobAnim> = {
  'Garden Snail': () => anim(snailSprite, 4, 6, snailHurt),
  'Boar': () => anim(pigSprite, 4, 9, pigHurt),
  'Wisp': () => anim(wispSprite, 4, 8, wispHurt),
  'Iron Hog': () => anim(hogSprite, 4, 7, hogHurt),
  'Enemy Crab': () => anim(crabSprite, 4, 7, crabHurt),
  'Hermit Crab': () => anim(hermitSprite, 4, 5, hermitHurt),
  'Gull': () => anim(gullSprite, 4, 10, gullHurt),
  ...Object.fromEntries(Object.entries(VARIANT_ART).map(([n, v]) =>
    [n, () => anim((f) => grid(v.rows(f), v.pal), 4, v.fps, () => grid(v.hurt(), v.pal))])),
  ...Object.fromEntries(Object.keys(MOB_ART).map((n) => [n, () => artMob(n, MOB_ART[n].look.w > 17 ? 12 : 14)])),
};

/** A baked enemy sheet's PNG (a data URL) and layout: n frames, then the hurt pose. */
export interface BakedMob { src: string; w: number; h: number; n: number; fps: number }

const loaded = new Map<string, MobAnim>();
const generated = new Map<string, MobAnim>();

/** Start decoding every baked enemy sheet (no-op headless). */
export function loadMobSheets(): void {
  if (typeof Image === 'undefined') return;
  for (const [name, s] of Object.entries(BAKED_MOBS)) {
    const img = new Image();
    img.onload = () => {
      const cut = (f: number): Sprite => new Sprite(s.w, s.h, canvasGrid(img, s.w, s.h, f * s.w));
      loaded.set(name, { frames: Array.from({ length: s.n }, (_, f) => cut(f)), fps: s.fps, hurt: cut(s.n) });
    };
    img.src = s.src;
  }
}

/** An enemy's animation: its baked sheet, or its painter's until that loads (undefined: no art). */
export function mobAnim(name: string): MobAnim | undefined {
  const a = rawAnim(name);
  return a && shaded(a);
}
function rawAnim(name: string): MobAnim | undefined {
  const got = loaded.get(name) ?? generated.get(name);
  if (got || !MOB_GEN[name]) return got;
  const a = MOB_GEN[name]();
  generated.set(name, a);
  return a;
}
