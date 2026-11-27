import { afterEach, describe, expect, it, vi } from 'vitest';
import { arena, climb, dummy, ground, landLeap, release, step, tap } from './helpers';
import { FX_DUR, P, SKILLS, startsLearned } from '../src/config';
import { setKey } from '../src/input';
import { linkable, linkHeld } from '../src/links';
import { NUM_GAP } from '../src/combat';
import { cdSlot, delayTime, rushHolding, useTime } from '../src/castrules';
import { activeSkill, rank, shotCount, skillRows, spendSkill } from '../src/progress';
import { localPose } from '../src/net';
import { cast } from '../src/skills';
import { game, gotoPlace, player, READY_FLASH } from '../src/state';
import { surfaceYAt } from '../src/surface';

/** Rush Toss with Down held: the slide that opens the W links. */
function rushToss(): void {
  setKey('down', true);
  tap('q');
  setKey('down', false);
}

describe('Skyward Assault', () => {
  it('slashes up as she leaps, bangs on enemies in the air, then slashes back down', () => {
    arena(20);
    player.ranks['ground-w'] = true;
    player.ranks.ab = true;
    dummy(125);
    rushToss(); // so there's something in the air to hit
    step(12);
    game.fx = [];

    tap('w');
    const order: string[] = []; // each effect type, in the order it first appears
    let bangs = 0;
    for (let i = 0; i < 46; i++) {
      const bangsBefore = game.fx.filter((f) => f.type === 'assaultBang').length;
      if (i > 0) step();
      for (const f of game.fx) if (!order.includes(f.type)) order.push(f.type);
      bangs += Math.max(0, game.fx.filter((f) => f.type === 'assaultBang').length - bangsBefore);
    }

    expect(order).toContain('assaultRise');
    expect(bangs).toBeGreaterThanOrEqual(2);
    expect(order.indexOf('assaultDrop')).toBeGreaterThan(order.indexOf('assaultBang'));
  });
});

describe('Double Shot', () => {
  it('draws the bow, then hits every enemy in range twice', () => {
    arena();
    const far = dummy(190), near = dummy(130), mid = dummy(160);
    tap('z');
    expect(near.hp).toBe(1e6); // nothing lands during the draw
    expect(mid.hp).toBe(1e6);

    step(Math.ceil(P.Z_WINDUP / P.STEP));
    const firstNear = 1e6 - near.hp, firstMid = 1e6 - mid.hp;
    expect(firstNear).toBeGreaterThan(0); // the first hit lands on release
    expect(firstMid).toBeGreaterThan(0);

    step(5);
    expect(1e6 - near.hp).toBeGreaterThan(firstNear * 1.5); // a second hit each
    expect(1e6 - mid.hp).toBeGreaterThan(firstMid * 1.5);
    expect(far.hp).toBeLessThan(1e6);
    expect(player.castTotal).toBeCloseTo(useTime('z'), 9); // the animation lasts its use time
  });
});

describe('cast timing', () => {
  it('recovery only starts counting down once the use animation ends', () => {
    arena(20);
    dummy(150);
    cast('z');
    const use = useTime('z'), delay = delayTime('z');
    expect(player.casting.useT).toBeCloseTo(use, 9);
    expect(player.casting.recoverT).toBeCloseTo(delay, 9);

    step(Math.floor((use - 0.1) / P.STEP)); // most of the use time
    expect(player.casting.useT).toBeGreaterThan(0);
    expect(player.casting.recoverT).toBeCloseTo(delay, 9);

    step(Math.ceil((use + delay) / P.STEP));
    expect(player.casting.useT).toBeLessThanOrEqual(0);
    expect(player.casting.recoverT).toBeLessThanOrEqual(0);
  });
});

describe('links after Rush Toss', () => {
  // W is Rising Arrows, upgraded to Skyward Assault by maxing it
  for (const [level, upgraded] of [[12, false], [20, true]] as const) {
    const name = upgraded ? 'Skyward Assault' : 'Rising Arrows';
    it(`${name} only works right after a Rush Toss, once per toss`, () => {
      arena(level);
      player.ranks['ground-w'] = true;
      if (upgraded) player.ranks.ab = true;
      const m = dummy(125);

      const mp = player.mp;
      tap('w');
      expect(player.mp).toBe(mp); // nothing without a Rush Toss
      expect(m.hp).toBe(1e6);

      rushToss();
      step(12);
      const hp = m.hp;
      tap('w');
      step(20);
      expect(m.hp).toBeLessThan(hp);

      step(15);
      player.cd['ground-w'] = 0;
      const hpAfter = m.hp;
      tap('w');
      step(20);
      expect(m.hp).toBe(hpAfter); // not again until the next Rush Toss
    });
  }

  it('Z during a Rush Toss casts Double Shot', () => {
    arena(12);
    player.ranks['ground-w'] = true;
    const m = dummy(125);
    rushToss();
    step(12);
    const hp = m.hp;
    tap('z');
    step(15);
    expect(m.hp).toBeLessThan(hp);
    expect(player.linkFrom).toBe('z');
  });

  it('Skyward Assault warps straight up a fixed height, hits, hovers most of a second, then lands', () => {
    arena(20);
    player.ranks['ground-w'] = true;
    player.ranks.ab = true;
    const m = dummy(125);
    rushToss();
    step(12);
    const x = player.x, y = player.y, hp = m.hp;

    tap('w');
    expect(player.x).toBe(x);
    expect(y - player.y).toBeCloseTo(P.BARRAGE_UP, 0);

    let hoverFrames = 0;
    for (let i = 0; i < 45; i++) {
      const before = player.y;
      step();
      if (player.y === before && !player.onGround) hoverFrames++;
    }
    expect(hoverFrames).toBeGreaterThanOrEqual(20);
    expect(hoverFrames).toBeLessThanOrEqual(28);
    expect(player.onGround).toBe(true);
    expect(m.hp).toBeLessThan(hp);
  });

  it('after Skyward Assault, links read off the Assault, so a second one waits for a fresh Rush Toss', () => {
    arena(20);
    player.ranks['ground-w'] = true;
    player.ranks.ab = true;
    dummy(125);
    rushToss();
    step(12);
    expect(linkable('ab')).toBe(true);

    tap('w');
    expect(player.cast).toBe('barrage');
    expect(player.hang.t).toBeGreaterThan(0);
    expect(player.linkFrom).toBe('ab');
    expect(linkable('ab')).toBe(false);

    player.hang.t = 0; player.cast = null; player.castT = 0; player.casting.useT = 0;
    tap('w');
    expect(player.cast).not.toBe('barrage');
  });
});

