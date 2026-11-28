import { ctx } from './canvas';
import { game } from './state';
import { pressed } from './input';
import { text } from './font';
import { dev } from './dev';
import { lastTown, townById } from './world';
import { revive, reviveInPlace } from './combat';

/* ============================================================
   DEATH DIALOG
   When the archer is knocked out and her tombstone animation finishes,
   this asks where she wakes up: back in town, or (in dev mode) right
   where she fell. It holds the world still, like the other windows.
   Up/Down picks, Z/Enter/Space takes it.
   ============================================================ */

export const deathUi = {
  open: false,
  /** 0 = Return to town, 1 = Revive in place (dev only). */
  sel: 0,
};

/** Ask where to revive; the world stays frozen until an option is taken. */
export function openDeath(): void {
  deathUi.open = true;
  deathUi.sel = 0;
}

export function closeDeath(): void { deathUi.open = false; }

/** The dialog's keys: Up/Down flips, Z/Enter/Space takes it. */
export function deathInput(): void {
  const n = dev.on ? 2 : 1;
  if (pressed('up') || pressed('down')) deathUi.sel = (deathUi.sel + 1) % n;
  if (pressed('z') || pressed('enter') || pressed(' ')) {
    if (deathUi.sel === 1) reviveInPlace(); else revive();
    closeDeath();
  }
}

/** The panel itself, centred over the world. */
export function drawDeath(): void {
  const { w, h } = game.view;
  ctx.save();
  ctx.fillStyle = '#050a14e0'; ctx.fillRect(0, 0, w, h);
  const rows: string[] = [`Return to ${townById(lastTown(game.floor.place)).name}`];
  if (dev.on) rows.push('Revive in place');
  const bw = 260, bh = 34 + rows.length * 20, x = (w - bw) / 2, y = (h - bh) / 2;
  ctx.fillStyle = '#101c30'; ctx.fillRect(x, y, bw, bh);
  ctx.strokeStyle = '#3a5a80'; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, bh);
  text(ctx, 'YOU DIED', w / 2, y + 8, 1, '#ff9f9f', 'center');
  rows.forEach((label, i) => {
    const on = i === deathUi.sel;
    const ry = y + 26 + i * 20;
    ctx.fillStyle = on ? '#1c3550' : '#00000000';
    if (on) ctx.fillRect(x + 8, ry - 4, bw - 16, 16);
    text(ctx, (on ? '> ' : '  ') + label, w / 2, ry, 1, on ? '#8fe3c4' : '#dbe6f5', 'center');
  });
  ctx.restore();
}
