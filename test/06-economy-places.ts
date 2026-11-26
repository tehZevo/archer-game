import { seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, PAUSE_ROWS, pauseScroll, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, RECOLOR, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';
// --- economy: coins drop, X picks them up, potions on A / S, the town shop ---
{
  release(); arena(5); wallet.coins = 0; wallet.hp = 0; wallet.mp = 0;
  check('coins scale with enemy level', coinValue(1, 0) === 2 && coinValue(1, 0.999) === 4 && coinValue(20, 0) === 21);
  const m = dummy(player.x + 40, 1);
  killMob(m); step(1);
  check('a defeated enemy drops a pile of coins', drops.length === 1 && drops[0].v > 0);
  step(30);
  const pile = drops[0];
  check('the pile falls and lands on the platform', pile.landed && Math.abs(pile.y - (player.y + player.h)) < 2, `y ${pile.y.toFixed(1)}`);
  tap('x');
  check('X does nothing when the pile is out of reach', drops.length === 1 && wallet.coins === 0);
  player.x = pile.x + 6; step(1); tap('x');
  check('X beside the pile picks it up', drops.length === 0 && wallet.coins === pile.v);
  check('a picked-up pile flies into you, then is gone', flying.length === 1 && (step(Math.ceil(FLY_T / P.STEP) + 1), flying.length === 0));
  check('piles last 5 minutes', COIN_LIFE === 300);
  killMob(dummy(player.x, 1)); drops[0].t = 1; step(Math.ceil(1.5 / P.STEP));
  check('an uncollected pile fades away', drops.length === 0);

  // potions
  wallet.hp = 2; player.hp = 10; tap('a');
  check('A drinks an HP potion: +40% max HP', wallet.hp === 1 && player.hp === Math.min(player.hpMax, 10 + Math.ceil(player.hpMax * 0.4)));
  tap('a');
  check('potions have a short cooldown', wallet.hp === 1);
  step(30); player.hp = player.hpMax; tap('a');
  check('no potion wasted at full HP', wallet.hp === 1);
  wallet.mp = 1; player.mp = 0; tap('s');
  check('S drinks an MP potion', wallet.mp === 0 && player.mp > 0);

  // the shop
  release();
  let townN = 1; while (gotoPlace(climb(townN)), !game.floor.town) townN++;
  const keeper = game.floor.npcs?.find((n) => n.kind === 'shop');
  check('towns have a shopkeeper', !!keeper);
  const zones = game.floor.portals.map((q) => [q.x - q.w / 2 - 10, q.x + q.w / 2 + 10]).concat(game.floor.ladders.map((l) => [l.x - 7, l.x + 7]), game.floor.ropes.map((l) => [l.x - 7, l.x + 7]));
  check("the shopkeeper's talk spot doesn't overlap a portal, ladder or rope", zones.every(([a, b]) => keeper!.x + NPC_R <= a || keeper!.x - NPC_R >= b));
  player.x = keeper!.x; player.y = keeper!.y - player.h; player.vy = 0; player.onGround = true; player.climb = null;
  wallet.coins = PRICES.hp + 5; wallet.hp = 0;
  tap('up');
  check('Up beside the shopkeeper opens the shop', shop.open && game.floor.town);
  tap('z');
  check('buying takes the coins and adds a potion', wallet.coins === 5 && wallet.hp === 1);
  check("can't buy without the coins", !buy('mp') && wallet.mp === 0);
  // the shop also sells a weapon and an armor piece built for this town
  const stock = shopStock();
  const bowRow = stock.find((r) => r.kind === 'weapon')!, plateRow = stock.find((r) => r.kind === 'armor')!;
  check('the shop stocks a weapon and an armor piece', !!bowRow.item && !!plateRow.item);
  check("the gear is built for this town's level", bowRow.item?.lvl === mobLevel(game.floor.place), `Lv.${bowRow.item?.lvl}`);
  clearGear(); wallet.coins = bowRow.price;
  shop.sel = stock.indexOf(bowRow); tap('z');
  check('buying the bow takes its price and puts it on', wallet.coins === 0 && gear.weapon?.name === bowRow.item?.name);
  wallet.coins = plateRow.price - 1;
  shop.sel = stock.indexOf(plateRow); tap('z');
  check("can't buy the armor a coin short", wallet.coins === plateRow.price - 1 && gear.armor === null);
  tap('escape');
  check('Esc closes the shop (not the pause menu)', !shop.open && !game.pause);
  release();

  // the trainer: from the third town up, respec for coins
  gotoPlace(START);
  check('the first town has a shopkeeper and no trainer', game.floor.npcs!.filter((n) => n.kind !== 'stylist' && n.kind !== 'board').length === 1 && game.floor.npcs![0].kind === 'shop');
  gotoPlace({ town: 'mossgate' });
  const coachAt = game.floor.npcs!.find((n) => n.kind === 'trainer')!;
  check('the third town has a trainer beside the shopkeeper', !!coachAt && game.floor.npcs!.filter((n) => n.kind !== 'stylist' && n.kind !== 'board').length === 2);
  player.x = coachAt.x; player.y = coachAt.y - player.h; player.vy = 0; player.onGround = true; player.climb = null;
  wallet.coins = RESPEC_PRICES.swap; player.ranks.s = true; player.ranks.z = false;
  tap('up');
  check('Up beside the trainer opens the trainer', trainer.open && trainer.sel === 0);
  tap('z');
  check('a branch swap keeps the rank and takes the coins', player.ranks.z === true && player.ranks.s === false && wallet.coins === 0);
  tap('escape');

  player.ranks.s = false; player.ranks.z = true; player.stats.dex = 4; player.ap = 0; player.sp = 0;
  wallet.coins = RESPEC_PRICES.reset;
  tap('up');
  trainer.sel = TRAINER_ITEMS.length - 1; tap('z');
  check('a full reset refunds every AP and SP spent (Glide too)',
    player.stats.dex === 0 && player.ap === 4 && player.ranks.z === true && player.sp === 4 && player.ranks.d === false && wallet.coins === 0,
    `ap ${player.ap} sp ${player.sp} Z ${player.ranks.z}`);
  tap('escape');
  release();

  // saved
  const mem: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
  wallet.coins = 77; wallet.hp = 3; wallet.mp = 4; save();
  wallet.coins = 0; wallet.hp = 0; wallet.mp = 0; load();
  check('coins and potions are saved', wallet.coins === 77 && wallet.hp === 3 && wallet.mp === 4);
  check('an older save without them starts with the starting kit', apply({ ...JSON.parse(mem[Object.keys(mem)[0]]), coins: undefined, potions: undefined }) !== null && wallet.coins === 0 && wallet.hp === START_POTIONS && wallet.mp === START_POTIONS);
  delete (globalThis as { localStorage?: unknown }).localStorage;
}

// --- places: towns joined by paths; a place is a town, or a path and a floor ---
{
  const depthOfPath = (id: string): number => townDepth(PATHS.find((p) => p.id === id)!.from) + 1;
  check('a path\'s floors are followed by its end town', isTown(climb(1)) && !isTown(climb(2)) && !isTown(climb(4)) && isTown(climb(5)) && !isTown(climb(6)) && isTown(climb(11)));
  check('the game starts in the Harbor, a town below the Beach', START.town === 'saltwick' && areaOf(START) === 'Harbor' && placeName(START) === 'Saltwick Port'
    && pathsFrom('saltwick').length === 1 && pathsFrom('saltwick')[0].name === 'Sunlit Shore');
  check('the Tide Pools are a high branch, past the Sunken Ruins', depthOfPath('tidepools') >= 5 && pathsInto(PATHS.find((p) => p.id === 'tidepools')!.from)[0].name === 'Sunken Ruins');
  check('places read as the area (no floor number), or the town', placeName(START) === 'Saltwick Port' && placeName({ path: 'shore', floor: 1 }) === 'Sunlit Shore' && placeName({ path: 'woods', floor: 2 }) === 'Whispering Woods');
  check('every town is named apart', placeName({ town: 'mossgate' }) === 'Mossgate Village' && placeName({ town: 'lanternhollow' }) === 'Lanternhollow Town'
    && new Set(TOWNS.map((t) => t.name)).size === TOWNS.length);
  check('paths are climbed one way: a town\'s ways up all lead to deeper towns', PATHS.every((p) => townDepth(p.to) > townDepth(p.from)));
  check('a fork leads into two different areas', TOWNS.every((t) => { const up = pathsFrom(t.id); return up.length < 2 || up[0].name !== up[1].name; }));
  check('branches can end (a town with no way up)', TOWNS.some((t) => pathsFrom(t.id).length === 0 && townDepth(t.id) < 6));
  check('the last floor of a path is its end (the boss floor)', isPathEnd({ path: 'shore', floor: 3 }) && isPathEnd({ path: 'woods', floor: 5 }) && !isPathEnd({ path: 'woods', floor: 4 }) && !isPathEnd(START));
  check('a path ends in its town; a town leads up its leftmost path', placeKey(nextPlace({ path: 'shore', floor: 3 })) === 'driftwood'
    && placeKey(nextPlace({ path: 'shore', floor: 1 })) === 'shore-2' && placeKey(nextPlace({ town: 'driftwood' })) === 'woods-1');

  release(); gotoPlace({ town: 'driftwood' });
  const [l, r, d] = game.floor.portals.map((p) => p.label);
  check('town portals are labelled with where they go', l === 'Whispering Woods' && r === 'Sunny Meadows' && d === 'Saltwick Port', `${l} | ${r} | ${d}`);
  gotoPlace({ path: 'meadows', floor: 5 });
  check('the way into a town is labelled with its own name', game.floor.portal.label === 'Lanternhollow Town');
  check('the HUD place follows your path', placeName(game.floor.place) === 'Sunny Meadows');
  gotoPlace({ town: 'sporehollow' });
  check('a town at the end of a branch has only its way down', game.floor.portals.length === 1 && game.floor.portals[0].down === true);
  gotoPlace(nextPlace(game.floor.place));
  check('nothing lies above the end of a branch (a warp past it stays in its town)', game.floor.town && placeName(game.floor.place) === 'Sporehollow Camp');
  release();
}

{
  // Glide and the climb rush are bought with SP, not given
  check('a new archer has Double Shot free, Glide not yet', DEFS.D.learn === true && startsLearned('z') && !startsLearned('d'));
  arena(1); player.ranks.d = false; player.sp = 1;
  check('Glide can take SP from Lv.1', skillRows().some((r) => r.key === 'd' && !r.learned && !!r.action) && spendSkill('d') && player.ranks.d === true);
  check('Acrobatics opens at Lv.10', DEFS.AC.minLevel === 10 && !skillRows().some((r) => r.key === 'ac'));
  const onRope = (): void => {
    const c = [...game.floor.ropes, ...game.floor.ladders][0];
    player.climb = c; player.x = c.x; player.y = c.y2 - player.h - 1; player.onGround = false; player.vx = player.vy = 0;
  };
  arena(10); player.ranks.ac = false; onRope();
  setKey('up', true); tap('c');
  check('without Acrobatics, Up + Jump on a rope does not rush', !player.climbRush);
  release();
  arena(10); player.ranks.ac = true; onRope();
  setKey('up', true); tap('c');
  check('with it, Up + Jump rushes up the rope', player.climbRush);
  check('...trailing green rising streaks', game.fx.some((f) => f.type === 'climbRise'));
  release();
}
{
  // Acrobatics' flat climb-speed bonus is gone: a plain Up climb rises at the
  // base speed with or without it (the passive now only gives the climb-rush).
  const climbOneStep = (ac: number): number => {
    arena(10); player.ranks.ac = ac;
    const c = [...game.floor.ropes, ...game.floor.ladders][0];
    player.climb = c; player.x = c.x; player.y = c.y2 - player.h - 1; player.onGround = false; player.vx = player.vy = 0;
    const y0 = player.y; setKey('up', true); step(1); setKey('up', false);
    return y0 - player.y; // px risen this step
  };
  const withAC = climbOneStep(1), withoutAC = climbOneStep(0);
  check('Acrobatics no longer speeds up the plain climb', Math.abs(withAC - withoutAC) < 0.01,
    `with ${withAC.toFixed(2)} vs ${withoutAC.toFixed(2)}px`);
  release();
}
// --- stats: attack scales with level and DEX (%), VIT is +5% HP a point ---
{
  arena(1); player.stats.dex = 0; player.stats.vit = 0; recalcStats();
  const att1 = player.war, hp1 = player.hpMax;
  arena(40); recalcStats(); const att40 = player.war;
  player.stats.dex = 10; player.stats.vit = 10; recalcStats();
  check('attack grows with level', att40 > att1 * 3, `Lv1 ${att1.toFixed(1)} Lv40 ${att40.toFixed(1)}`);
  check('each DEX point is +3% attack at any level', Math.abs(player.war / att40 - (1 + 10 * STAT_GAIN.dex)) < 1e-9 && STAT_GAIN.dex === 0.03);
  arena(1); player.stats.vit = 1; recalcStats();
  check('each VIT point is +5% max HP', player.hpMax === Math.round(hp1 * 1.05), `${hp1} -> ${player.hpMax}`);
  player.stats.dex = 0; player.stats.vit = 0; recalcStats();
}

// --- emotes: F1-F7 pop a face over your head (and your ghost's) ---
{
  arena(1); clearEmotes();
  setKey('f2', true); step(1); setKey('f2', false);
  check('F2 shows the sad emote over you', emoteFor(SELF, performance.now()) === 'sad');
  check('an emote runs out after a few seconds', emoteFor(SELF, performance.now() + EMOTE_MS + 1) === null);
  check('seven emotes, each a 9x9 face from the palette', EMOTES.length === 7 && EMOTES.every((e) => EMOTE_ART[e].length === 9
    && EMOTE_ART[e].every((r) => r.length === 9 && [...r].every((c) => c === '.' || EMOTE_PAL[c]))));
  check('emotes from the network are checked', cleanEmote(5) === 'love' && cleanEmote(7) === null && cleanEmote('1') === null && cleanEmote(-1) === null);
  setEmote('peer', 'love', 0); clearEmotes('peer');
  check('a peer leaving clears their emote', emoteFor('peer', 0) === null);
  clearEmotes();
}

// --- multi-hit damage numbers stack, one every NUM_GAP (1/8 s) ---
{
  arena(10); const m = dummy(150);
  game.dmgNums.length = 0;
  for (let i = 0; i < 4; i++) damage(m, 1);
  const ns = game.dmgNums.slice();
  const delays = ns.map((d) => +(d.delay ?? 0).toFixed(3)).join(',');
  const lines = ns.every((d, i) => Math.abs(ns[0].y - d.y - i * NUM_LINE) < 1e-9);
  check('hits at once: each number waits 1/8 s after the last', NUM_GAP === 0.125 && delays === [0, 1, 2, 3].map((k) => +(k * NUM_GAP).toFixed(3)).join(','), delays);
  check('...and sits one line above it', lines);
  step(Math.ceil(0.15 / P.STEP));
  check('the second number shows after ~1/8 s, the later ones still wait', (game.dmgNums[1].delay ?? 0) <= 0 && (game.dmgNums[2].delay ?? 0) > 0);
  step(Math.ceil(2 / P.STEP));
  game.dmgNums.length = 0; damage(m, 1);
  check('after a pause a new stack starts at the bottom, right away', game.dmgNums[0].delay === 0 && game.dmgNums[0].y === m.y - 8);
}
