import { seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, VARIANT_ART, MOB_GEN, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, bannerMsg, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, mobDmg, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';
// an in-memory localStorage (old 07 used to leave one installed for this file)
{
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage ??= {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)); }, removeItem: (k: string) => { mem.delete(k); },
  };
}
// --- enemy variants: cousins of an area's enemies that turn up in their place ---
{
  const variants = MOB_TYPES.filter((m) => m.of);
  check('there are enemy variants', variants.length >= 15);
  check('every enemy has art (painted, hand-drawn or a drawn variant)', MOB_TYPES.every((m) => hasMobArt(m.n)), MOB_TYPES.filter((m) => !hasMobArt(m.n)).map((m) => m.n).join(', '));
  const drawnVariants = Object.keys(VARIANT_ART);
  check('every drawn variant is a cousin of a hand-drawn enemy',
    drawnVariants.every((n) => DRAWN.includes(MOB_TYPES.find((m) => m.n === n)?.of ?? '')));
  check('...drawn at its own size, every row the right width',
    drawnVariants.every((n) => { const v = VARIANT_ART[n], t = MOB_TYPES.find((m) => m.n === n)!;
      return v.w === t.w && v.h === t.h && [0, 1, 2, 3].every((f) => v.rows(f).length === v.h && v.rows(f).every((r) => r.length === v.w)) && v.hurt().length === v.h; }),
    drawnVariants.join(', '));
  // a drawn variant is its own shape, not its parent's pixels in new colours
  const mask = (name: string): string => { const g = MOB_GEN[name]().frames[0].g; return Array.from({ length: g.w * g.h }, (_, i) => (g.px[i * 4 + 3] ? 1 : 0)).join(''); };
  check('...each with its own silhouette, not a palette swap',
    drawnVariants.every((n) => mask(n) !== mask(MOB_TYPES.find((m) => m.n === n)!.of!)));
  check('every variant is of a real (non-variant) enemy and lives somewhere it does',
    variants.every((v) => { const b = MOB_TYPES.find((m) => m.n === v.of); return b && !b.of && v.areas?.length && v.areas.every((a) => b.areas?.includes(a)); }));
  const withSet = [...new Set(MOB_TYPES.flatMap((m) => m.areas ?? []))].filter((a) => a !== '*');
  const bare = withSet.filter((a) => !variants.some((v) => v.areas!.includes(a)));
  check('every area with its own enemies has a variant or two', bare.length === 0, bare.join(', '));
  check('variants are never one of a floor\'s two types', withSet.every((a) => areaMobs(a).every((m) => !m.of)));
  const snail = MOB_TYPES.find((m) => m.n === 'Garden Snail')!;
  check('usually the enemy itself spawns', pickVariant(snail, 'Sunlit Shore', VARIANT_CHANCE + 0.01) === snail);
  check('now and then its variant does instead', pickVariant(snail, 'Sunlit Shore', 0).n === 'Red Snail');
  const gull = MOB_TYPES.find((m) => m.n === 'Gull')!;
  check('a variant only turns up in its own areas', pickVariant(gull, 'Sunlit Shore', 0) === gull && pickVariant(gull, 'Endless Sky', 0).n === 'Storm Gull');
  gotoPlace(climb(2)); game.mobs.length = 0;
  for (const z of game.floor.spawns) z.types = ['Garden Snail'];
  const rnd = Math.random; Math.random = () => 0.01;
  try { spawnWave(); } finally { Math.random = rnd; }
  check('waves spawn variants', game.mobs.length > 0 && game.mobs.every((m) => m.type.of), game.mobs.map((m) => m.name).join(', '));
  game.mobs.length = 0;
}

// --- enemies move at half their old speed ---
{
  arena();
  spawnMob({ x: 100, y: ground().y, types: ['Enemy Crab'] } as never, MOB_TYPES.find((m) => m.n === 'Enemy Crab')!);
  const m = game.mobs[game.mobs.length - 1];
  check('a spawned enemy moves at half its listed speed', m.spd === Math.round(MOB_TYPES.find((x) => x.n === 'Enemy Crab')!.spd * P.MOB_SPEED), `spd ${m.spd}`);
  game.mobs.length = 0;
}

