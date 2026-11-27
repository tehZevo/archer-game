import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arena, memoryStorage, step } from './helpers';
import { activate, autoChannel, channelChoices, initMenu, items, menu, menuKey, MENU_ROW, MENU_TOP, MENU_W, MENU_X, menuTap, menuText } from '../src/menu';
import { net } from '../src/net';
import { clearSave, hasSave, save } from '../src/save';
import { fmtNum } from '../src/util';
import { P, SKILLS } from '../src/config';
import { clearPressed, setKey } from '../src/input';
import { editableSkills, linkTargets, openSkillEditor, resetSkill, skillEditor, skillEditorInput } from '../src/skilleditor';

// The dev skill editor (?dev, then T). The left pane lists skills; Enter picks
// one and moves the cursor to its fields on the right: USE, DELAY and LINKS
// INTO. Up/Down move, Left/Right tune, Enter/Space toggle a link, Esc goes
// back to the list, R resets every skill, C copies the kit, T closes.
describe('skill editor', () => {
  /** Press a key for one editor update (clearing it after, as each game frame does). */
  const press = (key: string): void => {
    setKey(key, true);
    skillEditorInput(P.STEP);
    setKey(key, false);
    clearPressed();
  };

  beforeEach(() => {
    arena(1);
    openSkillEditor();
    skillEditor.sel = 0;
    skillEditor.field = 0;
  });

  afterEach(() => {
    resetSkill();
    if (skillEditor.open) press('t');
  });

  it('up/down highlight a skill, and enter selects it with the cursor on USE', () => {
    press('down');
    expect(skillEditor.sel).toBe(1);
    expect(skillEditor.field).toBe(0);

    press('enter');
    expect(skillEditor.sel).toBe(1);
    expect(skillEditor.field).toBe(1);
  });

  it('left/right tune USE and DELAY, and DELAY stops at 0', () => {
    const key = editableSkills()[1];
    const use = SKILLS[key].use ?? P.USE_TIME;
    press('down');
    press('enter');

    press('right');
    expect(SKILLS[key].use).toBe(Math.round((use + 0.1) * 10) / 10);

    press('down');
    expect(skillEditor.field).toBe(2); // DELAY
    SKILLS[key].delay = 0;
    press('left');
    expect(SKILLS[key].delay).toBe(0);
  });

  it('LINKS INTO: down walks the links, space or enter toggles one, up off the top goes back to DELAY', () => {
    const key = editableSkills()[1];
    const target = linkTargets()[1];
    const linked = (): boolean => (SKILLS[key].linksInto ?? []).includes(target);
    const before = linked();
    press('down');
    press('enter');
    press('down');
    press('down');
    expect(skillEditor.field).toBe(3); // LINKS INTO
    expect(skillEditor.linkSel).toBe(0);

    press('down');
    press(' ');
    expect(skillEditor.linkSel).toBe(1);
    expect(linked()).toBe(!before);
    press('enter');
    expect(linked()).toBe(before);

    press('up');
    press('up');
    expect(skillEditor.field).toBe(2);
  });

  it('esc goes back to the list and keeps the editor open; t closes it', () => {
    press('enter');
    press('escape');
    expect(skillEditor.field).toBe(0);
    expect(skillEditor.open).toBe(true);

    press('t');
    expect(skillEditor.open).toBe(false);
  });

  it('r resets every skill, not just the selected one', () => {
    const [a, b] = editableSkills();
    SKILLS[a].use = 1.5;
    SKILLS[b].delay = 2.5;
    resetSkill();
    expect(SKILLS[a].use).not.toBe(1.5);
    expect(SKILLS[b].delay).not.toBe(2.5);
  });

  it('lists the whole kit, and a fresh arena keeps its skills', () => {
    expect(editableSkills().length).toBeGreaterThan(10);
    expect(linkTargets().length).toBeGreaterThan(10);
    press('t');
    arena(1);
    step(1);
    expect(SKILLS.z.use).toBeDefined();
  });

  it('c copies the whole kit as JSON, including a tuned use time', () => {
    let copied = '';
    const nav = globalThis.navigator as unknown as { clipboard?: { writeText: (s: string) => void } };
    nav.clipboard = { writeText: (s) => { copied = s; } };
    skillEditor.field = 1;
    SKILLS[editableSkills()[0]].use = 0.3;

    press('c');
    nav.clipboard = undefined;

    const kit = JSON.parse(copied) as Record<string, { use: number }>;
    expect(kit[editableSkills()[0]].use).toBe(0.3);
  });
});

