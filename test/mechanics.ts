import { buy, NPC_R, COIN_LIFE, coinValue, drops, PRICES, shop, wallet } from '../src/economy';
import { AREA_FLOORS, areaOf, BLOCK, isAreaEnd, isTown, placeName, TOWN_NAMES } from '../src/world';
// Mechanics checks, run with `npm test` after the smoke test. Each one is a
// short, seeded, deterministic run (a few hundred frames at most). No long
// fuzzing: if a check needs more than a second, shrink it.

// seed Math.random before anything generates a floor
let seed = 12345;
Math.random = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

import { FX_DUR, MOB_TYPES, P } from '../src/config';
import { game, gotoFloor, mobLevel, player, spawnMob, SPAWN_SPREAD } from '../src/state';
import { cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, tintFor } from '../src/presence';
import { textWidth } from '../src/font';
import { clearPressed, REPEAT_DELAY, REPEAT_RATE, setKey } from '../src/input';
import { update } from '../src/update';
import { surfaceYAt } from '../src/surface';
import { groupSize, makeShape, SHAPES } from '../src/floor';
import { miniRect, MINI_SCALE, toMini } from '../src/minimap';
import { TILE, WORLD } from '../src/config';
import { damage, killMob, NUM_GAP, NUM_LINE } from '../src/combat';
import { barrageTargets, cast } from '../src/skills';
import { activeSkill, STAT_GAIN, PAUSE_ROWS, pauseScroll, rank, recalcStats, skillRows, spendSkill } from '../src/progress';
import { fmtNum } from '../src/util';
import { apply, clearSave, hasSave, lastTown, load, save, snapshot } from '../src/save';
import { boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate } from '../src/boost';
import { canConnect, net, newCode, parseCode, roomId } from '../src/net';
import { activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X } from '../src/menu';
import { hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt } from '../src/tileset';
import { archerFrame, climbPhase, GRIDS, POSE_FPS } from '../src/archer';
import { ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet } from '../src/ghost';
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
  spawnMob({ x, y: ground().y, t: 1 } as never, MOB_TYPES[0]);
  const m = game.mobs[game.mobs.length - 1];
  m.hp = m.hpMax = hp; m.vx = 0; m.spd = 0;
  return m;
}

