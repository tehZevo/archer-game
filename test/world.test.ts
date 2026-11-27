import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { arena, climb, dummy, ground, release, step, tap } from './helpers';
import { TOWN_MIN_H } from '../src/floorframe';
import { miniRect, MINI_SCALE } from '../src/minimap';
import { CAM, MOB_TYPES, P, TILE, WORLD } from '../src/config';
import { generateFloor, LAYOUTS, type Layout } from '../src/floor';
import { coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods } from '../src/floormods';
import { coinValue, drops } from '../src/economy';
import { isTown, mobLevel, PATHS, pathsInto, placeKey, townDepth } from '../src/world';
import { killMob } from '../src/combat';
import { makeShape, SHAPES } from '../src/floorshape';
import { setKey } from '../src/input';
import { seeded } from '../src/rng';
import { cameraTarget, game, gotoPlace, player, spawnMob, spawnWave } from '../src/state';
import { surfaceYAt } from '../src/surface';
import type { Platform } from '../src/types';
import { confirmUi } from '../src/confirm';
import { windowOpen } from '../src/windows';

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

describe('lying flat (Down)', () => {
  function walkLeft(frames: number): number {
    const x = player.x;
    setKey('left', true);
    step(frames);
    setKey('left', false);
    return x - player.x;
  }

  beforeEach(() => {
    arena(1);
    player.x = 300;
    player.vx = 0;
    player.face = 1;
  });
  afterEach(() => release());

  it('holding Down on the ground lies you flat, without moving', () => {
    setKey('down', true);
    step(5);
    expect(player.animState).toBe('prone');
    expect(Math.abs(player.x - 300)).toBeLessThan(1);
  });

  it('Left or Right while lying stands you up and walks, at full speed', () => {
    const normalWalk = walkLeft(20);
    arena(1); // start the second walk from rest too
    player.x = 300;
    player.vx = 0;

    setKey('down', true);
    step(5);
    setKey('left', true);
    step(20);
    expect(player.animState).toBe('walk');
    expect(player.face).toBe(-1);
    setKey('left', false);
    expect(300 - player.x).toBeCloseTo(normalWalk, 2);
  });

  it('letting go of Left (Down still held) lies you back down; letting go of Down stands you up', () => {
    setKey('down', true);
    walkLeft(20);
    step(10);
    expect(player.animState).toBe('prone');

    setKey('down', false);
    step(2);
    expect(player.animState).toBe('idle');
  });
});

describe('slopes', () => {
  // Rush Toss's slide (~10px a frame) once outran the 4px ground stick on 2:1 ramps,
  // and the player dropped into the slope. Cast it both ways from every ramp tile.
  it('Rush Toss never sinks into a slope', () => {
    const slopes = (): Platform[] => game.floor.platforms.filter((p) => !p.inner && p.slope);
    // use the Beach floor with the most ramps
    let best = climb(2), most = -1;
    for (const n of [2, 3, 4]) {
      gotoPlace(climb(n));
      if (slopes().length > most) { best = climb(n); most = slopes().length; }
    }
    gotoPlace(best);
    const tiles = slopes();

    let tries = 0;
    const sank: string[] = [];
    for (const tile of tiles) {
      for (const face of [1, -1] as const) {
        arena(1);
        gotoPlace(best);
        game.mobs = [];
        game.floor.spawns = [];
        player.climb = null;
        player.x = tile.x + tile.w / 2;
        player.y = surfaceYAt(tile, player.x) - player.h;
        player.plat = tile;
        player.face = face;
        step(1);
        if (!player.onGround) continue;

        tries++;
        tap('q');
        const walkable = game.floor.platforms.filter((q) => !q.inner);
        for (let i = 0; i < 20; i++) {
          step(1);
          const feet = player.y + player.h;
          const inside = walkable.some((q) => player.x >= q.x && player.x < q.x + q.w
            && feet > surfaceYAt(q, player.x) + 3 && feet < surfaceYAt(q, player.x) + 14);
          if (inside) { sank.push(`tile at x=${tile.x}, facing ${face}`); break; }
        }
      }
    }
    expect(tries).toBeGreaterThan(20);
    expect(sank).toEqual([]);
  });
});

