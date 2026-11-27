// Shared setup for the mechanics suite: the src imports every section uses,
// the seed, and the small helpers (arena, dummy, tap, step, check, ...).
// Imported once by mechanics.ts, which pulls in each section file in order.
//
// The order here mirrors the original single-file mechanics.ts exactly: the
// first four modules (rng, emotes, economy, world) initialize, then the seed
// is installed, then the remaining modules initialize against the seeded
// Math.random. Keeping this order keeps the seeded RNG stream identical.

export { seeded } from '../src/rng';
export { cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote } from '../src/emotes';
export { buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet } from '../src/economy';
export { areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, placeTier, type Place } from '../src/world';

// climb uses these from world; world initializes before the seed (as in the
// original), so import it here alongside the re-export above.
import { nextPlace, START } from '../src/world';

// seed Math.random before anything generates a floor
let seed = 12345;
Math.random = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

/** The n-th place up the leftmost branch from the start (1 = the start town,
 *  2 = the first floor of its first path, ...): walks the ways up in order. */
export const climb = (n: number): Place => { let p: Place = START; for (let i = 1; i < n; i++) p = nextPlace(p); return p; };

// The helpers below use these directly. Importing them here (in addition to
// the re-exports further down) gives the bundle stable bindings, so the
// helpers don't depend on the re-export aliases being linked. These sit after
// the seed so the modules initialize against the seeded Math.random, matching
// the original. Order matters: state must come before net (the state -> floor
// -> net -> state cycle).
import { game, gotoPlace, player, spawnMob } from '../src/state';
import { clearPressed, setKey } from '../src/input';
import { tick } from '../src/loop';
import { jobForLevel, recalcStats } from '../src/progress';
import { MOB_TYPES } from '../src/config';
import { closeLinks } from '../src/links';

export { ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE } from '../src/config';
export { game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH } from '../src/state';
export { LV_1_DMG, LV_100_DMG, LEVEL_SPAN, mobHp, mobDmg } from '../src/state';
export { confirmInput, confirmUi } from '../src/confirm';
export { cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor } from '../src/presence';
export { FONT_CHARS, textWidth } from '../src/font';
export { bubbleable, bubbleText, bubbleWidth, DMG_H } from '../src/dmgfont';
export { default as fontPng } from '../assets/font.png';
export { ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout } from '../src/input';
export { update } from '../src/update';
export { advance, tick } from '../src/loop';
export { CHASE_TURN } from '../src/mobai';
export { activeSkill, expBar, MAX_LEVEL, passiveBonus, PAUSE_ROWS, pauseScroll, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN } from '../src/progress';
export { surfaceYAt } from '../src/surface';
export { areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout } from '../src/floor';
export { makeShape, SHAPES } from '../src/floorshape';
export { TOWN_MIN_H } from '../src/floorframe';
export { DRAWN, hasMobArt, HURT, MOB_ART, paintMob } from '../src/mobart';
export { VARIANT_ART } from '../src/variantart';
export { MOB_GEN } from '../src/sprites';
export { miniRect, MINI_SCALE, toMini } from '../src/minimap';
export { CAM, TILE, WORLD } from '../src/config';
export { ANIM_RATE, BREATH, mobFrame } from '../src/mobanim';
export { BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg } from '../src/combat';
export { barrageTargets, cast } from '../src/skills';
export { cdSlot, delayTime, rushHolding, useTime } from '../src/castrules';
export { CASTS } from '../src/skillcasts';
export { MOB_SOUNDS } from '../src/audio';
export { GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop } from '../src/deaths';
export { fmtNum } from '../src/util';
export { BOSS, bossAlive, bossName, bossType, capAdd, hurtPlayer, quakes } from '../src/boss';
export { cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook } from '../src/look';
export { stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP } from '../src/stylist';
export { styled } from '../src/archer';
export { DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS } from '../src/towndecor';
export type { DecorKind } from '../src/types';
export { NPC_FRAMES, npcFrame, npcRows } from '../src/npcart';
export { board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests } from '../src/quests';
export { apply, clearSave, hasSave, load, save, snapshot } from '../src/save';
export { boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate } from '../src/boost';
export { canConnect, hourStamp, net, newCode, parseCode, roomId } from '../src/net';
export { activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X } from '../src/menu';
export { BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt } from '../src/tileset';
export { PROP_H, PROP_W, propAt, PROPS } from '../src/props';
export { BACKDROPS, particlesAt } from '../src/backdrop';
export { expToNext, killsToLevel, mobExp } from '../src/progress';
export { dev, devStops } from '../src/dev';
export { BASIC } from '../src/look';
export { clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS } from '../src/townlooks';
export { openStylist, STYLIST_ROWS } from '../src/stylist';
export { devInput, windowOpen } from '../src/windows';
export { addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap } from '../src/chat';
export { say } from '../src/net';
export { archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle } from '../src/archer';
export { ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet } from '../src/ghost';
export { keysKey, keysUi, KEY_ROWS } from '../src/keys';
export { pet, PET } from '../src/pets';
export { PET_KINDS, choosePet, petCustoms, petShop, clearPets, toggleCustom } from '../src/pets';
export { achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea } from '../src/achievements';
export { startRun } from '../src/save';
export { SKILLS as DEFS, startsLearned } from '../src/config';
export { clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops } from '../src/gear';
export { READY_FLASH } from '../src/state';
export { cameraTarget } from '../src/state';
export { mobBounds } from '../src/state';
export { coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods } from '../src/floormods';
export { bag, BAG_SIZE, unequip, wear } from '../src/gear';
export { STAT_KEYS } from '../src/progress';
export { generateFloor } from '../src/floor';
export { TOWN_PLANS } from '../src/townfloor';
export { corpses, DEATH_T, DEATHS, deathOf, deathPose } from '../src/deaths';
export { closeLinks, linkable, linkHeld } from '../src/links';
export { bakeDeathSheet, DEATH_FRAMES, deathFrame } from '../src/deathsheet';
export { localPose } from '../src/net';
export { applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus } from '../src/status';
export { cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX } from '../src/settings';
export type { Mob, PauseMenu, Platform, SkillKey } from '../src/types';

