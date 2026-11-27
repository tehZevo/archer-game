import { WORLD } from './config';
import { ctx } from './canvas';
import { game } from './state';
import { art } from './artsheets';
import { tilesetFor, type Tileset } from './tileset';
import { areaOf } from './world';
import { drawBackdrop } from './backdropdraw';
import { clamp } from './util';
import { portalOpen } from './boss';
import { labelShadow, text, textWidth } from './font';
import type { Portal } from './types';

import { levelCol } from './drawentities';

/* The world behind the action: the area backdrop and the portals. */

/** `?area=Cave` previews an area's tileset on any floor (e.g. one not on the map yet). */
const previewArea = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('area') : null;
/** The tileset of the floor being drawn. */
export const tileset = (): Tileset => tilesetFor(previewArea ?? areaOf(game.floor.place));

export function drawBackground(ts: Tileset): void {
  const { w, h } = game.view;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, ts.sky[0]); g.addColorStop(0.55, ts.sky[1]); g.addColorStop(1, ts.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // the area's parallax layers and drifting particles (towns use the area below them)
  drawBackdrop(ctx, ts.name, game.cam.x, game.cam.y, w, h, performance.now() / 1000);
}


/** The portal recoloured by a canvas filter, baked once per filter (a live
 *  ctx.filter is slow, often a CPU fallback). */
const portalTints = new Map<string, HTMLCanvasElement>();
function portalSprite(filter: string): HTMLCanvasElement {
  const s = art('portal');
  if (filter === 'none') return s;
  let c = portalTints.get(filter);
  if (!c) {
    c = document.createElement('canvas'); c.width = s.width; c.height = s.height;
    const g = c.getContext('2d')!;
    g.filter = filter;
    g.drawImage(s, 0, 0);
    portalTints.set(filter, c);
  }
  return c;
}

export function drawPortal(p: Portal): void {
  const s = art('portal');
  const down = !!p.down;
  // a way down glows a different colour; a sealed one (boss still up) is dark
  const filter = !portalOpen(p) ? 'grayscale(1) brightness(0.55)' : down ? 'hue-rotate(150deg)' : 'none';
  ctx.drawImage(portalSprite(filter), Math.round(p.x - s.width / 2), Math.round(p.y - s.height));
  if (p.label) {
    // centred over the portal, but kept inside the world (town names are long)
    const half = textWidth(p.label) / 2 + 2;
    const lx = clamp(p.x, half, WORLD.w - half);
    // a way up from town also says the level it's meant for (under the name),
    // coloured by how you measure up
    const ly = Math.round(p.y - s.height - (p.lvl ? 18 : 9));
    labelShadow(ctx);
    text(ctx, p.label, Math.round(lx), ly, 1, down ? '#8fe3c4' : '#e6d6ff', 'center');
    if (p.lvl) text(ctx, `LV.${p.lvl}+`, Math.round(lx), ly + 9, 1, levelCol(p.lvl), 'center');
    labelShadow(ctx, false);
  }
}
