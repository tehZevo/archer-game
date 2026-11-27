import { beforeEach, describe, expect, it } from 'vitest';
import { climb, ground, release, step, tap } from './helpers';
import { WORLD } from '../src/config';
import { damage } from '../src/combat';
import { LAYOUTS } from '../src/floor';
import { net } from '../src/net';
import { game, gotoPlace, player } from '../src/state';
import { TOWN_PLANS } from '../src/townfloor';
import type { Floor, Platform } from '../src/types';
import { isPathEnd, isTown, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, START, TOWNS, townDepth } from '../src/world';

const DRIFTWOOD = { town: 'driftwood' };
const here = (): string => placeKey(game.floor.place);

/** Put the player standing still at a point (a portal's foot, say). */
function standAt(pt: { x: number; y: number }): void {
  player.x = pt.x;
  player.y = pt.y - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.climb = null;
}

describe('Driftwood Rest', () => {
  beforeEach(() => {
    release();
    gotoPlace(DRIFTWOOD);
  });

  it('is a designed layout, the same on every channel', () => {
    const layout = JSON.stringify(game.floor.platforms);
    net.channel = 3;
    gotoPlace(DRIFTWOOD);
    net.channel = 1;
    expect(JSON.stringify(game.floor.platforms)).toBe(layout);
  });

  it('has two ways up and one down, and only training dummies', () => {
    const [left, right, down] = game.floor.portals;
    expect(game.floor.portals.length).toBe(3);
    expect(placeKey(left.to)).toBe('woods-1');
    expect(placeKey(right.to)).toBe('meadows-1');
    expect(left.down).toBeFalsy();
    expect(right.down).toBeFalsy();
    expect(down.down).toBe(true);
    expect(placeKey(down.to)).toBe('saltwick');
    for (const m of game.mobs) expect(m.training).toBe(true);
  });


  it('the plaza deck is reached by a ladder and a rope from the ground', () => {
    const deckTop = Math.min(...game.floor.platforms.filter((p) => p.block === 1 && !p.inner).map((p) => p.y));
    expect(game.floor.ladders[0].y1).toBe(deckTop);
    expect(game.floor.ladders[0].y2).toBe(game.floor.platforms[0].y);
    expect(game.floor.ropes[0].y1).toBe(deckTop);
  });

  it('a loft over the deck holds the way down, up a ladder, with headroom under it', () => {
    const f = game.floor;
    const deck = f.platforms.filter((p) => p.block === 1), loft = f.platforms.filter((p) => p.block === 2);
    const deckTop = Math.min(...deck.map((p) => p.y));
    const loftTop = Math.min(...loft.map((p) => p.y)), loftBottom = Math.max(...loft.map((p) => p.y + p.h));
    const wayDown = f.portals.find((q) => q.down)!;
    const ladder = f.ladders[1];
    expect(f.layout).toBe('loft');
    expect(wayDown.y).toBe(loftTop);
    expect(loft.some((p) => !p.inner && p.y === loftTop && wayDown.x >= p.x && wayDown.x <= p.x + p.w)).toBe(true);
    expect(ladder.y1).toBe(loftTop);
    expect(ladder.y2).toBe(deckTop);
    expect(deckTop - loftBottom).toBeGreaterThanOrEqual(player.h + 4);
  });

  it('the right portal leads up into the Meadows, without refilling HP or MP', () => {
    player.hp = 5;
    player.mp = 1;
    standAt(game.floor.portals[1]);
    tap('up');
    expect(here()).toBe('meadows-1');
    expect(player.hp).toBe(5);
    expect(player.mp).toBe(1);
  });

  it('the left portal leads up into the Woods, a different layout', () => {
    standAt(game.floor.portals[1]);
    tap('up');
    const meadows = JSON.stringify(game.floor.platforms);
    gotoPlace(DRIFTWOOD);
    standAt(game.floor.portals[0]);
    tap('up');
    expect(here()).toBe('woods-1');
    expect(JSON.stringify(game.floor.platforms)).not.toBe(meadows);
  });

  it('skills work in town', () => {
    player.cd.z = 0;
    player.mp = 99;
    player.casting.useT = 0;
    tap('z');
    expect(player.casting.useT).toBeGreaterThan(0);
  });
});

