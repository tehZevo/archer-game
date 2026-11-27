import { P } from './config';
import { DEFAULT_LOOK, LOOK_COUNTS, lookKey, lookPalette, type Look } from './look';
import { canvasGrid, flipGrid, gridCanvas, hexRgb, newGrid, type Grid } from './grid';
import { BAKED_ARCHER } from './baked';
/* ============================================================
   ARCHER SPRITE SHEET
   16x24 frames authored as character grids (facing right) and
   baked once at boot. Each pose has one or more frames; drawArcher
   in render.ts picks the frame from the pose and its cycle time.
   ============================================================ */

/** Palette: one character per colour; '.' is transparent. */
export const PAL: Record<string, string> = {
  o: '#1b2235', // outline
  h: '#f6dc8a', H: '#d4a94e', // hair, hair shadow
  s: '#f2d0a9', S: '#d9a47c', // skin, skin shadow
  e: '#2b3a4a', // eye
  t: '#2fbfa4', T: '#1f8c78', // tunic, tunic shadow
  g: '#ffd166', // gold trim
  c: '#2b5f8a', C: '#1d4466', // cape, cape shadow
  l: '#3d4f6e', // leggings
  b: '#7a5232', // boots
  w: '#c8944a', W: '#8a5f2a', // bow wood, wood shadow
  x: '#cfd8e6', // bowstring / arrow
  a: '#8fd6ff', // arrowhead glow
};

// Shared head + shoulders (rows 0-11): blonde hair swept back, pointed elf
// ear, gold circlet.
const HEAD = [
  '................',
  '......oooooo....',
  '.....ohhhhhhoo..',
  '....ohhgggggho..',
  '...ohhhhhhhhhho.',
  '..ohhhhHssssso..',
  'ookhhhHsssseso..',
  '.okkhhHsssssso..',
  '..oohhHSsssso...',
  '...ohhhoSSoo....',
  '..oCchhoostto...',
  '..oCcchottttgo..',
];

const IDLE_BODY = [
  '..oCcctttttsgow.', // 12  bow hand at the hip
  '..oCccTttttsoxw.',
  '..oCccgggggg.xw.',
  '...oCcTttttTo.x.',
  '...oCcTttttTo.w.',
  '....ooTTTTTo..W.',
  '.....ollolloo...',
  '.....ollolloo...',
  '.....oll.ollo...',
  '.....obb.obbo...',
  '....obbb.obbbo..',
  '....oooo.oooo...',
];

/** Legs (rows 18-23) for the 4-step walk cycle. */
const WALK_LEGS = [
  ['.....olloollo...', '....ollo..ollo..', '....oll....llo..', '...obbo....obbo.', '...obbbo...obbbo', '...oooo....oooo.'],
  ['.....olloollo...', '.....ollolloo...', '.....ollo.llo...', '.....obbo.obbo..', '....obbbo.obbbo.', '....oooo..oooo..'],
  ['.....olloollo...', '......ollloo....', '......olllo.....', '......obbbo.....', '.....obbbbo.....', '.....ooooo......'],
  ['.....olloollo...', '.....ollolloo...', '.....ollo.llo...', '.....obbo.obbo..', '....obbbo.obbbo.', '....oooo..oooo..'],
];

const JUMP_LEGS = ['.....ollllo.....', '....ollo.ollo...', '...ollo...obbo..', '...obbo...obbbo.', '...obbbo..oooo..', '...oooo.........'];

// Drawing the bow: arm out front, bow vertical ahead, string pulled back.
const SHOOT_BODY = [
  '..oCcctttssssowo',
  '..oCccTttto.x.wo',
  '..oCccggggg.xaxw',
  '...oCcTttto.x.wo',
  '...oCcTttto..owo',
  '....ooTTTTo...o.',
];

// Double Shot windup: string drawn back to the chin, arrow nocked across the bow.
const DRAW_BODY = [
  '..oCcctttssssowo',
  '..oCccTttxx..w.o',
  '..oCccgggsxxxxxa',
  '...oCcTttxx..w.o',
  '...oCcTttto..owo',
  '....ooTTTTo...o.',
];

