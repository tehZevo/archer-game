import { box, MOB_ART, OUT, oval, type Feats, type Look, type MobPaint, type PlanKind } from './mobart';
import { planDeath, stars, xEye, type DeathPainter, type DeathStory } from './mobdeath';

/* ============================================================
   DEATHS OF THE HAND-DRAWN ENEMIES
   The hand-drawn enemies (sprites.ts) and their drawn variants
   (variantart.ts) die in drawn frames too: each is matched to the body
   plan it looks like, in its own colours, and the two shell-dwellers get
   deaths of their own (a snail pulls into its shell, a hermit crab's
   shell breaks off it).
   ============================================================ */

const SHUT = '#1a1010';
const look = (w: number, h: number, c: string, d: string, l: string, e: string, a: string): Look => ({ w, h, c, d, l, e, a });

type Drawn = { kind: PlanKind | 'snail' | 'hermit'; look: Look; feat: Feats };

/** For the snails: c body, d shell shade, l shell light, a shell. For the hermit: c crab, d its shade, l shell light, a shell. */
const DRAWN_DEATH: Record<string, Drawn> = {
  'Garden Snail': { kind: 'snail', look: look(17, 14, '#5fb8f0', '#24568a', '#7fcaf8', SHUT, '#3f86c4'), feat: {} },
  'Red Snail': { kind: 'snail', look: look(17, 14, '#f0c8a0', '#8a1a10', '#ff8a5a', '#0d1424', '#d8402a'), feat: {} },
  'Hermit Crab': { kind: 'hermit', look: look(19, 16, '#d9563a', '#a8402a', '#f4d8bc', '#0d1424', '#e8b48a'), feat: {} },
  'Enemy Crab': { kind: 'bug', look: look(20, 12, '#e8643c', '#b8401f', '#ff9a6a', '#0d1424', '#e8643c'), feat: {} },
  'Blue Crab': { kind: 'bug', look: look(20, 13, '#4a8ae8', '#2a4aa8', '#9ac8ff', '#0d1424', '#b8dcff'), feat: {} },
  Gull: { kind: 'flier', look: look(18, 12, '#f4f7fc', '#9aa6b8', '#ffffff', '#0d1424', '#9aa6b8'), feat: { beak: true } },
  'Storm Gull': { kind: 'flier', look: look(18, 12, '#6a7488', '#262c3a', '#ffe870', '#f0f4ff', '#262c3a'), feat: { beak: true, stripes: true } },
  Boar: { kind: 'quad', look: look(23, 18, '#e79ac4', '#c56f9f', '#ffd0e8', SHUT, '#d07fae'), feat: { snout: true, tail: true } },
  'Wild Boar': { kind: 'quad', look: look(23, 18, '#8a5a3a', '#5a3a24', '#b88a5a', '#1e120a', '#f0e8c8'), feat: { snout: true, horns: true, ears: true } },
  'Iron Hog': { kind: 'quad', look: look(26, 21, '#8fa2b8', '#5a6b80', '#c8d4e0', SHUT, '#6f8096'), feat: { snout: true } },
  Wisp: { kind: 'blob', look: look(16, 17, '#b98cf5', '#9a6fe0', '#e8dcff', '#1a1030', '#9a6fe0'), feat: {} },
};

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const seg = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));
const r = Math.round;

/** A snail's shell: an oval with a spiral in it. */
function shell(p: MobPaint, x: number, y: number, w: number, h: number, L: Look): void {
  oval(p, x, y, w, h, L.a);
  oval(p, x + 2, y + 2, w - 4, h - 4, L.a, L.d);
  p(x + (w >> 1) - 1, y + (h >> 1) - 1, L.d, 2, 2);
  p(x + 2, y + 1, L.l, 3, 1);
}

/** Snail: its stalks droop, it pulls into its shell, the shell rocks and keels
 *  over, and a dead eye peeks out of the opening above a slick of slime. */
