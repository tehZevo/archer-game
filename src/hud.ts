import { shop, trainer } from './economy';
import { petShop } from './pets';
import { drawPetShop } from './petdraw';
import { confirmUi, drawConfirm } from './confirm';
import { deathUi, drawDeath } from './deathui';
import { drawBoard, drawShop, drawTrainer, questLines, walletLine } from './economydraw';
import { board } from './quests';
import { P, SKILL_BAR } from './config';
import { AIR_FORM } from './castrules';
import { READY_FLASH, USE_FLASH } from './state';
import { placeName } from './world';
import { ctx } from './canvas';
import { game, player } from './state';
import { net, playerCount } from './net';
import { menu } from './menu';
import { drawMenu } from './menudraw';
import { drawMinimap } from './minimapdraw';
import { boost, waveRate } from './boost';
import { ICON, skillIcon } from './icons';
import { activeSkill, expBar, isLearned } from './progress';
import { dev, DEV_ROWS, devStops } from './dev';
import { bossAlive } from './boss';
import { stylist } from './stylist';
import { drawStylist } from './stylistdraw';
import { settingsUi } from './settings';
import { drawSettings } from './settingsdraw';
import { achUi } from './achievements';
import { drawAchievements } from './achdraw';
import { drawLinkHelp, linkHelp } from './linkhelp';
import { drawSkillScreen, skillScreen } from './skillscreen';
import { drawSkillEditor, skillEditor } from './skilleditor';
import { chat, logLines, wrap as wrapChat } from './chat';
import { STATUS } from './status';
import { modLine } from './floormods';
import { text, textWidth } from './font';
import { clamp, fmtNum } from './util';
import type { SkillKey } from './types';
import { drawPause } from './pausemenu';

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
  ctx.strokeRect(x - 1.5, y - 1.5, ICON + 3, ICON + 3);
  // a four-point spark at the top-right corner
  const sx = x + ICON, sy = y - 1, r = 2 + 3 * k;
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(sx - 1, sy - r, 2, r * 2 + 1);
  ctx.fillRect(sx - r, sy - 1, r * 2 + 1, 2);
  ctx.restore();
}
/** One skill-bar icon: dim until learned, a dark overlay over the part
 *  still cooling down, and the flash as it comes off cooldown. `cs` is its
 *  cooldown slot (an air form cools down on "<key>.air"). */
/** The flash that fires the instant a skill is cast, so a key press is
 *  confirmed on the bar. The air and ground forms are stacked in one column,
 *  so which one you just hit isn't always obvious. */
function usedFlash(x: number, y: number, t: number): void {
  const k = Math.min(1, t / USE_FLASH);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.strokeStyle = '#eaf2ff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 1.5, y - 1.5, ICON + 3, ICON + 3);
  ctx.fillStyle = '#eaf2ff';
  ctx.fillRect(x, y, ICON, 1); // a lit top edge, brightest on the cast
  ctx.restore();
}