describe('Rush Toss', () => {
  it('slides forward pushing enemies along, hits each once, and strikes as the slide ends', () => {
    arena(1);
    const m = dummy(130);
    const x0 = player.x;
    tap('q');
    let launchedDuringSlide = false, pushed = false, hits = 0, hp = m.hp, mobX = m.x;
    for (let i = 0; i < 9 && player.rush.t > 0; i++) {
      step(1);
      if (m.hp < hp) { hits++; hp = m.hp; }
      if (m.airTime > 0 && player.rush.t > 0) launchedDuringSlide = true;
      if (m.x > mobX + 1) pushed = true;
      mobX = m.x;
    }
    expect(player.x - x0).toBeGreaterThan(30);
    expect(pushed).toBe(true);
    expect(m.x).toBeGreaterThan(130);
    expect(launchedDuringSlide).toBe(false);
    expect(hits).toBe(1);

    step(2);
    expect(m.hp).toBeLessThan(1e6);
    expect(m.airTime).toBeGreaterThan(0);
  });

  it('covers its full distance even when an enemy slows it', () => {
    arena(1);
    dummy(player.x + 20);
    const x0 = player.x;
    tap('q');
    step(3); // mid-slide, pushing the enemy
    expect(Math.abs(player.vx)).toBeLessThan(P.RUSH_SLIDE_V);
    expect(player.rush.t).toBeGreaterThan(0);

    step(20);
    expect(player.rush.t).toBe(0);
    expect(player.x - x0).toBeGreaterThanOrEqual(P.RUSH_DIST - 4);
  });

  it('stops at the edge of a platform instead of sliding off', () => {
    arena(1);
    const g = ground(), width = g.w;
    g.w = 140;
    player.x = 120;
    tap('q');
    step(14);
    const x = player.x, onGround = player.onGround;
    g.w = width;
    expect(onGround).toBe(true);
    expect(x).toBeLessThanOrEqual(140);
  });
});

describe('Bolt Flurry', () => {
  it('fires a burst at the enemy ahead', () => {
    arena(30);
    player.ranks.s = true;
    const m = dummy(140);
    tap('z');
    step(10);
    expect(m.hp).toBeLessThan(1e6);
    expect(player.face).toBe(1);
  });
});

describe('Rush Toss and W', () => {
  it('Rush Toss strikes the enemy ahead and stuns it, then W launches and shoots it', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    player.ranks['ground-w'] = true;
    const m = dummy(140);
    tap('q');
    step(14);
    expect(m.hp).toBeLessThan(1e6);
    expect(m.airTime).toBeGreaterThan(0);

    const hp = m.hp;
    tap('w');
    step(15);
    expect(m.hp).toBeLessThan(hp);
    expect(m.airTime).toBeGreaterThan(0);
  });
});

