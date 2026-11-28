import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { arena, release, step } from './helpers';
import { P } from '../src/config';
import { dev, devStops, maxOut } from '../src/dev';
import { clearPressed, setKey } from '../src/input';
import { roomId } from '../src/net';
import { spendSkill } from '../src/progress';
import { game, player } from '../src/state';
import { devInput } from '../src/windows';
import { isTown, nextPlace, PATHS, placeTier, samePlace, TOWNS } from '../src/world';

function press(key: string): void {
  setKey(key, true);
  step(1);
  setKey(key, false);
  step(1);
}

describe('dev mode (?dev)', () => {
  beforeEach(() => arena(1));
  afterEach(() => {
    dev.on = false;
    dev.open = false;
    release();
  });

  it('is off without ?dev, and [ and ] do nothing then', () => {
    expect(dev.on).toBe(false);
    const level = player.level, place = game.floor.place;
    press('[');
    press(']');
    expect(player.level).toBe(level);
    expect(samePlace(game.floor.place, place)).toBe(true);
  });

  it('dev rooms get their own ids', () => {
    const normal = roomId('driftwood', 1);
    dev.on = true;
    expect(roomId('driftwood', 1)).toBe(normal + '-dev');
    expect(roomId('driftwood', 0, 'ABCDE').endsWith('-dev')).toBe(true);
  });

  it('] warps up to the next place, and ` opens the dev menu', () => {
    dev.on = true;
    const place = game.floor.place;
    press(']');
    expect(samePlace(game.floor.place, nextPlace(place))).toBe(true);
    press('`');
    expect(dev.open).toBe(true);
  });

  describe('the warp list', () => {
    it('has every area (its 1st floor) and every town once', () => {
      expect(devStops().length).toBe(PATHS.length + TOWNS.length);
    });

    it('is sorted by tier, and each town comes right before the areas it leads to', () => {
      const stops = devStops();
      let lastTown = '';
      for (let i = 0; i < stops.length; i++) {
        const place = stops[i].place;
        if (i > 0) expect(placeTier(place)).toBeGreaterThanOrEqual(placeTier(stops[i - 1].place));
        if (isTown(place)) lastTown = place.town;
        else expect(PATHS.find((p) => p.id === place.path)!.from).toBe(lastTown);
      }
    });

    it('rows show their tier, areas their level, and towns are marked', () => {
      const stops = devStops();
      expect(stops[0].name).toBe('T1 Saltwick Port (town)');
      expect(stops[1].name).toBe('T1 Sunlit Shore Lv.1');
    });

    it('picking a town warps there and closes the menu', () => {
      dev.on = true;
      dev.open = true;
      dev.sel = 0;
      setKey('enter', true);
      devInput(P.STEP);
      clearPressed();
      setKey('enter', false);
      expect(samePlace(game.floor.place, devStops()[0].place)).toBe(true);
      expect(game.floor.town).toBeTruthy();
      expect(dev.open).toBe(false);
    });
  });

  it('spends SP on skills as usual, but lets SP go below zero', () => {
    dev.on = true;
    player.sp = 1;
    player.ranks.sa = false;
    player.ranks.pp = false;
    spendSkill('sa');
    spendSkill('pp');
    expect(player.ranks.sa).toBe(true);
    expect(player.ranks.pp).toBe(true);
    expect(player.sp).toBe(-1);
  });

  it('unlearning a skill gives its point back', () => {
    dev.on = true;
    player.sp = 0;
    player.ranks.pp = false;
    spendSkill('pp');
    spendSkill('pp');
    expect(player.ranks.pp).toBe(false);
    expect(player.sp).toBe(0);
  });
});

describe('the dev max-out key (\\)', () => {
  beforeEach(() => arena());

  it('resets a cooldown that was running', () => {
    player.cd.E = 7;
    maxOut();
    expect(player.cd.E).toBe(0);
  });

  it("resets an air form's own cooldown", () => {
    player.cd['E.air'] = 3;
    maxOut();
    expect(player.cd['E.air']).toBe(0);
  });

  it('restores every Electric Blitz charge', () => {
    player.blitz.charges = 0;
    maxOut();
    expect(player.blitz.charges).toBe(P.BLITZ_MAX);
  });

  it('starts the Blitz refill timer over', () => {
    player.blitz.t = 2;
    maxOut();
    expect(player.blitz.t).toBe(0);
  });
});
