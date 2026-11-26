import { shop, trainer } from './economy';
import { drawBoard, drawShop, drawTrainer, questLines, walletLine } from './economydraw';
import { board } from './quests';
import { P, SKILL_BAR } from './config';
import { cdSlot } from './skills';
import { READY_FLASH } from './state';
import { placeName } from './world';
import { critChance, critMult, critOverflowPoints } from './combat';
import { ctx } from './canvas';
import { game, player } from './state';
import { net, playerCount } from './net';
import { menu } from './menu';
import { drawMenu } from './menudraw';
import { drawMinimap } from './minimapdraw';
import { boost, waveRate } from './boost';
import { skillIcon } from './icons';
import { activeSkill, expBar, isLearned, rank, skillRows, PAUSE_ROWS, pauseScroll, spendSp, STAT_INFO, STAT_KEYS } from './progress';
import { pauseSpend } from './update';
import { armorSoak, bag, gear, weaponBonus } from './gear';
import type { GearItem } from './gear';
import { dev, DEV_ROWS, devStops } from './dev';
import { bossAlive } from './boss';
import { stylist } from './stylist';
import { drawStylist } from './stylistdraw';
import { settingsTap, settingsUi } from './settings';
import { drawSettings } from './settingsdraw';
import { achUi } from './achievements';
import { drawAchievements } from './achdraw';
import { chat, logLines, wrap as wrapChat } from './chat';
import { keyName } from './input';
import { STATUS } from './status';
import { modLine } from './floormods';
import { text, textWidth } from './font';
import { clamp, fmtNum } from './util';
import type { SkillKey } from './types';

function bar(x: number, y: number, w: number, label: string, value: string, pct: number, col: string): void {
  ctx.fillStyle = '#0a1120'; ctx.fillRect(x, y, w, 9);
  ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(pct, 0, 1), 9);
  ctx.strokeStyle = '#0006'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, 9);
  text(ctx, label, x + 2, y + 1, 1, '#eaf2ff', 'left');
  text(ctx, value, x + w - 2, y + 1, 1, '#eaf2ff', 'right');
}

/** Connection icon: three rising signal bars on a dark chip, struck through in red when offline. */
const WIFI_W = 7;
function wifi(x: number, y: number, on: boolean): void {
  ctx.fillStyle = '#0a1120'; ctx.fillRect(x - 2, y - 1, WIFI_W + 4, 9); // backdrop keeps it legible
  ctx.fillStyle = '#8ea3c2';
  ctx.fillRect(x, y + 5, 1, 2); ctx.fillRect(x + 3, y + 3, 1, 4); ctx.fillRect(x + 6, y, 1, 7);
  if (!on) {
    ctx.fillStyle = '#ff6b6b';
    for (let i = 0; i < 7; i++) ctx.fillRect(x + i, y + 6 - i, 1, 1);
  }
}

/** HUD items get a hard 1px black shadow, down and to the right, so they read on bright areas. */
const SHADOW = 1;
function hudShadow(on: boolean): void {
  const k = ctx.getTransform().a * SHADOW; // shadow offsets are in canvas pixels, not game pixels
  ctx.shadowColor = on ? '#000' : 'transparent';
  ctx.shadowOffsetX = on ? k : 0; ctx.shadowOffsetY = on ? k : 0; ctx.shadowBlur = 0;
}

/** A yellow spark and frame flash around a bar icon the moment its skill
 *  comes off cooldown (fades over READY_FLASH seconds). */
function readyGlow(x: number, y: number, t: number): void {
  const k = Math.min(1, t / READY_FLASH);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 1.5, y - 1.5, 19, 19);
  // a four-point spark at the top-right corner
  const sx = x + 16, sy = y - 1, r = 2 + 3 * k;
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(sx - 1, sy - r, 2, r * 2 + 1);
  ctx.fillRect(sx - r, sy - 1, r * 2 + 1, 2);
  ctx.restore();
}
function drawHUD(): void {
  hudShadow(true);
  try { drawHUDItems(); } finally { hudShadow(false); }
}

