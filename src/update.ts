import { nextPlace } from './world';
import { EMOTES } from './emotes';
import { netEmote } from './net';
import { achKey, achUi, bump, openAchievements } from './achievements';
import { ANIM_RATE } from './mobanim';
import { CAM, P, SKILL_ORDER, TILE, WORLD } from './config';
import { passiveBonus } from './progress';
import { cameraTarget, gainExp, game, gotoPlace, logMsg, mobBounds, player, READY_FLASH, spawnWave } from './state';
import { held, pressed, repeated } from './input';
import { catchClimbable, collideGround, integrate, STICK, surfaceBetween, surfaceYAt } from './physics';
import { damage, killMob, revive } from './combat';
import { setPlayerDeath, updatePlayerDeath } from './deaths';
import { assaultLeaping, barrageTargets, cast, landDive, updateRush } from './skills';
import { isLearned, skillRows, spendSkill, spendStat, STAT_KEYS } from './progress';
import { sfx } from './audio';
import { decayBoost, waveRate } from './boost';
import { clamp } from './util';
import { shop, shopInput, talk, trainer, trainerInput, updateEconomy } from './economy';
import { bag, unequip, updateGear, wear } from './gear';
import { dev, devStops } from './dev';
import { bossAlive, bossMove, hurtPlayer, portalOpen, updateQuakes } from './boss';
import { stylist, stylistKey } from './stylist';
import { board, boardInput } from './quests';
import { grip } from './floormods';
import { updatePet } from './pets';
import { updateCorpses } from './deaths';
import { INFLICT, maybeInflict, slowFactor, updateStatus } from './status';
import { openSettings, settingsKey, settingsUi } from './settings';
import type { PauseMenu, Platform } from './types';

