import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arena, climb, dummy, step, tap } from './helpers';
import { hurtPlayer } from '../src/boss';
import { killMob } from '../src/combat';
import { MOB_TYPES, P } from '../src/config';
import { bakeDeathSheet, DEATH_FRAMES, deathFrame } from '../src/deathsheet';
import {
  corpses, DEATH_T, deathOf, deathPose, DEATHS, getPlayerDeath, ghostRise, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop } from '../src/deaths';
import { deathUi } from '../src/deathui';
import { setKey } from '../src/input';
import { hasMobArt } from '../src/mobart';
import { gotoPlace, player } from '../src/state';
import { TOMB } from '../src/tombart';
import { windowOpen } from '../src/windows';

describe('enemy deaths', () => {
  beforeEach(() => {
    arena(1);
    corpses.length = 0;
  });

  it('a variant dies like the enemy it is a cousin of', () => {
    for (const m of MOB_TYPES.filter((t) => t.of)) expect(deathOf(m)).toBe(DEATHS[m.of!]);
  });

  it('a defeated enemy is left dying where it fell, and is gone when its death has played', () => {
    const m = dummy(140);
    killMob(m);
    expect(corpses.length).toBe(1);
    expect(corpses[0].name).toBe(m.type.n);
    expect(corpses[0].drop).toBe(0);
    step(Math.ceil(DEATH_T / P.STEP) + 1);
    expect(corpses.length).toBe(0);
  });

  it('one killed in the air falls to the ground as it dies', () => {
    const m = dummy(140);
    m.fly = true;
    m.y -= 40;
    killMob(m);
    const corpse = corpses[0];
    expect(Math.abs(corpse.drop - 40)).toBeLessThan(1);
    expect(Math.abs(deathPose(corpse, 1).dy - corpse.drop)).toBeLessThan(1);
  });

  it('deaths do not follow you to another floor', () => {
    killMob(dummy(140));
    gotoPlace(climb(3));
    step(1);
    expect(corpses.length).toBe(0);
  });

  describe('drawn death sheets (each enemy\'s own body, drawn dying)', () => {
    const names = Object.keys(DEATHS);
    const sheets = names.map((n) => bakeDeathSheet(n, DEATHS[n])!);


    it('a death\'s age picks its frame, holding the last', () => {
      expect(deathFrame(0)).toBe(0);
      expect(deathFrame(DEATH_T / 2)).toBe(DEATH_FRAMES / 2);
      expect(deathFrame(DEATH_T * 2)).toBe(DEATH_FRAMES - 1);
    });
  });
});

describe('your death (a tombstone drops in, and your ghost rises out of it)', () => {
  let enemyX = 0;

  /** Take a killing blow, then let the frame end. Returns where you fell. */
  function knockOut(): number {
    const m = dummy(140);
    enemyX = m.x;
    player.invuln = 0;
    player.hp = 1;
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // the hit lands
    hurtPlayer(500, m.x);
    vi.restoreAllMocks();
    step(1); // the frame's end starts the death animation
    return player.x; // after the hit's knockback
  }

  beforeEach(() => arena(20));
  afterEach(() => {
    deathUi.open = false;
    vi.restoreAllMocks();
    arena(1);
  });

  it('the animation starts where you fell, and you stay down while it plays', () => {
    const fell = knockOut();
    expect(player.hp).toBe(0);
    expect(getPlayerDeath()).not.toBe(null);
    expect(Math.abs(getPlayerDeath()!.x - fell)).toBeLessThan(1);
    expect(Math.abs(player.x - fell)).toBeLessThan(1);
  });


  it('while down you take no input and no hits', () => {
    const fell = knockOut();
    setKey('right', true);
    step(3);
    setKey('right', false);
    expect(Math.abs(player.x - fell)).toBeLessThan(1);
    expect(hurtPlayer(5, enemyX)).toBeFalsy();
    expect(player.hp).toBe(0);
  });


  it('then a dialog asks where to revive, with the world frozen and you still down', () => {
    knockOut();
    step(Math.ceil(PLAYER_DEATH_T / P.STEP) + 1);
    expect(deathUi.open).toBe(true);
    expect(windowOpen()).toBe(true);
    expect(player.hp).toBe(0);
  });

  it('taking the default (return to town) revives you, on your feet', () => {
    knockOut();
    step(Math.ceil(PLAYER_DEATH_T / P.STEP) + 1);
    tap('z');
    expect(player.hp).toBe(player.hpMax);
    expect(player.onGround).toBe(true);
    expect(deathUi.open).toBe(false);
  });
});

