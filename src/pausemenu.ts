import { critChance, critMult, critOverflowPoints } from './combat';
import { ctx } from './canvas';
import { game, player } from './state';
import { STAT_INFO, STAT_KEYS } from './progress';
import { pauseSpend } from './windows';
import { armorSoak, bag, gear, weaponBonus } from './gear';
import type { GearItem } from './gear';
import { settingsTap, settingsUi } from './settings';
import { achUi } from './achievements';
import { text } from './font';
import { fmtNum } from './util';

/* ---------------- pause menu ----------------
   Drawn over the frozen game by hud.ts; this module also owns the menu's
   tap/click input, since both share the row layout (ROW, TOP, COLS).
   Esc opens it. Left column: stats (spend AP). Right: a button opening the skills screen (K). */
const ROW = 9, TOP = 57;
const COLS = [{ x: 6, w: 80 }, { x: 92, w: 142 }];

export function drawPause(): void {
  const m = game.pause!;
  const { w, h } = game.view;
  const dim = '#8ea3c2', hi = '#eaf2ff', gold = '#ffd166';
  ctx.fillStyle = '#050a14e0'; ctx.fillRect(0, 0, w, h);
  text(ctx, 'PAUSED', w / 2, 4, 2, gold, 'center');
  // the SETTINGS button, top right (Right from the skills column reaches it)
  const sb = settingsButton(w);
  ctx.fillStyle = m.col === 2 ? '#16223a' : '#0d1526'; ctx.fillRect(sb.x, sb.y, sb.w, sb.h);
  ctx.strokeStyle = m.col === 2 ? gold : '#4a5c7a'; ctx.lineWidth = 1; ctx.strokeRect(sb.x + 0.5, sb.y + 0.5, sb.w - 1, sb.h - 1);
  text(ctx, 'SETTINGS', sb.x + sb.w / 2, sb.y + 3, 1, m.col === 2 ? gold : dim, 'center');
  // ...and the AWARDS (achievements) button, top left
  const ab = awardsButton();
  ctx.fillStyle = m.col === 3 ? '#16223a' : '#0d1526'; ctx.fillRect(ab.x, ab.y, ab.w, ab.h);
  ctx.strokeStyle = m.col === 3 ? gold : '#4a5c7a'; ctx.strokeRect(ab.x + 0.5, ab.y + 0.5, ab.w - 1, ab.h - 1);
  text(ctx, 'AWARDS', ab.x + ab.w / 2, ab.y + 3, 1, m.col === 3 ? gold : dim, 'center');
  text(ctx, `LV ${player.level}  HP ${fmtNum(player.hp)}/${fmtNum(player.hpMax)}  MP ${fmtNum(player.mp)}/${fmtNum(player.mpMax)}`, w / 2, 23, 1, hi, 'center');
  // past the 100% cap, LUK's overflow shows as the crit damage it converts to
  const crit = `${Math.round(critChance() * 100)}%${critOverflowPoints() ? ` x${critMult().toFixed(2)}` : ''}`;
  text(ctx, `ATT ${Math.round(player.war)}  CRIT ${crit}  EXP ${fmtNum(player.exp)}/${fmtNum(player.expNext)}`, w / 2, 32, 1, hi, 'center');

  text(ctx, `STATS`, COLS[0].x + 2, 46, 1, gold, 'left');
  text(ctx, `AP ${player.ap}`, COLS[0].x + COLS[0].w - 2, 46, 1, player.ap ? gold : dim, 'right');
  text(ctx, `SKILLS`, COLS[1].x + 2, 46, 1, gold, 'left');
  text(ctx, `SP ${player.sp}`, COLS[1].x + COLS[1].w - 2, 46, 1, player.sp ? gold : dim, 'right');

  const sel = (col: number, i: number): void => {
    if (m.col !== col || m.row !== i) return;
    ctx.strokeStyle = gold; ctx.lineWidth = 1;
    ctx.strokeRect(COLS[col].x + 0.5, TOP + i * ROW - 1.5, COLS[col].w - 1, ROW);
  };
  STAT_KEYS.forEach((k, i) => {
    const y = TOP + i * ROW, x = COLS[0].x;
    sel(0, i);
    text(ctx, STAT_INFO[k].name, x + 2, y, 1, dim, 'left');
    text(ctx, `${player.stats[k]}`, x + 40, y, 1, hi, 'left');
    if (player.ap) text(ctx, '+', x + COLS[0].w - 3, y, 1, gold, 'right');
  });
  // what you're wearing, then the bag of spares (rows after the stats)
  const gy = TOP + STAT_KEYS.length * ROW + 4;
  const gearRow = (i: number, label: string, color: string): void => {
    const y = gy + i * ROW, r = STAT_KEYS.length + i;
    if (m.col === 0 && m.row === r) { ctx.strokeStyle = gold; ctx.lineWidth = 1; ctx.strokeRect(COLS[0].x + 0.5, y - 1.5, COLS[0].w - 1, ROW); }
    text(ctx, label, COLS[0].x + 2, y, 1, color, 'left');
  };
  // slot and level only (names run into the skills column); the selected
  // piece's full name shows in the description below
  const short = (i: GearItem): string => `${i.kind === 'weapon' ? 'WEAPON' : 'ARMOR'} LV.${i.lvl}`;
  gearRow(0, gear.weapon ? short(gear.weapon) : 'NO WEAPON', gear.weapon ? hi : dim);
  gearRow(1, gear.armor ? short(gear.armor) : 'NO ARMOR', gear.armor ? hi : dim);
  bag.forEach((it, i) => gearRow(2 + i, `- ${short(it)}`, dim));
  // the skills live on their own screen (K): here, a button that opens it
  const kb = skillsButton(), on = m.col === 1;
  ctx.fillStyle = on ? '#16223a' : '#0d1526'; ctx.fillRect(kb.x, kb.y, kb.w, kb.h);
  ctx.strokeStyle = on ? gold : '#4a5c7a'; ctx.lineWidth = 1; ctx.strokeRect(kb.x + 0.5, kb.y + 0.5, kb.w - 1, kb.h - 1);
  text(ctx, 'OPEN SKILLS (K)', kb.x + kb.w / 2, kb.y + 4, 1, on ? gold : player.sp > 0 ? hi : dim, 'center');
  if (player.sp > 0) text(ctx, `${player.sp} SP TO SPEND`, kb.x + kb.w / 2, kb.y + kb.h + 5, 1, gold, 'center');

  // description of the selected row
  let desc = '';
  if (m.col === 2) desc = 'Sound, damage numbers and keys';
  else if (m.col === 3) desc = 'Achievements and their rewards';
  else if (m.col === 0 && m.row >= STAT_KEYS.length) {
    const g = m.row - STAT_KEYS.length;
    const it = g === 0 ? gear.weapon : g === 1 ? gear.armor : bag[g - 2];
    const what = !it ? 'Nothing worn' : it.kind === 'weapon' ? `${it.name} Lv.${it.lvl}: +${Math.round(weaponBonus(it) * 100)}% attack` : `${it.name} Lv.${it.lvl}: soaks ${Math.round(armorSoak(it) * 100)}% damage`;
    desc = g < 2 ? (it ? `${what}. Z: into the bag` : what) : `${what}. Z: wear  X: throw away`;
  } else if (m.col === 0) desc = `${STAT_INFO[STAT_KEYS[m.row]].name}: ${STAT_INFO[STAT_KEYS[m.row]].desc}`;
  else desc = 'Learn and view your skills. Also K';
  desc = desc.replace(/[^A-Za-z0-9 .\/:+%-]/g, ' ').replace(/ +/g, ' ').trim();
  // long descriptions (e.g. a branch upgrade's lock-out note) wrap to two lines
  const lines = wrap(desc, 32).slice(0, 2);
  // a second line takes the help footer's place (the rows above leave no room)
  lines.forEach((ln, i) => text(ctx, ln, w / 2, h - 22 + i * 12, 1, dim, 'center'));
  if (lines.length < 2) text(ctx, 'ARROWS  Z SPEND  K SKILLS  ESC RESUME', w / 2, h - 10, 1, '#5d708f', 'center');
}

