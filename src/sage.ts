import { openConfirm } from './confirm';
import { sfx } from './audio';
import { advanceJob, nextJob } from './progress';
import { bannerMsg, game, logMsg, player } from './state';

/* ============================================================
   THE SAGE
   An old man in every town who advances your job. Reaching Lv.10, 30 and
   60 makes you eligible; talking to him (and saying yes) takes the job,
   unlocking its skills and adding to your HP and MP (see JOBS).
   ============================================================ */

/** Talk to the Sage: offer the next job if you're ready, else say when to come back. */
export function visitSage(): void {
  const n = nextJob();
  if (!n) { bannerMsg('THE SAGE', 'I HAVE TAUGHT YOU ALL I KNOW'); return; }
  if (player.level < n.level) { bannerMsg('THE SAGE', `RETURN TO ME AT LV.${n.level}`); return; }
  const gain = Math.round((n.hpmp - player.job.hpmp) * 100);
  openConfirm(`${n.title.toUpperCase()}: ${n.name.toUpperCase()}?`, () => {
    if (!advanceJob()) return;
    game.fx.push({ type: 'levelUp', x: player.x, y: player.y + player.h, t: 0.9, follow: true });
    sfx.levelUp();
    bannerMsg(n.name.toUpperCase(), `+${gain}% HP/MP - NEW SKILLS (K)`);
    logMsg(`The Sage made you a <b>${n.name}</b>: +${gain}% HP and MP, and new skills to learn`);
  });
}