describe('Meteor Dive (Q in the air)', () => {
  /** Level 20 with Rush Toss and Meteor Dive learned. */
  function setup(): void {
    arena(20);
    player.ranks['ground-q'] = true;
    player.ranks['air-q'] = true;
  }

  it('plunges you down and forward, then lands and rolls into the ground rush', () => {
    setup();
    tap('c'); // jump
    step(6);
    const y = player.y;
    tap('q');
    step(5); // past the windup
    expect(player.y).toBeGreaterThan(y + 4);
    expect(player.vx).not.toBe(0);

    step(24);
    expect(player.onGround).toBe(true);
    expect(player.diving).toBeFalsy();
  });

  it('starts the rush on the very frame it lands, and the rush strikes and opens the links', () => {
    setup();
    const m = dummy(160);
    player.y -= 30;
    player.onGround = false;
    player.vy = 0;
    tap('q');
    let landedFrame = -1, rushFrame = -1;
    for (let i = 0; i < 30 && rushFrame < 0; i++) {
      step(1);
      if (landedFrame < 0 && player.onGround) landedFrame = i;
      if (player.onGround && player.rush.t > 0) rushFrame = i;
    }
    expect(landedFrame).toBeGreaterThanOrEqual(0);
    expect(rushFrame).toBe(landedFrame);

    step(20);
    expect(m.hp).toBeLessThan(1e6);
    expect(player.linkFrom).toBe('air-q');
    expect(linkable('ground-w')).toBe(true);
    expect(linkHeld('ground-w')).toBe(false);
  });

  it('from high up, runs out in the air after Rush Toss\'s distance and just drops, with no roll or strike', () => {
    setup();
    const m = dummy(160);
    player.y -= 140;
    player.onGround = false;
    player.vy = 0;
    tap('q');
    let diveEndedInAir = false;
    for (let i = 0; i < 60 && !player.onGround; i++) {
      step(1);
      if (!player.diving) diveEndedInAir = true;
    }
    const travelled = player.diveDist;
    let rolled = false;
    for (let i = 0; i < 20; i++) {
      step(1);
      if (player.rush.t > 0) rolled = true;
    }
    expect(diveEndedInAir).toBe(true);
    expect(Math.abs(travelled - P.RUSH_DIST)).toBeLessThan(24);
    expect(rolled).toBe(false);
    expect(m.hp).toBe(1e6);
    expect(m.airTime).toBeLessThanOrEqual(0);
  });
});

describe('Cyclone Sweep (W in the air)', () => {
  it('hits the enemies around you without launching them', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    player.ranks['ground-w'] = true;
    player.ranks['air-w'] = true;
    const m = dummy(140);
    tap('c');
    step(8);
    const hp = m.hp;
    tap('w');
    step(4);
    expect(m.hp).toBeLessThan(hp);
    expect(m.airTime).toBe(0);
  });
});

describe('Piercing Leap (E)', () => {
  it('lifts you steadily, slower than a jump, to about a jump\'s height', () => {
    arena(10);
    player.ranks['ground-e'] = true;
    tap('e');
    const ys: number[] = [];
    for (let i = 0; i < 30 && !(i > 2 && player.onGround); i++) {
      ys.push(player.y);
      step(1);
    }
    const standing = ground().y - player.h;
    const peak = standing - Math.min(...ys);
    const firstStep = ys[0] - ys[1];
    expect(peak).toBeGreaterThan(30);
    expect(peak).toBeLessThan(50);
    expect(firstStep).toBeGreaterThan(0);
    expect(firstStep).toBeLessThan(300 * P.STEP); // a jump pops up faster than this
  });
});

describe('queued presses', () => {
  it('a Glide (D) pressed while Skyward Assault hovers is dropped, not queued', () => {
    arena(30);
    for (const k of ['ground-q', 'ground-w', 'ab', 'ground-e', 'air-e', 'd'] as const) player.ranks[k] = true;
    dummy(130);
    tap('q');
    step(14);
    tap('w');
    step(3);
    expect(player.hang.t).toBeGreaterThan(0);
    expect(player.onGround).toBe(false);

    tap('d');
    expect(player.casting.queued).toBeNull();
    expect(player.hang.t).toBeGreaterThan(0);
  });

  it('Z pressed mid-rush waits, then fires the moment the slide ends', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    player.ranks['ground-w'] = false;
    dummy(200);
    tap('q');
    step(2);
    tap('z');
    expect(player.casting.queued).toBe('z');
    expect(player.cast).toBe('rush');

    let firedAfter = -1;
    for (let i = 0; i < 30 && firedAfter < 0; i++) {
      step(1);
      if (player.cast === 'shoot') firedAfter = i;
    }
    expect(firedAfter).toBeGreaterThanOrEqual(0);
    expect(player.rush.t).toBeLessThanOrEqual(0);
  });

  it('Z right after a rush fires at once', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    player.ranks['ground-w'] = false;
    tap('q');
    for (let i = 0; i < 30 && (player.rush.t > 0 || rushHolding()); i++) step(1);
    expect(player.casting.useT).toBeGreaterThan(0);
    tap('z');
    expect(player.cast).toBe('shoot');
  });

  it('the Z chained off a rush ends its links, and a second Z is a fresh shot', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    player.ranks['ground-w'] = false;
    dummy(200);
    tap('q');
    for (let i = 0; i < 30 && (player.rush.t > 0 || player.cast === 'rush'); i++) step(1);
    tap('z');
    step(1);
    expect(player.linkFrom).toBe('z');
    expect(player.cast).toBe('shoot');
    tap('z');
    expect(player.cast).toBe('shoot');
  });
});

describe('rush looks', () => {
  it('Rush Toss slides in its own aura, scuffing the ground', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    game.fx.length = 0;
    tap('q');
    step(4);
    expect(player.rush.t).toBeGreaterThan(0);
    expect(player.rush.look).toBe('tossRush');
    expect(game.fx.some((f) => f.type === 'tossTrail')).toBe(true);
  });

  it('Electric Blitz has its own aura and scuffs', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    player.ranks.eb = true;
    game.fx.length = 0;
    tap('q');
    step(4);
    expect(player.rush.look).toBe('blitzRush');
    expect(game.fx.some((f) => f.type === 'blitzTrail')).toBe(true);
    expect(game.fx.some((f) => f.type === 'tossTrail')).toBe(false);
  });

  it('a rush in place (Down + Q) has no slide aura', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    rushToss();
    expect(player.rush.t > 0 && player.rush.look).toBeFalsy();
  });
});