describe('other towns', () => {
  beforeEach(() => release());

  it('a town\'s way down goes to the town its path started from, not the floor below', () => {
    gotoPlace({ town: 'lanternhollow' });
    standAt(game.floor.portals[game.floor.portals.length - 1]);
    tap('up');
    expect(here()).toBe('driftwood');
    expect(game.floor.town).toBeTruthy();
  });
});

describe('every town', () => {
  const towns = TOWNS.map((t) => t.id);
  const tops = (f: Floor): Platform[] => f.platforms.filter((p) => !p.inner);

  /** The block (level) standing at a point: 0 for the ground, undefined for mid-air. */
  function blockAt(f: Floor, x: number, y: number): number | undefined {
    const top = tops(f).find((p) => p.y === y && x >= p.x && x <= p.x + p.w);
    if (top) return top.block ?? 0;
    return tops(f).some((p) => p.ground && p.y === y) ? 0 : undefined;
  }

  /** The levels you can reach from the ground by walking along levels and climbing. */
  function reachable(f: Floor): Set<number> {
    const reach = new Set<number>([0]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of [...f.ladders, ...f.ropes]) {
        const low = blockAt(f, c.x, c.y2), high = blockAt(f, c.x, c.y1);
        if (low === undefined || high === undefined) continue;
        if (reach.has(low) && !reach.has(high)) { reach.add(high); grew = true; }
        if (reach.has(high) && !reach.has(low)) { reach.add(low); grew = true; }
      }
    }
    return reach;
  }

  it('towns come in every layout', () => {
    const plans = new Set<string>();
    for (const id of towns) {
      gotoPlace({ town: id });
      plans.add(game.floor.layout ?? '');
    }
    for (const plan of TOWN_PLANS) expect(plans).toContain(plan);
  });

  it('every ladder and rope joins two levels', () => {
    const bad: string[] = [];
    for (const id of towns) {
      gotoPlace({ town: id });
      const f = game.floor;
      for (const c of [...f.ladders, ...f.ropes]) {
        if (blockAt(f, c.x, c.y1) === undefined || blockAt(f, c.x, c.y2) === undefined) bad.push(`${id}: x ${c.x}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every portal and person can be reached by walking and climbing', () => {
    const bad: string[] = [];
    for (const id of towns) {
      gotoPlace({ town: id });
      const f = game.floor, reach = reachable(f);
      for (const q of f.portals) {
        const b = blockAt(f, q.x, q.y);
        if (b === undefined || !reach.has(b)) bad.push(`${id}: portal ${q.label}`);
      }
      for (const npc of f.npcs ?? []) {
        const b = blockAt(f, npc.x, npc.y);
        if (b === undefined || !reach.has(b)) bad.push(`${id}: ${npc.kind}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('wherever one level is over another, you can walk under it', () => {
    const bad: string[] = [];
    for (const id of towns) {
      gotoPlace({ town: id });
      const f = game.floor;
      for (const upper of tops(f)) {
        for (const lower of tops(f)) {
          const overlaps = upper.x < lower.x + lower.w && lower.x < upper.x + upper.w;
          if (upper === lower || upper.block === lower.block || !overlaps || upper.y >= lower.y) continue;
          const underside = Math.max(...f.platforms.filter((p) => p.block === upper.block && p.x === upper.x).map((p) => p.y + p.h));
          const restsOnIt = underside === lower.y; // a step resting on the level below is fine
          if (lower.y - underside < player.h + 4 && !restsOnIt) bad.push(`${id}: x ${lower.x}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('climbing off a ladder or rope never lands you in a portal', () => {
    const bad: string[] = [];
    for (const id of towns) {
      gotoPlace({ town: id });
      const f = game.floor;
      for (const q of f.portals) {
        for (const c of [...f.ladders, ...f.ropes]) {
          const endsAtPortal = c.y1 === q.y || c.y2 === q.y;
          if (endsAtPortal && Math.abs(c.x - q.x) < q.w / 2 + 17) bad.push(`${id}: by ${q.label}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });


  it('decorations stand on something, and every town has buildings', () => {
    const bad: string[] = [];
    for (const id of towns) {
      gotoPlace({ town: id });
      const decor = game.floor.decor ?? [];
      for (const d of decor) if (blockAt(game.floor, d.x, d.y) === undefined) bad.push(`${id}: ${d.kind} in mid-air at ${d.x}`);
      if (!decor.some((d) => d.kind === 'house' || d.kind === 'tower')) bad.push(`${id}: no buildings`);
    }
    expect(bad).toEqual([]);
  });
});

describe('the map of towns and paths', () => {
  it('every path runs between two known towns', () => {
    const ids = TOWNS.map((t) => t.id);
    for (const p of PATHS) {
      expect(ids).toContain(p.from);
      expect(ids).toContain(p.to);
    }
  });

  it('every town but the start is reached by a path', () => {
    for (const t of TOWNS) {
      if (t.id === START.town) continue;
      expect(pathsInto(t.id).length).toBeGreaterThan(0);
      expect(townDepth(t.id)).toBeGreaterThan(0);
    }
  });

  it('every path has its own mix of the shared floor layouts', () => {
    for (const p of PATHS) {
      expect(Object.keys(p.layouts).length).toBeGreaterThan(0);
      for (const [layout, weight] of Object.entries(p.layouts)) {
        expect(Object.keys(LAYOUTS)).toContain(layout);
        expect(weight).toBeGreaterThan(0);
      }
    }
  });

  it('a town has room for every way up (two at most) and down (one at most)', () => {
    for (const t of TOWNS) {
      expect(pathsFrom(t.id).length).toBeLessThanOrEqual(2);
      expect(pathsInto(t.id).length).toBeLessThanOrEqual(1);
    }
  });
});

describe('places (a town, or a path and a floor)', () => {
  it('a path\'s floors are followed by the town it ends in', () => {
    expect(isTown(climb(1))).toBe(true);
    expect(isTown(climb(2))).toBe(false);
    expect(isTown(climb(4))).toBe(false);
    expect(isTown(climb(5))).toBe(true);
    expect(isTown(climb(6))).toBe(false);
    expect(isTown(climb(11))).toBe(true);
  });

  it('a place reads as its area (no floor number) or its town', () => {
    expect(placeName({ path: 'shore', floor: 1 })).toBe('Sunlit Shore');
    expect(placeName({ path: 'woods', floor: 2 })).toBe('Whispering Woods');
    expect(placeName({ town: 'mossgate' })).toBe('Mossgate Village');
    expect(placeName({ town: 'lanternhollow' })).toBe('Lanternhollow Town');
  });

  it('paths only lead upward, to a deeper town', () => {
    for (const p of PATHS) expect(townDepth(p.to)).toBeGreaterThan(townDepth(p.from));
  });

  it('a town\'s two ways up go to different areas', () => {
    for (const t of TOWNS) {
      const up = pathsFrom(t.id);
      if (up.length === 2) expect(up[0].name).not.toBe(up[1].name);
    }
  });

  it('some branches end short of the top', () => {
    const deepest = Math.max(...TOWNS.map((t) => townDepth(t.id)));
    expect(TOWNS.some((t) => pathsFrom(t.id).length === 0 && townDepth(t.id) < deepest)).toBe(true);
  });

  it('the last floor of a path is its end (the boss floor)', () => {
    expect(isPathEnd({ path: 'shore', floor: 3 })).toBe(true);
    expect(isPathEnd({ path: 'woods', floor: 5 })).toBe(true);
    expect(isPathEnd({ path: 'woods', floor: 4 })).toBe(false);
    expect(isPathEnd(START)).toBe(false);
  });

  it('a path leads on to its town; a town leads up its leftmost path', () => {
    expect(placeKey(nextPlace({ path: 'shore', floor: 1 }))).toBe('shore-2');
    expect(placeKey(nextPlace({ path: 'shore', floor: 3 }))).toBe('driftwood');
    expect(placeKey(nextPlace({ town: 'driftwood' }))).toBe('woods-1');
  });


  it('a town at the end of a branch has only its way down, and nothing lies past it', () => {
    release();
    gotoPlace({ town: 'gearholm' });
    expect(game.floor.portals.length).toBe(1);
    expect(game.floor.portals[0].down).toBe(true);
    gotoPlace(nextPlace(game.floor.place)); // a warp past it stays in the town
    expect(game.floor.town).toBeTruthy();
    expect(placeName(game.floor.place)).toBe('Gearholm City');
  });
});

describe('training dummy', () => {
  // every town has one on its own ledge against the right wall: it shows your
  // damage numbers but never dies, moves, dodges or fights back
  const dummyHere = () => game.mobs.find((m) => m.training)!;

  beforeEach(() => release());

  it('stands on its own perch at the right wall, up a ladder from a step you can hop onto', () => {
    gotoPlace(START);
    const d = dummyHere(), feet = d.y + d.h;
    const perch = game.floor.platforms.filter((p) => p.block && p.y === feet && d.x >= p.x - d.w && d.x <= p.x + p.w);
    expect(perch.length).toBeGreaterThan(0);
    const perchRight = Math.max(...game.floor.platforms.filter((p) => p.block === perch[0].block).map((p) => p.x + p.w));
    expect(perchRight).toBe(WORLD.w);
    const perchLeft = Math.min(...game.floor.platforms.filter((p) => p.block === perch[0].block).map((p) => p.x));
    expect(game.floor.npcs?.some((n) => n.y === feet && n.x >= perchLeft)).toBe(false); // nobody else up there

    const ladder = game.floor.ladders.find((l) => l.y1 === feet && l.x > WORLD.w - 16)!;
    expect(ladder).toBeTruthy();
    const hop = game.floor.platforms.find((p) => p.block && p.y === ladder.y2 && ladder.x >= p.x && ladder.x <= p.x + p.w)!;
    expect(hop).toBeTruthy();
    expect(ground().y - hop.y).toBeLessThanOrEqual(16);
  });

  it('its perch sits low, with the way up beside it on the ground', () => {
    gotoPlace(DRIFTWOOD);
    const d = game.mobs.find((m) => m.training)!;
    expect(ground().y - (d.y + d.h)).toBeLessThanOrEqual(6 * 16); // a few storeys, not seven
    const rightWayUp = game.floor.portals.find((q) => !q.down && q.x > WORLD.w / 2)!;
    expect(rightWayUp.y).toBe(ground().y);
  });

  it('takes hits and shows every number, but never dies, dodges, moves or gets angry', () => {
    gotoPlace(START);
    const d = dummyHere(), x = d.x, y = d.y, hp = d.hp;
    game.dmgNums.length = 0;
    player.level = 50;
    for (let i = 0; i < 40; i++) damage(d, 1e6, { more: i < 39, first: i === 0, launch: true });
    const shown = game.dmgNums.length, missed = game.dmgNums.some((n) => n.txt === 'MISS');
    step(120);
    player.level = 1;
    expect(game.mobs).toContain(d);
    expect(d.hp).toBe(hp);
    expect(shown).toBe(40);
    expect(missed).toBe(false);
    expect(d.x).toBe(x);
    expect(d.y).toBe(y);
    expect(d.aggro).toBeFalsy();
    expect(d.airTime).toBe(0);
  });
});

