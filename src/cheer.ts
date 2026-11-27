/* ============================================================
   CHEERS
   `/cheer <player>` in chat cheers another player in your channel:
   they get +10% EXP for a while. You hold up to three cheers, and one
   comes back each hour. Times are wall-clock (Date.now), so cheers and
   the buff carry across reloads (see save.ts).
   No networking imports: net.ts sends and receives, combat.ts and
   quests.ts scale EXP by expMult, hud.ts shows the buff.
   ============================================================ */

export const CHEER = {
  MAX: 3,                  // cheers you can hold
  RECHARGE_MS: 3600_000,   // one comes back each hour
  BUFF_MS: 30 * 60_000,    // a cheer lasts half an hour (another one restarts it; they don't stack)
  EXP: 0.1,                // +10% EXP
};

export const cheer = {
  /** cheers held */
  n: CHEER.MAX,
  /** when the next cheer started recharging (meaningful while n < MAX) */
  since: 0,
  /** our buff runs until this time (0 = none) */
  until: 0,
  /** who cheered us last */
  from: '',
};

/** Cheers held right now (catching up on any that recharged since). */
export function cheersLeft(now = Date.now()): number {
  while (cheer.n < CHEER.MAX && now - cheer.since >= CHEER.RECHARGE_MS) { cheer.n++; cheer.since += CHEER.RECHARGE_MS; }
  return cheer.n;
}

/** Spend a cheer, if there's one to spend. */
export function spendCheer(now = Date.now()): boolean {
  if (!cheersLeft(now)) return false;
  if (cheer.n === CHEER.MAX) cheer.since = now; // a full stock starts recharging now
  cheer.n--;
  return true;
}

/** Ms until the next cheer comes back (0 when you're full). */
export const nextCheerMs = (now = Date.now()): number =>
  (cheersLeft(now) >= CHEER.MAX ? 0 : cheer.since + CHEER.RECHARGE_MS - now);

/** Someone cheered us: (re)start the buff. */
export function cheered(by: string, now = Date.now()): void {
  cheer.until = now + CHEER.BUFF_MS;
  cheer.from = by;
}

/** Ms left on our buff (0 = none). */
export const cheerLeftMs = (now = Date.now()): number => Math.max(0, cheer.until - now);

/** EXP multiplier from the buff (1 without one). */
export const expMult = (now = Date.now()): number => (cheerLeftMs(now) > 0 ? 1 + CHEER.EXP : 1);

/** Whole minutes, rounded up, for messages: "42M". */
export const minutes = (ms: number): string => `${Math.max(1, Math.ceil(ms / 60_000))}M`;

/** The name after `/cheer` in a chat line ('' if none), or null if the line isn't a cheer. */
export function cheerTarget(line: string): string | null {
  const m = /^\/cheer(?:\s+(.*))?$/i.exec(line.trim());
  return m ? (m[1] ?? '').trim() : null;
}

/** Restore saved cheers (anything malformed gets a fresh stock and no buff). */
export function loadCheer(v: unknown): void {
  const s = (v ?? {}) as Partial<typeof cheer>;
  const num = (x: unknown, d: number): number => (Number.isFinite(Number(x)) ? Number(x) : d);
  cheer.n = Math.max(0, Math.min(CHEER.MAX, Math.floor(num(s.n, CHEER.MAX))));
  cheer.since = num(s.since, 0);
  cheer.until = num(s.until, 0);
  cheer.from = typeof s.from === 'string' ? s.from : '';
}