// --- physics: airborne bodies never pass through a platform surface ---
{
  const walk = (): Platform[] => game.floor.platforms.filter((p) => !p.inner && !p.ground);
  const r = (a: number, b: number): number => a + Math.random() * (b - a);
  let through = 0, trials = 0;
  for (const n of [1, 2, 3]) {
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
  for (const n of [1, 2, 3]) {
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
  let launchedEarly = false, mx = m.x, carried = false;
  for (let i = 0; i < 9 && player.rushT > 0; i++) {
    step(1);
    if (m.airTime > 0 && player.rushT > 0) launchedEarly = true;
    if (m.x > mx + 1) carried = true;
    mx = m.x;
  }
  check('Sky Toss slides forward', player.x - x0 > 30, `dx ${(player.x - x0).toFixed(1)}`);
  check('Sky Toss pushes the enemies it runs into along with you', carried && m.x > 130);
  check('Sky Toss launches nothing until the slide ends', !launchedEarly);
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
  for (const n of [1, 2, 3]) {
    release(); gotoFloor(n); player.x = 4; player.invuln = 999;
    [...game.mobs].slice(0, 3).forEach(killMob);
    step(Math.round((P.WAVE_EVERY + 1) / P.STEP));
    for (const z of game.floor.spawns) if (game.mobs.filter((m) => m.spawn === z).length > (z.cap ?? 1)) over++;
  }
  check('enemy waves never exceed a zone cap', over === 0, `${over} zones over`);
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
  game.floor.spawns = [{ x: 150, y: ground().y, t: 1, cap: 9 } as never];
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
check('every archer frame is 16x24', Object.values(GRIDS).every((fs) => fs.length > 0 && fs.every((g) => g.length === 24 && g.every((r) => r.length === 16))));
check('every networked pose has frames and a cycle rate', POSES.every((p) => GRIDS[p]?.length && POSE_FPS[p] > 0));

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
  for (const n of [1, 2, 3]) {
    gotoFloor(n);
    const blocks = new Set(game.floor.platforms.filter((p) => p.block !== undefined).map((p) => p.block)).size;
    const span = game.floor.platforms[0].y - game.floor.portal.y;
    check(`floor ${n}: 4 platforms, about half the last climb`, blocks === 4 && span > 250 && span < 450 && game.floor.portal.y > 60, `blocks ${blocks} span ${span}`);
    const narrow = [...new Set(game.floor.platforms.filter((p) => p.block !== undefined).map((p) => p.block))]
      .filter((b) => new Set(game.floor.platforms.filter((p) => p.block === b).map((p) => p.x)).size < 12);
    check(`floor ${n}: every platform is at least 12 tiles wide`, narrow.length === 0, `narrow blocks ${narrow.join(',')}`);
  }
}

// --- save / load ---
{
  // a tiny in-memory localStorage for the headless run
  const mem: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; },
  };
  arena(35); gotoFloor(26);
  player.exp = 123; player.ap = 7; player.sp = 2; player.stats.dex = 9; player.ranks.Z = 3; player.ranks.BS = 3; player.ranks.E = 2;
  save();
  const want = JSON.stringify(snapshot());
  arena(1); player.ap = 0; player.sp = 0; player.ranks.BS = 0; player.ranks.E = 0;
  const floor = load();
  check('save round-trips level, EXP, points, stats, ranks and the branch taken', JSON.stringify({ ...snapshot(), floor: 26 }) === want && floor === 22);
  check('you resume on the latest town (floor 1 before the first)', lastTown(26) === 22 && lastTown(22) === 22 && lastTown(10) === 1 && lastTown(11) === 11);
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
    spawnMob({ x: 100, y: ground().y, t: 1 } as never, MOB_TYPES[0]);
    return game.mobs[0].exp;
  };
  check('mob EXP ignores the player level', expAt(3, 1) === expAt(3, 40));
  check('mobs on higher floors are worth more EXP', expAt(8, 5) > expAt(2, 5));
  check('mob level is the floor for now', mobLevel(7) === 7);
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
  check('menu rows: play, channel, code, new code, name (no reset without a save)', items().join(',') === 'play,channel,code,create,name');
  menuKey('up');
  check('menu selection wraps around', items()[menu.sel] === 'name');

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
    const plat = game.floor.platforms.find((p) => !p.inner && m.x >= p.x && m.x < p.x + p.w && Math.abs(p.y - (m.y + m.h)) < 6);
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

