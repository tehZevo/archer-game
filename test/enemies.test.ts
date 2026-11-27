import { describe, expect, it } from 'vitest';
import { arena, climb, dummy, ground, release, step } from './helpers';
import { game, gotoPlace, player } from '../src/state';
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
