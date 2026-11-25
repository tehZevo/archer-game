import { cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote } from '../src/emotes';
import { buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet } from '../src/economy';
import { areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place } from '../src/world';
// Mechanics checks, run with `npm test` after the smoke test. Each one is a
// short, seeded, deterministic run (a few hundred frames at most). No long
// fuzzing: if a check needs more than a second, shrink it.

// seed Math.random before anything generates a floor
let seed = 12345;
Math.random = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

/** The n-th place up the leftmost branch from the start (1 = the start town,
 *  2 = the first floor of its first path, ...): walks the ways up in order. */
const climb = (n: number): Place => { let p: Place = START; for (let i = 1; i < n; i++) p = nextPlace(p); return p; };

import { ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE } from '../src/config';
import { game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD } from '../src/state';
import { cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor } from '../src/presence';
import { textWidth } from '../src/font';
import { ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout } from '../src/input';
import { CHASE_TURN, update } from '../src/update';
import { expBar, MAX_LEVEL } from '../src/progress';
import { surfaceYAt } from '../src/surface';
import { areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, makeShape, SHAPES, TOWN_MIN_H, type Layout } from '../src/floor';
import { DRAWN, hasMobArt, HURT, MOB_ART, paintMob, RECOLOR } from '../src/mobart';
import { miniRect, MINI_SCALE, toMini } from '../src/minimap';
import { TILE, WORLD } from '../src/config';
import { ANIM_RATE, mobFrame } from '../src/mobanim';
import { BAR_SHOW, damage, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE } from '../src/combat';
import { barrageTargets, cast, cdSlot, delayTime } from '../src/skills';
import { activeSkill, STAT_GAIN, PAUSE_ROWS, pauseScroll, rank, recalcStats, skillRows, spendSkill } from '../src/progress';
import { mobLevel } from '../src/world';
import { fmtNum } from '../src/util';
import { BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes } from '../src/boss';
import { cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook } from '../src/look';
import { stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP } from '../src/stylist';
import { styled } from '../src/archer';
import { board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests } from '../src/quests';
import { apply, clearSave, hasSave, load, save, snapshot } from '../src/save';
import { boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate } from '../src/boost';
import { canConnect, hourStamp, net, newCode, parseCode, roomId } from '../src/net';
import { activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X } from '../src/menu';
import { hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt } from '../src/tileset';
import { PROP_H, PROP_W, propAt, PROPS } from '../src/props';
import { BACKDROPS, particlesAt } from '../src/backdrop';
import { expToNext, killsToLevel, mobExp } from '../src/progress';
import { dev, devStops } from '../src/dev';
import { BASIC } from '../src/look';
import { clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS } from '../src/townlooks';
import { openStylist, STYLIST_ROWS } from '../src/stylist';
import { devInput } from '../src/update';
import { addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap } from '../src/chat';
import { say } from '../src/net';
import { archerFrame, climbPhase, GRIDS, POSE_FPS } from '../src/archer';
import { ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet } from '../src/ghost';
import { keysKey, keysUi, KEY_ROWS } from '../src/keys';
import { pet, PET } from '../src/pets';
import { achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea } from '../src/achievements';
import { startRun } from '../src/save';
import { SKILLS as DEFS, startsLearned } from '../src/config';
import { clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops } from '../src/gear';
import { READY_FLASH } from '../src/state';
import { cameraTarget } from '../src/state';
import { mobBounds } from '../src/state';
import { coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods } from '../src/floormods';
import { bag, BAG_SIZE, unequip, wear } from '../src/gear';
import { STAT_KEYS } from '../src/progress';
import { generateFloor, TOWN_PLANS } from '../src/floor';
import { corpses, DEATH_T, DEATHS, deathOf, deathPose } from '../src/deaths';
import { localPose } from '../src/net';
import { applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus } from '../src/status';
import { cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX } from '../src/settings';
import type { Mob, PauseMenu, Platform } from '../src/types';

let failures = 0;
function check(name: string, cond: boolean, detail = ''): void {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` (${detail})` : ''}`);
}
const KEYS = ['left', 'right', 'up', 'down', 'c', 'd', 'z', 'q', 'w', 'e', 'r', 'escape'];
const release = (): void => { KEYS.forEach((k) => setKey(k, false)); clearPressed(); };
const step = (n = 1): void => { for (let i = 0; i < n; i++) { update(P.STEP); clearPressed(); } };
const tap = (k: string): void => { setKey(k, false); setKey(k, true); step(1); setKey(k, false); };
const ground = (): Platform => game.floor.platforms[0];

/** Fresh Beach 1 (stage 2; stage 1 is the Harbor town) with no mobs, the player standing at x on the ground. */
function arena(level = 1, x = 100): void {
  release();
  gotoPlace(climb(2)); game.mobs = []; game.floor.spawns = [];
  player.level = level; player.stats = { dex: 0, vit: 0, spi: 0, luk: 0 }; recalcStats();
  for (const k of Object.keys(player.ranks) as (keyof typeof player.ranks)[]) player.ranks[k] = k === 'AC' ? 0 : ['Z', 'C', 'D', 'Q', 'W', 'SA'].includes(k) ? 1 : 0;
  player.mp = 999; player.hp = player.hpMax; player.face = 1; player.x = x; player.y = ground().y - player.h;
  player.vx = player.vy = 0; player.onGround = true; player.climb = null; player.dropBlock = null;
  player.useT = 0; player.recoverT = 0; player.cast = null; player.castT = 0; player.combo = 0; player.queued = null; player.hangT = 0;
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

// --- physics: airborne bodies never pass through a platform surface ---
{
  const walk = (): Platform[] => game.floor.platforms.filter((p) => !p.inner && !p.ground);
  const r = (a: number, b: number): number => a + Math.random() * (b - a);
  let through = 0, trials = 0;
  for (const n of [1, 2, 4]) {
    gotoPlace(climb(n)); game.mobs = []; game.floor.spawns = [];
    const slopes = game.floor.platforms.filter((p) => p.slope);
    for (let k = 0; k < 120 && slopes.length; k++) {
      trials++; release();
      const s = slopes[Math.floor(Math.random() * slopes.length)];
      player.x = s.x + r(-40, 56); player.y = s.y - r(0, 40) - player.h;
      player.vx = r(-300, 300); player.vy = r(-320, 670);
      player.onGround = false; player.climb = null; player.dropBlock = null; player.useT = 1;
      for (let i = 0; i < 10; i++) {
        const pf = player.y + player.h, px = player.x;
        step(); player.useT = 1;
        if (player.onGround || player.climb) break;
        const f = player.y + player.h, x = player.x;
        const crossed = walk().some((p) => {
          let above = false;
          for (let j = 0; j <= 32; j++) {
            const t = j / 32, sx = px + (x - px) * t, sf = pf + (f - pf) * t;
            if (sx < p.x || sx >= p.x + p.w) { above = false; continue; }
            const d = sf - surfaceYAt(p, sx);
            if (d <= 0) above = true; else if (above && d > 0.5) return true;
          }
          return false;
        });
        if (crossed) { through++; break; }
      }
    }
  }
  check('falling/jumping never passes through slopes or ledges', through === 0, `${through}/${trials}`);
}

// --- physics: walking over every slope shape tracks the surface ---
{
  let bad = 0;
  for (const kind of SHAPES) for (const dir of ['right', 'left']) {
    release(); gotoPlace(climb(2)); game.mobs = []; game.floor.spawns = [];
    const shape = makeShape(kind, 64, 400, 10);
    game.floor.platforms = [...shape.tiles];
    const startX = dir === 'right' ? 70 : 64 + shape.w - 6;
    const first = shape.tiles.filter((t) => t.x <= startX && startX < t.x + 16).reduce((a, b) => (b.y < a.y ? b : a));
    player.x = startX; player.y = surfaceYAt(first, startX) - player.h; player.vx = player.vy = 0;
    player.onGround = true; player.climb = null; player.useT = 0;
    setKey(dir, true);
    let err = 0, air = 0;
    for (let f = 0; f < 200 && player.x > 66 && player.x < 64 + shape.w - 4; f++) {
      step();
      const col = shape.tiles.filter((t) => t.x <= player.x && player.x < t.x + 16);
      err = Math.max(err, Math.abs(player.y + player.h - Math.min(...col.map((t) => surfaceYAt(t, player.x)))));
      if (!player.onGround) air++;
    }
    setKey(dir, false);
    if (err > 0.5 || air) bad++;
  }
  check('walking over slopes stays on the surface', bad === 0, `${bad} bad walks`);
}

// --- physics: down-jump then Glide never falls back through the dropped platform ---
{
  let through = 0, trials = 0;
  for (const n of [1, 2, 4]) {
    gotoPlace(climb(n)); game.mobs = []; game.floor.spawns = [];
    const tops = game.floor.platforms.filter((p) => !p.ground && !p.inner && !p.slope).slice(0, 8);
    for (const t of tops) for (const k of [2, 5]) {
      trials++; release();
      player.x = t.x + 8; player.y = t.y - player.h; player.vx = player.vy = 0; player.onGround = true;
      player.climb = null; player.dropBlock = null; player.useT = 0; player.mp = 999; player.cd.D = 0; player.cd.C = 0;
      step();
      setKey('down', true); setKey('c', true); step(); release();
      step(k);
      tap('d');
      for (let i = 0; i < 60 && !player.onGround; i++) {
        const prev = player.y + player.h, dropping = player.dropBlock !== null, x0 = player.x;
        step();
        if (dropping || player.onGround || player.climb) continue;
        const feet = player.y + player.h;
        const hit = game.floor.platforms.find((p) => !p.inner && p.block === t.block && player.x >= p.x && player.x < p.x + p.w &&
          prev < surfaceYAt(p, x0) - 0.01 && feet > surfaceYAt(p, player.x) + 0.01);
        if (hit) { through++; break; }
      }
    }
  }
  check('down-jump + Glide never falls through from above', through === 0, `${through}/${trials}`);
}

// --- combat: Twin Shot draws, then hits the 2 closest enemies twice ---
{
  arena();
  const far = dummy(190), near = dummy(130), mid = dummy(160);
  tap('z');
  const duringDraw = near.hp === 1e6 && mid.hp === 1e6;
  step(Math.ceil(P.Z_WINDUP / P.STEP));
  const firstHit = near.hp < 1e6 && mid.hp < 1e6;
  const one = 1e6 - near.hp;
  step(5);
  check('Twin Shot: nothing lands during the bow-draw windup', duringDraw);
  check('Twin Shot: first hit lands on release', firstHit);
  check('Twin Shot: the whole animation is longer than before (0.24s)', P.Z_CAST > 0.35);
  check('Twin Shot: closest two take both hits, the third none', near.hp < 1e6 - one * 1.5 && mid.hp < 1e6 && far.hp === 1e6);
}

// --- balance: a Lv.1 Garden Snail takes a few Twin Shots ---
{
  let casts = 0;
  for (let run = 0; run < 3; run++) {
    arena();
    const m = dummy(140, MOB_TYPES[0].hp);
    let c = 0;
    while (game.mobs.includes(m) && c < 20) { player.cd.Z = 0; player.useT = 0; tap('z'); step(8); c++; }
    casts += c;
  }
  const avg = casts / 3;
  check('Lv.1 Garden Snail takes 4-7 Twin Shots', avg >= 4 && avg <= 7, `avg ${avg}`);
}

// --- links: W only works right after Sky Toss, once ---
for (const [lvl, upgraded] of [[12, false], [20, true]] as const) {
  const name = upgraded ? 'Sky Assault' : 'Skyfall Volley';
  arena(lvl);
  player.ranks.W = 1; if (upgraded) player.ranks.AB = 1;
  const m = dummy(125);
  const mp0 = player.mp;
  tap('w');
  check(`${name}: does nothing without Sky Toss`, player.mp === mp0 && m.hp === 1e6);
  setKey('down', true); tap('q'); setKey('down', false); step(12);
  const hp0 = m.hp; tap('w'); step(20);
  check(`${name}: hits after Sky Toss`, m.hp < hp0);
  step(15); player.cd.W = 0;
  const hp1 = m.hp; tap('w'); step(20);
  check(`${name}: can't be reused until the next Sky Toss`, m.hp === hp1);
}
{
  arena(12); player.ranks.W = 1;
  const m = dummy(125);
  setKey('down', true); tap('q'); setKey('down', false); step(12);
  const hp0 = m.hp; tap('z'); step(20);
  check('Z during the link window casts the link skill', m.hp < hp0 && player.combo === 0);
}
{
  arena(12); player.ranks.W = 1;
  dummy(125);
  setKey('down', true); tap('q'); setKey('down', false);
  tap('w'); // pressed mid Sky Toss
  let fired = -1;
  for (let i = 0; i < 30 && fired < 0; i++) { const c = player.cast; step(); if (player.cast === 'shoot' && c !== 'shoot') fired = i; }
  check('a link pressed during Sky Toss fires when it ends', fired > 0 && fired < 20, `frame ${fired}`);
}
{
  arena(20); player.ranks.W = 1; player.ranks.AB = 1;
  const m = dummy(125);
  setKey('down', true); tap('q'); setKey('down', false); step(12);
  const x0 = player.x, y0 = player.y, hp0 = m.hp;
  tap('w');
  const up = y0 - player.y;
  let hover = 0;
  for (let i = 0; i < 45; i++) { const y = player.y; step(); if (player.y === y && !player.onGround) hover++; }
  check('Sky Assault warps straight up without moving sideways', up > 0 && player.x === x0, `up ${up.toFixed(1)} dx ${(player.x - x0).toFixed(2)}`);
  check('Sky Assault hovers most of a second, then lands', hover >= 20 && hover <= 28 && player.onGround, `hover ${hover} frames`);
  check('Sky Assault hits', m.hp < hp0);
  check('Sky Assault always rises the same fixed height', Math.abs(up - P.BARRAGE_UP) < 1, `up ${up.toFixed(1)}`);
}
{
  // Sky Assault is gated by the link window: one use per Sky Toss, not spammed.
  arena(20); player.ranks.W = 3; player.ranks.AB = 3; // Sky Assault is the W upgrade: maxing W masters it
  dummy(125);
  setKey('down', true); tap('q'); setKey('down', false); step(12);
  check('the Sky Toss opens the link window', player.combo > 0);
  tap('w');
  check('the first Sky Assault fires', player.cast === 'barrage' && player.hangT > 0);
  check('...and it consumes the window', player.combo === 0);
  player.hangT = 0; player.cast = null; player.castT = 0; player.useT = 0;
  tap('w');
  check('a second Sky Assault waits for a fresh Sky Toss', player.cast !== 'barrage');
}

{
  // Sky Toss: slide forward pushing enemies along; the strike and launch land as the slide ends
  arena(1);
  const m = dummy(130);
  const x0 = player.x;
  tap('q');
  let launchedEarly = false, mx = m.x, carried = false, hits = 0, hp = m.hp;
  for (let i = 0; i < 9 && player.rushT > 0; i++) {
    step(1);
    if (m.hp < hp) { hits++; hp = m.hp; }
    if (m.airTime > 0 && player.rushT > 0) launchedEarly = true;
    if (m.x > mx + 1) carried = true;
    mx = m.x;
  }
  check('Sky Toss slides forward', player.x - x0 > 30, `dx ${(player.x - x0).toFixed(1)}`);
  check('Sky Toss pushes the enemies it runs into along with you', carried && m.x > 130);
  check('Sky Toss launches nothing until the slide ends', !launchedEarly);
  check('the Sky Toss charge hits each enemy it scoops up, once', hits === 1, `${hits} hits, dx ${(player.x - x0).toFixed(1)}, rushT ${player.rushT.toFixed(2)}`);
  step(2);
  check('Sky Toss strikes as the slide ends (the launch is on W now)', m.hp < 1e6 && m.airTime === 0);
}
{
  // Sky Toss travels its fixed distance even when an enemy slows it mid-slide
  arena(1);
  const m = dummy(player.x + 20);
  const x0 = player.x;
  tap('q');
  step(3);              // mid-slide, having run into the enemy
  check('contact slows the slide', Math.abs(player.vx) < P.RUSH_SLIDE_V, `vx ${player.vx.toFixed(1)}`);
  check('...but the slide is not over yet', player.rushT > 0);
  step(20);
  check('the slide ends having covered its distance', player.rushT === 0 && player.x - x0 >= P.RUSH_DIST - 4, `dx ${(player.x - x0).toFixed(1)}`);
  game.mobs.length = 0;
}

{
  // Sky Toss stops at the edge of the platform instead of sliding off it
  arena(1);
  const g = ground(), w0 = g.w;
  g.w = 140; player.x = 120;
  tap('q'); step(14);
  const x = player.x, on = player.onGround;
  g.w = w0;
  check('Sky Toss stops at a platform edge', on && x <= 140, `x ${x.toFixed(1)}`);
}

// --- enemies: waves never exceed a zone's cap; mobs stay on their platform ---
{
  let over = 0;
  for (const n of [1, 2, 4]) {
    release(); gotoPlace(climb(n)); player.x = 4; player.invuln = 999;
    [...game.mobs].slice(0, 3).forEach(killMob);
    step(Math.round((P.WAVE_EVERY + 1) / P.STEP));
    for (const z of game.floor.spawns) if (game.mobs.filter((m) => m.spawn === z).length > (z.cap ?? 1) + P.HEAT_EXTRA) over++;
  }
  check('enemy waves never exceed a zone cap (plus the overflow from a farmed platform)', over === 0, `${over} zones over`);
}

