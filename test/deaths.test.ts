import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arena, climb, dummy, step, tap } from './helpers';
import { MOB_SOUNDS } from '../src/audio';
import { hurtPlayer } from '../src/boss';
import { killMob } from '../src/combat';
import { MOB_TYPES, P } from '../src/config';
import { bakeDeathSheet, DEATH_FRAMES, deathFrame } from '../src/deathsheet';
import {
  corpses, DEATH_T, deathOf, deathPose, DEATHS, getPlayerDeath, ghostRise, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop,
} from '../src/deaths';
import { deathUi } from '../src/deathui';
import { setKey } from '../src/input';
import { hasMobArt } from '../src/mobart';
import { gotoPlace, player } from '../src/state';
import { TOMB, TOMB_PAL } from '../src/tombart';
import { windowOpen } from '../src/windows';

describe('enemy deaths', () => {
  const baseTypes = MOB_TYPES.filter((m) => !m.of);

  beforeEach(() => {
    arena(1);
    corpses.length = 0;
  });

  it('every enemy has a death of its own', () => {
    for (const m of baseTypes) expect(DEATHS[m.n], m.n).toBeTruthy();
    const looks = baseTypes.map((m) => `${DEATHS[m.n].story}/${DEATHS[m.n].bits}`);
    expect(new Set(looks).size).toBe(looks.length);
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
    it('every enemy with art, variants too, has a drawn death', () => {
      for (const m of MOB_TYPES.filter((t) => hasMobArt(t.n))) expect(bakeDeathSheet(m.n, deathOf(m)), m.n).toBeTruthy();
    });

    it('the body moves as it dies: the middle frame differs from the first', () => {
      for (const sheet of sheets) expect(sheet.frames[0].px.join()).not.toBe(sheet.frames[DEATH_FRAMES >> 1].px.join());
    });

    it('each enemy\'s death animation is its own', () => {
      const looks = sheets.map((s) => s.frames.map((f) => f.px.join()).join('|'));
      expect(new Set(looks).size).toBe(names.length);
    });

    it('the same enemy always bakes the same sheet', () => {
      expect(bakeDeathSheet(names[0], DEATHS[names[0]])!.frames[4].px.join()).toBe(sheets[0].frames[4].px.join());
    });

    it('a death\'s age picks its frame, holding the last', () => {
      expect(deathFrame(0)).toBe(0);
      expect(deathFrame(DEATH_T / 2)).toBe(DEATH_FRAMES / 2);
      expect(deathFrame(DEATH_T * 2)).toBe(DEATH_FRAMES - 1);
    });
  });

  describe('hit sounds', () => {
    it('every enemy type has its own (a variant borrows its parent\'s)', () => {
      for (const t of MOB_TYPES) expect(MOB_SOUNDS[t.of ?? t.n], t.n).toBeTruthy();
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

  it('the tombstone drops in from above before the ghost rises', () => {
    knockOut();
    step(6);
    const death = getPlayerDeath()!;
    expect(tombDrop(death)).toBeGreaterThan(0);
    expect(tombDrop(death)).toBeLessThan(1);
    expect(ghostRise(death)).toBe(0);
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

  it('the stone lands, then the ghost starts rising out of it', () => {
    knockOut();
    step(6 + Math.ceil((TOMB_DROP_T * 2) / P.STEP));
    expect(tombDrop(getPlayerDeath()!)).toBe(1);
    step(6);
    expect(ghostRise(getPlayerDeath()!)).toBeGreaterThan(0);
  });

  it('the whole animation is about a second and a half, then it clears', () => {
    expect(PLAYER_DEATH_T).toBeGreaterThan(1);
    expect(PLAYER_DEATH_T).toBeLessThan(2);
    knockOut();
    step(Math.ceil(PLAYER_DEATH_T / P.STEP) + 1);
    expect(getPlayerDeath()).toBe(null);
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

describe('the tombstone art', () => {
  const at = (x: number, y: number): string => TOMB[y]?.[x] ?? '.';

  it('is a pixel grid in its own palette', () => {
    const width = TOMB[0].length;
    for (const row of TOMB) {
      expect(row.length).toBe(width);
      for (const c of row) expect(c === '.' || c in TOMB_PAL).toBe(true);
    }
  });

  it('has a crisp outline all the way round', () => {
    const notOutlined: string[] = [];
    TOMB.forEach((row, y) => {
      [...row].forEach((c, x) => {
        const onEdge = at(x + 1, y) === '.' || at(x - 1, y) === '.' || at(x, y + 1) === '.' || at(x, y - 1) === '.';
        if (c !== '.' && onEdge && c !== 'o') notOutlined.push(`${x},${y}`);
      });
    });
    expect(notOutlined).toEqual([]);
  });
});
