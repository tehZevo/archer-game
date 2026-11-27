import { describe, expect, it } from 'vitest';
import { arena, dummy, step, tap } from './helpers';
import { setKey } from '../src/input';
import { game, player } from '../src/state';

describe('Skyward Assault', () => {
  it('slashes up as she leaps, bangs on enemies in the air, then slashes back down', () => {
    arena(20);
    player.ranks['ground-w'] = true;
    player.ranks.ab = true;
    dummy(125);
    // launch the enemy first (Down + Q), so there's something in the air to hit
    setKey('down', true);
    tap('q');
    setKey('down', false);
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
