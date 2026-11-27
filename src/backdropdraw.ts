import { BACKDROPS, backdropFor, LAYER, PARALLAX, particlesAt } from './backdrop';
import { art } from './artsheets';

/* ============================================================
   BACKDROP DRAWING
   Bakes each area's two parallax layers (see backdrop.ts) into a
   LAYER x LAYER canvas once, then tiles them behind the floor, offset
   by a fraction of the camera so they drift slower than the platforms.
   Particles are drawn last, in view space.
   ============================================================ */

const baked = new Map<string, HTMLCanvasElement[]>();

/** An area's two layers (baked, see artsheets.ts). */
function bake(area: string): HTMLCanvasElement[] {
  const key = BACKDROPS[area] ? area : 'Harbor';
  return [art(`backdrop/${key}/far`), art(`backdrop/${key}/mid`)];
}

/** Draw an area's backdrop layers and particles over the sky, for a camera at (cx, cy). */
export function drawBackdrop(ctx: CanvasRenderingContext2D, area: string, cx: number, cy: number, w: number, h: number, t: number): void {
  let layers = baked.get(area);
  if (!layers) { layers = bake(area); baked.set(area, layers); }
  layers.forEach((c, i) => {
    const ox = -(((Math.round(cx * PARALLAX[i]) % LAYER) + LAYER) % LAYER);
    const oy = -(((Math.round(cy * PARALLAX[i]) % LAYER) + LAYER) % LAYER);
    for (let y = oy; y < h; y += LAYER) for (let x = ox; x < w; x += LAYER) ctx.drawImage(c, x, y);
  });
  const pt = backdropFor(area).particles;
  if (!pt) return;
  for (const p of particlesAt(pt, t, w, h)) { ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h); }
}
