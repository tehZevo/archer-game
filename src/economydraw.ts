import { ctx } from './canvas';
import { game, player } from './state';
import { text } from './font';
import { drops, FLY_T, flying, npcNear, PRICES, shop, SHOP_ITEMS, wallet } from './economy';
import type { Npc } from './types';

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

/* the shopkeeper: hat, face, apron (12 x 22) */
const PAL: Record<string, string> = { o: '#0d1424', h: '#7a4bb8', H: '#5a3590', s: '#f2d0a9', e: '#0d1424', c: '#3f9fdc', a: '#f4efe2', b: '#7a5232' };
const KEEPER = [
  '....oooo....',
  '...ohhhho...',
  '..ohhhhhho..',
  '.oHHHHHHHHo.',
  '..ossssso...',
  '..osesseso..',
  '..ossssso...',
  '...osssso...',
  '..occccco...',
  '.occaaaacco.',
  '.ocaaaaaaco.',
  '.ocaaaaaaco.',
  '.ocaaaaaaco.',
  '.ocaaaaaaco.',
  '.osaaaaaaso.',
  '..oaaaaaao..',
  '..occccco...',
  '..occ..cco..',
  '..occ..cco..',
  '..obb..bbo..',
  '.obbb..bbbo.',
  '............',
];
let keeper: HTMLCanvasElement | null = null;
function bakeKeeper(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 12; c.height = KEEPER.length;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  KEEPER.forEach((row, gy) => [...row].forEach((ch, gx) => {
    const col = PAL[ch];
    if (col) { x.fillStyle = col; x.fillRect(gx, gy, 1, 1); }
  }));
  return c;
}

export function drawNpcs(): void {
  const near = npcNear();
  for (const n of game.floor.npcs ?? []) drawNpc(n, n === near);
}

function drawNpc(n: Npc, near: boolean): void {
  keeper ??= bakeKeeper();
  const bob = Math.round(Math.sin(performance.now() / 500) * 0.6);
  ctx.drawImage(keeper, Math.round(n.x - 6), Math.round(n.y - keeper.height + 1 + bob));
  text(ctx, near ? 'UP: SHOP' : n.name, Math.round(n.x), Math.round(n.y - keeper.height - 8), 1, near ? GOLD : '#e6d6ff', 'center');
}

/** The wallet line for the HUD: coins, then potions with their keys. */
export const walletLine = (): string => `${wallet.coins}G  A:HP ${wallet.hp}  S:MP ${wallet.mp}`;

/** The shop window (screen space). */
export function drawShop(): void {
  const { w, h } = game.view;
  ctx.fillStyle = '#050a14c8'; ctx.fillRect(0, 0, w, h);
  const bw = 168, bh = 86, bx = Math.round((w - bw) / 2), by = Math.round((h - bh) / 2);
  ctx.fillStyle = '#101a2e'; ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  text(ctx, 'SHOP', w / 2, by + 6, 1, GOLD, 'center');
  text(ctx, `${wallet.coins}G`, bx + bw - 6, by + 6, 1, GOLD, 'right');
  SHOP_ITEMS.forEach((it, i) => {
    const y = by + 22 + i * 14, sel = shop.sel === i;
    if (sel) { ctx.strokeStyle = GOLD; ctx.strokeRect(bx + 4.5, y - 3.5, bw - 9, 13); }
    const afford = wallet.coins >= PRICES[it.kind];
    text(ctx, `${it.name} - ${it.key}`, bx + 9, y, 1, HI, 'left');
    text(ctx, `x${wallet[it.kind]}`, bx + 112, y, 1, DIM, 'left');
    text(ctx, `${PRICES[it.kind]}G`, bx + bw - 9, y, 1, afford ? GOLD : '#e07a8a', 'right');
  });
  text(ctx, 'Z BUY   ESC CLOSE', w / 2, by + bh - 24, 1, DIM, 'center');
  text(ctx, 'EACH RESTORES 40%', w / 2, by + bh - 12, 1, '#5d708f', 'center');
}
