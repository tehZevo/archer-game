import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { arena, climb, dummy, release, step, tap } from './helpers';
import { BOSS, bossAlive, bossName, bossType, minions, quakes, summon } from '../src/boss';
import { killMob } from '../src/combat';
import { P, WORLD } from '../src/config';
import { game, gotoPlace, mobHp, player } from '../src/state';
import type { Mob, Platform } from '../src/types';
import { isPathEnd, samePlace, START } from '../src/world';

/** How many floors up the first area's last floor (its boss floor) is. */
function firstBossFloor(): number {
  let n = 1;
  while (!isPathEnd(climb(n))) n++;
  return n;
}

const BOSS_N = firstBossFloor();

describe('where bosses are', () => {
  beforeEach(() => release());

  it('none before an area\'s last floor, and none in a town', () => {
    gotoPlace(climb(BOSS_N - 1));
    expect(game.mobs.some((m) => m.boss)).toBe(false);
    gotoPlace(START);
    expect(game.mobs.some((m) => m.boss)).toBe(false);
  });

  it('an area\'s last floor has exactly one', () => {
    gotoPlace(climb(BOSS_N));
    expect(game.mobs.filter((m) => m.boss).length).toBe(1);
  });

  it('the boss is one of the area\'s enemies, grown huge and much tougher', () => {
    gotoPlace(climb(BOSS_N));
    const boss = bossAlive()!;
    expect(boss.w).toBe(boss.type.w * BOSS.SCALE);
    expect(boss.h).toBe(boss.type.h * BOSS.SCALE);
    expect(boss.hpMax).toBe(mobHp(boss.type, boss.level, BOSS.HP));
    expect(boss.fly).toBeFalsy();
  });

  it('the Tide Pools\' boss is the Giant Enemy Crab', () => {
    expect(bossName(bossType('Tide Pools'))).toBe('Giant Enemy Crab');
  });
});

