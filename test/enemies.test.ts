import { afterEach, describe, expect, it } from 'vitest';
import { arena, climb, dummy, ground, release, step } from './helpers';
import { BAR_SHOW, damage } from '../src/combat';
import { MOB_TYPES, P } from '../src/config';
import { areaMobs, floorMobs } from '../src/floor';
import { ANIM_RATE, BREATH, mobFrame } from '../src/mobanim';
import { CHASE_TURN } from '../src/mobai';
import { game, gotoPlace, mobBounds, player } from '../src/state';
import { TILESETS } from '../src/tileset';
import { update } from '../src/update';
import type { Mob } from '../src/types';

describe('enemy movement', () => {
  it('patrolling enemies turn at platform ends instead of freezing there', () => {
    const frozen: string[] = [];
    for (const n of [1, 2, 4]) {
      release();
      gotoPlace(climb(n));
      player.invuln = 1e9;
      player.x = 4;
      player.y = 0;
      player.climb = null;
      const lastX = new Map<Mob, number>(), stillFrames = new Map<Mob, number>();
      for (let i = 0; i < 150; i++) {
        step(1);
        player.hp = player.hpMax;
        for (const m of game.mobs) {
          const moved = Math.abs(m.x - (lastX.get(m) ?? -9)) > 0.2;
          stillFrames.set(m, moved ? 0 : (stillFrames.get(m) ?? 0) + 1);
          lastX.set(m, m.x);
        }
      }
      for (const m of game.mobs) {
        if (!m.training && (stillFrames.get(m) ?? 0) > 45) frozen.push(`floor ${n}: ${m.type} at x ${Math.round(m.x)}`);
      }
    }
    expect(frozen).toEqual([]);
  });

  it('an angry enemy does not pin itself to the edge chasing a player it can\'t reach', () => {
    arena(1);
    const m = dummy(100);
    m.spd = 50;
    m.aggro = true;
    m.home = 80;
    m.range = 60;
    player.x = 300;
    player.y = ground().y - player.h;

    let stillFrames = 0, lastX = m.x;
    for (let i = 0; i < 90; i++) {
      step(1);
      stillFrames = Math.abs(m.x - lastX) < 0.2 ? stillFrames + 1 : 0;
      lastX = m.x;
    }
    expect(stillFrames).toBeLessThan(30);
  });
});

describe('enemy types', () => {
  const beach = areaMobs('Sunlit Shore').map((m) => m.n);

  it('the Beach has its own: snail, enemy crab, hermit crab and gull', () => {
    for (const name of ['Garden Snail', 'Enemy Crab', 'Hermit Crab', 'Gull']) expect(beach).toContain(name);
  });

  it('areas without a set of their own use the general pool', () => {
    const pool = areaMobs('Nowhere');
    expect(pool.length).toBeGreaterThanOrEqual(2);
    for (const m of pool) expect(!m.areas || m.areas.includes('*')).toBe(true);
  });

  it('every area with its own tileset has two or more of its own', () => {
    const areas = Object.keys(TILESETS).filter((a) => a !== 'Harbor'); // the Harbor is only a town
    for (const area of areas) expect(MOB_TYPES.filter((m) => m.areas?.includes(area)).length).toBeGreaterThanOrEqual(2);
  });

  describe('on a Beach floor', () => {
    const beachFloors = [2, 3, 4];

    it('the floor fields two different beach enemies, and its platforms use only those', () => {
      for (const n of beachFloors) {
        gotoPlace(climb(n));
        const spawns = game.floor.spawns;
        const pair = spawns[spawns.length - 1].types; // the ground's zone has both
        expect(pair.length).toBe(2);
        expect(pair[0]).not.toBe(pair[1]);
        for (const name of pair) expect(beach).toContain(name);
        for (const zone of spawns) for (const t of zone.types) expect(pair).toContain(t);
      }
    });

    it('some platforms field one type, some both', () => {
      let singles = 0, doubles = 0;
      for (const n of beachFloors) {
        gotoPlace(climb(n));
        for (const zone of game.floor.spawns.slice(0, -1)) {
          if (zone.types.length === 1) singles++;
          else doubles++;
        }
      }
      expect(singles).toBeGreaterThan(0);
      expect(doubles).toBeGreaterThan(0);
    });
  });

  it('a floor\'s pair is fixed by its seed', () => {
    const sequence = () => {
      let i = 0;
      return () => [0.1, 0.9, 0.5][i++ % 3];
    };
    const place = { path: 'shore', floor: 2 };
    expect(floorMobs(place, sequence())).toEqual(floorMobs(place, sequence()));
  });
});