describe('main menu', () => {
  let started = 0;
  function openMenu(): void {
    initMenu(() => { started++; }, { path: 'shore', floor: 2 });
  }
  function select(row: string): void {
    menu.sel = items().indexOf(row as never);
  }
  const rowY = (row: string): number => MENU_TOP + items().indexOf(row as never) * MENU_ROW + 3;

  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    clearSave();
    started = 0;
    openMenu();
  });
  afterEach(() => {
    menu.open = false;
    net.code = '';
    net.channel = 1;
    vi.unstubAllGlobals();
  });

  it('lists play, channel, code, new code, name, look, settings and awards (no reset without a save)', () => {
    expect(items()).toEqual(['play', 'channel', 'code', 'create', 'name', 'look', 'settings', 'awards']);
  });

  it('the selection wraps around', () => {
    menuKey('up');
    expect(items()[menu.sel]).toBe('awards');
  });

  describe('channels', () => {
    it('auto picks the busiest channel with room', () => {
      expect(autoChannel(new Map([[1, 20], [2, 5], [3, 7]]))).toBe(3);
    });

    it('auto falls back to channel 1 when nobody is around', () => {
      expect(autoChannel(new Map())).toBe(1);
    });

    it('the list offers auto (0), channels 1-3, and one past the busiest', () => {
      expect(channelChoices(new Map([[5, 2]]))).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });

    it('Left/Right on the channel row picks a channel, and Enter joins it', () => {
      menuKey('down');
      menuKey('right');
      menuKey('right');
      expect(menu.channel).toBe(2);
      menuKey('enter');
      expect(started).toBe(1);
      expect(menu.open).toBe(false);
      expect(net.channel).toBe(2);
      expect(net.code).toBe('');
    });
  });

  describe('private codes', () => {
    it('Enter on the code row starts typing', () => {
      select('code');
      menuKey('enter');
      expect(menu.edit).toBe('code');
    });

    it('a short code is refused with a note', () => {
      select('code');
      menuKey('enter');
      menuText('ab1c');
      menuKey('enter');
      expect(menu.open).toBe(true);
      expect(menu.note).not.toBe('');
      expect(menu.edit).toBe('code');
    });

    it('the field keeps 5 letters, upper-cased, and a full code joins that instance', () => {
      select('code');
      menuKey('enter');
      menuText('abcdez');
      expect(menu.code).toBe('ABCDE');
      menuKey('enter');
      expect(menu.open).toBe(false);
      expect(net.code).toBe('ABCDE');
      expect(started).toBe(1);
    });

    it('new code fills in the code row and jumps to it', () => {
      select('create');
      activate();
      expect(menu.code.length).toBe(5);
      expect(items()[menu.sel]).toBe('code');
    });
  });

  it('renaming saves a cleaned-up name', () => {
    select('name');
    activate();
    menuText('robin hood!');
    menuKey('enter');
    expect(menu.name).toBe('ROBINHOOD');
    expect(localStorage.getItem('archer-game:name')).toBe('ROBINHOOD');
  });

  describe('tapping', () => {
    it('a first tap selects a row without using it', () => {
      menuTap(MENU_X + MENU_W / 2, rowY('channel'));
      expect(items()[menu.sel]).toBe('channel');
      expect(menu.open).toBe(true);
    });

    it('tapping the right end of the channel row steps the channel', () => {
      menuTap(MENU_X + MENU_W / 2, rowY('channel'));
      menuTap(MENU_X + MENU_W - 4, rowY('channel'));
      expect(menu.channel).toBe(1);
    });

    it('a tap on a text row starts typing', () => {
      menuTap(MENU_X + 4, rowY('name'));
      expect(menu.edit).toBe('name');
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      save();
      openMenu();
    });

    it('shows once there is a save', () => {
      expect(items()).toContain('reset');
    });

    it('asks to confirm first, and moving away cancels it', () => {
      select('reset');
      activate();
      expect(menu.confirmReset).toBe(true);
      expect(hasSave()).toBe(true);
      menuKey('up');
      expect(menu.confirmReset).toBe(false);
    });
  });
});

describe('HUD numbers', () => {
  it('are plain below 1000, then shortened to K and M', () => {
    expect([999, 1000, 1299, 12345, 1234567].map(fmtNum)).toEqual(['999', '1K', '1.2K', '12.3K', '1.2M']);
  });
});