const results = { failures: 0 };
/** How many checks have failed so far. A function (not the raw object) so the
 *  bundle links it reliably across the split section files. */
export const failures = (): number => results.failures;
function check(name: string, cond: boolean, detail = ''): void {
  if (!cond) results.failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` (${detail})` : ''}`);
}
const KEYS = ['left', 'right', 'up', 'down', 'c', 'd', 'z', 'q', 'w', 'e', 'r', 'escape'];
const release = (): void => { KEYS.forEach((k) => setKey(k, false)); clearPressed(); };
const step = (n = 1): void => { for (let i = 0; i < n; i++) tick(); };
const tap = (k: string): void => { setKey(k, false); setKey(k, true); step(1); setKey(k, false); };
/** Let a Piercing Leap's rise-and-hold play out and land (bounded at 3s). */
const landLeap = (): void => { for (let i = 0; i < 90 && (player.liftT > 0 || !player.onGround); i++) step(1); };
const ground = (): Platform => game.floor.platforms[0];

/** Fresh Beach 1 (stage 2; stage 1 is the Harbor town) with no mobs, the player standing at x on the ground. */
function arena(level = 1, x = 100): void {
  release();
  gotoPlace(climb(2)); game.mobs = []; game.floor.spawns = [];
  player.level = level; player.job = jobForLevel(level); player.stats = { dex: 0, vit: 0, spi: 0, luk: 0 }; recalcStats(); // as if the Sage had advanced you
  for (const k of Object.keys(player.ranks) as (keyof typeof player.ranks)[]) player.ranks[k] = ['z', 'd', 'ground-q', 'ground-w', 'sa'].includes(k);
  player.mp = 999; player.hp = player.hpMax; player.face = 1; player.x = x; player.y = ground().y - player.h;
  player.vx = player.vy = 0; player.onGround = true; player.climb = null; player.dropBlock = null;
  player.casting.useT = 0; player.casting.recoverT = 0; player.casting.freeze = 0; player.cast = null; player.castT = 0; player.casting.queued = null; player.hang.t = 0;
  closeLinks();
  player.fervor = 0; player.combatT = 0; player.regenT = 0; player.invuln = 999;
  for (const k of Object.keys(player.cd) as (keyof typeof player.cd)[]) player.cd[k] = 0;
  game.pause = null;
}
function dummy(x: number, hp = 1e6): Mob {
  spawnMob({ x, y: ground().y, types: ['Garden Snail'] } as never, MOB_TYPES[0]);
  const m = game.mobs[game.mobs.length - 1];
  m.hp = m.hpMax = hp; m.vx = 0; m.spd = 0;
  return m;
}

export { check, release, step, tap, landLeap, ground, arena, dummy };
export { skillScreen, skillStatus, tabLabel, tabSkills } from '../src/skillscreen';
export { JOBS, advanceJob, canAdvance, nextJob } from '../src/progress';
export { visitSage } from '../src/sage';
