import { arena, check, setKey, step, editableSkills, linkTargets, resetSkill, skillEditor, skillEditorInput, openSkillEditor } from './harness';
import { SKILLS } from '../src/config';
import { P } from '../src/config';

// The dev skill editor (?dev, T): Up/Down pick a skill, Enter selects it (the
// cursor jumps to USE); Up/Down walk USE / DELAY / LINKS INTO, Left/Right
// tune, Enter/Space toggle a link. Esc goes back, R resets the whole kit.
const press = (k: string): void => { setKey(k, true); skillEditorInput(P.STEP); setKey(k, false); };
{
  arena(1);
  openSkillEditor();
  const n = editableSkills().length, m = linkTargets().length;
  skillEditor.sel = 0; skillEditor.field = 0;

  press('down');
  check('up/down on the list highlight a skill', skillEditor.sel === 1 && skillEditor.field === 0, `${skillEditor.sel}`);
  press('enter');
  check('enter selects it: the cursor moves to USE', skillEditor.field === 1 && skillEditor.sel === 1, `${skillEditor.field}`);
  const k = editableSkills()[1];
  const use0 = SKILLS[k].use ?? P.USE_TIME;
  press('right');
  check('left/right on USE adjust it', (SKILLS[k].use ?? P.USE_TIME) === Math.round((use0 + 0.1) * 10) / 10, `${SKILLS[k].use}`);
  press('down');
  check('down moves to DELAY (the bug: it used to be stuck)', skillEditor.field === 2, `${skillEditor.field}`);
  SKILLS[k].delay = 0; press('left');
  check('a delay of 0.0 is the floor', SKILLS[k].delay === 0, `${SKILLS[k].delay}`);
  press('down');
  check('down again reaches LINKS INTO', skillEditor.field === 3 && skillEditor.linkSel === 0);
  const t = linkTargets()[1], had = (SKILLS[k].linksInto ?? []).includes(t);
  press('down'); press(' ');
  check('down walks the links; space toggles one', skillEditor.linkSel === 1 && (SKILLS[k].linksInto ?? []).includes(t) !== had);
  press('enter');
  check('...and enter toggles it back', (SKILLS[k].linksInto ?? []).includes(t) === had);
  press('up'); press('up');
  check('up off the top of the links goes back to DELAY', skillEditor.field === 2, `${skillEditor.field}`);
  press('escape');
  check('esc goes back to the skill list, still open', skillEditor.field === 0 && skillEditor.open);

  const a = editableSkills()[0], b = editableSkills()[1];
  SKILLS[a].use = 1.5; SKILLS[b].delay = 2.5;
  resetSkill();
  check('r resets every skill, not just the selected one', SKILLS[a].use !== 1.5 && SKILLS[b].delay !== 2.5);
  press('t');
  check('the editor closes on t', !skillEditor.open);
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
  press('c');
  const parsed = JSON.parse(copied) as Record<string, { use: number }>;
  check('C copies the whole kit as JSON, including the tuned use time',
    copied.startsWith('{') && parsed[editableSkills()[0]].use === 0.3, copied.slice(0, 40));
  (globalThis as unknown as { navigator: { clipboard?: unknown } }).navigator.clipboard = undefined;
  resetSkill(); press('t');
}