// --- spread spawns: farming one platform moves its enemies to the others ---
{
  release(); gotoPlace(climb(2)); player.invuln = 999;
  game.mobs = [];
  const zs = game.floor.spawns.slice(0, 3);
  game.floor.spawns = zs; zs.forEach((z) => { z.cap = 2; z.heat = 0; });
  spawnWave();
  check('a wave fills every zone to its cap', zs.every((z) => game.mobs.filter((m) => m.spawn === z).length === 2));
  const hot = zs[0];
  for (let i = 0; i < 6; i++) { const m = game.mobs.find((q) => q.spawn === hot); if (m) killMob(m); else { spawnMob(hot, MOB_TYPES[0]); killMob(game.mobs[game.mobs.length - 1]); } }
  check('kills heat their platform', hot.heat === 6);
  spawnWave();
  const on = (z: typeof hot): number => game.mobs.filter((m) => m.spawn === z).length;
  check('a farmed platform refills less', on(hot) === 0, `${on(hot)}`);
  check('...and its enemies turn up on the other platforms', on(zs[1]) + on(zs[2]) === 6, `${on(zs[1])}+${on(zs[2])}`);
  check('heat cools by half each wave', hot.heat === 3);
  game.mobs = []; spawnWave(); game.mobs = []; spawnWave();
  check('once it cools the platform fills as usual', on(hot) === 2 && hot.heat! < P.HEAT_HOT);
  game.mobs = [];
}

// --- regen: 5% every 5s, no HP regen in combat; frozen while paused ---
{
  arena(); player.invuln = 999;
  player.hp = 50; player.mp = 10; player.regenT = 0;
  step(Math.round(4.9 / P.STEP));
  const before = player.hp;
  step(Math.round(0.2 / P.STEP));
  check('HP and MP regen once every 5s', before === 50 && player.hp > 50 && player.mp > 10);
  const hp = player.hp;
  cast('Z');
  step(Math.round(5.1 / P.STEP));
  check('no HP regen within 5s of attacking', player.hp === hp);
  game.pause = { col: 0, row: 0 };
  const t = player.regenT; step(30);
  check('pause menu freezes the game', player.regenT === t);
  game.pause = null;
}

// --- progression: an upgrade starts at rank 1, not its base skill's rank ---
{
  arena(30);
  player.ranks.Z = 3; player.sp = 1;
  spendSkill('S');
  check('upgrading Twin Shot to Shell Barrage starts at rank 1', activeSkill('Z').key === 'S' && rank('Z').level === 1, `rank ${rank('Z').level}`);
  check('movement skills are never offered for ranks', !skillRows().some((r) => (r.key === 'C' || r.key === 'D') && r.action));
}

// --- an upgrade needs its base skill maxed ---
{
  arena(30);
  player.ranks.Z = 2; player.sp = 1;
  const row = skillRows().find((r) => r.key === 'S');
  check('an upgrade shows before its base is maxed, but locked with a reason', !!row && row.action === '' && !!row.need?.includes('Twin Shot'));
  check('...and an SP can\'t take it', !spendSkill('S') && player.ranks.S === 0 && player.sp === 1);
  player.ranks.Z = 3;
  check('with the base maxed it can be taken', spendSkill('S') && activeSkill('Z').key === 'S');
}

// --- ghosts: few rich packets, smooth playback ---
{
  // sender walks right at 60 px/s for 2s, recording every frame (60 fps); its clock is 5000ms ahead
  const rec = new Recorder(), tr = newTrack(), skew = 5000, latency = 80;
  const packets: Packet[] = [];
  for (let f = 0; f <= 120; f++) {
    const t = f * (1000 / 60);
    const p = rec.tick(t + skew, 100 + t * 0.06, 200, 60, 0, f > 60 ? 'jump' : 'walk', 1);
    if (p) { packets.push(p); ingest(tr, p, t + latency); }
  }
  const rate = packets.length / 2;
  check('ghost packets go out ~3x a second, several samples each', rate >= 3 && rate <= 4 && packets.slice(1).every((p) => p.s.length >= 2), `${rate}/s`);
  // playback at local time 1500ms shows where the sender was INTERP_MS + latency earlier
  const at = (t: number): number => view(tr, t)!.x;
  const expect = 100 + (1500 - INTERP_MS - latency) * 0.06;
  check('ghost playback lags by the interpolation delay', Math.abs(at(1500) - expect) < 3, `x ${at(1500).toFixed(1)} want ~${expect.toFixed(1)}`);
  const steps = [0, 1, 2, 3, 4].map((i) => at(1400 + i * 16));
  check('ghost motion is smooth between samples (no 100ms steps)', steps.every((x, i) => i === 0 || (x > steps[i - 1] && x - steps[i - 1] < 2)));
  check('ghost pose plays back with the motion', view(tr, 600)!.pose === 'walk' && view(tr, 2000)!.pose === 'jump');
  check('send interval is fewer than 10 updates/s', SEND_MS > 100);
}

{
  // The air forms show the key they're used on (Q, W, E), not AD/MS/PV.
  arena(60);
  player.ranks.Q = 1; player.ranks.W = 1; player.ranks.E = 1;
  const rows = skillRows();
  const ad = rows.find((r) => r.key === 'AD'), ms = rows.find((r) => r.key === 'MS'), pv = rows.find((r) => r.key === 'PV');
  check('Air Dive shows on the Q key', !!ad && ad.slot === 'Q', ad?.slot);
  check('Midair Spin shows on the W key', !!ms && ms.slot === 'W', ms?.slot);
  check('Plunging Volley shows on the E key', !!pv && pv.slot === 'E', pv?.slot);
}
// --- a skill's prerequisite must be mastered before it unlocks ---
{
  arena(60);
  player.ranks.Q = 1; player.ranks.W = 1;
  const ad = skillRows().find((r) => r.key === 'AD');
  check('Air Dive is locked until Sky Toss is mastered', !!ad && ad.action === '' && !!ad.need?.includes('Sky Toss'), ad?.need);
  player.ranks.Q = 3;
  const ad2 = skillRows().find((r) => r.key === 'AD');
  check('...and unlocks once Sky Toss is at max rank', !!ad2 && ad2.action.startsWith('Learn'));
  const ms = skillRows().find((r) => r.key === 'MS');
  check('Midair Spin is locked until Sky Assault is mastered', !!ms && ms.action === '' && !!ms.need?.includes('Sky Assault'), ms?.need);
  player.ranks.AB = 3;
  const ms2 = skillRows().find((r) => r.key === 'MS');
  check('...and unlocks once Sky Assault is at max rank', !!ms2 && ms2.action.startsWith('Learn'));
}
// --- branching upgrades: the slots that still branch (Z, W) ---
{
  arena(30);
  player.ranks.Z = 3; player.sp = 2;
  const offered = skillRows().map((r) => r.key);
  check('Z offers Shell Barrage', offered.includes('S'));
  check('the retired branches are not offered', !offered.includes('BS') && !offered.includes('VS') && !offered.includes('RA'));
  spendSkill('S');
  check('taking Shell Barrage binds it to Z at rank 1', activeSkill('Z').key === 'S' && rank('Z').level === 1, `rank ${rank('Z').level}`);
  check('Shell Barrage is the only offer on Z', skillRows().filter((r) => r.slot === 'Z' && r.key !== 'Z').length === 1);
}
{
  arena(30); player.ranks.S = 1;
  const m = dummy(140);
  tap('z'); step(10);
  check('Shell Barrage fires a burst that stuns ahead', m.hp < 1e6 && player.face === 1);
}
{
  // Sky Toss stays the launcher on Q; Sky Assault is W's upgrade
  arena(20); player.ranks.Q = 1; player.ranks.W = 1;
  const m = dummy(140);
  tap('q'); step(14);
  check('Sky Toss hits the enemy ahead and leaves it on the ground', m.hp < 1e6 && m.airTime === 0);
  const hp0 = m.hp; tap('w'); step(15);
  check('the rush opens the link window, and W launches and shoots it', m.hp < hp0 && m.airTime > 0);
  arena(15); player.ranks.W = 3; player.ranks.AB = 3; // Sky Assault is the W upgrade: maxing W masters it
  check('W offers Sky Assault as its upgrade', activeSkill('W').key === 'AB');
}
{
  // Air Dive: Q's air form plunges down and rolls into the ground rush
  arena(20); player.ranks.Q = 1; player.ranks.AD = 1;
  tap('c'); step(6);
  const y0 = player.y;
  tap('q'); step(2);
  check('Air Dive plunges you down and forward', player.y > y0 + 4 && player.vx !== 0, `dy ${(player.y - y0).toFixed(1)}`);
  step(24);
  check('the dive lands and rolls into the ground rush', player.onGround && !player.diving);
  // from higher up: the landing frame itself starts the rush, a real one (it strikes)
  arena(20); player.ranks.Q = 1; player.ranks.AD = 1;
  const m = dummy(180);
  player.y -= 60; player.onGround = false; player.vy = 0;
  tap('q');
  let landed = -1, rushing = -1;
  for (let i = 0; i < 30 && rushing < 0; i++) {
    step(1);
    if (landed < 0 && player.onGround) landed = i;
    if (player.onGround && player.rushT > 0) rushing = i;
  }
  check('the rush starts the moment the dive lands', landed >= 0 && rushing === landed, `landed ${landed} rush ${rushing}`);
  step(20);
  check('...and its strike lands, opening the link window', m.hp < 1e6 && player.combo > 0);
}
{
  // Midair Spin: W's air form sweeps the enemies around you
  arena(20); player.ranks.Q = 1; player.ranks.W = 1; player.ranks.MS = 1;
  const m = dummy(140);
  tap('c'); step(8);
  const hp0 = m.hp; tap('w'); step(4);
  check('Midair Spin sweeps the enemies around you in the air', m.hp < hp0 && m.airTime === 0, `hp ${m.hp}`);
}

{
  // Spike Lift lifts you steadily (no snappy pop) to about a jump's height
  arena(10); player.ranks.E = 1;
  tap('e');
  const ys: number[] = [];
  for (let i = 0; i < 30 && !(i > 2 && player.onGround); i++) { ys.push(player.y); step(1); }
  const y0 = ground().y - player.h, peak = y0 - Math.min(...ys), firstStep = ys[0] - ys[1];
  check('Spike Lift rises about a jump\'s height', peak > 30 && peak < 50, `peak ${peak.toFixed(1)}`);
  check('...at a steady pace, slower than a jump\'s pop', firstStep < 300 * P.STEP && firstStep > 0, `first step ${firstStep.toFixed(1)}px`);
}
{
  // Sky Assault -> E: Plunging Volley cuts the hover short instead of waiting it out
  arena(30); player.ranks.Q = 1; player.ranks.W = 3; player.ranks.AB = 3; player.ranks.E = 1; player.ranks.PV = 1;
  dummy(130);
  tap('q'); step(14); tap('w'); step(3);
  check('Sky Assault hovers', player.hangT > 0 && !player.onGround, `hangT ${player.hangT.toFixed(2)}`);
  tap('e');
  check('E fires straight out of the hover', player.hangT === 0 && player.cast === 'barrage' && player.useT > 0);
}
{
  // Sky Assault -> R: the hover's end opens the link window for Tempest
  arena(30); player.ranks.Q = 1; player.ranks.AB = 3; player.ranks.R = 1;
  dummy(130);
  tap('q'); step(14); tap('w');
  step(40); // the 0.8s hover plays out and you drop back to the ground
  check('the Sky Assault hover ends on the ground', player.onGround && player.hangT <= 0,
    `onGround ${player.onGround} hangT ${player.hangT.toFixed(2)}`);
  check('landing the assault opens the link window', player.assaultLinkT > 0, `t ${player.assaultLinkT.toFixed(2)}`);
  tap('r');
  check('Tempest links out of the landed Sky Assault', player.cast === 'shoot' && player.castT > 0,
    `cast ${player.cast} castT ${player.castT.toFixed(2)}`);
  check('the linked Tempest consumes the window', player.assaultLinkT <= 0, `t ${player.assaultLinkT.toFixed(2)}`);
}
{
  // Q rushes chain into Z: pressed mid-slide, Twin Shot fires as the slide ends
  arena(20); player.ranks.Q = 1; player.ranks.W = 0;
  dummy(200);
  tap('q'); step(2); tap('z');
  check('Z pressed during the rush waits for it', player.queued === 'Z' && player.cast === 'rush');
  let fired = -1;
  for (let i = 0; i < 30 && fired < 0; i++) { step(1); if (player.cast === 'shoot') fired = i; }
  check('...and fires as soon as the slide ends, with no use-time wait', fired >= 0 && player.rushT <= 0, `after ${fired} frames`);
  arena(20); player.ranks.Q = 1; player.ranks.W = 0;
  tap('q'); for (let i = 0; i < 30 && (player.rushT > 0 || player.cast === 'rush'); i++) step(1);
  check('right after the rush, Z fires at once too', player.useT > 0 && (tap('z'), player.cast === 'shoot'));
  // the chain skips the ending lag once: a second Z right after is a fresh
  // shot (its own use time), not a free extra use while the window is open
  arena(20); player.ranks.Q = 1; player.ranks.W = 0;
  dummy(200);
  tap('q'); for (let i = 0; i < 30 && (player.rushT > 0 || player.cast === 'rush'); i++) step(1);
  tap('z'); step(1);
  check('the chained Z consumes the link window', player.combo === 0);
  const cast1 = player.cast;
  tap('z');
  check('a second Z right after is a fresh shot, not a free extra', player.cast === 'shoot' && cast1 === 'shoot');
}
{
  // Level-based miss rate: 5% per level the target is above the attacker,
  // the same in reverse; applies to shots and to contact hits alike.
  check('an even match never misses', missChance(10, 10) === 0);
  check('each level above adds 5%', missChance(10, 12) === 0.1 && missChance(10, 11) === 0.05);
  check('being above the target misses nothing', missChance(10, 8) === 0);
  check('the rate caps at 75%', missChance(1, 100) === 0.75);
  arena(10);
  const m = dummy(140);
  const roll = (r: number): boolean => {
    m.hp = 1e6; const saved = Math.random; Math.random = () => r; damage(m, 1); Math.random = saved;
    return m.hp < 1e6;
  };
  m.level = 10;
  check('a shot at an even-levelled enemy lands on any roll', roll(0.99));
  m.level = 12; // two above: 10% miss
  check('a 10% roll at two levels above misses', !roll(0.05) && roll(0.15));
  m.level = 40;
  check('the cap bites at thirty levels up', !roll(0.7) && roll(0.8));
  check('a miss still wakes the enemy', (m.hp = 1e6, roll(0.01), m.aggro === true));
}
{
  // the mobs' contact hits miss the same way
  arena(20);
  player.invuln = 0;
  const saved = Math.random; Math.random = () => 0.05;
  check('a mob two levels below the archer misses on a 10% roll', !hurtPlayer(10, 0, 18) && player.hp === player.hpMax);
  Math.random = saved;
  player.invuln = 0;
  check('...and lands when the roll clears', hurtPlayer(10, 0, 18) && player.hp === player.hpMax - 10);
  player.hp = player.hpMax; player.invuln = 0;
  check('a mob two levels above lands on any roll', hurtPlayer(10, 0, 22) && player.hp === player.hpMax - 10);
  // Echo Shot (passive): the shadow archer fires alongside you, doubling the
  // arrows every attack fires, permanently, once bought with SP. No timer.
  arena(20); player.ranks.Z = 1;
  check('Twin Shot fires two arrows with no Echo Shot', rank('Z').hits === 2);
  player.ranks.ES = 1;
  check('Echo Shot doubles Twin Shot\'s arrows', rank('Z').hits === 4, `${rank('Z').hits}`);
  player.ranks.Z = 3;
  check('...and it scales with the skill\'s own rank', rank('Z').hits === 4, `${rank('Z').hits}`);
  player.ranks.ES = 3;
  check('Echo Shot stays doubled at max rank', rank('Z').hits === 4, `${rank('Z').hits}`);
  check('Echo Shot unlocks at Lv.60 and is a passive', SKILLS.ES.minLevel === 60 && SKILLS.ES.passive === true && SKILLS.ES.maxLevel === 3);
  player.ranks.ES = 0;
  check("a passive's bonus is one lot of arrows until learned", rank('Z').hits === 2);
  arena(20); player.ranks.Z = 1; player.ranks.ES = 2;
  check('the shadow doubles a mid-air Plunging Volley too', rank('PV').hits === 4, `${rank('PV').hits}`);
}
// --- Electric Blitz: Q's charged upgrade ---
{
  arena(20); player.ranks.Q = 3; player.ranks.EB = 1;
  check('Electric Blitz replaces Sky Toss on Q', activeSkill('Q').key === 'EB');
  check('it starts with two charges', player.blitzCharges === P.BLITZ_MAX);
  check('the blitz cools down for 3s', SKILLS.EB.cd === 3);
  const m = dummy(140);
  const RUSH = 22; // the whole slide, from cast to the strike at its end
  tap('q'); step(RUSH);
  check('the blitz spends a charge and carries the enemy', player.blitzCharges === 1 && m.hp < 1e6,
    `charges ${player.blitzCharges} hp ${m.hp}`);
  step(90); // the 3s cooldown clears
  tap('q'); step(RUSH);
  check('the second charge works', player.blitzCharges === 0 && m.hp < 1e6,
    `charges ${player.blitzCharges} hp ${m.hp}`);
  tap('q'); step(1);
  check('with no charges Q does nothing', player.blitzCharges === 0 && player.rushT === 0,
    `charges ${player.blitzCharges} rushT ${player.rushT.toFixed(2)}`);
  check('...and no ready-glow flashes (nothing came off cooldown)', player.readyT.Q === 0 && player.cd.Q > 0, `cd ${player.cd.Q.toFixed(1)}`);
  for (let i = 0; i < P.BLITZ_CHARGE_T * 30 + 2 && player.blitzCharges === 0; i++) step(1);
  check('a charge recharges after 10s', player.blitzCharges === 1, `charges ${player.blitzCharges}`);
  check('the recharged charge flashes the icon', player.readyT.Q > 0);
  player.blitzCharges = 1; player.blitzT = 3; player.combo = 1; player.comboT = 1; player.ranks.W = 1; player.useT = 0;
  cast('W');
  check('a linked skill speeds up the charge filling (it never sets it back)', player.blitzT === 4, `blitzT ${player.blitzT}`);
}