function skillSlot(k: SkillKey, cs: string, x: number, y: number): void {
  const s = activeSkill(k);
  const learned = isLearned(k);
  let frac = Math.min(1, (player.cd[cs] || 0) / (player.cdMax[cs] || 1));
  // Electric Blitz banks charges rather than cooling down: with none left,
  // the recharge shows like a cooldown
  if (s.key === 'eb' && player.blitz.charges <= 0) frac = 1 - player.blitz.t / P.BLITZ_CHARGE_T;
  ctx.globalAlpha = learned ? 1 : 0.4;
  ctx.drawImage(skillIcon(s.key), x, y); // 1:1, the one icon size
  ctx.globalAlpha = 1;
  if (!learned) return;
  if (frac > 0) { ctx.fillStyle = '#000a'; ctx.fillRect(x, y, ICON, Math.ceil(ICON * frac)); }
  // ...and how many are in the bank (a lit pip each), with the next one
  // filling in as a thin line under them
  if (s.key === 'eb') {
    for (let c = 0; c < P.BLITZ_MAX; c++) {
      ctx.fillStyle = c < player.blitz.charges ? '#6fd3ff' : '#0007';
      ctx.fillRect(x + 1 + c * 3, y + ICON - 3, 2, 2);
    }
    if (player.blitz.charges < P.BLITZ_MAX) {
      ctx.fillStyle = '#6fd3ff';
      ctx.fillRect(x + 1, y + ICON - 1, Math.round((ICON - 2) * player.blitz.t / P.BLITZ_CHARGE_T), 1);
    }
  }
  // the flash that plays as the cooldown runs out, so you know you can press it
  if ((player.readyT[cs] ?? 0) > 0) readyGlow(x, y, player.readyT[cs]);
  // ...and the flash that confirms the cast you just made
  if ((player.usedT[cs] ?? 0) > 0) usedFlash(x, y, player.usedT[cs]);
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

/** The top-left stack: connection + level line, floor name, modifiers, coins,
 *  quests and unspent points. Returns the y below the last line. */
function drawTopLeft(pad: number): void {
  let ly = pad;
  let ix = pad;
  if (dev.on) { wrench(ix, ly); ix += WRENCH_W + 4; }
  const online = !net.offline && net.joined;
  wifi(ix, ly, online);
  ix += WIFI_W + 4;
  text(ctx, placeName(game.floor.place), ix, ly, 1, '#8ea3c2', 'left');
  ly += 9;
  if (online) {
    const n = playerCount();
    const where = net.code ? `Private ${net.code}` : `Ch.${net.channel}`;
    text(ctx, `${where} · ${n} player${n === 1 ? '' : 's'}`, pad, ly, 1, net.code ? '#4fd8c4' : '#8ea3c2', 'left');
    ly += 9;
  }
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
}

/** The top-right skill bar: a column per key (Z, Q, W, E, R), the air form
 *  (Meteor Dive, Cyclone Sweep, Downpour) stacked over the ground form. */
function drawSkillBar(pad: number): void {
  const { w } = game.view;
  const colGap = 3, rowGap = 1;
  const bx = w - SKILL_BAR.length * (ICON + colGap) + colGap - pad, by = pad;
  ctx.save();
  SKILL_BAR.forEach((slot, i) => {
    if (!slot.skill) return;
    const x = bx + i * (ICON + colGap);
    const air = AIR_FORM[slot.skill];
    if (air) skillSlot(air, `${slot.skill}.air`, x, by);
    skillSlot(slot.skill, slot.skill, x, by + ICON + rowGap);
  });
  ctx.restore();
}

/** The HP | MP | EXP bars across the bottom. Returns their y. */
function drawBottomBars(pad: number): number {
  const { h } = game.view;
  const bw = 74, bgap = 3, y = h - 14;
  text(ctx, `Lv.${player.level}`, pad, y - 9, 1, '#dbe6f5', 'left');
  // HP / MP read the current value (500, 1.5K); the bar shows how full it is
  bar(pad, y, bw, 'HP', fmtNum(player.hp), player.hp / player.hpMax, '#3fbf72');
  bar(pad + bw + bgap, y, bw, 'MP', fmtNum(player.mp), player.mp / player.mpMax, '#3f8fd6');
  bar(pad + 2 * (bw + bgap), y, bw, 'EXP', expBar().text, expBar().pct, '#ffd166');
  return y;
}

/** Status effects on you, over the HP bar: a coloured pip and "POISON x2 4s"
 *  each. Returns the y the chat log sits at. */
function drawStatusEffects(pad: number, y: number): number {
  if (!player.effects.length) return y;
  const ey = y - 10;
  let ex = pad;
  for (const e of player.effects) {
    const st = STATUS[e.kind];
    ctx.fillStyle = st.col; ctx.fillRect(ex, ey + 2, 3, 3);
    const label = `${st.label}${e.stacks > 1 ? ` x${e.stacks}` : ''} ${Math.ceil(e.t)}s`;
    text(ctx, label, ex + 5, ey + 1, 1, st.col, 'left');
    ex += 5 + textWidth(label) + 7;
  }
  return ey;
}

/** The full-screen panel open over the HUD (if any), else the transient banner. */
function drawOverlays(w: number, h: number): void {
  if (dev.open) { drawDev(); return; }
  if (skillEditor.open) { drawSkillEditor(); return; }
  // the skills screen can open over the Esc menu, so it draws first
  if (skillScreen.open) { drawSkillScreen(); return; }
  if (game.pause) { drawPause(); if (settingsUi.open) drawSettings(w, h); if (achUi.open) drawAchievements(w, h); return; }
  if (shop.open) { drawShop(); return; }
  if (trainer.open) { drawTrainer(); return; }
  if (petShop.open) { drawPetShop(); return; }
  if (stylist.open) { drawStylist(w, h); return; }
  if (board.open) { drawBoard(); return; }
  if (linkHelp.open) { drawLinkHelp(); return; }
  if (confirmUi.open) { drawConfirm(); return; }
  if (deathUi.open) { drawDeath(); return; }
  if (game.banner) {
    ctx.save();
    ctx.globalAlpha = clamp(game.banner.t / P.BANNER_FADE, 0, 1);
    text(ctx, game.banner.text, w / 2, 46, 2, '#ffd166', 'center');
    text(ctx, game.banner.sub, w / 2, 64, 1, '#dbe6f5', 'center');
    ctx.restore();
  }
}

function drawHUDItems(): void {
  const { w, h } = game.view;
  if (menu.open) { hudShadow(false); drawMenu(); return; } // the title menu replaces the HUD
  const pad = 6;

  drawTopLeft(pad);
  drawBossBar(w, h);
  drawSkillBar(pad);
  drawMinimap(); // under the skill bar
  const ey = drawStatusEffects(pad, drawBottomBars(pad));
  drawChatLog(ey);
  if (dev.open || game.pause || shop.open || trainer.open || petShop.open || stylist.open || board.open || confirmUi.open) hudShadow(false); // full-screen panels have their own backdrops
  drawOverlays(w, h);
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
    const name = s.name.toUpperCase();
    text(ctx, name, 34, y, 1, on ? '#eaf2ff' : '#8ea3c2', 'left');
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

export { drawHUD };
