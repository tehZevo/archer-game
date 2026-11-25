import { ctx } from './canvas';
import { text } from './font';
import { ACH_ROWS, achScroll, achUi, ACHIEVEMENTS, isDone, progress, rewardText } from './achievements';
import { fmtNum } from './util';

const GOLD = '#ffd166', HI = '#eaf2ff', DIM = '#8ea3c2', DONE = '#9be89b';
export const ACH_W = 216, ACH_ROW = 11, ACH_TOP = 18;
const achH = (): number => ACH_TOP + ACH_ROWS * ACH_ROW + 26;
export const achBox = (w: number, h: number): { x: number; y: number } =>
  ({ x: Math.round((w - ACH_W) / 2), y: Math.max(0, Math.round((h - achH()) / 2)) });

/** The achievements list (screen space): name and progress per row; the
 *  selected one's goal and reward underneath. */
export function drawAchievements(w: number, h: number): void {
  const b = achBox(w, h), H = achH();
  ctx.fillStyle = '#050a14c8'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#101a2e'; ctx.fillRect(b.x, b.y, ACH_W, H);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.strokeRect(b.x + 0.5, b.y + 0.5, ACH_W - 1, H - 1);
  const got = ACHIEVEMENTS.filter((a) => isDone(a.id)).length;
  text(ctx, `ACHIEVEMENTS ${got}/${ACHIEVEMENTS.length}`, b.x + ACH_W / 2, b.y + 5, 1, GOLD, 'center');
  const top = achScroll();
  ACHIEVEMENTS.slice(top, top + ACH_ROWS).forEach((a, vi) => {
    const i = top + vi, y = b.y + ACH_TOP + vi * ACH_ROW, sel = achUi.sel === i, done = isDone(a.id);
    if (sel) { ctx.strokeStyle = GOLD; ctx.strokeRect(b.x + 4.5, y - 2.5, ACH_W - 9, ACH_ROW); }
    text(ctx, a.name, b.x + 9, y, 1, done ? DONE : HI, 'left');
    text(ctx, done ? 'DONE' : `${fmtNum(progress(a))}/${fmtNum(a.goal)}`, b.x + ACH_W - 9, y, 1, done ? DONE : DIM, 'right');
  });
  const a = ACHIEVEMENTS[achUi.sel], fy = b.y + ACH_TOP + ACH_ROWS * ACH_ROW + 2;
  text(ctx, a.desc.toUpperCase(), b.x + ACH_W / 2, fy, 1, DIM, 'center');
  text(ctx, rewardText(a.reward) || 'NO REWARD', b.x + ACH_W / 2, fy + 10, 1, a.reward ? GOLD : '#5d708f', 'center');
}
