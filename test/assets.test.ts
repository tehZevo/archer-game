import { describe, expect, it } from 'vitest';
import { archerFrame, climbPhase, GRIDS, POSE_FPS } from '../src/archer';
import { POSES } from '../src/ghost';
import { BACKDROPS, meteorFade, particlesAt } from '../src/backdrop';
import { HURT, MOB_ART, paintMob } from '../src/mobart';
import { PROP_H, PROP_W, propAt, PROPS } from '../src/props';
import { PORTAL_H, PORTAL_W, portalGrid } from '../src/portalart';
import { BOT_H, hash, TILESETS, tilesetFor, TOP_H, TOP_W, variantAt } from '../src/tileset';
import { MAP_AREAS } from '../src/world';
import fontPng from '../assets/font.png';
import { FONT_CHARS } from '../src/font';
import { bubbleable, bubbleText, bubbleWidth, DMG_H } from '../src/dmgfont';
import { NUM_LINE } from '../src/combat';

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


  it('every networked pose has frames and a frame rate', () => {
    for (const pose of POSES) {
      expect(GRIDS[pose].length).toBeGreaterThan(0);
      expect(POSE_FPS[pose]).toBeGreaterThan(0);
    }
  });

  it('new poses go on the end of the networked list (older clients show them as idle)', () => {
    expect(POSES[0]).toBe('idle');
    expect(POSES.indexOf('prone')).toBe(6);
    expect(POSES.indexOf('vanish')).toBe(9);
    expect(POSES.indexOf('fall')).toBe(10);
    expect(POSES.indexOf('roll')).toBe(POSES.length - 1);
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



  it('tile variants are 0-3, all used, and the same for the same tile', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 64; i++) seen.add(variantAt(i, 3));
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
    expect(variantAt(5, 7)).toBe(variantAt(5, 7));
  });

});

describe('props and backdrops', () => {
  it('every area with a tileset has its own props and backdrop', () => {
    for (const area of Object.keys(TILESETS)) {
      expect(PROPS[area]).toBeTruthy();
      expect(BACKDROPS[area]).toBeTruthy();
    }
  });



});


describe('the portal', () => {
  /** Whether a pixel of a portal frame is filled. */
  const filled = (f: number, x: number, y: number): boolean => portalGrid(f).px[(y * PORTAL_W + x) * 4 + 3] > 0;

  it('is an oval: its top corners are empty', () => {
    expect(filled(0, 0, 0)).toBe(false);
  });

  it('is an oval: its middle is filled', () => {
    expect(filled(0, PORTAL_W / 2, 13)).toBe(true);
  });

  it('swirls: the next frame is a different picture', () => {
    expect(portalGrid(1).px.join()).not.toBe(portalGrid(0).px.join());
  });

  it('sits on its ground ring at the bottom', () => {
    expect(filled(0, PORTAL_W / 2, PORTAL_H - 1)).toBe(true);
  });
});

describe('backdrop and tile polish', () => {

  describe('Starfall Observatory comets', () => {
    const comets = BACKDROPS['Starfall Observatory'].particles!;


    it('a comet\'s head is drawn in one of its colours, with the fade as its alpha', () => {
      // a colour with alpha is '#rrggbbaa'; tails stay under 25%, so look for a brighter head
      const headAlphas = (t: number): number[] => particlesAt(comets, t, 320, 240)
        .filter((q) => q.col.length === 9 && comets.cols.includes(q.col.slice(0, 7)))
        .map((q) => parseInt(q.col.slice(7), 16));
      const fading = [0.3, 1.1, 2.7, 5.2].some((t) => headAlphas(t).some((a) => a > 70 && a < 255));
      expect(fading).toBe(true);
    });
  });
});


describe('damage numbers (a bubble font)', () => {


  it('every digit and MISS has a glyph', () => {
    expect(bubbleable('0123456789')).toBe(true);
    expect(bubbleable('MISS')).toBe(true);
    expect(bubbleable('?')).toBe(false);
  });

});
