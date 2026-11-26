import { ctx } from './canvas';
import { game, player } from './state';
import { labelShadow, text, textWidth } from './font';
import { SKILLS } from './config';
import { activeSkill } from './progress';
import { keyName } from './input';
import { gearDrops } from './gear';
import { drops, FLY_T, flying, npcNear, RESPEC_PRICES, shop, shopStock, TRAINER_ITEMS, TRAINER_SLOTS, trainer, wallet } from './economy';
import { board, boardRows, isDone, QUEST_MAX, quests } from './quests';
import type { Npc } from './types';
import { art } from './artsheets';
import { npcFrame } from './npcart';

/* Coins, town NPCs and the shop window (drawing only; see economy.ts). */

const GOLD = '#ffd166', DARK_GOLD = '#c9952f', HI = '#eaf2ff', DIM = '#8ea3c2';

/** A coin pile: 1-3 stacked coins by value. Landed piles bob slowly up and
 *  down; a pile blinks before it fades; picked-up piles fly into you. */
export function drawCoins(): void {
  const now = performance.now() / 1000;
  for (const c of drops) {
    if (c.t < 5 && Math.floor(c.t * 6) % 2 === 0) continue;
    // a slow 2px bob, each pile in its own phase
    const bob = c.landed ? Math.round((Math.sin(now * 2.2 + c.x * 0.37) - 1) * 1.5) : 0;
    pile(c.x, c.y + bob, c.v);
  }
  // flying: ease from where it lay to your chest, shrinking to one coin
  const tx = player.x, ty = player.y + player.h / 2;
  for (const f of flying) {
    const k = Math.min(1, f.t / FLY_T), e = k * k * (3 - 2 * k);
    pile(f.x + (tx - f.x) * e, f.y + (ty - f.y) * e - Math.sin(k * Math.PI) * 8, k > 0.5 ? 1 : f.v);
  }
}

function pile(px: number, py: number, v: number): void {
  const n = v >= 20 ? 3 : v >= 8 ? 2 : 1;
  const x = Math.round(px), y = Math.round(py);
  for (let i = 0; i < n; i++) {
    const cx = x - 3 + (i - (n - 1) / 2) * 4, cy = y - 4 - (i % 2) * 2;
    ctx.fillStyle = DARK_GOLD; ctx.fillRect(Math.round(cx), cy, 5, 4);
    ctx.fillStyle = GOLD; ctx.fillRect(Math.round(cx) + 1, cy, 3, 3);
  }
}

/** Gear lying on the floor: a small crate-coloured tile with its name above
 *  it, blinking out the way a coin pile does. */
export function drawGearDrops(): void {
  for (const d of gearDrops) {
    if (d.t < 5 && Math.floor(d.t * 6) % 2 === 0) continue;
    const x = Math.round(d.x), y = Math.round(d.y);
    const col = d.item.kind === 'weapon' ? '#c9a26a' : '#8ea3c2';
    ctx.fillStyle = '#00000080'; ctx.fillRect(x - 5, y - 8, 11, 11);
    ctx.fillStyle = col; ctx.fillRect(x - 4, y - 7, 9, 9);
    ctx.fillStyle = '#00000060'; ctx.fillRect(x - 2, y - 5, 5, 5);
    const label = `${d.item.name} Lv.${d.item.lvl}`;
    labelShadow(ctx);
    text(ctx, label, x - textWidth(label) / 2, y - 18, 1, col, 'left');
    labelShadow(ctx, false);
  }
}

export function drawNpcs(): void {
  const near = npcNear();
  for (const n of game.floor.npcs ?? []) drawNpc(n, n === near);
}

/** Town NPCs (see npcart.ts): idling, and waving at you when you can talk
 *  to them; the quest board just stands there. */
function drawNpc(n: Npc, near: boolean): void {
  const sprite = n.kind === 'board' ? art('npc/board')
    : art(`npc/${n.kind}/${npcFrame(performance.now() / 1000, near, (n.x * 0.37) % 4)}`);
  ctx.drawImage(sprite, Math.round(n.x - sprite.width / 2), Math.round(n.y - sprite.height + 1));
  labelShadow(ctx);
  text(ctx, near ? `UP: ${n.name}` : n.name, Math.round(n.x), Math.round(n.y - sprite.height - 8), 1, near ? GOLD : '#e6d6ff', 'center');
  labelShadow(ctx, false);
}

/** The trainer's window (screen space): the three skill slots, each showing
 *  what is on it now, and the full reset below them. */
