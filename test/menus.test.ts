import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { arena, step } from './helpers';
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
