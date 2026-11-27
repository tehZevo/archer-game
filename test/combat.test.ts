import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arena, dummy, ground, step, tap } from './helpers';
import { MOB_TYPES, P } from '../src/config';
import { capAdd, hurtPlayer } from '../src/boss';
import { clearGear } from '../src/gear';
import { critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, NUM_GAP, NUM_LINE } from '../src/combat';
import { recalcStats } from '../src/progress';
import { gotoPlace, LEVEL_SPAN, LV_1_DMG, LV_100_DMG, spawnMob } from '../src/state';
import { mobLevel, START } from '../src/world';
import { cast } from '../src/skills';
import { game, player } from '../src/state';
import type { Mob } from '../src/types';

describe('balance', () => {
  it('a Lv.1 Garden Snail takes 4-11 Double Shots on average', () => {
    let shots = 0;
    for (let run = 0; run < 3; run++) {
      arena();
      const snail = dummy(140, MOB_TYPES[0].hp);
      for (let i = 0; i < 20 && game.mobs.includes(snail); i++) {
        player.cd.z = 0;
        player.casting.useT = 0;
        tap('z');
        step(8);
        shots++;
      }
    }
    const average = shots / 3;
    expect(average).toBeGreaterThanOrEqual(4);
    expect(average).toBeLessThanOrEqual(11);
  });
});

describe('regen', () => {
  it('restores HP and MP once every 5 seconds', () => {
    arena();
    player.hp = 50;
    player.mp = 10;
    player.regenT = 0;
    step(Math.round(4.9 / P.STEP));
    expect(player.hp).toBe(50);

    step(Math.round(0.2 / P.STEP));
    expect(player.hp).toBeGreaterThan(50);
    expect(player.mp).toBeGreaterThan(10);
  });

  it('restores no HP within 5 seconds of attacking', () => {
    arena();
    player.hp = 50;
    player.regenT = 0;
    step(Math.round(5.1 / P.STEP)); // a regen tick has just happened...
    const hp = player.hp;
    cast('z'); // ...then attack: the next tick, 5s on, is inside the combat window
    step(Math.round(5.1 / P.STEP));
    expect(player.hp).toBe(hp);
  });

  it('stops while the pause menu is open', () => {
    arena();
    player.hp = 50;
    game.pause = { col: 0, row: 0 };
    const timer = player.regenT;
    step(30);
    expect(player.regenT).toBe(timer);
    game.pause = null;
  });
});

describe('misses', () => {
  /** Make every random roll come out as `r` (0 to 1) until the test ends. */
  const rollsAre = (r: number): void => { vi.spyOn(Math, 'random').mockReturnValue(r); };
  afterEach(() => { vi.restoreAllMocks(); });

  it('are 10% per level the target is above the attacker, capped at 75%', () => {
    expect(missChance(10, 10)).toBe(0);
    expect(missChance(10, 11)).toBe(0.1);
    expect(missChance(10, 12)).toBe(0.2);
    expect(missChance(10, 8)).toBe(0); // being above the target never misses
    expect(missChance(1, 100)).toBe(0.75);
  });

  it('apply to your shots', () => {
    arena(10);
    const m = dummy(140);
    /** Shoot once with rolls of `r`: did it land? */
    const lands = (r: number): boolean => {
      m.hp = 1e6;
      rollsAre(r);
      damage(m, 1);
      vi.restoreAllMocks();
      return m.hp < 1e6;
    };

    m.level = 10;
    expect(lands(0.99)).toBe(true); // an even match always lands

    m.level = 12; // two above: a 20% miss
    expect(lands(0.15)).toBe(false);
    expect(lands(0.25)).toBe(true);

    m.level = 40; // capped at 75%
    expect(lands(0.7)).toBe(false);
    expect(lands(0.8)).toBe(true);
  });

  it('still wake the enemy up', () => {
    arena(10);
    const m = dummy(140);
    m.level = 40;
    rollsAre(0.01);
    damage(m, 1);
    expect(m.hp).toBe(1e6);
    expect(m.aggro).toBe(true);
  });

  it('apply to enemies touching you, and a miss gives you quiet i-frames', () => {
    arena(20);
    player.invuln = 0;
    rollsAre(0.05);
    expect(hurtPlayer(10, 0, 18)).toBe(false); // two levels below you: a 20% miss
    expect(player.hp).toBe(player.hpMax);
    expect(player.invuln).toBeGreaterThan(0.9);
    expect(player.invulnQuiet).toBe(true); // no flashing
    expect(hurtPlayer(10, 0, 18)).toBe(false); // still invulnerable
  });

  it('let a hit land when the roll clears it, flashing', () => {
    arena(20);
    player.invuln = 0;
    rollsAre(0.9);
    expect(hurtPlayer(10, 0, 18)).toBe(true);
    expect(player.hp).toBe(player.hpMax - 10);
    expect(player.invulnQuiet).toBe(false);
  });

  it('never happen when the enemy is above your level', () => {
    arena(20);
    player.invuln = 0;
    rollsAre(0.01);
    expect(hurtPlayer(10, 0, 22)).toBe(true);
    expect(player.hp).toBe(player.hpMax - 10);
  });
});

