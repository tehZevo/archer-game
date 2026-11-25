import { buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, trainer, TRAINER_ITEMS, wallet } from '../src/economy';
import { AREAS, areaName, isAreaEnd, isTown, lastTown, MAP_AREAS, placeName, townStage } from '../src/world';
// Mechanics checks, run with `npm test` after the smoke test. Each one is a
// short, seeded, deterministic run (a few hundred frames at most). No long
// fuzzing: if a check needs more than a second, shrink it.

// seed Math.random before anything generates a floor
let seed = 12345;
Math.random = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

import { ELITE, FX_DUR, MOB_TYPES, P } from '../src/config';
import { game, gotoFloor, mobLevel, player, spawnMob, spawnWave, SPAWN_SPREAD } from '../src/state';
import { cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, tintFor } from '../src/presence';
import { textWidth } from '../src/font';
import { ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout } from '../src/input';
import { update } from '../src/update';
import { surfaceYAt } from '../src/surface';
import { areaMobs, floorMobs, groupSize, LAYOUTS, makeShape, SHAPES, type Layout } from '../src/floor';
import { MOB_ART, paintMob } from '../src/mobart';
import { miniRect, MINI_SCALE, toMini } from '../src/minimap';
import { TILE, WORLD } from '../src/config';
import { ANIM_RATE, mobFrame } from '../src/mobanim';
import { BAR_SHOW, damage, killMob, NUM_GAP, NUM_LINE } from '../src/combat';
import { barrageTargets, cast } from '../src/skills';
import { activeSkill, STAT_GAIN, PAUSE_ROWS, pauseScroll, rank, recalcStats, skillRows, spendSkill } from '../src/progress';
import { fmtNum } from '../src/util';
import { BOSS, bossAlive, quakes } from '../src/boss';
import { cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook } from '../src/look';
import { stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP } from '../src/stylist';
import { styled } from '../src/archer';
import { board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests } from '../src/quests';
import { apply, clearSave, hasSave, load, save, snapshot } from '../src/save';
import { baseOf, lastTown } from '../src/world';
import { boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate } from '../src/boost';
import { canConnect, hourStamp, net, newCode, parseCode, roomId } from '../src/net';
import { activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X } from '../src/menu';
import { hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt } from '../src/tileset';
import { PROP_H, PROP_W, propAt, PROPS } from '../src/props';
import { BACKDROPS, particlesAt } from '../src/backdrop';
import { expToNext, killsToLevel, mobExp } from '../src/progress';
import { dev, devStops } from '../src/dev';
import { devInput } from '../src/update';
import { addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap } from '../src/chat';
import { say } from '../src/net';
import { archerFrame, climbPhase, GRIDS, POSE_FPS } from '../src/archer';
import { ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet } from '../src/ghost';
import { keysKey, keysUi, KEY_ROWS } from '../src/keys';
import { pet, PET } from '../src/pets';
import { achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea } from '../src/achievements';
import { startRun } from '../src/save';
import { coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods } from '../src/floormods';
import { generateFloor } from '../src/floor';
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

/** Fresh floor 1 with no mobs, the player standing at x on the ground. */
function arena(level = 1, x = 100): void {
  release();
  gotoFloor(1); game.mobs = []; game.floor.spawns = [];
  player.level = level; player.stats = { dex: 0, vit: 0, spi: 0, luk: 0 }; recalcStats();
  for (const k of Object.keys(player.ranks) as (keyof typeof player.ranks)[]) player.ranks[k] = ['Z', 'C', 'D', 'Q'].includes(k) ? 1 : 0;
  player.mp = 999; player.hp = player.hpMax; player.face = 1; player.x = x; player.y = ground().y - player.h;
  player.vx = player.vy = 0; player.onGround = true; player.climb = null; player.dropBlock = null;
  player.useT = 0; player.cast = null; player.castT = 0; player.combo = 0; player.queued = null; player.hangT = 0;
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
    gotoFloor(n); game.mobs = []; game.floor.spawns = [];
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
    release(); gotoFloor(1); game.mobs = []; game.floor.spawns = [];
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
    gotoFloor(n); game.mobs = []; game.floor.spawns = [];
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
  check('Lv.1 Garden Snail takes 2-4 Twin Shots', avg >= 2 && avg <= 4, `avg ${avg}`);
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
  const air = barrageTargets(), top = air.length ? Math.min(...air.map((a) => a.y)) : y0 - 40;
  tap('w');
  const up = y0 - player.y;
  let hover = 0;
  for (let i = 0; i < 45; i++) { const y = player.y; step(); if (player.y === y && !player.onGround) hover++; }
  check('Sky Assault warps straight up without moving sideways', up > 0 && player.x === x0, `up ${up.toFixed(1)} dx ${(player.x - x0).toFixed(2)}`);
  check('Sky Assault hovers about half a second, then lands', hover >= 12 && hover <= 18 && player.onGround, `hover ${hover} frames`);
  check('Sky Assault hits', m.hp < hp0);
  const peak = y0 - Math.min(y0, top - player.h - 4);
  check('Sky Assault rises 1.5x the way to the launched enemy (twice its old height)', P.BARRAGE_RISE === 1.5 && Math.abs(up - peak * P.BARRAGE_RISE) < 1, `up ${up.toFixed(1)} full ${peak.toFixed(1)}`);
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
  check('the Sky Toss charge hits each enemy it scoops up, once', hits === 1, `${hits} hits during the slide`);
  step(2);
  check('Sky Toss strikes and launches as the slide ends', m.hp < 1e6 && m.airTime > 0);
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
    release(); gotoFloor(n); player.x = 4; player.invuln = 999;
    [...game.mobs].slice(0, 3).forEach(killMob);
    step(Math.round((P.WAVE_EVERY + 1) / P.STEP));
    for (const z of game.floor.spawns) if (game.mobs.filter((m) => m.spawn === z).length > (z.cap ?? 1) + P.HEAT_EXTRA) over++;
  }
  check('enemy waves never exceed a zone cap (plus the overflow from a farmed platform)', over === 0, `${over} zones over`);
}

