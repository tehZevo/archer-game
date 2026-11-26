import { ctx } from './canvas';
import { game } from './state';
import { pressed } from './input';
import { text } from './font';

/* ============================================================
   CONFIRM DIALOG
   A small yes/no prompt over the world (the return portal asks before
   it ships you back to town). It holds the world still while open, the
   same way the shop and the pause menu do. Up/Down picks, Z/Enter/Space
   takes it, Esc/X cancels.
   ============================================================ */

export const confirmUi = {
  open: false,
  /** True with Yes picked (the default), false with No. */
  yes: true,
  /** The line asking the question, e.g. "Return to Saltwick Port?". */
  title: '',
  /** What happens when Yes is taken. */
  onYes: () => {},
};

/** Ask the player about `title`; `onYes` runs when they say yes. */
export function openConfirm(title: string, onYes: () => void): void {
  confirmUi.open = true;
  confirmUi.yes = true;
  confirmUi.title = title;
  confirmUi.onYes = onYes;
}

/** The dialog's keys: Up/Down flips, Z/Enter/Space takes, Esc/X drops. */
export function confirmInput(): void {
  if (pressed('up') || pressed('down')) confirmUi.yes = !confirmUi.yes;
  if (pressed('z') || pressed('enter') || pressed(' ')) {
    const yes = confirmUi.yes;
    closeConfirm();
    if (yes) confirmUi.onYes();
    return;
  }
  if (pressed('escape') || pressed('x')) closeConfirm();
}

export function closeConfirm(): void { confirmUi.open = false; }

/** The panel itself, centred over the world. */
export function drawConfirm(): void {
  const { w, h } = game.view;
  ctx.save();
  ctx.fillStyle = '#050a14e0'; ctx.fillRect(0, 0, w, h);
  const bw = 260, bh = 96, x = (w - bw) / 2, y = (h - bh) / 2;
  ctx.fillStyle = '#101c30'; ctx.fillRect(x, y, bw, bh);
  ctx.strokeStyle = '#3a5a80'; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, bh);
  text(ctx, confirmUi.title, w / 2, y + 16, 1, '#ffd166', 'center');
  const rows: [string, boolean][] = [['YES', confirmUi.yes], ['NO', !confirmUi.yes]];
  rows.forEach(([label, on], i) => {
    const ry = y + 42 + i * 20;
    ctx.fillStyle = on ? '#1c3550' : '#00000000';
    if (on) ctx.fillRect(x + 8, ry - 4, bw - 16, 16);
    text(ctx, (on ? '> ' : '  ') + label, w / 2, ry, 1, on ? '#8fe3c4' : '#dbe6f5', 'center');
  });
  ctx.restore();
}