/** Greedy word wrap to lines of at most n characters. */
function wrap(s: string, n: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const word of s.split(' ')) {
    if (cur && cur.length + 1 + word.length > n) { out.push(cur); cur = word; }
    else cur = cur ? cur + ' ' + word : word;
  }
  if (cur) out.push(cur.length > n ? cur.slice(0, n - 1) + '.' : cur);
  return out;
}

/** The Esc menu's button opening the skills screen (screen space). */
export const skillsButton = (): { x: number; y: number; w: number; h: number } => ({ x: COLS[1].x, y: TOP - 2, w: COLS[1].w, h: 15 });

/** The Esc menu's SETTINGS button (screen space). */
export const settingsButton = (w: number): { x: number; y: number; w: number; h: number } => ({ x: w - 58, y: 4, w: 52, h: 13 });

/** The Esc menu's AWARDS button (screen space). */
export const awardsButton = (): { x: number; y: number; w: number; h: number } => ({ x: 6, y: 4, w: 44, h: 13 });

/** Tap/click on a pause-menu row selects it; tapping the selected row spends. */
export function bindMenuClicks(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('pointerdown', (e) => {
    const m = game.pause;
    if (!m) return;
    const b = canvas.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width * game.view.w, y = (e.clientY - b.top) / b.height * game.view.h;
    if (settingsUi.open) { settingsTap(x, y, game.view.w, game.view.h); return; }
    if (achUi.open) { achUi.open = false; return; }
    const ab = awardsButton();
    if (x >= ab.x && x < ab.x + ab.w && y >= ab.y && y < ab.y + ab.h) { m.col = 3; m.row = 0; pauseSpend(m); return; }
    const sb = settingsButton(game.view.w);
    if (x >= sb.x && x < sb.x + sb.w && y >= sb.y && y < sb.y + sb.h) { m.col = 2; m.row = 0; pauseSpend(m); return; }
    const kb = skillsButton();
    if (x >= kb.x && x < kb.x + kb.w && y >= kb.y && y < kb.y + kb.h) { m.col = 1; m.row = 0; pauseSpend(m); return; }
    const col = COLS.findIndex((c) => x >= c.x && x < c.x + c.w);
    if (col !== 0) return;
    const n = STAT_KEYS.length, row = Math.floor((y - TOP + 1.5) / ROW);
    if (row < 0 || row >= n) return;
    if (m.col === col && m.row === row) pauseSpend(m);
    else { m.col = col as 0 | 1; m.row = row; }
  });
}
