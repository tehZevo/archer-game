import { describe, expect, it } from 'vitest';
import { arena } from './helpers';
import { SKILLS } from '../src/config';
import { activeSkill, rank, shotCount, skillRows, spendSkill } from '../src/progress';
import { player } from '../src/state';

describe('skill upgrades', () => {
  it('are offered only once their base skill is learned', () => {
    arena(30);
    player.sp = 1;
    player.ranks.z = false;
    expect(skillRows().some((r) => r.key === 's')).toBe(false);

    player.ranks.z = true;
    const row = skillRows().find((r) => r.key === 's');
    expect(row?.action).toMatch(/^Upgrade/);
  });

  it('take one SP, and replace the base skill on its key', () => {
    arena(30);
    player.ranks.z = true;
    player.sp = 1;
    expect(spendSkill('s')).toBe(true); // Double Shot -> Bolt Flurry
    expect(player.ranks.s).toBe(true);
    expect(player.sp).toBe(0);
    expect(activeSkill('z').key).toBe('s');
  });

  it('never offer ranks in movement skills', () => {
    arena(30);
    player.sp = 1;
    expect(skillRows().some((r) => r.key === 'd' && r.action)).toBe(false);
  });
});

describe('the skill tree', () => {
  /** The skill screen's row for a skill. */
  const row = (key: string) => skillRows().find((r) => r.key === key);

  it('shows each air form on the key it is used with', () => {
    arena(60);
    player.ranks['ground-q'] = true;
    player.ranks['ground-w'] = true;
    player.ranks['ground-e'] = true;
    expect(row('air-q')?.slot).toBe('ground-q'); // Meteor Dive on Q
    expect(row('air-w')?.slot).toBe('ground-w'); // Cyclone Sweep on W
    expect(row('air-e')?.slot).toBe('ground-e'); // Downpour on E
  });

  it('locks Meteor Dive until Rush Toss is mastered', () => {
    arena(60);
    player.ranks['ground-q'] = false;
    expect(row('air-q')?.action).toBe('');
    expect(row('air-q')?.need).toContain('Rush Toss');

    player.ranks['ground-q'] = true;
    expect(row('air-q')?.action).toMatch(/^Learn/);
  });

  it('locks Cyclone Sweep until Skyward Assault is mastered', () => {
    arena(60);
    player.ranks['ground-w'] = true;
    player.ranks.ab = false;
    expect(row('air-w')?.action).toBe('');
    expect(row('air-w')?.need).toContain('Skyward Assault');

    player.ranks.ab = true;
    expect(row('air-w')?.action).toMatch(/^Learn/);
  });

  it('offers Bolt Flurry as the one upgrade on Z, and none of the retired ones', () => {
    arena(30);
    player.ranks.z = true;
    player.sp = 2;
    const offered = skillRows().map((r) => r.key);
    expect(offered).toContain('s');
    expect(offered).not.toContain('RA');

    spendSkill('s');
    expect(activeSkill('z').key).toBe('s');
    expect(skillRows().filter((r) => r.slot === 'z' && r.key !== 'z')).toHaveLength(1);
  });

  it('offers Skyward Assault as the upgrade on W', () => {
    arena(15);
    player.ranks['ground-w'] = true;
    player.ranks.ab = true;
    expect(activeSkill('ground-w').key).toBe('ab');
  });
});

describe('Twin Echoes (passive)', () => {
  it('unlocks at Lv.30', () => {
    expect(SKILLS.es.minLevel).toBe(30);
    expect(SKILLS.es.passive).toBe(true);
  });

  it('doubles the arrows every attack fires, Double Shot and Downpour alike', () => {
    arena(20);
    player.ranks.z = true;
    expect(shotCount(rank('z'))).toBe(2);

    player.ranks.es = true;
    expect(shotCount(rank('z'))).toBe(4);
    expect(shotCount(rank('air-e'))).toBe(4);
  });
});