function snailDeath(L: Look): DeathPainter {
  const { w, h } = L, sx = 2, sy = 3, sw = 11, sh = 10;
  return (p, t) => {
    if (t < 0.4) {
      const k = seg(t, 0, 0.4), reach = r((w - sx - 3) * (1 - k)); // the foot pulls in under the shell
      box(p, sx, h - 4, Math.max(4, reach + 3), 4, L.c);
      const hx = sx + reach - 1;
      if (reach > 4) { // the head and its stalks, drooping as it goes
        box(p, hx, h - 7, 4, 4, L.c);
        const droop = r(4 * k);
        p(hx + 1, h - 10 + droop, OUT, 1, 3 - Math.min(2, droop)); p(hx + 3, h - 10 + droop, OUT, 1, 3 - Math.min(2, droop));
        p(hx + 1 + (droop > 2 ? 1 : 0), h - 11 + droop, L.e, 2, 1);
      }
      shell(p, sx, sy + r(k), sw, sh, L);
      return;
    }
    if (t < 0.6) { // all in: the shell rocks side to side
      const rock = Math.floor(t * 20) % 2 ? 1 : -1;
      shell(p, sx + rock, sy + 1, sw, sh, L);
      p(sx + sw - 2 + rock, h - 2, L.c, 2, 1);
      return;
    }
    // keeled over: on its side, opening up, a dead eye peeking out, slime pooling
    const gy = h - 9;
    p(sx - 2, h - 1, L.c, sw + 6, 1); // the slick
    shell(p, sx, gy, sw + 2, 9, L);
    box(p, sx + sw - 1, gy - 2, 5, 4, L.c); // the head flopped out of the opening
    xEye(p, sx + sw + 1, gy - 1);
    p(sx + sw + 3, gy + 2, L.c, 2, 1); // a limp stalk on the ground
    if (t < 0.85) { const b = seg(t, 0.6, 0.85); p(sx + sw + 5, r(gy - 2 - b * 6), L.l); } // a last bubble
  };
}

/** Hermit crab: a crack runs through its shell, the halves fall away, and the
 *  crab underneath flips onto its back, legs kicking, then curls up. */
function hermitDeath(L: Look): DeathPainter {
  const { h } = L, sx = 1, sy = 1, sw = 13, sh = 11;
  return (p, t) => {
    const crab = (y: number, up: boolean, kick: number): void => {
      const cx = 5, cw = 11;
      for (let i = 0; i < 3; i++) { // legs
        const lx = cx + 1 + i * 3;
        if (up) { p(lx + kick, y - 3, OUT, 1, 3); p(lx + 1 - kick, y - 3, OUT); } else p(lx, h - 3, OUT, 1, 3);
      }
      oval(p, cx, y, cw, 5, L.c);
      p(cx + 2, y + 1, up ? L.d : L.l, cw - 4, 1);
      if (up) xEye(p, cx + cw - 1, y + 2); else { p(cx + cw - 2, y - 2, OUT, 1, 2); p(cx + cw - 2, y - 3, L.e); }
      box(p, cx + cw - 1, y + (up ? 3 : 1), 4, 3, L.c); // the big claw
    };
    if (t < 0.35) {
      crab(h - 7, false, 0);
      shell(p, sx, sy, sw, sh, L);
      const n = r(seg(t, 0.08, 0.35) * (sh - 2)); // the crack
      for (let k = 0; k < n; k++) p(sx + (sw >> 1) + (k % 2 ? 1 : 0), sy + 1 + k, OUT);
      return;
    }
    // the halves fall away to either side
    const k = seg(t, 0.35, 0.6), mid = sx + (sw >> 1);
    for (const side of [-1, 1]) {
      const dx = r(side * 6 * k), dy = r((h - sy - sh + 3) * k * k);
      const rec: [number, number, string, number][] = [];
      oval((x, y, c, gw = 1) => rec.push([x, y, c, gw]), sx, sy, sw, sh, L.a);
      for (const [x, y, c, gw] of rec) {
        const a = side < 0 ? x : Math.max(x, mid + 1), b = side < 0 ? Math.min(x + gw, mid) : x + gw;
        if (b > a) p(a + dx, Math.min(h - 1, y + dy), c, b - a, 1);
      }
      if (side < 0) p(sx + 2 + dx, sy + 1 + dy, L.l, 3, 1);
    }
    // the crab, bare: jolts onto its back and kicks, then curls still
    const kick = t < 0.8 ? Math.floor(t * 16) % 2 : 0;
    crab(h - 5, t > 0.45, kick);
    if (t > 0.45 && t < 0.7) stars(p, 12, h - 9, t);
  };
}

/** How an enemy is drawn dying by `story`, or null if it has no art. */
export function deathPainter(name: string, story: DeathStory): { look: Look; paint: DeathPainter } | null {
  const m = MOB_ART[name];
  if (m) return { look: m.look, paint: planDeath(m.plan.kind, story, m.look, m.plan.feat) };
  const d = DRAWN_DEATH[name];
  if (!d) return null;
  if (d.kind === 'snail') return { look: d.look, paint: snailDeath(d.look) };
  if (d.kind === 'hermit') return { look: d.look, paint: hermitDeath(d.look) };
  return { look: d.look, paint: planDeath(d.kind, story, d.look, d.feat) };
}

/** Enemies drawn by hand (with no body plan) that have deaths drawn here. */
export const DRAWN_DEATHS = Object.keys(DRAWN_DEATH);
