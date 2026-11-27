import type { Portal, SkillKey } from './types';
import { nextPlace } from './world';
import { EMOTES } from './emotes';
import { netEmote } from './net';
import { bump } from './achievements';
import { CAM, P, SKILL_ORDER, slotOf } from './config';
import { cameraTarget, gainExp, game, gotoPlace, logMsg, player, READY_FLASH, spawnWave } from './state';
import { pressed } from './input';
import { revive } from './combat';
import { getPlayerDeath, setPlayerDeath, updateCorpses, updatePlayerDeath } from './deaths';
import { cast } from './skills';
import { updateRush } from './rush';
import { updateRapid } from './rapid';
import { AIR_FORM, assaultLeaping, rushHolding } from './castrules';
import { activeSkill } from './progress';
import { sfx } from './audio';
import { decayBoost, waveRate } from './boost';
import { talk, updateEconomy } from './economy';
import { updateGear } from './gear';
import { dev, maxOut } from './dev';
import { bossAlive, portalOpen, updateQuakes } from './boss';
import { updatePet } from './pets';
import { updateStatus } from './status';
import { linkable, linkHeld, tickLinks } from './links';
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
  if (windowInput(dt)) return;
  game.time += dt;
  if (knockedOut(dt)) return;
  tickPlayer(dt);
  if (keyInput()) return;
  tickWaves(dt);
  tickCasting(dt);
  updateRapid(dt);
  movePlayer(dt, player.casting.useT > 0 || player.casting.recoverT > 0); // a skill's use and recovery time block movement input
  if (usePortal()) return;
  tickWorld(dt);
  tickEffects(dt);
  // knocked out: a tombstone drops where she fell and her ghost rises out of
  // it; she revives once that has played (see knockedOut)
  if (player.hp <= 0) setPlayerDeath(player.x, player.y + player.h);
  updateCamera(dt);
}

/** While the archer is down: the tombstone and ghost play out on the spot she
 *  fell, the world goes on around them (she takes no input and no hits), and
 *  when it's done she revives. True while down (the step is spent). */
function knockedOut(dt: number): boolean {
  if (!getPlayerDeath()) return false;
  updatePlayerDeath(dt);
  tickWaves(dt);
  tickWorld(dt);
  tickEffects(dt);
  if (!getPlayerDeath()) revive();
  updateCamera(dt);
  return true;
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
    player.readyT['ground-q'] = READY_FLASH; // a charge is back: the Q icon flashes
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
  // Each key fires its own skill (an upgrade fires from its base's key, an air
  // form from its ground form's: see castrules.AIR_FORM).
  for (const k of SKILL_ORDER) if (pressed(slotOf(k))) cast(k);
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

/** The cast animation and timers, the input buffer, links and fervor. */
function tickCasting(dt: number): void {
  if (player.castT > 0) player.castT -= dt; else player.cast = null;
  fireBuffered();
  tickLinks(); // after the buffer, so a link waiting on the cast's last moment lands
  if (player.superStance > 0) player.superStance -= dt;
  if (player.invuln > 0) player.invuln -= dt;
  if (player.casting.useT > 0) {
    player.casting.useT -= dt;
    if (player.casting.useT <= 0) player.casting.freeze = false; // the freeze ends with the cast
  } else if (player.casting.recoverT > 0) {
    // Recovery starts once the use animation ends, not in parallel with it.
    player.casting.recoverT -= dt;
  }
  if (player.fervorT > 0) { player.fervorT -= dt; if (player.fervorT <= 0) player.fervor = 0; }
  if (game.banner) { game.banner.t -= dt; if (game.banner.t <= 0) game.banner = null; }
}

/** The skill a key fires right now: its air form when airborne. */
const skillFor = (key: SkillKey): SkillKey => (!player.onGround && !player.climb && AIR_FORM[key]) || activeSkill(key).key;

/** Whether the buffered skill has to keep waiting. */
function bufferHeld(): boolean {
  const queued = player.casting.queued;
  if (!queued) return false;
  // a chained Double Shot waits out the slide itself
  if (queued === 'z' && player.rush.t > 0) return true;
  // a link waits for the cast it links off to reach its recovery
  const kind = skillFor(queued);
  if (linkable(kind)) return linkHeld(kind);
  // anything else waits out the whole cast (and Rush Toss's strike, the Assault's leap)
  if (rushHolding() || assaultLeaping()) return true;
  return player.castT > 0 || player.casting.recoverT > 0;
}

/** Fire the buffered skill on the first free frame. It aims the direction you
 *  were holding when you pressed it (captured in queuedFace); holding a new
 *  direction while it's buffered re-aims it, so a buffered combo follows your
 *  stick even though the cast you're in stays locked facing one way. */
function fireBuffered(): void {
  const k = player.casting.queued;
  if (!k) return;
  const aim = heldDir();
  if (aim !== 0) player.casting.queuedFace = aim; // re-aim while buffered
  if (player.casting.queuedFace !== 0) player.face = player.casting.queuedFace;
  if (bufferHeld()) return;
  player.casting.queued = null;
  cast(k, k === 'z');
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
