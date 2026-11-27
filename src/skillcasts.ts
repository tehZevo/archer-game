import { FX_DUR, P } from './config';
import { game, later, player } from './state';
import { held } from './input';
import { damage, hitbox, NUM_GAP, spawnArrow } from './combat';
import { surfaceBetween } from './physics';
import { surfaceYAt } from './surface';
import { sfx } from './audio';
import { netShot } from './net';
import { shotCount } from './progress';
import { endHover } from './links';
import { clearRushStrike, groundRush, startSlide } from './rush';
import { useTime } from './castrules';
import { applyStatus } from './status';
import { alive, eachShot, fxUnder, nearest, pose, setPose, tracers } from './skillfx';

import type { Mob, SkillKey, SkillRank } from './types';

/**
 * What each skill does once cast() has let it through (and paid for it).
 * Every skill resolves on an instant hitbox; multi-hit skills re-evaluate the
 * box on each tick, exactly like classic MMOs' attack frames. Damage, MP cost,
 * hit count and target count all scale with the skill's SP rank (`r`).
 */
type Cast = (r: SkillRank) => void;

/** Double Shot: draw the bow (a short windup), release a volley that whips
 *  out to the closest enemies (no projectile), then follow through. Off a
 *  Skyward Assault hover it's a ground link, so it drops you (see links.ts). */
function twinShot(r: SkillRank): void {
  endHover();
  pose('shoot', 'z');
  const face = player.face;
  const tg = nearest(player.x + face * 64, player.y - 60, 128, 200, r.targets);
  later(P.Z_WINDUP, () => {
    sfx.shoot();
    const mx = player.x + face * 8, my = player.y + 13;
    game.fx.push({ type: 'muzzle', x: mx, y: my, t: 0.18, face });
    // other players see the shot reach the first target (or whiff across the range)
    const near = alive(tg)[0];
    const shots = shotCount(r);
    netShot(mx, my, face, near ? Math.abs(near.x - mx) : 96, shots);
    // every arrow fires a tracer, so a miss shows as many arrows as a hit
    const hit = (more: boolean, first = false): void => {
      const live = alive(tg);
      tracers(live, mx, my, face);
      live.forEach((m) => damage(m, r.dmg, { more, first }));
    };
    // the first arrow lands on release; the rest follow at the number stack's
    // cadence, so the shadow's shot lands above the base hit's, not on top of it
    hit(shots > 1, true);
    eachShot(shots - 1, NUM_GAP, (more) => hit(more));
  });
}

/** One Gale Stream shot (Z held after a shot, see rapid.ts): a quick
 *  green bolt into the closest enemy ahead, hitting it twice (more with
 *  Twin Echoes). It fires the way the stream faces, not the way you walk. */
function galeShot(r: SkillRank): void {
  const face = player.rapid.face;
  setPose('shoot', 1 / P.GALE_RATE);
  const [m] = nearest(player.x + face * P.GALE_RANGE / 2, player.y + player.h / 2, P.GALE_RANGE, 56, 1);
  const mx = player.x + face * 8, my = player.y + 13;
  sfx.gale();
  game.fx.push({ type: 'galeMuzzle', x: mx, y: my, t: FX_DUR.galeMuzzle, face });
  const len = m ? Math.max(12, Math.abs(m.x - mx)) : P.GALE_RANGE * 0.7;
  game.fx.push({ type: 'galeShot', x: mx, y: my, t: FX_DUR.galeShot, face, len });
  netShot(mx, my, face, len, 1);
  if (!m) return;
  const shots = shotCount(r);
  // Each arrow takes its own line of this cast's stack, so the stream reads as
  // a stack of the skill's hits (Twin Echoes doubles it) rather than a stack
  // whose height depends on where the 30Hz step lands the 8-shots-a-second.
  eachShot(shots, 0, (more, h) => { if (alive([m]).length) damage(m, r.dmg, { more, first: h === 0, line: h, fx: 'galeHit' }); });
}

/** Glide: acrobatic forward tumble; usable repeatedly in the air. Off a Sky
 *  Assault hover it ends the hover, so the tumble carries you (the hover's
 *  own per-frame vx/vy reset would otherwise eat it). */
function glide(): void {
  endHover();
  pose('jump', 'd');
  sfx.glide();
  const dir = player.face;          // launch in the direction you're facing
  player.vx = dir * P.GLIDE_VX;     // launches forward...
  player.vy += -90;                 // ...adds to your current vertical velocity,
  player.vy = Math.max(player.vy, -P.GLIDE_VY_MAX); // capped so it can't rocket you up
  // rings open ahead of her and the streaks trail behind (the art faces right, so mirror it)
  game.fx.push({ type: 'spirit', x: player.x + dir * 10, y: player.y + player.h / 2, t: 0.3, face: -dir });
}

