import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arena, memoryStorage, release, tap } from './helpers';
import { archerFrame, DIVE_PITCH, GRIDS, pitch, poseCycle, styled } from '../src/archer';
import { NPC_R, wallet } from '../src/economy';
import { BASIC, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook } from '../src/look';
import { disabled, initMenu, items, lookLocked, menu, menuKey } from '../src/menu';
import { clearSave, save } from '../src/save';
import { game, gotoPlace, player } from '../src/state';
import {
  openStylist, shownLook, ST_ROWS_W, ST_TOP, styleChanged, STYLE_FEE, stylist, stylistBox, stylistKey, stylistRows,
  STYLIST_ROWS, stylistTap,
} from '../src/stylist';
import { clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS } from '../src/townlooks';
import { placeName, START, TOWNS } from '../src/world';
import { NPC_FRAMES, npcFrame, npcRows } from '../src/npcart';
import { DECOR_FRAMES, type DecorKind, paintDecor, paintSmoke, SMOKE, TOWN_PALS } from '../src/towndecor';

const POSE_NAMES = Object.keys(GRIDS) as (keyof typeof GRIDS)[];

/** How many pixels differ between two same-sized frames. */
function pixelsChanged(a: string[], b: string[]): number {
  let n = 0;
  for (let y = 0; y < a.length; y++) for (let x = 0; x < a[y].length; x++) if (a[y][x] !== b[y][x]) n++;
  return n;
}

