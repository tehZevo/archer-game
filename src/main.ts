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
import { buildMenu, menu } from './menu';
const { sync } = net;

declare global {
  interface Window {
    game: typeof game
    archer: { gainExp: typeof gainExp; spendSp: typeof spendSp; rank: typeof rank; gotoFloor: typeof gotoFloor; net: typeof net; boost: typeof boost }
  }
}
/** Handy for console poking and automated checks. */
window.game = game;
window.archer = { gainExp, spendSp, rank, gotoFloor, net, boost };

function frame(now: number): void {
  const dt = Math.min(0.1, (now - game.last) / 1000);
  game.last = now;
  game.acc += dt;
  let steps = 0;
  // fixed 30 Hz physics; rAF renders as fast as the display allows.
  // The world stays frozen behind the main menu.
  if (menu.open) game.acc = 0;
  while (game.acc >= P.STEP) { update(P.STEP); game.acc -= P.STEP; steps++; }
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
buildMenu(() => {
  // regenerate floor 1 from the chosen instance's seed, then go online
  gotoFloor(1);
  net.net.started = true;
  logMsg(net.net.code
    ? `Private instance <b>${net.net.code}</b>. Share the code to play together.`
    : 'Welcome to <b>Eurekaland</b>. Climb the tower, chain skills for Fervor.');
  bannerMsg('Archer', 'Elven Bow · Arrow keys to move');
});
requestAnimationFrame(frame);
