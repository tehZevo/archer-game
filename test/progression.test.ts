import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arena, climb, dummy, ground, memoryStorage, step, tap } from './helpers';
import { MOB_TYPES, P } from '../src/config';
import { confirmUi } from '../src/confirm';
import { visitSage } from '../src/sage';
import { skillStatus } from '../src/skillscreen';
import { hurtPlayer } from '../src/boss';
import { killMob } from '../src/combat';
import { bag, BAG_SIZE, clearGear, equip, gear, gearDmg, gearDrops, gearFor, gearSoak, unequip, wear } from '../src/gear';
import { apply, clearSave, hasSave, load, save, snapshot } from '../src/save';
import { gainExp, game, gotoPlace, player, spawnMob } from '../src/state';
import { lastTown, samePlace, START } from '../src/world';
import type { Mob } from '../src/types';
import { activeSkill, advanceJob, canAdvance, JOBS, nextJob, recalcStats, STAT_GAIN, mobExp, rank, shotCount, skillRows, spendSkill, STAT_KEYS } from '../src/progress';

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


  it('locks Talon Dive until Rush Toss is mastered', () => {
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

  it('doubles the arrows every attack fires, Double Shot and Ember Rain alike', () => {
    arena(20);
    player.ranks.z = true;
    expect(shotCount(rank('z'))).toBe(2);

    player.ranks.es = true;
    expect(shotCount(rank('z'))).toBe(4);
    expect(shotCount(rank('air-e'))).toBe(4);
  });
});

describe('equipment', () => {
  beforeEach(() => {
    arena(10);
    player.ranks.z = true;
    clearGear();
  });

  it('starts empty, and an empty slot changes nothing', () => {
    expect(gear.weapon).toBeNull();
    expect(gear.armor).toBeNull();
    expect(gearDmg()).toBe(1);
    expect(gearSoak()).toBe(0);
  });


  it('a Lv.10 bow adds 30% to every arrow that lands', () => {
    expect(equip(gearFor('weapon', 10))).toBe(true);
    expect(gearDmg()).toBeCloseTo(1.3, 3);

    const plainDamage = player.war;
    dummy(140);
    game.dmgNums.length = 0;
    tap('z');
    step(12);
    const hit = game.dmgNums[game.dmgNums.length - 1];
    expect(hit.v).toBeGreaterThan(plainDamage * 1.29);
  });

  it('a weaker piece goes in the bag; a stronger one goes on, putting the old one in the bag', () => {
    equip(gearFor('weapon', 10));
    expect(equip(gearFor('weapon', 4))).toBe(true);
    expect(gear.weapon?.lvl).toBe(10);
    expect(bag.map((i) => i.lvl)).toEqual([4]);

    expect(equip(gearFor('weapon', 20))).toBe(true);
    expect(gear.weapon?.lvl).toBe(20);
    expect(bag.map((i) => i.lvl)).toEqual([4, 10]);
  });

  it('wearing a spare swaps it with what you had on; taking a piece off bags it', () => {
    equip(gearFor('weapon', 10));
    equip(gearFor('weapon', 20)); // bag: [Lv.10]
    expect(wear(0)).toBe(true);
    expect(gear.weapon?.lvl).toBe(10);
    expect(bag.map((i) => i.lvl)).toEqual([20]);

    expect(unequip('weapon')).toBe(true);
    expect(gear.weapon).toBeNull();
    expect(bag).toHaveLength(2);
  });

  it('with the bag full, a lesser piece is left where it lies, but an upgrade still goes on', () => {
    equip(gearFor('weapon', 20));
    equip(gearFor('armor', 2));
    while (bag.length < BAG_SIZE) bag.push(gearFor('armor', 1));
    expect(equip(gearFor('weapon', 3))).toBe(false);
    expect(bag).toHaveLength(BAG_SIZE);

    expect(equip(gearFor('weapon', 25))).toBe(true);
    expect(gear.weapon?.lvl).toBe(25);
  });

  it('in the Esc menu, Z on a spare puts it on and X throws it away', () => {
    equip(gearFor('weapon', 20));
    equip(gearFor('weapon', 7)); // into the bag
    tap('escape');
    game.pause!.col = 0;
    game.pause!.row = STAT_KEYS.length + 2; // the bag sits under the stats

    tap('z');
    expect(gear.weapon?.lvl).toBe(7);
    expect(bag[0]?.lvl).toBe(20);

    tap('x');
    expect(bag).toHaveLength(0);
    expect(gear.weapon?.lvl).toBe(7);
    expect(game.pause).toBeTruthy();
    tap('escape');
  });

  it('armor soaks a share of each hit', () => {
    expect(equip(gearFor('armor', 30))).toBe(true);
    expect(gearSoak()).toBe(0.35);
    player.invuln = 0;
    hurtPlayer(100, undefined, player.level);
    expect(player.hp).toBe(player.hpMax - 65);
  });

  describe('drops', () => {
    /** Kill the same enemy over and over until it leaves gear behind. */
    function killUntilGearDrops(): Mob {
      step(1); // one frame on this floor first: gear left from an earlier floor is cleared on the first frame
      const m = dummy(100);
      for (let i = 0; i < 80 && gearDrops.length === 0; i++) {
        m.dead = false;
        killMob(m);
        m.hp = 1e6;
      }
      return m;
    }

    it('an enemy can leave gear of its level where it fell', () => {
      const m = killUntilGearDrops();
      expect(gearDrops.length).toBeGreaterThan(0);
      expect(gearDrops[0].item.lvl).toBe(m.level);
    });

    it('walking over it leaves it lying; X picks it up', () => {
      killUntilGearDrops();
      const drop = gearDrops[0];
      player.x = drop.x;
      player.y = drop.y - player.h;
      player.onGround = true;
      step(1);
      expect(gear[drop.item.kind]).toBeNull();

      tap('x');
      expect(gear[drop.item.kind]).not.toBeNull();
      expect(gearDrops).toHaveLength(0);
    });

    it('gear left lying is gone once you leave the floor', () => {
      killUntilGearDrops();
      expect(gearDrops.length).toBeGreaterThan(0);
      gotoPlace(climb(3));
      step(1);
      expect(gearDrops).toHaveLength(0);
    });
  });

  describe('saving', () => {
    beforeEach(() => { vi.stubGlobal('localStorage', memoryStorage()); });
    afterEach(() => {
      clearSave();
      clearGear();
      vi.unstubAllGlobals();
    });

    it('your gear and your bag survive a reload', () => {
      equip(gearFor('weapon', 20));
      equip(gearFor('armor', 34));
      equip(gearFor('weapon', 7));
      save();
      clearGear();
      load();
      expect(gear.weapon?.name).toBe(gearFor('weapon', 20).name);
      expect(gear.armor?.lvl).toBe(34);
      expect(bag).toEqual([gearFor('weapon', 7)]);
    });
  });
});