// --- elites: rare, bigger, tougher, worth more ---
{
  arena();
  const z = { x: 100, y: ground().y, types: ['Enemy Crab'] } as never;
  spawnMob(z, MOB_TYPES[1]); spawnMob(z, MOB_TYPES[1], true);
  const [n, e] = game.mobs.slice(-2);
  // damage is a 50%-100% roll of each one's max, so check each roll is inside its own (elite-boosted) range
  const t = MOB_TYPES[1], lvl = mobLevel(game.floor.place);
  const inRoll = (m: Mob, mult: number): boolean => m.dmg >= Math.round(mobDmg(t, lvl, mult) * 0.5) - 1 && m.dmg <= mobDmg(t, lvl, mult);
  check('an elite is bigger and tougher, and worth more EXP', !n.elite && !!e.elite
    && e.w === Math.round(n.w * ELITE.SCALE) && e.h === Math.round(n.h * ELITE.SCALE)
    && e.hpMax === Math.round(n.hpMax * ELITE.HP) && inRoll(n, 1) && inRoll(e, ELITE.DMG) && e.exp === n.exp * ELITE.EXP,
    `hp ${n.hpMax}/${e.hpMax} dmg ${n.dmg}/${e.dmg}`);
  check('an elite stands on the ground like the rest', Math.abs(e.y + e.h - (n.y + n.h)) < 0.01);
  check('an elite keeps its name (quests count it)', e.name === n.name);
  drops.length = 0;
  killMob(n); const one = drops.length;
  killMob(e);
  check(`an elite drops ${ELITE.COINS} coin piles`, one === 1 && drops.length === 1 + ELITE.COINS);
  // waves: about 1 in 25
  game.floor.spawns = Array.from({ length: 400 }, (_, i) => ({ x: 40 + (i % 10), y: ground().y, types: ['Enemy Crab'] }));
  game.mobs = []; spawnWave();
  const frac = game.mobs.filter((m) => m.elite).length / game.mobs.length;
  check('waves roll elites rarely, about 1 in 25', ELITE.CHANCE === 1 / 25 && frac > 0.01 && frac < 0.09, frac.toFixed(3));
  game.mobs = []; game.floor.spawns = [];
}

// --- status effects: stacks, damage ticks, slow, and which areas carry them ---
{
  arena();
  check('the starting area carries no element', areaStatus() === undefined);
  gotoPlace({ path: 'swamp', floor: 1 }); game.mobs = []; game.floor.spawns = [];
  check('the Swamp carries poison', areaStatus() === 'poison');
  player.invuln = 0; player.hp = player.hpMax = 1000;
  applyStatus(player, 'poison'); applyStatus(player, 'poison');
  check('a second dose adds a stack', player.effects.length === 1 && player.effects[0].stacks === 2);
  for (let i = 0; i < 5; i++) applyStatus(player, 'poison');
  check(`stacks stop at ${MAX_STACKS}`, player.effects[0].stacks === MAX_STACKS);
  const hp0 = player.hp;
  updateStatus(player, 1.01);
  check('poison ticks each second, by stacks', hp0 - player.hp === Math.round(1000 * DOT.poison.player * MAX_STACKS));
  player.hp = 2; updateStatus(player, 1.01);
  check('poison never takes you below 1 HP', player.hp === 1);
  updateStatus(player, STATUS.poison.dur);
  check('it wears off', player.effects.length === 0);
  // chill slows you
  player.hp = player.hpMax; applyStatus(player, 'chill');
  check('chill slows movement', slowFactor(player) === CHILL_SLOW);
  player.x = 100; player.vx = 0; player.y = ground().y - player.h; player.onGround = true;
  setKey('right', true); step(30); const chilled = player.vx; release(); player.effects.length = 0; player.vx = 0;
  setKey('right', true); step(30); const free = player.vx; release();
  check('a chilled walk is slower', chilled < free * 0.9 && chilled > 0, `${chilled} vs ${free}`);
  // on enemies: burn ticks off their HP and can finish them
  const m = dummy(200, 30);
  applyStatus(m, 'burn'); player.war = 100;
  game.mobs = [m]; step(Math.ceil(1.05 / P.STEP));
  check('burn hurts an enemy each second (and can kill it)', !game.mobs.includes(m));
  // your hits no longer inflict the area's element (mobs' contact hits do)
  const m2 = dummy(200); let got = false;
  for (let i = 0; i < 40 && !got; i++) { damage(m2, 0.01); got = (m2.effects?.length ?? 0) > 0; }
  check("your hits don't inflict the area's element", !got);
  // gotoPlace clears yours
  applyStatus(player, 'burn'); gotoPlace(climb(1));
  check('effects clear on a new floor', player.effects.length === 0);
  game.mobs = [];
}