export function update(dt: number): void {
  // knocked out: the tombstone and ghost animation starts here, and ages on
  // its own clock while the respawned archer plays on (see deaths.ts)
  updatePlayerDeath(dt);
  if (player.hp <= 0) setPlayerDeath(player.x, player.y + player.h);
  // the shop window holds the world still while you browse (Esc closes it)
  if (shop.open) { shopInput(); return; }
  // so does the trainer's
  if (trainer.open) { trainerInput(); return; }
  // and the stylist's and quest board's
  if (stylist.open) { stylistInput(); return; }
  if (board.open) { boardInput(); return; }
  // the settings window (from the Esc menu) sits over the paused game
  if (settingsUi.open) { settingsInput(); return; }
  if (achUi.open) { achInput(); return; }
  // dev menu (?dev only): ` opens it; it freezes the game like the pause menu
  if (dev.on && pressed('`')) dev.open = !dev.open;
  if (dev.open) { devInput(dt); return; }
  // Esc pause menu: freezes the game; arrows move, Z/Enter spends AP or SP
  if (pressed('escape')) game.pause = game.pause ? null : { col: 0, row: 0 };
  if (game.pause) { pauseInput(game.pause, dt); return; }
  game.time += dt;
  // Regen: 5% of max HP/MP every 5s; HP doesn't regen while in combat.
  if (player.combatT > 0) player.combatT -= dt;
  player.regenT += dt;
  if (player.regenT >= P.REGEN_EVERY) {
    player.regenT -= P.REGEN_EVERY;
    player.mp = Math.min(player.mpMax, player.mp + player.mpMax * P.REGEN_FRAC);
    if (player.combatT <= 0) player.hp = Math.min(player.hpMax, player.hp + player.hpMax * P.REGEN_FRAC);
  }
  // Electric Blitz banks its charges: one refills every 10s, and a linked
  // skill (see skills.ts) shaves time off the charge currently filling.
  if (player.blitzCharges < P.BLITZ_MAX && (player.blitzT += dt) >= P.BLITZ_CHARGE_T) {
    player.blitzCharges++;
    player.blitzT = player.blitzCharges >= P.BLITZ_MAX ? 0 : player.blitzT - P.BLITZ_CHARGE_T;
    player.readyT.Q = READY_FLASH; // a charge is back: the Q icon flashes
  }
  for (const k of Object.keys(player.cd)) {
    const was = player.cd[k];
    player.cd[k] = Math.max(0, was - dt);
    // a skill that just finished cooling off flashes on the bar
    if (was > 0 && player.cd[k] === 0) player.readyT[k] = READY_FLASH;
    else player.readyT[k] = Math.max(0, (player.readyT[k] ?? 0) - dt);
  }
  updateStatus(player, dt);
  // F1-F7: emotes
  EMOTES.forEach((e, i) => { if (pressed(`f${i + 1}`)) netEmote(e); });
  // skill keys
  // Basic attack during Sky Toss's link window casts the link skill
  // (Skyfall Volley, or Sky Assault once upgraded).
  const linkZ = pressed('z') && player.combo > 0 && isLearned('W');
  if (linkZ) cast('W');
  for (const k of SKILL_ORDER) if (pressed(k) && !(linkZ && k === 'Z')) cast(k);
  // holding Jump keeps jumping: re-jump on every landing
  if (!pressed('c') && held('c') && player.onGround && !player.climb) cast('C');
  // dev keys (?dev only): [ levels up, ] warps to the next floor
  if (dev.on && pressed('[')) gainExp(player.expNext - player.exp);
  if (dev.on && pressed(']')) { gotoPlace(nextPlace(game.floor.place)); return; }

  // enemy waves run on the fixed step so headless tests stay deterministic
  // other players' kills in this instance make waves come faster
  decayBoost(dt);
  game.waveT += dt * waveRate();
  if (game.waveT >= P.WAVE_EVERY) { game.waveT = 0; spawnWave(); }

  if (player.castT > 0) player.castT -= dt; else player.cast = null;
  // a chained link fires as soon as Sky Toss finishes
  // (a chained Twin Shot also waits out the slide itself)
  const busy = player.recoverT > 0; // the animation's recovery: a live link window cuts it short
  // Q's link, a blitz's self-link, or the Midair Spin Sky Assault opens
  const window = player.combo > 0 || player.blitzLinkT > 0 || player.spinLinkT > 0;
  // A buffered skill aims where you're holding when it fires, not where you
  // faced when you pressed it: keep facing live while the current skill locks
  // your movement (mashing Q left, Q right zips you back and forth).
  const aimDir = held('left') ? -1 : held('right') ? 1 : 0;
  if (player.queued && aimDir !== 0) player.face = aimDir as 1 | -1;
  if (player.queued && !(player.cast === 'rush' && player.castT > 0) && !(player.queued === 'Z' && player.rushT > 0) && !(busy && !window) && !assaultLeaping()) {
    const k = player.queued; player.queued = null;
    cast(k, k === 'Z');
  }
  if (player.superStance > 0) player.superStance -= dt;
  if (player.invuln > 0) player.invuln -= dt;
  if (player.useT > 0) player.useT -= dt;
  if (player.recoverT > 0) player.recoverT -= dt;
  const locked = player.useT > 0; // skill use time: no movement input
  if (player.comboT > 0) { player.comboT -= dt; if (player.comboT <= 0) player.combo = 0; }
  if (player.assaultLinkT > 0) player.assaultLinkT -= dt;
  if (player.blitzLinkT > 0) player.blitzLinkT -= dt;
  if (player.glideLinkT > 0) player.glideLinkT -= dt;
  if (player.volleyLinkT > 0) player.volleyLinkT -= dt;
  if (player.spinLinkT > 0) player.spinLinkT -= dt;
  if (player.fervorT > 0) { player.fervorT -= dt; if (player.fervorT <= 0) player.fervor = 0; }
  if (game.banner) { game.banner.t -= dt; if (game.banner.t <= 0) game.banner = null; }

  // rope / ladder — v83 rules: holding Up catches a climbable whose bottom is
  // within 20px above the feet (feet rise to it); Down grabs one whose top sits
  // just below the feet. Checked every frame, not just on key-down.
  // Jump only leaves a climbable with Left/Right held; otherwise it does nothing.
  const offDir = held('left') ? -1 : held('right') ? 1 : 0;
  if (player.climb && (!pressed('c') || locked || offDir === 0)) {
    const r = player.climb;
    // Up + Jump starts a rush: shoot up the climbable and pop off the top
    // (once you have Agile Climbing)
    if (!locked && pressed('c') && held('up') && player.ranks.AC > 0) { player.climbRush = true; sfx.jump(); }
    const rush = P.CLIMB_RUSH * (1 + passiveBonus('AC'));
    if (player.climbRush) player.y -= rush * dt;
    else if (!locked && held('up'))   player.y -= P.CLIMB * (1 + passiveBonus('AC')) * dt;
    else if (!locked && held('down')) player.y += P.CLIMB * dt;
    const top = r.y1 - player.h, bot = r.y2 - player.h;
    player.y = clamp(player.y, top, bot);
    player.x = r.x;
    player.vx = 0; player.vy = 0;
    player.animState = 'climb';
    if (player.climbRush && player.y <= top + 0.5) {
      // reached the top mid-rush: jump up off it, then land on the platform
      player.climb = null;
      player.climbRush = false;
      player.onGround = false;
      player.vy = -P.JUMP_V * P.CLIMB_RUSH_POP;
    } else if (player.y <= top + 0.5 || player.y >= bot - 0.5) {
      player.climb = null;
      player.onGround = true;
    }
  } else {
    if (player.climb) {                            // jump off, in the held direction
      player.climb = null;
      player.climbRush = false;
      player.onGround = false;
      player.vy = -P.JUMP_V * 0.45;
      player.vx = offDir * P.JUMP_H;
      player.face = offDir as 1 | -1;
      // holding Up would otherwise re-catch this rope the same frame
      player.leftClimbX = player.x;
    }
    if (player.hangT > 0) {
      // Sky Assault: hover in place, striking airborne enemies at intervals
      player.hangT -= dt;
      if (player.hangT <= 0) {
        // the hover ends here: landing opens the link window, so Tempest
        // (R) fires as a finisher on the Q -> W -> AB chain
        player.assaultLinkT = 1.1;
      }
      player.vx = 0; player.vy = 0;
      player.hangHitT -= dt;
      if (player.hangHits > 0 && player.hangHitT <= 0) {
        player.hangHitT = P.BARRAGE_HANG / 7; // 6 strikes spread through the hover
        player.hangHits--;
        game.fx.push({ type: 'swoosh', x: player.x + player.face * 10, y: player.y + player.h, t: 0.2, face: player.hangHits % 2 ? -player.face : player.face });
        barrageTargets().slice(0, player.hangTargets).forEach((m) => damage(m, player.hangDmg, { airborne: true, more: player.hangHits > 0 }));
      }
      player.animState = 'jump';
    } else {
      // horizontal: accel toward target speed (the classic side-scroller walk over a few frames)
      const busy = (player.cast === 'rush' ? 0.55 : 1) * slowFactor(player); // chill slows you
      // holding Down on the ground lies you flat, but Left/Right wins: you
      // stand straight up and walk, and lie back down when you let go
      const walking = !locked && held('left') !== held('right');
      const prone = player.onGround && !locked && held('down') && !walking;
      let target = 0;
      if (!locked && held('left'))  { target = -P.WALK * busy; player.face = -1; }
      if (!locked && held('right')) { target =  P.WALK * busy; player.face =  1; }
      if (!player.onGround) {
        // Air control: holding against your motion brakes toward a standstill
        // but never turns you around; otherwise momentum is kept.
        if (target !== 0 && Math.sign(target) === -Math.sign(player.vx)) {
          const b = P.AIR_BRAKE * dt;
          player.vx = player.vx > 0 ? Math.max(0, player.vx - b) : Math.min(0, player.vx + b);
        } else {
          player.vx *= 0.995;
        }
      } else if (target !== 0) {
        // on ice (grip < 1) you pick up speed, turn and stop slowly
        const a = P.ACCEL * grip() * dt;
        player.vx += clamp(target - player.vx, -a, a);
      } else {
        const fr = P.FRICTION * grip() * dt;
        player.vx += clamp(0 - player.vx, -fr, fr);
      }


      // Sky Toss never slides you off a platform: stop at the edge instead
      if (player.rushT > 0 && player.onGround) {
        const feetNow = player.y + player.h, nx = player.x + player.vx * dt;
        if (!surfaceBetween(nx, 1, feetNow - 12, feetNow + 12)) player.vx = 0;
      }
      // Spike Lift: the spikes push you up steadily, against gravity
      if (player.liftT > 0) { player.liftT -= dt; player.vy = -P.SPIKE_RISE_V - P.GRAVITY * dt; }
      // Midair Spin: the sweep holds you steady, so you don't fall
      // straight through the animation
      if (player.cast === 'shoot' && player.skillPose === 'spin' && !player.onGround) player.vy = 0;
      const prevFeet = player.y + player.h, prevX = player.x;
      integrate(player, dt);
      // clamp to the world before colliding, so the ground test uses the final x
      player.x = clamp(player.x, player.w / 2, WORLD.w - player.w / 2);
      // ...and vertically: chained aerial hops (Plunging Volley's stacked
      // momentum) can't carry you off the top of the map
      player.y = clamp(player.y, 0, WORLD.h - player.h);
      collideGround(player, prevFeet, prevX);
      landDive(); // an Air Dive touching down rolls into the rush this same frame

      // grab a rope/ladder first, so a rope hanging from the platform you're
      // standing on is caught before the drop-through consumes the Down press
      const c = catchClimbable();
      if (c) {
        player.climb = c;
        player.dropBlock = null;
        player.liftT = 0;
        player.x = c.x;
        player.y = clamp(player.y, c.y1 - player.h, c.y2 - player.h);
        player.vx = 0; player.vy = 0;
        player.onGround = false;
        player.animState = 'climb';
      } else {
        player.animState = !player.onGround ? 'jump'
          : prone ? 'prone' : Math.abs(player.vx) > 12 ? 'walk' : 'idle';
      }
    }
  }
  player.x = clamp(player.x, player.w / 2, WORLD.w - player.w / 2); // x is the centre
  player.anim += dt * (player.animState === 'walk' ? 9 : 4);

  // standing on a portal and pressing Up warps to where it leads (the next
  // floor; a town's also lead down, and its up portals into the areas above)
  const feet = player.y + player.h;
  const p = game.floor.portals.find((q) => player.onGround && Math.abs(player.x - q.x) < q.w / 2 + 10 && feet >= q.y - 4 && feet <= q.y + 8);
  // Up beside a town NPC talks to them (before the portals: they never overlap)
  if (talk()) return;
  if (p && pressed('up') && !portalOpen(p)) logMsg(`The way up is sealed. Defeat <b>${bossAlive()!.name}</b> first.`);
  else if (p && pressed('up')) {
    if (!p.down && !game.floor.town) bump('floors'); // climbed past a combat floor
    sfx.portal();
    gotoPlace(p.to);
    return;
  }

  updateMobs(dt);
  updateQuakes(dt);
  updateEconomy(dt); // coin piles fall and fade; X picks up, A/S drink
  updateCorpses(dt); // enemies dying their own ways
  updateGear(dt);   // gear on the floor fades, and walking over it puts it on
  updatePet(dt); // fetches piles lying near you
  updateRush(dt); // after the mobs move, so the ones being pushed stay in front

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
    if (game.fx[i].t <= 0) game.fx.splice(i, 1);
  }
  for (let i = game.dmgNums.length - 1; i >= 0; i--) {
    const d = game.dmgNums[i];
    if (d.delay && d.delay > 0) { d.delay -= dt; continue; } // not shown yet
    d.t -= dt * 1.1; d.y += d.vy * dt; d.vy *= 0.96;
    if (d.t <= 0) game.dmgNums.splice(i, 1);
  }

  if (player.hp <= 0) revive();
  updateCamera(dt);
}