// Follow-through: string relaxed and straight, bow arm still out front.
const FOLLOW_BODY = [
  '..oCcctttssssow.',
  '..oCccTttto...xw',
  '..oCccggggg...xw',
  '...oCcTttto...xw',
  '...oCcTttto...w.',
  '....ooTTTTo.....',
];

// Rush Toss: crouched low, leaning into the slide.
// (the second frame trails the cape a pixel further back in the wind)
const RUSH_FLUTTER: [number, number, string][] = [[12, 1, 'oC'], [13, 0, 'oC'], [14, 0, 'oC']];
const RUSH_BODY = [
  '..oCcctttttssow.',
  '.oCccTttttto.xw.',
  '.oCccgggggg..xw.',
  '..oCcTttttTo.x..',
  '...ooTTTTTo..W..',
  '...ollllllloo...',
  '..ollo...ollo...',
  '.obbo.....obbo..',
  'obbbo.....obbbo.',
  'oooo.......oooo.',
  '................',
  '................',
];

// Climbing: seen from behind, cape and quiver, hands up on the rope.
const CLIMB = [
  ['................', '......oooooo....', '.....ohhhhhho...', '....ohhgggggho..', '...okhhhhhhhhko.', '...ohhhhhhhhhho.',
   '...ohhhhhhhhhho.', '..soohhhhhhhoos.', '..sooHhhhhhHoos.', '..oocHHhhhHHcoo.', '...occCCCCCCco..', '...occcwwwwccco.',
   '...occcwccwccco.', '...oCccwccwccCo.', '...oCccccccccCo.', '...oCCcccccCCCo.', '....oCCCCCCCCo..', '.....ollolloo...',
   '.....ollolloo...', '.....ollo.llo...', '.....obbo.obbo..', '.....obbo.obbo..', '.....oooo.oooo..', '................'],
];

// Cyclone Sweep: tucked tight, knees pulled up, bow held out. (While the
// sweep plays the archer is drawn as its glowing whirl instead, the
// 'cyclone' effect sheet; this frame is the pose either side of it.)
const SPIN_LOWER = [
  '....olllllloo...',
  '....ollllllbbo..',
  '.....oooolbbbo..',
  '.........oooo...',
  '................',
  '................',
];

// Meteor Dive: plunging head-first, crown leading and face to the ground,
// legs trailing, the cape along the back and the bow held down under the
// chin. A bigger frame (30x21), centred on the body's middle like every
// frame; the second flutters the feet.
const DIVE = [
  'ooo...........................',
  'obbbbo........................',
  'obbbbbo.......................',
  '.oobbllo......................',
  '...olllllo....................',
  '....olllllloCo................',
  '.....olllllllocCo.............',
  '......ollltttTTocCCo..oo......',
  '......ottttttTTTTcCCookko.....',
  '.......otttttttTTTTcookhho....',
  '........oggggggggggThhhhhho...',
  '..........otttttttTThhhhhhho..',
  '............ossstttthHHHhhhho.',
  '..............oossotoSssHhgho.',
  '...............osoooSsssshgho.',
  '................oso.Ssssshgho.',
  '.................osoosssshgho.',
  '..................ososseshgho.',
  '..............oowwssoossshho..',
  '.............owWxxxxxwooohoo..',
  '.............oo.....oo...o....',
];
const DIVE_FLUTTER: [number, number, string][] = [[0, 0, '.ooo'], [1, 0, '.obbbbo'], [2, 0, '.obbbbbo'], [3, 0, '..obllo']];

