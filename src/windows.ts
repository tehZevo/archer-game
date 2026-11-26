import { game, gotoPlace } from './state';
import { pressed, repeated } from './input';
import { achKey, achUi, openAchievements } from './achievements';
import { skillRows, spendSkill, spendStat, STAT_KEYS } from './progress';
import { shop, shopInput, trainer, trainerInput } from './economy';
import { petShop, petShopInput } from './pets';
import { bag, unequip, wear } from './gear';
import { dev, devStops } from './dev';
import { stylist, stylistKey } from './stylist';
import { board, boardInput } from './quests';
import { confirmInput, confirmUi } from './confirm';
import { openSettings, settingsKey, settingsUi } from './settings';
import { closeLinkHelp, linkHelp, linkHelpKey, openLinkHelp } from './linkhelp';
import { openSkillEditor, skillEditor, skillEditorInput } from './skilleditor';
import { closeSkillScreen, openSkillScreen, skillScreen, skillScreenKey } from './skillscreen';
import type { PauseMenu } from './types';

/**
 * In-game windows that hold the world still while open: the shop, trainer, pet keeper,
 * stylist, quest board, settings and achievements, the dev menu and the Esc
 * pause menu. Returns true when one took this frame's input (the world
 * doesn't step).
 */
export function windowInput(dt: number): boolean {
  if (shop.open) { shopInput(); return true; }
  if (trainer.open) { trainerInput(); return true; }
  if (petShop.open) { petShopInput(); return true; }
  if (stylist.open) { stylistInput(); return true; }
  if (board.open) { boardInput(); return true; }
  if (confirmUi.open) { confirmInput(); return true; }
  // the settings window (from the Esc menu) sits over the paused game
  if (settingsUi.open) { settingsInput(); return true; }
  if (achUi.open) { achInput(); return true; }
  // the skill-links help screen (H): shows each skill and what it links into
  if (linkHelp.open) { linkHelpInput(); return true; }
  if (pressed('h')) { openLinkHelp(); return true; }
  // the skills screen (K, also from the Esc menu): a tab per job tier
  if (skillScreen.open) { skillScreenInput(); return true; }
  if (pressed('k')) { openSkillScreen(); return true; }
  // dev menu (?dev only): ` opens it; it freezes the game like the pause menu
  if (dev.on && pressed('`')) dev.open = !dev.open;
  if (dev.open) { devInput(dt); return true; }
  // the skill timing & link editor (?dev only): T opens it over the frozen game
  if (dev.on && pressed('t')) { openSkillEditor(); return true; }
  if (skillEditor.open) { skillEditorInput(dt); return true; }
  // Esc pause menu: arrows move, Z/Enter spends AP or SP
  if (pressed('escape')) game.pause = game.pause ? null : { col: 0, row: 0 };
  if (game.pause) { pauseInput(game.pause, dt); return true; }
  return false;
}

/** True while any of those windows is open (so Enter belongs to it, not the chat line). */
export function windowOpen(): boolean {
  return shop.open || trainer.open || petShop.open || stylist.open || board.open || confirmUi.open
    || settingsUi.open || achUi.open || linkHelp.open || skillScreen.open || dev.open || skillEditor.open || !!game.pause;
}

/** Z, Enter or Space: confirm in any window. */
const confirmed = (): boolean => pressed('z') || pressed('enter') || pressed(' ');

/** The stylist's window in town: the same keys as from the menu (X closes too). */
function stylistInput(): void {
  for (const k of ['up', 'down', 'left', 'right', 'escape'] as const) if (pressed(k)) stylistKey(k);
  if (confirmed()) stylistKey('enter');
  if (pressed('x')) stylistKey('escape');
}

/** The settings window's keys (X closes too, like the other windows). */
function settingsInput(): void {
  for (const k of ['up', 'down', 'left', 'right', 'escape'] as const) if (pressed(k)) settingsKey(k);
  if (confirmed()) settingsKey('enter');
  if (pressed('x')) settingsKey('escape');
}

/** The achievements list: Up/Down scrolls, Esc / X / Z closes. */
function achInput(): void {
  for (const k of ['up', 'down', 'escape'] as const) if (pressed(k)) achKey(k);
  if (confirmed() || pressed('x')) achKey('escape');
}

/** The skill-links help screen: Up/Down scrolls, Esc / H / X closes. */
function linkHelpInput(): void {
  for (const k of ['up', 'down', 'escape'] as const) if (pressed(k)) linkHelpKey(k);
  if (pressed('h') || pressed('x')) closeLinkHelp();
}

/** The skills screen: arrows move, Z learns, Esc / K / X close. */
function skillScreenInput(): void {
  for (const k of ['up', 'down', 'left', 'right', 'escape'] as const) if (pressed(k)) skillScreenKey(k);
  if (confirmed()) skillScreenKey('enter');
  if (pressed('k') || pressed('x')) closeSkillScreen();
}

/** Dev menu: Up/Down picks a stop, Z/Enter warps there, Esc or ` closes. */
export function devInput(dt: number): void {
  const n = devStops().length;
  if (repeated('up', dt)) dev.sel = (dev.sel + n - 1) % n;
  if (repeated('down', dt)) dev.sel = (dev.sel + 1) % n;
  if (pressed('escape')) dev.open = false;
  if (confirmed()) { dev.open = false; gotoPlace(devStops()[dev.sel].place); }
}

function pauseInput(m: PauseMenu, dt: number): void {
  // the stats column runs on into what you wear and the bag of spares
  const n = m.col === 0 ? STAT_KEYS.length + 2 + bag.length : m.col === 1 ? skillRows().length : 1;
  // holding Up/Down keeps moving (key repeat)
  if (repeated('up', dt)) m.row = (m.row + n - 1) % n;
  if (repeated('down', dt)) m.row = (m.row + 1) % n;
  // Left/Right steps stats -> skills -> the SETTINGS button -> the AWARDS button
  if (pressed('left')) { m.col = ((m.col + 3) % 4) as PauseMenu['col']; m.row = 0; }
  if (pressed('right')) { m.col = ((m.col + 1) % 4) as PauseMenu['col']; m.row = 0; }
  if (confirmed()) pauseSpend(m);
  // X throws away the spare under the cursor
  const b = m.col === 0 ? m.row - STAT_KEYS.length - 2 : -1;
  if (pressed('x') && b >= 0 && bag[b]) { bag.splice(b, 1); m.row = Math.min(m.row, STAT_KEYS.length + 1 + bag.length); }
}

/** Spend a point on the selected stat or skill row (or open the settings). */
export function pauseSpend(m: PauseMenu): void {
  if (m.col === 2) openSettings();
  else if (m.col === 3) openAchievements();
  else if (m.col === 0) {
    // stats, then WEAPON / ARMOR (take it off into the bag), then the bag
    // (put that piece on, swapping it with what is worn)
    const g = m.row - STAT_KEYS.length;
    if (g < 0) spendStat(STAT_KEYS[m.row]);
    else if (g < 2) unequip(g === 0 ? 'weapon' : 'armor');
    else wear(g - 2);
  }
  else { const r = skillRows()[m.row]; if (r) spendSkill(r.key); }
}
