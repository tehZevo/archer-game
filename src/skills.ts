import { FX_DUR, LINKED_SKILLS, P, SKILLS } from './config';
import { game, later, mobBounds, player } from './state';
import { held } from './input';
import { airborneInBox, damage, hitbox, spawnArrow } from './combat';
import { surfaceAt, surfaceBetween, surfaceYAt } from './physics';
import { sfx } from './audio';
import { netShot } from './net';
import { activeSkill, isLearned, passiveBonus, rank } from './progress';
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
  player.rushDist += Math.abs(player.vx) * dt;
  const face = Math.sign(player.vx) || player.face;
  // the grab reaches a little behind you too, so an enemy you just passed is still scooped up
  const grabX = player.x + face * (P.RUSH_GRAB - P.RUSH_GRAB_BACK) / 2;
  for (const m of hitbox(grabX, player.y + player.h / 2, P.RUSH_GRAB + P.RUSH_GRAB_BACK, 40)) {
    if (player.rushCarry.length >= rank('Q').targets) break; // carry only as many as it hits
    if (player.rushCarry.some((c) => c.m === m)) continue;
    player.rushCarry.push({ m, off: Math.max(10, (m.x - player.x) * face) });
    damage(m, rank('Q').dmg * P.RUSH_HIT); // the charge itself hits, once per enemy (this can kill it)
  }
  player.rushCarry = player.rushCarry.filter((c) => game.mobs.includes(c.m));
  for (const c of player.rushCarry) {
    const m = c.m;
    const [lo, hi] = mobBounds(m);
    m.x = Math.max(lo, Math.min(hi, player.x + face * c.off)); m.vx = 0;
    // keep the pushed enemy standing on its own platform's surface at its new
    // x (a slope can rise or drop more than a frame's landing reach)
    const feet = m.y + m.h;
    const s = surfaceBetween(m.x, m.w, feet - 24, feet + 24, null, (p) => p.block === m.spawn?.block);
    if (s && m.airTime <= 0) { m.y = surfaceYAt(s, m.x) - m.h; m.vy = 0; }
  }
  // the slide covers its fixed distance: contact with an enemy slows you, but
  // the slide keeps going until the distance (or the ground, or the clock) ends
  if (player.rushDist >= player.rushGoal || player.rushT <= 0 || Math.abs(player.vx) < 30 || !player.onGround) endRush();
}

/** End a Sky Toss slide now and land its strike. */
export function endRush(): void {
  player.rushT = 0;
  rushStrike?.();
}

/**
 * The ground rush (Q on the ground, and the Air Dive's landing): slide
 * forward, scooping up the enemies in the way and pushing them along; the
 * strike lands when the slide ends: out of time, slowed, or at a platform
 * edge (see updateRush). In place (Down + Q) it strikes at once. Electric
 * Blitz is the charged version: a faster, longer slide that spends a banked
 * charge (`blitz`). Opens the link window.
 */
export function groundRush(inPlace: boolean, blitz: boolean): void {
  const r = rank('Q');
  player.cast = 'rush'; player.castT = 0.34; player.castTotal = 0.34;
  sfx.shoot();
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
    // the rush carries and hits (a Blitz strikes twice); the launch is the
    // W's job now
    for (let h = 0; h < r.hits; h++) {
      later(h * 0.08, () => {
        tg.filter((m) => game.mobs.includes(m)).forEach((m) => {
          damage(m, r.dmg, { more: h < r.hits - 1 });
          if (!inPlace && h === 0) m.vx = face * 80; // a little follow-through drift
        });
      });
    }
  };
  if (inPlace) rushStrike();
  else {
    player.vx = face * (blitz ? P.BLITZ_SLIDE_V : P.RUSH_SLIDE_V);
    player.rushT = P.RUSH_MAX;
    player.rushDist = 0;
    player.rushGoal = blitz ? P.BLITZ_DIST : P.RUSH_DIST;
    player.rushCarry = [];
    if (blitz) player.blitzCharges--;
  }
  player.combo = 1.1; player.comboT = 1.1;
}

