import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { arena, climb, dummy, ground, release, step } from './helpers';
import { damage } from '../src/combat';
import { P } from '../src/config';
import { setKey } from '../src/input';
import { game, gotoPlace, player } from '../src/state';
import { applyStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus } from '../src/status';

describe('status effects', () => {
  beforeEach(() => {
    arena();
    player.invuln = 0;
    player.hp = player.hpMax = 1000;
  });
  afterEach(() => {
    player.effects.length = 0;
    game.mobs = [];
    release();
  });

  describe('poison', () => {
    it('a second dose adds a stack', () => {
      applyStatus(player, 'poison');
      applyStatus(player, 'poison');
      expect(player.effects.length).toBe(1);
      expect(player.effects[0].stacks).toBe(2);
    });

    it('ticks each second, harder for each stack', () => {
      for (let i = 0; i < MAX_STACKS; i++) applyStatus(player, 'poison');
      updateStatus(player, 1.01);
      expect(1000 - player.hp).toBe(Math.round(1000 * DOT.poison.player * MAX_STACKS));
    });

    it('never takes you below 1 HP', () => {
      applyStatus(player, 'poison');
      player.hp = 2;
      updateStatus(player, 1.01);
      expect(player.hp).toBe(1);
    });

    it('wears off', () => {
      applyStatus(player, 'poison');
      updateStatus(player, STATUS.poison.dur + 1.01);
      expect(player.effects.length).toBe(0);
    });
  });

  describe('chill', () => {
    function walkSpeedAfterHalfASecond(): number {
      player.x = 100;
      player.vx = 0;
      player.y = ground().y - player.h;
      player.onGround = true;
      setKey('right', true);
      step(30);
      release();
      return player.vx;
    }

    it('slows you down', () => {
      applyStatus(player, 'chill');
      expect(slowFactor(player)).toBe(CHILL_SLOW);
    });

    it('a chilled walk is slower', () => {
      const free = walkSpeedAfterHalfASecond();
      applyStatus(player, 'chill');
      const chilled = walkSpeedAfterHalfASecond();
      expect(chilled).toBeGreaterThan(0);
      expect(chilled).toBeLessThan(free * 0.9);
    });
  });

  it('burn hurts an enemy each second, and can finish it', () => {
    const m = dummy(200, 30);
    applyStatus(m, 'burn');
    player.war = 100;
    game.mobs = [m];
    step(Math.ceil(1.05 / P.STEP));
    expect(game.mobs).not.toContain(m);
  });

  it('your hits don\'t inflict the area\'s element (enemies\' contact hits do)', () => {
    gotoPlace({ path: 'swamp', floor: 1 });
    game.mobs = [];
    game.floor.spawns = [];
    const m = dummy(200);
    for (let i = 0; i < 40; i++) damage(m, 0.01);
    expect(m.effects?.length ?? 0).toBe(0);
  });

  it('your effects clear on a new floor', () => {
    applyStatus(player, 'burn');
    gotoPlace(climb(1));
    expect(player.effects.length).toBe(0);
  });
});
