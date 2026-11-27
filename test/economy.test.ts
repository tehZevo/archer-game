import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arena, dummy, memoryStorage, release, step, tap } from './helpers';
import { P } from '../src/config';
import { killMob } from '../src/combat';
import {
  buy, coinValue, drops, FLY_T, flying, NPC_R, PRICES, RESPEC_PRICES, shop, shopStock,
  POTION_CD, START_POTIONS, trainer, TRAINER_ITEMS, wallet } from '../src/economy';
import { clearGear, gear } from '../src/gear';
import { apply, clearSave, load, save } from '../src/save';
import { game, gotoPlace, player } from '../src/state';
import { mobLevel, START } from '../src/world';

/** Town folk who aren't shopkeepers or trainers. */

function emptyWallet(): void {
  wallet.coins = 0;
  wallet.hp = 0;
  wallet.mp = 0;
}

/** Stand still on the spot where a town person (or anything) stands. */
function standAt(pt: { x: number; y: number }): void {
  player.x = pt.x;
  player.y = pt.y - player.h;
  player.vy = 0;
  player.onGround = true;
  player.climb = null;
}

describe('coins', () => {
  beforeEach(() => {
    release();
    arena(5);
    emptyWallet();
  });

  /** Kill an enemy just ahead and let its coins land. */
  function dropPile(): (typeof drops)[number] {
    killMob(dummy(player.x + 40, 1));
    step(1);
    expect(drops.length).toBe(1);
    step(30);
    return drops[0];
  }

  it('are worth more from higher-level enemies', () => {
    expect(coinValue(1, 0)).toBe(2);
    expect(coinValue(1, 0.999)).toBe(4);
    expect(coinValue(20, 0)).toBe(21);
  });

  it('a defeated enemy drops a pile, which falls and lands on the platform', () => {
    const pile = dropPile();
    expect(pile.v).toBeGreaterThan(0);
    expect(pile.landed).toBe(true);
    expect(Math.abs(pile.y - (player.y + player.h))).toBeLessThan(2);
  });

  it('X does nothing when the pile is out of reach', () => {
    dropPile();
    tap('x');
    expect(drops.length).toBe(1);
    expect(wallet.coins).toBe(0);
  });

  it('X beside the pile picks it up; it flies into you, then is gone', () => {
    const pile = dropPile();
    player.x = pile.x + 6;
    step(1);
    tap('x');
    expect(drops.length).toBe(0);
    expect(wallet.coins).toBe(pile.v);
    expect(flying.length).toBe(1);
    step(Math.ceil(FLY_T / P.STEP) + 1);
    expect(flying.length).toBe(0);
  });
});

describe('potions', () => {
  beforeEach(() => {
    release();
    arena(5);
    emptyWallet();
    step(Math.ceil(POTION_CD / P.STEP) + 1); // let the last test's potion cooldown run out
  });

  it('have a short cooldown', () => {
    wallet.hp = 2;
    player.hp = 10;
    tap('a');
    tap('a');
    expect(wallet.hp).toBe(1);
  });

  it('none is wasted at full HP', () => {
    wallet.hp = 1;
    player.hp = player.hpMax;
    tap('a');
    expect(wallet.hp).toBe(1);
  });

  it('S drinks an MP potion', () => {
    wallet.mp = 1;
    player.mp = 0;
    tap('s');
    expect(wallet.mp).toBe(0);
    expect(player.mp).toBeGreaterThan(0);
  });
});

