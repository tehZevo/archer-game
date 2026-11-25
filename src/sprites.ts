// Procedurally-built pixel-art sprites. Each sprite is a tiny canvas drawn with
// 1px blocks; the base-resolution canvas + image-rendering:pixelated keeps them
// crisp. Built once at boot, drawn with drawImage.

import { HURT, MOB_ART, RECOLOR, mobSize, paintMob } from './mobart';

export interface Sprite {
  c: HTMLCanvasElement;
  x: CanvasRenderingContext2D;
  w: number;
  h: number;
}

export function make(w: number, h: number): Sprite {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  x.imageSmoothingEnabled = false;
  return { c, x, w, h };
}

export function px(s: Sprite, gx: number, gy: number, col: string, gw = 1, gh = 1): void {
  s.x.fillStyle = col;
  s.x.fillRect(gx, gy, gw, gh);
}

/* Enemy walk cycles take a frame index f (0-3): 0 and 2 are the passing
   poses, 1 and 3 the strides. Each enemy also has a hurt frame for its
   hitstun (eyes squeezed shut, mouth open, recoiling), like a MapleStory
   mob's hit1. */
const SHUT = '#1a1010';

function snailSprite(f: number): Sprite {
  // glides: the head and stalks reach forward a pixel and pull back
  const s = make(17, 14), r = f === 1 || f === 2 ? 1 : 0;
  px(s, 2, 4, '#5fb8f0', 13 + r, 9);
  px(s, 5, 5, '#3f86c4', 6, 6);
  px(s, 11 + r, 1, '#5fb8f0', 2, 4);
  px(s, 12 + r, f === 2 ? 1 : 0, '#ffffff', 2, 2);
  px(s, 3, 12, '#3f86c4', 11 + r, 2);
  return s;
}
/** Hurt: the eye stalk snaps back down and the eye screws shut. */
function snailHurt(): Sprite {
  const s = make(17, 14);
  px(s, 2, 5, '#5fb8f0', 13, 8);
  px(s, 5, 6, '#3f86c4', 6, 6);
  px(s, 10, 3, '#5fb8f0', 2, 3);
  px(s, 10, 2, SHUT, 3, 1); px(s, 12, 1, SHUT);
  px(s, 13, 8, SHUT, 2, 2);
  px(s, 3, 12, '#3f86c4', 11, 2);
  return s;
}

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

/** A copy of a sprite with some exact colours swapped (map keys are #rrggbb). */
function recolor(src: Sprite, map: Record<string, string>): Sprite {
  const s = make(src.w, src.h);
  s.x.drawImage(src.c, 0, 0);
  const img = s.x.getImageData(0, 0, s.w, s.h), d = img.data;
  const hex = (v: number): string => v.toString(16).padStart(2, '0');
  const rgb = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const to = map[`#${hex(d[i])}${hex(d[i + 1])}${hex(d[i + 2])}`];
    if (to) [d[i], d[i + 1], d[i + 2]] = rgb(to);
  }
  s.x.putImageData(img, 0, 0);
  return s;
}

/** An enemy's walk/flap cycle, how fast it plays, and its hurt pose. */
export interface MobAnim { frames: Sprite[]; fps: number; hurt: Sprite }
const anim = (draw: (f: number) => Sprite, n: number, fps: number, hurt: () => Sprite): MobAnim =>
  ({ frames: Array.from({ length: n }, (_, f) => draw(f)), fps, hurt: hurt() });
const recolorAnim = (a: MobAnim, map: Record<string, string>): MobAnim =>
  ({ frames: a.frames.map((f) => recolor(f, map)), fps: a.fps, hurt: recolor(a.hurt, map) });

