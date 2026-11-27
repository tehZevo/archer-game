import { ctx } from './canvas';
import { game } from './state';
import { text } from './font';
import { art } from './artsheets';
import { wallet } from './economy';
import { PET_SHOP_ROWS, pet, PET_KINDS, petCustoms, petShop, petShopScroll, SHOP_ROWS, type PetKind, type ShopRow } from './pets';

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

/** A pet row's status: what you'd pay, or that you own it (and whether it's with you). */
function status(kind: PetKind): [string, string] {
  if (pet.kind === kind) return ['WITH YOU', MINE];
  if (pet.owned.includes(kind)) return ['OWNED', DIM];
  const price = PET_KINDS[kind].price;
  return [`${price}G`, wallet.coins >= price ? GOLD : POOR];
}

/** What Z does on the selected row. */
function action(row: ShopRow): string {
  if (row.type === 'custom') return 'Z TOGGLE';
  if (pet.kind === row.kind) return 'Z SEND HOME';
  return pet.owned.includes(row.kind) ? 'Z CALL' : 'Z BUY';
}

/** The line under the list: what the highlighted row is / does. */
function caption(row: ShopRow): string {
  return row.type === 'pet' ? PET_KINDS[row.kind].desc : row.desc;
}

/** The pet keeper's window (screen space): one scrollable list — every pet
 *  (sprite, price/owned) then the global customizations — navigated with
 *  up/down; Z acts on the highlighted row. */
export function drawPetShop(): void {
  const { w, h } = game.view;
  ctx.fillStyle = '#050a14c8'; ctx.fillRect(0, 0, w, h);
  const row = SHOP_ROWS[petShop.sel];
  const ROW = 18, bw = 196, bh = 40 + PET_SHOP_ROWS * ROW;
  const bx = Math.round((w - bw) / 2), by = Math.round((h - bh) / 2);
  ctx.fillStyle = '#101a2e'; ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  text(ctx, 'PET KEEPER', w / 2, by + 6, 1, GOLD, 'center');
  text(ctx, `${wallet.coins}G`, bx + bw - 6, by + 6, 1, GOLD, 'right');
  const now = performance.now() / 1000, c = petCustoms();
  const top = petShopScroll();
  SHOP_ROWS.slice(top, top + PET_SHOP_ROWS).forEach((r, vi) => {
    const i = top + vi, y = by + 22 + vi * ROW, sel = petShop.sel === i;
    if (sel) { ctx.strokeStyle = GOLD; ctx.strokeRect(bx + 4.5, y - 1.5, bw - 9, ROW - 1); }
    if (r.type === 'pet') {
      // the selected pet flaps; the rest hold still
      const s = petSprite(r.kind, sel ? now : 0);
      ctx.drawImage(s, Math.round(bx + 16 - s.width / 2), Math.round(y + (ROW - 2 - s.height) / 2));
      text(ctx, PET_KINDS[r.kind].name, bx + 30, y + 4, 1, HI, 'left');
      const [label, col] = status(r.kind);
      text(ctx, label, bx + bw - 9, y + 4, 1, col, 'right');
    } else {
      const on = c[r.key];
      text(ctx, r.label, bx + 14, y + 4, 1, on ? MINE : DIM, 'left');
      text(ctx, on ? 'ON' : 'OFF', bx + bw - 12, y + 4, 1, on ? MINE : POOR, 'right');
    }
  });
  // little arrows show there are more rows above / below the list
  ctx.fillStyle = DIM;
  if (top > 0) for (let k = 0; k < 3; k++) ctx.fillRect(bx + bw - 7 - k, by + 20 - k, 2 * k + 1, 1);
  if (top + PET_SHOP_ROWS < SHOP_ROWS.length) for (let k = 0; k < 3; k++) ctx.fillRect(bx + bw - 7 - k, by + 22 + PET_SHOP_ROWS * ROW - 2 + k, 2 * k + 1, 1);
  text(ctx, `${action(row)}   ESC CLOSE`, w / 2, by + bh - 14, 1, DIM, 'center');
  text(ctx, caption(row), w / 2, by + bh - 3, 1, '#5d708f', 'center');
}
