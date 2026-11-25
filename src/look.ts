/* ============================================================
   LOOK
   How your archer looks: a hair style, hair colour, skin tone and
   outfit, each a plain index into the lists below. It's kept on this
   device (like your name) and sent to the other players in the room
   along with your name, so they see you as you made yourself.
   ============================================================ */

export interface Look { style: number; hair: number; skin: number; outfit: number }

/** Hair colours: [hair, shadow]. */
export const HAIR_COLS: readonly [string, string][] = [
  ['#f6dc8a', '#d4a94e'], // blonde
  ['#9a6440', '#6a4228'], // brown
  ['#454a5c', '#2a2d3a'], // black
  ['#e0703e', '#a8482a'], // red
  ['#dfe4ec', '#a6aec0'], // silver
  ['#f29ac0', '#c46a92'], // pink
  ['#6fd8c8', '#3e9e92'], // teal
];

/** Skin tones: [skin, shadow]. */
export const SKINS: readonly [string, string][] = [
  ['#f2d0a9', '#d9a47c'],
  ['#ffe2cc', '#e8b89a'],
  ['#d6a074', '#b07a50'],
  ['#a8714a', '#7e5032'],
  ['#6e4a32', '#4e3222'],
];

/** Outfits: tunic, tunic shadow, cape, cape shadow. */
export const OUTFITS: readonly [string, string, string, string][] = [
  ['#2fbfa4', '#1f8c78', '#2b5f8a', '#1d4466'], // teal and blue
  ['#d8483a', '#a0302a', '#5a2a3a', '#3e1c28'], // red and wine
  ['#5fa04a', '#3e7a32', '#6b4a2a', '#4a321c'], // forest
  ['#9f6bd8', '#7448a8', '#2f2f5a', '#20203e'], // violet
  ['#e6e9f0', '#b4bccb', '#2a3a6e', '#1c2850'], // white and navy
  ['#3a3f4e', '#262a36', '#8a2e2e', '#5e1e1e'], // black and red
  ['#f0c040', '#b88a20', '#7a2a8a', '#561c62'], // gold and purple (an achievement unlocks it)
];

export const STYLE_NAMES = ['SWEPT', 'SHORT', 'LONG'] as const;

export const LOOK_KEYS = ['style', 'hair', 'skin', 'outfit'] as const;
export const LOOK_COUNTS: Record<keyof Look, number> = {
  style: STYLE_NAMES.length, hair: HAIR_COLS.length, skin: SKINS.length, outfit: OUTFITS.length,
};

export const DEFAULT_LOOK: Look = { style: 0, hair: 0, skin: 0, outfit: 0 };

/** A look with every field a whole number in range (bad or missing → 0). */
export function cleanLook(v: unknown): Look {
  const o = (v ?? {}) as Record<string, unknown>;
  const out = { ...DEFAULT_LOOK };
  for (const k of LOOK_KEYS) {
    const n = Math.floor(Number(o[k]));
    out[k] = Number.isFinite(n) && n >= 0 && n < LOOK_COUNTS[k] ? n : 0;
  }
  return out;
}

/** Options not on offer yet (set by achievements.ts): stepping skips them. */
export const lookLocks: Partial<Record<keyof Look, (i: number) => boolean>> = {};

/** Step one field of a look, wrapping around (past any locked option). */
export function stepLook(l: Look, k: keyof Look, d: number): Look {
  const n = LOOK_COUNTS[k];
  let v = l[k];
  for (let i = 0; i < n; i++) { v = (v + d + n) % n; if (!lookLocks[k]?.(v)) break; }
  return { ...l, [k]: v };
}

/** A short key for caching baked frames. */
export const lookKey = (l: Look): string => `${l.style}.${l.hair}.${l.skin}.${l.outfit}`;

/** Palette overrides for a look (the archer's palette letters). */
export function lookPalette(l: Look): Record<string, string> {
  const [h, H] = HAIR_COLS[l.hair], [s, S] = SKINS[l.skin], [t, T, c, C] = OUTFITS[l.outfit];
  return { h, H, s, S, k: s, t, T, c, C };
}

const STORE = 'archer-game:look';
let mine: Look | null = null;

/** This player's look (kept on this device). */
export function myLook(): Look {
  if (mine) return mine;
  try { mine = cleanLook(JSON.parse(localStorage.getItem(STORE) ?? 'null')); } catch { mine = { ...DEFAULT_LOOK }; }
  return mine;
}

/** Change this player's look (and keep it). */
export function setMyLook(l: Look): Look {
  mine = cleanLook(l);
  try { localStorage.setItem(STORE, JSON.stringify(mine)); } catch { /* no storage */ }
  onLook?.(mine);
  return mine;
}

/** Called when your look changes (net.ts shares it with the room). */
let onLook: ((l: Look) => void) | null = null;
export const watchLook = (fn: (l: Look) => void): void => { onLook = fn; };
