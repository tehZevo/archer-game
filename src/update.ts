import type { Portal, SkillKey } from './types';
import { nextPlace } from './world';
import { EMOTES } from './emotes';
import { netEmote } from './net';
import { bump } from './achievements';
import { CAM, P, SKILL_ORDER } from './config';
import { cameraTarget, gainExp, game, gotoPlace, logMsg, player, READY_FLASH, spawnWave } from './state';
import { pressed } from './input';
import { revive } from './combat';
import { setPlayerDeath, updateCorpses, updatePlayerDeath } from './deaths';
import { cast } from './skills';
import { updateRush } from './rush';
import { AIR_FORM, assaultLeaping, rushHolding } from './castrules';
import { isLearned } from './progress';
import { sfx } from './audio';
import { decayBoost, waveRate } from './boost';
import { talk, updateEconomy } from './economy';
import { updateGear } from './gear';
import { dev, maxOut } from './dev';
import { bossAlive, portalOpen, updateQuakes } from './boss';
import { updatePet } from './pets';
import { updateStatus } from './status';
import { bufferWindowOpen, comboOpen, ownWindowOpen, tickLinks } from './links';
import { windowInput } from './windows';
import { openConfirm } from './confirm';
import { updateMobs } from './mobai';
import { heldDir, movePlayer } from './move';

/**
 * One fixed step of the game, in phases. The order matters: windows freeze
 * everything, input is read before the casting timers run down, the player
 * moves before the world, and the rush pushes enemies after they move.
 */
export function update(dt: number): void {
  // knocked out: the tombstone and ghost animation starts here, and ages on
  // its own clock while the respawned archer plays on (see deaths.ts)
  updatePlayerDeath(dt);
  if (player.hp <= 0) setPlayerDeath(player.x, player.y + player.h);
  if (windowInput(dt)) return;
  game.time += dt;
  tickPlayer(dt);
  if (keyInput()) return;
  tickWaves(dt);
  tickCasting(dt);
  movePlayer(dt, player.casting.useT > 0); // a skill's use time blocks movement input
  if (usePortal()) return;
  tickWorld(dt);
  tickEffects(dt);
  if (player.hp <= 0) revive();
  updateCamera(dt);
}

/** Regen, the Electric Blitz charges, cooldowns and status effects. */
function tickPlayer(dt: number): void {
  // Regen: 5% of max HP/MP every 5s; HP doesn't regen while in combat.
  if (player.combatT > 0) player.combatT -= dt;
  player.regenT += dt;
  if (player.regenT >= P.REGEN_EVERY) {
    player.regenT -= P.REGEN_EVERY;
    player.mp = Math.min(player.mpMax, player.mp + player.mpMax * P.REGEN_FRAC);
    if (player.combatT <= 0) player.hp = Math.min(player.hpMax, player.hp + player.hpMax * P.REGEN_FRAC);
  }
  // Electric Blitz banks its charges: one refills every 4s, and a linked
  // skill (see skills.ts) shaves time off the charge currently filling.
  if (player.blitz.charges < P.BLITZ_MAX && (player.blitz.t += dt) >= P.BLITZ_CHARGE_T) {
    player.blitz.charges++;
    player.blitz.t = player.blitz.charges >= P.BLITZ_MAX ? 0 : player.blitz.t - P.BLITZ_CHARGE_T;
    player.readyT.Q = READY_FLASH; // a charge is back: the Q icon flashes
  }
  for (const k of Object.keys(player.cd)) {
    player.usedT[k] = Math.max(0, (player.usedT[k] ?? 0) - dt); // the cast flash fades
    const was = player.cd[k];
    player.cd[k] = Math.max(0, was - dt);
    // a skill that just finished cooling off flashes on the bar
    if (was > 0 && player.cd[k] === 0) player.readyT[k] = READY_FLASH;
    else player.readyT[k] = Math.max(0, (player.readyT[k] ?? 0) - dt);
  }
  updateStatus(player, dt);
}

/** Emotes, skill keys and dev keys. True if a dev warp left the floor. */
function keyInput(): boolean {
  // F1-F7: emotes
  EMOTES.forEach((e, i) => { if (pressed(`f${i + 1}`)) netEmote(e); });
  // Basic attack during Rush Toss's link window casts the link skill
  // (Rising Arrows, or Skyward Assault once upgraded).
  const linkZ = pressed('z') && comboOpen() && isLearned('W');
  if (linkZ) cast('W');
  for (const k of SKILL_ORDER) if (pressed(k) && !(linkZ && k === 'Z')) cast(k);
  // dev keys (?dev only): [ levels up, ] warps to the next floor, \ maxes out
  if (!dev.on) return false;
  if (pressed('[')) gainExp(player.expNext - player.exp);
  if (pressed(']')) { gotoPlace(nextPlace(game.floor.place)); return true; }
  if (pressed('\\')) maxOut();
  return false;
}

/** Enemy waves run on the fixed step so headless tests stay deterministic;
 *  other players' kills in this instance make waves come faster. */
function tickWaves(dt: number): void {
  decayBoost(dt);
  game.waveT += dt * waveRate();
  if (game.waveT >= P.WAVE_EVERY) { game.waveT = 0; spawnWave(); }
}