describe('Electric Blitz (Q upgrade)', () => {
  const SLIDE_FRAMES = 22; // the whole slide, from the cast to the strike at its end

  function setup(): void {
    arena(20);
    player.ranks['ground-q'] = true;
    player.ranks.eb = true;
  }

  it('replaces Rush Toss on Q and starts with two charges', () => {
    setup();
    expect(activeSkill('ground-q').key).toBe('eb');
    expect(player.blitz.charges).toBe(P.BLITZ_MAX);
    expect(P.BLITZ_MAX).toBe(2);
    expect(P.BLITZ_CHARGE_T).toBe(4);
  });

  it('spends a charge per use, and does nothing with none left', () => {
    setup();
    const m = dummy(140);
    tap('q');
    step(SLIDE_FRAMES);
    expect(player.blitz.charges).toBe(1);
    expect(m.hp).toBeLessThan(1e6);

    step(10);
    tap('q');
    step(SLIDE_FRAMES);
    expect(player.blitz.charges).toBe(0);

    tap('q');
    step(1);
    expect(player.rush.t).toBe(0);
    expect(player.readyT['ground-q']).toBe(0); // no ready flash: nothing came off cooldown
  });

  it('recharges one charge every 4 seconds, flashing the icon', () => {
    setup();
    player.blitz.charges = 0;
    player.blitz.t = 0;
    for (let i = 0; i < P.BLITZ_CHARGE_T * 30 + 2 && player.blitz.charges === 0; i++) step(1);
    expect(player.blitz.charges).toBe(1);
    expect(player.readyT['ground-q']).toBeGreaterThan(0);
  });

  it('a linked skill fills the recharging charge at once', () => {
    setup();
    player.blitz.charges = 1;
    player.blitz.t = 3;
    player.linkFrom = 'ground-q';
    player.ranks['ground-w'] = true;
    player.casting.useT = 0;
    cast('ground-w');
    expect(player.blitz.t).toBe(4);
  });
});

describe('rush carry', () => {
  it('an enemy the slide would kill rides along alive, then dies when the carry ends', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    const m = dummy(player.x + 24);
    m.hp = 1;
    const x0 = m.x;
    tap('q');
    let framesCarriedAlive = 0;
    for (let i = 0; i < 40 && (player.rush.t > 0 || i < 2); i++) {
      step(1);
      if (game.mobs.includes(m) && player.rush.carry.some((c) => c.m === m)) framesCarriedAlive++;
    }
    const moved = m.x - x0;
    step(30);
    expect(framesCarriedAlive).toBeGreaterThan(2);
    expect(moved).toBeGreaterThan(10);
    expect(game.mobs).not.toContain(m);
  });
});

describe('E: Piercing Leap on the ground, Downpour in the air', () => {
  function setup(): void {
    arena(10);
    player.ranks['ground-e'] = true;
    player.ranks['air-e'] = true;
  }

  it('Piercing Leap throws you up, then its spikes spear the enemies in front as they land', () => {
    setup();
    const ahead = dummy(140), behind = dummy(60);
    tap('e');
    expect(player.onGround).toBe(false);
    expect(player.vy).toBeLessThan(0);
    expect(ahead.hp).toBe(1e6); // the spikes are still falling

    step(Math.ceil(0.3 / P.STEP));
    expect(ahead.hp).toBeLessThan(1e6);
    expect(behind.hp).toBe(1e6);
    expect(player.cd['ground-e']).toBeGreaterThan(4); // a long cooldown
  });

  it('Downpour hops you up without freezing you, and hits only the enemy beneath', () => {
    setup();
    const under = dummy(100), beside = dummy(170);
    tap('c');
    step(8);
    const top = player.y;
    player.vx = 40;
    tap('e');
    step(1);
    expect(top - player.y).toBeGreaterThan(4); // a clear hop...
    expect(top - player.y).toBeLessThan(20);
    expect(player.vy).toBeLessThan(0);

    step(10);
    expect(player.vy).toBeGreaterThan(0); // ...then you fall, still moving
    expect(player.vx).not.toBe(0);

    step(4);
    expect(under.hp).toBeLessThan(1e6);
    expect(beside.hp).toBe(1e6);

    step(30);
    expect(player.onGround).toBe(true);
  });

  it('the two forms cool down separately, and the bar shows the form you are in', () => {
    setup();
    tap('e');
    step(6);
    expect(player.cd['ground-e']).toBeGreaterThan(4);
    expect(player.cdMax['ground-e']).toBe(P.SPIKE_CD);
    expect(player.cd['ground-e.air']).toBe(0);

    // still in the air from the leap: Downpour fires despite the leap's cooldown
    player.casting.useT = 0;
    const y = player.y;
    tap('e');
    step(1);
    expect(player.y).toBeLessThan(y);
    expect(player.cast).toBe('barrage');
    expect(cdSlot('ground-e')).toBe('ground-e.air');
    expect(cdSlot('ground-e', false)).toBe('ground-e');
  });
});