// --- towns: a designed layout, two ways up (two routes), one way down ---
{
  const stand = (pt: { x: number; y: number }): void => {
    player.x = pt.x; player.y = pt.y - player.h; player.vx = 0; player.vy = 0; player.onGround = true; player.climb = null;
  };
  net.route = 0; release(); gotoFloor(11);
  const f = game.floor, layout = JSON.stringify(f.platforms);
  net.channel = 3; gotoFloor(22); const other = JSON.stringify(game.floor.platforms); net.channel = 1;
  check('towns are a designed layout (the same on every channel and town)', layout === other);
  gotoFloor(11);
  const [upL, upR, down] = game.floor.portals;
  check('a town has two ways up and one down', game.floor.portals.length === 3 && upL.to === 12 && upR.to === 12 && down.to === 10 && game.mobs.length === 0);
  const deck = game.floor.platforms.filter((p) => p.block === 1 && !p.inner);
  check('the down portal stands on the plaza deck, reached by a ladder and a rope',
    deck.some((p) => p.y === down.y) && game.floor.ladders[0].y1 === down.y && game.floor.ropes[0].y1 === down.y
    && game.floor.ladders[0].y2 === game.floor.platforms[0].y);
  check('a town room is shared by both routes', roomId(11, 1, '', 1) === roomId(11, 1, '', 0) && roomId(12, 1, '', 1) !== roomId(12, 1, '', 0));

  player.hp = 5; player.mp = 1;
  stand(upR); tap('up');
  const routeB = JSON.stringify(game.floor.platforms);
  check('the right portal goes up on route B', game.floor.number === 12 && net.route === 1);
  check('arriving does not refill HP or MP', player.hp === 5 && player.mp === 1);
  gotoFloor(11); stand(game.floor.portals[0]); tap('up');
  check('the left portal goes up on route A, a different layout', game.floor.number === 12 && net.route === 0 && JSON.stringify(game.floor.platforms) !== routeB);
  gotoFloor(11); stand(game.floor.portals[2]); tap('up');
  check('the down portal goes back to the floor below', game.floor.number === 10);
  check('skills work in town', (() => { gotoFloor(11); player.cd.Z = 0; player.mp = 99; player.useT = 0; tap('z'); return player.cd.Z > 0; })());
  net.route = 0; release();
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
  for (const n of [1, 2, 3]) {
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
  killMob(dummy(player.x, 1)); step(Math.ceil((COIN_LIFE + 1) / P.STEP));
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

  // saved
  const mem: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
  wallet.coins = 77; wallet.hp = 3; wallet.mp = 4; save();
  wallet.coins = 0; wallet.hp = 0; wallet.mp = 0; load();
  check('coins and potions are saved', wallet.coins === 77 && wallet.hp === 3 && wallet.mp === 4);
  check('an older save without them starts empty', apply({ ...JSON.parse(mem[Object.keys(mem)[0]]), coins: undefined, potions: undefined }) !== null && wallet.coins === 0 && wallet.hp === 0);
  delete (globalThis as { localStorage?: unknown }).localStorage;
}

// --- places: areas of 10 floors, named towns between them, two areas per town ---
{
  check('an area is 10 floors, then a town', AREA_FLOORS === 10 && !isTown(10) && isTown(11) && !isTown(12) && isTown(22));
  check('places read as area + floor within it', placeName(1, 0) === 'Beach 1' && placeName(10, 0) === 'Beach 10' && placeName(12, 0) === `${areaOf(1, 0)} 1`);
  check('towns have their own names', placeName(11, 0) === TOWN_NAMES[0] && placeName(22, 1) === TOWN_NAMES[1] && new Set(TOWN_NAMES).size === TOWN_NAMES.length);
  let differ = true;
  for (let b = 1; b < 6; b++) if (areaOf(b, 0) === areaOf(b, 1)) differ = false;
  check('the two ways out of a town lead into two different areas', differ && areaOf(0, 0) === 'Beach');
  check('the floor before a town is the area end (the boss floor, later)', isAreaEnd(10) && isAreaEnd(21) && !isAreaEnd(11));

  net.route = 0; release(); gotoFloor(11);
  const [l, r, d] = game.floor.portals.map((p) => p.label);
  check('town portals are labelled with where they go', l === placeName(12, 0) && r === placeName(12, 1) && d === 'Beach 10' && l !== r, `${l} | ${r} | ${d}`);
  gotoFloor(10);
  check('the way into a town is labelled with its name', game.floor.portal.label === TOWN_NAMES[0]);
  gotoFloor(BLOCK + 3, 1);
  check('the HUD place follows your route', placeName(game.floor.number, net.route) === `${areaOf(1, 1)} 3`);
  net.route = 0; release();
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

// --- multi-hit damage numbers stack, one every 0.25s ---
{
  arena(10); const m = dummy(150);
  game.dmgNums.length = 0;
  for (let i = 0; i < 4; i++) damage(m, 1);
  const ns = game.dmgNums.slice();
  const delays = ns.map((d) => +(d.delay ?? 0).toFixed(3)).join(',');
  const lines = ns.every((d, i) => Math.abs(ns[0].y - d.y - i * NUM_LINE) < 1e-9);
  check('hits at once: each number waits 0.25s after the last', delays === [0, 1, 2, 3].map((k) => +(k * NUM_GAP).toFixed(3)).join(','), delays);
  check('...and sits one line above it', lines);
  step(Math.ceil(0.3 / P.STEP));
  check('the second number shows after ~0.25s, the later ones still wait', (game.dmgNums[1].delay ?? 0) <= 0 && (game.dmgNums[2].delay ?? 0) > 0);
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
  check('every area on the map has a tileset (Classic until it gets its own)', ['Beach', 'Forest', 'Cave', 'Swamp', 'Mountain', 'Sky'].every((a) => !!tilesetFor(a)));
  check('Beach, Forest, Cave and Clockwork Spire have their own tilesets',
    ['Beach', 'Forest', 'Cave', 'Clockwork Spire'].every((a) => tilesetFor(a).name === a) && tilesetFor('Swamp').name === 'Classic');
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

console.log(failures === 0 ? '\nAll mechanics checks passed.' : `\n${failures} mechanics check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
