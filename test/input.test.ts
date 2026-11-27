import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arena, dummy, memoryStorage } from './helpers';
import {
  actionFor,
  ACTIONS,
  bindKey,
  binds,
  capture,
  cleanBinds,
  keyName,
  normalize,
  resetBinds,
  setKey,
  setLayout,
} from '../src/input';
import { KEY_ROWS, keysUi } from '../src/keys';
import { openSettings, settingsKey, settingsUi, SETTING_ROWS } from '../src/settings';
import { advance } from '../src/loop';
import { P } from '../src/config';
import { player } from '../src/state';

/** A fake keyboard event: what the key types (key) and where it sits (code). */
const keyEvent = (key: string, code?: string) => ({ key, code }) as unknown as Parameters<typeof normalize>[0];

describe('keyboard layouts (e.g. AZERTY)', () => {
  afterEach(() => setLayout({}));

  it('keys go by where they sit, so the key in the Z spot is Z on any layout', () => {
    expect(normalize(keyEvent('w', 'KeyZ'))).toBe('z');
    expect(normalize(keyEvent('a', 'KeyQ'))).toBe('q');
  });

  it('digits, space, arrows and Enter go by the physical key too', () => {
    expect(normalize(keyEvent('&', 'Digit1'))).toBe('1');
    expect(normalize(keyEvent(' ', 'Space'))).toBe(' ');
    expect(normalize(keyEvent('ArrowUp', 'ArrowUp'))).toBe('up');
    expect(normalize(keyEvent('Enter', 'NumpadEnter'))).toBe('enter');
  });

  it('without a code, the key itself is used', () => {
    expect(normalize(keyEvent('ArrowLeft'))).toBe('left');
    expect(normalize(keyEvent('X'))).toBe('x');
  });

  it('labels are QWERTY until the layout is known', () => {
    expect(keyName('z')).toBe('z');
    expect(keyName('ground-q')).toBe('ground-q');
  });

  it('then labels show what the keys type', () => {
    setLayout({ KeyZ: 'w', KeyQ: 'a', KeyW: 'z', KeyA: 'q' });
    expect(keyName('z')).toBe('ground-w');
    expect(keyName('ground-q')).toBe('A');
    expect(keyName('w')).toBe('z');
    expect(keyName('escape')).toBe('ESCAPE');
  });
});

describe('rebinding keys', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    resetBinds();
  });
  afterEach(() => {
    resetBinds();
    keysUi.open = false;
    settingsUi.open = false;
    vi.unstubAllGlobals();
  });

  it('by default every action is on its own key', () => {
    for (const a of ACTIONS) {
      expect(binds[a.id]).toBe(a.id);
      expect(actionFor(a.id)).toBe(a.id);
    }
  });

  it('a rebound key drives its action, and the old key does nothing', () => {
    bindKey('z', 'j');
    expect(actionFor('j')).toBe('z');
    expect(keyName('z')).toBe('J');
    expect(actionFor('z')).toBe('');
  });

  it('keys that are not actions pass straight through', () => {
    expect(actionFor('left')).toBe('left');
    expect(actionFor('escape')).toBe('escape');
  });

  it('taking a key another action had swaps the two', () => {
    bindKey('z', 'j');
    bindKey('c', 'j');
    expect(binds.c).toBe('j');
    expect(binds.z).toBe('c');
    expect(actionFor('c')).toBe('z');
    expect(actionFor('j')).toBe('c');
  });

  it('arrows, Enter and Esc can\'t be bound', () => {
    expect(bindKey('z', 'left')).toBe(false);
    expect(bindKey('z', 'enter')).toBe(false);
    expect(bindKey('z', 'escape')).toBe(false);
  });

  it('the layout is saved', () => {
    bindKey('c', 'j');
    expect(JSON.parse(localStorage.getItem('archer-game:keys')!).c).toBe('j');
  });

  it('a stored layout with a key used twice, or a bad key, falls back to the defaults', () => {
    expect(cleanBinds({ ...binds, q: 'z' }).z).toBe('z');
    expect(cleanBinds({ ...binds, q: 'enter' }).q).toBe('q');
  });

  it('the HUD and menus label the bound key', () => {
    bindKey('a', 'h');
    expect(keyName('a')).toBe('H');
    expect(keyName('s')).toBe('s');
  });

  describe('the keys window (settings, then KEYS)', () => {
    /** Open the keys window and pick the second row (Jump, c). */
    function pickJump(): void {
      openSettings();
      settingsUi.sel = SETTING_ROWS.indexOf('keys');
      settingsKey('enter');
      settingsKey('down');
      settingsKey('enter');
    }

    it('the KEYS row opens it', () => {
      openSettings();
      settingsUi.sel = SETTING_ROWS.indexOf('keys');
      settingsKey('enter');
      expect(keysUi.open).toBe(true);
    });

    it('Enter on an action waits for a key, and arrows do nothing meanwhile', () => {
      pickJump();
      expect(keysUi.waiting).toBe(true);
      expect(capture.fn).toBeTruthy();
      settingsKey('down');
      expect(keysUi.sel).toBe(1);
    });

    it('the next key pressed binds the action', () => {
      pickJump();
      capture.fn!('k');
      expect(binds.c).toBe('k');
      expect(keysUi.waiting).toBe(false);
      expect(capture.fn).toBeFalsy();
    });

    it('Esc while waiting cancels', () => {
      pickJump();
      capture.fn!('escape');
      expect(binds.c).toBe('c');
      expect(keysUi.waiting).toBe(false);
    });

    it('an arrow is refused, with a note', () => {
      pickJump();
      capture.fn!('left');
      expect(binds.c).toBe('c');
      expect(keysUi.note).not.toBe('');
    });

    it('RESET restores the default layout', () => {
      pickJump();
      capture.fn!('k');
      keysUi.sel = KEY_ROWS - 2;
      settingsKey('enter');
      expect(binds.c).toBe('c');
    });

    it('Esc closes it, back to the settings', () => {
      pickJump();
      capture.fn!('k');
      settingsKey('escape');
      expect(keysUi.open).toBe(false);
      expect(settingsUi.open).toBe(true);
    });
  });
});

describe('the game loop', () => {
  it('a frame can run several catch-up steps, but a tap fires once, not on each', () => {
    arena(20);
    dummy(150);
    player.cdMax.z = 0;
    setKey('z', true);
    const steps = advance({ acc: 0 }, P.STEP * 3 + 1e-6, false);
    setKey('z', false);
    expect(steps).toBe(3);
    expect(player.casting.queued).toBe(null);
    expect(player.cast).toBe('shoot');
  });

  it('a frozen world runs no steps, and drops the time', () => {
    const clock = { acc: 0.05 };
    expect(advance(clock, 0.1, true)).toBe(0);
    expect(clock.acc).toBe(0);
  });
});
