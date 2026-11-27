import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arena, memoryStorage, release, tap } from './helpers';
import { archerFrame, GRIDS, poseCycle, styled } from '../src/archer';
import { NPC_R, wallet } from '../src/economy';
import { BASIC, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook } from '../src/look';
import { disabled, initMenu, items, lookLocked, menu, menuKey } from '../src/menu';
import { clearSave, save } from '../src/save';
import { game, gotoPlace, player } from '../src/state';
import {
  openStylist, shownLook, ST_ROWS_W, ST_TOP, styleChanged, STYLE_FEE, stylist, stylistBox, stylistRows,
  STYLIST_ROWS, stylistTap } from '../src/stylist';
import { clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS } from '../src/townlooks';
import { placeName, START, TOWNS } from '../src/world';
import { npcFrame } from '../src/npcart';
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

});

describe('body types', () => {
  /** Hair pixels below the chin (row 10 down) of the standing frame. */
  const hairDownTheBack = (body: number): number =>
    styled(GRIDS.idle[0], 'idle', 0, body).slice(10).join('').replace(/[^hH]/g, '').length;

  it('in the default style, her hair falls down her back', () => {
    expect(hairDownTheBack(0)).toBeGreaterThan(0);
  });

  it('in the default style, his hair is cut short', () => {
    expect(hairDownTheBack(1)).toBe(0);
  });
});

describe('town extras (each town\'s stylist offers its own, which seeing unlocks everywhere)', () => {
  const extras = Object.values(TOWN_LOOKS).flat();

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

  it('a climb steps with the height climbed, not with time', () => {
    expect(poseCycle('climb', 100, 0.5)).toBe(poseCycle('climb', 100, 0));
    expect(poseCycle('climb', 108, 0)).not.toBe(poseCycle('climb', 100, 0));
  });
});

describe('town NPCs', () => {
  const times = Array.from({ length: 400 }, (_, i) => i * 0.025);

  it('they wave when you are near', () => {
    const frames = new Set(times.map((t) => npcFrame(t, true, 1.3)));
    expect(frames.has(3)).toBe(true);
    expect(frames.has(2)).toBe(false);
  });
});
