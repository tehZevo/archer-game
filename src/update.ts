import { CAM, P, SKILL_ORDER, WORLD } from './config';
import { cameraTarget, gainExp, game, gotoFloor, mobBounds, player, spawnWave } from './state';
import { held, pressed } from './input';
import { catchClimbable, collideGround, integrate, STICK, surfaceBetween, surfaceYAt } from './physics';
import { damage, revive } from './combat';
import { barrageTargets, cast, updateRush } from './skills';
import { isLearned, skillRows, spendSkill, spendStat, STAT_KEYS } from './progress';
import { sfx } from './audio';
import { decayBoost, waveRate } from './boost';
import { clamp } from './util';
import type { PauseMenu, Platform } from './types';

export function update(dt: number): void {
  // Esc pause menu: freezes the game; arrows move, Z/Enter spends AP or SP
  if (pressed('escape')) game.pause = game.pause ? null : { col: 0, row: 0 };
  if (game.pause) { pauseInput(game.pause); return; }
  // Regen: 5% of max HP/MP every 5s; HP doesn't regen while in combat.
  if (player.combatT > 0) player.combatT -= dt;
  player.regenT += dt;
  if (player.regenT >= P.REGEN_EVERY) {
    player.regenT -= P.REGEN_EVERY;
    player.mp = Math.min(player.mpMax, player.mp + player.mpMax * P.REGEN_FRAC);
    if (player.combatT <= 0) player.hp = Math.min(player.hpMax, player.hp + player.hpMax * P.REGEN_FRAC);
  }
  for (const k of SKILL_ORDER) player.cd[k] = Math.max(0, player.cd[k] - dt);
  // skill keys
  // Basic attack during Sky Toss's link window casts the link skill
  // (Skyfall Volley, or Sky Assault once upgraded).
  const linkZ = pressed('z') && player.combo > 0 && isLearned('W');
  if (linkZ) cast('W');
  for (const k of SKILL_ORDER) if (pressed(k) && !(linkZ && k === 'Z')) cast(k);
  // holding Jump keeps jumping: re-jump on every landing
  if (!pressed('c') && held('c') && player.onGround && !player.climb) cast('C');
  // debug: [ levels up, ] warps to the next floor
  if (pressed('[')) gainExp(player.expNext - player.exp);
  if (pressed(']')) { gotoFloor(game.floor.number + 1); return; }

  // enemy waves run on the fixed step so headless tests stay deterministic
  // other players' kills in this instance make waves come faster
  decayBoost(dt);
  game.waveT += dt * waveRate();
  if (game.waveT >= P.WAVE_EVERY) { game.waveT = 0; spawnWave(); }

  if (player.castT > 0) player.castT -= dt; else player.cast = null;
  // a chained link fires as soon as Sky Toss finishes
  if (player.queued && !(player.cast === 'rush' && player.castT > 0)) {
    const k = player.queued; player.queued = null;
    cast(k);
  }
  if (player.superStance > 0) player.superStance -= dt;
  if (player.invuln > 0) player.invuln -= dt;
  if (player.useT > 0) player.useT -= dt;
  const locked = player.useT > 0; // skill use time: no movement input
  if (player.comboT > 0) { player.comboT -= dt; if (player.comboT <= 0) player.combo = 0; }
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
    if (!locked && pressed('c') && held('up')) { player.climbRush = true; sfx.jump(); }
    if (player.climbRush) player.y -= P.CLIMB_RUSH * dt;
    else if (!locked && held('up'))   player.y -= P.CLIMB * dt;
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
      player.vx = 0; player.vy = 0;
      player.hangHitT -= dt;
      if (player.hangHits > 0 && player.hangHitT <= 0) {
        player.hangHitT = P.BARRAGE_HANG / 7; // 6 strikes spread through the hover
        player.hangHits--;
        game.fx.push({ type: 'swoosh', x: player.x + player.face * 10, y: player.y + player.h, t: 0.2, face: player.hangHits % 2 ? -player.face : player.face });
        barrageTargets().slice(0, player.hangTargets).forEach((m) => damage(m, player.hangDmg, { airborne: true }));
      }
      player.animState = 'jump';
    } else {
      // horizontal: accel toward target speed (the classic side-scroller walk over a few frames)
      const busy = player.cast === 'rush' ? 0.55 : 1;
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
        player.vx += clamp(target - player.vx, -P.ACCEL * dt, P.ACCEL * dt);
      } else {
        player.vx += clamp(0 - player.vx, -P.FRICTION * dt, P.FRICTION * dt);
      }


      // Sky Toss never slides you off a platform: stop at the edge instead
      if (player.rushT > 0 && player.onGround) {
        const feetNow = player.y + player.h, nx = player.x + player.vx * dt;
        if (!surfaceBetween(nx, 1, feetNow - 12, feetNow + 12)) player.vx = 0;
      }
      const prevFeet = player.y + player.h, prevX = player.x;
      integrate(player, dt);
      // clamp to the world before colliding, so the ground test uses the final x
      player.x = clamp(player.x, player.w / 2, WORLD.w - player.w / 2);
      collideGround(player, prevFeet, prevX);

      // grab a rope/ladder first, so a rope hanging from the platform you're
      // standing on is caught before the drop-through consumes the Down press
      const c = catchClimbable();
      if (c) {
        player.climb = c;
        player.dropBlock = null;
        player.x = c.x;
        player.y = clamp(player.y, c.y1 - player.h, c.y2 - player.h);
        player.vx = 0; player.vy = 0;
        player.onGround = false;
        player.animState = 'climb';
      } else {
        player.animState = !player.onGround ? 'jump'
          : Math.abs(player.vx) > 12 ? 'walk' : 'idle';
      }
    }
  }
  player.x = clamp(player.x, player.w / 2, WORLD.w - player.w / 2); // x is the centre
  player.anim += dt * (player.animState === 'walk' ? 9 : 4);

  // standing on the portal and pressing Up warps to the next floor
  const p = game.floor.portal;
  const feet = player.y + player.h;
  const onPortal = player.onGround && Math.abs(player.x - p.x) < p.w / 2 + 10 && feet >= p.y - 4 && feet <= p.y + 8;
  if (onPortal && pressed('up')) {
    sfx.portal();
    gotoFloor(game.floor.number + 1);
    return;
  }

  updateMobs(dt);
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
    d.t -= dt * 1.1; d.y += d.vy * dt; d.vy *= 0.96;
    if (d.t <= 0) game.dmgNums.splice(i, 1);
  }

  if (player.hp <= 0) revive();

  updateCamera(dt);
}

