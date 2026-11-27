import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arena, memoryStorage, release, step, tap } from './helpers';
import { activate, autoChannel, disabled, channelChoices, initMenu, items, menu, menuKey, MENU_ROW, MENU_TOP, MENU_W, MENU_X, menuTap, menuText } from '../src/menu';
import { net } from '../src/net';
import { clearSave, hasSave, save } from '../src/save';
import { fmtNum } from '../src/util';
import { P, SKILLS } from '../src/config';
import { clearPressed, REPEAT_DELAY, REPEAT_RATE, setKey } from '../src/input';
import { textWidth } from '../src/font';
import { tick } from '../src/loop';
import { expBar, isLearned, JOBS, MAX_LEVEL } from '../src/progress';
import {
  cleanSettings, DEFAULT_SETTINGS, openSettings, SET_ROW, SET_TOP, SET_W, settings, settingsBox, settingsKey,
  settingsTap, settingsUi, SETTING_ROWS, VOLUME_MAX,
} from '../src/settings';
import { closeSkillScreen, openSkillScreen, skillScreen, skillStatus, statLines, tabLabel, tabSkills } from '../src/skillscreen';
import { bannerMsg, game, player } from '../src/state';
import type { SkillKey } from '../src/types';
import { START } from '../src/world';
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

describe('Esc menu key repeat', () => {
  beforeEach(() => {
    arena(30);
    game.pause = { col: 0, row: 0 };
  });
  afterEach(() => {
    release();
    game.pause = null;
  });

  it('holding Down keeps moving the selection, and letting go stops it', () => {
    setKey('down', true);
    const frames = Math.ceil((REPEAT_DELAY + 4 * REPEAT_RATE) / P.STEP) + 1;
    let moves = 0;
    for (let i = 0; i < frames; i++) {
      const row = game.pause!.row;
      tick();
      if (game.pause!.row !== row) moves++;
    }
    expect(moves).toBeGreaterThanOrEqual(3);

    setKey('down', false);
    const row = game.pause!.row;
    step(5);
    expect(game.pause!.row).toBe(row);
  });
});

describe('main menu when playing alone (offline)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    net.offline = 'NEEDS HTTPS';
    initMenu(() => {}, START);
  });
  afterEach(() => {
    net.offline = '';
    menu.open = false;
    vi.unstubAllGlobals();
  });

  it('the private code rows are skipped', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      menuKey('down');
      seen.add(items()[menu.sel]);
    }
    expect(seen.has('name')).toBe(true);
    expect(seen.has('code')).toBe(false);
    expect(seen.has('create')).toBe(false);
    expect(disabled('code')).toBe(true);
  });

  it('tapping the code row does nothing', () => {
    menuTap(MENU_X + 5, MENU_TOP + items().indexOf('code') * MENU_ROW + 2);
    expect(items()[menu.sel]).not.toBe('code');
    expect(menu.edit).toBe(null);
  });

  it('once back online, the code rows are back', () => {
    net.offline = '';
    expect(disabled('code')).toBe(false);
    expect(disabled('create')).toBe(false);
  });
});

describe('text fields', () => {
  it('the caret blinks between glyphs of the same width, so the text never shifts', () => {
    expect(textWidth('AB_')).toBe(textWidth('AB '));
  });
});

describe('skills screen', () => {
  afterEach(() => {
    if (skillScreen.open) closeSkillScreen();
    release();
  });

  function press(key: string): void {
    setKey(key, true);
    step(1);
    setKey(key, false);
    step(1);
  }

  it('K opens it on your job tier', () => {
    arena(10);
    player.job = JOBS[1];
    press('k');
    expect(skillScreen.open).toBe(true);
    expect(skillScreen.tab).toBe(1);
  });

  it('tabs are labelled by level, and every skill sits in exactly one', () => {
    expect(tabLabel(0)).toBe('1-10');
    expect(tabLabel(3)).toBe('60-100');
    const all = JOBS.flatMap((_, i) => tabSkills(i));
    expect(all.length).toBe(Object.keys(SKILLS).length);
    expect(new Set(all).size).toBe(all.length);
  });

  it('Z on a learnable skill spends the SP and learns it; Esc closes the screen', () => {
    arena(10);
    player.job = JOBS[1];
    player.sp = 1;
    player.ranks['ground-q'] = false;
    press('k');
    skillScreen.sel = tabSkills(1).indexOf('ground-q');
    press('z');
    expect(player.ranks['ground-q']).toBe(true);
    expect(player.sp).toBe(0);
    expect(skillStatus('ground-q').label).toBe('LEARNED');

    press('escape');
    expect(skillScreen.open).toBe(false);
    expect(game.pause).toBeFalsy();
  });

  it('a multi-target skill\'s stat lines fit the panel, and still give the target count', () => {
    openSkillScreen();
    const columns = Math.floor((game.view.w - (6 + 108 + 6) - 6) / 6); // the panel's width in characters
    const wide = (Object.keys(SKILLS) as SkillKey[]).find((k) => SKILLS[k].targets1 && SKILLS[k].targets1 > 6)!;
    expect(wide).toBeTruthy();
    const lines = statLines(wide, columns);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(columns);
    expect(lines.some((l) => l.includes('FOES'))).toBe(true);
  });

  it('the link list tells learned skills from unlearned ones', () => {
    arena(1);
    player.ranks.z = true;
    expect(isLearned('z')).toBe(true);
    player.ranks.z = false;
    expect(isLearned('z')).toBe(false);
  });
});