describe('enemy HP bar', () => {
  it('is hidden until the first hit, then shows for 4s after each hit', () => {
    arena();
    const m = dummy(150);
    expect(m.barT).toBeLessThanOrEqual(0);
    damage(m, 1);
    expect(m.barT).toBeGreaterThan(0);
    for (let i = 0; i < 30; i++) update(1 / 60);
    expect(m.barT).toBeGreaterThan(0);
    expect(BAR_SHOW).toBe(4);
  });

  it('hides again once its time runs out', () => {
    arena();
    const m = dummy(150);
    damage(m, 1);
    m.barT = 0.01;
    update(1 / 60);
    expect(m.barT).toBeLessThanOrEqual(0);
  });
});

describe('enemy animation', () => {
  const walker = { anim: 0, fly: false, vx: 60, stun: 0 };

  it('a walking enemy cycles through all its frames', () => {
    const frames = new Set<number>();
    for (let i = 0; i < 24; i++) frames.add(mobFrame({ ...walker, anim: i * ANIM_RATE / 24 }, 4, 8));
    expect(frames.size).toBe(4);
  });

  it('a standing enemy holds frame 0, and breathes out a beat later', () => {
    expect(mobFrame({ ...walker, vx: 0, anim: 3.3 }, 4, 8)).toBe(0);
    expect(mobFrame({ ...walker, vx: 0, anim: ANIM_RATE * 0.9 }, 4, 8)).toBe(BREATH);
  });

  it('a stunned enemy holds frame 0', () => {
    expect(mobFrame({ ...walker, stun: 1, anim: 3.3 }, 4, 8)).toBe(0);
  });

  it('a hovering flier keeps flapping', () => {
    expect(mobFrame({ anim: ANIM_RATE * 0.25, fly: true, vx: 0, stun: 0 }, 2, 4)).toBe(1);
  });
});

describe('chasing', () => {
  // a chasing enemy aims 3 tiles (48px) past you, so it keeps going as it closes
  function chaser(playerX: number): Mob {
    arena(1, playerX);
    const m = dummy(140);
    m.spd = 60;
    m.aggro = true;
    m.dir = 1;
    return m;
  }
  afterEach(() => { game.mobs.length = 0; });

  it('runs at full speed even right next to you', () => {
    const m = chaser(160);
    m.x = player.x - 40;
    step(1);
    expect(m.vx).toBeCloseTo(60, 6);
  });

  it('runs on past you rather than stopping on you', () => {
    const m = chaser(160);
    m.x = player.x - 10;
    step(1);
    expect(m.vx).toBe(60);
    expect(m.x).toBeGreaterThan(player.x - 10);
  });

  it('three tiles past you, it stops to turn round, then comes back at full speed', () => {
    const m = chaser(160);
    m.x = player.x + 48;
    m.vx = 60;
    step(1);
    expect(m.dir).toBe(1);
    expect(m.vx).toBe(0);
    step(Math.ceil(CHASE_TURN / P.STEP));
    expect(m.dir).toBe(-1);
    expect(m.vx).toBeCloseTo(-60, 6);
  });

  it('already past its turn point (you slipped behind it), it turns back toward you', () => {
    const m = chaser(200);
    m.x = player.x + 80;
    step(1);
    expect(m.vx).toBe(0);
    step(Math.ceil(CHASE_TURN / P.STEP) + 1);
    expect(m.dir).toBe(-1);
    expect(m.vx).toBeLessThan(0);
  });

  it('with you at the end of its platform, it sweeps back from the edge instead of pressing on it', () => {
    const m = chaser(200);
    const [, edge] = mobBounds(m);
    player.x = edge - 6;
    m.x = edge - 30;
    m.vx = 0;
    let reached = false, minX = Infinity;
    for (let i = 0; i < 90; i++) {
      step(1);
      if (m.x >= edge - 1) reached = true;
      if (reached) minX = Math.min(minX, m.x);
    }
    expect(reached).toBe(true);
    expect(minX).toBeLessThan(edge - 20);
  });
});
