import { LOOK_KEYS, myLook, setMyLook, stepLook } from './look';

/* ============================================================
   STYLIST
   The window for changing your look: from the main menu's LOOK row
   or the stylist in town. Up/Down picks a row, Left/Right (or Z)
   changes it, and every change shows (and is shared) right away.
   DONE, Esc or X closes. State and input only; see stylistdraw.ts.
   ============================================================ */

export const STYLIST_ROWS = ['HAIR', 'HAIR COLOUR', 'SKIN', 'OUTFIT', 'DONE'] as const;

export const stylist = { open: false, sel: 0 };

export function openStylist(): void { stylist.open = true; stylist.sel = 0; }

/** A navigation key: up, down, left, right, enter, escape. */
export function stylistKey(k: string): void {
  const n = STYLIST_ROWS.length, key = LOOK_KEYS[stylist.sel];
  if (k === 'up') stylist.sel = (stylist.sel + n - 1) % n;
  else if (k === 'down') stylist.sel = (stylist.sel + 1) % n;
  else if ((k === 'left' || k === 'right' || k === 'enter') && key) setMyLook(stepLook(myLook(), key, k === 'left' ? -1 : 1));
  else if (k === 'enter' || k === 'escape') stylist.open = false;
}

/* layout (screen space), shared with the drawing and the tap hit-test */
export const ST_W = 200, ST_H = 112, ST_ROW = 14, ST_TOP = 24, ST_ROWS_W = 136;
export const stylistBox = (w: number, h: number): { x: number; y: number } =>
  ({ x: Math.round((w - ST_W) / 2), y: Math.round((h - ST_H) / 2) });

/** A tap (view coords): on a look row, its left half steps back and its right
 *  half forward; DONE (or anywhere outside the window) closes it. */
export function stylistTap(x: number, y: number, w: number, h: number): void {
  const b = stylistBox(w, h);
  if (x < b.x || x >= b.x + ST_W || y < b.y || y >= b.y + ST_H) { stylist.open = false; return; }
  const row = Math.floor((y - b.y - ST_TOP + 3) / ST_ROW);
  if (row < 0 || row >= STYLIST_ROWS.length) return;
  const rx = x - b.x;
  if (rx >= ST_ROWS_W) return; // the preview
  stylist.sel = row;
  stylistKey(!LOOK_KEYS[row] ? 'enter' : rx < ST_ROWS_W / 2 ? 'left' : 'right');
}