describe('knockback', () => {
  it('tops your speed up to its own, no further', () => {
    expect(capAdd(50, P.HIT_PUSH)).toBe(P.HIT_PUSH);
    expect(capAdd(0, P.HIT_PUSH)).toBe(P.HIT_PUSH);
  });

  it('adds nothing if you are already going faster that way', () => {
    expect(capAdd(200, P.HIT_PUSH)).toBe(200);
    expect(capAdd(-200, -P.HIT_HOP)).toBe(-200);
  });

  it('still pushes against your momentum', () => {
    expect(capAdd(-50, P.HIT_PUSH)).toBe(P.HIT_PUSH - 50);
  });

  it('a hit from behind while running fast keeps your run speed', () => {
    arena(30);
    clearGear();
    player.invuln = 0;
    player.vx = 300;
    player.vy = 0;
    hurtPlayer(1, player.x - 20, 200);
    expect(player.vx).toBe(300);
    expect(player.vy).toBe(-P.HIT_HOP);
  });
});

describe('Bubble (passive)', () => {
  function damageTaken(): number {
    player.invuln = 0;
    player.hp = player.hpMax;
    hurtPlayer(100, undefined, 200);
    return player.hpMax - player.hp;
  }

  it('takes a flat 30% off each hit', () => {
    arena(30);
    clearGear();
    player.ranks.bu = false;
    expect(damageTaken()).toBe(100);
    player.ranks.bu = true;
    expect(damageTaken()).toBe(70);
  });
});

