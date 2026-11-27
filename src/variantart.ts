/* ============================================================
   VARIANT ART
   The hand-drawn enemies' cousins, each drawn as its own creature (not a
   palette swap of its parent): a Red Snail with a spiralled shell on a
   soft foot, a Blue Crab with one huge crusher claw, a Wild Boar with
   tusks and a bristling mane, a Storm Gull with a crest and a lightning
   streak, and a tiny Green Snail under a tall cone of a shell. Character grids like sprites.ts's crab and gull: a palette key
   per pixel, '.' clear. Facing right, feet on the bottom row; frames 0-3
   are the walk/flap cycle, then a hurt pose (eyes squeezed shut).
   ============================================================ */

export interface VariantArt {
  w: number; h: number; fps: number;
  pal: Record<string, string>;
  rows: (f: number) => string[];
  hurt: () => string[];
}

/** Rows with some cells changed: [col, row, char] (out-of-range cells are skipped). */
export const mark = (rows: string[], marks: [number, number, string][]): string[] => {
  const g = rows.map((r) => r.split(''));
  for (const [x, y, c] of marks) if (g[y] && x >= 0 && x < g[y].length) g[y][x] = c;
  return g.map((r) => r.join(''));
};
/** The rows dropped by `dy` (a bob), keeping the height. */
const drop = (rows: string[], dy: number): string[] =>
  dy > 0 ? [...Array(dy).fill('.'.repeat(rows[0].length)), ...rows.slice(0, rows.length - dy)] : rows;

/* ---------------- Red Snail ----------------
   A tall spiralled shell on a peach foot, eyes up on stalks. It glides: the
   foot ripples and the stalks sway. */
const SNAIL_SHELL = [
  '....ooooo........',
  '..ooSSsssoo......',
  '.oSSsSSSSSso.....',
  '.oSsSSdddSSso....',
  'oSSsSdSSSdSSo....',
  'oSSsdSSdSSdSo....',
  'oSSsdSdSSdSSo....',
  'oSSSdSSddSSSo....',
  '.oSSSdSSSSSo.....',
  '..ooSSSSSoo......',
];
const snailRows = (f: number): string[] => {
  const sway = f === 1 ? 1 : f === 3 ? -1 : 0, ripple = f % 2;
  const top = ['.'.repeat(17), '.'.repeat(17)];
  const rows = [...top, ...SNAIL_SHELL, '.'.repeat(17), '.'.repeat(17)];
  const out = mark(rows, [
    // the stalks and eyes
    [12 + sway, 0, 'k'], [15 + sway, 0, 'k'], [12, 1, 'b'], [15, 1, 'b'], [12, 2, 'b'], [14, 2, 'b'],
    // the head
    ...[3, 4, 5, 6].flatMap((y) => [12, 13, 14, 15].map((x) => [x, y, 'B'] as [number, number, string])),
    [12, 3, 'o'], [16, 4, 'o'], [16, 5, 'o'], [16, 6, 'o'], [15, 3, 'o'], [15, 7, 'm'],
    // the foot, running under the shell to the head
    ...Array.from({ length: 16 }, (_, x) => [x, 12, 'B'] as [number, number, string]),
    ...Array.from({ length: 15 }, (_, x) => [x + 1, 13, x % 2 === ripple ? 'b' : 'o'] as [number, number, string]),
    [0, 12, 'o'], [16, 12, 'o'], [12, 7, 'B'], [13, 7, 'B'], [14, 7, 'B'], [12, 8, 'B'], [13, 8, 'B'], [14, 8, 'o'],
    [12, 9, 'B'], [13, 9, 'o'], [12, 10, 'B'], [12, 11, 'B'], [13, 10, 'o'], [13, 11, 'B'], [14, 11, 'B'], [15, 11, 'o'],
  ]);
  return out;
};
const RED_SNAIL: VariantArt = {
  w: 17, h: 14, fps: 6,
  pal: { o: '#2a1010', S: '#d8402a', s: '#ff8a5a', d: '#8a1a10', B: '#f0c8a0', b: '#c8946a', k: '#0d1424', m: '#8a4a3a' },
  rows: snailRows,
  // the stalks snap down into the head and the eyes screw shut
  hurt: () => mark(snailRows(0), [[12, 0, '.'], [15, 0, '.'], [12, 1, '.'], [15, 1, '.'], [12, 2, '.'], [14, 2, '.'], [13, 4, 'k'], [14, 4, 'k'], [15, 6, 'k'], [15, 7, 'k']]),
};