// Dodge roll (a Jump mid-Gale Stream): tucked into a ball, knees to chest
// and head down, the cape wrapped round. A 16x16 frame, centred on the
// body's middle like every frame; it turns a quarter turn per frame.
const ROLL = [
  '................',
  '.....oooooo.....',
  '....ohhhhhhoo...',
  '...ohhgggghhho..',
  '..ohhhhhhhHsso..',
  '..ohhhhhhHsseo..',
  '.oCchhhhHsssso..',
  '.oCcohhoSSSoo...',
  '.oCcctttttssoo..',
  '.oCcTttgggsslo..',
  '.oCcTtttlllllbo.',
  '..oCcTtlllllbbo.',
  '..oCcoollllbbbo.',
  '...oCCooooooooo.',
  '....ooo.........',
  '................',
];
/** A square grid turned a quarter turn anticlockwise (whole pixels, nothing lost). */
const quarterTurn = (g: string[]): string[] => g.map((_, y) => g.map((r) => r[r.length - 1 - y]).join(''));

/** Every other pixel gone: the Tempest's shimmer as you blink out. */
const dither = (g: string[], odd: number): string[] =>
  g.map((r, y) => [...r].map((ch, x) => ((x + y + odd) % 2 ? '.' : ch)).join(''));

/** Swap one row band of a frame: rows [from, from + band.length). */
function withRows(base: string[], from: number, band: string[]): string[] {
  const f = base.slice();
  band.forEach((r, i) => { f[from + i] = r; });
  return f;
}

const IDLE = [...HEAD, ...IDLE_BODY];
// idle breathing: the second frame sinks the upper body a pixel onto the legs
const IDLE2 = ['................', ...IDLE.slice(0, 17), ...IDLE.slice(18)];

/** Cells of a frame changed: [row, column, letters]. */
function poke(base: string[], cells: [number, number, string][]): string[] {
  const g = base.slice();
  for (const [row, col, s] of cells) g[row] = g[row].slice(0, col) + s + g[row].slice(col + s.length);
  return g;
}
/** Eyes shut for a beat: the lid shadow over the eye. */
const blink = (g: string[]): string[] => poke(g, [[6, 11, 'S']]);
/** The cape's hem flaring back a pixel behind the legs. */
const CAPE_FLARE: [number, number, string][] = [[15, 2, 'oC'], [16, 3, 'oC']];
/** Sinking a pixel onto the legs (rows 0-16 down one, the hip row kept). */
const sink = (g: string[]): string[] => ['................', ...g.slice(0, 17), ...g.slice(18)];

/** Falling (past the top of the arc): legs hanging loose, toes down, and
 *  the cape lifting off the back as the air rushes up; two frames flap it. */
const FALL_LEGS = ['.....olloollo...', '....ollo..ollo..', '....ollo..ollo..', '....obbo...obbo.', '....obbo...obbo.', '....oooo...oooo.'];
const FALL_CAPE: [number, number, string][] = [[10, 1, 'oC'], [11, 1, 'oCC'], [12, 1, 'oC'], [13, 1, 'oc']];
const FALL_CAPE2: [number, number, string][] = [[9, 1, 'oo'], [10, 0, 'oCC'], [11, 1, 'oCC'], [12, 1, 'oC']];

/** Lying flat (holding Down on the ground): a wider 24px frame, on her
 *  belly with the full-size head propped up over the bow hand (the same
 *  head as standing, so the sprite keeps its proportions). */
const PRONE = [
  ...Array(12).fill('........................'),
  '..............oooooo....',
  '.............ohhhhhhoo..',
  '............ohhgggggho..',
  '...........ohhhhhhhhhho.',
  '..........ohhhhHssssso..',
  '........ookhhhHsssseso..',
  '.........okkhhHsssssso..',
  '..ooo..ooooohhHSsssso...',
  '.obbbooocCcohhhoSSoo....',
  '.obbbolllTTTTttosssoxw..',
  '.obbboolllTTTTTTTCoxwW..',
  '..ooo.ooooooooooooooooo.',
];

export type ArcherPose = 'idle' | 'walk' | 'jump' | 'climb' | 'shoot' | 'rush' | 'barrage' | 'prone' | 'spin' | 'dive' | 'vanish' | 'fall' | 'roll';