describe('damage numbers', () => {
  // multi-hit damage numbers stack, one every NUM_GAP (1/8 s)
  function hitFourTimes(): Mob {
    arena(10);
    const m = dummy(150);
    game.dmgNums.length = 0;
    for (let i = 0; i < 4; i++) damage(m, 1, { more: i < 3 });
    return m;
  }

  it('hits landing at once: each number waits 1/8 s after the last', () => {
    hitFourTimes();
    expect(NUM_GAP).toBe(0.125);
    const delays = game.dmgNums.map((d) => d.delay ?? 0);
    for (let i = 0; i < 4; i++) expect(delays[i]).toBeCloseTo(i * NUM_GAP, 3);
  });

  it('...and sits one line above the last', () => {
    hitFourTimes();
    const nums = game.dmgNums;
    for (let i = 0; i < 4; i++) expect(nums[0].y - nums[i].y).toBeCloseTo(i * NUM_LINE, 9);
  });

  it('the second number shows after about 1/8 s, while the later ones still wait', () => {
    hitFourTimes();
    step(Math.ceil(0.15 / P.STEP));
    expect(game.dmgNums[1].delay ?? 0).toBeLessThanOrEqual(0);
    expect(game.dmgNums[2].delay ?? 0).toBeGreaterThan(0);
  });

  it('after a pause, a new stack starts at the bottom, right away', () => {
    const m = hitFourTimes();
    step(Math.ceil(0.15 / P.STEP) + 120);
    game.dmgNums.length = 0;
    damage(m, 1);
    expect(game.dmgNums[0].delay).toBe(0);
    expect(game.dmgNums[0].y).toBe(m.y - 8);
  });

  describe('a long stack', () => {
    // each cast owns its stack, and stacks have no height cap
    function twelveHitsThenANewCast(): Mob {
      arena(10);
      const m = dummy(150);
      game.dmgNums.length = 0;
      player.face = 1;
      for (let i = 0; i < 12; i++) damage(m, 1, { more: true, first: i === 0 });
      damage(m, 1, { more: true, first: true });
      return m;
    }

    it('climbs past 8 lines', () => {
      const m = twelveHitsThenANewCast();
      const top = game.dmgNums[11];
      expect(m.y - 8 - top.y).toBeCloseTo(11 * NUM_LINE, 9);
    });

    it('a new cast starts its own stack at the bottom, right away, while the last is still open', () => {
      const m = twelveHitsThenANewCast();
      const fresh = game.dmgNums[12];
      expect(fresh.y).toBe(m.y - 8);
      expect(fresh.delay).toBe(0);
    });

    it('numbers wobble within 4px, and lean 2px a line the way you face', () => {
      const m = twelveHitsThenANewCast();
      const wobble = game.dmgNums.slice(0, 12).map((d, line) => d.x - m.x - line * 2);
      for (const w of wobble) expect(Math.abs(w)).toBeLessThanOrEqual(4);
      expect(new Set(wobble.map((w) => w.toFixed(2))).size).toBeGreaterThan(1);
    });
  });
});

describe('getting hit (bumps you up and back, away from the enemy)', () => {
  function touchAnEnemy(): { x: number; hp: number } {
    arena(1, 120);
    player.invuln = 0;
    const m = dummy(player.x + 8);
    m.dmg = 1;
    m.atkCd = 0;
    m.aggro = true;
    const before = { x: player.x, hp: player.hp };
    step(1);
    return before;
  }
  afterEach(() => {
    game.mobs.length = 0;
    player.invuln = 999;
  });

  it('touching an enemy hurts you, and bumps you up and back', () => {
    const before = touchAnEnemy();
    expect(player.hp).toBeLessThan(before.hp);
    expect(player.onGround).toBe(false);
    expect(player.vy).toBeLessThan(0);
    expect(player.vx).toBeLessThan(0); // away from the enemy, on your right
  });

  it('it is only a little bump: you land a little way back', () => {
    const before = touchAnEnemy();
    let peak = 0;
    for (let i = 0; i < 30 && !player.onGround; i++) {
      step(1);
      peak = Math.max(peak, ground().y - (player.y + player.h));
    }
    expect(player.onGround).toBe(true);
    expect(peak).toBeGreaterThan(3);
    expect(peak).toBeLessThan(16);
    expect(before.x - player.x).toBeGreaterThan(8);
    expect(before.x - player.x).toBeLessThan(50);
  });

  it('hit from behind, you are pushed the other way', () => {
    arena(1, 120);
    player.invuln = 0;
    hurtPlayer(1, player.x - 10, player.level);
    expect(player.vx).toBeGreaterThan(0);
  });

  it('a hit from no particular place (a status tick) does not move you', () => {
    arena(1, 120);
    player.invuln = 0;
    hurtPlayer(1);
    expect(player.vx).toBe(0);
    expect(player.onGround).toBe(true);
  });
});