/** Dev mode icon: a small grey wrench (open jaw + handle). */
const WRENCH_W = 7;
function wrench(x: number, y: number): void {
  const g = '#c8ccd4';
  const at = (dx: number, dy: number, w = 1, h = 1) => { ctx.fillStyle = g; ctx.fillRect(x + dx, y + dy, w, h); };
  at(2, 0, 2, 1); at(6, 0, 1, 1); at(1, 1, 1, 2); at(6, 1, 1, 2); at(2, 3, 4, 1); // ring, open at the top
  at(4, 0, 1, 1);                                                                  // ...the jaws' inner tooth
  at(3, 4, 1, 1); at(2, 5, 1, 1); at(1, 6, 2, 1);                                  // handle down-left
}

/** The boss's name and HP across the bottom of the screen, over the HP/MP bars. */
function drawBossBar(w: number, h: number): void {
  const b = bossAlive();
  if (!b) return;
  const bw = 150, bx = Math.round((w - bw) / 2), by = h - 30;
  const fill = Math.max(b.hp > 0 ? 1 : 0, Math.round((bw - 2) * clamp(b.hp / b.hpMax, 0, 1)));
  text(ctx, b.name.toUpperCase(), w / 2, by - 9, 1, '#ff9f9f', 'center');
  ctx.fillStyle = '#000'; ctx.fillRect(bx, by, bw, 5);
  ctx.fillStyle = '#3a1a1a'; ctx.fillRect(bx + 1, by + 1, bw - 2, 3);
  ctx.fillStyle = '#e05a5a'; ctx.fillRect(bx + 1, by + 1, fill, 3);
}