// --- floor modifiers: icy floors in cold areas, shared by everyone, pay more ---
{
  check('icy only rolls in cold areas', rollMods('Sunlit Shore', () => 0).length === 0 && rollMods('Mirror Lake', () => 0).join() === 'icy' && rollMods('Mirror Lake', () => 0.99).length === 0);
  const stages = Array.from({ length: 6 }, (_, i) => i + 1);
  const iced = stages.filter((n) => generateFloor({ path: 'mirror', floor: n }).mods?.includes('icy'));
  const again = stages.filter((n) => generateFloor({ path: 'mirror', floor: n }).mods?.includes('icy'));
  check('some cold floors roll icy, the same way every time', iced.length > 0 && iced.length < stages.length && iced.join() === again.join(), iced.join());
  check('towns never roll a modifier', !generateFloor({ town: 'stillwater' }).mods);
  // the slide: on ice you take longer to stop
  arena();
  const slide = (): number => {
    player.x = 60; player.vx = 0; player.y = ground().y - player.h; player.onGround = true;
    setKey('right', true); step(20); release();
    const x0 = player.x; step(30); return player.x - x0;
  };
  const dry = slide();
  game.floor.mods = ['icy'];
  check('grip drops on ice', grip() === ICE_GRIP);
  const wet = slide();
  check('you slide further on ice after letting go', wet > dry * 2, `${wet.toFixed(1)} vs ${dry.toFixed(1)}`);
  check('the HUD names it and the coin bonus', modLine() === 'ICY +50% COINS' && coinMult() === FLOOR_MODS.icy.coins);
  drops.length = 0; const m = dummy(100); m.level = 10; killMob(m);
  check('coins are worth more on an icy floor', drops[0].v >= Math.round(coinValue(10, 0) * FLOOR_MODS.icy.coins));
  game.floor.mods = undefined; drops.length = 0; game.mobs = [];
}

