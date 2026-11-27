import { ctx } from './canvas';
import { SKILLS } from './config';
import { game, player } from './state';
import { text } from './font';
import { dev } from './dev';
import { ICON, skillIcon } from './icons';
import { branchLocked, canSpendSp, isLearned, JOBS, skillRows, spendSkill, upgradesOf } from './progress';
import type { SkillKey } from './types';

/* ============================================================
   SKILLS SCREEN
   A menu screen with a subtab per job tier (Lv.1-10, 10-30, 30-60,
   60-100), showing only the tiers your job has opened (the Sage opens
   the next; dev mode shows them all). The left side lists that tier's skills; the highlighted
   one's details (status, cost, damage, cooldown, links, description)
   show on the right. Z spends SP on it. Opened with K.
   ============================================================ */

export const skillScreen = { open: false, tab: 0, sel: 0 };

export const openSkillScreen = (): void => {
  skillScreen.open = true;
  // start on the tier you're in now
  skillScreen.tab = Math.max(0, JOBS.findIndex((j) => j.job === player.job.job));
  skillScreen.sel = 0;
};
export const closeSkillScreen = (): void => { skillScreen.open = false; };

/** The tabs you can see (indexes into JOBS): your job's tier and the ones before it (all in dev mode). */
export const visibleTabs = (): number[] => JOBS.map((_, i) => i).filter((i) => dev.on || JOBS[i].job <= player.job.job);

/** A tab's level range label: from its job's level to the next job's. */
export const tabLabel = (i: number): string => `${JOBS[i].level}-${JOBS[i + 1]?.level ?? 100}`;

/** The skills a tab lists: every skill its job grants, in table order. */
export const tabSkills = (i: number): SkillKey[] =>
  (Object.keys(SKILLS) as SkillKey[]).filter((k) => SKILLS[k].job === JOBS[i].job);

/** What a skill is to you right now, and whether one SP would learn it. */
export function skillStatus(k: SkillKey): { label: string; col: string; action: string } {
  const s = SKILLS[k], row = skillRows().find((r) => r.key === k);
  if (player.ranks[k]) return { label: 'LEARNED', col: '#9be89b', action: '' };
  if (row?.action) return { label: canSpendSp() ? 'Z: LEARN (1 SP)' : 'NEEDS 1 SP', col: '#ffd166', action: row.action };
  if (upgradesOf(k).some((u) => player.ranks[u])) return { label: 'UPGRADED', col: '#9be89b', action: '' };
  if (branchLocked(k)) return { label: 'BRANCH LOCKED', col: '#e07a7a', action: '' };
  if (s.minLevel > player.level) return { label: `AT LV.${s.minLevel}`, col: '#8ea3c2', action: '' };
  if (s.job > player.job.job) return { label: 'SEE THE SAGE', col: '#8ea3c2', action: '' };
  const needs = s.requires ?? s.upgrades;
  return { label: needs ? `NEEDS ${SKILLS[needs].name}` : 'LOCKED', col: '#8ea3c2', action: '' };
}

/** Left/Right change tier, Up/Down pick a skill, Z learns it, Esc / K / X close. */
export function skillScreenKey(k: 'up' | 'down' | 'left' | 'right' | 'enter' | 'escape'): void {
  const n = tabSkills(skillScreen.tab).length;
  if (k === 'left' || k === 'right') {
    const tabs = visibleTabs(), at = Math.max(0, tabs.indexOf(skillScreen.tab));
    skillScreen.tab = tabs[(at + (k === 'left' ? tabs.length - 1 : 1)) % tabs.length];
    skillScreen.sel = 0;
  }
  if (k === 'up' && n) skillScreen.sel = (skillScreen.sel + n - 1) % n;
  if (k === 'down' && n) skillScreen.sel = (skillScreen.sel + 1) % n;
  if (k === 'enter') { const key = tabSkills(skillScreen.tab)[skillScreen.sel]; if (key) spendSkill(key); }
  if (k === 'escape') closeSkillScreen();
}

const GOLD = '#ffd166', HI = '#eaf2ff', DIM = '#8ea3c2', FAINT = '#5d708f';
const TAB_Y = 20, LIST_TOP = 38, ROW = 14, LIST_W = 108;

/** Greedy word wrap to lines of at most n characters. */
function wrap(s: string, n: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const word of s.split(' ')) {
    if (cur && cur.length + 1 + word.length > n) { out.push(cur); cur = word; }
    else cur = cur ? `${cur} ${word}` : word;
  }
  if (cur) out.push(cur);
  return out;
}