describe('settings', () => {
  let stored: Storage;
  beforeEach(() => {
    stored = memoryStorage();
    vi.stubGlobal('localStorage', stored);
    Object.assign(settings, DEFAULT_SETTINGS);
  });
  afterEach(() => {
    Object.assign(settings, DEFAULT_SETTINGS);
    settingsUi.open = false;
    menu.open = false;
    game.pause = null;
    vi.unstubAllGlobals();
  });

  it('bad stored settings fall back to the defaults', () => {
    expect(cleanSettings({ sound: 'x', dmgNums: 3 })).toEqual(DEFAULT_SETTINGS);
  });

  it('a stored volume is clamped', () => {
    expect(cleanSettings({ sound: 99 }).sound).toBe(VOLUME_MAX);
    expect(cleanSettings({ sound: -4 }).sound).toBe(0);
  });

  it('Left turns the sound down, and saves it', () => {
    openSettings();
    const before = settings.sound;
    settingsKey('left');
    expect(settings.sound).toBe(before - 1);
    expect(JSON.parse(stored.getItem('archer-game:settings')!).sound).toBe(before - 1);
  });

  it('damage numbers can be turned off', () => {
    openSettings();
    settingsKey('down');
    settingsKey('left');
    expect(settings.dmgNums).toBe(false);
  });

  it('a tap on a row changes it, and tapping DONE closes the window', () => {
    openSettings();
    settings.dmgNums = false;
    const box = settingsBox(320, 180);
    settingsTap(box.x + SET_W - 10, box.y + SET_TOP + SET_ROW + 2, 320, 180);
    expect(settings.dmgNums).toBe(true);
    expect(settingsUi.sel).toBe(1);
    settingsTap(box.x + 10, box.y + SET_TOP + (SETTING_ROWS.length - 1) * SET_ROW + 2, 320, 180);
    expect(settingsUi.open).toBe(false);
  });

  it('the main menu opens them, and Esc goes back to the menu', () => {
    initMenu(() => {}, START);
    menu.sel = items().indexOf('settings');
    menuKey('enter');
    expect(settingsUi.open).toBe(true);
    menuKey('escape');
    expect(settingsUi.open).toBe(false);
    expect(menu.open).toBe(true);
  });

  it('in the Esc menu, Right twice reaches SETTINGS, and Z opens them over the paused game', () => {
    arena();
    tap('escape');
    tap('right');
    tap('right');
    expect(game.pause?.col).toBe(2);
    tap('z');
    expect(settingsUi.open).toBe(true);
    expect(game.pause).toBeTruthy();
  });

  it('Esc closes them but the game stays paused; a second Esc resumes', () => {
    arena();
    tap('escape');
    tap('right');
    tap('right');
    tap('z');
    const time = game.time;
    tap('down');
    tap('escape');
    expect(settingsUi.open).toBe(false);
    expect(game.pause).toBeTruthy();
    expect(game.time).toBe(time);
    tap('escape');
    expect(game.pause).toBeFalsy();
  });
});

describe('the big on-screen banner', () => {
  beforeEach(() => {
    arena();
    bannerMsg('THE SAGE', 'RETURN TO ME AT LV.10');
  });

  it('is still up halfway through, and clears once its time is up', () => {
    step(Math.floor(P.BANNER_T / 2 / P.STEP));
    expect(game.banner).not.toBe(null);
    step(Math.ceil(P.BANNER_T / 2 / P.STEP));
    expect(game.banner).toBe(null);
  });
});

describe('the EXP bar', () => {
  beforeEach(() => {
    arena(20);
    player.level = 99;
    player.expNext = 1000;
  });

  it('below max level it shows a percentage', () => {
    player.exp = 500;
    expect(expBar().text).toBe('50.0%');
  });

  it('rounded down, so it never reads 100% short of the level', () => {
    player.exp = 999;
    expect(expBar().text).toBe('99.9%');
  });

  it('at max level it reads LV.100, and stays full', () => {
    player.level = MAX_LEVEL;
    expect(expBar().text).toBe(`LV.${MAX_LEVEL}`);
    expect(expBar().pct).toBe(1);
  });
});
