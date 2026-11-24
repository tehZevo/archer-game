import { ctx } from './canvas';
import { text } from './font';
import { archerFrame, archerFrames, ARCHER_H, ARCHER_W } from './archer';
import { HAIR_COLS, LOOK_KEYS, myLook, OUTFITS, SKINS, STYLE_NAMES, type Look } from './look';
import { ST_H, ST_ROW, ST_ROWS_W, ST_TOP, ST_W, stylist, stylistBox, STYLIST_ROWS } from './stylist';

const GOLD = '#ffd166', HI = '#eaf2ff', DIM = '#8ea3c2';

/** What a look row shows: the style's name, or a swatch of the colour. */
function value(l: Look, k: keyof Look): { label: string; col?: string } {
  if (k === 'style') return { label: STYLE_NAMES[l.style] };
  const col = k === 'hair' ? HAIR_COLS[l.hair][0] : k === 'skin' ? SKINS[l.skin][0] : OUTFITS[l.outfit][0];
  return { label: `${l[k] + 1}`, col };
}

/** The stylist's window (screen space, over a dimmed view): the rows on the
 *  left, your archer, big, on the right. */
export function drawStylist(w: number, h: number): void {
  const l = myLook(), b = stylistBox(w, h);
  ctx.fillStyle = '#050a14c8'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#101a2e'; ctx.fillRect(b.x, b.y, ST_W, ST_H);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.strokeRect(b.x + 0.5, b.y + 0.5, ST_W - 1, ST_H - 1);
  text(ctx, 'YOUR LOOK', b.x + ST_ROWS_W / 2, b.y + 6, 1, GOLD, 'center');
  STYLIST_ROWS.forEach((name, i) => {
    const y = b.y + ST_TOP + i * ST_ROW, sel = stylist.sel === i, k = LOOK_KEYS[i];
    if (sel) { ctx.strokeStyle = GOLD; ctx.strokeRect(b.x + 4.5, y - 3.5, ST_ROWS_W - 8, 13); }
    if (!k) { text(ctx, name, b.x + ST_ROWS_W / 2, y, 1, sel ? GOLD : HI, 'center'); return; }
    text(ctx, name, b.x + 9, y, 1, DIM, 'left');
    const v = value(l, k), R = b.x + ST_ROWS_W - 9;
    text(ctx, '<', R - 44, y, 1, sel ? GOLD : DIM, 'left');
    text(ctx, '>', R, y, 1, sel ? GOLD : DIM, 'right');
    if (v.col) { ctx.fillStyle = '#000'; ctx.fillRect(R - 28, y - 1, 16, 9); ctx.fillStyle = v.col; ctx.fillRect(R - 27, y, 14, 7); }
    else text(ctx, v.label, R - 20, y, 1, HI, 'center');
  });
  // the preview: idle, three times the size
  const f = archerFrame(archerFrames(l), 'idle', performance.now() / 1000), k = 3;
  const px = b.x + ST_ROWS_W + (ST_W - ST_ROWS_W - ARCHER_W * k) / 2, py = b.y + (ST_H - ARCHER_H * k) / 2;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(f, Math.round(px), Math.round(py), ARCHER_W * k, ARCHER_H * k);
  text(ctx, 'ARROWS CHANGE  ESC DONE', b.x + ST_W / 2, b.y + ST_H - 11, 1, DIM, 'center');
}
