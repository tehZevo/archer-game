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

function snailSprite(): Sprite {
  const s = make(17, 14);
  px(s, 2, 4, '#5fb8f0', 13, 9);
  px(s, 5, 5, '#3f86c4', 6, 6);
  px(s, 11, 1, '#5fb8f0', 2, 4);
  px(s, 12, 0, '#ffffff', 2, 2);
  px(s, 3, 12, '#3f86c4', 11, 2);
  return s;
}

function pigSprite(): Sprite {
  const s = make(23, 18);
  px(s, 3, 4, '#e79ac4', 16, 11);
  px(s, 16, 6, '#d07fae', 5, 6);
  px(s, 19, 7, '#ffffff', 1, 1);
  px(s, 5, 15, '#c56f9f', 3, 3);
  px(s, 14, 15, '#c56f9f', 3, 3);
  return s;
}

function wispSprite(): Sprite {
  const s = make(16, 17);
  px(s, 3, 3, '#b98cf5', 10, 11);
  px(s, 5, 4, '#d9c2ff', 4, 4);
  px(s, 6, 8, '#1a1030', 2, 2);
  px(s, 10, 8, '#1a1030', 2, 2);
  return s;
}

function hogSprite(): Sprite {
  const s = make(26, 21);
  px(s, 3, 4, '#8fa2b8', 19, 13);
  px(s, 3, 4, '#6f8096', 19, 3);
  px(s, 19, 7, '#5a6b80', 5, 6);
  px(s, 22, 8, '#ffffff', 1, 1);
  px(s, 5, 17, '#5a6b80', 4, 4);
  px(s, 16, 17, '#5a6b80', 4, 4);
  return s;
}


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
const crabSprite = (): Sprite => grid([
  '..oo..........oo....',
  '.oRRo........oRRo...',
  'oRrRRo......oRRrRo..',
  'oRRoRo..wo..oRoRRo..',
  '.oo.oRo.ko.oRo.oo...',
  '.....oRooooooRo.....',
  '....oRRRRRRRRRRo....',
  '...oRRrRRRRRRrRRo...',
  '...oRRRRRRRRRRRRo...',
  '....oDDDDDDDDDDo....',
  '...oDo.oDo.oDo.oDo..',
  '..oDo..oDo..oDo.oDo.',
  '..o.....o....o...o..',
], { o: '#3a1208', R: '#e8643c', r: '#ff9a6a', D: '#b8401f', w: '#ffffff', k: '#0d1424' });

const hermitSprite = (): Sprite => grid([
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
  '....oDo..oDo..oDo.',
  '....o.....o....o..',
].map((r) => r.padEnd(19, '.')), { o: '#2a1a10', S: '#e8b48a', s: '#f4d8bc', R: '#d9563a', r: '#ff8a64', D: '#a8402a', w: '#ffffff', k: '#0d1424' });

const gullSprite = (): Sprite => grid([
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
  mob: {
    'Garden Snail': snailSprite(),
    'Boar': pigSprite(),
    'Wisp': wispSprite(),
    'Iron Hog': hogSprite(),
    'Crab': crabSprite(),
    'Hermit Crab': hermitSprite(),
    'Gull': gullSprite(),
  } as Record<string, Sprite>,
};
