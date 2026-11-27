import { arena, check, setKey, step, tap, editableSkills, linkTargets, resetSkill, skillEditor, skillEditorInput, openSkillEditor } from './harness';
import { SKILLS } from '../src/config';
import { P } from '../src/config';

// The dev skill editor (?dev, T): arrows pick a field, Enter edits, arrows
// tune, Enter sets. R resets the whole kit.
{
  arena(1);
  openSkillEditor();
  const n = editableSkills().length, m = linkTargets().length;
  skillEditor.sel = 0; skillEditor.field = 0; skillEditor.editing = false;

  check('the arrows walk the four fields, not just two', (() => {
    for (let i = 0; i < 4; i++) { setKey('right', true); skillEditorInput(P.STEP); setKey('right', false); }
    return skillEditor.field === 0;
  })(), `${skillEditor.field}`);

  check('up/down pick the skill while on the skill field', (() => {
    skillEditor.field = 0; skillEditor.sel = 0;
    setKey('down', true); skillEditorInput(P.STEP); setKey('down', false);
    return skillEditor.sel === 1;
  })(), `${skillEditor.sel}`);

  check('tab also steps the field', (() => {
    skillEditor.field = 0; setKey('tab', true); skillEditorInput(P.STEP); setKey('tab', false);
    return skillEditor.field === 1;
  })(), `${skillEditor.field}`);

  const k = editableSkills()[skillEditor.sel];
  const start = SKILLS[k].use ?? P.USE_TIME;
  check('enter starts modifying, and the arrows tune the value', (() => {
    skillEditor.field = 1;
    setKey('enter', true); skillEditorInput(P.STEP); setKey('enter', false);
    if (!skillEditor.editing) return false;
    setKey('right', true); skillEditorInput(P.STEP); setKey('right', false);
    return (SKILLS[k].use ?? P.USE_TIME) === Math.round((start + 0.1) * 10) / 10;
  })(), `${SKILLS[k].use}`);

  check('enter again sets it and leaves the field', (() => {
    setKey('enter', true); skillEditorInput(P.STEP); setKey('enter', false);
    return !skillEditor.editing;
  })(), `${skillEditor.editing}`);

  check('a tuned value survives leaving the field', (() => {
    skillEditor.field = 2;
    return (SKILLS[k].use ?? P.USE_TIME) === Math.round((start + 0.1) * 10) / 10;
  })(), `${SKILLS[k].use}`);

  check('a use / delay of 0.0 is allowed', (() => {
    skillEditor.field = 2; skillEditor.editing = true;
    SKILLS[k].delay = 0;
    setKey('left', true); skillEditorInput(P.STEP); setKey('left', false);
    return SKILLS[k].delay === 0;
  })(), `${SKILLS[k].delay}`);

  check('the links field toggles with z', (() => {
    skillEditor.field = 3; skillEditor.linkSel = 0;
    const t = linkTargets()[0], had = (SKILLS[k].linksInto ?? []).includes(t);
    setKey('z', true); skillEditorInput(P.STEP); setKey('z', false);
    return (SKILLS[k].linksInto ?? []).includes(t) !== had;
  })(), `${SKILLS[k].linksInto}`);

  check('r resets every skill, not just the selected one', (() => {
    const a = editableSkills()[0], b = editableSkills()[1];
    SKILLS[a].use = 1.5; SKILLS[b].delay = 2.5;
    resetSkill();
    return SKILLS[a].use !== 1.5 && SKILLS[b].delay !== 2.5;
  })(), `${SKILLS[editableSkills()[0]].use}`);

  check('the editor closes on t', (() => {
    setKey('t', true); skillEditorInput(P.STEP); setKey('t', false);
    return !skillEditor.open;
  })(), `${skillEditor.open}`);

  check('the kit is the same size as before', n > 10 && m > 10, `${n} ${m}`);
  arena(1);
  step(1);
  check('a fresh arena still has its skills', SKILLS.z.use !== undefined);
}

// --- C copies the tuned kit as JSON (the clipboard call must actually fire) ---
{
  arena(1);
  openSkillEditor();
  let copied = '';
  (globalThis as unknown as { navigator: { clipboard: { writeText: (s: string) => void } } }).navigator.clipboard = { writeText: (s: string) => { copied = s; } };
  skillEditor.sel = 0; skillEditor.field = 1;
  SKILLS[editableSkills()[0]].use = 0.3;
  setKey('c', true); skillEditorInput(P.STEP); setKey('c', false);
  const parsed = JSON.parse(copied) as Record<string, { use: number }>;
  check('C copies the whole kit as JSON, including the tuned use time',
    copied.startsWith('{') && parsed[editableSkills()[0]].use === 0.3, copied.slice(0, 40));
  (globalThis as unknown as { navigator: { clipboard?: unknown } }).navigator.clipboard = undefined;
}