describe('saving and loading', () => {
  beforeEach(() => { vi.stubGlobal('localStorage', memoryStorage()); });
  afterEach(() => {
    clearSave();
    vi.unstubAllGlobals();
  });

  it('a save keeps your level, EXP, points, stats, skill ranks and town', () => {
    arena(35);
    gotoPlace({ town: 'mossgate' });
    player.exp = 123;
    player.ap = 7;
    player.sp = 2;
    player.stats.dex = 9;
    player.ranks.z = true;
    player.ranks['ground-w'] = true;
    player.ranks['ground-e'] = true;
    save();
    const saved = JSON.stringify(snapshot());

    arena(1);
    player.ap = 0;
    player.sp = 0;
    player.ranks['ground-w'] = false;
    player.ranks['ground-e'] = false;
    const place = load();
    expect(samePlace(place, { town: 'mossgate' })).toBe(true);
    // (after arena(1) the current town differs, so compare as if you were in Mossgate)
    expect(JSON.stringify({ ...snapshot(), town: 'mossgate' })).toBe(saved);
  });

  it('you resume in the latest town: the town itself, or the start of the path you were on', () => {
    expect(lastTown({ town: 'mossgate' })).toBe('mossgate');
    expect(lastTown({ path: 'meadows', floor: 5 })).toBe('driftwood');
    expect(lastTown({ path: 'shore', floor: 2 })).toBe('saltwick');
  });

  it('a save made on a path resumes in the town the path starts from', () => {
    arena(1);
    gotoPlace({ path: 'meadows', floor: 3 });
    save();
    gotoPlace(START);
    expect(samePlace(load(), { town: 'driftwood' })).toBe(true);
  });

  it('a save in a town gone from the map resumes at the start', () => {
    arena(1);
    localStorage.setItem('archer-game:save', JSON.stringify({ ...snapshot(), town: 'atlantis' }));
    expect(samePlace(load(), START)).toBe(true);
  });

  it('loading works out your derived stats again', () => {
    arena(35);
    save();
    arena(1);
    load();
    expect(player.hp).toBe(player.hpMax);
    expect(player.war).toBeGreaterThan(14 + 33);
  });

  it('a corrupt save is ignored', () => {
    expect(apply('junk')).toBe(null);
  });

  it('an older save is upgraded and keeps its progress', () => {
    const old = { v: 2, level: 50, exp: 10, ap: 3, sp: 2, stats: { dex: 9 }, ranks: { Z: 1 }, town: 'mossgate' };
    expect(apply(old)).not.toBe(null);
    expect(player.level).toBe(50);
    expect(player.ap).toBe(3);
    expect(player.ranks.z).toBe(true);
  });

  it('out-of-range values are clamped', () => {
    apply({ v: 4, level: 1e9, exp: -5, ap: 'x', sp: 3, stats: { dex: -2 }, ranks: { Z: 99, RA: 1, EB: 1 }, town: 0 });
    expect(player.level).toBe(100);
    expect(player.exp).toBe(0);
    expect(player.ap).toBe(0);
    expect(player.stats.dex).toBe(0);
    expect(player.ranks.z).toBe(true);
    expect(player.ranks.eb).toBeTruthy();
  });

  it('a reset forgets the save', () => {
    arena(1);
    save();
    clearSave();
    expect(hasSave()).toBe(false);
    expect(samePlace(load(), START)).toBe(true);
  });
});