describe('links refund cooldowns', () => {
  it('a linked skill takes 1s off every other skill\'s cooldown', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    player.ranks['ground-w'] = true;
    player.ranks['ground-e'] = true;
    dummy(150);
    tap('e');
    step(2);
    landLeap();
    player.cd.r = 5;
    player.cd['ground-w.air'] = 3;
    tap('q');
    step(14); // the rush ends: the link window is open
    const leap = player.cd['ground-e'], tempest = player.cd.r, sweep = player.cd['ground-w.air'];

    tap('w');
    step(4);
    expect(player.cast).toBe('shoot');
    expect(player.linkFrom).toBe('ground-w');
    const frames = 4 / 30;
    expect(Math.abs(player.cd['ground-e'] - (leap - 1 - frames))).toBeLessThan(0.05);
    expect(player.cd.r).toBeLessThan(tempest - 0.9);
    expect(player.cd['ground-w.air']).toBeLessThan(sweep - 0.9);
  });
});

describe('cooldowns', () => {
  it('Cyclone Sweep lifts you slowly and can\'t be spammed (8s cooldown)', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    player.ranks['ground-w'] = true;
    player.ranks['air-w'] = true;
    const m = dummy(140);
    tap('c');
    step(8);
    tap('w');
    const y = player.y;
    let rising = true;
    for (let i = 0; i < 12; i++) {
      const before = player.y;
      step(1);
      if (player.y >= before) rising = false;
    }
    expect(rising).toBe(true);
    expect(y - player.y).toBeLessThan(15);

    const hp = m.hp;
    player.casting.useT = 0;
    tap('w');
    step(2);
    expect(hp).toBeLessThan(1e6);
    expect(m.hp).toBe(hp); // no second spin
    expect(player.cd['ground-w.air']).toBeGreaterThan(3);
    expect(player.cdMax['ground-w.air']).toBe(8);
  });

  it('the ground rush has a 3s cooldown; Meteor Dive has none, only use and recovery time', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    player.ranks['air-q'] = true;
    tap('q');
    expect(player.cdMax['ground-q']).toBe(3);
    expect(player.casting.useT).toBeGreaterThan(0);

    step(40);
    player.cd['ground-q'] = 0;
    tap('c');
    step(6);
    tap('q');
    expect(player.cd['ground-q.air']).toBe(0);
    expect(player.casting.useT).toBeGreaterThan(0);
    expect(player.casting.recoverT).toBeGreaterThan(0);
  });

  it('a bar icon flashes as its cooldown runs out, then the flash fades', () => {
    arena(20);
    player.ranks['ground-e'] = true;
    tap('e');
    expect(player.cd['ground-e']).toBeGreaterThan(0);
    expect(player.readyT['ground-e']).toBe(0);

    for (let i = 0; i < 400 && player.cd['ground-e'] > 0; i++) step(1);
    expect(player.cd['ground-e']).toBe(0);
    expect(player.readyT['ground-e']).toBeGreaterThan(0);

    step(8);
    expect(player.readyT['ground-e']).toBeGreaterThan(0);
    expect(player.readyT['ground-e']).toBeLessThan(READY_FLASH);
    step(10);
    expect(player.readyT['ground-e']).toBe(0);
  });
});

describe('Meteor Dive follow-ups', () => {
  it('fire off its landing, not its coil, and a Double Shot pressed mid-plunge waits out the landing roll', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    player.ranks['air-q'] = true;
    dummy(150);
    tap('c');
    step(8);
    tap('q');
    expect(linkable('ground-w')).toBe(true);
    expect(linkHeld('ground-w')).toBe(true); // held until the landing

    step(4);
    tap('z');
    expect(player.casting.queued).toBe('z');
    let rolled = false, firedWhileRolling = false;
    for (let i = 0; i < 40 && player.casting.queued; i++) {
      step(1);
      if (player.onGround && player.rush.t > 0) rolled = true;
      if (player.cast === 'shoot' && player.rush.t > 0) firedWhileRolling = true;
    }
    expect(rolled).toBe(true);
    expect(firedWhileRolling).toBe(false);
    expect(player.cast).toBe('shoot');
  });
});

describe('Tempest (R)', () => {
  const STORM_FRAMES = Math.ceil((0.7 + 6 * NUM_GAP) / P.STEP); // all 6 hits land

  it('hits every enemy caught in the sweep, and has a long cooldown', () => {
    arena(25);
    player.ranks.r = true;
    const a = dummy(130), b = dummy(170);
    tap('r');
    step(STORM_FRAMES);
    expect(a.hp).toBeLessThan(1e6);
    expect(b.hp).toBeLessThan(1e6);

    const hp = a.hp;
    player.casting.useT = 0;
    tap('r');
    step(5);
    expect(a.hp).toBe(hp);
    expect(player.cd.r).toBeGreaterThan(4);
  });

  it('lands all 6 of its hits on each enemy', () => {
    arena(60);
    player.ranks.r = true;
    const a = dummy(130);
    tap('r');
    step(STORM_FRAMES);
    expect(1e6 - a.hp).toBeGreaterThan(6 * 0.9); // one hit alone would be about a sixth of this
  });
});