describe('damage growth (both sides scale 1.5x faster per level than they did)', () => {
  /** A Garden Snail spawned where you are; returns its damage. */
  function snailDamage(): number {
    game.mobs.length = 0;
    spawnMob({ x: 100, y: ground().y, types: ['Garden Snail'] } as never, MOB_TYPES[0]);
    return game.mobs[0].dmg;
  }
  afterEach(() => gotoPlace(START));

  it('a Lv.1 archer starts at 14 attack, and gains 2.55 a level', () => {
    arena(1);
    expect(player.war).toBeCloseTo(14, 9);
    arena(21);
    expect(player.war).toBeCloseTo(14 + 20 * 2.55, 9);
  });

  it('a Lv.1 enemy hits for 50-100% of its base damage', () => {
    arena(1);
    const max = LV_1_DMG * (MOB_TYPES[0].dmg / 3);
    const dmg = snailDamage();
    expect(dmg).toBeGreaterThanOrEqual(Math.round(max * 0.5));
    expect(dmg).toBeLessThanOrEqual(Math.round(max));
  });

  it('a high-floor enemy hits for 50-100% of its level\'s damage', () => {
    arena(1);
    gotoPlace({ path: 'meadows', floor: 11 });
    const growth = (LV_100_DMG / LV_1_DMG) ** ((mobLevel(game.floor.place) - 1) / LEVEL_SPAN);
    const max = LV_1_DMG * growth * (MOB_TYPES[0].dmg / 3);
    const dmg = snailDamage();
    expect(dmg).toBeGreaterThanOrEqual(Math.round(max * 0.5));
    expect(dmg).toBeLessThanOrEqual(Math.round(max));
  });
});

describe('LUK (2% crit chance a point, capped at 100%, the rest goes to crit damage)', () => {
  beforeEach(() => {
    arena(20);
    player.ranks.sa = false; // no Precision: the 15% base alone
    player.stats.luk = 0;
    recalcStats();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    player.stats.luk = 0;
    recalcStats();
  });

  it('crits start at 15%, and each point adds 2%', () => {
    expect(critChance()).toBeCloseTo(0.15, 9);
    player.stats.luk = 10;
    expect(critChance()).toBeCloseTo(0.35, 9);
  });

  it('the base 15% counts toward the cap, so 43 points fills it', () => {
    player.stats.luk = 43;
    expect(critChance()).toBe(1);
  });

  it('points past the cap add 2% crit damage each', () => {
    player.stats.luk = 48;
    expect(critOverflowPoints()).toBe(5);
    expect(critMult()).toBeCloseTo(1.5 + 5 * 0.02, 9);
  });

  it('a crit lands that multiplier: 60 LUK is 17 past the cap, so 1.5 + 17 x 2% = 1.84', () => {
    const m = dummy(140);
    m.level = 20;
    // the same roll for both hits: under 15% it is no crit at 0 LUK; at 60 LUK every hit crits
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    player.stats.luk = 0;
    damage(m, 1);
    const plain = 1e6 - m.hp;
    player.stats.luk = 60;
    m.hp = 1e6;
    damage(m, 1);
    const crit = 1e6 - m.hp;
    expect(crit / plain).toBeGreaterThan(1.84 * 0.99);
    expect(crit / plain).toBeLessThan(1.84 * 1.01);
  });
});

describe('a miss against you', () => {
  afterEach(() => vi.restoreAllMocks());

  function missAHighLevelEnemy(): void {
    arena(20);
    player.invuln = 0;
    player.invulnQuiet = false;
    game.dmgNums.length = 0;
    const m = dummy(140);
    m.level = 35; // 15 levels above you: a sure miss
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    damage(m, 1);
  }

  it('shows a floating MISS, as a stacked damage number', () => {
    missAHighLevelEnemy();
    expect(game.dmgNums.length).toBe(1);
    expect(game.dmgNums[0].txt).toBe('MISS');
    expect(game.dmgNums[0].col).toBe('#ffb347');
    expect(game.dmgNums[0].vy).toBe(-12);
  });

  it('grants a few i-frames without the flashing sprite, ticking down like a hit\'s', () => {
    missAHighLevelEnemy();
    expect(player.invuln).toBeGreaterThan(0);
    expect(player.invuln).toBeLessThanOrEqual(MISS_IFRAMES);
    expect(player.invulnQuiet).toBe(true);
    step(1);
    expect(player.invuln).toBeLessThan(MISS_IFRAMES);
  });
});
