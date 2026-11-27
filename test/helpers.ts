// Small helpers shared by the test files: driving the game loop, pressing
// keys, and setting up a clean place to test in.
//
// Import the game code you're testing straight from src/ in each test file;
// only shared helpers live here.

// (state is imported before anything that imports net: state -> floor -> net -> state is a cycle)
import { game, gotoPlace, player, spawnMob } from '../src/state';
import { clearPressed, setKey } from '../src/input';
import { tick } from '../src/loop';
import { jobForLevel, recalcStats } from '../src/progress';
import { MOB_TYPES, P } from '../src/config';
import { closeLinks } from '../src/links';
import { clearPlayerDeath } from '../src/deaths';
import { nextPlace, START, type Place } from '../src/world';
import type { Mob, Platform } from '../src/types';

/** Run the game for `n` fixed steps (frames). */
export function step(n = 1): void {
  for (let i = 0; i < n; i++) tick();
}

/** Every key the tests press. */
const KEYS = ['left', 'right', 'up', 'down', 'c', 'd', 'z', 'q', 'w', 'e', 'r', 'escape'];

/** Let go of every key. */
export function release(): void {
  KEYS.forEach((k) => setKey(k, false));
  clearPressed();
}

/** Press and release a key, running one frame while it's down. */
export function tap(key: string): void {
  setKey(key, false);
  setKey(key, true);
  step(1);
  setKey(key, false);
}

/** The ground: the floor's first platform. */
export function ground(): Platform {
  return game.floor.platforms[0];
}

/** The n-th place up the first path from the start: 1 is the start town,
 *  2 is the first floor of its first path, and so on. */
export function climb(n: number): Place {
  let place: Place = START;
  for (let i = 1; i < n; i++) place = nextPlace(place);
  return place;
}

/** Let a Piercing Leap rise, hang and land (gives up after 90 frames). */
export function landLeap(): void {
  for (let i = 0; i < 90 && (player.liftT > 0 || !player.onGround); i++) step(1);
}

/** A clean test floor: Beach 1 with no enemies, and the player standing on the
 *  ground at `x`, at `level`, with full MP, nothing on cooldown, and only the
 *  basic skills learned (plus Arrow Blitz's ground skills), and Electric
 *  Blitz's charges full. The player can't
 *  be hurt (invuln), so enemies don't interfere unless a test wants them to. */
export function arena(level = 1, x = 100): void {
  release();
  clearPlayerDeath();
  gotoPlace(climb(2));
  game.mobs = [];
  game.floor.spawns = [];
  game.pause = null;

  player.level = level;
  player.job = jobForLevel(level);
  player.stats = { dex: 0, vit: 0, spi: 0, luk: 0 };
  recalcStats();
  for (const k of Object.keys(player.ranks) as (keyof typeof player.ranks)[]) {
    player.ranks[k] = ['z', 'd', 'ground-q', 'ground-w', 'sa'].includes(k);
  }
  for (const k of Object.keys(player.cd) as (keyof typeof player.cd)[]) player.cd[k] = 0;
  for (const k of Object.keys(player.readyT) as (keyof typeof player.readyT)[]) player.readyT[k] = 0;
  player.blitz.charges = P.BLITZ_MAX;
  player.blitz.t = 0;

  player.mp = 999;
  player.hp = player.hpMax;
  player.invuln = 999;
  player.face = 1;
  player.x = x;
  player.y = ground().y - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.climb = null;
  player.dropBlock = null;
  player.casting.useT = 0;
  player.casting.recoverT = 0;
  player.casting.freeze = 0;
  player.casting.queued = null;
  player.cast = null;
  player.castT = 0;
  player.hang.t = 0;
  player.fervor = 0;
  player.combatT = 0;
  player.regenT = 0;
  closeLinks();
}

/** A practice target: a Garden Snail at `x` on the ground that doesn't move,
 *  with `hp` health (a million by default, so it survives most tests). */
export function dummy(x: number, hp = 1e6): Mob {
  spawnMob({ x, y: ground().y, types: ['Garden Snail'] } as never, MOB_TYPES[0]);
  const mob = game.mobs[game.mobs.length - 1];
  mob.hp = hp;
  mob.hpMax = hp;
  mob.vx = 0;
  mob.spd = 0;
  return mob;
}
