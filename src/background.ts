/* ============================================================
   BACKGROUND TICK
   A hidden tab gets no animation frames, so the game loop (and
   with it the position updates other players rely on) stops.
   While the page is hidden, a timer keeps calling `tick` so this
   player stays present for everyone else (standing still). The
   timer runs in a tiny Web Worker: browsers throttle a hidden
   page's own timers hard (down to once a minute), a worker's far
   less. Plain setInterval is the fallback.
   ============================================================ */

export const BG_TICK_MS = 250;

export function keepAliveWhileHidden(tick: () => void): void {
  const run = (): void => { if (document.hidden) tick(); };
  try {
    const src = `setInterval(() => postMessage(0), ${BG_TICK_MS});`;
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    w.onmessage = run;
  } catch {
    setInterval(run, BG_TICK_MS);
  }
}