// --- Equipment: a weapon and an armor piece ---
{
  arena(10); player.ranks.Z = 1;
  clearGear();
  check('you start with nothing equipped', gear.weapon === null && gear.armor === null);
  check('an empty slot leaves damage and damage taken unchanged', gearDmg() === 1 && gearSoak() === 0);

  const bow = gearFor('weapon', 10);
  check('gear is named by the level it is made for', bow.name === 'Long Bow' && bow.lvl === 10, bow.name);
  check('a Lv.10 bow adds 30% to every hit', equip(bow) && Math.abs(gearDmg() - 1.30) < 0.001, `x${gearDmg().toFixed(3)}`);
  const war0 = player.war;
  dummy(140); game.dmgNums.length = 0;
  tap('z'); step(12);
  const hit = game.dmgNums[game.dmgNums.length - 1];
  check('the bow multiplies the arrow that lands', hit.v > war0 * 1.29, `hit ${hit.v}`);

  check('a weaker bow goes in the bag, leaving the stronger one on', equip(gearFor('weapon', 4)) && gear.weapon?.lvl === 10 && bag.length === 1 && bag[0].lvl === 4);
  const better = gearFor('weapon', 20);
  check('a stronger bow goes on, the old one into the bag', equip(better) && gear.weapon?.name === 'Yew Bow' && bag[1]?.name === 'Long Bow' && bag[1].lvl === 10, gear.weapon?.name);
  check('wearing a spare swaps it with the bow you had on', wear(1) && gear.weapon?.lvl === 10 && bag[1].lvl === 20);
  check('taking a piece off puts it in the bag', unequip('weapon') && gear.weapon === null && bag.length === 3);
  wear(2); // the Yew Bow back on
  while (bag.length < BAG_SIZE) equip(gearFor('armor', 1));
  equip(gearFor('armor', 2)); bag.pop(); // armor on, one bag slot free again
  equip(gearFor('weapon', 3));
  check('with the bag full, a lesser piece is left where it lies', !equip(gearFor('weapon', 3)) && bag.length === BAG_SIZE);
  check('...but an upgrade still goes on', equip(gearFor('weapon', 25)) && gear.weapon?.lvl === 25);
  // in the Esc menu the bag sits under the stats: Z wears a spare, X bins it
  clearGear(); equip(gearFor('weapon', 20)); equip(gearFor('weapon', 7));
  tap('escape'); game.pause!.col = 0; game.pause!.row = STAT_KEYS.length + 2;
  tap('z');
  check('Z on a spare in the Esc menu puts it on', gear.weapon?.lvl === 7 && bag[0]?.lvl === 20);
  tap('x');
  check('X on a spare throws it away', bag.length === 0 && gear.weapon?.lvl === 7 && !!game.pause);
  tap('escape');
  clearGear(); equip(better);

  const plate = gearFor('armor', 30);
  check('armor soaks a share of what you take (capped)', equip(plate) && gearSoak() === 0.35, `soak ${gearSoak()}`);
  player.invuln = 0;
  hurtPlayer(100, undefined, player.level);
  check('a 100-damage hit costs 65 with that armor on', player.hp === player.hpMax - 65, `hp ${player.hp}`);

  // a kill can leave a piece behind, and walking over it puts it on
  clearGear();
  const slain = dummy(100);
  for (let i = 0; i < 80 && gearDrops.length === 0; i++) { slain.dead = false; killMob(slain); slain.hp = 1e6; }
  check('a defeated enemy can leave gear where it fell', gearDrops.length > 0 && gearDrops[0].item.lvl === slain.level);
  const d = gearDrops[0];
  player.x = d.x; player.y = d.y - player.h; player.onGround = true;
  step(1);
  check('walking over it equips it', gear[d.item.kind] !== null && gearDrops.length === 0);
  // a piece left lying is gone once you leave the floor (like coins)
  for (let i = 0; i < 80 && gearDrops.length === 0; i++) { slain.dead = false; killMob(slain); slain.hp = 1e6; }
  const had = gearDrops.length > 0;
  gotoPlace(climb(3)); step(1);
  check('gear left on a floor does not follow you to the next', had && gearDrops.length === 0, `${gearDrops.length} left`);
  arena(10);

  const mem: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
  clearGear(); equip(gearFor('weapon', 20)); equip(gearFor('armor', 34)); equip(gearFor('weapon', 7));
  save();
  clearGear();
  load();
  check('your gear survives a reload', gear.weapon?.name === gearFor('weapon', 20).name && gear.armor?.lvl === 34, `${gear.weapon?.name} / ${gear.armor?.name}`);
  check('...and so does the bag', bag.length === 1 && bag[0].kind === 'weapon' && bag[0].lvl === 7 && bag[0].name === gearFor('weapon', 7).name);
  clearSave(); clearGear();
  delete (globalThis as { localStorage?: unknown }).localStorage;
}

// --- E / R ---
{
  // E is a two-form key: Spike Lift on the ground, Plunging Volley in the air
  arena(10); player.ranks.E = 1; player.ranks.PV = 1;
  const near = dummy(140);
  tap('e');
  check('Spike Lift drives spikes into the enemies around you', near.hp < 1e6);
  check('Spike Lift throws you into the air', !player.onGround && player.vy < 0);
  step(2);
  check('Spike Lift is on a long cooldown', player.cd.E > 4, `cd ${player.cd.E.toFixed(1)}`);
  // the air form, once you are back on your feet with the cooldown cleared
  step(40); player.cd.E = 0;
  const under = dummy(100), beside = dummy(170);
  tap('c'); step(8);
  const yTop = player.y; player.vx = 40; tap('e'); step(1);
  check('Plunging Volley bumps you up (a clear hop)', player.y < yTop - 4 && player.y > yTop - 20 && player.vy < 0, `rose ${(yTop - player.y).toFixed(1)}px`);
  step(4);
  check('Plunging Volley does not freeze you mid-air', player.vy > 0 && player.vx !== 0);
  step(10);
  check('Plunging Volley hits the enemy beneath you', under.hp < 1e6);
  check('Plunging Volley leaves enemies off to the side alone', beside.hp === 1e6);
  step(30);
  check('after the volley you drop back down', player.onGround);
  // the two forms cool down apart: Spike Lift's long cooldown never locks out the volley
  player.cd.E = 0; player.cd['E.air'] = 0; player.useT = 0;
  tap('e'); step(6);
  check('Spike Lift fills its own slot, its full length', player.cd.E > 4 && player.cdMax.E === P.SPIKE_CD && player.cd['E.air'] === 0);
  player.useT = 0; const yv = player.y; tap('e'); step(1);
  check('Plunging Volley still fires in the air during the Spike Lift cooldown', player.y < yv && player.cast === 'barrage' && player.cd['E.air'] === 0 && player.cd.E > 4);
  check('the bar shows the form you are in', cdSlot('E') === 'E.air' && cdSlot('E', false) === 'E');
  step(40);
}
{
  // A linked skill refunds 1s off Spike Lift's cooldown (as it does Tempest's)
  arena(20); player.ranks.Q = 1; player.ranks.W = 1; player.ranks.E = 1;
  dummy(150);
  tap('e'); step(2);
  check('Spike Lift starts on its full cooldown', player.cd.E > 4, `cd ${player.cd.E.toFixed(1)}`);
  step(20); // let the lift land
  player.cd.R = 5; // so the Tempest shave is visible too
  tap('q'); step(14); // the rush ends, the link window is live
  const cd1 = player.cd.E, cdR1 = player.cd.R;
  tap('w'); step(4); // the queued volley fires as the rush clears
  check('the linked Skyfall Volley fires', player.cast === 'shoot' && player.combo <= 0,
    `cast ${player.cast} combo ${player.combo.toFixed(2)}`);
  check('the link refunds 1s off Spike Lift', Math.abs(player.cd.E - (cd1 - 1 - 4 / 30)) < 0.05,
    `cd ${player.cd.E.toFixed(2)} after a ${cd1.toFixed(2)}s cooldown`);
  check('the same link also shaves Tempest', player.cd.R < cdR1 - 0.9 && player.cd.R > cdR1 - 1.3, `cd.R ${player.cd.R.toFixed(2)} of ${cdR1.toFixed(2)}`);
}
{
  // Midair Spin (W in the air): one sweep per 4s, and no extra rise
  arena(20); player.ranks.Q = 1; player.ranks.W = 1; player.ranks.MS = 1;
  tap('c'); let apex0 = player.y;
  for (let i = 0; i < 30; i++) { step(1); apex0 = Math.min(apex0, player.y); }
  step(40);
  check('back on the ground', player.onGround);
  const m = dummy(140);
  tap('c'); step(3); tap('w'); step(12); // the sweep's four hits stagger out
  const hp1 = m.hp; player.useT = 0; tap('w'); step(2);
  check('W can\'t be spammed in the air (a second spin waits out its cooldown)', hp1 < 1e6 && m.hp === hp1 && player.cd['W.air'] > 3);
  let apex = player.y;
  for (let i = 0; i < 30; i++) { tap('w'); step(1); apex = Math.min(apex, player.y); }
  check('spinning adds no rise beyond your jump', apex >= apex0 - 1, `apex ${apex.toFixed(1)} vs ${apex0.toFixed(1)}`);
  check('the spin cools down for 4s', player.cdMax['W.air'] === P.SPIN_CD && P.SPIN_CD === 4);
}
{
  // Q and Air Dive: both paced by the use time alone, no cooldowns
  arena(20); player.ranks.Q = 1; player.ranks.AD = 1;
  tap('q');
  check('the ground rush has no cooldown, only a use time', SKILLS.Q.cd === 0 && SKILLS.Q.use === 0.5 && player.cdMax.Q === 0 && player.useT > 0);
  step(40); player.cd.Q = 0;
  tap('c'); step(6); tap('q');
  check('the Air Dive has no cooldown, only a use time', SKILLS.AD.cd === 0 && player.cd['Q.air'] === 0 && player.useT > 0 && player.recoverT > 0,
    `cd ${player.cd['Q.air'].toFixed(2)} use ${player.useT.toFixed(2)}`);
  step(40);
}
{
  // The Air Dive's link window carries into the grounded kit: pressed as the
  // dive lands (window open), the next skill fires without the use-time wait
  arena(20); player.ranks.Q = 1; player.ranks.AD = 1; player.ranks.W = 1;
  dummy(150);
  tap('c'); step(8);
  tap('q'); step(12); // the dive lands and rolls into its rush
  check('the dive is still airborne-to-landed with its window open', player.combo > 0, `combo ${player.combo.toFixed(2)}`);
  const mp0 = player.mp;
  tap('w');
  check('Skyfall Volley links out of the dive', player.mp < mp0 && player.combo <= 0, `mp ${player.mp} combo ${player.combo.toFixed(2)}`);
}
{
  arena(25); player.ranks.R = 1;
  const a = dummy(130), b = dummy(170);
  tap('r'); step(15);
  check('Tempest hits every enemy caught in the sweep', a.hp < 1e6 && b.hp < 1e6);
  const hp = a.hp; player.useT = 0; tap('r'); step(5);
  check('Tempest is on a long cooldown', a.hp === hp && player.cd.R > 4);
}
{
  // ready-glow: the bar icon flashes the moment a cooldown runs out
  arena(20); player.ranks.E = 1;
  tap('e');
  check('casting starts the cooldown with no glow', player.cd.E > 0 && player.readyT.E === 0);
  for (let i = 0; i < 400 && player.cd.E > 0; i++) step(1);
  check('the glow flashes as the cooldown ends', player.cd.E === 0 && player.readyT.E > 0, `cd ${player.cd.E.toFixed(2)} readyT ${player.readyT.E.toFixed(2)}`);
  step(8);
  check('the glow fades as the flash plays out', player.readyT.E > 0 && player.readyT.E < READY_FLASH, `readyT ${player.readyT.E.toFixed(2)}`);
  step(10);
  check('the glow is gone once the flash is over', player.readyT.E === 0);
}
{
  // Haste: +attack speed shortens use time, never cooldowns; Twin Shot is paced by use time alone
  arena(25); dummy(130);
  cast('Z');
  const base = player.useT;
  check('Twin Shot has a use time and no cooldown', base > 0.4 && player.cd.Z === 0);
  player.useT = 0; player.recoverT = 0; player.cd.R = 0; player.ranks.R = 1; cast('R');
  const rCd = player.cd.R, rUse = player.useT;
  player.ranks.HA = 3; player.useT = 0; player.recoverT = 0; player.cd.R = 0; cast('R');
  check('Haste shortens use time by 10% attack speed at rank 3', Math.abs(player.useT - rUse / 1.1) < 1e-6);
  check('Haste leaves cooldowns alone', player.cd.R === rCd);
  player.useT = 0; player.recoverT = 0; cast('Z');
  check('a hasted Twin Shot fires about 10% faster', Math.abs(player.useT - base / 1.1) < 1e-6);
  player.ranks.HA = 0; player.ranks.R = 0;
}

// --- private instances ---
{
  const c = newCode();
  check('instance codes are 5 letters without I or O', /^[A-HJ-NP-Z]{5}$/.test(c), c);
  check('typed codes are normalised; wrong lengths rejected', parseCode(' abc-de ') === 'ABCDE' && parseCode('ABCD') === '' && parseCode('ABCDEF') === '');
  check('public rooms are per place + channel', roomId('woods-3', 2, '', '') === 'eurekaland-woods-3-c2');
  check('a private instance is its own room per place', roomId('woods-3', 2, 'ABCDE', '') === 'eurekaland-woods-3-pABCDE' && roomId('woods-3', 7, 'ABCDE') === roomId('woods-3', 2, 'ABCDE'));
  check('the network stays offline until the menu starts the game', net.started === false);
}

// --- shared spawn boost ---
{
  arena(1); resetBoost();
  game.floor.spawns = [{ x: 150, y: ground().y, types: ['Garden Snail'], cap: 9 } as never];
  const m = dummy(150, 1); killMob(m);
  check('local kills are batched for sending', takeBatch(0) === 1 && takeBatch(10) === 0);
  remoteKills(2);
  check('remote kills speed up waves', Math.abs(waveRate() - (1 + 2 * BOOST.PER_KILL)) < 1e-9);
  remoteKills(999); remoteKills('junk');
  check('boost is capped, and a flood counts as one capped batch', boost.level === BOOST.MAX);
  // with a full boost, waves come twice as often
  game.mobs = []; game.waveT = 0;
  step(Math.ceil((P.WAVE_EVERY / 2 + 0.5) / P.STEP)); // the boost decays a little meanwhile
  check('a full boost brings the next wave in about half the time', game.mobs.length > 0);
  step(Math.ceil(30 / P.STEP));
  check('the boost decays back to normal', boost.level === 0 && waveRate() === 1);
}

// --- archer sprite sheet ---
check('every archer frame is 16x24 (lying flat is 24x24)', Object.entries(GRIDS).every(([p, fs]) => fs.length > 0 && fs.every((g) => g.length === 24 && g.every((r) => r.length === (p === 'prone' ? 24 : 16)))));
check('every networked pose has frames and a cycle rate', POSES.every((p) => GRIDS[p]?.length && POSE_FPS[p] > 0));
check('new poses go on the end of the networked list (older clients read them as idle)', POSES.indexOf('vanish') === POSES.length - 1 && POSES.indexOf('prone') === 7 && POSES[0] === 'idle');
{
  // holding Down on the ground lies you flat; Left/Right overrides it with a normal walk
  arena(1); player.x = 300; player.vx = 0; player.face = 1;
  setKey('down', true); step(5);
  check('holding Down on the ground lies you flat', player.animState === 'prone' && Math.abs(player.x - 300) < 1);
  setKey('left', true); step(20);
  const downWalk = 300 - player.x, st = player.animState;
  setKey('left', false); step(10);
  check('Left/Right while holding Down stands you up and walks', st === 'walk' && player.face === -1 && downWalk > 10);
  check('letting go of Left/Right (Down still held) lies you back down', player.animState === 'prone');
  setKey('down', false); step(2);
  check('letting go of Down stands you back up', player.animState === 'idle');
  // the same walk as without Down
  arena(1); player.x = 300; player.vx = 0;
  setKey('left', true); step(20); setKey('left', false);
  check('a walk with Down held is as fast as without', Math.abs((300 - player.x) - downWalk) < 0.01, `${(300 - player.x).toFixed(2)} vs ${downWalk.toFixed(2)}`);
  release();
}

// --- bug: fast ground moves sank into slopes ---
{
  // Sky Toss's slide (~10px/frame) outran the 4px ground stick on 2:1 ramps
  // and the player dropped into the slope. Cast it up and down every ramp tile.
  let tries = 0, sank = 0;
  // the Beach floor with the most ramps
  const slopes = (): Platform[] => game.floor.platforms.filter((p) => !p.inner && p.slope);
  const best = [2, 3, 4].map(climb).map((pl) => (gotoPlace(pl), { pl, n: slopes().length })).sort((x, y) => y.n - x.n)[0].pl;
  gotoPlace(best);
  const tiles = slopes();
  for (const p of tiles) for (const face of [1, -1] as const) {
    arena(1); gotoPlace(best); game.mobs = []; game.floor.spawns = []; player.climb = null;
    const walk = game.floor.platforms.filter((q) => !q.inner);
    player.x = p.x + p.w / 2; player.y = surfaceYAt(p, player.x) - player.h; player.plat = p; player.face = face;
    step(1); if (!player.onGround) continue;
    tries++; tap('q');
    for (let i = 0; i < 20; i++) {
      step(1);
      const feet = player.y + player.h;
      if (walk.some((q) => player.x >= q.x && player.x < q.x + q.w && feet > surfaceYAt(q, player.x) + 3 && feet < surfaceYAt(q, player.x) + 14)) { sank++; break; }
    }
  }
  check('Sky Toss never sinks into a slope', tries > 20 && sank === 0, `${sank}/${tries}`);
}

// --- bug: the climb animation played while hanging still ---
{
  const frames = { ...GRIDS, climb: [['a'], ['b']] } as never;
  const f = (feet: number): unknown => archerFrame(frames, 'climb', climbPhase(feet));
  check('climb frame holds while still, steps while climbing', f(100) === f(100) && f(100) === f(103) && f(100) !== f(108));
}

