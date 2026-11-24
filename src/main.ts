import { keepAliveWhileHidden } from './background';
import { bannerMsg, game, gainExp, gotoFloor, logMsg } from './state';
import { rank, spendSp } from './progress';
import { clearPressed } from './input';
import { P } from './config';
import { update } from './update';
import { render, resize } from './render';
import { bindMenuClicks, buildPanel, syncPanel } from './hud';
import { cv } from './canvas';
import { buildTouch } from './touch';
import * as net from './net';
import * as boost from './boost';
import { initMenu, menu } from './menu';
import { bindMenu } from './menudom';
import { bindChat } from './chatdom';
import { loadLayout } from './input';
import { load, save, tickSave } from './save';
const { sync } = net;

declare global {
  interface Window {
    game: typeof game
    archer: { gainExp: typeof gainExp; spendSp: typeof spendSp; rank: typeof rank; gotoFloor: typeof gotoFloor; net: typeof net; boost: typeof boost; netStatus: typeof net.netStatus }
  }
}
/** Handy for console poking and automated checks. */
window.game = game;
window.archer = { gainExp, spendSp, rank, gotoFloor, net, boost, netStatus: net.netStatus };

function frame(now: number): void {
  const dt = Math.min(0.1, (now - game.last) / 1000);
  game.last = now;
  game.acc += dt;
  let steps = 0;
  // fixed 30 Hz physics; rAF renders as fast as the display allows.
  // The world stays frozen behind the main menu.
  if (menu.open) game.acc = 0;
  while (game.acc >= P.STEP) { update(P.STEP); game.acc -= P.STEP; steps++; }
  if (!menu.open) tickSave(dt); // autosave every few seconds while playing
  sync(); // publish our position to the current channel (once started)
  // only consume the input latch once a physics step has acted on it, otherwise
  // key taps arriving between two 30Hz steps vanish
  if (steps) clearPressed();
  render();
  syncPanel();
  requestAnimationFrame(frame);
}

buildPanel();
buildTouch();
bindMenuClicks(cv);
resize();
gotoFloor(1);
addEventListener('resize', resize);
// saved progress loads at boot (the HUD behind the menu shows it); the floor resumes on Play
const resumeFloor = load();
// save when the tab is hidden or closed (mobile browsers may never fire unload)
addEventListener('visibilitychange', () => { if (document.hidden && !menu.open) save(); });
addEventListener('pagehide', () => { if (!menu.open) save(); });

initMenu(() => {
  // generate the saved floor from the chosen instance's seed, then go online
  gotoFloor(resumeFloor);
  net.net.started = true;
  logMsg(net.net.code
    ? `Private instance <b>${net.net.code}</b>. Share the code to play together.`
    : 'Welcome to <b>Eurekaland</b>. Climb the tower, chain skills for Fervor.');
  bannerMsg('Archer', 'Elven Bow · Arrow keys to move');
}, resumeFloor);
bindMenu(cv);
bindChat(cv);
void loadLayout().then(buildPanel); // relabel the panel with this layout's letters
// the lobby only shares channel head-counts, so the menu can show them
net.joinLobby();
// a background tab has no frames: keep publishing our (still) position anyway
keepAliveWhileHidden(sync);
requestAnimationFrame(frame);
