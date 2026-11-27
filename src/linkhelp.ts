import { ctx } from './canvas';
import { SKILLS } from './config';
import type { SkillKey } from './types';
import { game } from './state';
import { text } from './font';
import { ICON, skillIcon } from './icons';

/* ============================================================
   LINK SKILL HELP
   A menu screen that lists every keyed skill and, beside it, the
   skills it links into (SKILLS[k].linksInto) — each shown by its
   icon, so you can read a combo chain at a glance. Opened with H.
   ============================================================ */

export const linkHelp = { open: false, sel: 0 };

export const openLinkHelp = (): void => { linkHelp.open = true; linkHelp.sel = 0; };
export const closeLinkHelp = (): void => { linkHelp.open = false; };

/** The skills that can start a link (they have a linksInto list) — every skill
 *  with links, not just the keyed ones, so the air forms and upgrades show too. */
const linkable = () =>
  (Object.keys(SKILLS) as SkillKey[]).filter((k) => (SKILLS[k].linksInto?.length ?? 0) > 0);

/** Up/Down scroll the list, Esc / H / Z close. */
export function linkHelpKey(k: 'up' | 'down' | 'escape'): void {
  const n = linkable().length;
  if (k === 'up') linkHelp.sel = (linkHelp.sel + n - 1) % n;
  if (k === 'down') linkHelp.sel = (linkHelp.sel + 1) % n;
  if (k === 'escape') closeLinkHelp();
}

const ROW = 14, TOP = 30;

/** Draw the help panel over the frozen game. */
export function drawLinkHelp(): void {
  const { w, h } = game.view;
  const rows = linkable();
  const gold = '#ffd166', dim = '#8ea3c2';
  ctx.fillStyle = '#050a14e6'; ctx.fillRect(0, 0, w, h);
  text(ctx, 'SKILL LINKS', w / 2, 8, 2, gold, 'center');
  text(ctx, 'UP/DOWN SCROLL  H ESC CLOSE', w / 2, h - 8, 1, '#5d708f', 'center');
  const vis = Math.floor((h - TOP - 14) / ROW);
  const top = Math.max(0, Math.min(linkHelp.sel - Math.floor(vis / 2), rows.length - vis));
  rows.slice(top, top + vis).forEach((k, vi) => {
    const y = TOP + vi * ROW, sel = top + vi === linkHelp.sel;
    if (sel) { ctx.fillStyle = '#16223a'; ctx.fillRect(6, y - 4, w - 12, ROW - 1); ctx.strokeStyle = gold; ctx.lineWidth = 1; ctx.strokeRect(6.5, y - 3.5, w - 13, ROW - 2); }
    // the skill: its icon and name on the left
    ctx.drawImage(skillIcon(k), 8, y - 4);
    text(ctx, SKILLS[k].name.toUpperCase(), 21, y, 1, sel ? gold : dim, 'left');
    // ...and the skills it links into, as icons, on the right
    const links = SKILLS[k].linksInto ?? [];
    let lx = w - 10;
    for (let i = links.length - 1; i >= 0; i--) {
      ctx.drawImage(skillIcon(links[i]), lx - ICON, y - 4);
      lx -= ICON + 1;
    }
    text(ctx, '→', w - 10 - links.length * (ICON + 1) - 5, y, 1, gold, 'right');
  });
}
