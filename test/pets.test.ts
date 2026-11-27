import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arena, ground, memoryStorage, step } from './helpers';
import { P } from '../src/config';
import { COIN_LIFE, drops, flying, wallet } from '../src/economy';
import { gearDrops, gearFor } from '../src/gear';
import { choosePet, clearPets, pet, PET, PET_KINDS, petCustoms, toggleCustom } from '../src/pets';
import { apply, clearSave, snapshot } from '../src/save';
import { game, gotoPlace, player } from '../src/state';
import { TOWNS } from '../src/world';

/** A landed coin pile `dx` px from you, worth `v`. */
function pile(dx: number, v: number) {
  const coin = { x: player.x + dx, y: ground().y, vy: 0, v, t: COIN_LIFE, landed: true };
  drops.push(coin);
  return coin;
}

/** A weapon lying on the ground 50px ahead. */
function lyingGear() {
  return { item: gearFor('weapon', 1), x: player.x + 50, y: ground().y, t: COIN_LIFE };
}

/** Every pet upgrade bought, with only COINS switched on. */
function ownUpgrades(): void {
  pet.bought = ['coins', 'items', 'range', 'potions'];
  pet.customs.coins = true;
}

/** Run the game for `seconds`. */
function wait(seconds: number): void {
  step(Math.ceil(seconds / P.STEP));
}

/** Where a following pet sits: just behind your shoulder. */
const shoulder = (): number => player.x - player.face * PET.BACK;

beforeEach(() => {
  arena();
  step(1); // a new floor clears the drops on its first frame
  drops.length = 0;
  flying.length = 0;
  gearDrops.length = 0;
  clearPets();
  wallet.coins = 0;
});
afterEach(() => {
  drops.length = 0;
  gearDrops.length = 0;
  player.hp = player.hpMax;
});


describe('buying and calling pets', () => {
  it('you can\'t buy one without the coins', () => {
    wallet.coins = PET_KINDS.goldfinch.price - 1;
    expect(choosePet('goldfinch')).toBe(false);
    expect(pet.owned).toEqual([]);
  });

  it('buying one takes its price, and it follows you', () => {
    wallet.coins = PET_KINDS.goldfinch.price + 5;
    expect(choosePet('goldfinch')).toBe(true);
    expect(pet.kind).toBe('goldfinch');
    expect(wallet.coins).toBe(5);
  });

  it('buying another: it follows you instead, and you keep both', () => {
    wallet.coins = PET_KINDS.goldfinch.price + PET_KINDS.owl.price + 5;
    choosePet('goldfinch');
    expect(choosePet('owl')).toBe(true);
    expect(pet.kind).toBe('owl');
    expect(pet.owned.length).toBe(2);
    expect(wallet.coins).toBe(5);
  });

  it('calling one you own is free, and calling the one with you sends it home', () => {
    pet.owned = ['goldfinch', 'owl'];
    expect(choosePet('goldfinch')).toBe(true);
    expect(pet.kind).toBe('goldfinch');
    expect(wallet.coins).toBe(0);
    choosePet('goldfinch');
    expect(pet.kind).toBe(null);
    expect(pet.owned.length).toBe(2);
  });

});

describe('fetching coins', () => {
  beforeEach(() => {
    ownUpgrades();
    pet.owned = ['goldfinch', 'owl'];
    choosePet('goldfinch');
    step(1);
  });

  it('a pet fetches a nearby pile into your wallet, and comes back', () => {
    pile(60, 7);
    wait(1);
    expect(wallet.coins).toBe(7);
    expect(drops.length).toBe(0);
    wait(1);
    expect(Math.abs(pet.x - shoulder())).toBeLessThan(4);
  });

  it('it leaves piles out of its range', () => {
    const far = pile(PET_KINDS.goldfinch.range + 60, 9);
    wait(2);
    expect(drops).toEqual([far]);
    expect(wallet.coins).toBe(0);
  });

  it('the Swift Owl reaches farther', () => {
    pile(PET_KINDS.goldfinch.range + 60, 9);
    choosePet('owl');
    wait(1.5);
    expect(drops.length).toBe(0);
    expect(wallet.coins).toBe(9);
  });
});

