import { afterEach, describe, expect, it, vi } from 'vitest';
import { arena, climb, dummy, ground, landLeap, linksOpen, release, step, tap } from './helpers';
import { FX_DUR, P } from '../src/config';
import { setKey } from '../src/input';
import { linkable, linkHeld } from '../src/links';
import { NUM_GAP } from '../src/combat';
import { cdSlot, delayTime, useTime } from '../src/castrules';
import { activeSkill, rank, shotCount } from '../src/progress';
import { localPose } from '../src/net';
import { cast } from '../src/skills';
import { game, gotoPlace, player, READY_FLASH, USE_FLASH } from '../src/state';
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
    linksOpen();
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
    linksOpen();
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
    linksOpen();
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

    linksOpen();
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

  it('measures its height from the platform under you, not the ground slab', () => {
    setup();
    const deck = { x: player.x - 40, y: ground().y - 140, w: 80, h: 16 };
    game.floor.platforms.push(deck);
    // just off the deck's surface: airborne, but only ~6px above it
    player.y = deck.y - player.h - 6;
    player.onGround = false;
    player.vy = 0;
    tap('q');
    expect(player.cast).not.toBe('dive'); // too low over the deck to dive
    player.y = deck.y - player.h - 24; // a jump's peak above the deck
    tap('q');
    expect(player.cast).toBe('dive');
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

describe('queued presses', () => {

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

  it('Z pressed during a rush fires as its use time ends', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    player.ranks['ground-w'] = false;
    tap('q');
    step(1);
    tap('z');
    expect(player.cast).toBe('rush');
    linksOpen();
    step(1);
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

describe('E: Piercing Leap on the ground, Ember Rain in the air', () => {
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

  it('Ember Rain hops you up without freezing you, and hits only the enemy beneath', () => {
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

    // still in the air from the leap: Ember Rain fires despite the leap's cooldown
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


describe('Rush Toss carrying enemies', () => {

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
    expect(recovery).toBeLessThanOrEqual(0.6 + 1e-9);
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
    expect(delayTime('eb')).toBeCloseTo(0.6 / 1.2, 6);
  });
});

describe('the kit\'s hits and damage', () => {

  it('a Blitz rush strikes the enemy it carries', () => {
    arena(20);
    player.ranks.eb = true;
    const m = dummy(140);
    tap('q');
    step(24); // the slide ends and both strikes land
    expect(m.hp).toBeLessThan(1e6);
  });
});

describe('Ember Rain', () => {
  /** In the air, 120px above the ground at x = 140. */
  function highUp(): void {
    arena(30);
    player.ranks['air-e'] = true;
    player.y = ground().y - player.h - 120;
    player.onGround = false;
    player.x = 140;
  }

  it('reaches 88px below your feet (it was 176)', () => {
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

describe('Glide', () => {
  it('you can turn round mid-Glide, and the tumble keeps its momentum', () => {
    arena(20);
    player.ranks.d = true;
    player.face = 1;
    tap('c');
    step(8);
    tap('d');
    step(1);
    expect(player.casting.key).toBe('d');
    expect(player.casting.useT).toBeGreaterThan(0);
    expect(player.vx).toBeGreaterThan(0);
    setKey('left', true);
    step(1);
    setKey('left', false);
    expect(player.face).toBe(-1);
    expect(player.vx).toBeGreaterThan(0);
    expect(player.onGround).toBe(false);
  });

  it('a rope you fly past on the way up takes over from it', () => {
    arena(1);
    const g = ground();
    game.floor.ropes.length = 0;
    game.floor.ladders.length = 0;
    game.floor.ropes.push({ x: player.x, y1: g.y - 90, y2: g.y });
    player.y = g.y - player.h - 10;
    player.onGround = false;
    player.vx = 0;
    player.vy = -60;
    tap('d');
    expect(player.cast).toBe('jump');
    expect(player.casting.useT).toBeGreaterThan(0);

    setKey('up', true);
    player.x = game.floor.ropes[0].x;
    step(1);
    expect(player.climb).not.toBe(null); // grabbed mid-Glide
    expect(player.casting.useT).toBe(0); // which ends the Glide
    expect(player.casting.key).toBe(null);

    const y = player.y;
    step(8);
    setKey('up', false);
    expect(player.climb).not.toBe(null);
    expect(player.y).toBeLessThan(y - 10); // and Up keeps climbing
  });
});

describe('Piercing Leap', () => {
  /** The highest the archer gets over the next n frames, in px above `from`. */
  function peak(from: number, n: number): number {
    let best = from;
    for (let i = 0; i < n; i++) {
      step(1);
      best = Math.min(best, player.y);
    }
    return from - best;
  }

  it('leaps off a raised platform too, not just the ground slab', () => {
    arena(20);
    player.ranks['ground-e'] = true;
    const deck = { x: player.x - 40, y: ground().y - 60, w: 80, h: 16 };
    game.floor.platforms.push(deck);
    player.y = deck.y - player.h;
    player.vy = 0;
    step(2);
    const top = player.y;
    tap('e');
    expect(peak(top, 40)).toBeGreaterThan(35);
  });

  it('cast a frame into a jump, it still measures from the floor, so it does not stack on the jump', () => {
    arena(20);
    player.ranks['ground-e'] = true;
    const g = ground().y - player.h;
    tap('e');
    const flat = peak(g, 40);
    tap('c');
    step(1);
    tap('e');
    step(1);
    expect(Math.abs(g + player.h - P.SPIKE_LIFT_H - player.liftTop)).toBeLessThan(8);
    expect(peak(g, 40)).toBeLessThan(flat + 4);
  });

  it('rises to its height, holds there for the whole cast, then falls', () => {
    arena(20);
    player.ranks['ground-e'] = true;
    const g = ground().y - player.h;
    const riseTime = P.SPIKE_LIFT_H / P.SPIKE_RISE_V;
    tap('e');
    step(Math.ceil((riseTime + 0.1) / P.STEP));
    const top = g - player.y;
    expect(Math.abs(top - P.SPIKE_LIFT_H)).toBeLessThan(3);

    step(Math.floor((useTime('ground-e') - riseTime - 0.3) / P.STEP));
    expect(Math.abs(g - player.y - top)).toBeLessThan(1);
    expect(player.casting.useT).toBeGreaterThan(0);

    step(Math.ceil(0.4 / P.STEP));
    expect(g - player.y).toBeLessThan(top - 2);
  });

  it('stops your run, so you rise straight up', () => {
    arena(20);
    player.ranks['ground-e'] = true;
    player.vx = 200;
    tap('e');
    expect(player.vx).toBe(0);
    expect(player.vy).toBeLessThan(0);
    const x = player.x;
    step(6);
    expect(Math.abs(player.x - x)).toBeLessThan(1);
  });
});

describe('the aerial kit plants you (momentum from a run or jump is dropped)', () => {
  it('Cyclone Sweep holds its spot', () => {
    arena(30);
    player.ranks['ground-w'] = true;
    player.ranks['air-w'] = true;
    tap('c');
    step(6);
    player.vx = 180;
    player.vy = -60;
    tap('w');
    expect(player.vx).toBe(0);
    expect(player.vy).toBeGreaterThan(-60); // gravity picks back up next frame; the upward push is gone
    const x = player.x;
    step(6);
    expect(Math.abs(player.x - x)).toBeLessThan(1);
  });

  it('Meteor Dive hangs frozen through its coil, then plunges down and forward at 45 degrees', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    player.ranks['air-q'] = true;
    tap('c');
    step(6);
    player.vx = 180;
    player.vy = -60;
    tap('q');
    expect(player.vx).toBe(0);
    expect(player.vy).toBeGreaterThan(-60);
    expect(player.diving).toBeFalsy();
    step(2); // the 0.1s coil is the first three frames
    expect(player.diving).toBeFalsy();
    expect(player.vx).toBe(0);
    step(2);
    expect(player.diving).toBeTruthy();
    expect(player.vx).toBeGreaterThan(100);
    expect(player.vy).toBeGreaterThan(100);
  });
});

describe('Rising Arrows and Skyward Assault', () => {
  it('carry no cooldown: the next Rush Toss can fire the Volley again at once', () => {
    arena(20);
    player.ranks['ground-q'] = true;
    player.ranks['ground-w'] = true;
    player.ranks.ab = true;
    tap('q');
    linksOpen();
    tap('w');
    expect(player.cast).toBe('barrage');
    expect(player.cd['ground-w']).toBe(0);

    while (!player.onGround) step(1); // back on the ground, so Q is Rush Toss again
    step(60); // Rush Toss's 3s cooldown runs out
    tap('q');
    linksOpen();
    tap('w');
    expect(player.cast).toBe('barrage');
    expect(player.cd['ground-w']).toBe(0);
  });
});


describe('Jump is movement, not a skill', () => {
  it('a jump pressed during a skill\'s use time is dropped, not buffered', () => {
    arena(20);
    dummy(150);
    tap('z');
    expect(player.casting.useT).toBeGreaterThan(0);
    tap('c');
    expect(player.onGround).toBe(true);
    expect(player.casting.queued).toBe(null);
    while (player.casting.useT > 0) step(1);
    step(14);
    expect(player.onGround).toBe(true);
  });

  it('once movement is free, it jumps on the press', () => {
    arena(20);
    dummy(150);
    tap('z');
    while (player.casting.useT > 0) step(1);
    step(14); // and its recovery
    tap('c');
    expect(player.onGround).toBe(false);
    expect(player.vy).toBeLessThan(0);
  });
});
