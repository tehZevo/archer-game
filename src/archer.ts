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

export type ArcherPose = 'idle' | 'walk' | 'jump' | 'climb' | 'shoot' | 'rush' | 'barrage';

/** Frames per pose (as grids); a climb frame is mirrored for the second step. */
export const GRIDS: Record<ArcherPose, string[][]> = {
  idle: [IDLE, IDLE2],
  walk: WALK_LEGS.map((legs) => withRows(IDLE, 18, legs)),
  jump: [withRows(IDLE, 18, JUMP_LEGS)],
  climb: CLIMB,
  shoot: [withRows(IDLE, 12, SHOOT_BODY)],
  rush: [['................', '................', ...HEAD.slice(0, 10), ...RUSH_BODY]],
  barrage: [withRows(withRows(IDLE, 12, SHOOT_BODY), 18, JUMP_LEGS)],
};

/** Frames per second of each pose's cycle. */
export const POSE_FPS: Record<ArcherPose, number> = {
  idle: 1.2, walk: 9, jump: 1, climb: 4, shoot: 1, rush: 1, barrage: 1,
};

export const ARCHER_W = 16, ARCHER_H = 24;

function bake(grid: string[], flip: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = ARCHER_W; c.height = ARCHER_H;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  grid.forEach((row, y) => {
    for (let i = 0; i < ARCHER_W; i++) {
      const col = PAL[row[flip ? ARCHER_W - 1 - i : i]];
      if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); }
    }
  });
  return c;
}

/** Baked frames, facing right; climb's second step is its mirror. */
export function bakeArcher(): Record<ArcherPose, HTMLCanvasElement[]> {
  const out = {} as Record<ArcherPose, HTMLCanvasElement[]>;
  for (const p of Object.keys(GRIDS) as ArcherPose[]) {
    out[p] = GRIDS[p].map((g) => bake(g, false));
    if (p === 'climb') out[p].push(bake(GRIDS[p][0], true));
  }
  return out;
}

/** Climb frame time from height: one hand-over-hand step every CLIMB_STEP px,
 *  so the climb only animates while actually moving up or down. */
const CLIMB_STEP = 8;
export const climbPhase = (feet: number): number => Math.floor(feet / CLIMB_STEP) / POSE_FPS.climb;

/** Pick the frame of a pose at cycle time t (seconds). */
export function archerFrame(frames: Record<ArcherPose, HTMLCanvasElement[]>, pose: ArcherPose, t: number): HTMLCanvasElement {
  const f = frames[pose] ?? frames.idle;
  return f[Math.floor(t * POSE_FPS[pose]) % f.length];
}