const RUSH = ['................', '................', ...HEAD.slice(0, 10), ...RUSH_BODY];
// walk: the body sinks a pixel on the long stride and the cape's hem swings
// out behind on the push-off
const walkFrame = (legs: string[], i: number): string[] => {
  const g = withRows(IDLE, 18, legs);
  return i === 0 ? sink(poke(g, CAPE_FLARE)) : i === 1 ? poke(g, CAPE_FLARE) : g;
};

/** Frames per pose (as grids); a climb frame is mirrored for the second step. */
export const GRIDS: Record<ArcherPose, string[][]> = {
  // breathing in and out, with a blink on every third breath
  idle: [IDLE, IDLE2, IDLE, IDLE2, blink(IDLE), IDLE2],
  walk: WALK_LEGS.map(walkFrame),
  jump: [withRows(IDLE, 18, JUMP_LEGS)],
  climb: CLIMB,
  // draw → release → follow-through, picked by time since the shot (shootFrame)
  shoot: [withRows(IDLE, 12, DRAW_BODY), withRows(IDLE, 12, SHOOT_BODY), withRows(IDLE, 12, FOLLOW_BODY)],
  rush: [RUSH, poke(RUSH, RUSH_FLUTTER)],
  barrage: [withRows(withRows(IDLE, 12, SHOOT_BODY), 18, JUMP_LEGS)],
  prone: [PRONE],
  spin: [withRows(withRows(IDLE, 12, SHOOT_BODY), 18, SPIN_LOWER)],
  dive: [DIVE, poke(DIVE, DIVE_FLUTTER)],
  // the release frame breaking up into a shimmer (render.ts fades it out)
  vanish: [dither(withRows(IDLE, 12, SHOOT_BODY), 0), dither(withRows(IDLE, 12, SHOOT_BODY), 1)],
  fall: [poke(withRows(IDLE, 18, FALL_LEGS), FALL_CAPE), poke(withRows(IDLE, 18, FALL_LEGS), FALL_CAPE2)],
  // rolling backward (away from your facing): the ball turns anticlockwise
  roll: [ROLL, quarterTurn(ROLL), quarterTurn(quarterTurn(ROLL)), quarterTurn(quarterTurn(quarterTurn(ROLL)))],
};

/** Frames per second of each pose's cycle. */
export const POSE_FPS: Record<ArcherPose, number> = {
  idle: 2.4, walk: 9, jump: 1, climb: 4, shoot: 1, rush: 8, barrage: 1, prone: 1, spin: 1, dive: 10, vanish: 20, fall: 7, roll: 12,
};

export const ARCHER_W = 16, ARCHER_H = 24;

/* Hair styles: the swept-back default is in the grids above. The others
   redraw rows of the head (ears and face stay) and some let hair fall down
   the back over the cape (only cape pixels change, so the bow, arms and
   quiver stay on top). Climbing shows the back of the head. */
