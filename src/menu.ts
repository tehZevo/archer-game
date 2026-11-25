import { placeKey, START, type Place } from './world';
import { CODE_LEN, lobbyCounts, MAX_PER_CHANNEL, net, newCode, parseCode } from './net';
import { clearSave, hasSave, saving } from './save';
import { cleanName, myName, NAME_MAX, setMyName } from './presence';
import { openStylist, stylist, stylistKey } from './stylist';
import { openSettings, settingsKey, settingsUi } from './settings';
import { achKey, achUi, openAchievements } from './achievements';

/* ============================================================
   MAIN MENU
   Drawn on the canvas over the frozen world (see menudraw.ts);
   this file is the state and the input handling, free of DOM
   and canvas so tests can drive it. Rows: Play, a public channel
   picker (with how many players each channel has), a private
   instance code, a new code, your name, your look (opens the
   stylist window, see stylist.ts), settings (see settings.ts)
   and Reset progress.
   ============================================================ */

export type ItemId = 'play' | 'channel' | 'code' | 'create' | 'name' | 'look' | 'settings' | 'awards' | 'reset';

export const menu = {
  open: true,
  sel: 0,
  /** Public channel picked: 0 = auto (the busiest one with room). */
  channel: 0,
  /** The text field being typed into, if any. */
  edit: null as null | 'code' | 'name',
  code: '',
  name: '',
  /** A one-line message under the rows (errors, hints). */
  note: '',
  /** Reset progress asks once more before erasing. */
  confirmReset: false,
  /** Where Play resumes (channel counts are for this place). */
  place: START as Place,
};

/* layout, shared with the drawing and the pointer hit-test */
export const MENU_TOP = 50, MENU_ROW = 11, MENU_X = 32, MENU_W = 176;

export function items(): ItemId[] {
  const it: ItemId[] = ['play', 'channel', 'code', 'create', 'name', 'look', 'settings', 'awards'];
  if (hasSave()) it.push('reset');
  return it;
}
/** Rows that can't be picked right now: no private codes without multiplayer. */
export const disabled = (it: ItemId): boolean => !!net.offline && (it === 'code' || it === 'create');
const cur = (): ItemId => items()[menu.sel];

/** Channels on offer: auto, then 1..N, always one beyond the highest busy one (up to 9). */
export function channelChoices(counts = lobbyCounts(placeKey(menu.place))): number[] {
  const top = Math.max(0, ...counts.keys());
  const n = Math.min(9, Math.max(3, top + 1));
  return [0, ...Array.from({ length: n }, (_, i) => i + 1)];
}

/** Auto: the busiest channel that still has room, so players meet up; else 1. */
export function autoChannel(counts = lobbyCounts(placeKey(menu.place))): number {
  let best = 0, most = 0;
  for (const [c, n] of counts) if (n < MAX_PER_CHANNEL && (n > most || (n === most && c < best))) { best = c; most = n; }
  return best || 1;
}

let onStart: () => void = () => {};

/** Set up the menu; `start` runs once the player picks how to play. */
export function initMenu(start: () => void, place: Place): void {
  onStart = start;
  menu.open = true; menu.edit = null; menu.note = ''; menu.confirmReset = false; menu.channel = 0;
  menu.place = place;
  menu.name = myName();
  menu.code = typeof location !== 'undefined' ? parseCode(location.hash.slice(1)) : '';
  // a share link lands on the code row: Enter joins
  menu.sel = menu.code && !disabled('code') ? items().indexOf('code') : 0;
}

function go(code: string): void {
  net.code = code;
  net.channel = code ? 1 : menu.channel || autoChannel();
  if (typeof history !== 'undefined') history.replaceState(null, '', code ? `#${code}` : location.pathname + location.search);
  menu.open = false; menu.edit = null;
  onStart();
}

function joinCode(): void {
  const c = parseCode(menu.code);
  if (c) go(c);
  else { menu.note = `A CODE IS ${CODE_LEN} LETTERS`; menu.edit = 'code'; }
}

function stepChannel(d: number): void {
  const ch = channelChoices();
  const i = Math.max(0, ch.indexOf(menu.channel));
  menu.channel = ch[(i + d + ch.length) % ch.length];
}

function finishEdit(): void {
  if (menu.edit === 'name') menu.name = setMyName(menu.name);
  menu.edit = null;
}

/** Activate the selected row (Enter / Z / a second tap). */
export function activate(): void {
  const it = cur();
  if (disabled(it)) return;
  if (it !== 'reset') menu.confirmReset = false;
  menu.note = '';
  switch (it) {
    case 'play': go(''); break;
    case 'channel': go(''); break; // play on the channel shown
    case 'code':
      if (menu.edit === 'code' || parseCode(menu.code)) { finishEdit(); joinCode(); } else menu.edit = 'code';
      break;
    case 'create':
      menu.code = newCode();
      menu.sel = items().indexOf('code');
      menu.note = 'SHARE THE CODE THEN JOIN';
      break;
    case 'name':
      if (menu.edit === 'name') finishEdit(); else menu.edit = 'name';
      break;
    case 'look':
      openStylist();
      break;
    case 'settings':
      openSettings();
      break;
    case 'awards':
      openAchievements();
      break;
    case 'reset':
      if (!menu.confirmReset) { menu.confirmReset = true; break; }
      saving.enabled = false; clearSave();
      if (typeof location !== 'undefined') location.reload();
      break;
  }
}

/** A navigation key: up, down, left, right, enter, escape. */
export function menuKey(k: string): void {
  if (!menu.open) return;
  if (stylist.open) { stylistKey(k); return; }
  if (settingsUi.open) { settingsKey(k); return; }
  if (achUi.open) { achKey(k); return; }
  if (k === 'up' || k === 'down') {
    finishEdit();
    const it = items(), n = it.length;
    // step over rows that can't be picked (local only: the code rows)
    do menu.sel = (menu.sel + (k === 'up' ? n - 1 : 1)) % n; while (disabled(it[menu.sel]));
    menu.confirmReset = false; menu.note = '';
  } else if ((k === 'left' || k === 'right') && !menu.edit && cur() === 'channel') {
    stepChannel(k === 'left' ? -1 : 1);
  } else if (k === 'enter') {
    activate();
  } else if (k === 'escape') {
    finishEdit(); menu.confirmReset = false; menu.note = '';
  }
}

/** The field's text changed (typed into the hidden input). */
export function menuText(v: string): void {
  if (menu.edit === 'code') menu.code = v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, CODE_LEN);
  else if (menu.edit === 'name') menu.name = cleanName(v).slice(0, NAME_MAX);
}

/** A tap at view coords: pick a row; tap it again to use it. The channel
 *  row's left and right thirds step the channel. */
export function menuTap(x: number, y: number): void {
  const row = Math.floor((y - MENU_TOP) / MENU_ROW);
  if (row < 0 || row >= items().length || x < MENU_X || x >= MENU_X + MENU_W || disabled(items()[row])) return;
  if (items()[row] === 'channel' && menu.sel === row) {
    const third = (x - MENU_X) / MENU_W;
    if (third < 1 / 3) { stepChannel(-1); return; }
    if (third > 2 / 3) { stepChannel(1); return; }
  }
  if (menu.sel === row) { activate(); return; }
  finishEdit();
  menu.sel = row; menu.confirmReset = false; menu.note = '';
  // a tap on a text row starts typing straight away (opens the phone keyboard)
  if (items()[row] === 'code' || items()[row] === 'name') menu.edit = items()[row] as 'code' | 'name';
}
