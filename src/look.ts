/* ============================================================
   LOOK
   How your archer looks: a body type, hair style, hair colour, skin
   tone, outfit and hat, each a plain index into the lists below.
   Hats (hatart.ts) are bought from a town stylist, never at creation. The first
   BASIC styles and colours are open to everyone; the rest are each
   offered by one town's stylist (see townlooks.ts). It's kept on this
   device (like your name) and sent to the other players in the room
   along with your name, so they see you as you made yourself.
   ============================================================ */

import { HATS } from './hatart';

export interface Look { body: number; style: number; hair: number; skin: number; outfit: number; hat: number }

export const BODY_NAMES = ['FEMALE', 'MALE'] as const;

/** Hair colours: [hair, shadow]. */
export const HAIR_COLS: readonly [string, string][] = [
  ['#f6dc8a', '#d4a94e'], // blonde
  ['#9a6440', '#6a4228'], // brown
  ['#454a5c', '#2a2d3a'], // black
  ['#e0703e', '#a8482a'], // red
  ['#dfe4ec', '#a6aec0'], // silver
  ['#f29ac0', '#c46a92'], // pink
  ['#6fd8c8', '#3e9e92'], // teal
  // the rest are offered by town stylists (townlooks.ts)
  ['#a8442a', '#7a2e1c'], // auburn
  ['#f4f0e0', '#c8c0a8'], // platinum
  ['#3a4a8a', '#262f5e'], // navy
  ['#c0a0f0', '#8a70c0'], // lavender
  ['#a0f0c0', '#68b88a'], // mint
  ['#f0a040', '#c07020'], // orange
  ['#c02040', '#88142c'], // crimson
  ['#4a8a3a', '#2e5e24'], // moss
  ['#80c8ff', '#4a90d0'], // sky
  ['#ffffff', '#c8d0e0'], // snow
  ['#6a3a20', '#48240f'], // chestnut
  ['#ffd040', '#d0a020'], // gold
  ['#8040c0', '#582890'], // violet
  ['#e0c898', '#b09a6a'], // sand
  ['#e06080', '#a84060'], // rose
  ['#7080a0', '#4a5470'], // slate
  ['#ff6020', '#c03a10'], // ember
  ['#c87838', '#985020'], // copper
  ['#ffc0a0', '#d89878'], // peach
  ['#4a2a6a', '#2e1a44'], // void
  ['#b0aca8', '#7a7672'], // ash
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

/** Hair styles (see archer.ts); CROP onward are cut for the male build, but anyone can wear them. */
export const STYLE_NAMES = ['SWEPT', 'SHORT', 'LONG', 'CROP', 'SPIKY', 'SLICKED', 'BUN', 'PONYTAIL'] as const;

/** How many styles and hair colours everyone has; the rest come from town stylists. */
export const BASIC: Partial<Record<keyof Look, number>> = { style: 4, hair: 7 };

/** Hat names, by look.hat (0: none). */
export const HAT_NAMES = ['NONE', ...HATS.map((h) => h.name)];

export const LOOK_KEYS = ['style', 'hair', 'skin', 'outfit', 'hat'] as const;
export const LOOK_COUNTS: Record<keyof Look, number> = {
  body: BODY_NAMES.length, style: STYLE_NAMES.length, hair: HAIR_COLS.length, skin: SKINS.length, outfit: OUTFITS.length, hat: HAT_NAMES.length,
};

export const DEFAULT_LOOK: Look = { body: 0, style: 0, hair: 0, skin: 0, outfit: 0, hat: 0 };

/** A look with every field a whole number in range (bad or missing → 0). */
export function cleanLook(v: unknown): Look {
  const o = (v ?? {}) as Record<string, unknown>;
  const out = { ...DEFAULT_LOOK };
  for (const k of ['body', ...LOOK_KEYS] as const) {
    const n = Math.floor(Number(o[k]));
    out[k] = Number.isFinite(n) && n >= 0 && n < LOOK_COUNTS[k] ? n : 0;
  }
  return out;
}

/** Options not on offer yet (set by achievements.ts): stepping skips them. */
export const lookLocks: Partial<Record<keyof Look, (i: number) => boolean>> = {};

/** Step one field of a look, wrapping around, past any option that's locked
 *  or (if `offered` is given) not on offer here. */
export function stepLook(l: Look, k: keyof Look, d: number, offered?: (k: keyof Look, i: number) => boolean): Look {
  const n = LOOK_COUNTS[k];
  let v = l[k];
  for (let i = 0; i < n; i++) { v = (v + d + n) % n; if (!lookLocks[k]?.(v) && (offered?.(k, v) ?? true)) break; }
  return { ...l, [k]: v };
}

/** A short key for caching baked frames. */
export const lookKey = (l: Look): string => `${l.body}.${l.style}.${l.hair}.${l.skin}.${l.outfit}.${l.hat}`;

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
