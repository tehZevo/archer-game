import { afterEach, describe, expect, it, vi } from 'vitest';
import { arena, climb, dummy, ground, release, step } from './helpers';
import { BAR_SHOW, damage, DYING_MAX, HITSTUN, killMob } from '../src/combat';
import { ELITE, MOB_TYPES, P, VARIANT_CHANCE } from '../src/config';
import { drops } from '../src/economy';
import { DRAWN, hasMobArt } from '../src/mobart';
import { MOB_GEN } from '../src/sprites';
import { VARIANT_ART } from '../src/variantart';
import { mobLevel } from '../src/world';
import { areaMobs, floorMobs, pickVariant } from '../src/floor';
import { ANIM_RATE, BREATH, mobFrame } from '../src/mobanim';
import { CHASE_TURN } from '../src/mobai';
import { game, gotoPlace, mobBounds, mobDmg, player, spawnMob, spawnWave } from '../src/state';
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

describe('enemy variants (cousins of an area\'s enemies that turn up in their place)', () => {
  const variants = MOB_TYPES.filter((m) => m.of);
  const typeNamed = (name: string) => MOB_TYPES.find((m) => m.n === name)!;
  const drawnVariants = Object.keys(VARIANT_ART);
  /** Which pixels of a sprite's first frame are filled, as a string of 0s and 1s. */
  function silhouette(name: string): string {
    const g = MOB_GEN[name]().frames[0].g;
    let mask = '';
    for (let i = 0; i < g.w * g.h; i++) mask += g.px[i * 4 + 3] ? '1' : '0';
    return mask;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    game.mobs.length = 0;
  });

  it('there are plenty (15 or more)', () => {
    expect(variants.length).toBeGreaterThanOrEqual(15);
  });

  it('every enemy has art: painted, hand-drawn, or a drawn variant', () => {
    expect(MOB_TYPES.filter((m) => !hasMobArt(m.n)).map((m) => m.n)).toEqual([]);
  });

  it('every drawn variant is a cousin of a hand-drawn enemy', () => {
    for (const name of drawnVariants) expect(DRAWN).toContain(typeNamed(name).of);
  });

  it('a drawn variant is drawn at its own size, every row the right width', () => {
    for (const name of drawnVariants) {
      const art = VARIANT_ART[name], type = typeNamed(name);
      expect(art.w).toBe(type.w);
      expect(art.h).toBe(type.h);
      for (const frame of [0, 1, 2, 3]) {
        expect(art.rows(frame).length).toBe(art.h);
        for (const row of art.rows(frame)) expect(row.length).toBe(art.w);
      }
      expect(art.hurt().length).toBe(art.h);
    }
  });

  it('a drawn variant has its own silhouette, not its parent\'s in new colours', () => {
    for (const name of drawnVariants) expect(silhouette(name)).not.toBe(silhouette(typeNamed(name).of!));
  });

  it('every variant is of a real (non-variant) enemy, and lives where that enemy does', () => {
    for (const v of variants) {
      const parent = typeNamed(v.of!);
      expect(parent).toBeTruthy();
      expect(parent.of).toBeFalsy();
      expect(v.areas?.length).toBeGreaterThan(0);
      for (const area of v.areas!) expect(parent.areas).toContain(area);
    }
  });

  it('every area with its own enemies has a variant or two', () => {
    const areas = [...new Set(MOB_TYPES.flatMap((m) => m.areas ?? []))].filter((a) => a !== '*');
    expect(areas.filter((a) => !variants.some((v) => v.areas!.includes(a)))).toEqual([]);
  });

  it('variants are never one of a floor\'s two types', () => {
    const areas = [...new Set(MOB_TYPES.flatMap((m) => m.areas ?? []))].filter((a) => a !== '*');
    for (const area of areas) for (const m of areaMobs(area)) expect(m.of).toBeFalsy();
  });

  it('usually the enemy itself spawns; now and then its variant does instead', () => {
    const snail = typeNamed('Garden Snail');
    expect(pickVariant(snail, 'Sunlit Shore', VARIANT_CHANCE + 0.01)).toBe(snail);
    expect(pickVariant(snail, 'Sunlit Shore', 0).n).toBe('Red Snail');
  });

  it('a variant only turns up in its own areas', () => {
    const gull = typeNamed('Gull');
    expect(pickVariant(gull, 'Sunlit Shore', 0)).toBe(gull);
    expect(pickVariant(gull, 'Endless Sky', 0).n).toBe('Storm Gull');
  });

  it('waves spawn variants', () => {
    gotoPlace(climb(2));
    game.mobs.length = 0;
    for (const zone of game.floor.spawns) zone.types = ['Garden Snail'];
    vi.spyOn(Math, 'random').mockReturnValue(0.01); // every roll picks the variant
    spawnWave();
    expect(game.mobs.length).toBeGreaterThan(0);
    for (const m of game.mobs) expect(m.type.of).toBeTruthy();
  });
});