describe('looks: hair style, hair colour, skin and outfit', () => {
  it('a bad saved look falls back to the default, a good one is kept', () => {
    expect(cleanLook({ style: 99, hair: -1, skin: 'x' })).toEqual(DEFAULT_LOOK);
    expect(cleanLook({ style: 2, hair: 3, skin: 1, outfit: 4 }).hair).toBe(3);
  });

  it('stepping a look wraps around', () => {
    expect(stepLook(DEFAULT_LOOK, 'style', -1).style).toBe(LOOK_COUNTS.style - 1);
  });

  it('the elf ear follows the skin tone', () => {
    const palette = lookPalette({ ...DEFAULT_LOOK, skin: 3 });
    expect(palette.k).toBe(palette.s);
  });

  it('the default hair style changes at most one pixel of any frame', () => {
    for (const pose of POSE_NAMES) for (const frame of GRIDS[pose]) expect(pixelsChanged(styled(frame, pose, 0), frame)).toBeLessThanOrEqual(1);
  });

  it('every hair style and build keeps frames their size, and leaves the body, bow and arms alone', () => {
    const bad: string[] = [];
    for (let style = 1; style < LOOK_COUNTS.style; style++) {
      for (const body of [0, 1]) {
        for (const pose of POSE_NAMES) {
          for (const frame of GRIDS[pose]) {
            const s = styled(frame, pose, style, body);
            const sameSize = s.length === frame.length && s.every((row, y) => row.length === frame[y].length);
            if (!sameSize) { bad.push(`style ${style} body ${body} ${pose}: size`); continue; }
            // below the head (row 12 on), only the cape (c, C), outline (o) and empty (.) pixels may change
            for (let y = 12; y < frame.length; y++) {
              for (let x = 0; x < frame[y].length; x++) {
                if (s[y][x] !== frame[y][x] && !'cCo.'.includes(frame[y][x])) bad.push(`style ${style} body ${body} ${pose}: ${x},${y}`);
              }
            }
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('every hair style looks different', () => {
    const looks = new Set(Array.from({ length: LOOK_COUNTS.style }, (_, style) => styled(GRIDS.idle[0], 'idle', style).join()));
    expect(looks.size).toBe(LOOK_COUNTS.style);
  });

  it('the male build changes the face', () => {
    for (const pose of POSE_NAMES.filter((p) => p !== 'prone' && p !== 'climb')) {
      const frame = GRIDS[pose][0];
      expect(pixelsChanged(styled(frame, pose, 0, 1), styled(frame, pose, 0, 0))).toBeGreaterThanOrEqual(3);
    }
  });

  it('long hair shows down the back', () => {
    expect(styled(GRIDS.idle[0], 'idle', 2).join()).not.toBe(styled(GRIDS.idle[0], 'idle', 1).join());
  });
});

describe('town extras (each town\'s stylist offers its own, which seeing unlocks everywhere)', () => {
  const extras = Object.values(TOWN_LOOKS).flat();

  it('every town\'s stylist has an extra', () => {
    for (const t of TOWNS) expect(TOWN_LOOKS[t.name]?.length).toBeGreaterThan(0);
  });

  it('extras are real looks, not basic ones, and each is offered by one town only', () => {
    const ids = extras.map((e) => `${e.k}:${e.i}`);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of extras) {
      expect(e.i).toBeLessThan(LOOK_COUNTS[e.k]);
      expect(isBasic(e.k, e.i)).toBe(false);
    }
  });

  it('between them they cover every style and colour that isn\'t basic', () => {
    const ids = extras.map((e) => `${e.k}:${e.i}`);
    for (const kind of ['style', 'hair'] as const) {
      for (let i = 0; i < LOOK_COUNTS[kind]; i++) if (!isBasic(kind, i)) expect(ids).toContain(`${kind}:${i}`);
    }
  });
});

describe('the stylist', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    setMyLook(DEFAULT_LOOK);
    clearUnlocks();
    clearSave();
    arena(1);
  });
  afterEach(() => {
    stylist.open = false;
    menu.open = false;
    setMyLook(DEFAULT_LOOK);
    clearUnlocks();
    clearSave();
    release();
    vi.unstubAllGlobals();
  });

  describe('from the main menu (making your archer)', () => {
    function openFromMenu(): void {
      initMenu(() => {}, START);
      menu.sel = items().indexOf('look');
      menuKey('enter');
    }

    it('LOOK opens the stylist, starting on the BODY row', () => {
      openFromMenu();
      expect(stylist.open).toBe(true);
      expect(stylist.sel).toBe(0);
      expect(stylist.town).toBe(null);
      expect(stylistRows()[0]).toBe('BODY');
    });

    it('Right steps the picked row: first the body, then the hair style', () => {
      openFromMenu();
      menuKey('right');
      expect(myLook().body).toBe(1);
      menuKey('down');
      menuKey('right');
      expect(myLook().style).toBe(1);
    });

    it('the third row is the hair colour, and the look is kept on this device', () => {
      openFromMenu();
      menuKey('down');
      menuKey('down');
      menuKey('left');
      expect(myLook().hair).toBe(BASIC.hair! - 1);
      const kept = cleanLook(JSON.parse(localStorage.getItem('archer-game:look') ?? '{}'));
      expect(kept.hair).toBe(BASIC.hair! - 1);
    });

    it('Esc closes the stylist, not the menu', () => {
      openFromMenu();
      menuKey('escape');
      expect(stylist.open).toBe(false);
      expect(menu.open).toBe(true);
    });

    it('tapping a row\'s right half steps it forward, the left half back; outside closes', () => {
      openFromMenu();
      const box = stylistBox(320, 180);
      const rowY = (i: number): number => box.y + ST_TOP + i * 14 + 3;
      const skin = myLook().skin;
      stylistTap(box.x + ST_ROWS_W - 10, rowY(3), 320, 180);
      expect(myLook().skin).toBe((skin + 1) % LOOK_COUNTS.skin);
      expect(stylist.sel).toBe(3);
      stylistTap(box.x + 10, rowY(3), 320, 180);
      expect(myLook().skin).toBe(skin);
      stylistTap(2, 2, 320, 180);
      expect(stylist.open).toBe(false);
    });

    it('once your archer is made (saved), the LOOK row is locked', () => {
      save();
      openFromMenu();
      expect(lookLocked()).toBe(true);
      expect(disabled('look')).toBe(true);
      expect(stylist.open).toBe(false);
    });
  });

  describe('in town', () => {
    const stylistNpc = () => game.floor.npcs!.find((n) => n.kind === 'stylist')!;
    const town = (): string => placeName(game.floor.place);

    function visitStylist(): void {
      gotoPlace(START);
      const npc = stylistNpc();
      player.x = npc.x;
      player.y = npc.y - player.h;
      player.vx = 0;
      player.vy = 0;
      player.onGround = true;
      player.climb = null;
      tap('up');
    }

    it('every town has one, standing clear of portals, ladders and ropes', () => {
      for (const t of TOWNS) {
        gotoPlace({ town: t.id });
        const f = game.floor, npc = stylistNpc();
        expect(npc, t.name).toBeTruthy();
        const busy = [
          ...f.portals.map((q) => [q.x - q.w / 2 - 10, q.x + q.w / 2 + 10]),
          ...f.ladders.map((l) => [l.x - 7, l.x + 7]),
          ...f.ropes.map((r) => [r.x - 7, r.x + 7]),
        ];
        for (const [left, right] of busy) expect(npc.x + NPC_R <= left || npc.x - NPC_R >= right, t.name).toBe(true);
      }
    });

    it('Up beside the stylist opens the window: it knows the town, its looks are new, and there is no BODY row', () => {
      visitStylist();
      expect(stylist.open).toBe(true);
      expect(stylist.town).toBe(town());
      expect(stylist.fresh).toBeGreaterThan(0);
      expect(stylistRows()[0]).toBe('HAIR');
      expect(stylistRows()).not.toContain('BODY');
    });

    it('arrows try a look on, without keeping it yet', () => {
      visitStylist();
      tap('right');
      expect(shownLook().style).toBe(1);
      expect(myLook().style).toBe(0);
      expect(styleChanged()).toBe(true);
    });

    it('keeping the new look needs the fee', () => {
      visitStylist();
      tap('right');
      wallet.coins = STYLE_FEE - 1;
      stylist.sel = stylistRows().indexOf('DONE');
      tap('z');
      expect(stylist.open).toBe(true);
      expect(myLook().style).toBe(0);
      expect(wallet.coins).toBe(STYLE_FEE - 1);
      expect(stylist.note).not.toBe('');
    });

    it('DONE keeps the new look for the fee', () => {
      setMyLook({ ...DEFAULT_LOOK, body: 1 });
      visitStylist();
      tap('right');
      wallet.coins = STYLE_FEE + 5;
      stylist.sel = stylistRows().indexOf('DONE');
      tap('z');
      expect(stylist.open).toBe(false);
      expect(myLook().style).toBe(1);
      expect(myLook().body).toBe(1); // unchanged
      expect(wallet.coins).toBe(5);
    });

    describe('its own extra', () => {
      function tryTheExtra(): { k: 'style' | 'hair'; i: number } {
        gotoPlace(START);
        const extra = TOWN_LOOKS[town()][0];
        setMyLook({ ...DEFAULT_LOOK, [extra.k]: extra.i - 1 });
        openStylist(town());
        stylist.sel = STYLIST_ROWS.indexOf(extra.k === 'style' ? 'HAIR' : 'HAIR COLOUR');
        tap('right');
        return extra;
      }

      it('is offered there', () => {
        const extra = tryTheExtra();
        expect(shownLook()[extra.k]).toBe(extra.i);
      });

      it('X closes the window, and having seen the extra unlocks it for good', () => {
        const extra = tryTheExtra();
        tap('x');
        expect(stylist.open).toBe(false);
        expect(game.pause).toBeFalsy();
        expect(isUnlocked(extra.k, extra.i)).toBe(true);
        expect(offeredAt(null)(extra.k, extra.i)).toBe(true);
      });

      it('a second visit has nothing new', () => {
        tryTheExtra();
        tap('x');
        openStylist(town());
        expect(stylist.fresh).toBe(0);
      });

      it('without the unlock, only that town offers it', () => {
        const extra = TOWN_LOOKS[placeName(START)][0];
        expect(offeredAt(null)(extra.k, extra.i)).toBe(false);
        expect(offeredAt(placeName(START))(extra.k, extra.i)).toBe(true);
      });
    });
  });
});

describe('other players stand still', () => {
  // the idle's breathing read as floating, so a ghost uses the standing frame
  const frames = { ...GRIDS, idle: [['a'], ['b']] } as never;
  const ghostAt = (t: number): unknown => archerFrame(frames, 'idle', poseCycle('idle', 100, t, false));
  const mineAt = (t: number): unknown => archerFrame(frames, 'idle', poseCycle('idle', 100, t));

  it('a ghost\'s idle frame does not change with time', () => {
    expect(ghostAt(0.4)).toBe(ghostAt(0));
    expect(ghostAt(1.2)).toBe(ghostAt(0));
  });

  it('while your own archer keeps breathing', () => {
    expect(mineAt(0.5)).not.toBe(mineAt(0));
  });

  it('a climb steps with the height climbed, not with time', () => {
    expect(poseCycle('climb', 100, 0.5)).toBe(poseCycle('climb', 100, 0));
    expect(poseCycle('climb', 108, 0)).not.toBe(poseCycle('climb', 100, 0));
  });
});

describe('the dive\'s pitch is drawn into the frame (no canvas rotation)', () => {
  const upright = GRIDS.dive[0];
  const pitched = pitch(upright, DIVE_PITCH);
  /** How many filled pixels a frame has. */
  const ink = (rows: string[]): number => rows.join('').replace(/\./g, '').length;

  it('a pitched frame is square and big enough for the whole figure', () => {
    expect(pitched.length).toBe(pitched[0].length);
    expect(pitched.length).toBeGreaterThanOrEqual(Math.hypot(upright[0].length, upright.length));
  });

  it('it has about the same number of pixels, and no new colours', () => {
    expect(Math.abs(ink(pitched) - ink(upright)) / ink(upright)).toBeLessThan(0.2);
    for (const ch of new Set(pitched.join(''))) expect(upright.join('')).toContain(ch);
  });

  it('a zero pitch keeps the figure upright', () => {
    expect(pitch(upright, 0).some((row) => row.includes('h'))).toBe(true);
  });
});

describe('town NPCs', () => {
  const times = Array.from({ length: 400 }, (_, i) => i * 0.025);

  it('idle ones breathe and blink, and never wave', () => {
    const frames = new Set(times.map((t) => npcFrame(t, false, 1.3)));
    expect(frames.has(0)).toBe(true);
    expect(frames.has(1)).toBe(true);
    expect(frames.has(2)).toBe(true);
    expect(frames.has(3)).toBe(false);
  });

  it('they wave when you are near', () => {
    const frames = new Set(times.map((t) => npcFrame(t, true, 1.3)));
    expect(frames.has(3)).toBe(true);
    expect(frames.has(2)).toBe(false);
  });

  it('every frame is its own, and the three NPCs look different', () => {
    const shopFrames = Array.from({ length: NPC_FRAMES }, (_, f) => npcRows('shop', f).join());
    expect(new Set(shopFrames).size).toBe(NPC_FRAMES);
    const npcs = (['shop', 'stylist', 'trainer'] as const).map((k) => npcRows(k, 0).join());
    expect(new Set(npcs).size).toBe(3);
  });
});

describe('town decor that moves', () => {
  /** Each frame of a piece of decor, as a string to compare. */
  function framesOf(kind: DecorKind): string[] {
    return Array.from({ length: DECOR_FRAMES[kind] }, (_, f) => {
      const cells: string[] = [];
      paintDecor(kind, TOWN_PALS[0], (x, y, col, w = 1, h = 1) => cells.push(`${x},${y},${w},${h},${col}`), false, f);
      return cells.join(';');
    });
  }
  const moving = (Object.keys(DECOR_FRAMES) as DecorKind[]).filter((k) => DECOR_FRAMES[k] > 1);

  it('lamps, flowers, signs and awnings move', () => {
    for (const k of ['lamp', 'flowers', 'sign', 'awning']) expect(moving).toContain(k);
  });

  it('and each of their frames is different', () => {
    const still = moving.filter((k) => new Set(framesOf(k)).size <= 1);
    expect(still).toEqual([]);
  });

  it('chimney smoke rises frame by frame', () => {
    const frames = Array.from({ length: SMOKE.frames }, (_, f) => {
      const cells: string[] = [];
      paintSmoke((x, y) => cells.push(`${x},${y}`), f);
      return cells.join(';');
    });
    expect(new Set(frames).size).toBe(SMOKE.frames);
  });
});
