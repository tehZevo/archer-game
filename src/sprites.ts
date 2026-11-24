// Procedurally-built pixel-art sprites. Each sprite is a tiny canvas drawn with
// 1px blocks; the base-resolution canvas + image-rendering:pixelated keeps them
// crisp. Built once at boot, drawn with drawImage.

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
   poses, 1 and 3 the strides. */

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

function hogSprite(f: number): Sprite {
  const s = make(26, 21);
  const up = quadruped(s, f, [5, 16], 17, 4, '#5a6b80');
  px(s, 3, 4 - up, '#8fa2b8', 19, 13);
  px(s, 3, 4 - up, '#6f8096', 19, 3);
  px(s, 19, 7 - up, '#5a6b80', 5, 6);
  px(s, 22, 8 - up, '#ffffff', 1, 1);
  return s;
}

export interface MobAnim { frames: Sprite[]; fps: number }
const anim = (draw: (f: number) => Sprite, n: number, fps: number): MobAnim =>
  ({ frames: Array.from({ length: n }, (_, f) => draw(f)), fps });

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

/* Beach enemies (facing right, like the others: drawMob mirrors them). */
const crabSprite = (f: number): Sprite => grid([
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
], { o: '#3a1208', R: '#e8643c', r: '#ff9a6a', D: '#b8401f', w: '#ffffff', k: '#0d1424' });

const hermitSprite = (f: number): Sprite => grid([
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
].map((r) => r.padEnd(19, '.')), { o: '#2a1a10', S: '#e8b48a', s: '#f4d8bc', R: '#d9563a', r: '#ff8a64', D: '#a8402a', w: '#ffffff', k: '#0d1424' });

const gullSprite = (f: number): Sprite => grid(f ? [
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
], { o: '#2a3442', w: '#f4f7fc', g: '#9aa6b8', k: '#0d1424', Y: '#f0c040' });

export const SPR = {
  portal: portalSprite(),
  /** Enemy animations: frames in order, and how fast they play. */
  mob: {
    'Garden Snail': anim(snailSprite, 4, 6),
    'Boar': anim(pigSprite, 4, 9),
    'Wisp': anim(wispSprite, 4, 8),
    'Iron Hog': anim(hogSprite, 4, 7),
    'Crab': anim(crabSprite, 2, 7),
    'Hermit Crab': anim(hermitSprite, 2, 5),
    'Gull': anim(gullSprite, 2, 5),
  } as Record<string, MobAnim>,
};
