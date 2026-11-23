import { LINKED_SKILLS, P } from './config';
import { game, later, player } from './state';
import { held } from './input';
import { airborneInBox, damage, hitbox, spawnArrow } from './combat';
import { surfaceAt } from './physics';
import { sfx } from './audio';
import { netShot } from './net';
import { activeSkill, isLearned, rank } from './progress';
import type { SkillKey } from './types';

/** Airborne enemies Sky Assault can reach: around and below the player. */
export function barrageTargets() {
  return airborneInBox(player.x, player.y + player.h, 120, 140);
}

/**
 * Every skill resolves on an instant hitbox; multi-hit skills re-evaluate the
 * box on each tick, exactly like classic MMOs' attack frames. Damage, MP cost,
 * hit count and target count all scale with the skill's SP rank.
 */
/** The pending Sky Toss strike, fired when the slide ends. */
let rushStrike: (() => void) | null = null;

/**
 * Sky Toss slide, on the fixed step (after the player moves): pick up the
 * enemies the slide runs into and push them along in front, and land the
 * strike when the slide ends (time up, slowed down, or left the ground).
 */
export function updateRush(dt: number): void {
  if (player.rushT <= 0) return;
  player.rushT -= dt;
  const face = Math.sign(player.vx) || player.face;
  for (const m of hitbox(player.x + face * P.RUSH_GRAB / 2, player.y + player.h / 2, P.RUSH_GRAB, 40)) {
    if (!player.rushCarry.some((c) => c.m === m)) player.rushCarry.push({ m, off: Math.max(10, (m.x - player.x) * face) });
  }
  player.rushCarry = player.rushCarry.filter((c) => game.mobs.includes(c.m));
  for (const c of player.rushCarry) { c.m.x = player.x + face * c.off; c.m.vx = 0; }
  if (player.rushT <= 0 || Math.abs(player.vx) < 30 || !player.onGround) endRush();
}

/** End a Sky Toss slide now and land its strike. */
export function endRush(): void {
  player.rushT = 0;
  rushStrike?.();
}

