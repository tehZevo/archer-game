import { describe, expect, it } from 'vitest';
import { arena, dummy, step, tap } from './helpers';
import { P, SKILLS } from '../src/config';
import { cast } from '../src/skills';
import { player } from '../src/state';
import type { SkillKey } from '../src/types';

// The aerial skill forms only fire with real height under you.

describe('the aerial forms need real height (about 2/3 of a jump)', () => {
  const FORMS: [SkillKey, SkillKey, string][] = [
    ['ground-e', 'air-e', 'barrage'],
    ['ground-q', 'air-q', 'dive'],
    ['ground-w', 'air-w', 'shoot'],
  ];

  for (const [groundForm, airForm, pose] of FORMS) {
    it(`${airForm} does not fire just off the ground, but does near the top of the jump`, () => {
      arena(20);
      player.ranks[groundForm] = true;
      player.ranks[airForm] = true;
      dummy(100);
      tap('c'); // just left the ground: about 9px up
      const mp = player.mp;
      cast(groundForm);
      expect(player.cast === pose && player.mp < mp, 'fired too low').toBe(false);
      step(6); // near the top of the jump (about 35px)
      cast(groundForm);
      expect(player.cast).toBe(pose);
      expect(player.mp).toBeLessThan(mp);
    });
  }
});
