import { describe, expect, it } from 'vitest';
import { archerFrame, climbPhase, GRIDS, POSE_FPS } from '../src/archer';
import { POSES } from '../src/ghost';
import { BACKDROPS, particlesAt } from '../src/backdrop';
import { MOB_TYPES } from '../src/config';
import { HURT, MOB_ART, paintMob } from '../src/mobart';
import { PROP_H, PROP_W, propAt, PROPS } from '../src/props';
import { BLOCK_VARIANTS, BOT_H, hash, TILESETS, tilesetFor, TOP_H, TOP_W, variantAt } from '../src/tileset';
import { MAP_AREAS } from '../src/world';

const HEX6 = /^#[0-9a-f]{6}$/i;

/** A paint function that records any pixel outside a w x h box, or with a bad colour. */
function boxChecker(w: number, h: number, colour = HEX6) {
  const bad: string[] = [];
  const paint = (x: number, y: number, c: string, pw = 1, ph = 1): void => {
    if (x < 0 || y < 0 || x + pw > w || y + ph > h || !colour.test(c)) bad.push(`${x},${y} ${pw}x${ph} ${c}`);
  };
  return { paint, bad };
}

describe('archer sprite sheet', () => {
  it('every frame is 16x24, except lying flat which is 24x24', () => {
    for (const [pose, frames] of Object.entries(GRIDS)) {
      const width = pose === 'prone' ? 24 : 16;
      expect(frames.length).toBeGreaterThan(0);
      for (const grid of frames) {
        expect(grid.length).toBe(24);
        for (const row of grid) expect(row.length).toBe(width);
      }
    }
  });

  it('the head lying flat is as tall as the standing head', () => {
    const headRows = (grid: string[]): number => grid.filter((row) => /[hs]/.test(row)).length;
    const standing = headRows(GRIDS.idle[0].slice(0, 10));
    expect(headRows(GRIDS.prone[0])).toBeGreaterThanOrEqual(standing - 1);
  });

  it('every networked pose has frames and a frame rate', () => {
    for (const pose of POSES) {
      expect(GRIDS[pose].length).toBeGreaterThan(0);
      expect(POSE_FPS[pose]).toBeGreaterThan(0);
    }
  });

  it('new poses go on the end of the networked list (older clients show them as idle)', () => {
    expect(POSES[0]).toBe('idle');
    expect(POSES.indexOf('prone')).toBe(7);
    expect(POSES.indexOf('vanish')).toBe(10);
    expect(POSES.indexOf('fall')).toBe(POSES.length - 1);
  });
});

describe('climbing animation', () => {
  it('holds its frame while you hang still, and steps as you climb', () => {
    const frames = { ...GRIDS, climb: [['a'], ['b']] } as never;
    const frameAt = (feet: number): unknown => archerFrame(frames, 'climb', climbPhase(feet));
    expect(frameAt(100)).toBe(frameAt(100));
    expect(frameAt(103)).toBe(frameAt(100));
    expect(frameAt(108)).not.toBe(frameAt(100));
  });
});

describe('tilesets', () => {
  // areas with no set of their own yet use the Harbor's
  const FALLBACK = ['Old Keep', 'Ember Wastes', 'Sky Reef', 'Chapel Spire', 'Frozen Summit'];

  it('every area in play has a tileset, and Clockwork Spire is on the map', () => {
    for (const area of ['Sunlit Shore', 'Whispering Woods', 'Echoing Caves', 'Murky Swamp', 'Craggy Mountains', 'Endless Sky', 'Clockwork Spire']) {
      expect(tilesetFor(area)).toBeTruthy();
    }
    expect(MAP_AREAS).toContain('Clockwork Spire');
  });

  it('every other area on the map has its own tileset', () => {
    for (const area of MAP_AREAS.filter((a) => !FALLBACK.includes(a))) expect(tilesetFor(area).name).toBe(area);
  });

  it('unknown areas fall back to the Harbor (there is no Classic set)', () => {
    expect(tilesetFor('Nowhere').name).toBe('Harbor');
    expect(TILESETS.Classic).toBeUndefined();
    expect(PROPS.Classic).toBeUndefined();
    expect(BACKDROPS.Classic).toBeUndefined();
  });

  it('tile fills and surfaces paint a valid colour for every pixel and variant', () => {
    const bad: string[] = [];
    for (const ts of Object.values(TILESETS)) {
      for (let v = 0; v < 4; v++) {
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 16; x++) {
            if (!HEX6.test(ts.fill(x, y, v))) bad.push(`${ts.name} fill ${x},${y},${v}`);
            const c = ts.surface(x, y, v);
            if (c !== null && !HEX6.test(c)) bad.push(`${ts.name} surface ${x},${y},${v}`);
          }
        }
      }
      if (!ts.surface(0, 0, 0)) bad.push(`${ts.name} has no surface`);
    }
    expect(bad).toEqual([]);
  });

  it('tops, bottoms, ropes and ladders paint inside their sprites', () => {
    const bad: string[] = [];
    for (const ts of Object.values(TILESETS)) {
      const top = boxChecker(TOP_W, TOP_H), bottom = boxChecker(16, BOT_H), climbable = boxChecker(16, 16);
      for (let v = 0; v < 4; v++) {
        for (const westEdge of [false, true]) for (const eastEdge of [false, true]) ts.top?.(top.paint, v, westEdge, eastEdge);
        ts.bottom?.(bottom.paint, v);
      }
      ts.rope(climbable.paint);
      ts.ladder(climbable.paint);
      for (const b of [...top.bad, ...bottom.bad, ...climbable.bad]) bad.push(`${ts.name}: ${b}`);
    }
    expect(bad).toEqual([]);
  });

  it('tile variants are 0-3, all used, and the same for the same tile', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 64; i++) seen.add(variantAt(i, 3));
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
    expect(variantAt(5, 7)).toBe(variantAt(5, 7));
  });

  it('block fills pick from all 8 variants', () => {
    const seen = new Set(Array.from({ length: 128 }, (_, i) => variantAt(i, 3, 0, BLOCK_VARIANTS)));
    expect(seen.size).toBe(BLOCK_VARIANTS);
    for (const v of seen) expect(v).toBeLessThan(BLOCK_VARIANTS);
  });

  it('decorations pick their variant apart from the fill', () => {
    const differs = Array.from({ length: 32 }, (_, i) => variantAt(i, 0) !== variantAt(i, 0, 1));
    expect(differs).toContain(true);
    expect(hash(1, 2)).not.toBe(hash(2, 1));
  });
});

