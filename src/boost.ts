/* ============================================================
   SHARED SPAWN BOOST
   Other players' kills in your instance speed up your enemy waves:
   each remote kill adds to a boost that decays over time. Kills are
   counted locally and sent in batches (at most once a second), and a
   received batch is clamped so one peer can't flood the floor.
   No networking imports: net.ts feeds it, update.ts reads it.
   ============================================================ */

export const BOOST = {
  PER_KILL: 0.15,   // +15% wave speed per remote kill...
  MAX: 1.0,         // ...up to 2x
  DECAY: 0.05,      // per second, so a full boost fades in ~20s
  MAX_BATCH: 5,     // kills accepted per received message
  SEND_MS: 1000,    // local kills are batched, sent at most once a second
};

export const boost = { level: 0, pending: 0, lastSend: -Infinity };

/** Wave timer speed multiplier (1 = normal). */
export const waveRate = (): number => 1 + boost.level;

/** Remote players killed `n` mobs. */
export function remoteKills(n: unknown): void {
  const k = Math.max(0, Math.min(BOOST.MAX_BATCH, Math.floor(Number(n) || 0)));
  boost.level = Math.min(BOOST.MAX, boost.level + k * BOOST.PER_KILL);
}

/** Decay the boost; call on the fixed step. */
export function decayBoost(dt: number): void {
  boost.level = Math.max(0, boost.level - BOOST.DECAY * dt);
}

/** We killed a mob: queue it for the next batch. */
export const localKill = (): void => { boost.pending++; };

/** The batch to send now (and reset it), or 0 if nothing is due. */
export function takeBatch(now: number): number {
  if (!boost.pending || now - boost.lastSend < BOOST.SEND_MS) return 0;
  boost.lastSend = now;
  const n = boost.pending;
  boost.pending = 0;
  return n;
}

/** Drop all boost state (changing floors or instances). */
export function resetBoost(): void { boost.level = 0; boost.pending = 0; }