function drawHUDItems(): void {
  const { w, h } = game.view;
  if (menu.open) { hudShadow(false); drawMenu(); return; } // the title menu replaces the HUD
  const pad = 6;

  // top-left, one line: wrench (dev) + wifi + level; the floor name goes underneath
  let ly = pad;
  let ix = pad;
  if (dev.on) { wrench(ix, ly); ix += WRENCH_W + 4; }
  const online = !net.offline && net.joined;
  wifi(ix, ly, online);
  ix += WIFI_W + 4;
  text(ctx, `Lv.${player.level}`, ix, ly, 1, '#dbe6f5', 'left');
  ly += 9;
  if (online) {
    const n = playerCount();
    const where = net.code ? `Private ${net.code}` : `Ch.${net.channel}`;
    text(ctx, `${where} · ${n} player${n === 1 ? '' : 's'}`, pad, ly, 1, net.code ? '#4fd8c4' : '#8ea3c2', 'left');
    ly += 9;
  }
  text(ctx, placeName(game.floor.place), pad, ly, 1, '#8ea3c2', 'left');
  ly += 9;
  // this floor's modifier, if it rolled one
  const mod = modLine();
  if (mod) { text(ctx, mod, pad, ly, 1, '#8fd8ff', 'left'); ly += 9; }
  // other players' kills are speeding up our waves
  if (boost.level >= 0.05) { text(ctx, `Waves x${waveRate().toFixed(1)}`, pad, ly, 1, '#ff9f6b', 'left'); ly += 9; }
  // coins and potions
  text(ctx, walletLine(), pad, ly, 1, '#ffd166', 'left'); ly += 9;
  // active quests and their progress
  for (const [s, done] of questLines()) { text(ctx, s, pad, ly, 1, done ? '#9be89b' : '#c8d3e6', 'left'); ly += 9; }
  if (player.ap || player.sp) {
    const pts = [player.ap ? `AP ${player.ap}` : '', player.sp ? `SP ${player.sp}` : ''].filter(Boolean).join(' ');
    text(ctx, `${pts} - ESC`, pad, ly, 1, '#ffd166', 'left');
  }
  drawBossBar(w, h);

  // skill bar (top-right): Z, Q, W, E, R as 16x16 icons, no panel background
  const n = SKILL_BAR.length, sw = 16, gap = 5;
  const total = n * sw + (n - 1) * gap;
  const bx = w - total - pad, by = pad;
  ctx.save();
  SKILL_BAR.forEach((slot, i) => {
    const x = bx + i * (sw + gap);
    if (!slot.skill) {
      // empty slot: a dim frame with its key
      ctx.fillStyle = '#0006'; ctx.fillRect(x, by, sw, 16);
      ctx.strokeStyle = '#4a5c7a'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, by + 0.5, sw - 1, 15);
      text(ctx, keyName(slot.label), x + 1, by + 1, 1, '#4a5c7a', 'left');
      return;
    }
    const k: SkillKey = slot.skill;
    const s = activeSkill(k);
    const learned = isLearned(k);
    // the bar shows the form the key would fire right now (its air form in the air)
    const cs = cdSlot(k);
    let cd = player.cd[cs] || 0, frac = Math.min(1, cd / (player.cdMax[cs] || cd || 1));
    // Electric Blitz banks charges rather than cooling down: with none left,
    // the recharge shows like a cooldown
    if (s.key === 'EB' && cs === 'Q' && player.blitz.charges <= 0) {
      cd = P.BLITZ_CHARGE_T - player.blitz.t; frac = cd / P.BLITZ_CHARGE_T;
    }
    ctx.globalAlpha = learned ? 1 : 0.4;
    ctx.drawImage(skillIcon(s.key), x, by, 16, 16);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0009'; ctx.fillRect(x, by, 7, 7);
    text(ctx, keyName(slot.label), x + 1, by + 1, 1, learned ? '#ffd166' : '#4a5c7a', 'left');
    if (learned && frac > 0) {
      ctx.fillStyle = '#000a';
      ctx.fillRect(x, by, sw, 16 * frac);
      text(ctx, cd.toFixed(1), x + sw / 2, by + 5, 1, '#fff', 'center');
    }
    // ...and how many are in the bank (a lit pip each), with the next one
    // filling in as a thin line under them
    if (learned && s.key === 'EB') {
      for (let c = 0; c < P.BLITZ_MAX; c++) {
        ctx.fillStyle = c < player.blitz.charges ? '#6fd3ff' : '#0007';
        ctx.fillRect(x + 1 + c * 4, by + 12, 3, 3);
      }
      if (player.blitz.charges < P.BLITZ_MAX) {
        ctx.fillStyle = '#6fd3ff';
        ctx.fillRect(x + 1, by + 15, Math.round(14 * player.blitz.t / P.BLITZ_CHARGE_T), 1);
      }
    }
    // the flash that plays as the cooldown runs out, so you know you can press it
    if (learned && (player.readyT[cs] ?? 0) > 0) readyGlow(x, by, player.readyT[cs]);
  });
  ctx.restore();
  drawMinimap(); // under the skill bar

  // bars across the bottom: HP | MP | EXP
  const bw = 74, bgap = 3, y = h - 14;
  bar(pad, y, bw, 'HP', `${fmtNum(player.hp)}/${fmtNum(player.hpMax)}`, player.hp / player.hpMax, '#3fbf72');
  bar(pad + bw + bgap, y, bw, 'MP', `${fmtNum(player.mp)}/${fmtNum(player.mpMax)}`, player.mp / player.mpMax, '#3f8fd6');
  bar(pad + 2 * (bw + bgap), y, bw, 'EXP', expBar().text, expBar().pct, '#ffd166');

  // status effects on you, over the HP bar: a coloured pip and "POISON x2 4s" each
  let ey = y;
  if (player.effects.length) {
    ey = y - 10;
    let ex = pad;
    for (const e of player.effects) {
      const st = STATUS[e.kind];
      ctx.fillStyle = st.col; ctx.fillRect(ex, ey + 2, 3, 3);
      const label = `${st.label}${e.stacks > 1 ? ` x${e.stacks}` : ''} ${Math.ceil(e.t)}s`;
      text(ctx, label, ex + 5, ey + 1, 1, st.col, 'left');
      ex += 5 + textWidth(label) + 7;
    }
  }
  drawChatLog(ey);
  if (dev.open || game.pause || shop.open || trainer.open || stylist.open || board.open) hudShadow(false); // full-screen panels have their own backdrops
  if (dev.open) { drawDev(); return; }
  if (game.pause) { drawPause(); if (settingsUi.open) drawSettings(w, h); if (achUi.open) drawAchievements(w, h); return; }
  if (shop.open) { drawShop(); return; }
  if (trainer.open) { drawTrainer(); return; }
  if (stylist.open) { drawStylist(w, h); return; }
  if (board.open) { drawBoard(); return; }
  if (game.banner) {
    ctx.save();
    ctx.globalAlpha = clamp(game.banner.t / 1.15, 0, 1);
    text(ctx, game.banner.text, w / 2, 46, 2, '#ffd166', 'center');
    text(ctx, game.banner.sub, w / 2, 64, 1, '#dbe6f5', 'center');
    ctx.restore();
  }
}

