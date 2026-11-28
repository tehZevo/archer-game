import { ctx } from './canvas';
import { game } from './state';
import { text } from './font';
import { art } from './artsheets';
import { wallet } from './economy';
import { seatHeight } from './chairart';
import { chair, CHAIR_KINDS, CHAIR_LIST, chairShop, type ChairKind } from './chairs';

/* The chair under a seated archer, and the chair merchant's window (drawing only; see chairs.ts). */

const GOLD = '#ffd166', HI = '#eaf2ff', DIM = '#8ea3c2', POOR = '#e07a8a', MINE = '#9be89b';

/** How far up a seated archer is drawn: her thighs on the seat (the sit
 *  frame's thighs end 4px above its feet). */
export const sitLift = (kind: ChairKind): number => seatHeight(kind) - 4;

/** A chair standing at (x, feet), its back behind you as you face. */
export function drawChair(kind: ChairKind, x: number, feet: number, face: number): void {
  const s = art(`chair/${kind}`, face < 0);
  ctx.drawImage(s, Math.round(x) - s.width / 2, Math.round(feet) - s.height);
}

/** The chair merchant's window (screen space): the four chairs, cheapest
 *  first, with their prices (or YOURS on the one you carry). */
export function drawChairShop(): void {
  const { w, h } = game.view;
  ctx.fillStyle = '#050a14c8'; ctx.fillRect(0, 0, w, h);
  const ROW = 26, bw = 184, bh = 44 + CHAIR_LIST.length * ROW;
  const bx = Math.round((w - bw) / 2), by = Math.round((h - bh) / 2);
  ctx.fillStyle = '#101a2e'; ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  text(ctx, 'CHAIRS', w / 2, by + 6, 1, GOLD, 'center');
  text(ctx, `${wallet.coins}G`, bx + bw - 6, by + 6, 1, GOLD, 'right');
  CHAIR_LIST.forEach((kind, i) => {
    const y = by + 20 + i * ROW, def = CHAIR_KINDS[kind];
    if (chairShop.sel === i) { ctx.strokeStyle = GOLD; ctx.strokeRect(bx + 4.5, y - 0.5, bw - 9, ROW - 1); }
    // each chair stands on the row's floor (the throne just fits)
    const s = art(`chair/${kind}`);
    ctx.drawImage(s, bx + 8, y + ROW - 3 - s.height);
    text(ctx, def.name, bx + 30, y + 9, 1, HI, 'left');
    const mine = chair.kind === kind;
    text(ctx, mine ? 'YOURS' : `${def.price}G`, bx + bw - 9, y + 9, 1, mine ? MINE : wallet.coins >= def.price ? GOLD : POOR, 'right');
  });
  const sel = CHAIR_LIST[chairShop.sel];
  text(ctx, `${chair.kind === sel ? 'F TO SIT' : 'Z BUY'}   ESC CLOSE`, w / 2, by + bh - 20, 1, DIM, 'center');
  text(ctx, CHAIR_KINDS[sel].desc, w / 2, by + bh - 9, 1, '#5d708f', 'center');
}