/** The Air Dive touched down: roll straight into the real ground rush (its
 *  slide, strike and link window), with no pause. */
export function landDive(): void {
  if (!player.diving || !player.onGround) return;
  player.diving = false;
  groundRush(false, false);
}

/** A skill's use time, shortened by Haste (+N% attack speed: time / (1 + N)). */
export const useTime = (kind: SkillKey): number => (SKILLS[kind].use ?? P.USE_TIME) / (1 + passiveBonus('HA'));

/** Recovery after the animation ends: movement frees up at useT's end, a new
 *  skill waits out this delay. Links skip it (see cast). Attack speed (Haste)
 *  shortens it, the same way it shortens the use time. */
export const delayTime = (kind: SkillKey): number => (SKILLS[kind].delay ?? P.DELAY_TIME) / (1 + passiveBonus('HA'));

/** Keys with an air form that is its own skill (its own row, rank and
 *  cooldown): Q (Air Dive), W (Midair Spin), E (Plunging Volley). */
export const AIR_FORM: Partial<Record<SkillKey, SkillKey>> = { Q: 'AD', W: 'MS', E: 'PV' };

/** The cooldown slot a key uses right now: its air form's ("E.air") in the
 *  air, else its own. (Sky Assault is W's ground-only upgrade: W in the air
 *  is always Midair Spin, on the W.air slot.) */
export function cdSlot(key: SkillKey, airborne = !player.onGround && !player.climb): string {
  return airborne && AIR_FORM[key] ? `${key}.air` : key;
}

/** How long a skill cools down for: its own cd, which is per-form now that
 *  the air forms (AD, MS, PV) are skills in their own right. */
export function formCd(kind: SkillKey): number {
  return SKILLS[kind].cd;
}

/** `chained`: fired off the end of a Q rush (see the Z chain below), so the rush's use time doesn't hold it. */
/** Aerial skills need real height, not just any airtime: ~2/3 of the default
 *  jump's peak (v²/2g ≈ 35px), so shallow jumps don't trigger the full
 *  aerial combo. */
export const AIR_MIN_H = (2 / 3) * (P.JUMP_V * P.JUMP_V) / (2 * P.GRAVITY);

