import { meteorFade } from '../src/backdrop';
import { seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, VARIANT_ART, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';
// --- key rebinding: swaps, what a physical key drives, storage, the window ---
{
  resetBinds();
  check('by default every action is on its own key', ACTIONS.every((a) => binds[a.id] === a.id && actionFor(a.id) === a.id));
  bindKey('z', 'j');
  check('a rebound key drives its action', actionFor('j') === 'z' && keyName('z') === 'J');
  check("the action's old key does nothing now", actionFor('z') === '');
  check('keys that are not actions pass through', actionFor('left') === 'left' && actionFor('escape') === 'escape');
  bindKey('c', 'j');
  check('taking a key another action had swaps them', binds.c === 'j' && binds.z === 'c' && actionFor('c') === 'z' && actionFor('j') === 'c');
  check('arrows, Enter and Esc cannot be bound', !bindKey('z', 'left') && !bindKey('z', 'enter') && !bindKey('z', 'escape'));
  check('the layout is saved', JSON.parse((globalThis as unknown as { localStorage: Storage }).localStorage.getItem('archer-game:keys')!).c === 'j');
  check('a stored layout with a key used twice falls back to the defaults', cleanBinds({ ...binds, q: 'j' }).z === 'z');
  check('a stored layout with a bad key falls back to the defaults', cleanBinds({ ...binds, q: 'enter' }).q === 'q');
  resetBinds();
  check('reset puts the defaults back', ACTIONS.every((a) => binds[a.id] === a.id));
  // the window: settings -> KEYS -> pick a row -> press a key
  openSettings(); settingsUi.sel = SETTING_ROWS.indexOf('keys'); settingsKey('enter');
  check("the settings' KEYS row opens the keys window", keysUi.open);
  settingsKey('down'); settingsKey('enter');
  check('Z on an action waits for a key', keysUi.waiting && !!capture.fn);
  settingsKey('down');
  check('arrows do nothing while waiting', keysUi.sel === 1);
  capture.fn!('k');
  check('the next key binds the action', binds.c === 'k' && !keysUi.waiting && !capture.fn);
  settingsKey('enter'); capture.fn!('escape');
  check('Esc while waiting cancels', binds.c === 'k' && !keysUi.waiting);
  settingsKey('enter'); capture.fn!('left');
  check('an arrow is refused with a note', binds.c === 'k' && keysUi.note !== '');
  keysUi.sel = KEY_ROWS - 2; settingsKey('enter');
  check('RESET restores the default layout', binds.c === 'c');
  settingsKey('escape');
  check('Esc closes the keys window back to the settings', !keysUi.open && settingsUi.open);
  settingsKey('escape');
  // in game: the rebound key's action is what the game sees
  bindKey('a', 'h');
  check('the HUD and menus label the bound key', keyName('a') === 'H' && keyName('s') === 's');
  resetBinds();
}

// --- skill art: Piercing Leap, Tempest, Cyclone Sweep and Meteor Dive have their own looks ---
{
  const ready = (): void => { for (const k of Object.keys(player.cd)) player.cd[k] = 0; player.casting.useT = 0; player.mp = 999; };
  const fxOf = (t: string): boolean => game.fx.some((f) => f.type === t);
  const air = (): void => { player.y -= 40; player.vy = 0; player.onGround = false; };
  arena(30); player.ranks['ground-e'] = true; player.ranks['ground-w'] = true; player.ranks['air-w'] = true; player.ranks.r = true;
  ready(); game.fx.length = 0; tap('e');
  check('Piercing Leap erupts spikes from the ground', fxOf('spikes') && !fxOf('rush'));
  arena(30); player.ranks['ground-w'] = true; player.ranks['air-w'] = true; ready(); air(); game.fx.length = 0; tap('w');
  check('the Cyclone Sweep whirls blades round you and spins the archer', fxOf('spin') && localPose() === 'spin');
  arena(30); player.ranks.r = true; ready(); game.fx.length = 0; tap('r');
  check('Tempest sweeps an oval of energy as the archer vanishes', fxOf('tempest') && localPose() === 'vanish' && !fxOf('muzzle'));
  step(43);
  check('...and she is back once it ends', localPose() !== 'vanish');
  arena(30); player.ranks['air-q'] = true; ready(); air(); tap('q'); step(4); // past the windup
  check('the Meteor Dive draws its dive pose', player.diving && localPose() === 'dive');
  release();
}

// --- backdrop and tile polish ---
{
  // Mushroom Grotto: the glowing beads and spores in its loam are sparse (~70% fewer than they were: 54 over these 8 tiles)
  const g = TILESETS['Mushroom Grotto'];
  let glints = 0;
  for (let v = 0; v < 8; v++) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (['#9ff3ea', '#5ad8c8'].includes(g.fill(x, y, v) ?? '')) glints++;
  check('the Mushroom Grotto loam has only a few blue glints', glints > 0 && glints <= 16, `${glints}`);
  // Starfall Observatory (and Thistledown, under the same sky): comets fade out instead of blinking off
  const pt = BACKDROPS['Starfall Observatory'].particles!;
  check('comets are meteors that flare up, then fade out to nothing before they vanish',
    pt.kind === 'meteors' && meteorFade(0) === 0 && meteorFade(0.05) === 1 && meteorFade(0.3) < meteorFade(0.15) && meteorFade(0.499) < 0.01);
  // a comet's head is drawn in one of its colours with the fade as its alpha (tails stay under 25%)
  const heads = (t: number): number[] => particlesAt(pt, t, 320, 240).filter((q) => pt.cols.includes(q.col.slice(0, 7)) && q.col.length === 9).map((q) => parseInt(q.col.slice(7), 16));
  check('...drawn fading', [0.3, 1.1, 2.7, 5.2].some((t) => heads(t).some((a) => a > 70 && a < 255)));
}