/** The cast animation and timers, the input buffer, link windows and fervor. */
function tickCasting(dt: number): void {
  if (player.castT > 0) player.castT -= dt; else player.cast = null;
  fireBuffered();
  if (player.superStance > 0) player.superStance -= dt;
  if (player.invuln > 0) player.invuln -= dt;
  if (player.casting.useT > 0) {
    player.casting.useT -= dt;
    if (player.casting.useT <= 0) player.casting.freeze = false; // the freeze ends with the cast
  }
  if (player.casting.recoverT > 0) player.casting.recoverT -= dt;
  tickLinks(dt);
  if (player.fervorT > 0) { player.fervorT -= dt; if (player.fervorT <= 0) player.fervor = 0; }
  if (game.banner) { game.banner.t -= dt; if (game.banner.t <= 0) game.banner = null; }
}

/** The skill a key fires right now: its air form when airborne. */
const skillFor = (key: SkillKey): SkillKey => (!player.onGround && !player.climb && AIR_FORM[key]) || key;

/** Whether the buffered skill has to keep waiting. */
function bufferHeld(): boolean {
  const queued = player.casting.queued;
  // a chained link waits for Rush Toss to finish (a chained Double Shot also
  // waits out the slide itself), and the spin waits out the Assault's leap
  if (rushHolding()) return true;
  if (queued === 'Z' && player.rush.t > 0) return true;
  if (assaultLeaping()) return true;
  // the current skill's animation or its recovery holds it, unless a
  // buffering link window (Q's, a blitz's self-link, the Assault's spin)
  // cuts it short
  const busy = player.castT > 0 || player.casting.recoverT > 0;
  return busy && !bufferWindowOpen() && !(queued && ownWindowOpen(skillFor(queued)));
}

/** Fire the buffered skill on the first free frame. It aims where you're
 *  holding when it fires, not where you faced when you pressed it (mashing
 *  Q left, Q right zips you back and forth). */
function fireBuffered(): void {
  const k = player.casting.queued;
  if (!k) return;
  const aim = heldDir();
  if (aim !== 0) player.face = aim;
  if (bufferHeld()) return;
  player.casting.queued = null;
  cast(k, k === 'Z');
}

/** Up beside a town NPC talks to them; standing on a portal, Up warps to
 *  where it leads (the next floor; a town's also lead down, and its up
 *  portals into the areas above). True if the player left the floor. */
function usePortal(): boolean {
  const feet = player.y + player.h;
  const p = game.floor.portals.find((q) => player.onGround && Math.abs(player.x - q.x) < q.w / 2 + 10 && feet >= q.y - 4 && feet <= q.y + 8);
  if (talk()) return true; // (before the portals: NPCs and portals never overlap)
  if (!p || !pressed('up')) return false;
  if (!portalOpen(p)) { logMsg(`The way up is sealed. Defeat <b>${bossAlive()!.name}</b> first.`); return false; }
  // The way back down asks first, so a stray Up press doesn't ship you to town.
  if (p.down && !game.floor.town) { openConfirm(`Return to ${p.label}?`, () => warp(p)); return true; }
  warp(p);
  return true;
}

//** Travel through a portal (the return's trip runs off the confirm dialog). */
function warp(p: Portal): void {
  if (!p.down && !game.floor.town) bump('floors'); // climbed past a combat floor
  sfx.portal();
  gotoPlace(p.to);
}

/** Everything else on the floor, after the player has moved. */
function tickWorld(dt: number): void {
  updateMobs(dt);
  updateQuakes(dt);
  updateEconomy(dt); // coin piles fall and fade; X picks up, A/S drink
  updateCorpses(dt); // enemies dying their own ways
  updateGear(dt);    // gear on the floor fades, and walking over it puts it on
  updatePet(dt);     // fetches piles lying near you
  updateRush(dt);    // after the mobs move, so the ones being pushed stay in front
}

/** Arrows in flight, delayed hits, effects and damage numbers. */
function tickEffects(dt: number): void {
  // arrows: fly, and apply their hit on arrival
  for (let i = game.shots.length - 1; i >= 0; i--) {
    const s = game.shots[i];
    if (s.delay && s.delay > 0) { s.delay -= dt; continue; }
    s.x += s.vx * dt; s.y += s.vy * dt; s.t -= dt;
    if (s.t <= 0) { game.shots.splice(i, 1); s.onHit?.(); }
  }
  for (let i = game.timers.length - 1; i >= 0; i--) {
    const tm = game.timers[i];
    if ((tm.t -= dt) <= 0) { game.timers.splice(i, 1); tm.fn(); }
  }
  for (let i = game.fx.length - 1; i >= 0; i--) {
    const f = game.fx[i];
    if (f.follow) { f.x = player.x; f.y = player.y + player.h; }
    f.t -= dt;
    if (f.t <= 0) game.fx.splice(i, 1);
  }
  for (let i = game.dmgNums.length - 1; i >= 0; i--) {
    const d = game.dmgNums[i];
    if (d.delay && d.delay > 0) { d.delay -= dt; continue; } // not shown yet
    d.t -= dt * 1.1; d.y += d.vy * dt; d.vy *= 0.96;
    if (d.t <= 0) game.dmgNums.splice(i, 1);
  }
}

/** Ease toward the deadzone target rather than pinning the player to it. */
function updateCamera(dt: number): void {
  const t = cameraTarget();
  const k = Math.min(1, CAM.LERP * dt);
  game.cam.x += (t.x - game.cam.x) * k;
  game.cam.y += (t.y - game.cam.y) * k;
}