describe('Haste (passive)', () => {
  it('makes use times 20% shorter at rank 3, but leaves cooldowns alone', () => {
    arena(25);
    dummy(130);
    player.ranks.r = true;
    const castFresh = (key: 'z' | 'r'): void => {
      player.casting.useT = 0;
      player.casting.recoverT = 0;
      player.cd.r = 0;
      cast(key);
    };

    castFresh('z');
    const shotUse = player.casting.useT;
    expect(shotUse).toBeGreaterThan(0.1);
    expect(player.cd.z).toBe(0); // Double Shot is paced by its use time alone
    castFresh('r');
    const tempestUse = player.casting.useT, tempestCd = player.cd.r;

    player.ranks.ha = true;
    castFresh('r');
    expect(player.casting.useT).toBeCloseTo(tempestUse / 1.2, 6);
    expect(player.cd.r).toBe(tempestCd);
    castFresh('z');
    expect(player.casting.useT).toBeCloseTo(shotUse / 1.2, 6);
  });
});

describe('skill effects', () => {
  // an effect living longer than its animation once crashed the renderer
  it('no effect a skill spawns outlives its animation', () => {
    const bad = new Set<string>();
    for (const key of ['z', 'ground-q', 'ground-w', 'ground-e', 'r', 'd'] as const) {
      arena(60, 200);
      // learn every skill except the shot variants and the ones that change these casts
      for (const k of Object.keys(player.ranks) as (keyof typeof player.ranks)[]) {
        const skip = ['s', 'BS', 'VS', 'RA', 'ab'].includes(k);
        player.ranks[k] = skip ? 0 : 1;
      }
      dummy(240);
      dummy(280);
      game.fx = [];
      cast(key);
      step(1);
      for (let i = 0; i < 20; i++) {
        for (const fx of game.fx) if (fx.t > FX_DUR[fx.type] + 1e-9) bad.add(`${key}: ${fx.type}`);
        step(1);
      }
    }
    expect([...bad]).toEqual([]);
  });
});

describe('Rush Toss carrying enemies', () => {
  it('hits 6 enemies at most', () => {
    arena(1);
    player.ranks['ground-q'] = true;
    const mobs = Array.from({ length: 9 }, (_, i) => dummy(120 + i * 6));
    tap('q');
    step(14);
    expect(mobs.filter((m) => m.hp < 1e6).length).toBe(6);
  });

  it('scoops up an enemy just behind you', () => {
    arena(1);
    const behind = dummy(95);
    player.x = 100;
    tap('q');
    step(14);
    expect(behind.hp).toBeLessThan(1e6);
    expect(behind.x).toBeGreaterThan(100);
  });

  it('a carried enemy is always left standing on its own platform', () => {
    let runs = 0;
    const bad: string[] = [];
    for (const n of [1, 2, 3, 4]) {
      for (let k = 0; k < 10; k++) {
        for (const face of [1, -1] as const) {
          release();
          gotoPlace(climb(n));
          const m = game.mobs.filter((x) => !x.fly && !x.training)[k];
          if (!m) continue;
          player.invuln = 1e9;
          player.mp = 999;
          player.ranks['ground-q'] = true;
          player.cd['ground-q'] = 0;
          player.casting.useT = 0;
          // stand just beside the enemy, facing it
          player.x = m.x - face * 14;
          player.y = m.y + m.h - player.h;
          player.vy = 0;
          player.face = face;
          player.onGround = true;
          player.climb = null;
          step(1);
          if (!player.onGround) continue;

          runs++;
          tap('q');
          step(60);
          if (!game.mobs.includes(m)) continue; // killed
          const home = game.floor.platforms.filter((p) => !p.inner && p.block === m.spawn?.block && m.x >= p.x && m.x < p.x + p.w);
          const standing = home.some((p) => Math.abs(surfaceYAt(p, m.x) - (m.y + m.h)) < 3);
          if (!standing) bad.push(`floor ${n}, enemy ${k}, facing ${face}`);
        }
      }
    }
    expect(runs).toBeGreaterThan(10);
    expect(bad).toEqual([]);
  });
});

describe('Glide and Acrobatics (bought with SP, not given)', () => {
  /** Hang on the first rope or ladder, just above its foot. */
  function hangOnRope(): void {
    const c = [...game.floor.ropes, ...game.floor.ladders][0];
    player.climb = c;
    player.x = c.x;
    player.y = c.y2 - player.h - 1;
    player.onGround = false;
    player.vx = 0;
    player.vy = 0;
  }
  afterEach(() => release());

  it('a new archer has Double Shot for free, but not Glide', () => {
    expect(SKILLS.d.learn).toBe(true);
    expect(startsLearned('z')).toBe(true);
    expect(startsLearned('d')).toBe(false);
  });

  it('Glide can take SP from Lv.1', () => {
    arena(1);
    player.ranks.d = false;
    player.sp = 1;
    const row = skillRows().find((r) => r.key === 'd')!;
    expect(row.learned).toBe(false);
    expect(row.action).toBeTruthy();
    expect(spendSkill('d')).toBe(true);
    expect(player.ranks.d).toBe(true);
  });

  it('Glide is a quick 0.2s tumble with a 0.1s recovery', () => {
    expect(SKILLS.d.use).toBe(0.2);
    expect(SKILLS.d.delay).toBe(0.1);
  });

  it('Acrobatics opens at Lv.10', () => {
    arena(1);
    expect(SKILLS.ac.minLevel).toBe(10);
    expect(skillRows().some((r) => r.key === 'ac')).toBe(false);
  });

  it('without Acrobatics, Up + Jump on a rope does not rush', () => {
    arena(10);
    player.ranks.ac = false;
    hangOnRope();
    setKey('up', true);
    tap('c');
    expect(player.climbRush).toBeFalsy();
  });

  it('with it, Up + Jump rushes up the rope, trailing green rising streaks', () => {
    arena(10);
    player.ranks.ac = true;
    hangOnRope();
    setKey('up', true);
    tap('c');
    expect(player.climbRush).toBeTruthy();
    expect(game.fx.some((f) => f.type === 'climbRise')).toBe(true);
  });

  it('Acrobatics does not speed up a plain climb (it only gives the rush)', () => {
    const climbOneFrame = (acrobatics: boolean): number => {
      arena(10);
      player.ranks.ac = acrobatics;
      hangOnRope();
      const y = player.y;
      setKey('up', true);
      step(1);
      setKey('up', false);
      return y - player.y;
    };
    expect(climbOneFrame(true)).toBeCloseTo(climbOneFrame(false), 2);
  });
});