const SHORT_BACK: Record<number, string> = {
  8: '..oohhHSsssso...',
  9: '...oooooSSoo....',
  10: '..oCccoostto....',
  11: '..oCcccottttgo..',
};
const LONG_HEAD: Record<number, string> = {
  9: '..ohhhhoSSoo....',
  10: '..ohhhhHostto...',
  11: '..ohhhHHttttgo..',
};
interface Style {
  /** Whole rows of the head, side view. */
  head?: Record<number, string>;
  /** Hair over the cape: [row, first column, hair letters] (side view)... */
  back?: [number, number, string][];
  /** ...and seen from behind while climbing (whole rows, then cape cells). */
  climbRows?: Record<number, string>;
  climb?: [number, number, string][];
}
/** By STYLE_NAMES index: SWEPT, SHORT, LONG, CROP, SPIKY, SLICKED, BUN, PONYTAIL. */
const STYLES: Style[] = [
  {},
  { head: SHORT_BACK },
  { head: LONG_HEAD,
    back: [[12, 2, 'ohhH'], [13, 2, 'ohhH'], [14, 3, 'ohH'], [15, 3, 'oo']],
    climb: [[10, 5, 'HhhhhH'], [11, 6, 'hhhh'], [12, 6, 'Hhhh'], [13, 7, 'HH']] },
  // CROP: close to the head all round
  { head: { ...SHORT_BACK, 1: '................', 2: '......oooooo....', 5: '...ohhhHssssso..' },
    climbRows: { 1: '................', 2: '.....oooooooo...' } },
  // SPIKY: tufts standing up off the crown
  { head: { ...SHORT_BACK, 0: '....o...o...o...', 1: '...oho.oho.oho..', 2: '...ohhohhhohhoo.', 3: '...ohhhgggggho..' },
    climbRows: { 0: '....o..o..o..o..', 1: '...ohoohoohooho.' } },
  // SLICKED: combed flat and back, a sharp edge behind
  { head: { ...SHORT_BACK, 1: '......ooooooo...', 2: '....oohhhhhhhoo.', 3: '...ohhhgggggho..', 4: '..ohhhhhhhhhhho.', 5: '.ohhhhhHssssso..' } },
  // BUN: tied up high at the back
  { head: { ...SHORT_BACK, 0: '..ooo...........', 1: '.ohhHooooooo....', 2: '.oHhhohhhhhhoo..', 3: '..ooohhgggggho..' },
    climbRows: { 0: '......oooo......', 1: '.....ohhHhoo....' } },
  // PONYTAIL: tied at the nape, swinging down the back
  { head: { ...SHORT_BACK, 8: '.ohhhhHSsssso...', 9: '.ohhooooSSoo....', 10: '.ohHccoostto....', 11: '.ohHcccottttgo..' },
    back: [[12, 1, 'ohH'], [13, 1, 'oH'], [14, 2, 'o']],
    climb: [[10, 6, 'HhhH'], [11, 7, 'hh'], [12, 7, 'hH']] },
];

/** Cells of a frame changed where they hold one of the `only` letters:
 *  [row, first column, letters, only]. */
type Cell = [number, number, string, string];

/** The body types (by BODY_NAMES index), drawn over the side-view head
 *  whatever the hair style. The female build has a lash over the eye and a
 *  blush on the cheek; the male build a squarer jaw, heavier brows and a shoulder a pixel broader. */
const BODY_CELLS: Cell[][] = [
  [[5, 12, 'e', 's'], [7, 10, 'S', 's']],
  [[5, 10, 'HH', 's'], [8, 12, 'so', 'o.'], [9, 10, 'SSo', 'o.'], [11, 12, 'tgo', 'go.']],
];

/** The default (SWEPT) hair per body type: hers falls over the cape down
 *  her back; his is cut short at the nape, so only the female build has
 *  long hair unless a long style is picked. Side view, then from behind. */
const SWEPT_CELLS: Cell[][] = [
  [[11, 5, 'h', 'c'], [12, 4, 'hH', 'cC'], [13, 5, 'H', 'c']],
  [[9, 4, 'hoo', 'h'], [10, 5, 'cc', 'h'], [11, 6, 'c', 'h']],
];
const SWEPT_CLIMB: Cell[][] = [
  [[10, 6, 'hhhh', 'cC'], [11, 6, 'H', 'c'], [11, 11, 'H', 'c']],
  [[8, 6, 'HHHHH', 'hH'], [9, 7, 'SSS', 'hH']],
];