describe('floor layouts', () => {

  // up the leftmost branch, to Mushroom Grotto's town
  const pathFloors = Array.from({ length: 24 }, (_, i) => i + 1).filter((n) => !isTown(climb(n)));

  it('floors 1-24 use every layout (stack, zigzag, open)', () => {
    const seen = new Set<string>();
    for (const n of pathFloors) {
      gotoPlace(climb(n));
      seen.add(game.floor.layout!);
    }
    expect(seen.size).toBe(Object.keys(LAYOUTS).length);
  });

  it('each layout keeps its block count, block widths and height', () => {
    const bad: string[] = [];
    for (const n of pathFloors) {
      gotoPlace(climb(n));
      const f = game.floor, layout = LAYOUTS[f.layout as Layout];
      const blocks = [...new Set(f.platforms.filter((p) => p.block !== undefined).map((p) => p.block))];
      const span = f.platforms[0].y - f.portal.y;
      if (blocks.length !== layout.count) bad.push(`floor ${n}: ${blocks.length} blocks`);
      if (span < 150 || span > 500) bad.push(`floor ${n}: span ${span}`);
      for (const b of blocks) {
        const width = new Set(f.platforms.filter((p) => p.block === b).map((p) => p.x)).size;
        if (width < layout.minW || width > layout.maxW) bad.push(`floor ${n} block ${b}: ${width} wide`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('zigzag blocks switch sides each time', () => {
    const bad: string[] = [];
    for (const n of pathFloors) {
      gotoPlace(climb(n));
      const f = game.floor;
      if (f.layout !== 'zigzag') continue;
      const blocks = [...new Set(f.platforms.filter((p) => p.block !== undefined).map((p) => p.block))];
      const onLeft = blocks.map((b) => {
        const xs = f.platforms.filter((p) => p.block === b).map((p) => p.x);
        return (Math.min(...xs) + Math.max(...xs)) / 2 < WORLD.w / 2;
      });
      for (let i = 1; i < onLeft.length; i++) if (onLeft[i] === onLeft[i - 1]) bad.push(`floor ${n}`);
    }
    expect(bad).toEqual([]);
  });

  it('no rope or ladder ends right where another one starts in the same column', () => {
    const bad: string[] = [];
    for (const n of pathFloors) {
      gotoPlace(climb(n));
      const climbs = [...game.floor.ropes, ...game.floor.ladders];
      for (const a of climbs) {
        for (const b of climbs) {
          if (a !== b && Math.abs(a.x - b.x) < TILE && a.y2 >= b.y1 - 1 && a.y1 < b.y1) bad.push(`floor ${n}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('every gap between platforms is 2-3 tiles of headroom, the first one (above the ground) too', () => {
    const bad: string[] = [];
    for (const n of [1, 2, 3, 4]) {
      gotoPlace(climb(n));
      // a town's training-dummy perch and its step stand apart, against the right wall
      const byWall = (b: number): boolean => !!game.floor.town
        && game.floor.platforms.every((p) => p.block !== b || p.x >= WORLD.w - 48);
      const blocks = new Map<number, { top: number; bot: number }>();
      for (const p of game.floor.platforms) {
        if (!p.block || byWall(p.block)) continue;
        const b = blocks.get(p.block) ?? { top: Infinity, bot: -Infinity };
        b.top = Math.min(b.top, p.y);
        b.bot = Math.max(b.bot, p.y + p.h);
        blocks.set(p.block, b);
      }
      const sorted = [...blocks.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => b);
      sorted.forEach((b, i) => {
        const below = i === 0 ? ground().y : sorted[i - 1].top;
        const tiles = (below - b.bot) / 16;
        if (tiles < 2 || tiles > 3) bad.push(`floor ${n} gap ${i}: ${tiles}`);
      });
    }
    expect(bad).toEqual([]);
  });
});

describe('spawn groups', () => {

  it('enemies knocked hard sideways and up stay on their own platform', () => {
    release();
    gotoPlace(climb(2));
    player.invuln = 999;
    player.x = 4;
    for (const m of game.mobs) {
      m.vx = (m.x < 160 ? -1 : 1) * 900;
      m.vy = -600;
      m.airTime = 1.1;
    }
    step(90);

    const strays = game.mobs.filter((m) => {
      const zone = m.spawn!;
      const offEdge = m.x < (zone.minX ?? 0) - 16 || m.x > (zone.maxX ?? 320) + 16;
      if (offEdge) return true;
      if (m.fly) return false;
      const standingOn = game.floor.platforms.find((p) => !p.inner && m.x >= p.x && m.x < p.x + p.w
        && Math.abs(surfaceYAt(p, m.x) - (m.y + m.h)) < 6);
      return !standingOn || standingOn.block !== zone.block;
    });
    expect(game.mobs.length).toBeGreaterThan(0);
    expect(strays.length).toBe(0);
  });
});

describe('the map', () => {
  it('enemy levels climb a path\'s range, spread over its floors', () => {
    expect(mobLevel({ path: 'shore', floor: 1 })).toBe(1);
    expect(mobLevel({ path: 'shore', floor: 3 })).toBe(3);
    expect(mobLevel({ path: 'woods', floor: 1 })).toBe(4);
    expect(mobLevel({ path: 'woods', floor: 5 })).toBe(8);
    expect(mobLevel({ path: 'reef', floor: 8 })).toBe(34);
  });

  it('every path\'s levels start above the paths leading into its town', () => {
    for (const p of PATHS) {
      expect(p.lvl[0]).toBeLessThanOrEqual(p.lvl[1]);
      expect(p.floors).toBeGreaterThanOrEqual(1);
      for (const before of pathsInto(p.from)) expect(before.lvl[1]).toBeLessThan(p.lvl[0]);
    }
  });

  describe('tiers (a path\'s tier is its start town\'s depth + 1)', () => {
    function pathsByTier(): Map<number, typeof PATHS[number][]> {
      const tiers = new Map<number, typeof PATHS[number][]>();
      for (const p of PATHS) {
        const tier = townDepth(p.from) + 1;
        if (!tiers.has(tier)) tiers.set(tier, []);
        tiers.get(tier)!.push(p);
      }
      return tiers;
    }
    const lowest = (paths: typeof PATHS[number][]): number => Math.min(...paths.map((p) => p.lvl[0]));
    const highest = (paths: typeof PATHS[number][]): number => Math.max(...paths.map((p) => p.lvl[1]));

    it('each tier starts above where the one below tops out', () => {
      const tiers = pathsByTier();
      for (let t = 2; t <= 7; t++) expect(lowest(tiers.get(t)!)).toBeGreaterThan(highest(tiers.get(t - 1)!));
    });
  });
});

describe('minimap', () => {
  beforeEach(() => {
    game.view.w = 240;
    game.view.h = 180;
  });

  it('fits on screen, under the skill bar', () => {
    const r = miniRect();
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.w).toBeLessThanOrEqual(240);
    expect(r.y).toBeGreaterThanOrEqual(24);
    expect(r.y + r.h).toBeLessThan(180 - 16);
  });

  it('fits the tallest floor', () => {
    let tallest = 0;
    for (let n = 1; n <= 20; n++) {
      gotoPlace(climb(n));
      tallest = Math.max(tallest, game.floor.h);
    }
    expect(tallest * MINI_SCALE + miniRect().y).toBeLessThan(180 - 16);
  });
});

describe('floor size', () => {
  // floors are trimmed to their content: a thin ground, a little sky

  it('towns are taller than the view, so climbing to the deck moves the camera up', () => {
    release();
    gotoPlace(climb(1)); // the Harbor: one level, the shortest town
    game.view.w = 240;
    game.view.h = 180;
    expect(game.floor.h).toBeGreaterThanOrEqual(TOWN_MIN_H);

    const deck = Math.min(...game.floor.platforms.filter((p) => p.block === 1).map((p) => p.y));
    player.x = 40;
    player.y = ground().y - player.h;
    player.onGround = true;
    player.climb = null;
    const low = cameraTarget().y;
    player.y = deck - player.h;
    expect(cameraTarget().y).toBeLessThan(low);
  });
});

describe('icy floors (in cold areas, shared by everyone, pay more)', () => {
  afterEach(() => {
    game.floor.mods = undefined;
    drops.length = 0;
    game.mobs = [];
    release();
  });

  /** How far you slide in half a second after letting go of a run. */
  function slideDistance(): number {
    player.x = 60;
    player.vx = 0;
    player.y = ground().y - player.h;
    player.onGround = true;
    setKey('right', true);
    step(20);
    release();
    const x = player.x;
    step(30);
    return player.x - x;
  }

  it('only roll in cold areas', () => {
    expect(rollMods('Sunlit Shore', () => 0)).toEqual([]);
    expect(rollMods('Mirror Lake', () => 0)).toEqual(['icy']);
    expect(rollMods('Mirror Lake', () => 0.99)).toEqual([]);
  });

  it('some cold floors roll icy, the same ones every time', () => {
    const floors = [1, 2, 3, 4, 5, 6];
    const icy = (): number[] => floors.filter((n) => generateFloor({ path: 'mirror', floor: n }).mods?.includes('icy'));
    const first = icy();
    expect(first.length).toBeGreaterThan(0);
    expect(first.length).toBeLessThan(floors.length);
    expect(icy()).toEqual(first);
  });

  it('towns never roll a modifier', () => {
    expect(generateFloor({ town: 'stillwater' }).mods).toBeFalsy();
  });

  it('on ice your grip drops, and you slide further after letting go', () => {
    arena();
    const dry = slideDistance();
    game.floor.mods = ['icy'];
    expect(grip()).toBe(ICE_GRIP);
    expect(slideDistance()).toBeGreaterThan(dry * 2);
  });

  it('the HUD names it and its coin bonus', () => {
    arena();
    game.floor.mods = ['icy'];
    expect(modLine()).toBe('ICY +50% COINS');
    expect(coinMult()).toBe(FLOOR_MODS.icy.coins);
  });

  it('coins are worth more there', () => {
    arena();
    game.floor.mods = ['icy'];
    drops.length = 0;
    const m = dummy(100);
    m.level = 10;
    killMob(m);
    expect(drops[0].v).toBeGreaterThanOrEqual(Math.round(coinValue(10, 0) * FLOOR_MODS.icy.coins));
  });
});

describe('the world\'s top and bottom', () => {
  it('stop a big (or stacked) hop at the top', () => {
    arena(20);
    player.y = -40;
    player.vy = -100;
    player.onGround = false;
    step(1);
    expect(player.y).toBeGreaterThanOrEqual(0);
  });

  it('and hold you in from below', () => {
    arena(20);
    player.y = WORLD.h;
    player.vy = 0;
    player.onGround = false;
    step(1);
    expect(player.y).toBeLessThanOrEqual(WORLD.h - player.h);
  });
});

describe('the return portal', () => {
  const here = { path: 'woods', floor: 3 };
  /** Go to woods 3 and stand in its return portal; returns the portal. */
  function standInIt() {
    gotoPlace(here);
    const back = game.floor.portals.find((q) => q.down)!;
    player.x = back.x;
    player.y = back.y - player.h;
    player.onGround = true;
    return back;
  }
  afterEach(() => {
    confirmUi.open = false;
  });

  it('every combat floor has one on the ground, back to the town below the path', () => {
    const back = standInIt();
    expect(back.y).toBeGreaterThanOrEqual(game.floor.platforms[0].y - 1);
    expect(back.to.town).toBe('driftwood');
  });

  it('stepping in asks first, and the dialog takes Enter (not the chat line)', () => {
    standInIt();
    tap('up');
    expect(confirmUi.open).toBe(true);
    expect(game.floor.place.floor).toBe(3);
    expect(windowOpen()).toBe(true);
    confirmUi.yes = false;
    tap('enter');
    expect(confirmUi.open).toBe(false);
  });

  it('saying no keeps you on the floor', () => {
    standInIt();
    tap('up');
    confirmUi.yes = false;
    tap('z');
    expect(confirmUi.open).toBe(false);
    expect(game.floor.place.floor).toBe(3);
  });

  it('saying yes takes you to the town', () => {
    standInIt();
    tap('up');
    confirmUi.yes = true;
    tap('z');
    expect(game.floor.town).toBeTruthy();
    expect(placeKey(game.floor.place)).toBe('driftwood');
  });
});

describe('the camera on a fresh floor', () => {
  beforeEach(() => {
    game.view.w = 240;
    game.view.h = 180;
  });

  it('starts centred on the player (it used to pan in from the top-left)', () => {
    gotoPlace(climb(2));
    const want = cameraTarget();
    expect(Math.abs(game.cam.x - want.x)).toBeLessThan(1);
    expect(Math.abs(game.cam.y - want.y)).toBeLessThan(1);
    step(1);
    expect(Math.abs(game.cam.x - want.x)).toBeLessThan(1);
    expect(Math.abs(game.cam.y - want.y)).toBeLessThan(1);
  });

  it('so she starts inside the deadzone', () => {
    gotoPlace(climb(2));
    // (unless she spawned by a wall and the camera is pinned to the world's edge)
    const pinned = game.cam.x <= 0 || game.cam.x >= WORLD.w - game.view.w;
    if (!pinned) {
      expect(player.x).toBeGreaterThan(game.cam.x + game.view.w * CAM.left);
      expect(player.x).toBeLessThan(game.cam.x + game.view.w * CAM.right);
    }
    const feet = player.y + player.h;
    expect(feet).toBeGreaterThan(game.cam.y + game.view.h * CAM.top);
    expect(feet).toBeLessThan(game.cam.y + game.view.h * CAM.bottom);
  });

  it('on every floor up the tower', () => {
    const off: number[] = [];
    for (const n of [1, 3, 5, 8, 10]) {
      gotoPlace(climb(n));
      const want = cameraTarget();
      if (Math.abs(game.cam.x - want.x) > 1 || Math.abs(game.cam.y - want.y) > 1) off.push(n);
    }
    expect(off).toEqual([]);
  });
});