describe('a Double Shot at nothing', () => {
  it('still fires one arrow per hit', () => {
    arena(1);
    game.fx.length = 0;
    const tracers = new Set<object>();
    tap('z');
    for (let i = 0; i < Math.ceil((P.Z_WINDUP + 0.3) / P.STEP); i++) {
      step(1);
      for (const fx of game.fx) if (fx.type === 'tracer') tracers.add(fx);
    }
    expect(tracers.size).toBe(rank('z').hits);
  });
});

describe('skill looks', () => {
  const hasFx = (type: string): boolean => game.fx.some((f) => f.type === type);
  function leapUp(): void {
    player.y -= 40;
    player.vy = 0;
    player.onGround = false;
  }
  afterEach(() => release());

  it('Piercing Leap erupts spikes from the ground', () => {
    arena(30);
    player.ranks['ground-e'] = true;
    game.fx.length = 0;
    tap('e');
    expect(hasFx('spikes')).toBe(true);
    expect(hasFx('rush')).toBe(false);
  });

  it('Cyclone Sweep whirls blades round you and spins the archer', () => {
    arena(30);
    player.ranks['air-w'] = true;
    leapUp();
    game.fx.length = 0;
    tap('w');
    expect(hasFx('spin')).toBe(true);
    expect(localPose()).toBe('spin');
  });

  it('Tempest sweeps an oval of energy as the archer vanishes, and she is back after', () => {
    arena(30);
    player.ranks.r = true;
    game.fx.length = 0;
    tap('r');
    expect(hasFx('tempest')).toBe(true);
    expect(hasFx('muzzle')).toBe(false);
    expect(localPose()).toBe('vanish');
    step(43);
    expect(localPose()).not.toBe('vanish');
  });

  it('Meteor Dive draws its dive pose', () => {
    arena(30);
    player.ranks['air-q'] = true;
    leapUp();
    tap('q');
    step(4); // past the windup
    expect(player.diving).toBeTruthy();
    expect(localPose()).toBe('dive');
  });
});

describe('Tempest is a committed cast', () => {
  it('locks you in place, invulnerable for the whole cast', () => {
    arena(20);
    player.ranks.r = true;
    dummy(140);
    tap('r');
    expect(player.cast).toBe('shoot');
    expect(player.casting.useT).toBeGreaterThan(0);
    expect(player.invuln).toBeGreaterThan(0);
    expect(player.invuln).toBeGreaterThanOrEqual(player.castT - 1e-9);
  });

  it('the invulnerability ends with the storm, and a long cooldown runs on', () => {
    arena(20);
    player.ranks.r = true;
    dummy(140);
    player.invuln = 0;
    tap('r');
    step(43); // the 1.4s storm plays out
    expect(player.invuln).toBeLessThanOrEqual(0);
    expect(player.cd.r).toBeGreaterThan(8);
  });

  it('in midair it pins you completely (no falling, no drift), then you fall', () => {
    arena(20);
    player.ranks.r = true;
    tap('c');
    step(7); // near the jump's top
    tap('r');
    expect(player.casting.freeze).toBeTruthy();
    expect(player.vy).toBe(0);
    const y = player.y;
    step(10); // half the storm
    expect(player.y).toBe(y);
    expect(player.vy).toBe(0);
    step(11); // the rest of the 0.7s cast
    expect(player.casting.freeze).toBeFalsy();
    expect(player.y).toBeGreaterThan(y);
  });
});

describe('recovery (delay) after the Q rushes', () => {
  it('Rush Toss ends in its own recovery, which outlasts the slide', () => {
    arena(20);
    dummy(150);
    const recovery = delayTime('ground-q');
    expect(recovery).toBeLessThanOrEqual(0.35 + 1e-9);
    cast('ground-q');
    expect(player.casting.recoverT).toBe(recovery);
    expect(player.casting.useT).toBeGreaterThan(0);
  });

  it('Electric Blitz carries the same recovery', () => {
    arena(20);
    const recovery = delayTime('ground-q');
    player.ranks['ground-q'] = false;
    player.ranks.eb = true;
    expect(delayTime('eb')).toBe(recovery);
  });

  it('Haste (rank 3) makes it 20% shorter', () => {
    arena(20);
    player.ranks.eb = true;
    player.ranks.ha = true;
    expect(delayTime('eb')).toBeCloseTo(0.35 / 1.2, 6);
  });
});

