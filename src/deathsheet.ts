import { bitFly, DEATH_T, deathBits, deathPose, type Corpse, type DeathRecipe } from './deaths';

/* ============================================================
   ENEMY DEATH SHEETS
   Each enemy's death is a baked strip of pixel-art frames, built once
   from its own hurt sprite and its death recipe (deaths.ts): the body
   is resampled pixel by pixel through the recipe's motion (no smooth
   canvas rotation or scaling), fades out with an ordered dither, and the
   bits that fly off it (feathers, gears, shards...) are painted into the
   frames as pixels. So every enemy has its own sheet, and drawing a
   death is just picking the frame for its age. Pure pixel buffers here;
   render.ts turns them into canvases.
   ============================================================ */

/** Frames per death (DEATH_T long, so ~12fps). */
export const DEATH_FRAMES = 10;

/** An RGBA pixel buffer. */
export interface Grid { w: number; h: number; px: Uint8ClampedArray }

export interface DeathSheet {
  frames: Grid[];
  /** where the body's middle sits in each frame (facing right) */
  cx: number; cy: number;
}

/** 4x4 Bayer matrix: a pixel shows while alpha beats its threshold. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dithered = (x: number, y: number, a: number): boolean => a > BAYER[(y & 3) * 4 + (x & 3)];

/** A stable seed from the enemy's name, so its sheet is always the same. */
const seedOf = (name: string): number => [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

const hex = (c: string): [number, number, number] =>
  [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

/** Bake an enemy's death from its hurt sprite (facing right). */
export function bakeDeathSheet(name: string, recipe: DeathRecipe, src: Grid): DeathSheet {
  const { w: sw, h: sh } = src;
  const pad = 22, W = sw + pad * 2, H = sh + pad * 2;
  const cx = Math.floor(W / 2), cy = Math.floor(H / 2); // the body's middle
  // on the ground: deaths fall nowhere here (a flier's drop is added when drawn)
  const c: Corpse = { name, recipe, x: 0, feet: sh / 2, w: sw, h: sh, k: 1, dir: 1, drop: 0, age: 0, seed: seedOf(name) };
  const floor = cy + Math.ceil(sh / 2); // the ground row
  const frames: Grid[] = [];
  for (let f = 0; f < DEATH_FRAMES; f++) {
    const p = (f + 0.5) / DEATH_FRAMES, t = p * DEATH_T, q = deathPose(c, p);
    const g: Grid = { w: W, h: H, px: new Uint8ClampedArray(W * H * 4) };
    const put = (x: number, y: number, r: number, gg: number, b: number): void => {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H || y > floor) return;
      const i = (y * W + x) * 4;
      g.px[i] = r; g.px[i + 1] = gg; g.px[i + 2] = b; g.px[i + 3] = 255;
    };
    const sample = (u: number, v: number): number => {
      const x = Math.floor(u), y = Math.floor(v);
      if (x < 0 || y < 0 || x >= sw || y >= sh) return -1;
      const i = (y * sw + x) * 4;
      return src.px[i + 3] > 127 ? i : -1;
    };
    // the body: each frame pixel maps back into the sprite (nearest pixel)
    if (q.alpha > 0) {
      const cos = Math.cos(-q.rot), sin = Math.sin(-q.rot);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!dithered(x, y, q.alpha)) continue;
        const ox = x + 0.5 - cx - q.dx, oy = y + 0.5 - cy - q.dy;
        const lx = ox * cos - oy * sin, ly = ox * sin + oy * cos;
        const i = sample(lx / q.sx + sw / 2, (ly - sh / 2) / q.sy + sh);
        if (i >= 0) put(x, y, src.px[i], src.px[i + 1], src.px[i + 2]);
      }
    }
    // crumbling: blocks of the body tumble apart and settle on the ground
    if (recipe.move === 'crumble' && p >= 0.08) {
      let s = c.seed ^ 0x5bd1;
      const r = (): number => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
      const tt = t - 0.08 * DEATH_T, B = 4, fade = Math.max(0, 1 - p * p);
      for (let by = 0; by < sh; by += B) for (let bx = 0; bx < sw; bx += B) {
        const ox = bx + B / 2 - sw / 2, oy = by + B / 2 - sh;
        const vx = ox * 3 + (r() - 0.5) * 30, vy = -40 - r() * 50;
        const px0 = cx + ox + vx * tt - B / 2, py0 = Math.min(floor - B, cy + sh / 2 + oy + vy * tt + 170 * tt * tt);
        for (let yy = 0; yy < B; yy++) for (let xx = 0; xx < B; xx++) {
          const i = sample(bx + xx, by + yy);
          const X = Math.round(px0 + xx), Y = Math.round(py0 + yy);
          if (i >= 0 && dithered(X, Y, fade)) put(X, Y, src.px[i], src.px[i + 1], src.px[i + 2]);
        }
      }
    }
    // the bits, as pixels in the recipe's colours
    const kind = recipe.bits, fly = bitFly(kind);
    for (const b of deathBits(c, t)) {
      const x = cx + b.x, y = Math.min(floor - 1, cy + b.y);
      if (!dithered(Math.round(x), Math.round(y), b.alpha)) continue;
      const [r, gg, bb] = hex(b.col);
      const dot = (dx: number, dy: number): void => put(x + dx, y + dy, r, gg, bb);
      switch (kind) {
        case 'feather': case 'petal': case 'shell':
          if (Math.abs(Math.sin(b.rot)) < 0.5) { dot(-1, 0); dot(0, 0); dot(1, 0); } else { dot(0, -1); dot(0, 0); dot(0, 1); }
          break;
        case 'gear':
          for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) dot(i, j);
          dot(Math.cos(b.rot) > 0 ? 2 : -2, 0);
          put(x, y, 0x2a, 0x20, 0x18);
          break;
        case 'star':
          dot(-1, 0); dot(0, 0); dot(1, 0); dot(0, -1); dot(0, 1);
          break;
        case 'shard':
          if (Math.sin(b.rot) > 0) { dot(0, -1); dot(0, 0); } else { dot(-1, 0); dot(0, 0); }
          break;
        default:
          for (let j = 0; j < fly.size; j++) for (let i = 0; i < fly.size; i++) dot(i - (fly.size >> 1), j - (fly.size >> 1));
      }
    }
    frames.push(g);
  }
  return { frames, cx, cy };
}

/** The frame a death shows at its age. */
export const deathFrame = (age: number): number => Math.min(DEATH_FRAMES - 1, Math.floor((age / DEATH_T) * DEATH_FRAMES));
