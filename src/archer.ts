import { P } from './config';
import { DEFAULT_LOOK, lookKey, lookPalette, type Look } from './look';
/* ============================================================
   ARCHER SPRITE SHEET
   16x24 frames authored as character grids (facing right) and
   baked once at boot. Each pose has one or more frames; drawArcher
   in render.ts picks the frame from the pose and its cycle time.
   ============================================================ */

/** Palette: one character per colour; '.' is transparent. */
const PAL: Record<string, string> = {
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

// Twin Shot windup: string drawn back to the chin, arrow nocked across the bow.
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

// Sky Toss: crouched low, leaning into the slide.
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

/** Swap one row band of a frame: rows [from, from + band.length). */
function withRows(base: string[], from: number, band: string[]): string[] {
  const f = base.slice();
  band.forEach((r, i) => { f[from + i] = r; });
  return f;
}

const IDLE = [...HEAD, ...IDLE_BODY];
// idle breathing: the second frame sinks the upper body a pixel onto the legs
const IDLE2 = ['................', ...IDLE.slice(0, 17), ...IDLE.slice(18)];

/** Lying flat (holding Down on the ground): a wider 24px frame, head
 *  forward, bow tucked under the chin. */
const PRONE = [
  ...Array(16).fill('........................'),
  '................oooo....',
  '...............ohhhho...',
  '..............ohhggggo..',
  '..ooo..ooooooohhhhsseo..',
  '.obbbooollllTTtttHsssso.',
  '.obbbollllTTTttgtoSSoxw.',
  '.obbboollllTTTTTCcooxwW.',
  '..ooo.ooooooooooooo.oo..',
];

export type ArcherPose = 'idle' | 'walk' | 'jump' | 'climb' | 'shoot' | 'rush' | 'barrage' | 'prone';

/** Frames per pose (as grids); a climb frame is mirrored for the second step. */
export const GRIDS: Record<ArcherPose, string[][]> = {
  idle: [IDLE, IDLE2],
  walk: WALK_LEGS.map((legs) => withRows(IDLE, 18, legs)),
  jump: [withRows(IDLE, 18, JUMP_LEGS)],
  climb: CLIMB,
  // draw → release → follow-through, picked by time since the shot (shootFrame)
  shoot: [withRows(IDLE, 12, DRAW_BODY), withRows(IDLE, 12, SHOOT_BODY), withRows(IDLE, 12, FOLLOW_BODY)],
  rush: [['................', '................', ...HEAD.slice(0, 10), ...RUSH_BODY]],
  barrage: [withRows(withRows(IDLE, 12, SHOOT_BODY), 18, JUMP_LEGS)],
  prone: [PRONE],
};

/** Frames per second of each pose's cycle. */
export const POSE_FPS: Record<ArcherPose, number> = {
  idle: 1.2, walk: 9, jump: 1, climb: 4, shoot: 1, rush: 1, barrage: 1, prone: 1,
};

export const ARCHER_W = 16, ARCHER_H = 24;

/* Hair styles: the swept-back default is in the grids above. The others
   redraw the back of the head (rows 8-11; ears and face stay) and, for long
   hair, let it fall down the back over the cape (only cape pixels change,
   so the bow, arms and quiver stay on top). */
const SHORT_HEAD: Record<number, string> = {
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
/** Long hair over the cape: [row, first column, hair letters] (side view). */
const LONG_BACK: [number, number, string][] = [[12, 2, 'ohhH'], [13, 2, 'ohhH'], [14, 3, 'ohH'], [15, 3, 'oo']];
/** ...and seen from behind while climbing. */
const LONG_CLIMB: [number, number, string][] = [[10, 5, 'HhhhhH'], [11, 6, 'hhhh'], [12, 6, 'Hhhh'], [13, 7, 'HH']];

/** A frame's grid with a hair style applied. */
export function styled(grid: string[], pose: ArcherPose, style: number): string[] {
  // crouched low, and lying flat: the hair's out of sight, so keep the drawn grid
  if (!style || pose === 'rush' || pose === 'prone') return grid;
  const g = grid.slice();
  const put = (row: number, col: number, s: string, only: string): void => {
    const r = [...g[row]];
    [...s].forEach((ch, i) => { if (only.includes(r[col + i])) r[col + i] = ch; });
    g[row] = r.join('');
  };
  if (pose === 'climb') {
    if (style === 2) for (const [row, col, s] of LONG_CLIMB) put(row, col, s, 'cC');
    return g;
  }
  for (const [row, s] of Object.entries(style === 1 ? SHORT_HEAD : LONG_HEAD)) g[+row] = s;
  if (style === 2) for (const [row, col, s] of LONG_BACK) put(row, col, s, 'cCo.');
  return g;
}

/** Bake a grid; frames are ARCHER_W wide except wider ones (prone). */
function bake(grid: string[], flip: boolean, pal: Record<string, string>): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const W = grid[0].length;
  c.width = W; c.height = ARCHER_H;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  grid.forEach((row, y) => {
    for (let i = 0; i < W; i++) {
      const col = pal[row[flip ? W - 1 - i : i]];
      if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); }
    }
  });
  return c;
}

/** Baked frames for a look, facing right; climb's second step is its mirror. */
export function bakeArcher(look: Look = DEFAULT_LOOK): Record<ArcherPose, HTMLCanvasElement[]> {
  const pal = { ...PAL, ...lookPalette(look) };
  const out = {} as Record<ArcherPose, HTMLCanvasElement[]>;
  for (const p of Object.keys(GRIDS) as ArcherPose[]) {
    const grids = GRIDS[p].map((g) => styled(g, p, look.style));
    out[p] = grids.map((g) => bake(g, false, pal));
    if (p === 'climb') out[p].push(bake(grids[0], true, pal));
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
