import { keepAliveWhileHidden } from './background';
import { bannerMsg, game, gainExp, gotoPlace, logMsg } from './state';
import { START } from './world';
import { rank, spendSp } from './progress';
import { advance, MAX_DT } from './loop';
import { render, resize } from './render';
import { bindMenuClicks } from './pausemenu';
import { cv } from './canvas';
import { buildTouch } from './touch';
import * as net from './net';
import * as boost from './boost';
import { initMenu, menu } from './menu';
import { bindMenu } from './menudom';
import { bindChat } from './chatdom';
import { loadFxSheets } from './fxsheets';
import { loadMobSheets } from './sprites';
import { loadTileSheets } from './tilebake';
import { loadArtSheets } from './artsheets';
import { TILESETS } from './tileset';
import { loadLayout } from './input';
import { hasSave, load, save, startRun, tickSave } from './save';
const { sync } = net;

declare global {
  interface Window {
    game: typeof game
    archer: { gainExp: typeof gainExp; spendSp: typeof spendSp; rank: typeof rank; gotoPlace: typeof gotoPlace; net: typeof net; boost: typeof boost; netStatus: typeof net.netStatus }
  }
}
/** Handy for console poking and automated checks. */
window.game = game;
window.archer = { gainExp, spendSp, rank, gotoPlace, net, boost, netStatus: net.netStatus };

/** One display frame: advance the world on the fixed step (see loop.ts for
 *  the stepping and input contract), then draw. */
function frame(now: number): void {
  const dt = Math.min(MAX_DT, (now - game.last) / 1000);
  game.last = now;
  // the world stays frozen behind the main menu
  const steps = advance(game, dt, menu.open);
  if (!menu.open) tickSave(dt); // autosave every few seconds while playing
  sync(); // publish our position to the current channel (once started)
  // in play the picture only changes on a game step, so a frame without one
  // would redraw the same picture (the title menu, frozen, still draws every frame)
  if (steps || menu.open) render();
  requestAnimationFrame(frame);
}

buildTouch();
bindMenuClicks(cv);
resize();
gotoPlace(START);
addEventListener('resize', resize);
// saved progress loads at boot (the HUD behind the menu shows it); the floor resumes on Play
const fresh = !hasSave();
const resumePlace = load();
if (fresh) startRun(); // a new run: achievement bonuses (coins, potions, SP)
// save when the tab is hidden or closed (mobile browsers may never fire unload)
addEventListener('visibilitychange', () => { if (document.hidden && !menu.open) save(); });
addEventListener('pagehide', () => { if (!menu.open) save(); });

initMenu(() => {
  // generate the saved floor from the chosen instance's seed, then go online
  gotoPlace(resumePlace);
  net.net.started = true;
  logMsg(net.net.code
    ? `Private instance <b>${net.net.code}</b>. Share the code to play together.`
    : 'Welcome to <b>Eurekaland</b>. Climb the tower, chain skills for Fervor.');
  bannerMsg('Archer', 'Elven Bow · Arrow keys to move');
}, resumePlace);
bindMenu(cv);
bindChat(cv);
void loadLayout(); // key labels follow the keyboard layout
// the lobby only shares channel head-counts, so the menu can show them
net.joinLobby();
loadFxSheets(); // skill effects, baked to PNG (see fxsheets.ts)
loadMobSheets(); // enemies, likewise (see sprites.ts)
loadTileSheets(Object.values(TILESETS)); // and tilesets (see tilebake.ts)
loadArtSheets(); // and the scenery: props, town decor, backdrops (see artsheets.ts)
// a background tab has no frames: keep publishing our (still) position anyway
keepAliveWhileHidden(sync);
requestAnimationFrame(frame);