// --- floor layout + jump height ---
{
  arena(1);
  let apex = 0;
  const y0 = player.y;
  tap('c');
  for (let i = 0; i < 40; i++) { step(1); apex = Math.max(apex, y0 - player.y); }
  check('a jump rises about 35px (25% lower than 46.5)', apex > 32 && apex < 38, `apex ${apex.toFixed(1)}`);
  const seen = new Set<string>();
  const bad: string[] = [];
  for (let n = 1; n <= 24; n++) { // up the leftmost branch, to Mushroom Grotto's town
    if (isTown(climb(n))) continue;
    gotoPlace(climb(n));
    const f = game.floor, L = LAYOUTS[f.layout as Layout];
    seen.add(f.layout!);
    const ids = [...new Set(f.platforms.filter((p) => p.block !== undefined).map((p) => p.block))];
    const span = f.platforms[0].y - f.portal.y;
    if (ids.length !== L.count || span < 150 || span > 500) bad.push(`floor ${n} (${f.layout}): ${ids.length} blocks, span ${span}`);
    for (const b of ids) {
      const w = new Set(f.platforms.filter((p) => p.block === b).map((p) => p.x)).size;
      if (w < L.minW || w > L.maxW) bad.push(`floor ${n} block ${b}: ${w} wide`);
    }
    if (f.layout === 'zigzag') {
      const mid = ids.map((b) => { const xs = f.platforms.filter((p) => p.block === b).map((p) => p.x); return (Math.min(...xs) + Math.max(...xs)) / 2; });
      if (mid.some((m, i) => i && (m < WORLD.w / 2) === (mid[i - 1] < WORLD.w / 2))) bad.push(`floor ${n}: zigzag doesn't switch sides`);
    }
    // no climb's foot meets another climb's top in the same column
    const cs = [...f.ropes, ...f.ladders];
    if (cs.some((a) => cs.some((b) => a !== b && Math.abs(a.x - b.x) < TILE && a.y2 >= b.y1 - 1 && a.y1 < b.y1)))
      bad.push(`floor ${n}: stacked climbs`);
  }
  check('floors 1-24 use every layout (stack, zigzag, open)', seen.size === Object.keys(LAYOUTS).length, [...seen].join(','));
  check('each layout keeps its block count, widths and span; zigzags switch sides; climbs never stack', bad.length === 0, bad.slice(0, 6).join('; '));
}

// --- save / load ---
{
  // a tiny in-memory localStorage for the headless run
  const mem: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; },
  };
  arena(35); gotoPlace({ town: 'mossgate' });
  player.exp = 123; player.ap = 7; player.sp = 2; player.stats.dex = 9; player.ranks.Z = 3; player.ranks.BS = 3; player.ranks.E = 2;
  save();
  const want = JSON.stringify(snapshot());
  arena(1); player.ap = 0; player.sp = 0; player.ranks.BS = 0; player.ranks.E = 0;
  const place = load();
  check('save round-trips level, EXP, points, stats, ranks and the town', JSON.stringify({ ...snapshot(), town: 'mossgate' }) === want && samePlace(place, { town: 'mossgate' }));
  check('you resume in the latest town: a town itself, or the start of the path you were on',
    lastTown({ town: 'mossgate' }) === 'mossgate' && lastTown({ path: 'meadows', floor: 5 }) === 'driftwood' && lastTown({ path: 'shore', floor: 2 }) === 'saltwick');
  gotoPlace({ path: 'meadows', floor: 3 }); save(); arena(1); gotoPlace(START);
  check('a save on a path\'s floors resumes in the town it started from', samePlace(load(), { town: 'driftwood' }));
  mem['archer-game:save'] = JSON.stringify({ ...snapshot(), town: 'atlantis' });
  check('a save in a town gone from the map resumes at the start', samePlace(load(), START));
  check('loading recomputes derived stats', player.hp === player.hpMax && player.war > 14 + 33);
  check('a corrupt save is ignored', apply('junk') === null);
  check('an older save is migrated and keeps its progress', apply({ v: 2, level: 50, exp: 10, ap: 3, sp: 2, stats: { dex: 9 }, ranks: { Z: 3 }, town: 'mossgate' }) !== null
    && player.level === 50 && player.ap === 3 && player.ranks.Z === 3);
  apply({ v: 4, level: 1e9, exp: -5, ap: 'x', sp: 3, stats: { dex: -2 }, ranks: { Z: 99, S: 1, BS: 1 }, town: 0 });
  check('out-of-range values are clamped', player.level === 100 && player.exp === 0 && player.ap === 0 && player.stats.dex === 0 && player.ranks.Z === 3 && player.ranks.S + player.ranks.BS === 1);
  clearSave();
  check('reset forgets the save', !hasSave() && samePlace(load(), START));
  delete (globalThis as { localStorage?: unknown }).localStorage;
}

// --- HUD: compact numbers ---
check('HUD numbers: plain below 1000, then 1.2K / 1.2M', [999, 1000, 1299, 12345, 1234567].map(fmtNum).join(' ') === '999 1K 1.2K 12.3K 1.2M');

// --- every effect a skill spawns fits its animation (a longer lifetime once crashed the renderer) ---
{
  const bad: string[] = [];
  for (const key of ['Z', 'Q', 'W', 'E', 'R', 'D'] as const) {
    arena(60, 200);
    for (const k of Object.keys(player.ranks) as (keyof typeof player.ranks)[]) player.ranks[k] = ['S', 'BS', 'VS', 'RA', 'AB'].includes(k) ? 0 : 1;
    dummy(240); dummy(280);
    game.fx = [];
    cast(key); step(1);
    for (let i = 0; i < 20; i++) {
      game.fx.filter((f) => f.t > FX_DUR[f.type] + 1e-9).forEach((f) => bad.push(`${key}:${f.type} ${f.t.toFixed(2)}>${FX_DUR[f.type]}`));
      step(1);
    }
  }
  check('no skill effect outlives its animation', bad.length === 0, [...new Set(bad)].join(', '));
}

// --- EXP comes from the mob's level (the floor), not the player's ---
{
  const expAt = (floor: number, level: number): number => {
    arena(level); gotoPlace(climb(floor)); game.mobs = [];
    spawnMob({ x: 100, y: ground().y, types: ['Garden Snail'] } as never, MOB_TYPES[0]);
    return game.mobs[0].exp;
  };
  check('mob EXP ignores the player level', expAt(3, 1) === expAt(3, 40));
  check('mobs on higher floors are worth more EXP', expAt(8, 5) > expAt(2, 5));
  check('enemy levels climb a path\'s range, spread over its floors', mobLevel({ path: 'shore', floor: 1 }) === 1 && mobLevel({ path: 'shore', floor: 3 }) === 3
    && mobLevel({ path: 'woods', floor: 1 }) === 4 && mobLevel({ path: 'woods', floor: 5 }) === 8 && mobLevel({ path: 'reef', floor: 8 }) === 34);
  check('every path\'s range fits its floors, starting where the way into its town left off',
    PATHS.every((p) => p.lvl[0] <= p.lvl[1] && p.floors >= 1 && pathsInto(p.from).every((q) => q.lvl[1] < p.lvl[0])));
  {
    // EXP: ~10 same-level kills per level at Lv.1, ~100 at Lv.99 (vs level-100 enemies), smooth between
    const kills = (lv: number, mob: number) => Math.ceil(expToNext(lv) / mobExp(mob));
    check('Lv.1 takes about 10 kills of level-1 enemies', kills(1, 1) === 10, `${kills(1, 1)}`);
    check('Lv.99 takes about 100 kills of level-100 enemies', Math.abs(kills(99, 100) - 100) <= 8, `${kills(99, 100)}`);
    let smooth = true;
    for (let l = 1; l < 99; l++) if (kills(l + 1, l + 1) < kills(l, l) || kills(l + 1, l + 1) > kills(l, l) + 3) smooth = false;
    check('kills per level climb steadily from 10 to 100', smooth && Math.abs(killsToLevel(50) - Math.sqrt(10 * 100)) < 1);
    check('higher-level enemies are worth more, and a mob carries its level', mobExp(20) > mobExp(10) && Math.abs(mobExp(5, 10) - mobExp(5) * 10) <= 10);
    gotoPlace(climb(3)); spawnMob(game.floor.spawns[0], MOB_TYPES[0]); // Beach 2
    const m = game.mobs[game.mobs.length - 1];
    check('a spawned mob has its floor\'s level and that level\'s EXP', m.level === 2 && m.exp === mobExp(2));
    const hpHere = m.hpMax; player.level = 40; spawnMob(game.floor.spawns[0], MOB_TYPES[0]);
    check('enemy HP scales with the floor, not the player', game.mobs[game.mobs.length - 1].hpMax === hpHere);
  }
  arena(5); const m = dummy(140, 1); const before = game.dmgNums.length;
  killMob(m);
  check('a kill shows no floating EXP number', game.dmgNums.length === before);
}

// --- every gap between platforms is the same 2-3 tiles of headroom, ground to first included ---
{
  const bad: string[] = [];
  for (const n of [1, 2, 3, 4]) {
    gotoPlace(climb(n));
    const blocks = new Map<number, { top: number; bot: number }>();
    for (const p of game.floor.platforms) if (p.block) {
      const b = blocks.get(p.block) ?? { top: Infinity, bot: -Infinity };
      b.top = Math.min(b.top, p.y); b.bot = Math.max(b.bot, p.y + p.h); blocks.set(p.block, b);
    }
    const bs = [...blocks.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => b);
    bs.forEach((b, i) => {
      const clear = ((i ? bs[i - 1].top : ground().y) - b.bot) / 16;
      if (clear < 2 || clear > 3) bad.push(`floor ${n} gap ${i}: ${clear}`);
    });
  }
  check('platform gaps are all 2-3 tiles, the first one too', bad.length === 0, bad.join(', '));
}

// --- presence: names, tints, spawn spread, ghost skill effects ---
{
  const ns = Array.from({ length: 50 }, () => randomName());
  check('random names fit the tag and the pixel font', ns.every((n) => n.length >= 5 && n.length <= NAME_MAX && /^[A-Z0-9]+$/.test(n)));
  check('names from peers are cleaned', cleanName('  hi there!!<b> ') === 'HITHEREB' && cleanName(null) === '' && cleanName('x'.repeat(40)).length === NAME_MAX);
  check('a peer keeps the same tint', tintFor('abc123') === tintFor('abc123'));
  check('peers get different tints', new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(tintFor)).size >= 4);

  const xs = Array.from({ length: 12 }, () => { gotoPlace(climb(2)); return player.x; });
  const mid = ground().x + ground().w / 2 - player.w / 2;
  check('arrivals are spread around the middle', new Set(xs).size > 6 && xs.every((x) => Math.abs(x - mid) <= SPAWN_SPREAD));

  const tr = newTrack();
  const at = (pose: 'shoot' | 'rush' | 'idle', since: number) => ghostFx(tr, { x: 100, y: 50, face: 1, pose, since });
  check('a ghost shoot pose alone spawns nothing (shots come as messages)', at('shoot', 0.3).length === 0);
  at('idle', 0);
  check('a ghost Sky Toss shows its horn of light', at('rush', 0).map((f) => f.type).join(',') === 'rush');

  // shots: each arrives as a message and shows when the ghost's playback reaches it
  clearShots();
  const st = newTrack(); st.offset = 1000; // their clock runs 1000ms behind ours
  queueShot(st, { t: 5000, x: 80, y: 40, f: 1, l: 64 }, 6000);
  queueShot(st, { t: 5100, x: 80, y: 40, f: 1, l: 64 }, 6100); // back to back
  const due0 = 5000 + 1000 + INTERP_MS;
  check('a ghost shot waits for the playback to reach it', dueShots(due0 - 1).length === 0);
  check('a ghost shot shows muzzle and tracer on time', dueShots(due0).map((f) => f.type).sort().join(',') === 'muzzle,tracer');
  check('back-to-back ghost shots each show', dueShots(due0 + 100).length === 2);
  queueShot(st, { t: 7000, x: 80, y: 40, f: 1, l: 64, n: 4 }, 8000);
  const d7 = 7000 + 1000 + INTERP_MS, tracers = (t: number) => dueShots(t).filter((f) => f.type === 'tracer').length;
  check('a multi-arrow ghost shot shows one tracer per arrow, one after another',
    tracers(d7) === 1 && tracers(d7 + SHOT_GAP) === 1 && tracers(d7 + 3 * SHOT_GAP) === 2);
  queueShot(st, { t: NaN, x: 0, y: 0, f: 1, l: 1 } as never, 0);
  for (let i = 0; i < 100; i++) queueShot(undefined, { t: 0, x: 0, y: 0, f: 1, l: 1 }, 0);
  check('bad or flooding shot messages are capped', dueShots(1e9).length <= 80);
}

// --- canvas main menu: navigation, channels, codes, names, reset ---
{
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)); },
    removeItem: (k: string) => { mem.delete(k); },
  };
  let started = 0;
  const open = (): void => { initMenu(() => { started++; }, { path: 'shore', floor: 2 }); };
  clearSave(); open();
  check('menu rows: play, channel, code, new code, name, look, settings, awards (no reset without a save)', items().join(',') === 'play,channel,code,create,name,look,settings,awards');
  menuKey('up');
  check('menu selection wraps around', items()[menu.sel] === 'awards');

  // channel picker
  check('auto picks the busiest channel with room', autoChannel(new Map([[1, 20], [2, 5], [3, 7]])) === 3);
  check('auto falls back to channel 1 when nobody is around', autoChannel(new Map()) === 1);
  check('channel list offers auto, 1-3 and one past the busiest', channelChoices(new Map([[5, 2]])).join(',') === '0,1,2,3,4,5,6');
  open(); menuKey('down'); menuKey('right'); menuKey('right');
  check('left/right on the channel row picks a channel', menu.channel === 2);
  menuKey('enter');
  check('playing from the channel row joins that public channel', started === 1 && !menu.open && net.channel === 2 && net.code === '');

  // private code: type, then join
  open(); menu.sel = items().indexOf('code');
  menuKey('enter');
  check('Enter on the code row starts typing', menu.edit === 'code');
  menuText('ab1c');
  menuKey('enter');
  check('a short code is refused with a note', menu.open && menu.note.length > 0 && menu.edit === 'code');
  menuText('abcdez');
  check('the code field keeps 5 letters, upper-cased', menu.code === 'ABCDE');
  menuKey('enter');
  check('a full code joins that private instance', !menu.open && net.code === 'ABCDE' && started === 2);

  // new code fills the field and jumps to it
  open(); menu.sel = items().indexOf('create'); activate();
  check('new code fills the code row', menu.code.length === 5 && items()[menu.sel] === 'code');

  // name
  open(); menu.sel = items().indexOf('name'); activate(); menuText('robin hood!'); menuKey('enter');
  check('renaming saves a cleaned name', menu.name === 'ROBINHOOD' && localStorage.getItem('archer-game:name') === 'ROBINHOOD');

  // taps: first selects, second uses; the channel row's thirds step the channel
  open();
  const rowY = (id: string): number => MENU_TOP + items().indexOf(id as never) * MENU_ROW + 3;
  menuTap(MENU_X + MENU_W / 2, rowY('channel'));
  check('a tap selects a row without using it', items()[menu.sel] === 'channel' && menu.open);
  menuTap(MENU_X + MENU_W - 4, rowY('channel'));
  check('tapping the right of the channel row steps it', menu.channel === 1);
  menuTap(MENU_X + 4, rowY('name'));
  check('a tap on a text row starts typing', menu.edit === 'name');

  // reset asks twice
  save(); open();
  check('reset shows once there is a save', items().includes('reset'));
  menu.sel = items().indexOf('reset'); activate();
  check('reset asks to confirm first', menu.confirmReset && hasSave());
  menuKey('up');
  check('moving away cancels the reset', !menu.confirmReset);
  menu.open = false; net.code = ''; net.channel = 1;
  delete (globalThis as { localStorage?: unknown }).localStorage;
}

// --- spawns come in groups of 4-8; enemies never leave their own platform ---
{
  check('group size: 4 on short tops, up to 8 on long ones', groupSize(4) === 4 && groupSize(6) === 4 && groupSize(10) === 6 && groupSize(14) === 8 && groupSize(30) === 8);
  let zones = 0, groups = 0;
  for (const n of [1, 2, 3, 4]) {
    gotoPlace(climb(n));
    const plats = game.floor.spawns.filter((z) => z.block !== undefined);
    zones += plats.length; groups += plats.filter((z) => (z.cap ?? 1) >= 4 && (z.cap ?? 1) <= 8).length;
  }
  check('platform spawn zones hold groups of 4-8', zones > 0 && groups === zones, `${groups}/${zones}`);

  // launch every enemy hard sideways and up; none may end up anywhere but its own platform
  release(); gotoPlace(climb(2)); player.invuln = 999; player.x = 4;
  for (const m of game.mobs) { m.vx = (m.x < 160 ? -1 : 1) * 900; m.vy = -600; m.airTime = 1.1; }
  step(90);
  const strays = game.mobs.filter((m) => {
    const z = m.spawn!;
    const plat = game.floor.platforms.find((p) => !p.inner && m.x >= p.x && m.x < p.x + p.w && Math.abs(surfaceYAt(p, m.x) - (m.y + m.h)) < 6);
    const offEdge = m.x < (z.minX ?? 0) - 16 || m.x > (z.maxX ?? 320) + 16;
    return offEdge || !m.fly && (!plat || plat.block !== z.block);
  });
  check('knocked enemies stay on their own platform', strays.length === 0, `${strays.length}/${game.mobs.length} strayed`);
}

// --- minimap: the whole floor at 1:10, in the top-right under the skill bar ---
{
  game.view.w = 240; game.view.h = 180;
  const r = miniRect();
  check('minimap fits on screen under the skill bar', r.x >= 0 && r.x + r.w <= 240 && r.y >= 24 && r.y + r.h < 180 - 16, JSON.stringify(r));
  const [x0, y0] = toMini(0, 0), [x1, y1] = toMini(WORLD.w - 1, WORLD.h - 1);
  check('minimap covers the whole floor', x0 === r.x && y0 === r.y && x1 < r.x + r.w && y1 < r.y + r.h);
  check('minimap is 1:10', MINI_SCALE === 0.1 && r.w === Math.ceil(WORLD.w / 10));
}