// --- achievements: counted across runs, unlock run bonuses and a cosmetic ---
{
  clearAchievements();
  arena(); player.exp = 0; // no level-up banner over the achievement's
  const m = dummy(100, 1); damage(m, 10);
  check('a kill counts and unlocks FIRST BLOOD', record.stats.kills === 1 && isDone('kill1') && game.banner?.sub === 'FIRST BLOOD');
  const e = dummy(100, 1); e.elite = true; damage(e, 10);
  check('an elite kill counts as an elite too', record.stats.elites === 1 && record.stats.kills === 2 && isDone('elite1'));
  bump('bosses', 10);
  check('the stylist offers the gold outfit only after WARDEN', isDone('boss10'));
  check('the done list is stored apart from the save', JSON.parse((globalThis as unknown as { localStorage: Storage }).localStorage.getItem('archer-game:achievements')!).done.includes('boss10'));
  visitArea('Sunlit Shore'); visitArea('Sunlit Shore'); visitArea('Whispering Woods');
  check('areas count once each', record.areas.filter((a) => a === 'Sunlit Shore').length === 1);
  // coins earned: picking up counts
  drops.length = 0; drops.push({ x: player.x, y: ground().y, vy: 0, v: 40, t: COIN_LIFE, landed: true });
  const c0 = record.stats.coins; tap('x');
  check('coins you pick up count as earned', record.stats.coins === c0 + 40);
  // floors: climbing out through a portal
  const f0 = record.stats.floors, up = game.floor.portal;
  player.x = up.x; player.y = up.y - player.h; player.vx = player.vy = 0; player.onGround = true; player.climb = null;
  tap('up');
  check('taking the way up counts a floor', record.stats.floors === f0 + 1);
  // run bonuses
  const b = runBonus();
  check('run bonuses add up the unlocked rewards', b.coins === 100 && b.potions === 0 && b.sp === 0);
  bump('kills', 500);
  const coins0 = wallet.coins, hp0 = wallet.hp, sp0 = player.sp; startRun();
  check('a new run starts with the bonuses', wallet.coins === coins0 + 100 && wallet.hp === hp0 + 5 && player.sp === sp0);
  // the gold outfit is skipped until unlocked
  clearAchievements();
  check('the gold outfit is locked at first', [...Array(20)].reduce((l) => stepLook(l, 'outfit', 1), DEFAULT_LOOK).outfit !== GOLD_OUTFIT
    && Array.from({ length: LOOK_COUNTS.outfit }, (_, i) => stepLook({ ...DEFAULT_LOOK, outfit: i }, 'outfit', 1).outfit).every((o) => o !== GOLD_OUTFIT));
  bump('bosses', 10);
  check('...and on offer once earned', stepLook({ ...DEFAULT_LOOK, outfit: GOLD_OUTFIT - 1 }, 'outfit', 1).outfit === GOLD_OUTFIT);
  check('a bad stored record is cleaned', cleanRecord({ stats: { kills: -5, coins: 'x' }, areas: [1, 'A', 'A'], done: ['nope', 'kill1'] }).stats.kills === 0
    && cleanRecord({ areas: [1, 'A', 'A'] }).areas.join() === 'A' && cleanRecord({ done: ['nope', 'kill1'] }).done.join() === 'kill1');
  // the list window, from the Esc menu
  release(); arena();
  tap('escape'); tap('left');
  check('Left from the stats column reaches AWARDS', game.pause?.col === 3);
  tap('z');
  check('Z opens the achievements list', achUi.open);
  tap('down'); check('Down moves through the list', achUi.sel === 1);
  tap('escape');
  check('Esc closes it, still paused', !achUi.open && !!game.pause);
  tap('escape');
  check('...and the main menu has an ACHIEVEMENTS row', items().includes('awards'));
  check(`${ACHIEVEMENTS.length} achievements, unique ids`, new Set(ACHIEVEMENTS.map((a) => a.id)).size === ACHIEVEMENTS.length);
  clearAchievements(); drops.length = 0; wallet.coins = 0; wallet.hp = 0;
  achKey('escape');
}

// --- town ways up show the level they're meant for ---
{
  gotoPlace({ town: 'mossgate' });
  const ups = game.floor.portals.filter((p) => !p.down);
  check('each way up from a town shows the level of the enemies there', ups.length > 0 && ups.every((p) => p.lvl === mobLevel(p.to)));
  check("the way down doesn't", game.floor.portals.filter((p) => p.down).every((p) => p.lvl === undefined));
  gotoPlace(climb(1));
}