/* ---------------- dev menu (?dev, ` key) ---------------- */
function drawDev(): void {
  const { w, h } = game.view;
  ctx.fillStyle = '#050a14e0'; ctx.fillRect(0, 0, w, h);
  text(ctx, 'DEV - WARP', w / 2, 4, 2, '#ff9f6b', 'center');
  const stops = devStops();
  const top = Math.max(0, Math.min(dev.sel - (DEV_ROWS >> 1), stops.length - DEV_ROWS));
  stops.slice(top, top + DEV_ROWS).forEach((s, row) => {
    const i = top + row, y = 26 + row * 11, on = i === dev.sel;
    if (on) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1; ctx.strokeRect(28.5, y - 2.5, w - 57, 11); }
    const name = s.name.toUpperCase(), label = s.label.toUpperCase();
    text(ctx, name, 34, y, 1, on ? '#eaf2ff' : '#8ea3c2', 'left');
    // the area it tops, where it fits beside the (indented) town name
    if (textWidth(name) + textWidth(label) + 8 <= w - 68) text(ctx, label, w - 34, y, 1, '#5f7391', 'right');
  });
  text(ctx, 'Z/ENTER WARP  ESC CLOSE', w / 2, h - 12, 1, '#8ea3c2', 'center');
}

/* ---------------- chat log ----------------
   The last few lines sit above the bars (all recent ones while typing),
   and the line being typed sits right above the bars. */
const LOG_CHARS = 38;
function drawChatLog(barsY: number): void {
  const { w } = game.view;
  const now = performance.now();
  let y = barsY - 3;
  if (chat.typing) {
    const caret = Math.floor(now / 400) % 2 ? '_' : ' ';
    const line = ('> ' + chat.draft.toUpperCase() + caret).slice(-LOG_CHARS);
    y -= 10;
    ctx.fillStyle = '#050a14d0'; ctx.fillRect(2, y - 1, w - 4, 10);
    text(ctx, line, 5, y + 1, 1, '#eaf2ff', 'left');
  }
  // each message wraps to fit; the newest few rows show
  const rows: { s: string; col: string }[] = [];
  for (const l of logLines(now)) {
    wrapChat(`${l.name}: ${l.text}`, LOG_CHARS).forEach((s, i) => rows.push({ s, col: i === 0 ? l.col : '#dbe6f5' }));
  }
  const show = rows.slice(-6);
  if (!show.length) return;
  y -= show.length * 9 + 1;
  ctx.fillStyle = '#050a1490'; ctx.fillRect(2, y - 1, w - 4, show.length * 9 + 1);
  show.forEach((r, i) => text(ctx, r.s, 5, y + i * 9, 1, r.col, 'left'));
}

/* ---------------- pause menu ----------------
   Esc opens it. Left column: stats (spend AP). Right column: skills (spend SP). */
const ROW = 9, TOP = 57;
const COLS = [{ x: 6, w: 80 }, { x: 92, w: 142 }];

function drawPause(): void {
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
  const rows = skillRows();
  // a long skill list scrolls (the cursor stays in view) instead of running
  // into the description below; little arrows show there is more
  const top = pauseScroll(m, rows.length);
  rows.slice(top, top + PAUSE_ROWS).forEach((r, vi) => {
    const i = top + vi, y = TOP + vi * ROW, x = COLS[1].x, can = player.sp > 0 && !!r.action;
    if (m.col === 1 && m.row === i) { ctx.strokeStyle = gold; ctx.lineWidth = 1; ctx.strokeRect(COLS[1].x + 0.5, y - 1.5, COLS[1].w - 1, ROW); }
    text(ctx, r.slot || '-', x + 2, y, 1, r.slot ? gold : dim, 'left');
    text(ctx, r.name, x + 11, y, 1, r.rank ? hi : dim, 'left');
    const tag = r.rank === 0 ? 'NEW' : r.max > 1 ? `${r.rank}/${r.max}` : '';
    text(ctx, can ? `${tag}+` : tag, x + COLS[1].w - 3, y, 1, can ? gold : dim, 'right');
  });
  const ax = COLS[1].x + COLS[1].w / 2;
  ctx.fillStyle = dim;
  if (top > 0) for (let k = 0; k < 3; k++) ctx.fillRect(ax - k, TOP - 6 + k, 2 * k + 1, 1);
  if (top + PAUSE_ROWS < rows.length) for (let k = 0; k < 3; k++) ctx.fillRect(ax - k, TOP + PAUSE_ROWS * ROW + 1 - k, 2 * k + 1, 1);

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
  else if (rows[m.row]) desc = rows[m.row].action || rows[m.row].need || `${rows[m.row].name}: mastered`;
  desc = desc.replace(/[^A-Za-z0-9 .\/:+%-]/g, ' ').replace(/ +/g, ' ').trim();
  // long descriptions (e.g. a branch upgrade's lock-out note) wrap to two lines
  const lines = wrap(desc, 32).slice(0, 2);
  // a second line takes the help footer's place (the rows above leave no room)
  lines.forEach((ln, i) => text(ctx, ln, w / 2, h - 22 + i * 12, 1, dim, 'center'));
  if (lines.length < 2) text(ctx, 'ARROWS MOVE  Z SPEND  ESC RESUME', w / 2, h - 10, 1, '#5d708f', 'center');
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
    const col = COLS.findIndex((c) => x >= c.x && x < c.x + c.w);
    const n = col === 0 ? STAT_KEYS.length : skillRows().length;
    const vis = Math.floor((y - TOP + 1.5) / ROW);
    if (col === 1 && vis >= PAUSE_ROWS) return;
    const row = vis + (col === 1 ? pauseScroll(m, n) : 0);
    if (col < 0 || row < 0 || row >= n) return;
    if (m.col === col && m.row === row) pauseSpend(m);
    else { m.col = col as 0 | 1; m.row = row; }
  });
}

