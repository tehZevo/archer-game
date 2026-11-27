import type { SkillKey } from './types';
import { PAL } from './iconpal';
import { ACTIVE_GLYPHS } from './iconactive';
import { PASSIVE_GLYPHS } from './iconpassive';

/* ============================================================
   SKILL ICONS
   One 10x10 icon per skill (upgrades and passives included),
   authored as 10x10 glyph grids over a shared dark tile and baked
   once at boot. '.' is transparent (shows the tile). Icons have this
   one size and are always drawn 1:1, never scaled.
   Glyphs: iconactive.ts / iconpassive.ts; colours: iconpal.ts.
   ============================================================ */

/** Every skill's glyph, by category (iconactive.ts, iconpassive.ts). */
const GLYPHS = { ...ACTIVE_GLYPHS, ...PASSIVE_GLYPHS } as Record<SkillKey, string[]>;

export const ICON_KEYS = Object.keys(GLYPHS) as SkillKey[];

/** The raw glyphs (for tests). */
export const ICON_GLYPHS = GLYPHS;

/** Icon size in px, the one and only (drawn 1:1 everywhere): the glyph grid is the icon. */
export const ICON = 10;
export const GLYPH = ICON;

function bake(glyph: string[]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = ICON; c.height = ICON;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  // the shared tile: a dark fill under the glyph
  x.fillStyle = '#14203a'; x.fillRect(0, 0, ICON, ICON);
  glyph.forEach((row, gy) => {
    for (let gx = 0; gx < GLYPH; gx++) {
      const col = PAL[row[gx]];
      if (col) { x.fillStyle = col; x.fillRect(gx, gy, 1, 1); }
    }
  });
  return c;
}

let baked: Record<SkillKey, HTMLCanvasElement> | null = null;
/** A skill's icon (baked on first use). */
export function skillIcon(k: SkillKey): HTMLCanvasElement {
  baked ??= Object.fromEntries(ICON_KEYS.map((key) => [key, bake(GLYPHS[key])])) as Record<SkillKey, HTMLCanvasElement>;
  return baked[k];
}