/** Meteor Dive (Q's air form): plunge diagonally down, carrying the enemies
 *  under and in front of you, and roll into the ground rush on landing
 *  (see landDive). */
function airDive(r: SkillRank): void {
  endHover(); // the dive's own momentum takes over at once, no stuck dive pose
  sfx.meteorDive();
  // The windup is the dive's coil: she hangs frozen for DIVE_WINDUP, the yellow
  // arrows leading the way, and the pose covers the coil as well as the plunge.
  pose('dive', 'air-q');
  player.vx = player.vy = 0;
  game.fx.push({ type: 'diveWindup', x: player.x, y: player.y + player.h / 2, t: FX_DUR.diveWindup, face: player.face });
  clearRushStrike(); // (a strike left over from an earlier rush must not land now)
  // The plunge starts at the end of the coil, and lands on the enemies below.
  later(P.DIVE_WINDUP, () => {
    player.vx = player.face * P.DIVE_VX; // the diagonal plunge
    player.vy = P.DIVE_VY;
    startSlide(P.DIVE_TIME);
    player.diving = true;
    player.diveDist = 0; // it travels P.RUSH_DIST in all (see rush.travelDive)
    hitbox(player.x + player.face * 20, player.y + player.h / 2, 96, 140)
      .slice(0, r.targets).forEach((m) => damage(m, r.dmg, { fx: 'diveHit' }));
  });
}

/** Rush Toss (Q on the ground): the ground rush (see rush.ts). Off a Skyward
 *  Assault hover it's a ground link, so it drops you (see links.ts). */
function skyToss(): void {
  endHover();
  groundRush(held('down'), false);
}

/** Electric Blitz: the charged rush. It links into the next blitz (with a
 *  charge banked), skipping this one's ending lag. */
function electricBlitz(): void {
  groundRush(held('down'), true);
}

/** Seconds until Piercing Leap's spike lands this far in front of you
 *  (matching the effect: the first drops at once, the farthest last). */
export const spikeLands = (d: number): number =>
  (2 + 3.2 * Math.min(1, d / P.SPIKE_REACH)) * FX_DUR.spikes / 10;

/** Piercing Leap (E's ground form): spikes rain out of the sky onto the
 *  ground in front of you, nearest first, and throw you into the air. Each
 *  enemy in front is speared as its spike lands. */
function spikeLift(r: SkillRank): void {
  pose('barrage', 'ground-e');
  sfx.piercingLeap();
  const face = player.face, x0 = player.x;
  game.fx.push({ type: 'spikes', x: x0, y: player.y + player.h, t: FX_DUR.spikes, face });
  hitbox(x0 + face * P.SPIKE_REACH / 2, player.y + player.h / 2, P.SPIKE_REACH, 64)
    .slice(0, r.targets)
    .forEach((m) => later(spikeLands(Math.abs(m.x - x0)), () => {
      // each spike drives in the skill's full hit count (2, doubled by Twin Echoes)
      if (game.mobs.includes(m)) eachShot(shotCount(r), 0, (more, h) => {
        if (game.mobs.includes(m)) damage(m, r.dmg, { more, first: h === 0, fx: 'spikeHit' });
      });
    }));
  // The launch is a fixed lift off the surface beneath you (the platform you
  // stand on or jumped from, not the ground slab), not a stack on top of a
  // jump: cast on the way up, you keep whatever the jump has already given you.
  const feet = player.y + player.h;
  const under = surfaceBetween(player.x, player.w, feet - 1, Infinity);
  const base = under ? surfaceYAt(under, player.x) : feet;
  player.vx = 0; // you plant in place and rise straight up, no run momentum carried
  // Rise to SPIKE_LIFT_H off that surface (never below where you are), then
  // hold there for the rest of the cast, so the hover lasts as long as the
  // commitment does. move.skillForces drives it; any other skill ends it.
  player.liftTop = Math.min(feet, base - P.SPIKE_LIFT_H);
  player.liftT = useTime('ground-e');
  player.vy = 0;
  player.onGround = false;
}

/** Ember Rain (E's air form): a small upward bump (no freeze: you keep
 *  your drift and fall right after) as a ring over your head fires a fan of
 *  burning bolts down into a column beneath you, hitting every enemy in it
 *  and setting them burning. */
