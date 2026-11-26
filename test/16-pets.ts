import { P, player, game, drops, flying, wallet, gearDrops, gearFor, gotoPlace, TOWNS, COIN_LIFE, snapshot, apply, clearSave, pet, PET, PET_KINDS, choosePet, clearPets, check, step, arena, ground } from './harness';

/** A landed coin pile `dx` px from you, worth v. */
const pile = (dx: number, v: number) => {
  const c = { x: player.x + dx, y: ground().y, vy: 0, v, t: COIN_LIFE, landed: true };
  drops.push(c);
  return c;
};

// --- the pet keeper: a separate shop in every town, selling several pets ---
{
  const keepers = TOWNS.filter((t) => { gotoPlace({ town: t.id }); return (game.floor.npcs ?? []).some((n) => n.kind === 'pets'); });
  check('every town has a pet keeper', keepers.length === TOWNS.length, `${keepers.length}/${TOWNS.length}`);
  gotoPlace({ town: TOWNS[0].id });
  const npcs = game.floor.npcs ?? [];
  check('the keeper stands clear of the other NPCs', npcs.every((a, i) => npcs.every((b, j) => i === j || Math.abs(a.x - b.x) > 16 || Math.abs(a.y - b.y) > 4)));
  const kinds = Object.values(PET_KINDS);
  check('there are several kinds of pet', kinds.length >= 3);
  check('...each with its own price', new Set(kinds.map((k) => k.price)).size === kinds.length);
}

// --- buying, owning several, calling one to follow you ---
{
  arena(); drops.length = 0; flying.length = 0; clearPets();
  wallet.coins = PET_KINDS.goldfinch.price - 1;
  check("can't buy a pet without the coins", !choosePet('goldfinch') && pet.owned.length === 0);
  wallet.coins = PET_KINDS.goldfinch.price + PET_KINDS.owl.price + 5;
  check('buying a pet takes its price, and it follows you', choosePet('goldfinch') && pet.kind === 'goldfinch' && wallet.coins === PET_KINDS.owl.price + 5);
  check('buying another: it follows you instead, and you keep both', choosePet('owl') && pet.kind === 'owl' && pet.owned.length === 2 && wallet.coins === 5);
  check('calling one you own is free', choosePet('goldfinch') && pet.kind === 'goldfinch' && wallet.coins === 5);
  check('Z on the one with you sends it home', choosePet('goldfinch') && pet.kind === null && pet.owned.length === 2);
  choosePet('goldfinch');
  step(1);
  check('it arrives at your shoulder', Math.abs(pet.x - (player.x - player.face * PET.BACK)) < 1);

  // fetching: a pile in range, one out of it
  wallet.coins = 0;
  pile(60, 7);
  const far = pile(PET_KINDS.goldfinch.range + 60, 9);
  step(Math.ceil(1 / P.STEP));
  check('it fetches a nearby pile into your wallet', wallet.coins === 7 && drops.length === 1);
  step(Math.ceil(1 / P.STEP));
  check('it leaves piles out of its range', drops[0] === far && wallet.coins === 7);
  check('it comes back to you', Math.abs(pet.x - (player.x - player.face * PET.BACK)) < 4);
  // the owl reaches farther
  choosePet('owl'); step(Math.ceil(1.5 / P.STEP));
  check('the Swift Owl fetches from farther away', drops.length === 0 && wallet.coins === 16);
  drops.length = 0;
}

// --- perks: a gear pet fetches gear, a potion pet drinks for you ---
{
  arena(); step(1); drops.length = 0; flying.length = 0; gearDrops.length = 0; clearPets(); // (a step first: a new floor clears the drops)
  pet.owned = ['goldfinch', 'sprite', 'puff'];
  const lying = () => ({ item: gearFor('weapon', 1), x: player.x + 50, y: ground().y, t: COIN_LIFE });
  choosePet('goldfinch'); gearDrops.push(lying()); step(Math.ceil(1 / P.STEP));
  check('a plain pet leaves gear alone', gearDrops.length === 1);
  choosePet('sprite'); step(Math.ceil(1 / P.STEP));
  check('the Leaf Sprite fetches gear', gearDrops.length === 0);
  choosePet('puff'); step(2);
  wallet.hp = 2; player.hp = Math.floor(player.hpMax * 0.2); step(2);
  check('the Star Puff drinks an HP potion when you are low', wallet.hp === 1 && player.hp > player.hpMax * 0.2);
  choosePet('goldfinch'); player.hp = Math.floor(player.hpMax * 0.2); wallet.hp = 2; step(30);
  check('other pets do not', wallet.hp === 2);
  player.hp = player.hpMax;
}

// --- saved with you; a fresh start clears them ---
{
  clearPets(); pet.owned = ['owl', 'puff']; choosePet('puff');
  const snap = snapshot(); clearPets(); apply(snap);
  check('pets survive a save and load', pet.owned.join() === 'owl,puff' && pet.kind === 'puff');
  apply({ ...snap, pets: ['owl', 'dragon' as never], petKind: 'dragon' as never });
  check('unknown pets in a save are dropped', pet.owned.join() === 'owl' && pet.kind === null);
  apply({ ...snap, pets: undefined, petKind: undefined });
  check('a save without pets has none', pet.owned.length === 0 && pet.kind === null);
  pet.owned = ['owl']; clearSave();
  check('a fresh start clears your pets', pet.owned.length === 0);
  drops.length = 0; flying.length = 0; gearDrops.length = 0; wallet.coins = 0;
}