/* ---------------- Green Snail ----------------
   The smallest enemy: a tall cone of a shell, whorls running up it to the
   tip, over a little pale foot. Its one eye stalk bobs as it glides. */
const CONE = [
  '....o......',
  '...ogo.....',
  '...ogGo....',
  '..ogDDo....',
  '..oGGGDo...',
  '.ogDDGGo...',
  '.oGGGDDGo..',
  'ogDDGGGDo..',
];
const coneRows = (f: number): string[] => {
  const bob = f === 1 || f === 2 ? 1 : 0, ripple = f % 2;
  return mark([
    ...CONE,
    'oBBBBBBBwBo',
    '.o' + Array.from({ length: 7 }, (_, x) => (x % 2 === ripple ? 'b' : 'B')).join('') + 'o.',
  ], [
    // the head and its stalk, nodding a pixel
    [10, 3 + bob, 'k'], [10, 4, 'b'], [10, 5, 'b'], [9, 5, 'o'],
    [9, 6, 'B'], [10, 6, 'B'], [9, 7, 'B'], [10, 7, 'm'], [10, 8, 'o'],
  ]);
};
const GREEN_SNAIL: VariantArt = {
  w: 11, h: 10, fps: 6,
  pal: { o: '#12301a', G: '#4aa84a', g: '#9ae07a', D: '#2a6a2a', B: '#d8e8a0', b: '#a8b870', w: '#f4fae0', k: '#0d1424', m: '#6a7a3a' },
  rows: coneRows,
  // the stalk ducks down and the eye screws shut
  hurt: () => mark(coneRows(0), [[10, 3, '.'], [10, 4, '.'], [10, 5, 'o'], [10, 6, 'k'], [9, 6, 'k'], [10, 7, 'k']]),
};

/* ---------------- Blue Crab ----------------
   A fiddler: a small claw in back and one huge crusher up front, held high
   and snapping; a ridged shell. */
const crabRows = (f: number): string[] => {
  const open = f === 1 || f === 2, legs = f % 2;
  return [
    open ? '............oooooo..' : '....................',
    open ? '...........oCCCCCCo.' : '............oooooo..',
    open ? '......wo.wo.oCcCCCo.' : '......wo.wo.oCcCCCo.',
    open ? '.oo...ko.ko..oooCCo.' : '.oo...ko.ko.oCCCCCo.',
    open ? 'oRco...o..o...oCCCo.' : 'oRco...o..o..oCCCo..',
    '.ooo.oooooooo.oCCo..',
    '...ooRRRRRRRRooCo...',
    '..oRRtRtRtRtRRRo....',
    '.oRRRRRRRRRRRRRRo...',
    '.oRRrRRRRRRRRrRRo...',
    '..oDDDDDDDDDDDDo....',
    legs ? '.oDo.oDo.oDo.oDo....' : '..oDo.oDo.oDo.oDo...',
    legs ? '.o...o...o...o......' : '..o...o...o...o.....',
  ];
};
const BLUE_CRAB: VariantArt = {
  w: 20, h: 13, fps: 7,
  pal: { o: '#0e1a3a', R: '#4a8ae8', r: '#9ac8ff', t: '#2a5ab8', D: '#2a4aa8', C: '#3a70d8', c: '#b8dcff', w: '#ffffff', k: '#0d1424' },
  rows: crabRows,
  // the crusher flung up, eyes squeezed into dashes
  hurt: () => mark(crabRows(1), [[6, 2, '.'], [9, 2, '.'], [6, 3, 'o'], [9, 3, 'o'], [7, 3, 'o'], [10, 3, 'o'], [8, 6, 'o'], [9, 6, 'o']]),
};

/* ---------------- Wild Boar ----------------
   Heavier than the Boar: a dark bristling mane down its back, a long
   snout with upcurved tusks, a red eye; trots on four stubby legs. */