/** A glowing warp pad. */
function portalSprite(): Sprite {
  const s = make(20, 28);
  px(s, 2, 2, '#6fd3ff', 16, 24);
  px(s, 4, 4, '#bfefff', 12, 20);
  px(s, 6, 6, '#ffffff', 8, 16);
  px(s, 0, 24, '#3a6ea5', 20, 4);
  return s;
}

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
const crabRows = (f: number): string[] => [
  f ? 'o....o......o....o..' : '..oo..........oo....',
  f ? 'oR..Ro......oR..Ro..' : '.oRRo........oRRo...',
  'oRrRRo......oRRrRo..',
  'oRRoRo..wo..oRoRRo..',
  '.oo.oRo.ko.oRo.oo...',
  '.....oRooooooRo.....',
  '....oRRRRRRRRRRo....',
  '...oRRrRRRRRRrRRo...',
  '...oRRRRRRRRRRRRo...',
  '....oDDDDDDDDDDo....',
  '...oDo.oDo.oDo.oDo..',
  ...f ? ['....oDo.oDo.oDo.oDo.', '.....o...o...o...o..'] : ['..oDo..oDo..oDo.oDo.', '..o.....o....o...o..'],
];
const CRAB_PAL = { o: '#3a1208', R: '#e8643c', r: '#ff9a6a', D: '#b8401f', w: '#ffffff', k: '#0d1424' };
const crabSprite = (f: number): Sprite => grid(crabRows(f), CRAB_PAL);
/** Hurt: claws thrown up, eye stalks squeezed to dark dashes, mouth open. */
const crabHurt = (): Sprite => grid(marked(crabRows(1), [[8, 3, 'o'], [9, 3, 'o'], [8, 4, 'k'], [9, 4, 'k'], [9, 6, 'k'], [10, 6, 'k']]), CRAB_PAL);

const hermitRows = (f: number): string[] => [
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
  ...f ? ['......oDo..oDo.oDo', '.......o....o....o'] : ['....oDo..oDo..oDo.', '....o.....o....o..'],
].map((r) => r.padEnd(19, '.'));
const HERMIT_PAL = { o: '#2a1a10', S: '#e8b48a', s: '#f4d8bc', R: '#d9563a', r: '#ff8a64', D: '#a8402a', w: '#ffffff', k: '#0d1424' };
const hermitSprite = (f: number): Sprite => grid(hermitRows(f), HERMIT_PAL);
/** Hurt: it ducks back toward its shell, eye squeezed shut. */
const hermitHurt = (): Sprite => grid(marked(hermitRows(0), [[16, 6, '.'], [17, 6, '.'], [16, 7, 'o'], [17, 7, 'o'], [17, 8, 'k']]), HERMIT_PAL);

const gullRows = (f: number): string[] => f ? [
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

/** An enemy from mobart.ts, baked into its two frames and its hurt pose. */
const artMob = (name: string, fps: number): MobAnim => {
  const { w, h } = mobSize(name);
  const bake = (f: number): Sprite => { const s = make(w, h); paintMob(name, f, (x, y, col, gw = 1, gh = 1) => px(s, x, y, col, gw, gh)); return s; };
  return anim(bake, 2, fps, () => bake(HURT));
};

export const SPR = {
  portal: portalSprite(),
  /** Enemy animations: frames in order, and how fast they play. */
  mob: {
    'Garden Snail': anim(snailSprite, 4, 6, snailHurt),
    'Boar': anim(pigSprite, 4, 9, pigHurt),
    'Wisp': anim(wispSprite, 4, 8, wispHurt),
    'Iron Hog': anim(hogSprite, 4, 7, hogHurt),
    'Crab': anim(crabSprite, 2, 7, crabHurt),
    'Hermit Crab': anim(hermitSprite, 2, 5, hermitHurt),
    'Gull': anim(gullSprite, 2, 5, gullHurt),
    ...Object.fromEntries(Object.keys(MOB_ART).map((n) => [n, artMob(n, MOB_ART[n].look.w > 17 ? 6 : 7)])),
  } as Record<string, MobAnim>,
};
// palette-swapped variants of the hand-drawn enemies
for (const [n, { base, map }] of Object.entries(RECOLOR)) SPR.mob[n] = recolorAnim(SPR.mob[base], map);
