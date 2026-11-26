import { P } from './config';
import { clearPressed } from './input';
import { update } from './update';

/* ============================================================
   The game loop contract, in one place:

   1. The world advances in fixed P.STEP (30 Hz) steps, however fast the
      display refreshes; render runs on requestAnimationFrame.
   2. A frame's real time is clamped to MAX_DT first, so a stalled tab
      (or a breakpoint) can't run a burst of catch-up steps.
   3. A key tap is a one-step latch: it is consumed only after a physics
      step has acted on it, and cleared after that step. Clearing it before
      a step (e.g. every render frame) would eat taps that arrive between two
      30 Hz steps; clearing it only at the end of the frame would let one tap
      fire on every catch-up step of that frame.

   Headless tests step through `tick` too, so they run the same contract.
   ============================================================ */

/** The longest real time one frame may advance the world by, s. */
export const MAX_DT = 0.1;

/** One fixed physics step, then consume the key taps it saw. */
export function tick(): void {
  update(P.STEP);
  clearPressed();
}

/** Advance the world by `dt` s of real time (clamped to MAX_DT), carrying
 *  the remainder in `clock.acc` to the next frame. `frozen` (the title menu)
 *  holds the world still and drops the time. Returns the steps run. */
export function advance(clock: { acc: number }, dt: number, frozen: boolean): number {
  if (frozen) { clock.acc = 0; return 0; }
  clock.acc += Math.min(MAX_DT, dt);
  let steps = 0;
  while (clock.acc >= P.STEP) { tick(); clock.acc -= P.STEP; steps++; }
  return steps;
}
