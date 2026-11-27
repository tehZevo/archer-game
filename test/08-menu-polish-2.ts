import { seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, VARIANT_ART, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';
// --- settings: the window, its values, storage, and where it opens from ---
{
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)); },
    removeItem: (k: string) => { mem.delete(k); },
  };
  Object.assign(settings, DEFAULT_SETTINGS);
  check('bad stored settings fall back to the defaults', JSON.stringify(cleanSettings({ sound: 'x', dmgNums: 3 })) === JSON.stringify(DEFAULT_SETTINGS));
  check('stored volume is clamped', cleanSettings({ sound: 99 }).sound === VOLUME_MAX && cleanSettings({ sound: -4 }).sound === 0);
  openSettings();
  const s0 = settings.sound;
  settingsKey('left');
  check('Left turns the sound down (and saves it)', settings.sound === s0 - 1 && JSON.parse(mem.get('archer-game:settings')!).sound === s0 - 1);
  for (let i = 0; i < 20; i++) settingsKey('right');
  check('the volume stops at its max', settings.sound === VOLUME_MAX);
  settingsKey('down'); settingsKey('left');
  check('damage numbers toggle', settings.dmgNums === false);
  const b = settingsBox(320, 180);
  settingsTap(b.x + SET_W - 10, b.y + SET_TOP + SET_ROW + 2, 320, 180);
  check('a tap on a row changes it', settings.dmgNums === true && settingsUi.sel === 1);
  settingsTap(b.x + 10, b.y + SET_TOP + (SETTING_ROWS.length - 1) * SET_ROW + 2, 320, 180);
  check('tapping DONE closes the window', !settingsUi.open);
  // from the main menu
  initMenu(() => {}, START); menu.sel = items().indexOf('settings'); menuKey('enter');
  check('the main menu opens the settings', settingsUi.open);
  menuKey('escape');
  check('Esc closes them back to the menu', !settingsUi.open && menu.open);
  menu.open = false;
  // from the Esc menu: Right past the skills column reaches the SETTINGS button
  arena();
  tap('escape'); tap('right'); tap('right');
  check('Right twice in the Esc menu selects SETTINGS', game.pause?.col === 2);
  tap('z');
  check('Z there opens the settings over the paused game', settingsUi.open && !!game.pause);
  const t0 = game.time; tap('down'); tap('escape');
  check('Esc closes the settings but stays paused', !settingsUi.open && !!game.pause && game.time === t0);
  tap('escape');
  check('a second Esc resumes', !game.pause);
  Object.assign(settings, DEFAULT_SETTINGS);
}

// --- chasing enemies keep full speed, run past you, and turn past you ---
{
  arena(1, 160); player.invuln = 999;
  const m = dummy(140); m.spd = 60; m.aggro = true; m.dir = 1;
  m.x = player.x - 40;
  step(1);
  check('a chasing enemy runs at full speed even right next to you', Math.abs(m.vx - 60) < 1e-6, `vx ${m.vx.toFixed(1)} at ${(player.x - m.x).toFixed(1)}px`);
  // it aims 3 tiles (48px) past you, so it keeps going as it closes
  m.x = player.x - 10; step(1);
  check('it runs on past you rather than stopping on you', m.vx === 60 && m.x > player.x - 10, `vx ${m.vx.toFixed(1)} x ${m.x.toFixed(1)}`);
  // once it is 3 tiles past you, it stops to turn round
  m.x = player.x + 48; m.vx = 60; step(1);
  check('three tiles past you, it stops to turn round', m.dir === 1 && m.vx === 0, `dir ${m.dir} vx ${m.vx.toFixed(1)}`);
  step(Math.ceil(CHASE_TURN / P.STEP));
  check('...then comes back at full speed', m.dir === -1 && Math.abs(m.vx + 60) < 1e-6, `vx ${m.vx.toFixed(1)}`);
  game.mobs.length = 0;
}

// --- enemies never get stuck running one way (past the sweep, at an edge) ---
{
  arena(1, 200); player.invuln = 999;
  // you slipped behind it mid-sweep: it is already past its goal, so it turns
  const m = dummy(140); m.spd = 60; m.aggro = true;
  m.x = player.x + 80; m.dir = 1; step(1);
  check('a chasing enemy already past its turn point stops to turn', m.vx === 0, `vx ${m.vx.toFixed(1)}`);
  step(Math.ceil(CHASE_TURN / P.STEP) + 1);
  check('...and heads back toward you', m.dir === -1 && m.vx < 0, `dir ${m.dir} vx ${m.vx.toFixed(1)}`);
  // you stand at the end of its platform: its turn point lies off the end,
  // so it turns there and sweeps back instead of pressing on the edge
  const [, hi] = mobBounds(m);
  player.x = hi - 6; m.x = hi - 30; m.dir = 1; m.vx = 0;
  let minX = Infinity, reached = false;
  for (let i = 0; i < 90; i++) { step(1); if (m.x >= hi - 1) reached = true; if (reached) minX = Math.min(minX, m.x); }
  check('an enemy chasing you at a platform end sweeps back from the edge', reached && minX < hi - 20, `reached ${reached} min ${minX.toFixed(1)} hi ${hi}`);
  game.mobs.length = 0;
}