function plungingVolley(r: SkillRank): void {
  endHover();
  pose('barrage', 'air-e');
  sfx.emberRain();
  const feet = player.y + player.h;
  const tg = hitbox(player.x, feet + P.PLUNGE_DEPTH / 2, P.PLUNGE_W, P.PLUNGE_DEPTH)
    .filter((m) => m.y + m.h > feet) // beneath you, not beside you
    .sort((a, b) => a.y - b.y)
    .slice(0, r.targets);
  // leave a faster existing upward speed untouched; otherwise add the hop, capped at -PLUNGE_MAX
  player.vy = player.vy < -P.PLUNGE_MAX ? player.vy : Math.max(player.vy - P.PLUNGE_HOP, -P.PLUNGE_MAX);
  // the ring (and wings) ride along with her; the fan fires from where the ring is now
  game.fx.push({ type: 'emberHalo', x: player.x, y: feet, t: FX_DUR.emberHalo, follow: true });
  game.fx.push({ type: 'emberFan', x: player.x, y: feet - P.EMBER_RING, t: FX_DUR.emberFan });
  emberFlares(tg, feet);
  tg.forEach((m) => applyStatus(m, 'burn', { stacks: P.EMBER_BURN_STACKS, dur: P.EMBER_BURN_DUR, dot: P.EMBER_BURN_DOT }));
  eachShot(shotCount(r), 0.08, (more, h) => {
    alive(tg).forEach((m) => damage(m, r.dmg, { noFx: true, more, first: h === 0 }));
  });
}

/** Where Ember Rain's bolts land: a flare at each struck enemy's feet, and on
 *  the ground below wherever the column reaches it, as the bolts arrive. */
function emberFlares(tg: Mob[], feet: number): void {
  for (const m of tg) later(0.1, () => game.fx.push({ type: 'emberFlare', x: m.x, y: m.y + m.h, t: FX_DUR.emberFlare }));
  [0, -0.7, 0.7].forEach((u, i) => {
    const x = player.x + u * (P.PLUNGE_W / 2);
    const ground = surfaceBetween(x, 1, feet, feet + P.PLUNGE_DEPTH);
    if (ground) later(0.1 + i * 0.05, () => game.fx.push({ type: 'emberFlare', x, y: surfaceYAt(ground, x), t: FX_DUR.emberFlare }));
  });
}

/** Tempest: you vanish as a huge energy arrow sweeps up and arcs out ahead,
 *  striking every enemy in a wide radius (nearest first). */
function tempest(r: SkillRank): void {
  pose('shoot', 'r');
  player.skillPose = 'vanish';
  player.invuln = player.castT; // you're untouchable while the storm sweeps out
  sfx.tempest();
  const mx = player.x + player.face * 8, my = player.y + 13;
  const tg = nearest(player.x, player.y + player.h / 2, P.TEMPEST_R * 2, P.TEMPEST_R * 2, r.targets);
  game.fx.push({ type: 'tempest', x: player.x, y: player.y + player.h, t: FX_DUR.tempest, face: player.face, follow: true });
  netShot(mx, my, player.face, P.TEMPEST_R);
  // each enemy the storm passes takes the full hit count (8, doubled by Twin
  // Echoes), not one: the first lands as the bolt reaches it, the rest follow
  tg.forEach((m) => eachShot(shotCount(r), Math.abs(m.x - mx) / P.ARROW_V, (more, h) => {
    if (game.mobs.includes(m)) damage(m, r.dmg, { fx: 'tempestHit', more, first: h === 0 });
  }));
}

/** Cyclone Sweep (W's air form): a 360° sweep around you, cutting every enemy
 *  in reach several times. */
function midairSpin(r: SkillRank): void {
  pose('shoot', 'air-w');
  player.vx = player.vy = 0; // the sweep holds its spot: no drifting on the jump's momentum
  player.skillPose = 'spin';
  endHover(); // swept out of a Skyward Assault hover: the spin takes over
  sfx.cyclone();
  game.fx.push({ type: 'spin', x: player.x, y: player.y + player.h, t: FX_DUR.spin, follow: true });
  const tg = hitbox(player.x, player.y + player.h / 2, P.SPIN_R * 2, P.SPIN_R * 2).slice(0, r.targets);
  eachShot(shotCount(r), 0, (more, h) => {
    alive(tg).forEach((m) => damage(m, r.dmg, { fx: 'spinHit', more, first: h === 0 }));
  });
}

