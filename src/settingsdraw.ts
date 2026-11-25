import { ctx } from './canvas';
import { text } from './font';
import { SET_ROW, SET_TOP, SET_W, setH, SETTING_NAMES, SETTING_ROWS, settings, settingsBox, settingsUi, VOLUME_MAX, type SettingRow } from './settings';

const GOLD = '#ffd166', HI = '#eaf2ff', DIM = '#8ea3c2';

/** What a row shows on its right. */
export function settingValue(row: SettingRow): string {
  if (row === 'sound') return settings.sound ? `${settings.sound}/${VOLUME_MAX}` : 'OFF';
  if (row === 'dmgNums') return settings.dmgNums ? 'ON' : 'OFF';
  return '';
}

/** The settings window (screen space, over a dimmed view). */
export function drawSettings(w: number, h: number): void {
  const b = settingsBox(w, h), H = setH();
  ctx.fillStyle = '#050a14c8'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#101a2e'; ctx.fillRect(b.x, b.y, SET_W, H);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.strokeRect(b.x + 0.5, b.y + 0.5, SET_W - 1, H - 1);
  text(ctx, 'SETTINGS', b.x + SET_W / 2, b.y + 6, 1, GOLD, 'center');
  SETTING_ROWS.forEach((row, i) => {
    const y = b.y + SET_TOP + i * SET_ROW, sel = settingsUi.sel === i;
    if (sel) { ctx.strokeStyle = GOLD; ctx.strokeRect(b.x + 4.5, y - 3.5, SET_W - 9, 13); }
    if (row === 'done') { text(ctx, SETTING_NAMES[row], b.x + SET_W / 2, y, 1, sel ? GOLD : HI, 'center'); return; }
    text(ctx, SETTING_NAMES[row], b.x + 9, y, 1, DIM, 'left');
    const R = b.x + SET_W - 9;
    text(ctx, '<', R - 44, y, 1, sel ? GOLD : DIM, 'left');
    text(ctx, '>', R, y, 1, sel ? GOLD : DIM, 'right');
    text(ctx, settingValue(row), R - 20, y, 1, HI, 'center');
  });
  text(ctx, 'ARROWS CHANGE  ESC DONE', b.x + SET_W / 2, b.y + H - 11, 1, DIM, 'center');
}