/** The selected skill's numbers, one short line each (passives show only their bonus). */
export function statLines(k: SkillKey, cols = 99): string[] {
  const s = SKILLS[k];
  if (s.passive) return s.bonus1 ? [`BONUS +${Math.round(s.bonus1 * 100)}%`] : [];
  const lines = [`MP ${s.mp1}`];
  if (s.dmg1) lines.push(`DMG ${s.dmg1}%${s.hits1 && s.hits1 > 1 ? ` X${s.hits1}` : ''}${s.targets1 ? ` / ${s.targets1} FOES` : ''}`);
  lines.push(`USE ${(s.use ?? 0).toFixed(1)}S${s.cd ? `  CD ${s.cd}S` : ''}`);
  // each line is wrapped to the panel width so the trailing "FOES" never spills
  return lines.flatMap((l) => wrap(l, cols));
}

/** Draw the skills screen over the frozen game. */
export function drawSkillScreen(): void {
  const { w, h } = game.view;
  ctx.fillStyle = '#050a14f0'; ctx.fillRect(0, 0, w, h);
  text(ctx, 'SKILLS', 6, 5, 1, GOLD, 'left');
  text(ctx, `SP ${player.sp}`, w - 6, 5, 1, player.sp ? GOLD : DIM, 'right');
  // the tier tabs
  const tabs = visibleTabs(), tw = Math.floor((w - 12) / JOBS.length);
  tabs.forEach((i, ti) => {
    const x = 6 + ti * tw, on = i === skillScreen.tab;
    ctx.fillStyle = on ? '#16223a' : '#0d1526'; ctx.fillRect(x, TAB_Y - 3, tw - 2, 12);
    ctx.strokeStyle = on ? GOLD : '#4a5c7a'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, TAB_Y - 2.5, tw - 3, 11);
    text(ctx, `LV ${tabLabel(i)}`, x + (tw - 2) / 2, TAB_Y, 1, on ? GOLD : DIM, 'center');
  });
  // the tier's skills, left
  const keys = tabSkills(skillScreen.tab);
  keys.forEach((k, i) => {
    const y = LIST_TOP + i * ROW, sel = i === skillScreen.sel, learned = player.ranks[k];
    if (sel) { ctx.fillStyle = '#16223a'; ctx.fillRect(6, y - 3, LIST_W, ROW - 1); ctx.strokeStyle = GOLD; ctx.strokeRect(6.5, y - 2.5, LIST_W - 1, ROW - 2); }
    ctx.drawImage(skillIcon(k), 8, y - 2);
    text(ctx, SKILLS[k].name.toUpperCase(), 21, y, 1, sel ? GOLD : learned ? HI : DIM, 'left');
  });
  if (!keys.length) text(ctx, 'NO SKILLS', 8, LIST_TOP, 1, FAINT, 'left');
  // the highlighted skill's details, right
  const k = keys[skillScreen.sel];
  const dx = 6 + LIST_W + 6, cols = Math.floor((w - dx - 6) / 6);
  ctx.strokeStyle = '#4a5c7a'; ctx.strokeRect(dx - 3.5, LIST_TOP - 3.5, w - dx - 2, h - LIST_TOP - 12);
  if (k) {
    const s = SKILLS[k], st = skillStatus(k);
    let y = LIST_TOP;
    const line = (str: string, col: string): void => { text(ctx, str.toUpperCase(), dx, y, 1, col, 'left'); y += 9; };
    ctx.drawImage(skillIcon(k), dx, y - 2);
    text(ctx, s.name.toUpperCase(), dx + ICON + 3, y, 1, GOLD, 'left');
    y += 13;
    line(`${s.tag}  LV.${s.minLevel}`, DIM);
    for (const l of wrap(st.label, cols)) line(l, st.col);
    y += 2;
    for (const l of statLines(k, cols)) line(l, HI);
    y += 2;
    for (const l of wrap(s.desc.replace(/[^A-Za-z0-9 .\/:+%,-]/g, ' ').replace(/ +/g, ' ').trim(), cols).slice(0, 4)) line(l, DIM);
    // what it links into, as icons
    const links = s.linksInto ?? [];
    if (links.length) {
      y += 2;
      text(ctx, 'LINKS', dx, y + 1, 1, FAINT, 'left');
      // the icons sit to the right of the label, wrapping to rows that stay
      // inside the panel's right border
      const ix = dx + 34, perRow = Math.max(1, Math.floor((w - 6 - ix) / (ICON + 1)));
      links.forEach((t, i) => {
        const x = ix + (i % perRow) * (ICON + 1), ry = y - 1 + Math.floor(i / perRow) * (ICON + 2);
        ctx.globalAlpha = isLearned(t) ? 1 : 0.4; // dimmed = not yet acquired
        ctx.drawImage(skillIcon(t), x, ry);
        ctx.globalAlpha = 1;
      });
    }
  }
  text(ctx, 'LEFT/RIGHT TIER  Z LEARN  K ESC CLOSE', w / 2, h - 8, 1, FAINT, 'center');
}