export function cast(key: SkillKey): void {
  const s = activeSkill(key);
  if (!isLearned(key)) return;
  const r = rank(key);
  // which skill actually fires: a slot can be upgraded (W → Sky Assault)
  const kind = s.key;
  const linked = LINKED_SKILLS.includes(kind);
  // Link skills only work right after Sky Toss, once per Sky Toss.
  if (linked && player.combo <= 0) return;
  // Chaining: a link pressed while Sky Toss is still playing waits for it to finish.
  if (linked && player.cast === 'rush' && player.castT > 0) { player.queued = key; return; }
  if (player.cd[key] > 0 && !linked) return;
  if (player.mp < r.mp) return;
  // An attack skill's use time blocks every other skill; a linked skill bypasses it.
  if (player.useT > 0 && !linked) return;

  const airborne = !player.onGround && !player.climb;
  // Attack skills need both hands on the bow: on a ladder only Jump/Glide work.
  if (player.climb && kind !== 'C' && kind !== 'D') return;
  if (kind === 'C' && (airborne || player.climb)) return;
  if (kind === 'D' && !airborne) return;
  // Sky Toss is a ground launcher: no mid-air use.
  if ((kind === 'Q' || kind === 'VS') && !player.onGround) return;
  // Plunging Volley fires down from the air: no ground use.
  if (kind === 'E' && !airborne) return;

  player.mp -= r.mp;
  player.cd[key] = s.cd;
  if (kind !== 'C' && kind !== 'D') { player.useT = P.USE_TIME; player.combatT = P.COMBAT_TIME; }

  // Fervor: skills chained off Sky Toss stack final damage. The link
  // consumes the window, so it can't be chained again without another Sky Toss.
  if (linked) {
    player.combo = 0; player.comboT = 0;
    player.fervor = Math.min(5, player.fervor + 1);
    player.fervorT = 9;
  }

  switch (kind) {
    case 'Z': {
      // Twin Shot: draw the bow (a short windup), release a volley that whips
      // out to the closest enemies (no projectile), then follow through.
      player.cast = 'shoot'; player.castT = P.Z_CAST; player.castTotal = P.Z_CAST;
      const face = player.face;
      const tg = hitbox(player.x + face * 64, player.y + player.h / 2, 128, 56)
        .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))
        .slice(0, r.targets);
      later(P.Z_WINDUP, () => {
        sfx.shoot();
        const mx = player.x + face * 8, my = player.y + 13;
        game.fx.push({ type: 'muzzle', x: mx, y: my, t: 0.18, face });
        // other players see the shot reach the first target (or whiff across the range)
        const near = tg.filter((m) => game.mobs.includes(m))[0];
        netShot(mx, my, face, near ? Math.abs(near.x - mx) : 96);
        if (player.onGround) player.vx -= face * 40; // recoil nudge
        for (let h = 0; h < r.hits; h++) {
          const hit = (): void => {
            const live = tg.filter((m) => game.mobs.includes(m));
            // a tracer whips out to each target (or across the range on a whiff)
            const ends = live.length ? live.map((m) => m.x) : h === 0 ? [mx + face * 96] : [];
            for (const ex of ends) {
              const len = Math.max(12, Math.abs(ex - mx));
              game.fx.push({ type: 'tracer', x: mx, y: my, t: 0.14, face, sx: len / 64 });
            }
            live.forEach((m) => damage(m, r.dmg));
          };
          if (h === 0) hit(); else later(h * 0.08, hit);
        }
      });
      break;
    }

    case 'C': {
      // Down + Jump drops through the platform underfoot (not the ground slab):
      // a small hop with the jump sound, then fall; that whole block is
      // ignored until the player lands on something else.
      if (player.onGround && held('down')) {
        const under = surfaceAt(player.x, player.y + player.h, player.w);
        if (under && !under.ground && under.block !== undefined) {
          player.dropBlock = under.block;
          player.dropY = player.y + player.h;
          player.cast = 'jump'; player.castT = 0.16; player.castTotal = 0.16;
          sfx.jump();
          player.onGround = false;
          player.vy = -P.DROP_HOP_V;
          break;
        }
      }
      player.cast = 'jump'; player.castT = 0.16; player.castTotal = 0.16;
      sfx.jump();
      player.onGround = false;
      player.vy = -P.JUMP_V;
      if (held('left'))  { player.vx = -P.JUMP_H; player.face = -1; }
      if (held('right')) { player.vx =  P.JUMP_H; player.face =  1; }
      break;
    }

    case 'D': {
      // Glide: acrobatic forward tumble; usable repeatedly in the air
      player.cast = 'jump'; player.castT = 0.18; player.castTotal = 0.18;
      sfx.glide();
      const dir = player.face;          // launch in the direction you're facing
      player.vx = dir * P.GLIDE_VX; // launches forward...
      player.vy += -90;        // ...adds to your current vertical velocity,
      player.vy = Math.max(player.vy, -P.GLIDE_VY_MAX); // capped so it can't rocket you up
      // rings open ahead of her and the streaks trail behind (the art faces right, so mirror it)
      game.fx.push({ type: 'spirit', x: player.x + dir * 10, y: player.y + player.h / 2, t: 0.3, face: -dir });
      break;
    }

    case 'Q': {
      player.cast = 'rush'; player.castT = 0.34; player.castTotal = 0.34;
      sfx.shoot();
      // Down + Q strikes in place. Otherwise slide forward, scooping up the
      // enemies in the way and pushing them along; the strike (and the launch)
      // lands when the slide ends: out of time, slowed, or at a platform edge
      // (see updateRush).
      const inPlace = held('down');
      const face = player.face;
      rushStrike = (): void => {
        rushStrike = null;
        const carried = player.rushCarry.map((c) => c.m);
        player.rushCarry = [];
        const cx = inPlace ? player.x : player.x + face * 24;
        const near = hitbox(cx, player.y + player.h / 2, 96, 64).filter((m) => !carried.includes(m));
        const tg = [...carried, ...near].filter((m) => game.mobs.includes(m)).slice(0, r.targets);
        // a horn of light erupts under each target (or ahead, if none)
        (tg.length ? tg.map((m) => [m.x, m.y + m.h]) : [[cx, player.y + player.h]])
          .forEach(([x, y]) => game.fx.push({ type: 'rush', x, y, t: 0.4 }));
        tg.forEach((m) => {
          damage(m, r.dmg, { launch: true });
          if (!inPlace) m.vx = face * 80; // a little follow-through drift
        });
      };
      if (inPlace) rushStrike();
      else {
        player.vx = face * P.RUSH_SLIDE_V;
        player.rushT = P.RUSH_MAX;
        player.rushCarry = [];
      }
      player.combo = 1.1; player.comboT = 1.1;
      break;
    }

    case 'BS': {
      // Backstep Shot: hop backward (still facing forward) while the closest
      // enemies ahead take every hit, like Twin Shot
      player.cast = 'shoot'; player.castT = 0.24; player.castTotal = 0.24;
      sfx.shoot();
      const face = player.face;
      const tg = hitbox(player.x + face * 64, player.y + player.h / 2, 128, 56)
        .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))
        .slice(0, r.targets);
      if (player.onGround) {
        player.onGround = false;
        player.vx = -face * P.BACKSTEP_VX;
        player.vy = -P.BACKSTEP_VY;
      }
      const mx = player.x + face * 8, my = player.y + 13;
      game.fx.push({ type: 'muzzle', x: mx, y: my, t: 0.18, face });
      game.fx.push({ type: 'swoosh', x: player.x, y: player.y + player.h, t: 0.2, face: -face });
      for (let h = 0; h < r.hits; h++) {
        later(h * 0.08, () => {
          const live = tg.filter((m) => game.mobs.includes(m));
          const sx = player.x + face * 8, sy = player.y + 13;
          for (const m of live) {
            game.fx.push({ type: 'tracer', x: sx, y: sy, t: 0.14, face, sx: Math.max(12, Math.abs(m.x - sx)) / 64 });
          }
          live.forEach((m) => damage(m, r.dmg));
        });
      }
      break;
    }

    case 'VS': {
      // Vault Shot: leap backward into the air while launching the enemies
      // ahead, opening the link window for an airborne W
      player.cast = 'rush'; player.castT = 0.34; player.castTotal = 0.34;
      sfx.jump();
      const face = player.face;
      const cx = player.x + face * 40;
      const tg = hitbox(cx, player.y + player.h / 2, 96, 64).slice(0, r.targets);
      (tg.length ? tg.map((m) => [m.x, m.y + m.h]) : [[cx, player.y + player.h]])
        .forEach(([x, y]) => game.fx.push({ type: 'rush', x, y, t: 0.4 }));
      tg.forEach((m) => damage(m, r.dmg, { launch: true }));
      player.onGround = false;
      player.vx = -face * P.VAULT_VX;
      player.vy = -P.VAULT_VY;
      game.fx.push({ type: 'swoosh', x: player.x, y: player.y + player.h, t: 0.2, face: -face });
      player.combo = 1.4; player.comboT = 1.4;
      break;
    }

    case 'E': {
      // Plunging Volley: mid-air only. Check the fall for a moment and rain
      // arrows straight down into a column beneath you, hitting every enemy
      // in it (nearest first), then drop.
      player.cast = 'barrage'; player.castT = P.PLUNGE_STALL; player.castTotal = P.PLUNGE_STALL;
      sfx.shoot();
      const feet = player.y + player.h;
      const tg = hitbox(player.x, feet + P.PLUNGE_DEPTH / 2, P.PLUNGE_W, P.PLUNGE_DEPTH)
        .filter((m) => m.y + m.h > feet) // beneath you, not beside you
        .sort((a, b) => a.y - b.y)
        .slice(0, r.targets);
      // the hover: no strikes of its own (hangHits 0), just a pause in the fall
      player.vx = 0; player.vy = 0;
      player.hangT = P.PLUNGE_STALL; player.hangHits = 0;
      // the volley rains onto each target, or onto the ground below if none
      (tg.length ? tg.map((m) => [m.x, m.y + m.h]) : [[player.x, feet + 40]])
        .forEach(([x, y]) => game.fx.push({ type: 'rain', x, y, t: 0.4 }));
      for (let h = 0; h < r.hits; h++) {
        later(0.08 + h * 0.08, () => {
          tg.filter((m) => game.mobs.includes(m)).forEach((m) => damage(m, r.dmg, { fx: 'rainHit' }));
        });
      }
      break;
    }

    case 'R': {
      // Piercing Arrow: one heavy arrow down the line ahead; every enemy it
      // passes through takes the full hit, nearest first
      player.cast = 'shoot'; player.castT = 0.36; player.castTotal = 0.36;
      sfx.shoot();
      const face = player.face;
      const mx = player.x + face * 8, my = player.y + 13;
      const tg = hitbox(player.x + face * P.PIERCE_RANGE / 2, my, P.PIERCE_RANGE, 28)
        .sort((a, b) => Math.abs(a.x - mx) - Math.abs(b.x - mx))
        .slice(0, r.targets);
      game.fx.push({ type: 'muzzle', x: mx, y: my, t: 0.18, face });
      game.fx.push({ type: 'tracer', x: mx, y: my, t: 0.14, face, sx: P.PIERCE_RANGE / 64 });
      netShot(mx, my, face, P.PIERCE_RANGE);
      tg.forEach((m) => later(Math.abs(m.x - mx) / P.ARROW_V, () => {
        if (game.mobs.includes(m)) damage(m, r.dmg);
      }));
      break;
    }

    case 'W': {
      // Skyfall Volley: a volley of arrows rains down onto the launched enemies
      player.cast = 'shoot'; player.castT = 0.30; player.castTotal = 0.30;
      sfx.shoot();
      const tg = airborneInBox(player.x, player.y - 20, 200, 150).slice(0, r.targets);
      // the volley rains onto each target, or onto the ground just ahead if there are none
      (tg.length ? tg.map((m) => [m.x, m.y + m.h]) : [[player.x + player.face * 40, player.y + player.h]])
        .forEach(([x, y]) => game.fx.push({ type: 'rain', x, y, t: 0.4 }));
      for (let h = 0; h < r.hits; h++) {
        later(0.06 + h * 0.07, () => {
          tg.filter((m) => game.mobs.includes(m)).forEach((m) => damage(m, r.dmg, { airborne: true, fx: 'rainHit' }));
        });
      }
      break;
    }

    case 'AB': {
      // Sky Assault: warp straight up above the enemies Sky Toss
      // launched (no horizontal movement), hover there striking every airborne
      // enemy in reach for a moment, then drop with normal gravity. The
      // strikes run on the fixed step in update (see the hang block).
      player.cast = 'barrage'; player.castT = P.BARRAGE_HANG; player.castTotal = P.BARRAGE_HANG;
      sfx.shoot();
      const air = barrageTargets();
      const top = air.length ? Math.min(...air.map((m) => m.y)) : player.y - 40;
      const from = player.y + player.h / 2;
      // rise toward the highest launched enemy, but only P.BARRAGE_RISE of the way
      const peak = Math.min(player.y, top - player.h - 4);
      player.y = Math.max(0, player.y - (player.y - peak) * P.BARRAGE_RISE);
      player.vx = 0; player.vy = 0; player.onGround = false;
      game.fx.push({ type: 'swoosh', x: player.x, y: from, t: 0.2, face: player.face }); // where she left
      player.hangT = P.BARRAGE_HANG; player.hangHits = r.hits; player.hangHitT = 0;
      player.hangDmg = r.dmg; player.hangTargets = r.targets;
      break;
    }

    case 'S': {
      // Shell Barrage: a stream of slower green bolts; each stuns on arrival
      player.cast = 'shoot'; player.castT = 0.36; player.castTotal = 0.36;
      sfx.shoot();
      const tg = hitbox(player.x + player.face * 72, player.y + player.h / 2, 144, 72).slice(0, r.targets);
      const x0 = player.x + player.face * 8, y0 = player.y + 13;
      for (let h = 0; h < r.hits; h++) {
        const t = tg[h % (tg.length || 1)];
        // launched one after another from the bow
        spawnArrow(x0, y0, t ? t.x : x0 + player.face * 200, !!t,
          t ? () => { if (game.mobs.includes(t)) damage(t, r.dmg, { stun: true, fx: 'stunHit' }); } : undefined,
          { speed: P.BOLT_V, sprite: 'bolt', dir: player.face, delay: h * 0.08 });
        if (!t) break; // nothing to hit: one bolt is enough
      }
      break;
    }
  }

}