// --- floors are trimmed to their content: a thin ground, a little sky ---
{
  const hs: number[] = [];
  let ok = true;
  for (let n = 1; n <= 20; n++) {
    release(); gotoPlace(climb(n));
    const f = game.floor, g = f.platforms[0], top = Math.min(...f.portals.map((p) => p.y - p.h));
    hs.push(f.h);
    if (WORLD.h !== f.h || g.h !== 4 * TILE || g.y + g.h !== f.h || top < 2 * TILE || (top > 3 * TILE && !f.town && f.h > 180) || f.h < (f.town ? TOWN_MIN_H : 180)) ok = false; // towns get extra sky (see TOWN_MIN_H)
    if (f.platforms.some((p) => p.y < 0) || f.ropes.some((c) => c.y1 < 0)) ok = false;
  }
  // towns are taller than the view, so climbing to the deck moves the camera
  {
    release(); gotoPlace(climb(1)); game.view.w = 240; game.view.h = 180; // the Harbor: one level, the shortest town
    const deck = Math.min(...game.floor.platforms.filter((p) => p.block === 1).map((p) => p.y));
    player.x = 40; player.y = ground().y - player.h; player.onGround = true; player.climb = null;
    game.cam.y = cameraTarget().y; const low = game.cam.y;
    player.y = deck - player.h; const high = cameraTarget().y;
    check('in town the camera follows you up onto the deck', game.floor.h >= TOWN_MIN_H && high < low, `cam ${low} -> ${high}, h ${game.floor.h}`);
  }
  check('each floor is ground (4 tiles) up to its portal plus 2-3 tiles of sky', ok, `heights ${[...new Set(hs)].join(',')}`);
  game.view.w = 240; game.view.h = 180;
  check('the minimap fits the tallest trimmed floor', Math.max(...hs) * MINI_SCALE + miniRect().y < 180 - 16);
}

// --- multiplayer stays offline (and says why) without WebCrypto or WebRTC ---
{
  const c = globalThis.crypto;
  Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
  net.offline = '';
  const ok = canConnect();
  check('no WebCrypto (plain HTTP page): multiplayer stays off with a reason', !ok && net.offline.includes('HTTPS'));
  Object.defineProperty(globalThis, 'crypto', { value: c, configurable: true });
  // Firefox-style: WebRTC lives under the moz-prefixed name
  const g = globalThis as { RTCPeerConnection?: unknown; mozRTCPeerConnection?: unknown };
  g.RTCPeerConnection = undefined; g.mozRTCPeerConnection = function () {};
  net.offline = '';
  check('WebRTC under the moz-prefixed name counts', canConnect() && net.offline === '');
  g.mozRTCPeerConnection = undefined;
  net.offline = '';
  check('no WebRTC (e.g. Firefox with it turned off): local only, no crash', !canConnect() && net.offline.includes('WEBRTC'));
  g.RTCPeerConnection = function () {};
  net.offline = '';
  check('with WebCrypto and WebRTC, multiplayer can connect', canConnect() && net.offline === '');
}

// --- towns: a designed layout, ways up into the areas above, one way down ---
{
  const stand = (pt: { x: number; y: number }): void => {
    player.x = pt.x; player.y = pt.y - player.h; player.vx = 0; player.vy = 0; player.onGround = true; player.climb = null;
  };
  const drift: Place = { town: 'driftwood' }, here = (): string => placeKey(game.floor.place);
  release(); gotoPlace(drift);
  const f = game.floor, layout = JSON.stringify(f.platforms);
  net.channel = 3; gotoPlace(drift); const other = JSON.stringify(game.floor.platforms); net.channel = 1;
  check('towns are a designed layout (the same on every channel and town)', layout === other);
  gotoPlace(drift);
  const [upL, upR, down] = game.floor.portals;
  check('a town has two ways up and one down', game.floor.portals.length === 3 && placeKey(upL.to) === 'woods-1' && placeKey(upR.to) === 'meadows-1'
    && !upL.down && !upR.down && down.down === true && placeKey(down.to) === 'saltwick' && game.mobs.length === 0);
  check('ways up show the level of the enemies past them', upL.lvl === 4 && upR.lvl === 4);
  const deck = game.floor.platforms.filter((p) => p.block === 1 && !p.inner);
  const deckTop = Math.min(...deck.map((p) => p.y));
  check('the plaza deck is reached by a ladder and a rope from the ground',
    game.floor.ladders[0].y1 === deckTop && game.floor.ropes[0].y1 === deckTop && game.floor.ladders[0].y2 === game.floor.platforms[0].y);
  // Driftwood Rest is a two-level town: a loft over the deck, up a ladder, with the way down on it
  {
    const fl = game.floor, dk = fl.platforms.filter((p) => p.block === 1), lf = fl.platforms.filter((p) => p.block === 2);
    const dTop = Math.min(...dk.map((p) => p.y)), dn = fl.portals.find((q) => q.down)!;
    const lTop = Math.min(...lf.map((p) => p.y)), lBottom = Math.max(...lf.map((p) => p.y + p.h)), lad = fl.ladders[1];
    check('a loft holds the way down, up a ladder from the deck, with headroom under it', fl.layout === 'loft'
      && dn.y === lTop && lf.some((p) => !p.inner && p.y === lTop && dn.x >= p.x && dn.x <= p.x + p.w)
      && !!lad && lad.y1 === lTop && lad.y2 === dTop && dTop - lBottom >= player.h + 4);
  }
  // every town, whatever its layout
  const plans = new Set<string>(), bad: string[] = [];
  for (const a of TOWNS.map((t) => ({ id: t.id, town: t.name }))) {
    gotoPlace({ town: a.id });
    const fl = game.floor, tops = fl.platforms.filter((p) => !p.inner);
    plans.add(fl.layout ?? '');
    // what you can reach from the ground by walking along levels and climbing
    const blockAt = (x: number, y: number): number | undefined => tops.find((p) => p.y === y && x >= p.x && x <= p.x + p.w)?.block ?? (tops.some((p) => p.ground && p.y === y) ? 0 : undefined);
    const reach = new Set<number>([0]);
    for (let grew = true; grew;) {
      grew = false;
      for (const c of [...fl.ladders, ...fl.ropes]) {
        const lo = blockAt(c.x, c.y2), hi = blockAt(c.x, c.y1);
        if (lo === undefined || hi === undefined) { bad.push(`${a.town}: a climbable at ${c.x} doesn't join two levels`); continue; }
        for (const [u, v] of [[lo, hi], [hi, lo]]) if (reach.has(u) && !reach.has(v)) { reach.add(v); grew = true; }
      }
    }
    for (const q of [...fl.portals, ...(fl.npcs ?? [])]) {
      const b = blockAt(q.x, q.y);
      if (b === undefined || !reach.has(b)) bad.push(`${a.town}: ${'kind' in q ? q.kind : q.label} can't be reached`);
    }
    // headroom: wherever one level is over another, you can walk under it
    for (const u of tops) for (const v of tops) {
      if (u === v || u.block === v.block || u.x >= v.x + v.w || v.x >= u.x + u.w || u.y >= v.y) continue;
      const under = fl.platforms.filter((p) => p.block === u.block && p.x === u.x).reduce((m, p) => Math.max(m, p.y + p.h), 0);
      if (v.y - under < player.h + 4) bad.push(`${a.town}: no headroom at x ${v.x}`);
    }
    // climbing off a ladder or rope never lands you in a portal
    for (const q of fl.portals) for (const c of [...fl.ladders, ...fl.ropes]) {
      if ((c.y1 === q.y || c.y2 === q.y) && Math.abs(c.x - q.x) < q.w / 2 + 10 + 7) bad.push(`${a.town}: a climbable by ${q.label}`);
    }
    // people on the same level stand far enough apart for their names not to overlap
    for (const u of fl.npcs ?? []) for (const v of fl.npcs ?? []) if (u !== v && u.y === v.y && Math.abs(u.x - v.x) < 44) bad.push(`${a.town}: ${u.kind} and ${v.kind} crowd each other`);
    // decorations stand on something
    for (const d of fl.decor ?? []) if (blockAt(d.x, d.y) === undefined) bad.push(`${a.town}: a ${d.kind} in mid-air at ${d.x}`);
    if (!(fl.decor ?? []).some((d) => d.kind === 'house' || d.kind === 'tower')) bad.push(`${a.town}: no buildings`);
  }
  check('towns come in every layout', TOWN_PLANS.every((p) => plans.has(p)), [...plans].join(', '));
  check('in every town, every portal and person can be reached by walking and climbing; levels have headroom; climbables are clear of portals; decorations stand on something; there are buildings', bad.length === 0, bad.slice(0, 4).join('; '));
  check('every town and path has its own short id, letters only, all different',
    new Set([...TOWNS, ...PATHS].map((x) => x.id)).size === TOWNS.length + PATHS.length && [...TOWNS, ...PATHS].every((x) => /^[a-z]+$/.test(x.id)));
  check('towns are junctions: every path runs between two known towns, and every town but the start is reached by one',
    PATHS.every((p) => TOWNS.some((t) => t.id === p.from) && TOWNS.some((t) => t.id === p.to))
    && TOWNS.every((t) => t.id === START.town || (pathsInto(t.id).length > 0 && townDepth(t.id) > 0)));
  check('every path declares its own mix of the shared layouts', PATHS.every((p) => Object.keys(p.layouts).length > 0
    && Object.entries(p.layouts).every(([k, w]) => k in LAYOUTS && (w ?? 0) > 0)));
  check('a town lays out every way up and down from it', TOWNS.every((t) => pathsFrom(t.id).length <= 2 && pathsInto(t.id).length <= 1));
  gotoPlace(drift);

  player.hp = 5; player.mp = 1;
  stand(upR); tap('up');
  const meadowFloor = JSON.stringify(game.floor.platforms);
  check('the right portal goes up into the right area', here() === 'meadows-1');
  check('arriving does not refill HP or MP', player.hp === 5 && player.mp === 1);
  gotoPlace(drift); stand(game.floor.portals[0]); tap('up');
  check('the left portal goes up into the left area, a different layout', here() === 'woods-1' && JSON.stringify(game.floor.platforms) !== meadowFloor);
  gotoPlace({ town: 'lanternhollow' }); stand(game.floor.portals[game.floor.portals.length - 1]); tap('up');
  check("a town's way down goes to the town its path started from (not the floor below)", here() === 'driftwood' && game.floor.town);
  gotoPlace(climb(1));
  check('the Harbor (where you start) has one way up, to the Beach, and none down',
    game.floor.town && game.floor.portals.length === 1 && placeKey(game.floor.portals[0].to) === 'shore-1');
  stand(game.floor.portals[0]); tap('up');
  check('it leads to Beach 1', here() === 'shore-1' && !game.floor.town);
  check('skills work in town', (() => { gotoPlace(drift); player.cd.Z = 0; player.mp = 99; player.useT = 0; tap('z'); return player.useT > 0; })());
  release();
}

// --- the Esc menu's skill list scrolls instead of overflowing ---
{
  const m: PauseMenu = { col: 1, row: 0 }, n = PAUSE_ROWS + 4;
  let inView = true;
  for (let r = 0; r < n; r++) { m.row = r; const t = pauseScroll(m, n); if (r < t || r >= t + PAUSE_ROWS) inView = false; }
  const atEnd = m.scroll;
  m.row = 5; const back = pauseScroll(m, n);
  check('Esc menu skill list keeps the selected row in view', inView && atEnd === 4 && back === 4, `end ${atEnd} back ${back}`);
  check('a short skill list never scrolls', pauseScroll({ col: 1, row: 3, scroll: 2 }, 6) === 0);
}

// --- enemies never freeze at a platform end; Sky Toss carry fixes ---
{
  // patrol: every enemy keeps moving (none parked against an edge)
  let frozen = 0, total = 0;
  for (const n of [1, 2, 4]) {
    release(); gotoPlace(climb(n)); player.invuln = 1e9; player.x = 4; player.y = 0; player.climb = null;
    const last = new Map<object, number>(), still = new Map<object, number>();
    for (let i = 0; i < 150; i++) {
      step(1); player.hp = player.hpMax;
      for (const m of game.mobs) {
        still.set(m, Math.abs(m.x - (last.get(m) ?? -9)) > 0.2 ? 0 : (still.get(m) ?? 0) + 1); last.set(m, m.x);
      }
    }
    total += game.mobs.length; frozen += game.mobs.filter((m) => (still.get(m) ?? 0) > 45).length;
  }
  check('patrolling enemies turn at platform ends instead of freezing', frozen === 0, `${frozen}/${total} frozen`);

  // chase: an angry enemy whose player is off its platform goes back to patrolling
  arena(1); const g = ground(), w0 = g.w;
  const m = dummy(100); m.spd = 50; m.aggro = true; m.home = 80; m.range = 60;
  player.x = 300; player.y = g.y - player.h;
  let still = 0, lx = m.x;
  for (let i = 0; i < 90; i++) { step(1); still = Math.abs(m.x - lx) < 0.2 ? still + 1 : 0; lx = m.x; }
  g.w = w0;
  check('an enemy does not pin itself to the edge chasing an unreachable player', still < 30, `still ${still} frames`);

  // Sky Toss hits at most 6
  arena(1); player.ranks.Q = 3;
  const ms = Array.from({ length: 9 }, (_, i) => dummy(120 + i * 6));
  tap('q'); step(14);
  check('Sky Toss hits at most 6 enemies', ms.filter((x) => x.hp < 1e6).length === 6, `${ms.filter((x) => x.hp < 1e6).length} hit`);

  // grab reaches a little behind
  arena(1); const behind = dummy(95); player.x = 100;
  tap('q'); step(14);
  check('Sky Toss scoops up an enemy just behind you', behind.hp < 1e6 && behind.x > 100);
}

// --- an enemy carried by Sky Toss never ends up inside or under its platform ---
{
  let bad = 0, runs = 0;
  for (const n of [1, 2, 3, 4]) {
    release(); gotoPlace(climb(n));
    const count = Math.min(10, game.mobs.filter((m) => !m.fly).length);
    for (let k = 0; k < count; k++) for (const face of [1, -1]) {
      release(); gotoPlace(climb(n)); player.invuln = 1e9; player.mp = 999; player.ranks.Q = 1;
      const m = game.mobs.filter((x) => !x.fly)[k];
      if (!m) continue;
      player.x = m.x - face * 14; player.y = m.y + m.h - player.h; player.vy = 0; player.face = face;
      player.onGround = true; player.climb = null; player.cd.Q = 0; player.useT = 0;
      step(1); if (!player.onGround) continue;
      runs++;
      tap('q');
      step(60);
      if (!game.mobs.includes(m)) continue;
      const home = game.floor.platforms.filter((p) => !p.inner && p.block === m.spawn?.block && m.x >= p.x && m.x < p.x + p.w);
      const onTop = home.some((p) => Math.abs(surfaceYAt(p, m.x) - (m.y + m.h)) < 3);
      if (!onTop) bad++;
    }
  }
  check('enemies carried by Sky Toss stay standing on their platform', runs > 10 && bad === 0, `${bad}/${runs} fell in or through`);
}

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
  wallet.coins = RESPEC_PRICES.swap; player.ranks.S = 2; player.ranks.BS = 0;
  tap('up');
  check('Up beside the trainer opens the trainer', trainer.open && trainer.sel === 0);
  tap('z');
  check('a branch swap keeps the rank and takes the coins', player.ranks.BS === 2 && player.ranks.S === 0 && wallet.coins === 0);
  tap('escape');

  player.ranks.BS = 0; player.ranks.Z = 3; player.stats.dex = 4; player.ap = 0; player.sp = 0;
  wallet.coins = RESPEC_PRICES.reset;
  tap('up');
  trainer.sel = TRAINER_ITEMS.length - 1; tap('z');
  check('a full reset refunds every AP and SP spent (Glide too)',
    player.stats.dex === 0 && player.ap === 4 && player.ranks.Z === 1 && player.sp === 5 && player.ranks.D === 0 && wallet.coins === 0,
    `ap ${player.ap} sp ${player.sp} Z ${player.ranks.Z}`);
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
  check('places read as area + floor on its path, or the town', placeName(START) === 'Saltwick Port' && placeName({ path: 'shore', floor: 1 }) === 'Sunlit Shore 1' && placeName({ path: 'woods', floor: 2 }) === 'Whispering Woods 2');
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
  check('town portals are labelled with where they go', l === 'Whispering Woods 1' && r === 'Sunny Meadows 1' && d === 'Saltwick Port', `${l} | ${r} | ${d}`);
  gotoPlace({ path: 'meadows', floor: 5 });
  check('the way into a town is labelled with its own name', game.floor.portal.label === 'Lanternhollow Town');
  check('the HUD place follows your path', placeName(game.floor.place) === 'Sunny Meadows 5');
  gotoPlace({ town: 'sporehollow' });
  check('a town at the end of a branch has only its way down', game.floor.portals.length === 1 && game.floor.portals[0].down === true);
  gotoPlace(nextPlace(game.floor.place));
  check('nothing lies above the end of a branch (a warp past it stays in its town)', game.floor.town && placeName(game.floor.place) === 'Sporehollow Camp');
  release();
}