describe('enemy levels and EXP', () => {
  function snailExp(floor: number, playerLevel: number): number {
    arena(playerLevel);
    gotoPlace(climb(floor));
    game.mobs = [];
    spawnMob({ x: 100, y: ground().y, types: ['Garden Snail'] } as never, MOB_TYPES[0]);
    return game.mobs[0].exp;
  }
  it('an enemy\'s EXP comes from its floor, not your level', () => {
    expect(snailExp(3, 1)).toBe(snailExp(3, 40));
  });

  it('enemies on higher floors are worth more', () => {
    expect(snailExp(8, 5)).toBeGreaterThan(snailExp(2, 5));
  });

  it('higher-level enemies are worth more, and an enemy\'s EXP multiplier scales its reward', () => {
    expect(mobExp(20)).toBeGreaterThan(mobExp(10));
    expect(Math.abs(mobExp(5, 10) - mobExp(5) * 10)).toBeLessThanOrEqual(10);
  });

  it('a spawned enemy has its floor\'s level and HP, whatever your level', () => {
    arena(1);
    gotoPlace(climb(3)); // Beach 2
    spawnMob(game.floor.spawns[0], MOB_TYPES[0]);
    const first = game.mobs[game.mobs.length - 1];
    expect(first.level).toBe(2);
    expect(first.exp).toBe(mobExp(2));

    player.level = 40;
    spawnMob(game.floor.spawns[0], MOB_TYPES[0]);
    expect(game.mobs[game.mobs.length - 1].hpMax).toBe(first.hpMax);
  });

});

describe('stats', () => {
  it('attack grows with level', () => {
    arena(1);
    const lv1 = player.war;
    arena(40);
    expect(player.war).toBeGreaterThan(lv1 * 3);
  });

  it('each DEX point is +3% attack, at any level', () => {
    arena(40);
    const base = player.war;
    player.stats.dex = 10;
    recalcStats();
    expect(STAT_GAIN.dex).toBe(0.03);
    expect(player.war / base).toBeCloseTo(1 + 10 * 0.03, 9);
  });

  it('each VIT point is +5% max HP', () => {
    arena(1);
    const base = player.hpMax;
    player.stats.vit = 1;
    recalcStats();
    expect(player.hpMax).toBe(Math.round(base * 1.05));
  });
});

describe('jobs and the Sage', () => {
  /** A 1st-job archer at the given level. */
  function archerAt(level: number): void {
    arena(level);
    player.job = JOBS[0];
    recalcStats();
  }

  it('below Lv.10 the Sage sends you away, and 2nd job skills wait for the level', () => {
    archerAt(9);
    visitSage();
    expect(confirmUi.open).toBe(false);
    expect(player.job.job).toBe(1);
    player.ranks.ni = false;
    expect(skillStatus('ni').label).toBe('AT LV.10');
  });

  it('at Lv.10, 2nd job skills say to see the Sage, and he offers the 2nd job', () => {
    archerAt(10);
    player.ranks.ni = false;
    expect(skillStatus('ni').label).toBe('SEE THE SAGE');
    visitSage();
    expect(confirmUi.open).toBe(true);
    expect(confirmUi.yes).toBe(true);
  });

  it('taking the 2nd job unlocks its skills and adds 5% HP and MP', () => {
    archerAt(10);
    player.ranks.ni = false;
    const hp = player.hpMax, mp = player.mpMax;
    visitSage();
    confirmUi.open = false;
    confirmUi.onYes();
    expect(player.job.job).toBe(2);
    expect(player.hpMax).toBe(Math.round(hp * 1.05));
    expect(player.mpMax).toBe(Math.round(mp * 1.05));
    expect(skillStatus('ni').label).not.toBe('SEE THE SAGE');
  });



  it('by the 4th job the bonus is +30% in all, and there is no job after it', () => {
    archerAt(60);
    advanceJob();
    advanceJob();
    advanceJob();
    expect(player.job.job).toBe(4);
    expect(player.job.hpmp).toBe(0.3);
    expect(nextJob()).toBeFalsy();
    expect(canAdvance()).toBe(false);
  });

  describe('saved jobs', () => {
    function fourthJobSave(): ReturnType<typeof snapshot> {
      archerAt(60);
      advanceJob();
      advanceJob();
      advanceJob();
      const saved = snapshot();
      archerAt(60);
      return saved;
    }

    it('your job is saved', () => {
      apply(fourthJobSave());
      expect(player.job.job).toBe(4);
    });

    it('a saved job never runs ahead of its level', () => {
      apply({ ...fourthJobSave(), job: 4, level: 20 });
      expect(player.job.job).toBe(2);
    });

    it('a save without a job starts at the 1st', () => {
      apply({ ...fourthJobSave(), job: undefined });
      expect(player.job.job).toBe(1);
    });
  });
});
