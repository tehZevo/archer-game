import { ctx } from './canvas';
import { game } from './state';
import { text } from './font';
import { art } from './artsheets';
import { wallet } from './economy';
import { PET_LIST } from './petart';
import { PET_SHOP_ROWS, pet, PET_CUSTOMS, PET_KINDS, petCustoms, petShop, petShopScroll } from './pets';

/* The pet following you, and the pet keeper's window (drawing only; see pets.ts). */

const GOLD = '#ffd166', HI = '#eaf2ff', DIM = '#8ea3c2', POOR = '#e07a8a', MINE = '#9be89b';

/** The pet's sprite for this moment: its two frames flap (or bob) in turn. */
const petSprite = (kind: string, t: number, flip = false): HTMLCanvasElement => art(`pet/${kind}/${Math.floor(t * 8) % 2}`, flip);

/** The pet following you, centred on where it flies, facing its way. */
export function drawPet(): void {
  if (!pet.kind) return;
  const s = petSprite(pet.kind, pet.anim, pet.face < 0);
  ctx.drawImage(s, Math.round(pet.x - s.width / 2), Math.round(pet.y - s.height / 2));
}

/** A row's status: what you'd pay, or that you own it (and whether it's with you). */
function status(kind: (typeof PET_LIST)[number]): [string, string] {
  if (pet.kind === kind) return ['WITH YOU', MINE];
  if (pet.owned.includes(kind)) return ['OWNED', DIM];
  const price = PET_KINDS[kind].price;
  return [`${price}G`, wallet.coins >= price ? GOLD : POOR];
}

/** What Z does on the selected row. */
function action(kind: (typeof PET_LIST)[number]): string {
  if (pet.kind === kind) return 'Z SEND HOME';
  return pet.owned.includes(kind) ? 'Z CALL' : 'Z BUY';
}

/** The pet keeper's window (screen space): every pet with its sprite, its
 *  price or whether you own it, and what the selected one does. When you own
 *  the selected pet, its four customizations show below (toggled with 1-4). */
export function drawPetShop(): void {
  const { w, h } = game.view;
  ctx.fillStyle = '#050a14c8'; ctx.fillRect(0, 0, w, h);
  const kind = PET_LIST[petShop.sel];
  const ROW = 18, bw = 196, bh = 78 + PET_LIST.length * ROW;
  const bx = Math.round((w - bw) / 2), by = Math.round((h - bh) / 2);
  ctx.fillStyle = '#101a2e'; ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  text(ctx, 'PET KEEPER', w / 2, by + 6, 1, GOLD, 'center');
  text(ctx, `${wallet.coins}G`, bx + bw - 6, by + 6, 1, GOLD, 'right');
  const now = performance.now() / 1000;
  PET_LIST.forEach((k, i) => {
    const y = by + 22 + i * ROW, sel = petShop.sel === i;
    if (sel) { ctx.strokeStyle = GOLD; ctx.strokeRect(bx + 4.5, y - 1.5, bw - 9, ROW - 1); }
    // the selected pet flaps; the rest hold still
    const s = petSprite(k, sel ? now : 0);
    ctx.drawImage(s, Math.round(bx + 16 - s.width / 2), Math.round(y + (ROW - 2 - s.height) / 2));
    text(ctx, PET_KINDS[k].name, bx + 30, y + 4, 1, HI, 'left');
    const [label, col] = status(k);
    text(ctx, label, bx + bw - 9, y + 4, 1, col, 'right');
  });
  // the customizations are global (shared by every pet) and always shown as a
  // scrollable list; 1-4 (or Left/Right + Z) toggle one, owned pet or not
  const foot = by + 22 + PET_LIST.length * ROW;
  const c = petCustoms();
  text(ctx, 'CUSTOMIZATIONS  1-4', w / 2, foot + 4, 1, GOLD, 'center');
  const top = petShopScroll();
  PET_CUSTOMS.slice(top, top + PET_SHOP_ROWS).forEach((row, vi) => {
    const i = top + vi, y = foot + 18 + vi * 11, on = c[row.key], sel = petShop.cSel === i;
    if (sel) { ctx.fillStyle = '#16223a'; ctx.fillRect(bx + 5, y - 3, bw - 10, 10); }
    text(ctx, `${i + 1}`, bx + 14, y, 1, DIM, 'left');
    text(ctx, row.label, bx + 28, y, 1, on ? MINE : DIM, 'left');
    text(ctx, on ? 'ON' : 'OFF', bx + bw - 12, y, 1, on ? MINE : POOR, 'right');
  });
  // little arrows show there are more customizations above / below the list
  ctx.fillStyle = DIM;
  if (top > 0) for (let k = 0; k < 3; k++) ctx.fillRect(bx + bw - 7 - k, foot + 16 - k, 2 * k + 1, 1);
  if (top + PET_SHOP_ROWS < PET_CUSTOMS.length) for (let k = 0; k < 3; k++) ctx.fillRect(bx + bw - 7 - k, foot + 16 + PET_SHOP_ROWS * 11 - 2 + k, 2 * k + 1, 1);
  text(ctx, `${action(kind)}   ESC CLOSE`, w / 2, foot + 18 + PET_SHOP_ROWS * 11 + 4, 1, DIM, 'center');
  text(ctx, PET_KINDS[kind].desc, w / 2, foot + 18 + PET_SHOP_ROWS * 11 + 17, 1, '#5d708f', 'center');
}
