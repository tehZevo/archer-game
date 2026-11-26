import { ctx } from './canvas';
import { P, SKILLS } from './config';
import { game } from './state';
import { pressed, repeated } from './input';
import { text } from './font';
import type { SkillKey } from './types';

/* ============================================================
   SKILL TIMING & LINK EDITOR  (?dev, T key)
   A dev-mode panel over the live SKILLS table: pick a skill,
   tune its use / recovery (delay) times in 0.1s steps, and
   toggle which skills it links into. C copies the whole tuned
   kit to the clipboard as JSON. Edits apply live (the game
   reads SKILLS on every cast), so you feel a change immediately.
   ============================================================ */

/** The castable skills (the ones with a use time) — the kit you tune.
 *  Passives have no use/delay, so they are not listed. */
export const editableSkills = (): SkillKey[] =>
  (Object.keys(SKILLS) as SkillKey[]).filter((k) => SKILLS[k].use !== undefined);

/** The skills any skill can link into (the same castable kit). */
export const linkTargets = (): SkillKey[] => editableSkills();

export const skillEditor = {
  open: false,
  sel: 0, // selected skill (index into editableSkills)
  field: 0, // 0 = use, 1 = delay, 2 = links into
  linkSel: 0, // selected link target (index into linkTargets)
};

export const openSkillEditor = (): void => { skillEditor.open = true; };
export const closeSkillEditor = (): void => { skillEditor.open = false; };

/** Bump a time by one 0.1s step, never below a hair. */
const step = (v: number, dir: number): number => Math.max(0.1, Math.round((v + dir * 0.1) * 10) / 10);

/** The use / delay a skill runs on today (its own value, else the global default). */
const useOf = (k: SkillKey): number => SKILLS[k].use ?? P.USE_TIME;
const delayOf = (k: SkillKey): number => SKILLS[k].delay ?? P.DELAY_TIME;

/** Serialize the tuned kit (name, use, delay, linksInto) as JSON for the clipboard. */
export const skillEditorJson = (): string => {
  const out: Record<string, unknown> = {};
  for (const k of editableSkills()) {
    out[k] = {
      name: SKILLS[k].name,
      use: useOf(k),
      delay: delayOf(k),
      linksInto: [...(SKILLS[k].linksInto ?? [])],
    };
  }
  return JSON.stringify(out, null, 2);
};

/** Up/Down pick a skill (or a link target), Left/Right tune the active field,
 *  Tab switches the field, Z toggles a link, C copies the kit, T/Esc closes. */
export function skillEditorInput(dt: number): void {
  const e = skillEditor;
  const skills = editableSkills();
  if (e.sel >= skills.length) e.sel = skills.length - 1;
  const cur = skills[e.sel];

  if (pressed('escape') || pressed('t')) { closeSkillEditor(); return; }
  if (pressed('c')) { navigator.clipboard?.writeText(skillEditorJson()); return; }
  if (pressed('tab')) { e.field = (e.field + 1) % 3; return; }

  if (e.field < 2) {
    if (repeated('up', dt)) e.sel = (e.sel + skills.length - 1) % skills.length;
    if (repeated('down', dt)) e.sel = (e.sel + 1) % skills.length;
    if (pressed('left') || pressed('right')) {
      const dir = pressed('left') ? -1 : 1;
      if (e.field === 0) SKILLS[cur].use = step(useOf(cur), dir);
      else SKILLS[cur].delay = step(delayOf(cur), dir);
    }
  } else {
    const targets = linkTargets();
    if (e.linkSel >= targets.length) e.linkSel = targets.length - 1;
    if (repeated('up', dt)) e.linkSel = (e.linkSel + targets.length - 1) % targets.length;
    if (repeated('down', dt)) e.linkSel = (e.linkSel + 1) % targets.length;
    if (pressed('z') || pressed('enter')) {
      const t = targets[e.linkSel];
      const list = SKILLS[cur].linksInto ?? (SKILLS[cur].linksInto = []);
      const i = list.indexOf(t);
      if (i >= 0) list.splice(i, 1);
      else if (t !== cur) list.push(t); // a skill never links into itself
    }
  }
}

/** Draw the editor over the frozen game: the skill list on the left, the
 *  selected skill's tunable fields (and its link list) on the right. */
export function drawSkillEditor(): void {
  const { w, h } = game.view;
  const skills = editableSkills();
  const cur = skills[skillEditor.sel];
  const gold = '#ffd166', dim = '#8ea3c2', white = '#eaf2ff';
  ctx.fillStyle = '#050a14e6'; ctx.fillRect(0, 0, w, h);
  text(ctx, 'SKILL EDITOR', w / 2, 6, 2, gold, 'center');

  // left: the list of castable skills, scrolled to keep the selection in view
  const rowH = 11, top = Math.max(0, Math.min(skillEditor.sel - 8, skills.length - Math.floor((h - 40) / rowH)));
  skills.slice(top, top + Math.floor((h - 40) / rowH)).forEach((k, i) => {
    const idx = top + i, y = 26 + i * rowH, on = idx === skillEditor.sel;
    if (on) { ctx.fillStyle = '#16223a'; ctx.fillRect(4, y - 3, w / 2 - 8, rowH - 1); }
    text(ctx, SKILLS[k].name, 8, y, 1, on ? gold : dim, 'left');
  });

  // right: the selected skill's editable fields
  const rx = w / 2 + 8;
  let y = 26;
  text(ctx, SKILLS[cur].name.toUpperCase(), rx, y, 1, white, 'left'); y += 16;
  ([['USE', useOf(cur)], ['DELAY', delayOf(cur)]] as [string, number][]).forEach(([label, v], i) => {
    const on = skillEditor.field === i;
    text(ctx, label, rx, y, 1, on ? gold : dim, 'left');
    text(ctx, v.toFixed(1), rx + 60, y, 1, on ? white : dim, 'left');
    if (on) { ctx.strokeStyle = gold; ctx.lineWidth = 1; ctx.strokeRect(rx - 2.5, y - 3.5, 110, 11); }
    y += 14;
  });

  // ...and the skills it links into (toggled in the LINKS field)
  const links = SKILLS[cur].linksInto ?? [];
  text(ctx, 'LINKS INTO', rx, y, 1, skillEditor.field === 2 ? gold : dim, 'left'); y += 12;
  const targets = linkTargets();
  const tvis = Math.min(targets.length, Math.floor((h - y - 16) / 10));
  const ttop = Math.max(0, Math.min(skillEditor.linkSel - (tvis >> 1), targets.length - tvis));
  targets.slice(ttop, ttop + tvis).forEach((t, i) => {
    const idx = ttop + i, ty = y + i * 10, on = skillEditor.field === 2 && idx === skillEditor.linkSel;
    const has = links.includes(t);
    if (on) { ctx.fillStyle = '#16223a'; ctx.fillRect(rx - 2, ty - 3, w - rx - 4, 10); }
    text(ctx, `${has ? '[x]' : '[ ]'} ${SKILLS[t].name}`, rx, ty, 1, on ? gold : has ? white : dim, 'left');
  });

  text(ctx, 'UP/DOWN PICK  LEFT/RIGHT TUNE  TAB FIELD  Z TOGGLE  C COPY JSON  T ESC CLOSE',
    w / 2, h - 8, 1, '#5d708f', 'center');
}