/** Rising Arrows (W's ground form): a volley that rains on the enemies Q's
 *  rush has launched, hitting them before they land. Only a link off the rush
 *  makes this available. */
function skyfallVolley(r: SkillRank): void {
  pose('shoot', 'ground-w');
  sfx.risingArrows();
  const face = player.face;
  // tall box: the Rush Toss launches the enemy ~130px up, and this volley
  // rains onto it mid-air, so the box reaches from the ground up over the head
  const tg = hitbox(player.x + face * 30, player.y - 60, 110, 200).slice(0, r.targets);
  // the volley rains onto each target, or onto the ground just ahead if there are none
  fxUnder('rain', tg, player.x + face * 40, player.y + player.h, 0.4);
  // the volley rains on each target where it stands (only the Q tosses)
  tg.forEach((m) => eachShot(shotCount(r), 0, (more, h) => {
    if (game.mobs.includes(m)) damage(m, r.dmg, { more, first: h === 0, fx: 'rainHit' });
  }));
}

/** How far ahead of its origin the assaultRise sheet's visible middle sits. */
const ASSAULT_RISE_LEAD = 16;

/** Skyward Assault: knock the enemies ahead into the air and warp straight up
 *  with them (no horizontal movement), hovering to strike every airborne
 *  enemy in reach for a moment before dropping with normal gravity. The
 *  strikes run on the fixed step in update (see the hang block). */
function skyAssault(r: SkillRank): void {
  pose('barrage', 'ab');
  sfx.assaultRise();
  const from = player.y + player.h / 2;
  // always the same rise (scaling it with the launched enemies' height sent
  // you ~3x higher off the top of their arc)
  player.y = Math.max(0, player.y - P.BARRAGE_UP);
  player.vx = 0; player.vy = 0; player.onGround = false;
  // a tall blue slash carving up from where she left to where she hangs
  // (the sheet's crescent sits ~16px ahead of its origin: centre it on her)
  game.fx.push({ type: 'assaultRise', x: player.x - player.face * ASSAULT_RISE_LEAD, y: from, t: FX_DUR.assaultRise, face: player.face });
  // hold in the air for a fixed hover (its use/delay timings set the cast lock)
  player.hang.t = P.BARRAGE_HANG; player.hang.hits = r.hits; player.hang.hitT = 0;
  player.hang.dmg = r.dmg; player.hang.targets = r.targets;
}

/** Bolt Flurry: a volley of 4 green bolts, flown as one animated sprite;
 *  every target takes all 4 hits, and each hit stuns. Twin Echoes doubles the volley (a second one follows
 *  the first), so the burst reads heavier while every hit still lands. Like
 *  Double Shot (whose slot it takes), off a Skyward Assault hover it's a
 *  ground link, so it drops you. */
function shellBarrage(r: SkillRank): void {
  endHover();
  pose('shoot', 's');
  sfx.flurry();
  const tg = hitbox(player.x + player.face * 72, player.y + player.h / 2, 144, 72).slice(0, r.targets);
  const x0 = player.x + player.face * 8, y0 = player.y + 13;
  const shots = shotCount(r), perVolley = r.hits, volleys = Math.ceil(shots / perVolley);
  const aim = tg.length ? tg[0].x : x0 + player.face * 200;
  for (let v = 0; v < volleys; v++) {
    // the volley's hits land one after another, every target taking each one
    const onHit = tg.length ? (): void => {
      for (let h = v * perVolley; h < Math.min(shots, (v + 1) * perVolley); h++) {
        later((h - v * perVolley) * NUM_GAP, () => {
          for (const t of alive(tg)) damage(t, r.dmg, { stun: true, fx: 'stunHit', more: h < shots - 1, first: h === 0 });
        });
      }
    } : undefined;
    // the echo trails the first volley (half a volley behind), a little lower so both show
    spawnArrow(x0, y0 + v * 4, aim, tg.length > 0, onHit,
      { speed: P.BOLT_V, sprite: 'flurry', dir: player.face, delay: (v * perVolley * NUM_GAP) / 2 });
  }
}

export const CASTS: Partial<Record<SkillKey, Cast>> = {
  z: twinShot, d: glide,
  'ground-q': skyToss, eb: electricBlitz, 'air-q': airDive,
  'ground-w': skyfallVolley, ab: skyAssault, 'air-w': midairSpin,
  'ground-e': spikeLift, 'air-e': plungingVolley,
  r: tempest, s: shellBarrage, 'held-z': galeShot,
};