describe('the kit\'s hits and damage', () => {
  it('Double Shot 4x120%, Rising Arrows 4, Assault 4, Sweep 4x200%, Blitz 2, Tempest 6x300%, Dive 1x400%', () => {
    expect([SKILLS.z.targets1, SKILLS.z.dmg1]).toEqual([4, 120]);
    expect(SKILLS['ground-w'].hits1).toBe(4);
    expect(SKILLS.ab.hits1).toBe(4);
    expect([SKILLS['air-w'].hits1, SKILLS['air-w'].dmg1]).toEqual([4, 200]);
    expect(SKILLS.eb.hits1).toBe(2);
    expect([SKILLS.r.hits1, SKILLS.r.dmg1]).toEqual([6, 300]);
    expect([SKILLS['air-q'].hits1, SKILLS['air-q'].dmg1]).toEqual([1, 400]);
  });

  it('a Blitz rush strikes the enemy it carries', () => {
    arena(20);
    player.ranks.eb = true;
    const m = dummy(140);
    tap('q');
    step(24); // the slide ends and both strikes land
    expect(m.hp).toBeLessThan(1e6);
  });
});

describe('Downpour', () => {
  /** In the air, 120px above the ground at x = 140. */
  function highUp(): void {
    arena(30);
    player.ranks['air-e'] = true;
    player.y = ground().y - player.h - 120;
    player.onGround = false;
    player.x = 140;
  }

  it('reaches 88px below your feet (it was 176)', () => {
    expect(P.PLUNGE_DEPTH).toBe(88);
    highUp();
    const near = dummy(140);
    near.y = player.y + player.h + 10; // right below
    const far = dummy(140); // on the ground, about 100px down
    player.x = 140;
    tap('e');
    step(2);
    expect(near.hp).toBeLessThan(1e6);
    expect(far.hp).toBe(1e6);
  });

  it('flares on the archer and blasts one tornado below, with no rain or hit sparks', () => {
    highUp();
    const m = dummy(140);
    m.y = player.y + player.h + 10;
    game.fx.length = 0;
    tap('e');
    step(6);
    const types = game.fx.map((f) => f.type);
    expect(types).toContain('volleyFlare');
    expect(types).toContain('tornado');
    for (const t of ['rain', 'rainHit', 'hit', 'crit']) expect(types).not.toContain(t);
    expect(m.hp).toBeLessThan(1e6);
  });
});

describe('Twin Echoes\' shadow arrows', () => {
  afterEach(() => vi.restoreAllMocks());

  /** Fire a full Double Shot (with the shadow) at one enemy; returns its damage numbers. */
  function volley() {
    arena(20);
    player.ranks.es = true;
    const m = dummy(140);
    player.x = m.x - 40;
    game.dmgNums.length = 0;
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // no crits or misses
    tap('z');
    step(Math.ceil((P.Z_WINDUP + 0.4) / P.STEP));
    return game.dmgNums.filter((d) => d.txt !== 'MISS');
  }

  it('every arrow shows its own number', () => {
    expect(volley().length).toBe(shotCount(rank('z')));
  });

  it('the numbers stack a line apart, not in a pile', () => {
    const nums = volley();
    expect(new Set(nums.map((d) => Math.round(d.y))).size).toBe(nums.length);
  });

  it('the shadow hits as hard as the base arrow', () => {
    const nums = volley();
    for (const d of nums) expect(Math.abs(d.v - nums[0].v)).toBeLessThanOrEqual(1);
  });
});

describe('Bolt Flurry', () => {
  /** Every damage number shown over the next second. */
  function numbersOverASecond(): Set<{ x: number }> {
    const seen = new Set<{ x: number }>();
    for (let i = 0; i < 60; i++) {
      step(1);
      for (const d of game.dmgNums) seen.add(d);
    }
    return seen;
  }

  it('flies as one 4-bolt volley sprite, even on a whiff', () => {
    arena(30);
    player.ranks.s = true;
    game.shots.length = 0;
    tap('z');
    expect(game.shots.length).toBe(1);
    expect(game.shots[0].sprite).toBe('flurry');
  });

  it('lands its 4 hits on every target, not split between them', () => {
    arena(70);
    player.ranks.s = true;
    const a = dummy(150), b = dummy(170);
    game.dmgNums.length = 0;
    tap('z');
    const seen = [...numbersOverASecond()];
    // numbers fan out sideways, so count each by the enemy it's nearest
    const nearA = seen.filter((d) => Math.abs(d.x - a.x) < Math.abs(d.x - b.x)).length;
    expect(nearA).toBe(4);
    expect(seen.length - nearA).toBe(4);
  });

  it('with Twin Echoes, flies two volleys a little apart (so both show), and lands all 8 hits', () => {
    arena(70);
    player.ranks.s = true;
    player.ranks.es = true;
    const m = dummy(160);
    game.shots.length = 0;
    game.dmgNums.length = 0;
    tap('z');
    expect(game.shots.length).toBe(2);
    for (const s of game.shots) expect(s.sprite).toBe('flurry');
    expect(new Set(game.shots.map((s) => Math.round(s.y))).size).toBe(2);
    expect(shotCount(rank('z'))).toBe(8);
    expect(numbersOverASecond().size).toBe(8);
    expect(m.hp).toBeLessThan(1e6);
  });
});
