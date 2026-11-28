import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arena, step, tap } from './helpers';
import { P } from '../src/config';
import { setKey } from '../src/input';
import { wallet } from '../src/economy';
import { hurtPlayer } from '../src/boss';
import { buyChair, chair, CHAIR_KINDS, clearChair } from '../src/chairs';
import { localPose } from '../src/net';
import { apply, snapshot } from '../src/save';
import { game, gotoPlace, player } from '../src/state';
import { TOWNS } from '../src/world';

/** Run the game for `seconds`. */
function wait(seconds: number): void {
  step(Math.round(seconds / P.STEP));
}

beforeEach(() => {
  arena();
  clearChair();
  wallet.coins = 0;
});
afterEach(() => {
  vi.restoreAllMocks();
  setKey('right', false);
  clearChair();
});

describe('the chair merchant', () => {
  it('keeps shop in about a third of the towns', () => {
    const withMerchant = TOWNS.filter((t) => {
      gotoPlace({ town: t.id });
      return (game.floor.npcs ?? []).some((n) => n.kind === 'chairs');
    });
    expect(withMerchant.length).toBe(Math.round(TOWNS.length / 3));
  });

  it('you can\'t buy a chair without the coins', () => {
    wallet.coins = CHAIR_KINDS.stool.price - 1;
    expect(buyChair('stool')).toBe(false);
    expect(chair.kind).toBe(null);
  });

  it('buying a chair takes its price, and a second one replaces the first', () => {
    wallet.coins = CHAIR_KINDS.stool.price + CHAIR_KINDS.throne.price;
    buyChair('stool');
    buyChair('throne');
    expect(chair.kind).toBe('throne');
    expect(wallet.coins).toBe(0);
  });

  it('you can\'t buy the chair you already carry', () => {
    chair.kind = 'stool';
    wallet.coins = 9999;
    expect(buyChair('stool')).toBe(false);
    expect(wallet.coins).toBe(9999);
  });

  it('your chair survives a save and load', () => {
    chair.kind = 'armchair';
    const snap = snapshot();
    clearChair();
    apply(snap);
    expect(chair.kind).toBe('armchair');
  });
});

describe('sitting', () => {
  beforeEach(() => {
    chair.kind = 'stool';
  });

  it('F sits you on your chair, and F again stands you up', () => {
    tap('f');
    expect(localPose()).toBe('sit');
    tap('f');
    expect(chair.sitting).toBe(false);
  });

  it('you can\'t sit without a chair', () => {
    chair.kind = null;
    tap('f');
    expect(chair.sitting).toBe(false);
  });

  it('seated, you restore 5% of max HP and MP every second', () => {
    player.hp = Math.round(player.hpMax / 2);
    player.mp = Math.round(player.mpMax / 2);
    const hp = player.hp, mp = player.mp;
    tap('f');
    wait(1);
    expect(player.hp).toBeCloseTo(hp + player.hpMax * 0.05, 0);
    expect(player.mp).toBeCloseTo(mp + player.mpMax * 0.05, 0);
  });

  it('you can\'t sit down in combat', () => {
    player.combatT = 1;
    tap('f');
    expect(chair.sitting).toBe(false);
  });

  it('moving stands you up', () => {
    tap('f');
    setKey('right', true);
    step(1);
    expect(chair.sitting).toBe(false);
  });

  it('taking damage stands you up', () => {
    tap('f');
    player.invuln = 0;
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // the hit lands
    hurtPlayer(5);
    step(1);
    expect(chair.sitting).toBe(false);
  });
});
