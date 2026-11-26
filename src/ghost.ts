/* ============================================================
   GHOST SYNC
   Peers send a packet every SEND_MS carrying the last few motion
   samples (taken every SAMPLE_MS). Receivers buffer them and play
   them back INTERP_MS behind, interpolating between samples (and
   extrapolating on velocity briefly if a packet is late), so
   ghosts move smoothly and play the same poses as their owner.
   Kept free of networking imports so it can be tested headless.
   ============================================================ */

/** How the archer is posed this instant; drives the sprite. */
export type Pose = 'idle' | 'walk' | 'jump' | 'climb' | 'shoot' | 'rush' | 'barrage' | 'prone' | 'spin' | 'dive' | 'vanish' | 'fall';
/** Sent as an index: new poses go on the end (older clients show them as idle). */
// (new poses go on the end: the index is what is sent, and an older client
// shows one it doesn't know as idle)
export const POSES: Pose[] = ['idle', 'walk', 'jump', 'climb', 'shoot', 'rush', 'barrage', 'prone', 'spin', 'dive', 'vanish', 'fall'];

/** One motion sample: ms offset (≤ 0) from the packet's send time, x, y, vx, vy, pose index. */
export type Sample = [number, number, number, number, number, number];

/** The wire format: compact so a packet stays tiny even with several samples. */
export interface Packet {
  /** Sender's clock (ms) when sent. */
  t: number;
  /** Facing, +1 or -1. */
  f: number;
  /** Samples, oldest first. */
  s: Sample[];
}

export const SAMPLE_MS = 100;  // 10 samples/s of motion...
export const SEND_MS = 300;    // ...sent ~3x a second, three samples per packet
export const INTERP_MS = 450;  // playback delay: one send interval plus jitter headroom
const MAX_EXTRAP_MS = 250;     // beyond this past the newest sample, hold still
const KEEP_MS = 2000;          // buffered history

interface Point { t: number; x: number; y: number; vx: number; vy: number; pose: number }

/** A remote player's buffered motion. */
export interface GhostTrack {
  pts: Point[];
  face: number;
  /** Estimated (our clock − their clock), ms; the smallest seen ≈ least delayed. */
  offset: number;
}

/** What to draw for a ghost right now. */
export interface GhostView { x: number; y: number; face: number; pose: Pose; /** s since this pose began */ since: number }

export const newTrack = (): GhostTrack => ({ pts: [], face: 1, offset: Infinity });

/** Fold a received packet into a track (local clock `now`, ms). */
export function ingest(tr: GhostTrack, p: Packet, now: number): void {
  if (!p || !Array.isArray(p.s)) return;
  tr.offset = Math.min(tr.offset, now - p.t);
  tr.face = p.f < 0 ? -1 : 1;
  const last = tr.pts.length ? tr.pts[tr.pts.length - 1].t : -Infinity;
  for (const [dt, x, y, vx, vy, pose] of p.s) {
    const t = p.t + dt;
    if (t > last) tr.pts.push({ t, x, y, vx, vy, pose });
  }
  const cut = p.t - KEEP_MS;
  while (tr.pts.length > 2 && tr.pts[0].t < cut) tr.pts.shift();
}

/** Where a ghost is at local time `now` (ms), or null before any data. */
export function view(tr: GhostTrack, now: number): GhostView | null {
  const pts = tr.pts;
  if (!pts.length) return null;
  const t = now - tr.offset - INTERP_MS; // playback time, on the sender's clock
  let i = pts.length - 1;
  while (i > 0 && pts[i - 1].t > t) i--;
  const b = pts[i];
  // when did the pose shown now begin? (walk back over samples with the same pose)
  const since = (k: number): number => {
    let j = k;
    while (j > 0 && pts[j - 1].pose === pts[k].pose) j--;
    return Math.max(0, t - pts[j].t) / 1000;
  };
  if (t >= b.t) {
    // past the newest sample: coast on velocity a little, then hold
    const dt = Math.min(t - b.t, MAX_EXTRAP_MS) / 1000;
    return { x: b.x + b.vx * dt, y: b.y + b.vy * dt, face: tr.face, pose: POSES[b.pose] ?? 'idle', since: since(i) };
  }
  if (i === 0) return { x: b.x, y: b.y, face: tr.face, pose: POSES[b.pose] ?? 'idle', since: 0 };
  const a = pts[i - 1];
  const k = (t - a.t) / (b.t - a.t || 1);
  const shown = k < 0.5 ? i - 1 : i;
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    face: tr.face,
    pose: POSES[pts[shown].pose] ?? 'idle',
    since: since(shown),
  };
}

/** Collects our own samples and decides when a packet is due. */
export class Recorder {
  private buf: { t: number; s: [number, number, number, number, number] }[] = [];
  private lastSample = -Infinity;
  private lastSend = -Infinity;

  /** Call every frame; returns a packet when one is due, else null. */
  tick(now: number, x: number, y: number, vx: number, vy: number, pose: Pose, face: number): Packet | null {
    if (now - this.lastSample >= SAMPLE_MS) {
      this.lastSample = now;
      this.buf.push({ t: now, s: [Math.round(x), Math.round(y), Math.round(vx), Math.round(vy), Math.max(0, POSES.indexOf(pose))] });
    }
    if (now - this.lastSend < SEND_MS || !this.buf.length) return null;
    this.lastSend = now;
    const s = this.buf.map(({ t, s }) => [Math.round(t - now), ...s] as Sample);
    this.buf = [];
    return { t: Math.round(now), f: face < 0 ? -1 : 1, s };
  }
}