// --- multi-hit overkill waits for the last hit; hitstun ---
{
  arena(1); release(); player.invuln = 999;
  game.mobs.length = 0; game.dmgNums.length = 0;
  const m = dummy(player.x + 30, 1), kills = game.kills;
  damage(m, 1, { more: true });
  check('an overkill hit with more to come leaves the enemy (dying) in place', game.mobs.includes(m) && m.dying !== undefined && game.kills === kills);
  step(2);
  check('a dying enemy is frozen and still there between hits', game.mobs.includes(m) && m.vx === 0);
  damage(m, 1, { more: true }); damage(m, 1);
  check('every hit shows its number, and the last one kills it', game.dmgNums.length === 3 && !game.mobs.includes(m) && game.kills === kills + 1);
  killMob(m);
  check('killing it again does nothing', game.kills === kills + 1);
  const n = dummy(player.x + 30, 1);
  damage(n, 1, { more: true });
  step(Math.ceil(DYING_MAX / P.STEP) + 2);
  check('a dying enemy dies anyway if the last hit never comes', !game.mobs.includes(n) && game.kills === kills + 2);
  const o = dummy(player.x + 60); o.spd = 60; o.aggro = true; o.vx = 60;
  damage(o, 1);
  check('a hit puts the enemy in hitstun', (o.hurt ?? 0) > 0 && o.hurt! <= HITSTUN);
  step(3);
  check('in hitstun it stops instead of chasing', Math.abs(o.vx) < 30, `vx ${o.vx.toFixed(1)}`);
  step(Math.ceil(HITSTUN / P.STEP) + 1);
  check('hitstun wears off', !o.hurt);
  game.mobs.length = 0;
}

// --- getting hit bumps you up off the ground and back, away from the enemy ---
{
  arena(1, 120); player.invuln = 0;
  const m = dummy(player.x + 8); m.dmg = 1; m.atkCd = 0; m.aggro = true;
  const x0 = player.x, hp0 = player.hp;
  step(1);
  check('touching an enemy hurts you', player.hp < hp0);
  check('the hit bumps you off the ground', !player.onGround && player.vy < 0);
  check('...and back, away from the enemy', player.vx < 0);
  let peak = 0;
  for (let i = 0; i < 30 && !player.onGround; i++) { step(1); peak = Math.max(peak, ground().y - (player.y + player.h)); }
  check('it is only a little bump, and you land again', player.onGround && peak > 3 && peak < 16, `peak ${peak.toFixed(1)}px`);
  check('you end up a little way back from the enemy', x0 - player.x > 8 && x0 - player.x < 50, `moved ${(x0 - player.x).toFixed(1)}px`);
  arena(1, 120); player.invuln = 0;
  hurtPlayer(1, player.x - 10, player.level);
  check('hit from behind, you are pushed the other way', player.vx > 0);
  arena(1, 120); player.invuln = 0;
  hurtPlayer(1);
  check('a hit from no particular place (a status tick) does not move you', player.vx === 0 && player.onGround);
  game.mobs.length = 0; player.invuln = 999;
}

// --- a whiffed Z shot still shows one arrow per hit ---
{
  arena(1); game.mobs.length = 0; game.fx.length = 0;
  player.cd.z = 0; player.casting.useT = 0;
  const seen = new Set<object>();
  setKey('z', true); step(1); setKey('z', false);
  for (let i = 0; i < Math.ceil((P.Z_WINDUP + 0.3) / P.STEP); i++) { step(1); game.fx.filter((f) => f.type === 'tracer').forEach((f) => seen.add(f)); }
  const n = seen.size;
  check('a Z shot with nothing in range still fires every arrow', n === rank('z').hits, `${n} tracers for ${rank('z').hits} hits`);
  release();
}

// --- the big on-screen banner stays up long enough to read ---
{
  arena();
  bannerMsg('THE SAGE', 'RETURN TO ME AT LV.10');
  check('the banner shows', game.banner?.text === 'THE SAGE');
  check('it is up for a few seconds, not a blink', P.BANNER_T > 2 && game.banner!.t === P.BANNER_T, `${P.BANNER_T}`);
  step(Math.floor(P.BANNER_T / 2 / P.STEP)); // halfway through
  check('it is still up, at full brightness, halfway through', game.banner !== null, `${game.banner?.t}`);
  step(Math.ceil((P.BANNER_T - P.BANNER_T / 2) / P.STEP));
  check('and it clears once its time is up', game.banner === null);
}