describe('elites (rare, bigger, tougher, worth more)', () => {
  /** A plain enemy and an elite of the same type, side by side. */
  function plainAndElite(): [Mob, Mob] {
    arena();
    const zone = { x: 100, y: ground().y, types: ['Enemy Crab'] } as never;
    spawnMob(zone, MOB_TYPES[1]);
    spawnMob(zone, MOB_TYPES[1], true);
    const [plain, elite] = game.mobs.slice(-2);
    return [plain, elite];
  }
  afterEach(() => {
    game.mobs = [];
    game.floor.spawns = [];
    drops.length = 0;
  });

  it('an elite is bigger, tougher and worth more EXP', () => {
    const [plain, elite] = plainAndElite();
    expect(plain.elite).toBeFalsy();
    expect(elite.elite).toBeTruthy();
    expect(elite.w).toBe(Math.round(plain.w * ELITE.SCALE));
    expect(elite.h).toBe(Math.round(plain.h * ELITE.SCALE));
    expect(elite.hpMax).toBe(Math.round(plain.hpMax * ELITE.HP));
    expect(elite.exp).toBe(plain.exp * ELITE.EXP);
  });

  it('each one\'s damage is a 50-100% roll of its own (elite-boosted) max', () => {
    const [plain, elite] = plainAndElite();
    const level = mobLevel(game.floor.place);
    for (const [m, mult] of [[plain, 1], [elite, ELITE.DMG]] as const) {
      const max = mobDmg(MOB_TYPES[1], level, mult);
      expect(m.dmg).toBeGreaterThanOrEqual(Math.round(max * 0.5) - 1);
      expect(m.dmg).toBeLessThanOrEqual(max);
    }
  });

  it('an elite stands on the ground like the rest, and keeps its name (quests count it)', () => {
    const [plain, elite] = plainAndElite();
    expect(elite.y + elite.h).toBeCloseTo(plain.y + plain.h, 2);
    expect(elite.name).toBe(plain.name);
  });

  it(`an elite drops ${ELITE.COINS} coin piles`, () => {
    const [plain, elite] = plainAndElite();
    drops.length = 0;
    killMob(plain);
    expect(drops.length).toBe(1);
    killMob(elite);
    expect(drops.length).toBe(1 + ELITE.COINS);
  });

  it('waves roll elites rarely, about 1 in 25', () => {
    arena();
    expect(ELITE.CHANCE).toBe(1 / 25);
    game.floor.spawns = Array.from({ length: 400 }, (_, i) => ({ x: 40 + (i % 10), y: ground().y, types: ['Enemy Crab'] }));
    game.mobs = [];
    spawnWave();
    const share = game.mobs.filter((m) => m.elite).length / game.mobs.length;
    expect(share).toBeGreaterThan(0.01);
    expect(share).toBeLessThan(0.09);
  });
});

describe('dying (a multi-hit overkill waits for the last hit)', () => {
  function weakEnemy(): Mob {
    arena(1);
    game.dmgNums.length = 0;
    return dummy(player.x + 30, 1);
  }
  afterEach(() => { game.mobs.length = 0; });

  it('an overkill hit with more to come leaves the enemy dying, in place', () => {
    const m = weakEnemy(), kills = game.kills;
    damage(m, 1, { more: true });
    expect(game.mobs).toContain(m);
    expect(m.dying).not.toBe(undefined);
    expect(game.kills).toBe(kills);
    step(2);
    expect(game.mobs).toContain(m);
    expect(m.vx).toBe(0); // frozen between hits
  });

  it('every hit shows its number, and the last one kills it', () => {
    const m = weakEnemy(), kills = game.kills;
    damage(m, 1, { more: true });
    damage(m, 1, { more: true });
    damage(m, 1);
    expect(game.dmgNums.length).toBe(3);
    expect(game.mobs).not.toContain(m);
    expect(game.kills).toBe(kills + 1);
  });

  it('killing it again does nothing', () => {
    const m = weakEnemy(), kills = game.kills;
    damage(m, 1);
    killMob(m);
    expect(game.kills).toBe(kills + 1);
  });

  it('a dying enemy dies anyway if the last hit never comes', () => {
    const m = weakEnemy(), kills = game.kills;
    damage(m, 1, { more: true });
    step(Math.ceil(DYING_MAX / P.STEP) + 2);
    expect(game.mobs).not.toContain(m);
    expect(game.kills).toBe(kills + 1);
  });
});

describe('hitstun', () => {
  it('a hit stops a chasing enemy for a moment', () => {
    arena(1);
    const m = dummy(player.x + 60);
    m.spd = 60;
    m.aggro = true;
    m.vx = 60;
    damage(m, 1);
    expect(m.hurt ?? 0).toBeGreaterThan(0);
    expect(m.hurt).toBeLessThanOrEqual(HITSTUN);
    step(3);
    expect(Math.abs(m.vx)).toBeLessThan(30);
    step(Math.ceil(HITSTUN / P.STEP) + 1);
    expect(m.hurt).toBeFalsy();
  });
});