{
  // Glide and the climb rush are bought with SP, not given
  check('a new archer has Twin Shot and Jump free, Glide not yet', DEFS.D.learn === true && startsLearned('Z') && startsLearned('C') && !startsLearned('D'));
  arena(1); player.ranks.D = 0; player.sp = 1;
  check('Glide can take SP from Lv.1', skillRows().some((r) => r.key === 'D' && r.rank === 0 && !!r.action) && spendSkill('D') && player.ranks.D === 1);
  check('Agile Climbing opens at Lv.10', DEFS.AC.minLevel === 10 && !skillRows().some((r) => r.key === 'AC'));
  const onRope = (): void => {
    const c = [...game.floor.ropes, ...game.floor.ladders][0];
    player.climb = c; player.x = c.x; player.y = c.y2 - player.h - 1; player.onGround = false; player.vx = player.vy = 0;
  };
  arena(10); player.ranks.AC = 0; onRope();
  setKey('up', true); tap('c');
  check('without Agile Climbing, Up + Jump on a rope does not rush', !player.climbRush);
  release();
  arena(10); player.ranks.AC = 1; onRope();
  setKey('up', true); tap('c');
  check('with it, Up + Jump rushes up the rope', player.climbRush);
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

// --- menu polish: key repeat, local-only rows, a steady caret ---
{
  // Esc menu: holding Down keeps moving
  release(); arena(30); game.pause = { col: 1, row: 0 };
  setKey('down', true);
  const frames = Math.ceil((REPEAT_DELAY + 4 * REPEAT_RATE) / P.STEP) + 1;
  for (let i = 0; i < frames; i++) { update(P.STEP); clearPressed(); }
  const moved = game.pause.row;
  setKey('down', false); step(5);
  check('holding Down in the Esc menu repeats the move', moved >= 3, `moved ${moved}`);
  check('releasing stops the repeat', game.pause.row === moved);
  game.pause = null;

  // local only: the code rows are skipped and can't be used
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)); }, removeItem: (k: string) => { mem.delete(k); },
  };
  net.offline = 'NEEDS HTTPS';
  initMenu(() => {}, START);
  const seen = new Set<string>();
  for (let i = 0; i < 10; i++) { menuKey('down'); seen.add(items()[menu.sel]); }
  const ci = items().indexOf('code');
  menuTap(MENU_X + 5, MENU_TOP + ci * MENU_ROW + 2);
  check('local only: the private code rows are skipped', !seen.has('code') && !seen.has('create') && seen.has('name') && disabled('code'));
  check('local only: tapping the code row does nothing', items()[menu.sel] !== 'code' && menu.edit === null);
  net.offline = '';
  check('online: the code rows are back', !disabled('code') && !disabled('create'));
  delete (globalThis as { localStorage?: unknown }).localStorage;

  check('the caret blinks between same-width glyphs, so text never shifts', textWidth('AB_') === textWidth('AB '));
}