describe('props and backdrops', () => {
  it('every area with a tileset has its own props and backdrop', () => {
    for (const area of Object.keys(TILESETS)) {
      expect(PROPS[area]).toBeTruthy();
      expect(BACKDROPS[area]).toBeTruthy();
    }
  });

  it('backdrop particles stay in view', () => {
    for (const b of Object.values(BACKDROPS)) {
      if (!b.particles) continue;
      for (const q of particlesAt(b.particles, 3.7, 240, 180)) {
        expect(q.x).toBeGreaterThanOrEqual(-20);
        expect(q.x).toBeLessThanOrEqual(240);
        expect(q.y).toBeGreaterThanOrEqual(-20);
        expect(q.y).toBeLessThanOrEqual(180);
      }
    }
  });

  it('every prop paints something, only inside its canvas', () => {
    const bad: string[] = [];
    for (const [area, props] of Object.entries(PROPS)) {
      props.forEach((prop, i) => {
        let painted = 0;
        prop((x, y, c, w = 1, h = 1) => {
          painted++;
          // props may paint on half pixels, so allow half a pixel either side
          const outside = x < -0.5 || y < -0.5 || x + w > PROP_W + 0.5 || y + h > PROP_H + 0.5;
          if (outside || !/^#[0-9a-f]{3,8}$/i.test(c)) bad.push(`${area} prop ${i}: ${x},${y} ${w}x${h} ${c}`);
        });
        if (painted === 0) bad.push(`${area} prop ${i} paints nothing`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('props stand on a few platform tops, not most', () => {
    let placed = 0;
    for (let i = 0; i < 400; i++) {
      const k = propAt('Whispering Woods', i, 7);
      if (k === null) continue;
      placed++;
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(PROPS['Whispering Woods'].length);
    }
    expect(placed).toBeGreaterThan(20);
    expect(placed).toBeLessThan(90);
  });
});

describe('enemy art', () => {
  /** Every rect a frame paints, as text, to compare frames. */
  function frameRects(name: string, frame: number): string {
    const rects: string[] = [];
    paintMob(name, frame, (x, y, c, w = 1, h = 1) => rects.push(`${x},${y},${c},${w},${h}`));
    return rects.join(';');
  }

  it('paints inside its box (the hitbox), with valid colours', () => {
    const bad: string[] = [];
    for (const [name, { look }] of Object.entries(MOB_ART)) {
      for (const frame of [0, 1, 2, 3, HURT]) {
        const check = boxChecker(look.w, look.h);
        paintMob(name, frame, check.paint);
        for (const b of check.bad) bad.push(`${name} frame ${frame}: ${b}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every painted enemy has its own hurt pose, not just another frame again', () => {
    const same = Object.keys(MOB_ART).filter((name) => [0, 1, 2, 3].some((f) => frameRects(name, HURT) === frameRects(name, f)));
    expect(same).toEqual([]);
  });

  it('a painted enemy is the size of its art', () => {
    for (const m of MOB_TYPES.filter((t) => MOB_ART[t.n])) {
      expect(m.w).toBe(MOB_ART[m.n].look.w);
      expect(m.h).toBe(MOB_ART[m.n].look.h);
    }
  });
});