function updateMobs(dt: number): void {
  for (const m of [...game.mobs]) {
    if (m.hitFlash > 0) m.hitFlash -= dt;
    m.anim += dt * 6;
    if (m.stun > 0) { m.stun -= dt; m.vx *= 0.8; }
    else if (m.airTime > 0) { m.airTime -= dt; m.vx *= 0.9; }
    else {
      const d = player.x - m.x;
      const [lo, hi] = mobBounds(m);
      // mobs only chase the player after being attacked, and only while the
      // player is over their own platform: past its end they'd just stand
      // pressed against the edge, so they go back to patrolling
      const reachable = player.x >= lo - 8 && player.x <= hi + 8;
      if (m.aggro && reachable && Math.abs(d) < 260 && Math.abs((m.y + m.h) - (player.y + player.h)) < 90) {
        m.dir = Math.sign(d) || 1;
        m.vx += clamp(d * 4 - m.vx, -2400 * dt, 2400 * dt) * 0.5;
        m.vx = clamp(m.vx, -m.spd, m.spd);
      } else {
        m.vx += (m.dir * m.spd - m.vx) * Math.min(1, 12 * dt);
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
        if (player.invuln <= 0) {
          player.hp = Math.max(0, player.hp - m.dmg);
          player.combatT = P.COMBAT_TIME;
          player.invuln = 1.0;
          sfx.hit();
          game.dmgNums.push({
            x: player.x, y: player.y - 14, v: m.dmg, t: 1, crit: false, vy: -80, col: '#ff8f8f',
          });
        }
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
      // launch can't knock it onto a different one.
      const home = (p: Platform): boolean => p.block === m.spawn?.block;
      const s = m.vy < 0 ? null : surfaceBetween(m.x, m.w, prevFeet - STICK, m.y + m.h + STICK, null, home);
      if (s) {
        m.y = surfaceYAt(s, m.x) - m.h; m.vy = 0; m.airTime = Math.min(m.airTime, 0.35);
      }
    } else {
      // hover at a fixed height; the float is purely visual (see drawMob)
      m.y = clamp(m.y, 0, WORLD.h - m.h);
    }
    m.x += m.vx * dt;
    // never off the edge of its own platform (knockback, pushes and chases included)
    const [lo, hi] = mobBounds(m);
    if (m.x < lo || m.x > hi) { m.x = clamp(m.x, lo, hi); m.vx = 0; }
  }
}

function updateCamera(dt: number): void {
  // Ease toward the deadzone target rather than pinning the player to it.
  const t = cameraTarget();
  const k = Math.min(1, CAM.LERP * dt);
  game.cam.x += (t.x - game.cam.x) * k;
  game.cam.y += (t.y - game.cam.y) * k;
}

function pauseInput(m: PauseMenu): void {
  const n = m.col === 0 ? STAT_KEYS.length : skillRows().length;
  if (pressed('up')) m.row = (m.row + n - 1) % n;
  if (pressed('down')) m.row = (m.row + 1) % n;
  if (pressed('left') || pressed('right')) { m.col = m.col ? 0 : 1; m.row = 0; }
  if (pressed('z') || pressed('enter') || pressed(' ')) pauseSpend(m);
}

/** Spend a point on the selected stat or skill row. */
export function pauseSpend(m: PauseMenu): void {
  if (m.col === 0) spendStat(STAT_KEYS[m.row]);
  else { const r = skillRows()[m.row]; if (r) spendSkill(r.key); }
}