{
  // tilesets: every area has one; the pieces paint valid colours for every pixel and variant
  check('every area on the map has a tileset (Classic until it gets its own)', ['Sunlit Shore', 'Whispering Woods', 'Echoing Caves', 'Murky Swamp', 'Craggy Mountains', 'Endless Sky', 'Clockwork Spire'].every((a) => !!tilesetFor(a)));
  check('Clockwork Spire is on the map', MAP_AREAS.includes('Clockwork Spire'));
  const fallback = ['Old Keep', 'Ember Wastes', 'Sky Reef', 'Chapel Spire', 'Frozen Summit']; // no sets of their own yet
  const own = MAP_AREAS.filter((a) => !fallback.includes(a));
  check('every area in play and on the planned route has its own tileset', own.every((a) => tilesetFor(a).name === a),
    own.filter((a) => tilesetFor(a).name !== a).join(', '));
  check('unknown areas fall back to Classic', tilesetFor('Nowhere').name === 'Classic');
  // props and backdrops: every area with a tileset has its own; props paint inside their canvas
  const inside = (paint: (p: (x: number, y: number, c: string, w?: number, h?: number) => void) => void, W: number, H: number): boolean => {
    let ok = true, any = false;
    paint((x, y, c, w = 1, h = 1) => { any = true; if (!/^#[0-9a-f]{3,8}$/i.test(c) || x < -0.5 || y < -0.5 || x + w > W + 0.5 || y + h > H + 0.5) ok = false; });
    return ok && any;
  };
  const withSets = Object.keys(TILESETS).filter((a) => a !== 'Classic');
  check('every area with a tileset has its own props and backdrop', withSets.every((a) => PROPS[a] && BACKDROPS[a]),
    withSets.filter((a) => !PROPS[a] || !BACKDROPS[a]).join(', '));
  check('every prop paints only inside its canvas', Object.values(PROPS).every((ps) => ps.every((p) => inside(p, PROP_W, PROP_H))));
  let placed = 0;
  for (let i = 0; i < 400; i++) { const k = propAt('Whispering Woods', i, 7); if (k !== null) { placed++; if (k < 0 || k >= PROPS['Whispering Woods'].length) placed = -999; } }
  check('props stand on a few tops, not most', placed > 20 && placed < 90, `${placed}/400`);
  check('backdrop particles stay in view', Object.values(BACKDROPS).every((b) => !b.particles || particlesAt(b.particles, 3.7, 240, 180).every((q) => q.x >= -20 && q.x <= 240 && q.y >= -20 && q.y <= 180)));
  const hex = /^#[0-9a-f]{6}$/;
  let bad = '';
  for (const ts of Object.values(TILESETS)) {
    for (let v = 0; v < 4; v++) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (!hex.test(ts.fill(x, y, v))) bad ||= `${ts.name} fill ${x},${y},${v}`;
      const c = ts.surface(x, y, v);
      if (c !== null && !hex.test(c)) bad ||= `${ts.name} surface ${x},${y},${v}`;
    }
    if (!ts.surface(0, 0, 0)) bad ||= `${ts.name} has no surface`;
    // decorations and climbables stay inside their sprites
    const inside = (name: string, w: number, h: number) => (x: number, y: number, c: string, pw = 1, ph = 1) => {
      if (x < 0 || y < 0 || x + pw > w || y + ph > h || !hex.test(c)) bad ||= `${ts.name} ${name} paints ${x},${y} ${pw}x${ph} ${c}`;
    };
    for (let v = 0; v < 4; v++) for (const w of [false, true]) for (const e of [false, true]) ts.top?.(inside('top', TOP_W, TOP_H), v, w, e);
    for (let v = 0; v < 4; v++) ts.bottom?.(inside('bottom', 16, BOT_H), v);
    ts.rope(inside('rope', 16, 16)); ts.ladder(inside('ladder', 16, 16));
  }
  check('tileset pieces paint valid colours inside their sprites', bad === '', bad);
  const vs = new Set<number>();
  for (let i = 0; i < 64; i++) vs.add(variantAt(i, 3));
  check('tile variants are 0-3, all used, and fixed per position', [...vs].every((v) => v >= 0 && v < 4) && vs.size === 4 && variantAt(5, 7) === variantAt(5, 7));
  check('decorations pick variants apart from the fill', [...Array(32).keys()].some((i) => variantAt(i, 0) !== variantAt(i, 0, 1)) && hash(1, 2) !== hash(2, 1));
}

{
  // dev mode (?dev): its own rooms, the warp menu, and the [ ] keys
  check('dev mode is off without ?dev', dev.on === false);
  const before = roomId('driftwood', 1);
  setKey('[', true); step(1); setKey('[', false);
  const lv = player.level, fl = game.floor.place;
  setKey(']', true); step(1); setKey(']', false); step(1);
  check('[ and ] do nothing without ?dev', player.level === lv && samePlace(game.floor.place, fl));
  dev.on = true;
  check('dev rooms get their own ids', roomId('driftwood', 1) === before + '-dev' && roomId('driftwood', 0, 'ABCDE').endsWith('-dev'));
  setKey(']', true); step(1); setKey(']', false); step(1);
  check('] warps up to the next place in dev mode', samePlace(game.floor.place, nextPlace(fl)));
  setKey('`', true); step(1); setKey('`', false); step(1);
  check('` opens the dev menu', dev.open);
  const stops = devStops();
  check('the dev menu lists Beach 1 and every town', placeKey(stops[0].place) === 'shore-1' && stops.length === TOWNS.length + 1
    && stops.slice(1).every((s, i) => placeKey(s.place) === TOWNS[i].id && s.name.trim() === TOWNS[i].name));
  check('the dev menu labels towns by their area', stops[2].label === 'Sunlit Shore');
  dev.sel = 2; setKey('enter', true); devInput(P.STEP); clearPressed(); setKey('enter', false);
  check('picking a town warps there and closes the menu', samePlace(game.floor.place, stops[2].place) && game.floor.town && !dev.open);
  dev.on = false;
  // text chat
  check('chat keeps only what the font draws, upper-cased and capped',
    cleanChat('  hi, there!  \u{1F600} ok?') === "HI, THERE! OK?" && cleanChat('x'.repeat(200)).length === CHAT_MAX && cleanChat('   ') === '');
  check('chat wraps on words and splits long ones', JSON.stringify(wrap('HELLO THERE FRIEND', 11)) === '["HELLO THERE","FRIEND"]' && wrap('A'.repeat(25), 10).length === 3);
  chat.log.length = 0; clearBubbles();
  say('hello world');
  check('saying something logs it and shows our bubble', chat.log.length === 1 && chat.log[0].id === SELF && chat.log[0].text === 'HELLO WORLD' && !!bubbleFor(SELF, performance.now()));
  say('   ');
  check('blank lines are not sent', chat.log.length === 1);
  const t0 = 1e6;
  addChat('peer1', 'BOB', 'HI', '#ff0000', t0);
  check('a bubble lasts a few seconds, then goes', !!bubbleFor('peer1', t0 + 1000) && bubbleFor('peer1', t0 + bubbleMs('HI') + 1) === null);
  check('old lines leave the log unless you are typing', !logLines(t0 + LOG_SHOW_MS + 1).some((l) => l.id === 'peer1'));
  chat.typing = true;
  check('typing shows the whole recent log', logLines(t0 + LOG_SHOW_MS + 1).some((l) => l.id === 'peer1'));
  chat.typing = false; chat.log.length = 0; clearBubbles();
  // AZERTY: keys go by physical position, labels by layout
  const ev = (key: string, code?: string) => ({ key, code }) as unknown as Parameters<typeof normalize>[0];
  check('the key in the Z spot is Z on any layout (AZERTY types W there)', normalize(ev('w', 'KeyZ')) === 'z' && normalize(ev('a', 'KeyQ')) === 'q');
  check('digits, space, arrows and Enter go by physical key', normalize(ev('&', 'Digit1')) === '1' && normalize(ev(' ', 'Space')) === ' ' && normalize(ev('ArrowUp', 'ArrowUp')) === 'up' && normalize(ev('Enter', 'NumpadEnter')) === 'enter');
  check('without a code, the typed key is used', normalize(ev('ArrowLeft')) === 'left' && normalize(ev('X')) === 'x');
  check('labels are QWERTY until the layout is known', keyName('z') === 'Z' && keyName('Q') === 'Q');
  setLayout({ KeyZ: 'w', KeyQ: 'a', KeyW: 'z', KeyA: 'q' });
  check('on AZERTY the labels show what the keys type', keyName('z') === 'W' && keyName('Q') === 'A' && keyName('w') === 'Z' && keyName('escape') === 'ESCAPE');
  setLayout({});
  // rooms by hour: floors carry the UTC hour you entered them; towns never do; layouts ignore it
  check('the hour stamp is the UTC hour, YYYYMMDDHH', hourStamp(Date.UTC(2026, 10, 24, 14, 59, 59)) === '2026112414' && hourStamp(Date.UTC(2026, 10, 24, 15, 0, 0)) === '2026112415');
  check('floor rooms are tagged with the hour', roomId('shore-2', 2, '', '2026112414') === 'eurekaland-shore-2-c2-h2026112414' && roomId('shore-2', 1, 'ABCDE', '2026112414').endsWith('-pABCDE-h2026112414'));
  check('towns have no hour tag', roomId('driftwood', 1, '', '2026112414') === 'eurekaland-driftwood-c1');
  check('no hour yet: no tag', roomId('shore-2', 1, '', '') === 'eurekaland-shore-2-c1');
  const was = net.hour;
  net.hour = '2026112414'; gotoPlace(climb(4)); const a = JSON.stringify(game.floor.platforms.map((p) => [p.x, p.y]));
  net.hour = '2026112415'; gotoPlace(climb(4)); const b = JSON.stringify(game.floor.platforms.map((p) => [p.x, p.y]));
  check('a floor\'s layout is the same whatever the hour', a === b);
  net.hour = was;
}

{
  // enemies: two types per floor from the area's set; each platform fields one or both
  const beach = areaMobs('Sunlit Shore').map((m) => m.n);
  check('the Beach has its own enemies (snail, enemy crab, hermit crab, gull)', ['Garden Snail', 'Enemy Crab', 'Hermit Crab', 'Gull'].every((n) => beach.includes(n)));
  check('areas without a set use the general pool', areaMobs('Old Keep').every((m) => !m.areas || m.areas.includes('*')) && areaMobs('Old Keep').length >= 2);
  const withOwn = Object.keys(TILESETS).filter((a) => !['Classic', 'Harbor'].includes(a)); // the Harbor is only a town
  check('every area with its own tileset has its own enemies (two or more)', withOwn.every((a) => MOB_TYPES.filter((m) => m.areas?.includes(a)).length >= 2),
    withOwn.filter((a) => MOB_TYPES.filter((m) => m.areas?.includes(a)).length < 2).join(', '));
  let artOk = true;
  for (const [name, { look }] of Object.entries(MOB_ART)) for (const f of [0, 1, HURT]) {
    paintMob(name, f, (x, y, c, w = 1, h = 1) => { if (x < 0 || y < 0 || x + w > look.w || y + h > look.h || !/^#[0-9a-f]{6}$/i.test(c)) artOk = false; });
  }
  check('enemy art paints inside its box (the hitbox)', artOk);
  // the hurt pose (hitstun) is its own drawing: not just frame 0 again
  const rects = (name: string, f: number): string => { const r: string[] = []; paintMob(name, f, (x, y, c, w = 1, h = 1) => r.push(`${x},${y},${c},${w},${h}`)); return r.join(';'); };
  const sameHurt = Object.keys(MOB_ART).filter((n) => rects(n, HURT) === rects(n, 0) || rects(n, HURT) === rects(n, 1));
  check('every painted enemy has its own hurt pose', sameHurt.length === 0, sameHurt.join(', '));
  check('every enemy with painted art uses its box as its size', MOB_TYPES.filter((m) => MOB_ART[m.n]).every((m) => m.w === MOB_ART[m.n].look.w && m.h === MOB_ART[m.n].look.h));
  let pairsOk = true, singles = 0, doubles = 0;
  for (const n of [2, 3, 4]) { // the Beach
    gotoPlace(climb(n));
    const ground = game.floor.spawns[game.floor.spawns.length - 1].types;
    const [a, b] = ground;
    if (ground.length !== 2 || a === b || !beach.includes(a) || !beach.includes(b)) pairsOk = false;
    for (const z of game.floor.spawns.slice(0, -1)) {
      if (!z.types.every((t) => t === a || t === b)) pairsOk = false;
      if (z.types.length === 1) singles++; else doubles++;
    }
  }
  check('each Beach floor fields two different beach enemies', pairsOk);
  check('some platforms field one type, some both', singles > 0 && doubles > 0, `${singles} single, ${doubles} both`);
  const seq = () => { let i = 0; return () => [0.1, 0.9, 0.5][i++ % 3]; };
  check('a floor\'s pair is fixed by its seed', JSON.stringify(floorMobs({ path: 'shore', floor: 2 }, seq())) === JSON.stringify(floorMobs({ path: 'shore', floor: 2 }, seq())));
}

{
  // enemy HP bar: hidden until hit, then up for BAR_SHOW s after each hit
  arena(); const m = dummy(150);
  const before = m.barT <= 0;
  damage(m, 1); const after = m.barT > 0;
  for (let i = 0; i < 30; i++) update(1 / 60);
  const still = m.barT > 0;
  m.barT = 0.01; update(1 / 60);
  check('enemy HP bar: hidden before the first hit', before);
  check('enemy HP bar: shown after a hit, for 4 s', after && still && BAR_SHOW === 4);
  check('enemy HP bar: hidden again once the time runs out', m.barT <= 0);
}

{
  // enemy animations: walkers step only while moving; fliers always flap; stun freezes
  const walk = { anim: 0, fly: false, vx: 60, stun: 0 }, frames = new Set<number>();
  for (let i = 0; i < 24; i++) { walk.anim = i * ANIM_RATE / 24; frames.add(mobFrame(walk, 4, 8)); }
  check('a walking enemy cycles through all its frames', frames.size === 4, [...frames].join(','));
  check('a standing enemy holds frame 0', mobFrame({ ...walk, vx: 0, anim: 3.3 }, 4, 8) === 0);
  check('a stunned enemy holds frame 0', mobFrame({ ...walk, stun: 1, anim: 3.3 }, 4, 8) === 0);
  check('a hovering flier keeps flapping', mobFrame({ anim: ANIM_RATE * 0.25, fly: true, vx: 0, stun: 0 }, 2, 4) === 1);
}

{
  // bosses: an area's last floor has one, and its way up stays sealed until it's beaten
  release();
  let endN = 1; while (!isPathEnd(climb(endN))) endN++;
  gotoPlace(climb(endN - 1));
  check('no boss before the last floor of an area', !game.mobs.some((m) => m.boss));
  gotoPlace(START);
  check('no boss in a town', !game.mobs.some((m) => m.boss));
  gotoPlace(climb(endN));
  const bs = game.mobs.filter((m) => m.boss);
  check("an area's last floor has exactly one boss", bs.length === 1);
  const boss = bs[0];
  check('the boss is one of its enemies, grown huge and much tougher',
    boss.w === boss.type.w * BOSS.SCALE && boss.h === boss.type.h * BOSS.SCALE && boss.hpMax >= boss.type.hp * BOSS.HP && !boss.fly);
  check("the Tide Pools' boss is the Giant Enemy Crab", bossName(bossType('Tide Pools')) === 'Giant Enemy Crab', bossType('Tide Pools'));
  const hp0 = player.hpMax;
  player.hpMax = player.hp = 1e7;
  const ground = game.floor.platforms[0];
  const stand = (x: number): void => { player.x = x; player.y = ground.y - player.h; player.vx = player.vy = 0; player.onGround = true; player.plat = ground; player.climb = null; player.invuln = 0; };
  const up = game.floor.portals.find((q) => !q.down)!;
  player.x = up.x; player.y = up.y - player.h; player.vx = player.vy = 0; player.onGround = true; player.climb = null;
  tap('up');
  check('the way up is sealed while the boss stands', samePlace(game.floor.place, climb(endN)) && bossAlive() === boss);
  boss.stun = 2; boss.airTime = 1; step(1);
  check('the boss shrugs off stuns and launches', boss.stun === 0 && boss.airTime === 0);
  // charge: far away, it winds up, then rushes
  boss.x = WORLD.w * 0.75; boss.y = ground.y - boss.h; boss.vy = 0; boss.boss = { act: 'walk', t: 0, cd: 0, air: false };
  stand(40);
  step(1);
  check('far from you, the boss winds up a charge', boss.boss.act === 'windCharge');
  step(Math.ceil(BOSS.WIND / P.STEP) + 2);
  check('then rushes at you', boss.boss.act === 'charge' && boss.vx < -boss.spd * 2, `${boss.boss.act} ${boss.vx}`);
  // slam: the landing hits a player on the ground nearby, not one far off
  const slam = (dx: number, from = WORLD.w / 2): number => {
    boss.x = from; boss.y = ground.y - boss.h; boss.vx = boss.vy = 0; boss.boss = { act: 'windSlam', t: 0.01, cd: 9, air: false };
    stand(from + dx); quakes.length = 0;
    const before = player.hp;
    for (let i = 0; i < 300 && boss.boss.act !== 'walk'; i++) { player.invuln = Math.min(player.invuln, 0.5); game.mobs.splice(0, game.mobs.length, boss); step(1); stand(from + dx); }
    return before - player.hp;
  };
  check("a slam's shockwave hurts a player on the ground nearby", slam(boss.w / 2 + 40) > 0 && quakes.length === 1);
  check('but not one well out of reach (it leaps toward you)', slam(WORLD.w - 60, 30) === 0);
  // a wide platform above the ground for the boss to leap onto and off
  // (floors are built from single tiles, so add one for these tests)
  const deck: Platform = { x: WORLD.w / 2 - 60, y: ground.y - 48, w: 120, h: 16 };
  game.floor.platforms.push(deck);
  const onDeck = (): void => { stand(deck.x + deck.w / 2); player.y = deck.y - player.h; player.plat = deck; };
  // a slam can put the boss up on a platform above it, and it keeps chasing
  // from there (it is not tied to the ground it spawned on)
  {
    // a platform wide enough for the boss to stand on, above the ground
    {
      onDeck();
      boss.x = deck.x + deck.w / 2; boss.y = deck.y - boss.h; boss.vx = boss.vy = 0;
      boss.boss = { act: 'walk', t: 0, cd: 9, air: false };
      step(2);
      check('the boss stands on a high platform with you', Math.abs(boss.y + boss.h - deck.y) < 1, `feet ${(boss.y + boss.h).toFixed(1)} vs ${deck.y} (deck ${deck.x},${deck.w} ground ${ground.y})`);
    }
  }
  // a slam aimed at a player on a high platform lands on that platform,
  // rising to their feet rather than to a fixed height
  {
    {
      onDeck();
      boss.x = deck.x + deck.w / 2; boss.y = ground.y - boss.h; boss.vx = boss.vy = 0;
      boss.boss = { act: 'windSlam', t: 0.01, cd: 9, air: false };
      quakes.length = 0;
      for (let i = 0; i < 300 && boss.boss.act !== 'walk'; i++) { player.invuln = 1; game.mobs.splice(0, game.mobs.length, boss); step(1); }
      check('a slam from the ground lands on the platform you stand on', Math.abs(boss.y + boss.h - deck.y) < 1 && boss.boss.act === 'walk', `feet ${(boss.y + boss.h).toFixed(1)} vs ${deck.y}, act ${boss.boss.act}`);
      game.mobs.push(boss);
    }
  }
  // and the other way: a slam from a high platform at a player below drops
  // down through it to their level
  {
    {
      const mid = deck.x + deck.w / 2, below = mid + (mid < WORLD.w / 2 ? 1 : -1) * (deck.w / 2 + 40);
      game.mobs.splice(0, game.mobs.length, boss);
      boss.x = mid; boss.y = deck.y - boss.h; boss.vx = boss.vy = 0;
      boss.boss = { act: 'walk', t: 0, cd: 9, air: false };
      stand(below); step(2);
      boss.boss = { act: 'windSlam', t: 0.01, cd: 9, air: false };
      for (let i = 0; i < 300 && boss.boss.act !== 'walk'; i++) { player.invuln = 1; game.mobs.splice(0, game.mobs.length, boss); stand(below); step(1); }
      check('a slam from a platform jumps down to the player below', Math.abs(boss.y + boss.h - ground.y) < 1 && boss.boss.act === 'walk' && !boss.boss.dropTo, `feet ${(boss.y + boss.h).toFixed(1)} vs ground ${ground.y}, act ${boss.boss.act}`);
    }
  }
  game.floor.platforms.splice(game.floor.platforms.indexOf(deck), 1);
  // beaten: the way up opens
  killMob(boss);
  check('beating the boss clears it', !bossAlive());
  player.x = up.x; player.y = up.y - player.h; player.vx = player.vy = 0; player.onGround = true; player.climb = null;
  tap('up');
  check('then the way up opens', samePlace(game.floor.place, climb(endN + 1)));
  player.hpMax = player.hp = hp0;
  // looks: hair style, hair colour, skin and outfit; set from the menu or the town stylist
  check('a bad saved look falls back to the default', JSON.stringify(cleanLook({ style: 99, hair: -1, skin: 'x' })) === JSON.stringify(DEFAULT_LOOK));
  check('a good look is kept', cleanLook({ style: 2, hair: 3, skin: 1, outfit: 4 }).hair === 3);
  check('stepping a look wraps around', stepLook(DEFAULT_LOOK, 'style', -1).style === LOOK_COUNTS.style - 1);
  check('the elf ear follows the skin tone', lookPalette({ ...DEFAULT_LOOK, skin: 3 }).k === lookPalette({ ...DEFAULT_LOOK, skin: 3 }).s);
  const poses = Object.keys(GRIDS) as (keyof typeof GRIDS)[];
  const diff = (a: string[], b: string[]): number => a.reduce((n, r, y) => n + [...r].filter((ch, x) => ch !== b[y][x]).length, 0);
  check('the default hair style leaves the sprites as drawn (the female build adds only a lash)', poses.every((p) => GRIDS[p].every((g) => diff(styled(g, p, 0), g) <= 1)));
  for (let st = 1; st < LOOK_COUNTS.style; st++) for (const body of [0, 1]) {
    const ok = poses.every((p) => GRIDS[p].every((g) => {
      const s = styled(g, p, st, body);
      // same size, and below the head only cape, outline or empty pixels change
      return s.length === g.length && s.every((r, y) => r.length === g[y].length)
        && s.every((r, y) => y < 12 || [...r].every((ch, x) => ch === g[y][x] || 'cCo.'.includes(g[y][x])));
    }));
    if (!ok) check(`hair style ${st}, body ${body}: frames keep their size; the body, bow and arms are untouched`, ok);
  }
  check('every hair style and build keeps frames their size, and the body, bow and arms untouched', true);
  check('every hair style looks different', new Set(Array.from({ length: LOOK_COUNTS.style }, (_, st) => styled(GRIDS.idle[0], 'idle', st).join())).size === LOOK_COUNTS.style);
  check('the male build changes the face', poses.filter((p) => p !== 'prone' && p !== 'climb').every((p) => diff(styled(GRIDS[p][0], p, 0, 1), styled(GRIDS[p][0], p, 0, 0)) >= 3));
  // town stylists: each town offers its own extra, which seeing unlocks everywhere
  const towns = TOWNS.map((t) => t.name);
  check('every town\'s stylist has an extra', towns.every((t) => TOWN_LOOKS[t]?.length), towns.filter((t) => !TOWN_LOOKS[t]?.length).join(', '));
  const extras = Object.values(TOWN_LOOKS).flat().map((e) => `${e.k}:${e.i}`);
  check('extras are real, not basic, and each offered by one town', new Set(extras).size === extras.length
    && Object.values(TOWN_LOOKS).flat().every((e) => e.i < LOOK_COUNTS[e.k] && !isBasic(e.k, e.i)));
  const allExtras = (['style', 'hair'] as const).flatMap((k) => Array.from({ length: LOOK_COUNTS[k] }, (_, i) => `${k}:${i}`).filter((x) => !isBasic(x.split(':')[0] as 'style', +x.split(':')[1])));
  check('every extra style and colour can be found in some town', allExtras.every((x) => extras.includes(x)), allExtras.filter((x) => !extras.includes(x)).join(', '));
  check('long hair shows down the back', styled(GRIDS.idle[0], 'idle', 2).join() !== styled(GRIDS.idle[0], 'idle', 1).join());
  // the menu's LOOK row opens the stylist; keys go to it until it closes
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage ??= { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); } };
  setMyLook(DEFAULT_LOOK); clearUnlocks();
  initMenu(() => {}, START);
  menu.sel = items().indexOf('look'); menuKey('enter');
  check('LOOK in the menu opens the stylist', stylist.open && stylist.sel === 0);
  menuKey('right');
  check('Right changes the picked row (hair style)', myLook().style === 1);
  menuKey('down'); menuKey('left');
  check('...the next row down is the hair colour', myLook().hair === BASIC.hair! - 1);
  check('the look is kept on this device', cleanLook(JSON.parse(localStorage.getItem('archer-game:look') ?? '{}')).hair === BASIC.hair! - 1);
  menuKey('escape');
  check('Esc closes the stylist, not the menu', !stylist.open && menu.open);
  // taps: a row's left half steps back, its right half forward
  stylistKey('escape'); stylist.open = true; stylist.sel = 0;
  const b = stylistBox(320, 180), rowY = (i: number): number => b.y + ST_TOP + i * 14 + 3;
  const sk = myLook().skin;
  stylistTap(b.x + ST_ROWS_W - 10, rowY(2), 320, 180);
  check('tapping the right half of a row steps it forward', myLook().skin === (sk + 1) % LOOK_COUNTS.skin && stylist.sel === 2);
  stylistTap(b.x + 10, rowY(2), 320, 180);
  check('tapping the left half steps it back', myLook().skin === sk);
  stylistTap(2, 2, 320, 180);
  check('tapping outside the window closes it', !stylist.open);
  menu.open = false;
  // the town stylist
  let townN = 1; while (gotoPlace(climb(townN)), !game.floor.town) townN++;
  const st = game.floor.npcs?.find((n) => n.kind === 'stylist');
  const zones = game.floor.portals.map((q) => [q.x - q.w / 2 - 10, q.x + q.w / 2 + 10]).concat(game.floor.ladders.map((l) => [l.x - 7, l.x + 7]), game.floor.ropes.map((l) => [l.x - 7, l.x + 7]));
  check('towns have a stylist, clear of portals, ladders and ropes', !!st && zones.every(([lo, hi]) => st.x + NPC_R <= lo || st.x - NPC_R >= hi));
  release(); setMyLook(DEFAULT_LOOK);
  player.x = st!.x; player.y = st!.y - player.h; player.vx = player.vy = 0; player.onGround = true; player.climb = null;
  tap('up');
  check('Up beside the stylist opens the window', stylist.open);
  tap('right');
  check('arrows change your look there too', myLook().style === 1);
  const town = placeName(game.floor.place), extra = TOWN_LOOKS[town][0];
  check('the town stylist knows which town it is in, and says its looks are new', stylist.town === town && stylist.fresh > 0);
  setMyLook({ ...DEFAULT_LOOK, [extra.k]: extra.i - 1 });
  stylist.sel = STYLIST_ROWS.indexOf(extra.k === 'style' ? 'HAIR' : 'HAIR COLOUR'); tap('right');
  check('it offers its own extra', myLook()[extra.k] === extra.i, `${extra.k} ${myLook()[extra.k]} want ${extra.i}`);
  tap('x');
  check('X closes it', !stylist.open && !game.pause);
  check('seeing it unlocked the extra for good (the menu offers it now)', isUnlocked(extra.k, extra.i) && offeredAt(null)(extra.k, extra.i));
  openStylist(town);
  check('a second visit has nothing new', stylist.fresh === 0);
  stylist.open = false; clearUnlocks();
  check('without the unlock the menu skips it', !offeredAt(null)(extra.k, extra.i) && offeredAt(town)(extra.k, extra.i));
  setMyLook(DEFAULT_LOOK);
  release();
  // quests: every town has a board posting kill quests for the areas above it
  release(); loadQuests([]);
  for (const a of TOWNS.map((t) => ({ id: t.id, town: t.name }))) {
    gotoPlace({ town: a.id });
    const b = game.floor.npcs?.find((n) => n.kind === 'board');
    const zones = game.floor.portals.map((q) => [q.x - q.w / 2 - 10, q.x + q.w / 2 + 10]).concat(game.floor.ladders.map((l) => [l.x - 7, l.x + 7]), game.floor.ropes.map((l) => [l.x - 7, l.x + 7]));
    if (!b || !zones.every(([lo, hi]) => b.x + NPC_R <= lo || b.x - NPC_R >= hi)) { check(`${a.town} has a clear quest board`, false); break; }
    const offers = boardOffers(a.id), ups = pathsFrom(a.id);
    const want = new Set((ups.length ? ups.map((p) => p.name) : [areaOf({ town: a.id })]).flatMap((n) => areaMobs(n).map((m) => m.n)));
    if (!offers.length || !offers.every((o) => want.has(o.mob) && o.exp > 0 && o.coins > 0)) { check(`${a.town} posts quests for the areas above`, false, offers.map((o) => o.mob).join(',')); break; }
  }
  check('every town has a quest board clear of portals, ladders and ropes', true);
  gotoPlace(START);
  const boardNpc = game.floor.npcs!.find((n) => n.kind === 'board')!;
  player.x = boardNpc.x; player.y = boardNpc.y - player.h; player.vy = 0; player.onGround = true; player.climb = null;
  tap('up');
  check('Up beside the board opens it', board.open && boardRows().length > 0);
  tap('z');
  check('Z takes the selected posting', quests.length === 1 && quests[0].have === 0);
  const q = quests[0];
  check('a taken posting leaves the offer list', boardRows().filter((r) => r.active === null).every((r) => r.q.mob !== q.mob));
  for (let i = 0; i < q.need + 3; i++) questKill(q.mob);
  questKill('Nobody');
  check('kills count toward the quest (capped at the goal)', q.have === q.need);
  const exp0 = player.exp, lvl0 = player.level, coins0 = wallet.coins;
  board.sel = 0; tap('z');
  check('Z hands in a finished quest for EXP and coins', quests.length === 0 && wallet.coins === coins0 + q.coins && (player.exp > exp0 || player.level > lvl0));
  for (let i = 0; i < 5; i++) { board.sel = boardRows().findIndex((r) => r.active === null); if (board.sel >= 0) tap('z'); }
  check(`at most ${QUEST_MAX} quests at once`, quests.length <= QUEST_MAX);
  const n0 = quests.length; board.sel = 0; tap('x');
  check('X drops an active quest', quests.length === n0 - 1);
  tap('escape');
  check('Esc closes the board (not the pause menu)', !board.open && !game.pause);
  release();
  // a kill in the world counts
  loadQuests([{ mob: 'Garden Snail', need: 2, have: 0, exp: 5, coins: 5 }]);
  gotoPlace(climb(1)); spawnMob({ x: 100, y: game.floor.platforms[0].y, types: ['Garden Snail'] } as never, MOB_TYPES[0]); killMob(game.mobs[game.mobs.length - 1]);
  check('killing an enemy advances its quest', quests[0].have === 1);
  // saved and restored
  const snap = snapshot();
  loadQuests([]); apply(snap);
  check('quests survive a save and load', quests.length === 1 && quests[0].mob === 'Garden Snail' && quests[0].have === 1);
  loadQuests([{ mob: 3 }, null, { mob: 'Enemy Crab', need: -5, have: 99, exp: 'x', coins: 1 }]);
  check('malformed saved quests are dropped or clamped', quests.length === 1 && quests[0].need === 1 && quests[0].have === 1 && quests[0].exp === 0);
  loadQuests([]);
}

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

// --- enemy variants: cousins of an area's enemies that turn up in their place ---
{
  const variants = MOB_TYPES.filter((m) => m.of);
  check('there are enemy variants', variants.length >= 15);
  check('every enemy has art (painted, hand-drawn or a palette swap)', MOB_TYPES.every((m) => hasMobArt(m.n)), MOB_TYPES.filter((m) => !hasMobArt(m.n)).map((m) => m.n).join(', '));
  check('every palette swap is of a hand-drawn enemy', Object.values(RECOLOR).every((r) => DRAWN.includes(r.base)));
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
  check('an elite is bigger and tougher, and worth more EXP', !n.elite && !!e.elite
    && e.w === Math.round(n.w * ELITE.SCALE) && e.h === Math.round(n.h * ELITE.SCALE)
    && e.hpMax === Math.round(n.hpMax * ELITE.HP) && e.dmg > n.dmg && e.exp === n.exp * ELITE.EXP);
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

// --- pet: bought once, follows you, fetches coin piles lying near you ---
{
  arena(); drops.length = 0; flying.length = 0;
  pet.owned = false; wallet.coins = PET.PRICE - 1;
  check("can't buy the pet without the coins", !buy('pet') && !pet.owned);
  wallet.coins = PET.PRICE + 5;
  check('buying the pet takes its price', buy('pet') && pet.owned && wallet.coins === 5);
  check('only one pet', !buy('pet') && wallet.coins === 5);
  step(1);
  check('it arrives at your shoulder', Math.abs(pet.x - (player.x - player.face * PET.BACK)) < 1);
  // a pile near you: it fetches it
  drops.push({ x: player.x + 60, y: ground().y, vy: 0, v: 7, t: COIN_LIFE, landed: true });
  const far = { x: player.x + PET.RANGE + 60, y: ground().y, vy: 0, v: 9, t: COIN_LIFE, landed: true };
  drops.push(far);
  step(Math.ceil(1 / P.STEP));
  check('the pet fetches a nearby pile into your wallet', wallet.coins === 12 && drops.length === 1, `coins ${wallet.coins} drops ${drops.length} pet ${pet.x.toFixed(0)},${pet.y.toFixed(0)} p ${player.x.toFixed(0)}`);
  step(Math.ceil(1 / P.STEP));
  check('it leaves piles out of its range', drops[0] === far && wallet.coins === 12);
  check('it comes back to you', Math.abs(pet.x - (player.x - player.face * PET.BACK)) < 4);
  // saved
  const snap = snapshot(); pet.owned = false; apply(snap);
  check('the pet survives a save and load', pet.owned);
  pet.owned = false; apply({ ...snap, pet: undefined });
  check('older saves have no pet', !pet.owned);
  drops.length = 0; flying.length = 0; wallet.coins = 0;
}

// --- achievements: counted across runs, unlock run bonuses and a cosmetic ---
{
  clearAchievements();
  arena();
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
  player.cd.Z = 0; player.useT = 0;
  const seen = new Set<object>();
  setKey('z', true); step(1); setKey('z', false);
  for (let i = 0; i < Math.ceil((P.Z_WINDUP + 0.3) / P.STEP); i++) { step(1); game.fx.filter((f) => f.type === 'tracer').forEach((f) => seen.add(f)); }
  const n = seen.size;
  check('a Z shot with nothing in range still fires every arrow', n === rank('Z').hits, `${n} tracers for ${rank('Z').hits} hits`);
  release();
}

// --- key rebinding: swaps, what a physical key drives, storage, the window ---
{
  resetBinds();
  check('by default every action is on its own key', ACTIONS.every((a) => binds[a.id] === a.id && actionFor(a.id) === a.id));
  bindKey('z', 'j');
  check('a rebound key drives its action', actionFor('j') === 'z' && keyName('Z') === 'J');
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
  check('the HUD and menus label the bound key', keyName('a') === 'H' && keyName('s') === 'S');
  resetBinds();
}

// --- skill art: Spike Lift, Tempest, Midair Spin and Air Dive have their own looks ---
{
  const ready = (): void => { for (const k of Object.keys(player.cd)) player.cd[k] = 0; player.useT = 0; player.mp = 999; };
  const fxOf = (t: string): boolean => game.fx.some((f) => f.type === t);
  const air = (): void => { player.y -= 40; player.vy = 0; player.onGround = false; };
  arena(30); player.ranks.E = 1; player.ranks.W = 1; player.ranks.MS = 1; player.ranks.R = 1;
  ready(); game.fx.length = 0; tap('e');
  check('Spike Lift erupts spikes from the ground', fxOf('spikes') && !fxOf('rush'));
  arena(30); player.ranks.W = 1; player.ranks.MS = 1; ready(); air(); game.fx.length = 0; tap('w');
  check('the Midair Spin whirls blades round you and spins the archer', fxOf('spin') && localPose() === 'spin');
  arena(30); player.ranks.R = 1; ready(); game.fx.length = 0; tap('r');
  check('Tempest sweeps an oval of energy as the archer vanishes', fxOf('tempest') && localPose() === 'vanish' && !fxOf('muzzle'));
  step(15);
  check('...and she is back once it ends', localPose() !== 'vanish');
  arena(30); player.ranks.AD = 1; ready(); air(); tap('q');
  check('the Air Dive draws its dive pose', player.diving && localPose() === 'dive');
  release();
}

// --- every enemy dies its own way ---
{
  const bases = MOB_TYPES.filter((m) => !m.of);
  check('every enemy has its own death', bases.every((m) => DEATHS[m.n]), bases.filter((m) => !DEATHS[m.n]).map((m) => m.n).join(', '));
  const looks = bases.map((m) => `${DEATHS[m.n]?.move}/${DEATHS[m.n]?.bits}`);
  check('no two enemies die the same way', new Set(looks).size === looks.length, looks.filter((l, i) => looks.indexOf(l) !== i).join(', '));
  check('a variant dies like the enemy it is a cousin of', MOB_TYPES.filter((m) => m.of).every((m) => deathOf(m) === DEATHS[m.of!]));
  arena(1); corpses.length = 0;
  const m = dummy(140);
  killMob(m);
  check('a defeated enemy is left dying where it fell', corpses.length === 1 && corpses[0].name === m.type.n && corpses[0].drop === 0);
  step(Math.ceil(DEATH_T / P.STEP) + 1);
  check('...and is gone when its death has played', corpses.length === 0);
  const f = dummy(140); f.fly = true; f.y -= 40;
  killMob(f);
  const c = corpses[0];
  check('one killed in the air falls to the ground as it dies', Math.abs(c.drop - 40) < 1 && Math.abs(deathPose(c, 1).dy - c.drop) < 1, `drop ${c.drop.toFixed(1)} dy ${deathPose(c, 1).dy.toFixed(1)}`);
  gotoPlace(climb(3)); step(1);
  check('deaths do not follow you to another floor', corpses.length === 0);
}

{
  // Aerial height gate: the air forms want ~2/3 of the jump's peak of height
  // (AIR_MIN_H), not just any airtime
  arena(20); player.ranks.E = 1; player.ranks.PV = 1;
  dummy(100);
  tap('c'); step(1); // just left the ground: ~9px of height
  const mp0 = player.mp;
  tap('e');
  check('Plunging Volley needs real height: early in the jump', player.cast !== 'barrage' && player.mp === mp0, `cast ${player.cast}`);
  step(7); // near the jump's apex (~35px)
  tap('e');
  check('Plunging Volley fires near the jump apex', player.cast === 'barrage' && player.mp < mp0, `cast ${player.cast}`);
}
{
  // the same gate on Air Dive and Midair Spin
  arena(20); player.ranks.Q = 1; player.ranks.AD = 1;
  tap('c'); step(1);
  const mp0 = player.mp;
  tap('q');
  check('Air Dive needs real height: early in the jump', player.cast !== 'rush' && player.mp === mp0, `cast ${player.cast}`);
  step(7);
  tap('q');
  check('Air Dive fires near the jump apex', player.cast === 'rush' && player.mp < mp0, `cast ${player.cast}`);
}
{
  // ...and on Midair Spin
  arena(20); player.ranks.W = 1; player.ranks.MS = 1;
  tap('c'); step(1);
  const mp0 = player.mp;
  tap('w');
  check('Midair Spin needs real height: early in the jump', player.mp === mp0 && player.cd['W.air'] === 0, `cd ${player.cd['W.air'].toFixed(1)}`);
  step(7);
  tap('w');
  check('Midair Spin fires near the jump apex', player.mp < mp0 && player.cd['W.air'] > 0, `cd ${player.cd['W.air'].toFixed(1)}`);
}

{
  // The world's vertical bounds: a big (or stacked) hop stops at the top
  arena(20);
  player.y = -40; player.vy = -100; player.onGround = false;
  step(1);
  check('the world clamps the player from above', player.y >= 0, `y ${player.y.toFixed(1)}`);
  player.y = WORLD.h; player.onGround = false; player.vy = 0;
  step(1);
  check('...and from below', player.y <= WORLD.h - player.h, `y ${player.y.toFixed(1)}`);
}

{
  // Electric Blitz self-link: a second blitz pressed during the first's
  // animation (with a charge banked) fires as soon as it clears
  arena(20); player.ranks.Q = 1; player.ranks.EB = 1; player.ranks.AD = 1;
  player.blitzCharges = P.BLITZ_MAX;
  dummy(150);
  check('blitzes start banked', player.blitzCharges === P.BLITZ_MAX, `charges ${player.blitzCharges}`);
  tap('q');
  check('the blitz opens its self-link window', player.blitzLinkT > 0, `t ${player.blitzLinkT.toFixed(2)}`);
  tap('q'); // pressed mid-animation: buffered, not dropped
  check('the second blitz is buffered', player.queued === 'Q', `queued ${player.queued}`);
  step(12); // the first blitz's slide (0.34s) ends
  check('the buffered blitz fires', player.blitzCharges === P.BLITZ_MAX - 2 && player.cast === 'rush',
    `charges ${player.blitzCharges} cast ${player.cast}`);
  check('the chained blitz opens a fresh window of its own', player.blitzLinkT > 0.5, `t ${player.blitzLinkT.toFixed(2)}`);
}

{
  // Aerial skills link into Glide: pressed while the cast is still going,
  // D fires on the spot (no use-time wait)
  arena(20); player.ranks.C = 1; player.ranks.D = 1; player.ranks.E = 1; player.ranks.PV = 1;
  dummy(100);
  tap('c'); step(8);
  tap('e');
  check('the volley opens the glide window', player.glideLinkT > 0 && player.useT > 0, `t ${player.glideLinkT.toFixed(2)} use ${player.useT.toFixed(2)}`);
  tap('d');
  check('the volley links into Glide', player.cast === 'jump' && player.glideLinkT <= 0, `cast ${player.cast} t ${player.glideLinkT.toFixed(2)}`);
}
{
  // ...and so does the Midair Spin
  arena(20); player.ranks.C = 1; player.ranks.D = 1; player.ranks.W = 1; player.ranks.MS = 1;
  dummy(150);
  tap('c'); step(8);
  tap('w');
  check('Midair Spin opens the glide window', player.glideLinkT > 0, `t ${player.glideLinkT.toFixed(2)}`);
  tap('d');
  check('the spin links into Glide', player.cast === 'jump' && player.cd.D > 0, `cast ${player.cast} cd ${player.cd.D.toFixed(2)}`);
}

{
  // With Sky Assault (W's upgrade) learned, W in the air is always Midair Spin
  arena(20); player.ranks.Q = 1; player.ranks.W = 1; player.ranks.AB = 1; player.ranks.MS = 1;
  const m = dummy(140);
  tap('c'); step(8);
  tap('w');
  check('W in the air is Midair Spin, not Sky Assault', player.cast === 'shoot' && player.skillPose === 'spin' && player.cd['W.air'] > 0 && player.hangT === 0,
    `cast ${player.cast} pose ${player.skillPose} cd ${player.cd['W.air'].toFixed(1)}`);
  check('the sweep hits the enemy below', m.hp < 1e6);
  step(30);
  check('the spin does not hover', player.onGround);
}

{
  // Tempest is a committed cast: locked in place and invulnerable while it
  // sweeps out (the use time already freezes movement; the storm grants i-frames)
  arena(20); player.ranks.R = 1;
  dummy(140);
  tap('r');
  check('Tempest locks you in place', player.cast === 'shoot' && player.useT > 0, `useT ${player.useT.toFixed(2)}`);
  check('...and you are invulnerable for the cast', player.invuln > 0 && player.invuln >= player.castT - 1e-9,
    `invuln ${player.invuln.toFixed(2)} castT ${player.castT.toFixed(2)}`);
  step(11); // the 0.36s storm plays out
  check('the invulnerability ends with the storm', player.invuln <= 0, `invuln ${player.invuln.toFixed(2)}`);
  // A buffered skill fires in the direction held when it releases, not when
  // it was pressed: Q left, Q right zips you back and forth
  arena(20); player.ranks.Q = 1;
  dummy(150);
  setKey('left', true);
  tap('q'); step(1); // the first rush slides left...
  setKey('left', false); setKey('right', true);
  tap('q'); // ...and the next one is buffered while the right key is held
  step(10); // the first rush (0.34s) ends and the buffered one fires
  check('the buffered rush fires right', player.face === 1 && player.vx > 0, `face ${player.face} vx ${player.vx.toFixed(0)}`);
  setKey('right', false);
}
{
  // EXP bar at max level: reads LV.100 and stays full
  arena(20);
  player.level = 99; player.exp = 500; player.expNext = 1000;
  check('below max level the bar shows exp/expNext', expBar().text === '500/1K' || expBar().text.includes('/'), expBar().text);
  player.level = MAX_LEVEL;
  check('at max level the bar reads LV.100', expBar().text === `LV.${MAX_LEVEL}`, expBar().text);
  check('...and the bar stays full', expBar().pct === 1);
}

{
  // Midair Spin links into Plunging Volley: E fires out of the sweep
  arena(20); player.ranks.W = 1; player.ranks.MS = 1; player.ranks.E = 1; player.ranks.PV = 1;
  dummy(100);
  tap('c'); step(8);
  tap('w');
  check('the spin opens the volley window', player.volleyLinkT > 0 && player.useT > 0, `t ${player.volleyLinkT.toFixed(2)}`);
  tap('e');
  check('the spin links into Plunging Volley', player.cast === 'barrage' && player.volleyLinkT <= 0,
    `cast ${player.cast} t ${player.volleyLinkT.toFixed(2)}`);
}
{
  // Air Dive links into the equipped ground rush, Skyfall-style: the dive's
  // window counts for Electric Blitz, not just the base Sky Toss
  arena(20); player.ranks.Q = 1; player.ranks.EB = 1; player.ranks.AD = 1;
  player.blitzCharges = P.BLITZ_MAX;
  dummy(150);
  tap('c'); step(8);
  tap('q'); step(12); // the dive lands and rolls into its rush
  check('the dive opens the Q-slot window with a Blitz equipped', player.combo > 0, `combo ${player.combo.toFixed(2)}`);
  const charges0 = player.blitzCharges;
  tap('q'); step(1); // the landing rush's tail is buffered, not dropped
  check('the blitz fires off the dive, no use-time wait', player.blitzCharges === charges0 - 1 && player.cast === 'rush',
    `charges ${player.blitzCharges} cast ${player.cast} charges0 ${charges0}`);
}

{
  // Both Qs end with a committed recovery (delay), shortened by Haste
  arena(20); player.ranks.Q = 1;
  dummy(150);
  const base = delayTime('Q');
  check('Sky Toss has its own delay, longer than the default', SKILLS.Q.delay === 0.35 && base < 0.35 + 1e-9, `${base.toFixed(3)}`);
  player.useT = 0; player.recoverT = 0;
  cast('Q');
  check('the cast ends in a recovery that outlasts the slide', player.recoverT === base && player.useT > 0);
  player.ranks.Q = 0; player.ranks.EB = 1;
  check('Electric Blitz carries the same committed recovery', SKILLS.EB.delay === 0.35 && delayTime('EB') === base);
  player.ranks.HA = 3;
  check('Haste shortens the recovery by 10% attack speed at rank 3', Math.abs(delayTime('EB') - 0.35 / 1.1) < 1e-6,
    `${delayTime('EB').toFixed(4)}`);
  player.ranks.HA = 0; player.ranks.EB = 0; player.ranks.Q = 1;
}

{
  // Off a Sky Assault hover: Glide ends the hover and carries you, and the
  // Air Dive snaps out of the assault pose into its own dive
  arena(30); player.ranks.Q = 1; player.ranks.W = 3; player.ranks.AB = 3; player.ranks.D = 1;
  dummy(130);
  tap('q'); step(14); tap('w'); step(3);
  check('hovering (setup)', player.hangT > 0 && !player.onGround, `hangT ${player.hangT.toFixed(2)}`);
  tap('d');
  check('Glide off the hover ends it', player.hangT === 0 && player.cast === 'jump' && player.vx !== 0,
    `hangT ${player.hangT.toFixed(2)} cast ${player.cast} vx ${player.vx.toFixed(0)}`);
  step(20);
  check('...and you fall with the glide', player.onGround || player.vy > -500, `vy ${player.vy.toFixed(0)}`);
}
{
  arena(30); player.ranks.Q = 1; player.ranks.W = 3; player.ranks.AB = 3; player.ranks.AD = 1;
  dummy(130);
  tap('q'); step(14); tap('w'); step(3);
  tap('q');
  check('Air Dive off the hover snaps out of the assault', player.hangT === 0 && player.cast === 'rush' && player.diving,
    `hangT ${player.hangT.toFixed(2)} cast ${player.cast}`);
  step(2);
  check('...and the dive plays out (no hover freeze)', player.hangT === 0 && (player.diving || player.rushT > 0),
    `diving ${player.diving} rushT ${player.rushT.toFixed(2)}`);}

{
  // Damage rework: the new per-skill hit/damage numbers
  check('Twin Shot hits up to 4 targets at 80% -> 120% per hit',
    SKILLS.Z.targetsMax === 4 && SKILLS.Z.dmg1 === 80 && SKILLS.Z.dmgMax === 120);
  check('Skyfall Volley fires 4 (not 6) at max', SKILLS.W.hits1 === 4 && SKILLS.W.hitsMax === 4);
  check('Sky Assault strikes 4 (not 8) at max', SKILLS.AB.hits1 === 4 && SKILLS.AB.hitsMax === 4);
  check('Midair Spin sweeps 4 hits at 200%', SKILLS.MS.hits1 === 4 && SKILLS.MS.hitsMax === 4 && SKILLS.MS.dmg1 === 200 && SKILLS.MS.dmgMax === 200);
  check('Electric Blitz strikes twice', SKILLS.EB.hits1 === 2 && SKILLS.EB.hitsMax === 2);
  check('Tempest storms 8 hits at 300% each', SKILLS.R.hits1 === 8 && SKILLS.R.hitsMax === 8 && SKILLS.R.dmg1 === 300 && SKILLS.R.dmgMax === 300);
  check('Air Dive lands one Sky Toss-strength hit', SKILLS.AD.hits1 === 1 && SKILLS.AD.dmg1 === 250 && SKILLS.AD.dmgMax === 400);
  // and the hits land: a Blitz rush (charge + two strikes) takes a big bite
  arena(20); player.ranks.Q = 3; player.ranks.EB = 3;
  player.blitzCharges = P.BLITZ_MAX;
  const m = dummy(140);
  tap('q'); step(24); // the slide ends and the strike lands (both hits)
  check('the Blitz rush strikes the carried enemy', m.hp < 1e6, `hp ${m.hp.toFixed(0)}`);
}

console.log(failures === 0 ? '\nAll mechanics checks passed.' : `\n${failures} mechanics check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