export function cast(key: SkillKey, chained = false): void {
  const ground = activeSkill(key);
  const airborne = !player.onGround && !player.climb;
  // In the air the key fires its own skill (Air Dive, Midair Spin, Plunging
  // Volley), with its own rank, MP cost and use time. Sky Assault is W's
  // ground-only upgrade: W in the air is always Midair Spin.
  const airKey = airborne ? AIR_FORM[key] : undefined;
  const s = airKey ? SKILLS[airKey] : ground;
  if (!isLearned(s.key)) return;
  // Air Dive, Midair Spin and Plunging Volley want you properly airborne:
  // at least ~2/3 of a full jump's peak above the floor.
  if (airborne && (s.key === 'AD' || s.key === 'MS' || s.key === 'PV') &&
      game.floor.platforms[0].y - (player.y + player.h) < AIR_MIN_H) return;
  const r = rank(s.key);
  // which skill actually fires: a slot can be upgraded (W → Sky Assault)
  const kind = s.key;
  // The grounded Sky Toss counts as a link while a window is open (the Air
  // Dive's, chiefly): it fires off the dive without the use-time wait.
  // Tempest is a link too, but only off the end of a Sky Assault hover (see
  // update's hang block): it stays a standalone skill the rest of the time.
  // Electric Blitz links into itself: a blitz cast opens a short window in
  // which the next blitz skips the ending lag, chaining like a combo.
  // And the aerial skills (Air Dive, Midair Spin, Plunging Volley) open a
  // glide-link window: D pressed inside it fires on the spot. A Midair Spin
  // also opens a window for the Plunging Volley, chaining the aerial kit.
  // (The Q-slot window covers whichever ground rush is equipped: Sky Toss
  // or its Electric Blitz upgrade, so the Air Dive flows into both.)
  const linked = LINKED_SKILLS.includes(kind) || (key === 'Q' && player.combo > 0) ||
    (kind === 'R' && player.assaultLinkT > 0) || (kind === 'EB' && player.blitzLinkT > 0) ||
    (kind === 'D' && player.glideLinkT > 0) || (kind === 'PV' && player.volleyLinkT > 0) ||
    (kind === 'MS' && player.spinLinkT > 0);
  // Link skills only work right after Sky Toss, once per Sky Toss. The Midair
  // Spin is the exception: W in the air is a standalone sweep. (Sky Assault is
  // W's upgrade and has no air form, so it stays gated by the link window.)
  if (LINKED_SKILLS.includes(kind) && player.combo <= 0 && kind !== 'MS') return;
  // Chaining: a link pressed while Sky Toss is still playing waits for it to finish.
  if (linked && player.cast === 'rush' && player.castT > 0) { player.queued = key; return; }
  // Sky Assault's own animation buffers the sweep it links into, so pressing
  // W on the way up lands as the leap peaks
  if (kind === 'MS' && player.spinLinkT > 0 && player.cast === 'barrage' && player.castT > 0) { player.queued = key; return; }
  // Input buffering: a link pressed during the source skill's post-animation
  // recovery is kept and fires on the first free frame (the rush's own
  // queue above covers its animation). Links bypass the animation itself, so
  // only the recovery needs buffering.
  // Q rushes chain into Twin Shot: Z pressed during the rush fires the moment
  // it ends, and right after it (while its link window is open) at once. The
  // chain skips the rush's ending lag once, so it grants one quick shot, not
  // repeated uses while the window is open.
  if (kind === 'Z' && !chained && (player.rushT > 0 || (player.cast === 'rush' && player.castT > 0))) { player.queued = 'Z'; return; }
  if (kind === 'Z' && player.combo > 0) { chained = true; player.combo = 0; player.comboT = 0; }
  // the Midair Spin is on its own cooldown even though W is a link skill,
  // so one jump can't chain sweeps all the way up
  const slot = cdSlot(key, airborne);
  const spin = kind === 'MS';
  if (player.cd[slot] > 0 && (!linked || spin)) return;
  // Electric Blitz spends a banked charge: with none left, nothing happens
  // (Down + Q, the strike in place, needs no charge)
  if (kind === 'EB' && !airborne && !held('down') && player.blitzCharges <= 0) return;
  if (player.mp < r.mp) return;
  // An attack skill's use time blocks every other skill; a linked skill bypasses it.
  // ...except that the airborne kit (Plunging Volley, Glide, and the Q-slot
  // rush you land into) cuts a Sky Assault hover short, so W -> E flows
  const fromHover = player.hangT > 0 && (kind === 'PV' || kind === 'D' || kind === 'MS' || key === 'Q');
  if ((player.useT > 0 || player.recoverT > 0) && !linked && !fromHover && !chained) return;

  // Attack skills need both hands on the bow: on a ladder only Jump/Glide work.
  if (player.climb && kind !== 'C' && kind !== 'D') return;
  if (kind === 'C' && (airborne || player.climb)) return;
  if (kind === 'D' && !airborne) return;
  // Q and E are two-form keys: the ground forms stay on Q and E (and Q's
  // upgrades), the air forms are AD and PV (chosen above).
  if ((kind === 'VS' || kind === 'RA') && !player.onGround) return;

  player.mp -= r.mp;
  player.cd[slot] = player.cdMax[slot] = formCd(kind);
  if (kind !== 'C' && kind !== 'D') { player.useT = useTime(kind); player.recoverT = delayTime(kind); player.combatT = P.COMBAT_TIME; }
  player.liftT = 0; // any other skill ends a Spike Lift's push (Spike Lift itself starts a new one below)
  player.skillPose = null; // the spin / vanish of the last cast is over (set again below)

  // Fervor: skills chained off Sky Toss stack final damage. The link
  // consumes the window, so it can't be chained again without another Sky Toss.
  if (linked) {
    player.combo = 0; player.comboT = 0;
    player.assaultLinkT = 0; // a linked Tempest spends the post-assault window
    player.blitzLinkT = 0; // a linked blitz spends its own window too
    player.glideLinkT = 0; // a linked glide spends the aerial skill's window
    player.volleyLinkT = 0; // ...and so does a linked volley spend the spin's
    player.spinLinkT = 0; // ...and a linked sweep spends the assault's window
    player.fervor = Math.min(5, player.fervor + 1);
    player.fervorT = 9;
    // linked skills also shorten Tempest's and Spike Lift's long cooldowns
    // and refill a Blitz: spending a link refunds a second off each
    player.cd.R = Math.max(0, player.cd.R - 1);
    player.cd.E = Math.max(0, player.cd.E - 1);
    if (player.blitzCharges < P.BLITZ_MAX) player.blitzT += 1;
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
        netShot(mx, my, face, near ? Math.abs(near.x - mx) : 96, r.hits);
        for (let h = 0; h < r.hits; h++) {
          const hit = (): void => {
            const live = tg.filter((m) => game.mobs.includes(m));
            // a tracer whips out to each target, or across the range on a
            // whiff: every hit fires, so a miss shows as many arrows as a hit
            const ends = live.length ? live.map((m) => m.x) : [mx + face * 96];
            for (const ex of ends) {
              const len = Math.max(12, Math.abs(ex - mx));
              game.fx.push({ type: 'tracer', x: mx, y: my, t: 0.14, face, sx: len / 64 });
            }
            live.forEach((m) => damage(m, r.dmg, { more: h < r.hits - 1 }));
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
      // Glide: acrobatic forward tumble; usable repeatedly in the air.
      // Off a Sky Assault hover it ends the hover, so the tumble carries you
      // (the hover's own per-frame vx/vy reset would otherwise eat it).
      player.hangT = 0; player.hangHits = 0;
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

    // Electric Blitz is the same rush, just faster and longer (see below).
    case 'AD': {
      // Air Dive (Q's air form, its own skill): plunge diagonally down,
      // carrying the enemies under and in front of you, and roll into the
      // ground rush on landing. (drawn in its dive pose: see localPose)
      player.hangT = 0; player.hangHits = 0; // out of a Sky Assault hover (the
      // dive's own momentum takes over immediately, no stuck dive pose)
      player.cast = 'rush'; player.castT = P.DIVE_TIME; player.castTotal = P.DIVE_TIME;
      sfx.jump();
      player.vx = player.face * P.DIVE_VX;
      player.vy = P.DIVE_VY;
      player.rushT = P.DIVE_TIME; player.rushDist = 0; player.rushCarry = [];
      player.diving = true;
      // the dive itself stabs down into the enemies under and in front of
      // you, for the full Sky Toss hit (one strike, at this skill's damage)
      hitbox(player.x + player.face * 20, player.y + player.h / 2, 96, 140)
        .slice(0, r.targets).forEach((m) => damage(m, r.dmg));
      rushStrike = null; // (a strike left over from an earlier rush must not land now)
      player.combo = 1.1; player.comboT = 1.1;
      player.glideLinkT = P.GLIDE_LINK; // and it links into a Glide
      break;
    }

    case 'EB':
    case 'Q':
    case 'VS':
    case 'RA': {
      groundRush(held('down'), s.key === 'EB');
      // the blitz's self-link window: the next blitz (with a charge banked)
      // fires immediately, skipping this one's ending lag
      if (kind === 'EB') player.blitzLinkT = P.BLITZ_LINK;
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
          // one tracer per target, or one across the range on a whiff
          for (const ex of live.length ? live.map((m) => m.x) : [sx + face * 96]) {
            game.fx.push({ type: 'tracer', x: sx, y: sy, t: 0.14, face, sx: Math.max(12, Math.abs(ex - sx)) / 64 });
          }
          live.forEach((m) => damage(m, r.dmg, { more: h < r.hits - 1 }));
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

    case 'RA': {
      // Rising Arrow: launch the enemies ahead and jump straight up with them
      // (the same launch speed, so you climb together), opening the link
      // window: W or Sky Assault follow them up in the air
      player.cast = 'rush'; player.castT = 0.34; player.castTotal = 0.34;
      sfx.jump();
      const face = player.face;
      const cx = player.x + face * 30;
      const tg = hitbox(cx, player.y + player.h / 2, 80, 64).slice(0, r.targets);
      (tg.length ? tg.map((m) => [m.x, m.y + m.h]) : [[cx, player.y + player.h]])
        .forEach(([x, y]) => game.fx.push({ type: 'rush', x, y, t: 0.4 }));
      tg.forEach((m) => damage(m, r.dmg, { launch: true }));
      player.onGround = false;
      player.vx = face * P.RISE_VX;
      player.vy = -P.RISE_VY;
      game.fx.push({ type: 'swoosh', x: player.x, y: player.y + player.h, t: 0.2, face });
      player.combo = 1.4; player.comboT = 1.4;
      break;
    }

    case 'E': {
      // Spike Lift (E's ground form): spikes erupt in a burst around you and
      // throw you into the air.
      player.cast = 'barrage'; player.castT = P.PLUNGE_POSE; player.castTotal = P.PLUNGE_POSE;
      sfx.jump();
      game.fx.push({ type: 'spikes', x: player.x, y: player.y + player.h, t: FX_DUR.spikes });
      const tg = hitbox(player.x, player.y + player.h / 2, P.SPIKE_R * 2, 64).slice(0, r.targets);
      tg.forEach((m) => damage(m, P.SPIKE_DMG));
      player.vy = -P.SPIKE_RISE_V; player.liftT = P.SPIKE_RISE_T; // a steady push up (see update)
      player.onGround = false;
      // the launch opens the link window, so Air Dive (Q in the air) can
      // start on the way up
      player.combo = 1.4; player.comboT = 1.4;
      break;
    }

    case 'PV': {
      // Plunging Volley (E's air form, its own skill): a small upward bump
      // (no freeze: you keep your drift and fall right after) as arrows rain
      // straight down into a column beneath you, hitting every enemy in it.
      player.hangT = 0; player.hangHits = 0; // out of a Sky Assault hover
      player.cast = 'barrage'; player.castT = P.PLUNGE_POSE; player.castTotal = P.PLUNGE_POSE;
      sfx.shoot();
      const feet = player.y + player.h;
      const tg = hitbox(player.x, feet + P.PLUNGE_DEPTH / 2, P.PLUNGE_W, P.PLUNGE_DEPTH)
        .filter((m) => m.y + m.h > feet) // beneath you, not beside you
        .sort((a, b) => a.y - b.y)
        .slice(0, r.targets);
      player.vy -= P.PLUNGE_HOP; // stacks on the current momentum, not a fixed reset
      // the volley rains onto each target, or onto the ground below if none
      (tg.length ? tg.map((m) => [m.x, m.y + m.h]) : [[player.x, feet + 40]])
        .forEach(([x, y]) => game.fx.push({ type: 'rain', x, y, t: 0.4 }));
      for (let h = 0; h < r.hits; h++) {
        later(0.08 + h * 0.08, () => {
          tg.filter((m) => game.mobs.includes(m)).forEach((m) => damage(m, r.dmg, { fx: 'rainHit', more: h < r.hits - 1 }));
        });
      }
      // the volley opens the link window, so Midair Spin (W in the air)
      // follows the rain without waiting for it to land
      if (tg.length) { player.combo = 1.4; player.comboT = 1.4; }
      player.glideLinkT = P.GLIDE_LINK; // and into a Glide
      break;
    }

    case 'R': {
      // Tempest: you vanish as an oval of energy sweeps up and around you,
      // striking every enemy in a wide radius (nearest first).
      player.cast = 'shoot'; player.castT = 0.36; player.castTotal = 0.36;
      player.skillPose = 'vanish';
      player.invuln = player.castT; // you're untouchable while the storm sweeps out
      sfx.shoot();
      const face = player.face;
      const mx = player.x + face * 8, my = player.y + 13;
      const tg = hitbox(player.x, player.y + player.h / 2, P.TEMPEST_R * 2, P.TEMPEST_R * 2)
        .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))
        .slice(0, r.targets);
      game.fx.push({ type: 'tempest', x: player.x, y: player.y + player.h, t: FX_DUR.tempest, follow: true });
      netShot(mx, my, face, P.TEMPEST_R);
      tg.forEach((m) => later(Math.abs(m.x - mx) / P.ARROW_V, () => {
        if (game.mobs.includes(m)) damage(m, r.dmg);
      }));
      break;
    }

    case 'MS': {
      // Midair Spin (W's air form, its own skill): a 360° sweep around you,
      // hitting every enemy in reach.
      player.cast = 'shoot'; player.castT = 0.30; player.castTotal = 0.30;
      player.skillPose = 'spin';
      player.glideLinkT = P.GLIDE_LINK; // the spin links into a Glide...
      player.volleyLinkT = P.SPIN_VOLLEY; // ...and into a Plunging Volley
      sfx.shoot();
      game.fx.push({ type: 'spin', x: player.x, y: player.y + player.h, t: FX_DUR.spin, follow: true });
      const tg = hitbox(player.x, player.y + player.h / 2, P.SPIN_R * 2, P.SPIN_R * 2).slice(0, r.targets);
      // the sweep cuts several times, not once
      for (let h = 0; h < r.hits; h++) {
        later(h * 0.08, () => {
          tg.filter((m) => game.mobs.includes(m)).forEach((m) => damage(m, r.dmg, { more: h < r.hits - 1 }));
        });
      }
      break;
    }

    case 'W': {
      // Skyfall Volley (W's ground form): knock the enemies ahead into the
      // air and shoot them before they land. Q (the rush) gathers them up
      // first, and the link window it opens is what makes this available.
      player.cast = 'shoot'; player.castT = 0.30; player.castTotal = 0.30;
      sfx.shoot();
      const face = player.face;
      const tg = hitbox(player.x + face * 30, player.y + player.h / 2, 110, 80).slice(0, r.targets);
      // the volley rains onto each target, or onto the ground just ahead if there are none
      (tg.length ? tg.map((m) => [m.x, m.y + m.h]) : [[player.x + face * 40, player.y + player.h]])
        .forEach(([x, y]) => game.fx.push({ type: 'rain', x, y, t: 0.4 }));
      tg.forEach((m) => damage(m, r.dmg, { launch: true, fx: 'rainHit' }));
      break;
    }

    case 'AB': {
      // Sky Assault: knock the enemies ahead into the air and warp straight
      // up with them (no horizontal movement), hovering to strike every
      // airborne enemy in reach for a moment before dropping with normal
      // gravity. The strikes run on the fixed step in update (see the hang
      // block); the launch is what the upgrade keeps from the base W.
      player.cast = 'barrage'; player.castT = P.BARRAGE_HANG; player.castTotal = P.BARRAGE_HANG;
      sfx.shoot();
      hitbox(player.x + player.face * 30, player.y + player.h / 2, 110, 80)
        .slice(0, r.targets).forEach((m) => damage(m, r.dmg, { launch: true }));
      const from = player.y + player.h / 2;
      // always the same rise: it used to scale with how high the launched
      // enemies were at that moment, so casting at the top of their arc
      // (or with one on a higher platform) sent you ~3x higher
      player.y = Math.max(0, player.y - P.BARRAGE_UP);
      player.vx = 0; player.vy = 0; player.onGround = false;
      game.fx.push({ type: 'swoosh', x: player.x, y: from, t: 0.2, face: player.face }); // where she left
      player.hangT = P.BARRAGE_HANG; player.hangHits = r.hits; player.hangHitT = 0;
      player.hangDmg = r.dmg; player.hangTargets = r.targets;
      // the leap links into Midair Spin (W in the air): the window stays open
      // through the hover, so the sweep fires out of it with no extra lag
      player.spinLinkT = P.BARRAGE_HANG + P.ASSAULT_SPIN_LINK;
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
          t ? () => { if (game.mobs.includes(t)) damage(t, r.dmg, { stun: true, fx: 'stunHit', more: h + tg.length < r.hits }); } : undefined,
          { speed: P.BOLT_V, sprite: 'bolt', dir: player.face, delay: h * 0.08 });
        if (!t) break; // nothing to hit: one bolt is enough
      }
      break;
    }
  }

}