describe('pet perks', () => {
  beforeEach(() => {
    ownUpgrades();
    pet.owned = ['goldfinch', 'sprite', 'puff'];
  });

  it('a plain pet leaves gear alone', () => {
    choosePet('goldfinch');
    gearDrops.push(lyingGear());
    wait(1);
    expect(gearDrops.length).toBe(1);
  });

  it('the Leaf Sprite fetches gear', () => {
    choosePet('sprite');
    toggleCustom('sprite', 'items');
    gearDrops.push(lyingGear());
    wait(1);
    expect(gearDrops.length).toBe(0);
  });

  it('the Star Puff drinks an HP potion when you are low', () => {
    choosePet('puff');
    toggleCustom('puff', 'potions');
    step(2);
    wallet.hp = 2;
    player.hp = Math.floor(player.hpMax * 0.2);
    step(2);
    expect(wallet.hp).toBe(1);
    expect(player.hp).toBeGreaterThan(player.hpMax * 0.2);
  });

  it('other pets do not', () => {
    choosePet('goldfinch');
    wallet.hp = 2;
    player.hp = Math.floor(player.hpMax * 0.2);
    step(30);
    expect(wallet.hp).toBe(2);
  });
});

describe('pet customizations', () => {
  beforeEach(() => {
    ownUpgrades();
    pet.owned = ['goldfinch'];
    choosePet('goldfinch');
    step(1);
  });

  it('with only COINS on, a goldfinch leaves gear; ITEMS on makes it fetch gear', () => {
    expect(petCustoms('goldfinch').coins).toBe(true);
    expect(petCustoms('goldfinch').items).toBe(false);
    gearDrops.push(lyingGear());
    wait(1);
    expect(gearDrops.length).toBe(1);
    toggleCustom('goldfinch', 'items');
    wait(1);
    expect(gearDrops.length).toBe(0);
  });

  it('RANGE on lets it reach a pile past its base range', () => {
    pile(PET_KINDS.goldfinch.range + 40, 5);
    wait(1);
    expect(wallet.coins).toBe(0);
    toggleCustom('goldfinch', 'range');
    wait(1.5);
    expect(wallet.coins).toBe(5);
    expect(drops.length).toBe(0);
  });

  it('they survive a save and load', () => {
    toggleCustom('goldfinch', 'items');
    const snap = snapshot();
    clearPets();
    apply(snap);
    expect(petCustoms('goldfinch').items).toBe(true);
    expect(petCustoms('goldfinch').range).toBe(false);
  });
});

describe('pet upgrades (COINS 2000, ITEMS 3000, RANGE 4000, POTIONS 5000) cost once, then toggle free', () => {
  beforeEach(() => {
    pet.owned = ['goldfinch'];
  });

  it('you start with none', () => {
    expect(petCustoms().coins).toBe(false);
    expect(pet.bought).toEqual([]);
  });

  it('you can\'t buy one you can\'t afford', () => {
    wallet.coins = 2999;
    expect(toggleCustom('goldfinch', 'items')).toBe(false);
    expect(wallet.coins).toBe(2999);
    expect(petCustoms().items).toBe(false);
  });

  it('buying COINS takes 2000 and switches it on; after that it toggles for free', () => {
    wallet.coins = 2999;
    expect(toggleCustom('goldfinch', 'coins')).toBe(true);
    expect(wallet.coins).toBe(999);
    expect(petCustoms().coins).toBe(true);
    toggleCustom('goldfinch', 'coins');
    expect(petCustoms().coins).toBe(false);
    toggleCustom('goldfinch', 'coins');
    expect(petCustoms().coins).toBe(true);
    expect(wallet.coins).toBe(999);
  });

  it('bought upgrades survive a save and load, and an unbought one loads off', () => {
    pet.bought = ['coins', 'items', 'range', 'potions'];
    pet.customs.items = true;
    const snap = snapshot();
    clearPets();
    apply(snap);
    expect(pet.bought.length).toBe(4);
    expect(petCustoms().items).toBe(true);
    apply({ ...snap, petBought: undefined });
    expect(pet.bought).toEqual([]);
    expect(petCustoms().coins).toBe(false);
  });
});

describe('pets in the save', () => {
  beforeEach(() => {
    pet.owned = ['owl', 'puff'];
    choosePet('puff');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('survive a save and load', () => {
    const snap = snapshot();
    clearPets();
    apply(snap);
    expect(pet.owned).toEqual(['owl', 'puff']);
    expect(pet.kind).toBe('puff');
  });

  it('unknown pets in a save are dropped', () => {
    apply({ ...snapshot(), pets: ['owl', 'dragon' as never], petKind: 'dragon' as never });
    expect(pet.owned).toEqual(['owl']);
    expect(pet.kind).toBe(null);
  });

  it('a save without pets has none', () => {
    apply({ ...snapshot(), pets: undefined, petKind: undefined });
    expect(pet.owned).toEqual([]);
    expect(pet.kind).toBe(null);
  });

  it('a fresh start clears them', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    clearSave();
    expect(pet.owned).toEqual([]);
  });
});