/* ---------------- side panel ---------------- */
interface Row {
  root: HTMLElement;
  lvl: HTMLElement;
  btn: HTMLButtonElement;
}
const rows = new Map<SkillKey, Row>();

export function buildPanel(): void {
  const el = document.getElementById('skillList');
  if (!el) return;
  el.innerHTML = '';
  SKILL_BAR.forEach(({ skill: k }) => {
    if (!k) return;
    const s = activeSkill(k);
    const d = document.createElement('div');
    d.className = 'skill';
    d.innerHTML = `<div class="key">${keyName(k)}</div><div class="sbody">
      <div class="nm">${s.name}<span class="tag">${s.tag}</span></div>
      <div class="ds">${s.desc}</div>
      <div class="row"><span class="rl"></span>
        <button class="up" data-k="${k}" title="Spend 1 SP">+</button></div>
    </div>`;
    el.appendChild(d);
    rows.set(k, {
      root: d,
      lvl: d.querySelector('.rl') as HTMLElement,
      btn: d.querySelector('.up') as HTMLButtonElement,
    });
  });
  el.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('.up');
    if (!t) return;
    const k = (t as HTMLElement).dataset.k as SkillKey;
    if (spendSp(k)) {
      syncPanel();
      const r = rows.get(k);
      if (r) {
        r.root.classList.add('flash');
        setTimeout(() => r.root.classList.remove('flash'), 320);
      }
    }
  });
}

export function syncPanel(): void {
  const set = (id: string, v: string): void => {
    const e = document.getElementById(id);
    if (e) e.textContent = v;
  };
  const bar = (id: string, pct: number): void => {
    const e = document.getElementById(id);
    if (e) e.style.width = `${clamp(pct, 0, 1) * 100}%`;
  };
  set('lvl', `Lv.${player.level}`);
  set('job', player.job.title || 'Novice');
  set('hpt', `${Math.round(player.hp)}`);
  bar('hpb', player.hp / player.hpMax);
  set('mpt', `${Math.round(player.mp)}`);
  bar('mpb', player.mp / player.mpMax);
  set('expt', `${player.exp} / ${player.expNext}`);
  bar('expb', player.exp / player.expNext);
  set('sp', String(player.sp));
  set('kills', String(game.kills));
  set('fervor', `${player.fervor} stacks${player.fervor ? ` (+${player.fervor * 8}%)` : ''}`);
  bar('fervorb', player.fervor / 5);

  SKILL_BAR.forEach(({ skill: k }) => {
    if (!k) return;
    const r = rows.get(k);
    if (!r) return;
    const s = activeSkill(k);
    const learned = isLearned(k);
    const lv = rank(k).level;
    r.lvl.textContent = learned ? `Lv.${lv}/${s.maxLevel}` : `Pick at Lv.${Math.ceil(s.minLevel / 5) * 5}+`;
    r.btn.disabled = !learned || player.sp <= 0 || lv >= s.maxLevel;
    r.root.classList.toggle('locked', !learned);
  });
}

export { drawHUD };
