import { closeKeys, keysKey, keysTap, keysUi, openKeys } from './keys';

/* ============================================================
   SETTINGS
   Sound volume and damage numbers, saved in
   localStorage (apart from the progress save, so a reset keeps
   them). The window opens from the main menu's SETTINGS row and
   from the Esc menu; its KEYS row opens the rebinding window
   (see keys.ts). Up/Down picks a row, Left/Right (or Z)
   changes it; DONE, Esc or X closes. State and input only; see
   settingsdraw.ts.
   ============================================================ */

export interface Settings {
  /** Effects volume, 0 (muted) to VOLUME_MAX. */
  sound: number;
  /** Show damage numbers over enemies (and you). */
  dmgNums: boolean;
}

export const VOLUME_MAX = 10;
export const DEFAULT_SETTINGS: Settings = { sound: 8, dmgNums: true };
const STORE = 'archer-game:settings';

/** Validate stored settings: anything missing or malformed falls back to the default. */
export function cleanSettings(v: unknown): Settings {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<Record<keyof Settings, unknown>>;
  const n = Math.floor(Number(o.sound));
  return {
    sound: Number.isFinite(n) ? Math.max(0, Math.min(VOLUME_MAX, n)) : DEFAULT_SETTINGS.sound,
    dmgNums: typeof o.dmgNums === 'boolean' ? o.dmgNums : DEFAULT_SETTINGS.dmgNums,
  };
}

const load = (): Settings => {
  try { return cleanSettings(JSON.parse(localStorage.getItem(STORE) ?? 'null')); } catch { return { ...DEFAULT_SETTINGS }; }
};
export const settings: Settings = load();

export function saveSettings(): void {
  try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch { /* no storage */ }
}

/* ---------------- the window ---------------- */
export type SettingRow = 'sound' | 'dmgNums' | 'keys' | 'done';
export const SETTING_ROWS: SettingRow[] = ['sound', 'dmgNums', 'keys', 'done'];
export const SETTING_NAMES: Record<SettingRow, string> = {
  sound: 'SOUND', keys: 'KEYS', dmgNums: 'DAMAGE NUMBERS', done: 'DONE',
};

export const settingsUi = { open: false, sel: 0 };
export function openSettings(): void { settingsUi.open = true; settingsUi.sel = 0; closeKeys(); }

/** Change a row's value: d = -1 / +1 (toggles flip either way). */
export function stepSetting(row: SettingRow, d: number): void {
  if (row === 'sound') settings.sound = Math.max(0, Math.min(VOLUME_MAX, settings.sound + d));
  else if (row === 'dmgNums') settings.dmgNums = !settings.dmgNums;
  else return;
  saveSettings();
}

/** A navigation key: up, down, left, right, enter, escape. */
export function settingsKey(k: string): void {
  if (keysUi.open) { keysKey(k); return; }
  const n = SETTING_ROWS.length, row = SETTING_ROWS[settingsUi.sel];
  if (k === 'enter' && row === 'keys') { openKeys(); return; }
  if (k === 'up') settingsUi.sel = (settingsUi.sel + n - 1) % n;
  else if (k === 'down') settingsUi.sel = (settingsUi.sel + 1) % n;
  else if ((k === 'left' || k === 'right') && row !== 'done' && row !== 'keys') stepSetting(row, k === 'left' ? -1 : 1);
  else if (k === 'enter' && row !== 'done') stepSetting(row, 1);
  else if (k === 'enter' || k === 'escape') settingsUi.open = false;
}

/* layout (screen space), shared with the drawing and the tap hit-test */
export const SET_W = 176, SET_ROW = 14, SET_TOP = 24;
export const setH = (): number => SET_TOP + SETTING_ROWS.length * SET_ROW + 14;
export const settingsBox = (w: number, h: number): { x: number; y: number } =>
  ({ x: Math.round((w - SET_W) / 2), y: Math.round((h - setH()) / 2) });

/** A tap (view coords): a row's left half steps back, its right half forward;
 *  DONE (or anywhere outside the window) closes it. */
export function settingsTap(x: number, y: number, w: number, h: number): void {
  if (keysUi.open) { keysTap(x, y, w, h); return; }
  const b = settingsBox(w, h);
  if (x < b.x || x >= b.x + SET_W || y < b.y || y >= b.y + setH()) { settingsUi.open = false; return; }
  const i = Math.floor((y - b.y - SET_TOP + 3) / SET_ROW);
  if (i < 0 || i >= SETTING_ROWS.length) return;
  settingsUi.sel = i;
  settingsKey(SETTING_ROWS[i] === 'done' || SETTING_ROWS[i] === 'keys' ? 'enter' : x - b.x < SET_W / 2 ? 'left' : 'right');
}