describe('a boss fight', () => {
  let boss: Mob;
  let ground: Platform;

  /** Stand on the ground at x, able to be hurt. */
  function standAt(x: number): void {
    player.x = x;
    player.y = ground.y - player.h;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.plat = ground;
    player.climb = null;
    player.invuln = 0;
  }

  function tryTheWayUp(): void {
    const up = game.floor.portals.find((q) => !q.down)!;
    standAt(up.x);
    player.y = up.y - player.h;
    tap('up');
  }

  /** Put the boss at x on the ground, starting the given move. */
  function bossAt(x: number, act: string, t = 0): void {
    boss.x = x;
    boss.y = ground.y - boss.h;
    boss.vx = 0;
    boss.vy = 0;
    boss.boss = { act, t, cd: 9, air: false } as never;
  }

  /** Step until the boss's move is over, with only the boss on the floor. */
  function untilBossWalks(eachFrame = (): void => {}): void {
    for (let i = 0; i < 300 && boss.boss!.act !== 'walk'; i++) {
      game.mobs.splice(0, game.mobs.length, boss);
      step(1);
      eachFrame();
    }
  }

  beforeEach(() => {
    release();
    gotoPlace(climb(BOSS_N));
    boss = bossAlive()!;
    ground = game.floor.platforms[0];
    player.hpMax = 1e7;
    player.hp = 1e7;
  });
  afterEach(() => arena(1));

  it('the way up is sealed while the boss stands', () => {
    tryTheWayUp();
    expect(samePlace(game.floor.place, climb(BOSS_N))).toBe(true);
    expect(bossAlive()).toBe(boss);
  });

  it('beating the boss opens the way up', () => {
    killMob(boss);
    expect(bossAlive()).toBeFalsy();
    tryTheWayUp();
    expect(samePlace(game.floor.place, climb(BOSS_N + 1))).toBe(true);
  });

  it('shrugs off stuns and launches', () => {
    boss.stun = 2;
    boss.airTime = 1;
    step(1);
    expect(boss.stun).toBe(0);
    expect(boss.airTime).toBe(0);
  });

  it('far from you, it winds up a charge, then rushes at you', () => {
    bossAt(WORLD.w * 0.75, 'walk');
    boss.boss!.cd = 0;
    standAt(40);
    step(1);
    expect(boss.boss!.act).toBe('windCharge');
    step(Math.ceil(BOSS.WIND / P.STEP) + 2);
    expect(boss.boss!.act).toBe('charge');
    expect(boss.vx).toBeLessThan(-boss.spd * 2);
  });

  describe('slams', () => {
    /** The damage a slam does to a player standing dx from the boss. */
    function slamDamage(dx: number, bossX = WORLD.w / 2): number {
      bossAt(bossX, 'windSlam', 0.01);
      standAt(bossX + dx);
      quakes.length = 0;
      const before = player.hp;
      untilBossWalks(() => {
        standAt(bossX + dx);
        player.invuln = 0;
      });
      return before - player.hp;
    }

    it('the shockwave hurts a player on the ground nearby', () => {
      expect(slamDamage(boss.w / 2 + 40)).toBeGreaterThan(0);
      expect(quakes.length).toBe(1);
    });

    it('but not one well out of reach (it leaps toward you)', () => {
      expect(slamDamage(WORLD.w - 60, 30)).toBe(0);
    });

    describe('with a wide platform above the ground', () => {
      // floors are built from single tiles, so add one wide platform for these tests
      let deck: Platform;
      const deckMiddle = (): number => deck.x + deck.w / 2;

      beforeEach(() => {
        deck = { x: WORLD.w / 2 - 60, y: ground.y - 48, w: 120, h: 16 };
        game.floor.platforms.push(deck);
      });

      function standOnDeck(): void {
        standAt(deckMiddle());
        player.y = deck.y - player.h;
        player.plat = deck;
        player.invuln = 1;
      }
      function bossOnDeck(): void {
        bossAt(deckMiddle(), 'walk');
        boss.y = deck.y - boss.h;
        step(2);
      }

      it('the boss can stand on it with you', () => {
        standOnDeck();
        bossOnDeck();
        expect(Math.abs(boss.y + boss.h - deck.y)).toBeLessThan(1);
      });

      it('a slam from the ground lands on the platform you stand on', () => {
        standOnDeck();
        bossOnDeck();
        bossAt(deckMiddle(), 'windSlam', 0.01);
        untilBossWalks(() => { player.invuln = 1; });
        expect(boss.boss!.act).toBe('walk');
        expect(Math.abs(boss.y + boss.h - deck.y)).toBeLessThan(1);
      });

      it('a slam from the platform jumps down to you below', () => {
        const below = deck.x + deck.w + 40;
        standAt(below);
        bossOnDeck();
        boss.boss = { act: 'windSlam', t: 0.01, cd: 9, air: false } as never;
        untilBossWalks(() => {
          standAt(below);
          player.invuln = 1;
        });
        expect(boss.boss!.act).toBe('walk');
        expect(boss.boss!.dropTo).toBeFalsy();
        expect(Math.abs(boss.y + boss.h - ground.y)).toBeLessThan(1);
      });
    });
  });

  describe('summons (harder bosses call in their area\'s enemies)', () => {
    const others = (): Mob[] => game.mobs.filter((m) => !m.boss);

    beforeEach(() => {
      game.mobs.splice(0, game.mobs.length, boss);
      player.invuln = 99;
    });

    it('an easy boss never summons', () => {
      boss.level = BOSS.SUMMON_LVL - 1;
      boss.boss = { act: 'walk', t: 0, cd: 0, air: false };
      step(Math.ceil((BOSS.WIND + 0.2) / P.STEP));
      expect(others().length).toBe(0);
      expect(boss.boss.act).not.toBe('windSummon');
    });

    it('a harder boss winds up and calls in angry, plain (not elite) enemies', () => {
      boss.level = BOSS.SUMMON_LVL;
      boss.boss = { act: 'walk', t: 0, cd: 0, air: false, summonCd: 0 };
      step(1);
      expect(boss.boss.act).toBe('windSummon');
      step(Math.ceil((BOSS.WIND + 0.1) / P.STEP));
      const called = others();
      expect(called.length).toBe(BOSS.SUMMON_N);
      for (const m of called) {
        expect(m.elite).toBeFalsy();
        expect(m.aggro).toBe(true);
        expect(m.spawn).toBe(boss.boss.pack);
      }
    });

    it('up to SUMMON_MAX at once', () => {
      boss.level = BOSS.SUMMON_LVL;
      summon(boss);
      summon(boss);
      summon(boss);
      expect(minions(boss).length).toBe(BOSS.SUMMON_MAX);
    });

    it('the hardest bosses summon elites', () => {
      boss.level = BOSS.ELITE_LVL;
      summon(boss);
      expect(minions(boss).length).toBe(BOSS.SUMMON_N);
      for (const m of minions(boss)) expect(m.elite).toBe(true);
    });
  });
});

describe('a boss turning round', () => {
  it('turns to face you at the regular enemies\' pace, not in a snap', () => {
    arena(20);
    const boss = dummy(100);
    boss.boss = { act: 'walk', t: 0, cd: 99, air: false };
    boss.dir = 1;
    boss.spd = 40;
    player.x = 60; // behind it, so it wants to face left
    step(1);
    expect(boss.dir).toBe(1);
    step(6); // 0.2s in: still turning, and standing while it does
    expect(boss.dir).toBe(1);
    expect(boss.vx).toBe(0);
    step(4); // past CHASE_TURN
    expect(boss.dir).toBe(-1);
  });
});
