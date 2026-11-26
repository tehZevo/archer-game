import { WORLD, TILE } from './config';
import type { Floor, Platform } from './types';

/* The world frame every floor shares: the height it's laid out in, the
   ground slab it stands on, and the trim that fits it to its content. */

/** Floors are laid out in a world this tall, then trimmed to fit (see Floor.h). */
export const GEN_H = 640;
const SKY_MARGIN = 2 * TILE; // clear sky kept above the portal
const MIN_H = 180;           // never shorter than the view
/** Towns are a few tiles taller than the view, so the camera follows you up
 *  to the deck and loft instead of sitting still (a one-screen town left it
 *  no room to move). */
export const TOWN_MIN_H = MIN_H + 4 * TILE;


/** Snap a coordinate to the tile grid. */
const snap = (v: number): number => Math.round(v / TILE) * TILE;

/** The full-width ground slab every floor stands on: 4 tiles, not a wall
 *  (it was 8, mostly unseen). */
export function groundSlab(): Platform {
  const h = 4 * TILE;
  return { x: 0, y: snap(GEN_H - h), w: WORLD.w, h, ground: true };
}

/** Trim the sky: shift everything up so the highest portal sits a couple of
 *  tiles under the top of the world, and size the floor to fit (never
 *  shorter than the view). Whole tiles, so the 16px grid stays put. */
export function trim(f: Floor): Floor {
  const { platforms, ropes, ladders, spawns, portals } = f;
  const top = Math.min(...portals.map((p) => p.y - p.h), ...platforms.map((p) => p.y)) - SKY_MARGIN;
  const shift = Math.max(0, Math.min(Math.floor(top / TILE) * TILE, GEN_H - (f.town ? TOWN_MIN_H : MIN_H)));
  for (const p of platforms) p.y -= shift;
  for (const c of [...ropes, ...ladders]) { c.y1 -= shift; c.y2 -= shift; }
  for (const s of spawns) { s.y -= shift; s.spots?.forEach((q) => { q.y -= shift; }); }
  for (const p of portals) p.y -= shift;
  for (const n of f.npcs ?? []) n.y -= shift;
  for (const d of f.decor ?? []) d.y -= shift;
  f.h = GEN_H - shift;
  return f;
}
