import { ACTIONS, bindable, bindKey, capture, keyName, resetBinds } from './input';

/* ============================================================
   KEYS
   The key rebinding window, opened from the settings' KEYS row.
   Up/Down picks an action; Z/Enter waits for the next key and
   binds it (a key another action had swaps over, so nothing ends
   up with two). Esc while waiting cancels; RESET puts the default
   layout back. State and input only; drawn in settingsdraw.ts.
   ============================================================ */

/** Rows: one per action, then RESET and DONE. */
export const KEY_ROWS = ACTIONS.length + 2;
export const keysUi = { open: false, sel: 0, waiting: false, note: '' };

export function openKeys(): void { keysUi.open = true; keysUi.sel = 0; keysUi.waiting = false; keysUi.note = ''; }

/** Wait for the next key and bind the selected action to it. */
function listen(): void {
  const a = ACTIONS[keysUi.sel];
  keysUi.waiting = true; keysUi.note = '';
  capture.fn = (phys) => {
    capture.fn = null;
    keysUi.waiting = false;
    if (phys === 'escape') return;
    if (!bindable(phys)) { keysUi.note = "CAN'T USE THAT KEY"; return; }
    bindKey(a.id, phys);
    keysUi.note = `${a.name}: ${keyName(a.id)}`;
  };
}

export function closeKeys(): void { keysUi.open = false; keysUi.waiting = false; capture.fn = null; }

/** A navigation key: up, down, enter, escape (left/right do nothing here). */
export function keysKey(k: string): void {
  if (keysUi.waiting) return; // the next key goes to capture (see input.ts)
  const n = KEY_ROWS;
  if (k === 'up') { keysUi.sel = (keysUi.sel + n - 1) % n; keysUi.note = ''; }
  else if (k === 'down') { keysUi.sel = (keysUi.sel + 1) % n; keysUi.note = ''; }
  else if (k === 'enter') {
    if (keysUi.sel < ACTIONS.length) listen();
    else if (keysUi.sel === ACTIONS.length) { resetBinds(); keysUi.note = 'DEFAULT KEYS'; }
    else closeKeys();
  } else if (k === 'escape') closeKeys();
}

/* layout (screen space), shared with the drawing and the tap hit-test */
export const KEYS_W = 160, KEYS_ROW = 11, KEYS_TOP = 18;
export const keysH = (): number => KEYS_TOP + KEY_ROWS * KEYS_ROW + 14;
export const keysBox = (w: number, h: number): { x: number; y: number } =>
  ({ x: Math.round((w - KEYS_W) / 2), y: Math.max(0, Math.round((h - keysH()) / 2)) });

/** A tap: pick a row; tap it again to use it. Outside the window closes it. */
export function keysTap(x: number, y: number, w: number, h: number): void {
  if (keysUi.waiting) return;
  const b = keysBox(w, h);
  if (x < b.x || x >= b.x + KEYS_W || y < b.y || y >= b.y + keysH()) { closeKeys(); return; }
  const i = Math.floor((y - b.y - KEYS_TOP + 2) / KEYS_ROW);
  if (i < 0 || i >= KEY_ROWS) return;
  if (keysUi.sel === i) keysKey('enter'); else { keysUi.sel = i; keysUi.note = ''; }
}
