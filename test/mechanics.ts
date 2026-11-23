// Mechanics checks, run with `npm test` after the smoke test. Each one is a
// short, seeded, deterministic run (a few hundred frames at most). No long
// fuzzing: if a check needs more than a second, shrink it.

// seed Math.random before anything generates a floor
let seed = 12345;
Math.random = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

import { FX_DUR, MOB_TYPES, P } from '../src/config';
import { game, gotoFloor, mobLevel, player, spawnMob, SPAWN_SPREAD } from '../src/state';
import { cleanName, ghostFx, NAME_MAX, randomName, tintFor } from '../src/presence';
import { clearPressed, setKey } from '../src/input';
import { update } from '../src/update';
import { surfaceYAt } from '../src/surface';
import { makeShape, SHAPES } from '../src/floor';
import { killMob } from '../src/combat';
import { barrageTargets, cast } from '../src/skills';
import { activeSkill, rank, recalcStats, skillRows, spendSkill } from '../src/progress';
import { fmtNum } from '../src/util';
import { apply, clearSave, hasSave, load, save, snapshot } from '../src/save';
import { boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate } from '../src/boost';
import { net, newCode, parseCode, roomId } from '../src/net';
import { archerFrame, climbPhase, GRIDS, POSE_FPS } from '../src/archer';
import { ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet } from '../src/ghost';
import type { Mob, Platform } from '../src/types';

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
  check('Sky Assault rises 75% of the way to the launched enemy', Math.abs(up - peak * P.BARRAGE_RISE) < 1, `up ${up.toFixed(1)} full ${peak.toFixed(1)}`);
}

{
  // Sky Toss: slide forward first, the strike lands after the slide has started
  arena(1);
  const m = dummy(150);
  const x0 = player.x;
  tap('q');
  check('Sky Toss slides forward before striking', player.x > x0 && m.hp === 1e6);
  step(8);
  check('Sky Toss strikes after the slide', m.hp < 1e6 && player.x - x0 > 20, `dx ${(player.x - x0).toFixed(1)}`);
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

// --- E / R ---
{
  arena(10); player.ranks.E = 1;
  const a = dummy(130), b = dummy(160);
  const x0 = player.x;
  tap('e'); step(15);
  check('Piercing Dash carries you forward through enemies', player.x - x0 > 50, `dx ${(player.x - x0).toFixed(1)}`);
  check('Piercing Dash strikes every enemy on the path', a.hp < 1e6 && b.hp < 1e6);
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
    check(`floor ${n}: 7 platforms, about half the old climb`, blocks === 7 && span > 450 && span < 760 && game.floor.portal.y > 60, `blocks ${blocks} span ${span}`);
  }
}

// --- save / load ---
{
  // a tiny in-memory localStorage for the headless run
  const mem: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; },
  };
  arena(35); gotoFloor(4);
  player.exp = 123; player.ap = 7; player.sp = 2; player.stats.dex = 9; player.ranks.Z = 3; player.ranks.BS = 3; player.ranks.E = 2;
  save();
  const want = JSON.stringify(snapshot());
  arena(1); player.ap = 0; player.sp = 0; player.ranks.BS = 0; player.ranks.E = 0;
  const floor = load();
  check('save round-trips level, EXP, points, stats, ranks and the branch taken', JSON.stringify({ ...snapshot(), floor: 4 }) === want && floor === 4);
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
    for (const k of Object.keys(player.ranks) as (keyof typeof player.ranks)[]) player.ranks[k] = ['S', 'BS', 'VS', 'AB'].includes(k) ? 0 : 1;
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
  const drawing = at('shoot', 0.02).length;
  const release = at('shoot', P.Z_WINDUP + 0.01).map((f) => f.type).sort().join(',');
  const after = at('shoot', P.Z_WINDUP + 0.1).length;
  at('idle', 0);
  const again = at('shoot', P.Z_WINDUP + 0.02).length;
  const rush = at('rush', 0).map((f) => f.type).join(',');
  check('a ghost shot shows nothing while drawing the bow', drawing === 0);
  check('a ghost shot fires muzzle and tracer once, on release', release === 'muzzle,tracer' && after === 0);
  check('the next ghost shot fires again', again === 2);
  check('a ghost Sky Toss shows its horn of light', rush === 'rush');
}

console.log(failures === 0 ? '\nAll mechanics checks passed.' : `\n${failures} mechanics check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