// --- spread spawns: farming one platform moves its enemies to the others ---
{
  release(); gotoFloor(1); player.invuln = 999;
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

// --- progression: upgrades keep the base skill's rank ---
{
  arena(30);
  player.ranks.Z = 3; player.sp = 1;
  spendSkill('S');
  check('upgrading Twin Shot to Shell Barrage keeps rank 3', activeSkill('Z').key === 'S' && rank('Z').level === 3);
  check('movement skills are never offered for ranks', !skillRows().some((r) => (r.key === 'C' || r.key === 'D') && r.action));
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

// --- branching upgrades: one branch per slot locks out the other ---
{
  arena(30);
  player.ranks.Z = 2; player.sp = 2;
  const offered = skillRows().map((r) => r.key);
  check('Z offers both branches (Shell Barrage, Backstep Shot)', offered.includes('S') && offered.includes('BS'));
  spendSkill('BS');
  check('taking Backstep Shot binds it to Z and keeps the rank', activeSkill('Z').key === 'BS' && rank('Z').level === 2);
  check('the rival branch is locked out', !skillRows().some((r) => r.key === 'S') && !spendSkill('S') && player.ranks.S === 0);
}
{
  arena(30); player.ranks.BS = 1;
  const m = dummy(140);
  const x0 = player.x;
  tap('z'); step(10);
  check('Backstep Shot hops backward while hitting ahead', player.x < x0 - 8 && m.hp < 1e6 && player.face === 1, `dx ${(player.x - x0).toFixed(1)}`);
}
{
  arena(20); player.ranks.VS = 1; player.ranks.W = 1;
  const m = dummy(140);
  const x0 = player.x, y0 = player.y;
  tap('q'); step(6);
  check('Vault Shot leaps up and backward', player.y < y0 - 20 && player.x < x0, `dy ${(y0 - player.y).toFixed(1)} dx ${(player.x - x0).toFixed(1)}`);
  check('Vault Shot launches the enemy ahead', m.hp < 1e6 && m.airTime > 0);
  const hp0 = m.hp; step(6); tap('w'); step(15);
  check('Vault Shot opens the link window for W', m.hp < hp0);
}
{
  // Rising Arrow: the other Sky Toss branch
  arena(20); player.ranks.RA = 1; player.ranks.W = 1;
  const m = dummy(130);
  const x0 = player.x, y0 = player.y;
  tap('q');
  let gap = 0;
  for (let i = 0; i < 8; i++) { step(1); gap = Math.max(gap, Math.abs((player.y + player.h) - (m.y + m.h))); }
  check('Rising Arrow launches the enemy ahead', m.hp < 1e6 && m.airTime > 0);
  check('Rising Arrow jumps straight up with it (rising together)', player.y < y0 - 40 && Math.abs(player.x - x0) < 16 && gap < 12, `dy ${(y0 - player.y).toFixed(1)} gap ${gap.toFixed(1)}`);
  const hp0 = m.hp; tap('w'); step(15);
  check('Rising Arrow opens the link window for W in the air', m.hp < hp0);
  arena(20); player.ranks.RA = 1;
  check('Rising Arrow and Vault Shot are rival branches', !skillRows().some((r) => r.key === 'VS'));
}

// --- E / R ---
{
  arena(10); player.ranks.E = 1;
  const under = dummy(100), beside = dummy(170);
  tap('e');
  check('Plunging Volley does nothing on the ground', player.cd.E === 0 && under.hp === 1e6);
  // jump, then fire at the top of the jump
  tap('c'); step(8);
  const yTop = player.y; player.vx = 40; tap('e'); step(1);
  check('Plunging Volley bumps you up a little', player.y < yTop && player.y > yTop - 8 && player.vy < 0, `rose ${(yTop - player.y).toFixed(1)}px`);
  step(4);
  check('Plunging Volley does not freeze you mid-air', player.vy > 0 && player.vx !== 0);
  step(10);
  check('Plunging Volley hits the enemy beneath you', under.hp < 1e6);
  check('Plunging Volley leaves enemies off to the side alone', beside.hp === 1e6);
  step(30);
  check('after the volley you drop back down', player.onGround);
}
{
  arena(25); player.ranks.R = 1;
  const a = dummy(130), b = dummy(250);
  tap('r'); step(15);
  check('Piercing Arrow hits every enemy in the line', a.hp < 1e6 && b.hp < 1e6);
  const hp = a.hp; player.useT = 0; tap('r'); step(5);
  check('Piercing Arrow is on a long cooldown', a.hp === hp && player.cd.R > 4);
}
{
  // Haste: +attack speed shortens use time, never cooldowns; Twin Shot is paced by use time alone
  arena(25); dummy(130);
  cast('Z');
  const base = player.useT;
  check('Twin Shot has a use time and no cooldown', base > 0.4 && player.cd.Z === 0);
  player.useT = 0; player.cd.R = 0; player.ranks.R = 1; cast('R');
  const rCd = player.cd.R, rUse = player.useT;
  player.ranks.HA = 3; player.useT = 0; player.cd.R = 0; cast('R');
  check('Haste shortens use time by 10% attack speed at rank 3', Math.abs(player.useT - rUse / 1.1) < 1e-6);
  check('Haste leaves cooldowns alone', player.cd.R === rCd);
  player.useT = 0; cast('Z');
  check('a hasted Twin Shot fires about 10% faster', Math.abs(player.useT - base / 1.1) < 1e-6);
  player.ranks.HA = 0; player.ranks.R = 0;
}

// --- private instances ---
{
  const c = newCode();
  check('instance codes are 5 letters without I or O', /^[A-HJ-NP-Z]{5}$/.test(c), c);
  check('typed codes are normalised; wrong lengths rejected', parseCode(' abc-de ') === 'ABCDE' && parseCode('ABCD') === '' && parseCode('ABCDEF') === '');
  check('public rooms are per floor + channel', roomId(3, 2, '') === 'eurekaland-f3-c2');
  check('a private instance is its own room per floor', roomId(3, 2, 'ABCDE') === 'eurekaland-f3-pABCDE' && roomId(3, 7, 'ABCDE') === roomId(3, 2, 'ABCDE'));
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
check('new poses go on the end of the networked list (older clients read them as idle)', POSES.indexOf('prone') === POSES.length - 1 && POSES[0] === 'idle');
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
  gotoFloor(1);
  const tiles = game.floor.platforms.filter((p) => !p.inner && p.slope);
  for (const p of tiles) for (const face of [1, -1] as const) {
    arena(1); game.floor.spawns = [];
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
  for (let n = 1; n <= 25; n++) {
    if (isTown(n)) continue;
    gotoFloor(n);
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
  check('floors 1-25 use every layout (stack, zigzag, open)', seen.size === Object.keys(LAYOUTS).length, [...seen].join(','));
  check('each layout keeps its block count, widths and span; zigzags switch sides; climbs never stack', bad.length === 0, bad.slice(0, 6).join('; '));
}

// --- save / load ---
{
  // a tiny in-memory localStorage for the headless run
  const mem: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; },
  };
  const areaId = (name: string): number => AREAS.find((a) => a.name === name)!.id;
  arena(35); gotoFloor(13, areaId('Forest')); // Mossgate
  player.exp = 123; player.ap = 7; player.sp = 2; player.stats.dex = 9; player.ranks.Z = 3; player.ranks.BS = 3; player.ranks.E = 2;
  save();
  const want = JSON.stringify(snapshot());
  arena(1); player.ap = 0; player.sp = 0; player.ranks.BS = 0; player.ranks.E = 0;
  const floor = load();
  check('save round-trips level, EXP, points, stats, ranks and the branch taken', JSON.stringify({ ...snapshot(), floor: 13 }) === want && floor === 13 && net.area === areaId('Forest'));
  const at = (n: number, a: string): string => { const t = lastTown(n, areaId(a)); return `${t.stage}:${AREAS[t.area].name}`; };
  check('you resume on the latest town on your branch (floor 1 before the first)',
    at(13, 'Forest') === '13:Forest' && at(12, 'Meadow') === '7:Beach' && at(5, 'Beach') === '3:Tide Pools' && at(2, 'Tide Pools') === '1:Tide Pools');
  gotoFloor(10, areaId('Meadow')); save(); arena(1); gotoFloor(1, 0);
  check('a save on the floors of an area resumes in the town below it', load() === 7 && net.area === areaId('Beach'));
  check('loading recomputes derived stats', player.hp === player.hpMax && player.war > 14 + 33);
  check('a corrupt or old-version save is ignored', apply({ v: 99, level: 50 }) === null && apply('junk') === null);
  apply({ v: 1, level: 1e9, exp: -5, ap: 'x', sp: 3, stats: { dex: -2 }, ranks: { Z: 99, S: 1, BS: 1 }, floor: 0 });
  check('out-of-range values are clamped', player.level === 100 && player.exp === 0 && player.ap === 0 && player.stats.dex === 0 && player.ranks.Z === 3 && player.ranks.S + player.ranks.BS === 1);
  clearSave();
  check('reset forgets the save', !hasSave() && load() === 1);
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
    arena(level); gotoFloor(floor); game.mobs = [];
    spawnMob({ x: 100, y: ground().y, types: ['Garden Snail'] } as never, MOB_TYPES[0]);
    return game.mobs[0].exp;
  };
  check('mob EXP ignores the player level', expAt(3, 1) === expAt(3, 40));
  check('mobs on higher floors are worth more EXP', expAt(8, 5) > expAt(2, 5));
  check('mob level counts combat floors, not towns', mobLevel(1) === 1 && mobLevel(2) === 2 && mobLevel(4) === 3 && mobLevel(8) === 6);
  {
    // EXP: ~10 same-level kills per level at Lv.1, ~100 at Lv.99 (vs level-100 enemies), smooth between
    const kills = (lv: number, mob: number) => Math.ceil(expToNext(lv) / mobExp(mob));
    check('Lv.1 takes about 10 kills of level-1 enemies', kills(1, 1) === 10, `${kills(1, 1)}`);
    check('Lv.99 takes about 100 kills of level-100 enemies', Math.abs(kills(99, 100) - 100) <= 8, `${kills(99, 100)}`);
    let smooth = true;
    for (let l = 1; l < 99; l++) if (kills(l + 1, l + 1) < kills(l, l) || kills(l + 1, l + 1) > kills(l, l) + 3) smooth = false;
    check('kills per level climb steadily from 10 to 100', smooth && Math.abs(killsToLevel(50) - Math.sqrt(10 * 100)) < 1);
    check('higher-level enemies are worth more, and a mob carries its level', mobExp(20) > mobExp(10) && Math.abs(mobExp(5, 10) - mobExp(5) * 10) <= 10);
    gotoFloor(2); spawnMob(game.floor.spawns[0], MOB_TYPES[0]);
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
    gotoFloor(n);
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

  const xs = Array.from({ length: 12 }, () => { gotoFloor(1); return player.x; });
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
  const open = (): void => { initMenu(() => { started++; }, 3); };
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
    gotoFloor(n);
    const plats = game.floor.spawns.filter((z) => z.block !== undefined);
    zones += plats.length; groups += plats.filter((z) => (z.cap ?? 1) >= 4 && (z.cap ?? 1) <= 8).length;
  }
  check('platform spawn zones hold groups of 4-8', zones > 0 && groups === zones, `${groups}/${zones}`);

  // launch every enemy hard sideways and up; none may end up anywhere but its own platform
  release(); gotoFloor(2); player.invuln = 999; player.x = 4;
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
    release(); gotoFloor(n);
    const f = game.floor, g = f.platforms[0], top = Math.min(...f.portals.map((p) => p.y - p.h));
    hs.push(f.h);
    if (WORLD.h !== f.h || g.h !== 4 * TILE || g.y + g.h !== f.h || top < 2 * TILE || top > 3 * TILE || f.h < 180) ok = false;
    if (f.platforms.some((p) => p.y < 0) || f.ropes.some((c) => c.y1 < 0)) ok = false;
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
  const areaId = (name: string): number => AREAS.find((a) => a.name === name)!.id;
  const beach = areaId('Beach'), forest = areaId('Forest'), meadow = areaId('Meadow');
  release(); gotoFloor(7, beach); // Driftwood Rest
  const f = game.floor, layout = JSON.stringify(f.platforms);
  net.channel = 3; gotoFloor(7, beach); const other = JSON.stringify(game.floor.platforms); net.channel = 1;
  check('towns are a designed layout (the same on every channel and town)', layout === other);
  gotoFloor(7, beach);
  const [upL, upR, down] = game.floor.portals;
  check('a town has two ways up and one down', game.floor.portals.length === 3 && upL.to === 8 && upR.to === 8
    && upL.area === forest && upR.area === meadow && down.to === 3 && down.area === 0 && game.mobs.length === 0);
  const deck = game.floor.platforms.filter((p) => p.block === 1 && !p.inner);
  const deckTop = Math.min(...deck.map((p) => p.y));
  check('the plaza deck is reached by a ladder and a rope from the ground',
    game.floor.ladders[0].y1 === deckTop && game.floor.ropes[0].y1 === deckTop && game.floor.ladders[0].y2 === game.floor.platforms[0].y);
  // two-level towns: a loft over the deck, up a ladder, with the way down on it
  let lofts = 0, flat = 0, loftsOk = true;
  for (const a of AREAS) {
    gotoFloor(townStage(a.depth), a.id);
    const fl = game.floor, dk = fl.platforms.filter((p) => p.block === 1), lf = fl.platforms.filter((p) => p.block === 2);
    const dTop = Math.min(...dk.map((p) => p.y)), dn = fl.portals.find((q) => q.to < fl.number)!;
    if (!lf.length) { flat++; if (dn.y !== dTop) loftsOk = false; continue; }
    lofts++;
    const lTop = Math.min(...lf.map((p) => p.y)), lBottom = Math.max(...lf.map((p) => p.y + p.h));
    const lad = fl.ladders[1];
    const ok = dn.y === lTop && lf.some((p) => !p.inner && p.y === lTop && dn.x >= p.x && dn.x <= p.x + p.w)
      && lad && lad.y1 === lTop && lad.y2 === dTop
      && dTop - lBottom >= player.h + 4 // you can walk the deck under it
      && Math.abs(lad.x - dn.x) >= dn.w / 2 + 10 + 7; // climbing off the ladder isn't standing in the portal
    if (!ok) { loftsOk = false; check(`${a.town}'s loft`, false); break; }
  }
  check("some towns have a second level and some don't", lofts > 0 && flat > 0, `${lofts} two-level, ${flat} one-level`);
  check("a loft holds the way down, up a ladder from the deck, with headroom under it", loftsOk);
  gotoFloor(7, beach);
  check('every area has its own rooms, its town too (the first area keeps the plain ids)',
    roomId(13, 1, '', forest) !== roomId(13, 1, '', meadow) && roomId(8, 1, '', forest) !== roomId(8, 1, '', meadow) && !roomId(3, 1, '', 0).includes('-a'));

  player.hp = 5; player.mp = 1;
  stand(upR); tap('up');
  const meadowFloor = JSON.stringify(game.floor.platforms);
  check('the right portal goes up into the right area', game.floor.number === 8 && net.area === meadow);
  check('arriving does not refill HP or MP', player.hp === 5 && player.mp === 1);
  gotoFloor(7, beach); stand(game.floor.portals[0]); tap('up');
  check('the left portal goes up into the left area, a different layout', game.floor.number === 8 && net.area === forest && JSON.stringify(game.floor.platforms) !== meadowFloor);
  gotoFloor(13, meadow); stand(game.floor.portals[game.floor.portals.length - 1]); tap('up');
  check("a town's way down goes to the town it branched off (not the floor below)", game.floor.number === 7 && game.floor.town && net.area === beach);
  gotoFloor(3, 0); stand(game.floor.portals[game.floor.portals.length - 1]); tap('up');
  check("the first town's way down leads to the floor below it", game.floor.number === 2 && net.area === 0);
  check('skills work in town', (() => { gotoFloor(7, beach); player.cd.Z = 0; player.mp = 99; player.useT = 0; tap('z'); return player.useT > 0; })());
  net.area = 0; release();
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
    release(); gotoFloor(n); player.invuln = 1e9; player.x = 4; player.y = 0; player.climb = null;
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
    release(); gotoFloor(n);
    const count = Math.min(10, game.mobs.filter((m) => !m.fly).length);
    for (let k = 0; k < count; k++) for (const face of [1, -1]) {
      release(); gotoFloor(n); player.invuln = 1e9; player.mp = 999; player.ranks.Q = 1;
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
  let townN = 1; while (gotoFloor(townN), !game.floor.town) townN++;
  const keeper = game.floor.npcs?.find((n) => n.kind === 'shop');
  check('towns have a shopkeeper', !!keeper);
  const zones = game.floor.portals.map((q) => [q.x - q.w / 2 - 10, q.x + q.w / 2 + 10]).concat(game.floor.ladders.map((l) => [l.x - 7, l.x + 7]), game.floor.ropes.map((l) => [l.x - 7, l.x + 7]));
  check("the shopkeeper's talk spot doesn't overlap a portal, ladder or rope", zones.every(([a, b]) => keeper!.x + NPC_R <= a || keeper!.x - NPC_R >= b));
  player.x = keeper!.x; player.y = keeper!.y - player.h; player.vy = 0; player.onGround = true; player.climb = null;
  wallet.coins = PRICES.hp + 5; wallet.hp = 0;
  tap('up');
  check('Up beside the shopkeeper opens the shop', shop.open && game.floor.number === townN);
  tap('z');
  check('buying takes the coins and adds a potion', wallet.coins === 5 && wallet.hp === 1);
  check("can't buy without the coins", !buy('mp') && wallet.mp === 0);
  tap('escape');
  check('Esc closes the shop (not the pause menu)', !shop.open && !game.pause);
  release();

  // the trainer: from the third town up, respec for coins
  gotoFloor(townStage(0));
  check('the first town has a shopkeeper and no trainer', game.floor.npcs!.filter((n) => n.kind !== 'stylist' && n.kind !== 'board').length === 1 && game.floor.npcs![0].kind === 'shop');
  gotoFloor(townStage(2));
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
  check('a full reset refunds every AP and SP spent',
    player.stats.dex === 0 && player.ap === 4 && player.ranks.Z === 1 && player.sp === 2 && wallet.coins === 0,
    `ap ${player.ap} sp ${player.sp} Z ${player.ranks.Z}`);
  tap('escape');
  release();

  // saved
  const mem: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
  wallet.coins = 77; wallet.hp = 3; wallet.mp = 4; save();
  wallet.coins = 0; wallet.hp = 0; wallet.mp = 0; load();
  check('coins and potions are saved', wallet.coins === 77 && wallet.hp === 3 && wallet.mp === 4);
  check('an older save without them starts empty', apply({ ...JSON.parse(mem[Object.keys(mem)[0]]), coins: undefined, potions: undefined }) !== null && wallet.coins === 0 && wallet.hp === 0);
  delete (globalThis as { localStorage?: unknown }).localStorage;
}

// --- places: a tree of areas, each with its own town ---
{
  const areaId = (name: string): number => AREAS.find((a) => a.name === name)!.id;
  check('an area\'s floors are followed by a town', !isTown(2) && isTown(3) && !isTown(4) && isTown(7) && isTown(13));
  check('the game starts in the Tide Pools, below the Beach', AREAS[0].name === 'Tide Pools' && AREAS[AREAS[0].up[0]].name === 'Beach');
  check('places read as area + floor within it', placeName(1, 0) === 'Tide Pools 1' && placeName(4, areaId('Beach')) === 'Beach 1' && placeName(9, areaId('Forest')) === 'Forest 2');
  check('every area has its own town, all named apart', placeName(13, areaId('Forest')) === 'Mossgate' && placeName(13, areaId('Meadow')) === 'Lanternhollow'
    && new Set(AREAS.map((a) => a.town)).size === AREAS.length);
  check('the tower is a strict tree: one parent each, no cycles, depths step by one',
    AREAS.every((a) => a.id === 0 ? a.parent === -1 : AREAS[a.parent].up.includes(a.id) && AREAS[a.parent].depth === a.depth - 1)
    && AREAS.every((a) => a.up.length <= 2));
  check('a fork leads into two different areas', AREAS.every((a) => a.up.length < 2 || areaName(a.up[0]) !== areaName(a.up[1])));
  check('branches can end (a town with no way up)', AREAS.some((a) => a.up.length === 0 && a.depth < 6));
  check('the floor before a town is the area end (the boss floor, later)', isAreaEnd(2) && isAreaEnd(6) && isAreaEnd(12) && !isAreaEnd(7));

  release(); gotoFloor(7, areaId('Beach'));
  const [l, r, d] = game.floor.portals.map((p) => p.label);
  check('town portals are labelled with where they go', l === 'Forest 1' && r === 'Meadow 1' && d === 'Saltwick', `${l} | ${r} | ${d}`);
  gotoFloor(12, areaId('Meadow'));
  check('the way into a town is labelled with its own name', game.floor.portal.label === 'Lanternhollow');
  check('the HUD place follows your area', placeName(game.floor.number, net.area) === 'Meadow 5');
  gotoFloor(townStage(AREAS[areaId('Mushroom Grotto')].depth), areaId('Mushroom Grotto'));
  check('a town at the end of a branch has only its way down', game.floor.portals.length === 1 && game.floor.portals[0].to < game.floor.number);
  gotoFloor(game.floor.number + 1);
  check('nothing lies above the end of a branch (a warp past it stays in its town)', game.floor.town && placeName(game.floor.number, net.area) === 'Sporehollow');
  net.area = 0; release();
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
  initMenu(() => {}, 1);
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
  check('every area on the map has a tileset (Classic until it gets its own)', ['Beach', 'Forest', 'Cave', 'Swamp', 'Mountain', 'Sky', 'Clockwork Spire'].every((a) => !!tilesetFor(a)));
  check('Clockwork Spire is on the map', MAP_AREAS.includes('Clockwork Spire'));
  const fallback = ['Old Keep', 'Ember Wastes', 'Sky Reef', 'Chapel Spire', 'Summit']; // no sets of their own yet
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
  for (let i = 0; i < 400; i++) { const k = propAt('Forest', i, 7); if (k !== null) { placed++; if (k < 0 || k >= PROPS.Forest.length) placed = -999; } }
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
  const before = roomId(5, 1);
  setKey('[', true); step(1); setKey('[', false);
  const lv = player.level, fl = game.floor.number;
  setKey(']', true); step(1); setKey(']', false); step(1);
  check('[ and ] do nothing without ?dev', player.level === lv && game.floor.number === fl);
  dev.on = true;
  check('dev rooms get their own ids', roomId(5, 1) === before + '-dev' && roomId(5, 0, 'ABCDE').endsWith('-dev'));
  setKey(']', true); step(1); setKey(']', false); step(1);
  check('] warps up a floor in dev mode', game.floor.number === fl + 1);
  setKey('`', true); step(1); setKey('`', false); step(1);
  check('` opens the dev menu', dev.open);
  const stops = devStops();
  check('the dev menu lists the start and every town', stops[0].stage === 1 && stops.length === AREAS.length + 1
    && stops.slice(1).every((s, i) => isTown(s.stage) && s.area === i && s.name.trim() === AREAS[i].town));
  check('the dev menu labels towns by their area', stops[2].label === AREAS[1].name);
  dev.sel = 2; setKey('enter', true); devInput(P.STEP); clearPressed(); setKey('enter', false);
  check('picking a town warps there and closes the menu', game.floor.number === stops[2].stage && net.area === stops[2].area && game.floor.town && !dev.open);
  net.area = 0;
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
  check('floor rooms are tagged with the hour', roomId(5, 2, '', 0, '2026112414') === 'eurekaland-f5-c2-h2026112414' && roomId(5, 1, 'ABCDE', 0, '2026112414').endsWith('-pABCDE-h2026112414'));
  check('towns have no hour tag', roomId(3, 1, '', 0, '2026112414') === 'eurekaland-f3-c1');
  check('no hour yet: no tag', roomId(5, 1, '', 0, '') === 'eurekaland-f5-c1');
  const was = net.hour;
  net.hour = '2026112414'; gotoFloor(4); const a = JSON.stringify(game.floor.platforms.map((p) => [p.x, p.y]));
  net.hour = '2026112415'; gotoFloor(4); const b = JSON.stringify(game.floor.platforms.map((p) => [p.x, p.y]));
  check('a floor\'s layout is the same whatever the hour', a === b);
  net.hour = was;
}

{
  // enemies: two types per floor from the area's set; each platform fields one or both
  const beach = areaMobs('Beach').map((m) => m.n);
  check('the Beach has its own enemies (snail, crab, hermit crab, gull)', ['Garden Snail', 'Crab', 'Hermit Crab', 'Gull'].every((n) => beach.includes(n)));
  check('areas without a set use the general pool', areaMobs('Old Keep').every((m) => !m.areas || m.areas.includes('*')) && areaMobs('Old Keep').length >= 2);
  const withOwn = Object.keys(TILESETS).filter((a) => !['Classic'].includes(a));
  check('every area with its own tileset has its own enemies (two or more)', withOwn.every((a) => MOB_TYPES.filter((m) => m.areas?.includes(a)).length >= 2),
    withOwn.filter((a) => MOB_TYPES.filter((m) => m.areas?.includes(a)).length < 2).join(', '));
  let artOk = true;
  for (const [name, { look }] of Object.entries(MOB_ART)) for (const f of [0, 1]) {
    paintMob(name, f, (x, y, c, w = 1, h = 1) => { if (x < 0 || y < 0 || x + w > look.w || y + h > look.h || !/^#[0-9a-f]{6}$/i.test(c)) artOk = false; });
  }
  check('enemy art paints inside its box (the hitbox)', artOk);
  check('every enemy with painted art uses its box as its size', MOB_TYPES.filter((m) => MOB_ART[m.n]).every((m) => m.w === MOB_ART[m.n].look.w && m.h === MOB_ART[m.n].look.h));
  let pairsOk = true, singles = 0, doubles = 0;
  for (const n of [1, 2, 4, 5, 6]) { // the Tide Pools and the Beach
    gotoFloor(n);
    const ground = game.floor.spawns[game.floor.spawns.length - 1].types;
    const [a, b] = ground;
    if (ground.length !== 2 || a === b || !beach.includes(a) || !beach.includes(b)) pairsOk = false;
    for (const z of game.floor.spawns.slice(0, -1)) {
      if (!z.types.every((t) => t === a || t === b)) pairsOk = false;
      if (z.types.length === 1) singles++; else doubles++;
    }
  }
  check('each Tide Pools and Beach floor fields two different beach enemies', pairsOk);
  check('some platforms field one type, some both', singles > 0 && doubles > 0, `${singles} single, ${doubles} both`);
  const seq = () => { let i = 0; return () => [0.1, 0.9, 0.5][i++ % 3]; };
  check('a floor\'s pair is fixed by its seed', JSON.stringify(floorMobs(3, seq())) === JSON.stringify(floorMobs(3, seq())));
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
  let endN = 1; while (!isAreaEnd(endN)) endN++;
  gotoFloor(endN - 1, 0);
  check('no boss before the last floor of an area', !game.mobs.some((m) => m.boss));
  gotoFloor(townStage(0), 0);
  check('no boss in a town', !game.mobs.some((m) => m.boss));
  gotoFloor(endN, 0);
  const bs = game.mobs.filter((m) => m.boss);
  check("an area's last floor has exactly one boss", bs.length === 1);
  const boss = bs[0];
  check('the boss is one of its enemies, grown huge and much tougher',
    boss.w === boss.type.w * BOSS.SCALE && boss.h === boss.type.h * BOSS.SCALE && boss.hpMax >= boss.type.hp * BOSS.HP && !boss.fly);
  const hp0 = player.hpMax;
  player.hpMax = player.hp = 1e7;
  const ground = game.floor.platforms[0];
  const stand = (x: number): void => { player.x = x; player.y = ground.y - player.h; player.vx = player.vy = 0; player.onGround = true; player.plat = ground; player.climb = null; player.invuln = 0; };
  const up = game.floor.portals.find((q) => q.to > endN)!;
  player.x = up.x; player.y = up.y - player.h; player.vx = player.vy = 0; player.onGround = true; player.climb = null;
  tap('up');
  check('the way up is sealed while the boss stands', game.floor.number === endN && bossAlive() === boss);
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
  // beaten: the way up opens
  killMob(boss);
  check('beating the boss clears it', !bossAlive());
  player.x = up.x; player.y = up.y - player.h; player.vx = player.vy = 0; player.onGround = true; player.climb = null;
  tap('up');
  check('then the way up opens', game.floor.number > endN);
  player.hpMax = player.hp = hp0;
  // looks: hair style, hair colour, skin and outfit; set from the menu or the town stylist
  check('a bad saved look falls back to the default', JSON.stringify(cleanLook({ style: 99, hair: -1, skin: 'x' })) === JSON.stringify(DEFAULT_LOOK));
  check('a good look is kept', cleanLook({ style: 2, hair: 3, skin: 1, outfit: 4 }).hair === 3);
  check('stepping a look wraps around', stepLook(DEFAULT_LOOK, 'style', -1).style === LOOK_COUNTS.style - 1);
  check('the elf ear follows the skin tone', lookPalette({ ...DEFAULT_LOOK, skin: 3 }).k === lookPalette({ ...DEFAULT_LOOK, skin: 3 }).s);
  const poses = Object.keys(GRIDS) as (keyof typeof GRIDS)[];
  check('the default hair style leaves the sprites as drawn', poses.every((p) => GRIDS[p].every((g) => styled(g, p, 0) === g)));
  for (const st of [1, 2]) {
    const ok = poses.every((p) => GRIDS[p].every((g) => {
      const s = styled(g, p, st);
      // same size, and below the head only cape, outline or empty pixels change
      return s.length === g.length && s.every((r, y) => r.length === g[y].length)
        && s.every((r, y) => y < 12 || [...r].every((ch, x) => ch === g[y][x] || 'cCo.'.includes(g[y][x])));
    }));
    check(`hair style ${st}: frames keep their size; the body, bow and arms are untouched`, ok);
  }
  check('long hair shows down the back', styled(GRIDS.idle[0], 'idle', 2).join() !== styled(GRIDS.idle[0], 'idle', 1).join());
  // the menu's LOOK row opens the stylist; keys go to it until it closes
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage ??= { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); } };
  setMyLook(DEFAULT_LOOK);
  initMenu(() => {}, 1);
  menu.sel = items().indexOf('look'); menuKey('enter');
  check('LOOK in the menu opens the stylist', stylist.open && stylist.sel === 0);
  menuKey('right');
  check('Right changes the picked row (hair style)', myLook().style === 1);
  menuKey('down'); menuKey('left');
  check('Left steps back, wrapping (hair colour)', myLook().hair === LOOK_COUNTS.hair - 1);
  check('the look is kept on this device', cleanLook(JSON.parse(localStorage.getItem('archer-game:look') ?? '{}')).hair === LOOK_COUNTS.hair - 1);
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
  let townN = 1; while (gotoFloor(townN), !game.floor.town) townN++;
  const st = game.floor.npcs?.find((n) => n.kind === 'stylist');
  const zones = game.floor.portals.map((q) => [q.x - q.w / 2 - 10, q.x + q.w / 2 + 10]).concat(game.floor.ladders.map((l) => [l.x - 7, l.x + 7]), game.floor.ropes.map((l) => [l.x - 7, l.x + 7]));
  check('towns have a stylist, clear of portals, ladders and ropes', !!st && zones.every(([lo, hi]) => st.x + NPC_R <= lo || st.x - NPC_R >= hi));
  release(); setMyLook(DEFAULT_LOOK);
  player.x = st!.x; player.y = st!.y - player.h; player.vx = player.vy = 0; player.onGround = true; player.climb = null;
  tap('up');
  check('Up beside the stylist opens the window', stylist.open);
  tap('right');
  check('arrows change your look there too', myLook().style === 1);
  tap('x');
  check('X closes it', !stylist.open && !game.pause);
  setMyLook(DEFAULT_LOOK);
  release();
  // quests: every town has a board posting kill quests for the areas above it
  release(); loadQuests([]);
  for (const a of AREAS) {
    gotoFloor(townStage(a.depth), a.id);
    const b = game.floor.npcs?.find((n) => n.kind === 'board');
    const zones = game.floor.portals.map((q) => [q.x - q.w / 2 - 10, q.x + q.w / 2 + 10]).concat(game.floor.ladders.map((l) => [l.x - 7, l.x + 7]), game.floor.ropes.map((l) => [l.x - 7, l.x + 7]));
    if (!b || !zones.every(([lo, hi]) => b.x + NPC_R <= lo || b.x - NPC_R >= hi)) { check(`${a.town} has a clear quest board`, false); break; }
    const offers = boardOffers(townStage(a.depth), a.id);
    const want = new Set((a.up.length ? a.up : [a.id]).flatMap((id) => areaMobs(AREAS[id].name).map((m) => m.n)));
    if (!offers.length || !offers.every((o) => want.has(o.mob) && o.exp > 0 && o.coins > 0)) { check(`${a.town} posts quests for the areas above`, false, offers.map((o) => o.mob).join(',')); break; }
  }
  check('every town has a quest board clear of portals, ladders and ropes', true);
  gotoFloor(townStage(0), 0);
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
  gotoFloor(1, 0); spawnMob({ x: 100, y: game.floor.platforms[0].y, types: ['Garden Snail'] } as never, MOB_TYPES[0]); killMob(game.mobs[game.mobs.length - 1]);
  check('killing an enemy advances its quest', quests[0].have === 1);
  // saved and restored
  const snap = snapshot();
  loadQuests([]); apply(snap);
  check('quests survive a save and load', quests.length === 1 && quests[0].mob === 'Garden Snail' && quests[0].have === 1);
  loadQuests([{ mob: 3 }, null, { mob: 'Crab', need: -5, have: 99, exp: 'x', coins: 1 }]);
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
  initMenu(() => {}, 1); menu.sel = items().indexOf('settings'); menuKey('enter');
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

// --- elites: rare, bigger, tougher, worth more ---
{
  arena();
  const z = { x: 100, y: ground().y, types: ['Crab'] } as never;
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
  // waves: about 1 in 8
  game.floor.spawns = Array.from({ length: 400 }, (_, i) => ({ x: 40 + (i % 10), y: ground().y, types: ['Crab'] }));
  game.mobs = []; spawnWave();
  const frac = game.mobs.filter((m) => m.elite).length / game.mobs.length;
  check('waves roll elites about 1 in 8', frac > 0.07 && frac < 0.19, frac.toFixed(3));
  game.mobs = []; game.floor.spawns = [];
}

// --- status effects: stacks, damage ticks, slow, and which areas carry them ---
{
  arena();
  check('the starting area carries no element', areaStatus() === undefined);
  const swamp = AREAS.find((a) => a.name === 'Swamp')!;
  gotoFloor(baseOf(swamp.depth), swamp.id); game.mobs = []; game.floor.spawns = [];
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
  // your hits inflict the area's element
  const m2 = dummy(200); let got = false;
  for (let i = 0; i < 40 && !got; i++) { damage(m2, 0.01); got = (m2.effects?.length ?? 0) > 0; }
  check("your hits inflict the area's element", got && m2.effects![0].kind === 'poison');
  // gotoFloor clears yours
  applyStatus(player, 'burn'); gotoFloor(1, 0);
  check('effects clear on a new floor', player.effects.length === 0);
  game.mobs = [];
}

// --- floor modifiers: icy floors in cold areas, shared by everyone, pay more ---
{
  check('icy only rolls in cold areas', rollMods('Beach', () => 0).length === 0 && rollMods('Mirror Lake', () => 0).join() === 'icy' && rollMods('Mirror Lake', () => 0.99).length === 0);
  const lake = AREAS.find((a) => a.name === 'Mirror Lake')!;
  const stages = Array.from({ length: 6 }, (_, i) => baseOf(lake.depth) + i).filter((n) => !isTown(n));
  const prev = net.area; net.area = lake.id;
  const iced = stages.filter((n) => generateFloor(n).mods?.includes('icy'));
  const again = stages.filter((n) => generateFloor(n).mods?.includes('icy'));
  check('some cold floors roll icy, the same way every time', iced.length > 0 && iced.length < stages.length && iced.join() === again.join(), iced.join());
  net.area = prev;
  check('towns never roll a modifier', !generateFloor(townStage(lake.depth)).mods);
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
  visitArea('Beach'); visitArea('Beach'); visitArea('Forest');
  check('areas count once each', record.areas.filter((a) => a === 'Beach').length === 1);
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
  const forest = AREAS.find((a) => a.name === 'Forest')!;
  gotoFloor(townStage(forest.depth), forest.id);
  const ups = game.floor.portals.filter((p) => p.to > game.floor.number);
  check('each way up from a town shows the level of the enemies there', ups.length > 0 && ups.every((p) => p.lvl === mobLevel(p.to)));
  check("the way down doesn't", game.floor.portals.filter((p) => p.to < game.floor.number).every((p) => p.lvl === undefined));
  gotoFloor(1, 0);
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

console.log(failures === 0 ? '\nAll mechanics checks passed.' : `\n${failures} mechanics check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
