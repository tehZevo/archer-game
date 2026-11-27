import { afterEach, describe, expect, it, vi } from 'vitest';
import { arena, dummy, step, tap } from './helpers';
import { MOB_TYPES, P } from '../src/config';
import { capAdd, hurtPlayer } from '../src/boss';
import { clearGear } from '../src/gear';
import { damage, missChance } from '../src/combat';
import { cast } from '../src/skills';
import { game, player } from '../src/state';

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