/** A frame's grid with a hair style and body type applied. */
export function styled(grid: string[], pose: ArcherPose, style: number, body = 0): string[] {
  // lying flat, diving or rolling: the head's drawn turned, so the side-view styles don't map onto it
  if (pose === 'prone' || pose === 'dive' || pose === 'roll') return grid;
  const g = grid.slice();
  const put = (row: number, col: number, s: string, only: string): void => {
    if (!g[row]) return;
    const r = [...g[row]];
    [...s].forEach((ch, i) => { if (only.includes(r[col + i])) r[col + i] = ch; });
    g[row] = r.join('');
  };
  const st = STYLES[style] ?? STYLES[0];
  if (pose === 'climb') {
    for (const [row, r] of Object.entries(st.climbRows ?? {})) g[+row] = r;
    for (const [row, col, s] of st.climb ?? []) put(row, col, s, 'cC');
    if (style === 0) for (const [row, col, s, only] of SWEPT_CLIMB[body]) put(row, col, s, only);
    return g;
  }
  // crouched low (the head drawn 2 rows down): the hair's out of sight, but the face shows
  // a breath or a stride sinks the whole upper body a row: find the head's top
  const top = pose === 'rush' ? 2 : Math.max(0, grid.findIndex((r) => r.includes('o')) - 1);
  if (top < 2) {
    for (const [row, r] of Object.entries(st.head ?? {})) if (+row + top < 12) g[+row + top] = r;
    for (const [row, col, s] of st.back ?? []) put(row + top, col, s, 'cCo.');
  }
  if (style === 0 && top < 2) for (const [row, col, s, only] of SWEPT_CELLS[body]) put(row + top, col, s, only);
  for (const [row, col, s, only] of BODY_CELLS[body]) put(row + top, col, s, only);
  return g;
}

/* ---------------- sheets ----------------
   The archer ships as PNG sheets (assets/archer/<style>-<body>.png), one
   per hair style and body type, in the default look's colours: a row per
   pose (ARCHER_ROWS gives each row's place and frame size), its frames left
   to right. They're baked from the grids above by `npm run bake`. A look
   is applied by swapping each default colour for the look's (lookColours),
   so hair, skin and outfit colours never need sheets of their own. */

/** Every pose's frames as pixels for a hair style and body type, in the
 *  default look's colours. */
export function archerShape(style: number, body: number): Record<ArcherPose, Grid[]> {
  const pal = { ...PAL, ...lookPalette(DEFAULT_LOOK) };
  const out = {} as Record<ArcherPose, Grid[]>;
  for (const p of Object.keys(GRIDS) as ArcherPose[]) {
    out[p] = GRIDS[p].map((g) => styled(g, p, style, body)).map((rows) => {
      const g = newGrid(rows[0].length, rows.length);
      rows.forEach((r, y) => [...r].forEach((ch, x) => {
        const col = pal[ch];
        if (!col) return;
        const i = (y * g.w + x) * 4;
        [g.px[i], g.px[i + 1], g.px[i + 2]] = hexRgb(col); g.px[i + 3] = 255;
      }));
      return g;
    });
  }
  return out;
}

/** Where each pose sits on a sheet: its row's top, frame size and count. */
export interface SheetRow { y: number; w: number; h: number; n: number }
export const sheetRows = (shape: Record<ArcherPose, Grid[]>): Record<ArcherPose, SheetRow> => {
  let y = 0;
  const out = {} as Record<ArcherPose, SheetRow>;
  for (const p of Object.keys(GRIDS) as ArcherPose[]) {
    const f = shape[p][0];
    out[p] = { y, w: f.w, h: f.h, n: shape[p].length };
    y += f.h;
  }
  return out;
};

/** A look's colours: each default colour (as 0xRRGGBB) mapped to the look's. */
export function lookColours(look: Look): Map<number, [number, number, number]> {
  const from = { ...PAL, ...lookPalette(DEFAULT_LOOK) }, to = { ...PAL, ...lookPalette(look) }, m = new Map<number, [number, number, number]>();
  for (const k of Object.keys(from)) {
    const [r, g, b] = hexRgb(from[k]);
    m.set((r << 16) | (g << 8) | b, hexRgb(to[k]));
  }
  return m;
}

/** A frame in a look's colours. */
export function recolourFrame(g: Grid, cols: Map<number, [number, number, number]>): Grid {
  const o = newGrid(g.w, g.h);
  o.px.set(g.px);
  for (let i = 0; i < o.px.length; i += 4) {
    if (!o.px[i + 3]) continue;
    const to = cols.get((o.px[i] << 16) | (o.px[i + 1] << 8) | o.px[i + 2]);
    if (to) [o.px[i], o.px[i + 1], o.px[i + 2]] = to;
  }
  return o;
}