/** px either side of the player a chasing enemy stops turning toward them. */
export const CHASE_SLACK = 3;
/** Seconds a chasing enemy stops to turn round when you get past it. */
export const CHASE_TURN = 0.3;
/** Tiles past the player a chasing enemy runs to before turning back, so a
 *  chase sweeps past you and comes at you from the other side. */
export const CHASE_OVERSHOOT = 3 * TILE;

function updateMobs(dt: number): void {
  for (const m of [...game.mobs]) {
    updateStatus(m, dt, m);
    if (!game.mobs.includes(m)) continue; // poisoned or burned to death
    if (m.hitFlash > 0) m.hitFlash -= dt;
    if (m.barT > 0) m.barT -= dt;
    if (m.hurt) m.hurt = Math.max(0, m.hurt - dt);
    if (m.dying !== undefined) {
      // dead, waiting on its attacker's last hits: frozen where it was struck
      m.dying -= dt; m.vx = 0; m.vy = 0;
      if (m.dying <= 0) killMob(m);
      continue;
    }
    m.anim += dt * ANIM_RATE;
    if (m.boss) { m.stun = 0; m.airTime = 0; } // bosses shrug off stuns and launches
    if (m.stun > 0) { m.stun -= dt; m.vx *= 0.8; }
    else if (m.airTime > 0) { m.airTime -= dt; m.vx *= 0.9; }
    else if ((m.hurt ?? 0) > 0 && !m.boss) m.vx *= 0.7; // hitstun: flinch in place (bosses only flash)
    else {
      const d = player.x - m.x;
      const [lo, hi] = mobBounds(m);
      // mobs only chase the player after being attacked, and only while the
      // player is over their own platform: past its end they'd just stand
      // pressed against the edge, so they go back to patrolling
      const reachable = player.x >= lo - 8 && player.x <= hi + 8;
      if (m.boss) bossMove(m, dt, lo, hi);
      else if (m.aggro && reachable && Math.abs(d) < 260 && Math.abs((m.y + m.h) - (player.y + player.h)) < 90) {
        // full speed at you, turning on the spot: no easing off as it closes
        // in. It aims a few tiles past you, so it runs over you and turns
        // round there, coming back from the other side instead of parking.
        const goal = player.x + m.dir * CHASE_OVERSHOOT;
        const toGoal = goal - m.x;
        // the sweep ends near the goal, once it is already past it (you
        // moved), or pinned at its platform's end (the goal lies beyond it)
        const pinned = (m.dir > 0 && m.x >= hi - 1) || (m.dir < 0 && m.x <= lo + 1);
        if (Math.abs(toGoal) > CHASE_SLACK && Math.sign(toGoal) === m.dir && !pinned) {
          m.turn = 0;
          m.vx = m.dir * m.spd * slowFactor(m);
        } else {
          // at the far end of the sweep: stop, then set off the other way
          m.turn = (m.turn ?? 0) + dt;
          m.vx = 0;
          if (m.turn >= CHASE_TURN) {
            // back toward you; pinned at an edge with you still beyond it,
            // it sweeps back the other way instead of pressing on the edge
            const toward = Math.sign(d) || m.dir;
            m.dir = pinned && toward === m.dir ? -m.dir : toward;
            m.turn = 0;
          }
        }
      } else {
        m.vx += (m.dir * m.spd * slowFactor(m) - m.vx) * Math.min(1, 12 * dt);
        // turn back at the end of the patrol, or on reaching the platform's edge
        // (which can come first: the map edge cuts some platforms short)
        if (Math.abs(m.x - m.home) > m.range || (m.dir > 0 && m.x >= hi - 0.5) || (m.dir < 0 && m.x <= lo + 0.5)) {
          m.dir = Math.sign(m.home - m.x) || -m.dir;
        }
      }
      // contact damage: only when the bodies actually overlap (x is centre, y is top)
      const touching = Math.abs(d) < (m.w + player.w) / 2
        && player.y < m.y + m.h && m.y < player.y + player.h;
      if (touching && m.atkCd <= 0) {
        m.atkCd = 1.1;
        if (hurtPlayer(m.dmg, m.x, m.level)) maybeInflict(player, INFLICT.mob);
      }
      m.atkCd = Math.max(0, m.atkCd - dt);
    }

    if (m.airTime > 0 || !m.fly) {
      const old = m.vy;
      const prevFeet = m.y + m.h;
      m.vy = Math.min(m.vy + P.GRAVITY * dt, P.TERMINAL);
      m.y += (old + m.vy) * 0.5 * dt;
      // swept landing; also follows slopes up/down by STICK px. A mob only
      // ever lands on its own platform (it passes through any other), so a
      // launch can't knock it onto a different one. A boss is big enough to
      // stride across the whole floor, so it lands on whatever is under it
      // (except, slamming down at you, anything above where you stand).
      const drop = m.boss?.dropTo;
      const home = (p: Platform): boolean => m.boss
        ? drop === undefined || surfaceYAt(p, m.x) >= drop - 4
        : p.block === m.spawn?.block;
      const s = m.vy < 0 ? null : surfaceBetween(m.x, m.w, prevFeet - STICK, m.y + m.h + STICK, null, home);
      if (s) {
        m.y = surfaceYAt(s, m.x) - m.h; m.vy = 0; m.airTime = Math.min(m.airTime, 0.35);
      }
    } else {
      // hover at a fixed height; the float is purely visual (see drawMob)
      m.y = clamp(m.y, 0, WORLD.h - m.h);
    }
    m.x += m.vx * dt;
    // never off the edge of its own platform (knockback, pushes and chases
    // included); half a pixel in, so its middle never sits right on the edge
    const [lo, hi] = mobBounds(m);
    if (m.x < lo + 0.5 || m.x > hi - 0.5) { m.x = clamp(m.x, lo + 0.5, hi - 0.5); m.vx = 0; }
  }
}

