import { describe, expect, it } from 'vitest';
import { arena, dummy, step, tap } from './helpers';
import { P, SKILLS } from '../src/config';
import { cast } from '../src/skills';
import { player } from '../src/state';
import type { SkillDef, SkillKey } from '../src/types';

// The kit's authored numbers and its link grammar, as tables: one edit to the
// config shows up as one failing row. How each skill behaves is tested with
// that skill; this file is a snapshot of the whole kit.

describe('every active skill\'s authored numbers', () => {
  const KIT: [SkillKey, Partial<SkillDef>][] = [
    ['z', { use: 0.2, delay: 0.4, cd: 0, mp1: 3, dmg1: 120, hits1: 2, targets1: 4 }],
    ['s', { use: 0.2, delay: 0.4, cd: 0, mp1: 6, dmg1: 220, hits1: 4, targets1: 6 }],
    ['d', { use: 0.2, delay: 0.1, cd: 0, mp1: 2, dmg1: 0 }],
    ['ground-q', { use: 0.6, delay: 0.35, cd: 3, mp1: 6, dmg1: 400, targets1: 6 }],
    ['eb', { use: 0.6, delay: 0.35, cd: 0, mp1: 0, dmg1: 460, hits1: 2, targets1: 10 }],
    ['ground-w', { use: 0.4, delay: 0.2, cd: 0, mp1: 5, dmg1: 110, hits1: 4, targets1: 4 }],
    ['ab', { use: 0.4, delay: 0.2, cd: 0, mp1: 6, dmg1: 140, hits1: 4, targets1: 6 }],
    ['ground-e', { use: 0.5, delay: 0.4, cd: P.SPIKE_CD, mp1: 7, dmg1: 400, hits1: 2, targets1: 4 }],
    ['air-q', { use: 1.1, cd: 0, mp1: 4, dmg1: 400, hits1: 1 }],
    ['air-w', { use: 0.6, delay: 0.4, cd: P.SPIN_CD, mp1: 5, dmg1: 200, hits1: 4, targets1: 8 }],
    ['air-e', { use: 0.4, delay: 0.2, cd: 0, mp1: 7, dmg1: 240, hits1: 2, targets1: 10 }],
    ['r', { use: 0.7, cd: 10, mp1: 14, dmg1: 300, hits1: 6, targets1: 8 }],
    ['held-z', { use: 0.1, cd: 0, mp1: 1, dmg1: 110, hits1: 2, targets1: 1 }],
  ];

  for (const [key, numbers] of KIT) {
    it(key, () => {
      // pick out just the fields this row lists
      const actual: Partial<SkillDef> = {};
      for (const field of Object.keys(numbers) as (keyof SkillDef)[]) {
        (actual as Record<string, unknown>)[field] = SKILLS[key][field];
      }
      expect(actual).toEqual(numbers);
    });
  }
});

describe('what each skill links into', () => {
  const LINKS_INTO: [SkillKey, SkillKey[]][] = [
    ['z', ['ground-q', 'eb', 'air-q']],
    ['s', ['ground-q', 'eb', 'air-q']],
    ['d', ['air-q', 'air-e', 'z', 's']],
    ['ground-q', ['ground-w', 'ab', 'eb', 'air-q', 'air-w', 'z', 's']],
    ['ground-e', ['ground-w', 'ab', 'ground-q', 'eb', 'air-q', 'air-w', 'air-e', 'd', 'z', 's']],
    ['air-q', ['ground-w', 'ab', 'ground-q', 'eb', 'air-q', 'air-w', 'd', 'ground-e', 'z', 's']],
    ['air-w', ['d', 'air-e', 'z', 's']],
    ['air-e', ['air-w', 'air-q', 'r', 'air-e', 'z', 's']],
    ['r', ['ground-q', 'eb', 'air-q', 'air-e', 'z', 's']],
    ['eb', ['ground-w', 'ab', 'ground-q', 'eb', 'air-q', 'air-w', 'z', 's']],
    ['ab', ['air-w', 'air-q', 'r', 'z', 's', 'ground-q', 'air-e']],
  ];

  for (const [key, into] of LINKS_INTO) {
    it(key, () => {
      expect(SKILLS[key].linksInto ?? []).toEqual(into);
    });
  }
});

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
