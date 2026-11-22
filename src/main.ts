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
const { sync } = net;

declare global {
  interface Window {
    game: typeof game
    merc: { gainExp: typeof gainExp; spendSp: typeof spendSp; rank: typeof rank; gotoFloor: typeof gotoFloor; net: typeof net }
  }
}
/** Handy for console poking and automated checks. */
window.game = game;
window.merc = { gainExp, spendSp, rank, gotoFloor, net };

function frame(now: number): void {
  const dt = Math.min(0.1, (now - game.last) / 1000);
  game.last = now;
  game.acc += dt;
  let steps = 0;
  // fixed 30 Hz physics; rAF renders as fast as the display allows
  while (game.acc >= P.STEP) { update(P.STEP); game.acc -= P.STEP; steps++; }
  sync(); // publish our position to the current channel
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
logMsg('Welcome to <b>Eurekaland</b>. Climb the tower, chain skills for Fervor.');
bannerMsg('Archer', 'Elven Bow · Arrow keys to move');
requestAnimationFrame(frame);