const BOAR_BODY = [
  '.......................',
  '.......................',
  '....M.M.M.M............',
  '...MMMMMMMMMMM.........',
  '..oMMMMMMMMMMMMooo.....',
  '.oBBBBBBBBBBBBBBBBo....',
  'oBBBBBBBBBBBBBBBrBBo...',
  'oBBBBBBBBBBBBBBBBBBnno.',
  'oBBBBBBBBBBBBBBBBBBnnko',
  'oBBBBBBBBBBBBBBBBBtnno.',
  '.oBlllllllllllllBBto...',
  '..obbbbbbbbbbbbbbbo....',
];
const boarRows = (f: number): string[] => {
  const up = f % 2, step = f === 1 ? 1 : f === 3 ? -1 : 0;
  const body = drop(BOAR_BODY, 1 - up);
  // four legs: the diagonal pairs step together
  const legs = [2, 7, 12, 16].map((x, i) => x + (i % 2 ? -step : step));
  const legRow = (cap: string, fill: string): string => {
    const r = '.'.repeat(23).split('');
    for (const x of legs) { r[x] = cap; r[x + 1] = fill; r[x + 2] = fill; r[x + 3] = cap; }
    return r.join('');
  };
  return [...body, ...Array(5).fill(legRow('o', 'b')), legRow('o', 'o')];
};
const WILD_BOAR: VariantArt = {
  w: 23, h: 18, fps: 9,
  pal: { o: '#1e120a', B: '#8a5a3a', b: '#5a3a24', l: '#b88a5a', M: '#2e1c10', n: '#c89a7a', t: '#f0e8c8', r: '#ff4a3a', k: '#1e120a' },
  rows: boarRows,
  // the snout tossed up, the eye shut, the mane flattened back
  hurt: () => mark(boarRows(0), [[16, 6, 'o'], [17, 6, 'o'], [16, 5, 'B'], [4, 2, '.'], [6, 2, '.'], [8, 2, '.'], [10, 2, '.'], [21, 7, 'B'], [21, 8, 'o']]),
};

/* ---------------- Storm Gull ----------------
   The gull's wingbeat in slate and black, with a swept-back crest and a
   yellow lightning streak down its side. */
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
const GULL_UP = [
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
const GULL_DOWN = [
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
];
/** The crest and the lightning streak, placed off the eye wherever this frame has it. */
function stormMarks(rows: string[]): string[] {
  const y = rows.findIndex((r) => r.includes('k')), x = rows[y].indexOf('k');
  return mark(rows, [
    [x - 2, y - 2, 'c'], [x - 3, y - 2, 'c'], [x - 1, y - 1, 'c'], [x - 4, y - 3, 'c'], // the crest
    [x - 4, y + 1, 'Z'], [x - 5, y + 1, 'Z'], [x - 6, y + 2, 'Z'], [x - 5, y + 2, 'Z'], [x - 7, y + 2, 'Z'], // the streak
  ]);
}
const stormRows = (f: number): string[] => stormMarks(f % 2 ? GULL_LEVEL : f ? GULL_DOWN : GULL_UP);
const STORM_GULL: VariantArt = {
  w: 18, h: 12, fps: 10,
  pal: { o: '#141a24', w: '#6a7488', g: '#262c3a', k: '#f0f4ff', Y: '#e8c040', c: '#9aa6c0', Z: '#ffe870' },
  rows: stormRows,
  // wings flung up, the eye shut, the beak gaping
  hurt: () => {
    const r = stormRows(0), y = r.findIndex((row) => row.includes('k')), x = r[y].indexOf('k');
    return mark(r, [[x, y, 'o'], [x - 1, y, 'o'], [x + 2, y + 1, 'o']]);
  },
};

/** Every drawn variant, by name (its parent is MOB_TYPES' `of`). */
export const VARIANT_ART: Record<string, VariantArt> = {
  'Red Snail': RED_SNAIL,
  'Green Snail': GREEN_SNAIL,
  'Blue Crab': BLUE_CRAB,
  'Wild Boar': WILD_BOAR,
  'Storm Gull': STORM_GULL,
};