export function drawTrainer(): void {
  const { w, h } = game.view;
  ctx.fillStyle = '#050a14c8'; ctx.fillRect(0, 0, w, h);
  const bw = 208, bh = 108, bx = Math.round((w - bw) / 2), by = Math.round((h - bh) / 2);
  ctx.fillStyle = '#101a2e'; ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  text(ctx, 'TRAINER', w / 2, by + 6, 1, GOLD, 'center');
  text(ctx, `${wallet.coins}G`, bx + bw - 6, by + 6, 1, GOLD, 'right');
  TRAINER_ITEMS.forEach((label, i) => {
    const y = by + 24 + i * 14, sel = trainer.sel === i;
    const slot = TRAINER_SLOTS[i];
    const now = slot ? SKILLS[activeSkill(slot.slot).key].name : 'all AP and SP';
    const cost = slot ? RESPEC_PRICES.swap : RESPEC_PRICES.reset;
    if (sel) { ctx.strokeStyle = GOLD; ctx.strokeRect(bx + 4.5, y - 3.5, bw - 9, 13); }
    text(ctx, `${label}  ${slot ? '> ' : '> '}${now}`, bx + 9, y, 1, HI, 'left');
    text(ctx, `${cost}G`, bx + bw - 9, y, 1, wallet.coins >= cost ? GOLD : '#e07a8a', 'right');
  });
  text(ctx, 'Z PICK   ESC CLOSE', w / 2, by + bh - 12, 1, DIM, 'center');
}

/** The quest board's window: your quests (with progress), then postings. */
export function drawBoard(): void {
  const { w, h } = game.view;
  ctx.fillStyle = '#050a14c8'; ctx.fillRect(0, 0, w, h);
  const rows = boardRows();
  const bw = 232, bh = 52 + Math.max(1, rows.length) * 14, bx = Math.round((w - bw) / 2), by = Math.round((h - bh) / 2);
  ctx.fillStyle = '#101a2e'; ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  text(ctx, 'QUEST BOARD', w / 2, by + 6, 1, GOLD, 'center');
  text(ctx, `${quests.length}/${QUEST_MAX}`, bx + bw - 6, by + 6, 1, DIM, 'right');
  if (!rows.length) text(ctx, 'NO POSTINGS HERE', w / 2, by + 24, 1, DIM, 'center');
  rows.forEach(({ q, active }, i) => {
    const y = by + 24 + i * 14;
    if (board.sel === i) { ctx.strokeStyle = GOLD; ctx.strokeRect(bx + 4.5, y - 3.5, bw - 9, 13); }
    const tag = active === null ? 'NEW' : isDone(q) ? 'DONE' : `${q.have}/${q.need}`;
    const col = active === null ? DIM : isDone(q) ? '#9be89b' : HI;
    text(ctx, `${tag}  ${active === null ? `${q.need} ` : ''}${q.mob}`, bx + 9, y, 1, col, 'left');
    text(ctx, `${q.exp}XP ${q.coins}G`, bx + bw - 9, y, 1, GOLD, 'right');
  });
  const r = rows[board.sel];
  const hint = !r ? 'ESC CLOSE' : r.active === null ? 'Z TAKE   ESC CLOSE' : isDone(r.q) ? 'Z TURN IN   X DROP   ESC' : 'X DROP   ESC CLOSE';
  text(ctx, hint, w / 2, by + bh - 12, 1, DIM, 'center');
}

/** HUD lines for your active quests: [text, finished]. */
export const questLines = (): [string, boolean][] =>
  quests.map((q) => [isDone(q) ? `${q.mob} DONE` : `${q.mob} ${q.have}/${q.need}`, isDone(q)]);

/** The wallet line for the HUD: coins, then potions with their keys. */
export const walletLine = (): string => `${wallet.coins}G  ${keyName('a')}:HP ${wallet.hp}  ${keyName('s')}:MP ${wallet.mp}`;

/** The shop window (screen space). */
export function drawShop(): void {
  const { w, h } = game.view;
  ctx.fillStyle = '#050a14c8'; ctx.fillRect(0, 0, w, h);
  const bw = 168, bh = 114, bx = Math.round((w - bw) / 2), by = Math.round((h - bh) / 2);
  ctx.fillStyle = '#101a2e'; ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  text(ctx, 'SHOP', w / 2, by + 6, 1, GOLD, 'center');
  text(ctx, `${wallet.coins}G`, bx + bw - 6, by + 6, 1, GOLD, 'right');
  const stock = shopStock();
  stock.forEach((it, i) => {
    const y = by + 22 + i * 14, sel = shop.sel === i;
    if (sel) { ctx.strokeStyle = GOLD; ctx.strokeRect(bx + 4.5, y - 3.5, bw - 9, 13); }
    const afford = wallet.coins >= it.price;
    text(ctx, it.key ? `${it.name} - ${keyName(it.key)}` : it.name, bx + 9, y, 1, HI, 'left');
    if (it.kind === 'hp' || it.kind === 'mp') text(ctx, `x${wallet[it.kind]}`, bx + 112, y, 1, DIM, 'left');
    text(ctx, `${it.price}G`, bx + bw - 9, y, 1, afford ? GOLD : '#e07a8a', 'right');
  });
  text(ctx, 'Z BUY   ESC CLOSE', w / 2, by + bh - 24, 1, DIM, 'center');
  text(ctx, stock[shop.sel].desc, w / 2, by + bh - 12, 1, '#5d708f', 'center');
}
