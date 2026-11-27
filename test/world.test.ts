import { describe, expect, it } from 'vitest';
import { climb, release, step, tap } from './helpers';
import { MOB_TYPES, P } from '../src/config';
import { killMob } from '../src/combat';
import { makeShape, SHAPES } from '../src/floorshape';
import { setKey } from '../src/input';
import { seeded } from '../src/rng';
import { game, gotoPlace, player, spawnMob, spawnWave } from '../src/state';
import { surfaceYAt } from '../src/surface';
import type { Platform } from '../src/types';

/** Go to a place with no enemies. */
function emptyPlace(n: number): void {
  release();
  gotoPlace(climb(n));
  game.mobs = [];
  game.floor.spawns = [];
}

/** A random number between a and b. */
const between = (a: number, b: number): number => a + Math.random() * (b - a);

/** Did a move from (x0, feet0) to (x1, feet1) pass down through platform p's
 *  surface? Samples points along the move: being on or above the surface, then
 *  more than half a pixel under it, counts as passing through. */
function passedThrough(p: Platform, x0: number, feet0: number, x1: number, feet1: number): boolean {
  let above = false;
  for (let j = 0; j <= 32; j++) {
    const t = j / 32;
    const x = x0 + (x1 - x0) * t, feet = feet0 + (feet1 - feet0) * t;
    if (x < p.x || x >= p.x + p.w) { above = false; continue; }
    const depth = feet - surfaceYAt(p, x);
    if (depth <= 0) above = true;
    else if (above && depth > 0.5) return true;
  }
  return false;
}

describe('physics', () => {
  it('falling or jumping never passes through a slope or ledge', () => {
    const failures: string[] = [];
    for (const n of [1, 2, 4]) {
      emptyPlace(n);
      const slopes = game.floor.platforms.filter((p) => p.slope);
      const solid = game.floor.platforms.filter((p) => !p.inner && !p.ground);
      for (let trial = 0; trial < 120 && slopes.length; trial++) {
        // throw the player at a random slope from a random spot and speed
        release();
        const s = slopes[Math.floor(Math.random() * slopes.length)];
        player.x = s.x + between(-40, 56);
        player.y = s.y - between(0, 40) - player.h;
        player.vx = between(-300, 300);
        player.vy = between(-320, 670);
        player.onGround = false; player.climb = null; player.dropBlock = null;
        for (let i = 0; i < 10; i++) {
          const x0 = player.x, feet0 = player.y + player.h;
          player.casting.useT = 1; // (no steering)
          step();
          if (player.onGround || player.climb) break;
          if (solid.some((p) => passedThrough(p, x0, feet0, player.x, player.y + player.h))) {
            failures.push(`floor ${n} trial ${trial}`);
            break;
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('walking over every slope shape, both ways, stays on the surface', () => {
    const failures: string[] = [];
    for (const kind of SHAPES) for (const dir of ['right', 'left']) {
      emptyPlace(2);
      const shape = makeShape(kind, 64, 400, 10, false, seeded(1));
      game.floor.platforms = [...shape.tiles];
      const columnAt = (x: number): Platform[] => shape.tiles.filter((t) => t.x <= x && x < t.x + 16);
      const topAt = (x: number): number => Math.min(...columnAt(x).map((t) => surfaceYAt(t, x)));
      player.x = dir === 'right' ? 70 : 64 + shape.w - 6;
      player.y = topAt(player.x) - player.h;
      player.vx = 0; player.vy = 0; player.onGround = true; player.climb = null; player.casting.useT = 0;

      setKey(dir, true);
      let worst = 0, airborne = 0;
      for (let f = 0; f < 200 && player.x > 66 && player.x < 64 + shape.w - 4; f++) {
        step();
        worst = Math.max(worst, Math.abs(player.y + player.h - topAt(player.x)));
        if (!player.onGround) airborne++;
      }
      setKey(dir, false);
      if (worst > 0.5 || airborne) failures.push(`${kind} ${dir}: off by ${worst.toFixed(2)}, ${airborne} frames airborne`);
    }
    expect(failures).toEqual([]);
  });

  it('a down-jump then Glide never falls back through the platform you dropped from', () => {
    const failures: string[] = [];
    for (const n of [1, 2, 4]) {
      emptyPlace(n);
      const tops = game.floor.platforms.filter((p) => !p.ground && !p.inner && !p.slope).slice(0, 8);
      for (const top of tops) for (const glideAfter of [2, 5]) {
        release();
        player.x = top.x + 8; player.y = top.y - player.h; player.vx = 0; player.vy = 0;
        player.onGround = true; player.climb = null; player.dropBlock = null;
        player.casting.useT = 0; player.mp = 999; player.cd.d = 0;
        step();
        setKey('down', true); setKey('c', true); // down-jump
        step();
        release();
        step(glideAfter);
        tap('d'); // Glide
        for (let i = 0; i < 60 && !player.onGround; i++) {
          const feet0 = player.y + player.h, x0 = player.x, dropping = player.dropBlock !== null;
          step();
          if (dropping || player.onGround || player.climb) continue;
          const feet = player.y + player.h;
          const fellThrough = game.floor.platforms.some((p) => !p.inner && p.block === top.block
            && player.x >= p.x && player.x < p.x + p.w
            && feet0 < surfaceYAt(p, x0) - 0.01 && feet > surfaceYAt(p, player.x) + 0.01);
          if (fellThrough) { failures.push(`floor ${n}, platform at ${top.x},${top.y}`); break; }
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('enemy waves', () => {
  it('never fill a zone past its cap (plus the overflow from a farmed platform)', () => {
    const over: string[] = [];
    for (const n of [1, 2, 4]) {
      release();
      gotoPlace(climb(n));
      player.x = 4; player.invuln = 999;
      [...game.mobs].slice(0, 3).forEach(killMob);
      step(Math.round((P.WAVE_EVERY + 1) / P.STEP));
      for (const z of game.floor.spawns) {
        const count = game.mobs.filter((m) => m.spawn === z).length;
        if (count > (z.cap ?? 1) + P.HEAT_EXTRA) over.push(`floor ${n}: ${count} in a zone capped at ${z.cap}`);
      }
    }
    expect(over).toEqual([]);
  });

  it('farming one platform heats it, so its enemies spread to the others until it cools', () => {
    release();
    gotoPlace(climb(2));
    player.invuln = 999;
    game.mobs = [];
    const zones = game.floor.spawns.slice(0, 3);
    game.floor.spawns = zones;
    zones.forEach((z) => { z.cap = 2; z.heat = 0; });
    const on = (z: (typeof zones)[number]): number => game.mobs.filter((m) => m.spawn === z).length;

    spawnWave();
    expect(zones.map(on)).toEqual([2, 2, 2]);

    // six kills on the first platform
    const hot = zones[0];
    for (let i = 0; i < 6; i++) {
      let m = game.mobs.find((q) => q.spawn === hot);
      if (!m) {
        spawnMob(hot, MOB_TYPES[0]);
        m = game.mobs[game.mobs.length - 1];
      }
      killMob(m);
    }
    expect(hot.heat).toBe(6);

    spawnWave();
    expect(on(hot)).toBe(0); // the farmed platform refills less...
    expect(on(zones[1]) + on(zones[2])).toBe(6); // ...and its enemies turn up on the others
    expect(hot.heat).toBe(3); // heat halves each wave

    game.mobs = []; spawnWave();
    game.mobs = []; spawnWave();
    expect(on(hot)).toBe(2); // cooled off: it fills as usual
    expect(hot.heat).toBeLessThan(P.HEAT_HOT);
  });
});