function updateCamera(dt: number): void {
  // Ease toward the deadzone target rather than pinning the player to it.
  const t = cameraTarget();
  const k = Math.min(1, CAM.LERP * dt);
  game.cam.x += (t.x - game.cam.x) * k;
  game.cam.y += (t.y - game.cam.y) * k;
}

/** The stylist's window in town: the same keys as from the menu (X closes too). */
function stylistInput(): void {
  for (const k of ['up', 'down', 'left', 'right', 'escape'] as const) if (pressed(k)) stylistKey(k);
  if (pressed('z') || pressed('enter') || pressed(' ')) stylistKey('enter');
  if (pressed('x')) stylistKey('escape');
}

/** Dev menu: Up/Down picks a stop, Z/Enter warps there, Esc or ` closes. */
export function devInput(dt: number): void {
  const n = devStops().length;
  if (repeated('up', dt)) dev.sel = (dev.sel + n - 1) % n;
  if (repeated('down', dt)) dev.sel = (dev.sel + 1) % n;
  if (pressed('escape')) dev.open = false;
  if (pressed('z') || pressed('enter') || pressed(' ')) { dev.open = false; const s = devStops()[dev.sel]; gotoPlace(s.place); }
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
  if (pressed('z') || pressed('enter') || pressed(' ')) pauseSpend(m);
  // X throws away the spare under the cursor
  const b = m.col === 0 ? m.row - STAT_KEYS.length - 2 : -1;
  if (pressed('x') && b >= 0 && bag[b]) { bag.splice(b, 1); m.row = Math.min(m.row, STAT_KEYS.length + 1 + bag.length); }
}

/** The achievements list: Up/Down scrolls, Esc / X / Z closes. */
function achInput(): void {
  for (const k of ['up', 'down', 'escape'] as const) if (pressed(k)) achKey(k);
  if (pressed('z') || pressed('enter') || pressed(' ') || pressed('x')) achKey('escape');
}

/** The settings window's keys (X closes too, like the other windows). */
function settingsInput(): void {
  for (const k of ['up', 'down', 'left', 'right', 'escape'] as const) if (pressed(k)) settingsKey(k);
  if (pressed('z') || pressed('enter') || pressed(' ')) settingsKey('enter');
  if (pressed('x')) settingsKey('escape');
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