/** Loaded sheets, by "style-body", cut into frames. */
const loaded = new Map<string, Record<ArcherPose, Grid[]>>();

/** Start decoding the archer's sheets (no-op headless). */
export function loadArcherSheets(): void {
  if (typeof Image === 'undefined') return;
  for (const [key, { src }] of Object.entries(BAKED_ARCHER.sheets)) {
    const img = new Image();
    img.onload = () => {
      const all = canvasGrid(img, img.width, img.height), out = {} as Record<ArcherPose, Grid[]>;
      for (const [p, r] of Object.entries(BAKED_ARCHER.rows) as [ArcherPose, SheetRow][]) {
        out[p] = Array.from({ length: r.n }, (_, f) => {
          const g = newGrid(r.w, r.h);
          for (let y = 0; y < r.h; y++) g.px.set(all.px.subarray(((r.y + y) * all.w + f * r.w) * 4, ((r.y + y) * all.w + (f + 1) * r.w) * 4), y * r.w * 4);
          return g;
        });
      }
      loaded.set(key, out);
      baked.clear(); // re-bake looks from the sheets
    };
    img.src = src;
  }
}

/** Frames for a look, facing right; climb's second step is its mirror. */
export function bakeArcher(look: Look = DEFAULT_LOOK): Record<ArcherPose, HTMLCanvasElement[]> {
  const style = look.style % LOOK_COUNTS.style, body = look.body % LOOK_COUNTS.body;
  const shape = loaded.get(`${style}-${body}`) ?? archerShape(style, body), cols = lookColours(look);
  const out = {} as Record<ArcherPose, HTMLCanvasElement[]>;
  for (const p of Object.keys(GRIDS) as ArcherPose[]) {
    const frames = shape[p].map((g) => recolourFrame(g, cols));
    out[p] = frames.map(gridCanvas);
    if (p === 'climb') out[p].push(gridCanvas(flipGrid(frames[0])));
  }
  return out;
}

/** Baked frames, one set per look seen so far. */
const baked = new Map<string, Record<ArcherPose, HTMLCanvasElement[]>>();
export function archerFrames(look: Look): Record<ArcherPose, HTMLCanvasElement[]> {
  const k = lookKey(look);
  let f = baked.get(k);
  if (!f) baked.set(k, (f = bakeArcher(look)));
  return f;
}

/** The cycle time a pose is drawn at: the climb runs on height, everything
 *  else on the clock — except a ghost's, which is pinned to the first frame so
 *  the other players stand still instead of breathing (see render.drawArcher). */
export const poseCycle = (pose: ArcherPose, feet: number, t: number, breathe = true): number =>
  pose === 'climb' ? climbPhase(feet) : breathe ? t : 0;

/** Climb frame time from height: one hand-over-hand step every CLIMB_STEP px,
 *  so the climb only animates while actually moving up or down. */
const CLIMB_STEP = 8;
export const climbPhase = (feet: number): number => Math.floor(feet / CLIMB_STEP) / POSE_FPS.climb;

/** Shoot frame for seconds since the shot began: draw during the windup,
 *  release for a moment, then follow through. */
export const shootFrame = (since: number): number =>
  since < P.Z_WINDUP ? 0 : since < P.Z_WINDUP + 0.12 ? 1 : 2;

/** Pick the frame of a pose at cycle time t (seconds); a shot plays its
 *  draw/release/follow sequence by time since it began instead. */
export function archerFrame(frames: Record<ArcherPose, HTMLCanvasElement[]>, pose: ArcherPose, t: number, since?: number): HTMLCanvasElement {
  const f = frames[pose] ?? frames.idle;
  if (pose === 'shoot' && since !== undefined) return f[Math.min(f.length - 1, shootFrame(since))];
  return f[Math.floor(t * POSE_FPS[pose]) % f.length];
}
