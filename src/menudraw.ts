import { ctx } from './canvas';
import { game, player } from './state';
import { text } from './font';
import { autoChannel, items, menu, MENU_ROW, MENU_TOP, MENU_W, MENU_X, type ItemId } from './menu';
import { CODE_LEN, lobbyCounts, MAX_PER_CHANNEL } from './net';
import { hasSave } from './save';

/* The main menu, drawn on the canvas over the frozen world. */

const GOLD = '#ffd166', HI = '#eaf2ff', DIM = '#8ea3c2', TEAL = '#4fd8c4', RED = '#e07a8a';

const HINT: Record<ItemId, string> = {
  play: 'PLAY ON THE PUBLIC CHANNELS',
  channel: '< > PICK A CHANNEL   Z PLAY',
  code: 'TYPE A CODE   ENTER JOINS',
  create: 'MAKE A CODE FOR FRIENDS',
  name: 'Z TO RENAME   ENTER SAVES',
  reset: 'ERASE YOUR SAVE: LV 1 AGAIN',
};

export function drawMenu(): void {
  const { w, h } = game.view;
  ctx.fillStyle = '#070c16c8'; ctx.fillRect(0, 0, w, h);
  text(ctx, 'THE ARCHER', w / 2, 10, 2, GOLD, 'center');
  text(ctx, 'CLIMB THE TOWER', w / 2, 28, 1, DIM, 'center');
  text(ctx, hasSave() ? `LV ${player.level} · FLOOR ${menu.floor}` : 'A NEW ADVENTURE', w / 2, 38, 1, HI, 'center');

  const blink = Math.floor(performance.now() / 400) % 2 === 0;
  const counts = lobbyCounts(menu.floor);
  items().forEach((it, i) => {
    const y = MENU_TOP + i * MENU_ROW, sel = menu.sel === i;
    if (sel) {
      ctx.fillStyle = '#16223a'; ctx.fillRect(MENU_X, y - 3, MENU_W, MENU_ROW - 1);
      ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.strokeRect(MENU_X + 0.5, y - 2.5, MENU_W - 1, MENU_ROW - 2);
    }
    const L = MENU_X + 5, R = MENU_X + MENU_W - 5;
    const caret = (on: boolean): string => (on && blink ? '_' : '');
    switch (it) {
      case 'play':
        text(ctx, 'PLAY', w / 2, y, 1, GOLD, 'center');
        break;
      case 'channel': {
        const c = menu.channel || autoChannel(counts);
        const n = counts.get(c) ?? 0;
        const label = menu.channel ? `CH ${c}` : `AUTO: CH ${c}`;
        text(ctx, 'CHANNEL', L, y, 1, DIM, 'left');
        text(ctx, `< ${label} ${n}/${MAX_PER_CHANNEL} >`, R, y, 1, HI, 'right');
        break;
      }
      case 'code': {
        const editing = menu.edit === 'code';
        text(ctx, 'PRIVATE CODE', L, y, 1, DIM, 'left');
        const shown = menu.code || (editing ? '' : '-'.repeat(CODE_LEN));
        text(ctx, shown + caret(editing), R, y, 1, editing ? GOLD : TEAL, 'right');
        break;
      }
      case 'create':
        text(ctx, 'NEW PRIVATE CODE', w / 2, y, 1, HI, 'center');
        break;
      case 'name': {
        const editing = menu.edit === 'name';
        text(ctx, 'NAME', L, y, 1, DIM, 'left');
        text(ctx, menu.name + caret(editing), R, y, 1, editing ? GOLD : HI, 'right');
        break;
      }
      case 'reset':
        text(ctx, menu.confirmReset ? 'SURE? Z AGAIN TO ERASE' : 'RESET PROGRESS', w / 2, y, 1, RED, 'center');
        break;
    }
  });
  const note = menu.note || HINT[items()[menu.sel]];
  text(ctx, note, w / 2, h - 22, 1, menu.note ? GOLD : DIM, 'center');
  text(ctx, 'ARROWS MOVE   Z OR ENTER SELECT', w / 2, h - 11, 1, '#5d708f', 'center');
}
