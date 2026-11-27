import { describe, expect, it } from 'vitest';
import { arena, dummy, ground, step, tap } from './helpers';
import { P } from '../src/config';
import { setKey } from '../src/input';
import { linkable, linkHeld } from '../src/links';
import { delayTime, rushHolding, useTime } from '../src/castrules';
import { activeSkill } from '../src/progress';
import { cast } from '../src/skills';
import { game, player } from '../src/state';

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