describe('the shop', () => {
  const keeper = () => game.floor.npcs!.find((n) => n.kind === 'shop')!;

  beforeEach(() => {
    release();
    arena(5);
    emptyWallet();
    gotoPlace(START);
  });
  afterEach(() => {
    if (shop.open) tap('escape');
    release();
  });

  it('every town has a shopkeeper, standing clear of portals, ladders and ropes', () => {
    const f = game.floor;
    const busy = [
      ...f.portals.map((q) => [q.x - q.w / 2 - 10, q.x + q.w / 2 + 10]),
      ...f.ladders.map((l) => [l.x - 7, l.x + 7]),
      ...f.ropes.map((r) => [r.x - 7, r.x + 7]),
    ];
    const talk = [keeper().x - NPC_R, keeper().x + NPC_R];
    for (const [left, right] of busy) expect(talk[1] <= left || talk[0] >= right).toBe(true);
  });

  it('Up beside the shopkeeper opens the shop, and Z buys a potion', () => {
    wallet.coins = PRICES.hp + 5;
    standAt(keeper());
    tap('up');
    expect(shop.open).toBe(true);
    tap('z');
    expect(wallet.coins).toBe(5);
    expect(wallet.hp).toBe(1);
  });

  it('you can\'t buy without the coins', () => {
    expect(buy('mp')).toBe(false);
    expect(wallet.mp).toBe(0);
  });

  it('it also sells a weapon and an armor piece for this town\'s level', () => {
    const stock = shopStock();
    const bow = stock.find((r) => r.kind === 'weapon')!, armor = stock.find((r) => r.kind === 'armor')!;
    expect(bow.item).toBeTruthy();
    expect(armor.item).toBeTruthy();
    expect(bow.item?.lvl).toBe(mobLevel(game.floor.place));
  });

  it('buying the bow takes its price and puts it on; the armor a coin short is refused', () => {
    clearGear();
    standAt(keeper());
    tap('up');
    const stock = shopStock();
    const bow = stock.find((r) => r.kind === 'weapon')!, armor = stock.find((r) => r.kind === 'armor')!;

    wallet.coins = bow.price;
    shop.sel = stock.indexOf(bow);
    tap('z');
    expect(wallet.coins).toBe(0);
    expect(gear.weapon?.name).toBe(bow.item?.name);

    wallet.coins = armor.price - 1;
    shop.sel = stock.indexOf(armor);
    tap('z');
    expect(wallet.coins).toBe(armor.price - 1);
    expect(gear.armor).toBe(null);
  });

  it('Esc closes the shop, not opening the pause menu', () => {
    standAt(keeper());
    tap('up');
    tap('escape');
    expect(shop.open).toBe(false);
    expect(game.pause).toBeFalsy();
  });
});

describe('the trainer', () => {
  const coach = () => game.floor.npcs!.find((n) => n.kind === 'trainer')!;

  beforeEach(() => {
    release();
    arena(5);
    emptyWallet();
  });
  afterEach(() => {
    if (trainer.open) tap('escape');
    release();
  });

  it('Up beside the trainer opens it; a branch swap keeps the rank and takes the coins', () => {
    gotoPlace({ town: 'mossgate' });
    standAt(coach());
    wallet.coins = RESPEC_PRICES.swap;
    player.ranks.s = true;
    player.ranks.z = false;
    tap('up');
    expect(trainer.open).toBe(true);
    expect(trainer.sel).toBe(0);
    tap('z');
    expect(player.ranks.z).toBe(true);
    expect(player.ranks.s).toBe(false);
    expect(wallet.coins).toBe(0);
  });

  it('a full reset refunds every AP and SP spent (Glide too)', () => {
    gotoPlace({ town: 'mossgate' });
    standAt(coach());
    player.ranks.s = false;
    player.ranks.z = true;
    player.ranks.d = true;
    player.stats.dex = 4;
    player.ap = 0;
    player.sp = 0;
    wallet.coins = RESPEC_PRICES.reset;
    tap('up');
    trainer.sel = TRAINER_ITEMS.length - 1;
    tap('z');
    expect(player.stats.dex).toBe(0);
    expect(player.ap).toBe(4);
    expect(player.sp).toBe(4);
    expect(player.ranks.z).toBe(true); // Double Shot is free
    expect(player.ranks.d).toBe(false);
    expect(wallet.coins).toBe(0);
  });
});

describe('saving the wallet', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    arena(5);
  });
  afterEach(() => {
    clearSave();
    vi.unstubAllGlobals();
  });

  it('coins and potions are saved', () => {
    wallet.coins = 77;
    wallet.hp = 3;
    wallet.mp = 4;
    save();
    emptyWallet();
    load();
    expect(wallet.coins).toBe(77);
    expect(wallet.hp).toBe(3);
    expect(wallet.mp).toBe(4);
  });

  it('an older save without them starts with the starting kit', () => {
    save();
    const old = { ...JSON.parse(localStorage.getItem('archer-game:save')!), coins: undefined, potions: undefined };
    expect(apply(old)).not.toBe(null);
    expect(wallet.coins).toBe(0);
    expect(wallet.hp).toBe(START_POTIONS);
    expect(wallet.mp).toBe(START_POTIONS);
  });
});
