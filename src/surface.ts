import { clamp } from './util';
import type { Platform } from './types';

/** The surface height (y) of a platform at world x. A slope tile is one half
 *  of a 2:1 slope: it rises 8px across the tile, the upper half starting 8px up. */
export function surfaceYAt(p: Platform, x: number): number {
  if (!p.slope) return p.y;
  const t = clamp((x - p.x) / p.w, 0, 1); // 0 at the tile's left edge
  const rise = p.dir === -1 ? 1 - t : t;  // 0 = low end, 1 = high end
  return p.y + p.h - (p.part ? 8 : 0) - rise * 8;
}
