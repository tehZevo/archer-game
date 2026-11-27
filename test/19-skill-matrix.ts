import { P, SKILLS, game, player, check, arena, dummy, step, cast, linkable, linkHeld } from './harness';
import type { SkillDef, SkillKey } from '../src/types';

/* ============================================================
   SKILL MATRIX
   The kit's authored numbers and its link grammar, table-driven so
   one edit to the config shows up as one failing row. The per-skill
   behaviour these numbers drive is exercised in the sections that
   own each skill; this file is the golden snapshot of the whole kit.
   ============================================================ */

// --- the authored numbers of every active skill (a regression lock) ---
const KIT: [SkillKey, Partial<SkillDef>][] = [
  ['z', { use: 0.2, delay: 0.4, cd: 0, mp1: 3, dmg1: 120, hits1: 2, targets1: 4 }],
  ['s', { use: 0.2, delay: 0.4, cd: 0, mp1: 6, dmg1: 220, hits1: 4, targets1: 6 }],
  ['d', { use: 0.2, delay: 0.1, cd: 0, mp1: 2, dmg1: 0 }],
  ['ground-q', { use: 0.6, delay: 0.35, cd: 3, mp1: 6, dmg1: 400, targets1: 6 }],
  ['eb', { use: 0.6, delay: 0.35, cd: 0, mp1: 0, dmg1: 460, hits1: 2, targets1: 10 }],
  ['ground-w', { use: 0.4, delay: 0.2, cd: 0, mp1: 5, dmg1: 110, hits1: 4, targets1: 4 }],
  ['ab', { use: 0.2, delay: 0.4, cd: 0, mp1: 6, dmg1: 140, hits1: 4, targets1: 6 }],
  ['ground-e', { use: 0.5, delay: 0.4, cd: P.SPIKE_CD, mp1: 7, dmg1: 400, hits1: 2, targets1: 4 }],
  ['air-q', { use: 1.1, cd: 0, mp1: 4, dmg1: 400, hits1: 1 }],
  ['air-w', { use: 0.6, delay: 0.4, cd: P.SPIN_CD, mp1: 5, dmg1: 200, hits1: 4, targets1: 8 }],
  ['air-e', { use: 0.4, delay: 0.2, cd: 0, mp1: 7, dmg1: 240, hits1: 2, targets1: 10 }],
  ['r', { use: 0.7, cd: 10, mp1: 14, dmg1: 200, hits1: 8, targets1: 8 }],
  ['held-z', { use: 0.1, cd: 0, mp1: 1, dmg1: 110, hits1: 2, targets1: 1 }],
];
{
  const bad: string[] = [];
  for (const [k, want] of KIT) {
    const s = SKILLS[k];
    for (const [field, v] of Object.entries(want) as [keyof SkillDef, number][]) {
      if (s[field] !== v) bad.push(`${k}.${String(field)} ${s[field]} != ${v}`);
    }
  }
  check('the kit carries its authored use/delay/cd/mp/dmg/hits/targets', bad.length === 0, bad.join('; '));
}

// --- the link grammar: what each skill chains into ---
const LINKS_INTO: [SkillKey, SkillKey[]][] = [
  ['z', ['ground-q', 'eb', 'air-q']],
  ['s', ['ground-q', 'eb', 'air-q']],
  ['d', ['air-q', 'air-e', 'z', 's']],
  ['ground-q', ['ground-w', 'ab', 'eb', 'air-q', 'air-w', 'z', 's']],
  ['ground-e', ['ground-w', 'ab', 'ground-q', 'eb', 'air-q', 'air-w', 'air-e', 'z', 's']],
  ['air-q', ['ground-w', 'ab', 'ground-q', 'eb', 'air-w', 'd', 'ground-e', 'z', 's']],
  ['air-w', ['d', 'air-e', 'z', 's']],
  ['air-e', ['air-w', 'air-q', 'r', 'air-e', 'z', 's']],
  ['r', ['ground-q', 'eb', 'air-q', 'air-e', 'z', 's']],
  ['eb', ['ground-w', 'ab', 'ground-q', 'air-q', 'air-w', 'z', 's']],
  ['ab', ['air-w', 'air-q', 'r', 'z', 's', 'ground-q', 'air-e']],
];
{
  const bad: string[] = [];
  for (const [k, want] of LINKS_INTO) {
    const got = SKILLS[k].linksInto ?? [];
    if (got.join() !== want.join()) bad.push(`${k}: ${got.join()} != ${want.join()}`);
  }
  check('each skill links into its authored set', bad.length === 0, bad.join('; '));
}

// --- the aerial kit needs real height (~2/3 of a jump), not just any airtime ---
{
  const high: [SkillKey, SkillKey, string][] = [['ground-e', 'air-e', 'barrage'], ['ground-q', 'air-q', 'dive'], ['ground-w', 'air-w', 'shoot']];
  let bad = 0;
  for (const [g, k, pose] of high) {
    arena(20);
    player.ranks[g] = true; player.ranks[k] = true;
    dummy(100);
    cast('c'); step(1); // just left the ground: ~9px of height
    const mp0 = player.mp;
    cast(g);
    if (player.cast === pose && player.mp < mp0) bad++; // fired too early
    step(7); // near the jump apex (~35px)
    cast(g);
    if (!(player.cast === pose && player.mp < mp0)) bad++;
  }
  check('the aerial forms fire near the jump apex, not right off the ground', bad === 0, `${bad} off`);
}

/* --- the link-pair driver: cast the launcher, press the target mid-cast,
       and confirm it is buffered and fires as the launcher's cast clears. --- */
interface Pair { from: SkillKey; to: SkillKey; setup: () => void; buffered: boolean; fired: string; }
function linkOff(p: Pair): { queued: SkillKey | null; fired: string | null; held: boolean } {
  p.setup();
  cast(p.from);
  const held = linkable(p.to) && linkHeld(p.to);
  cast(p.to);
  const queued = player.casting.queued;
  for (let i = 0; i < 90 && (player.casting.useT > 0 || player.casting.recoverT > 0
    || player.hang.t > 0 || player.diving || player.rush.t > 0); i++) step(1);
  return { queued, fired: player.cast, held };
}
const rush = (): void => { arena(20); player.ranks['ground-q'] = true; dummy(150); };
const air = (k: SkillKey): (() => void) => () => { arena(20); player.ranks['ground-q'] = true; player.ranks[k] = true; dummy(100); cast('c'); step(8); };
const assault = (): void => { arena(30); player.ranks['ground-q'] = true; player.ranks['ground-w'] = true; player.ranks.ab = true; dummy(130); cast('q'); step(14); cast('w'); step(4); };
const leap = (): void => { arena(60); player.ranks['ground-e'] = true; player.ranks['air-e'] = true; dummy(130); cast('e'); step(12); };
const dive = (): void => { arena(20); player.ranks['ground-q'] = true; player.ranks['air-q'] = true; dummy(150); cast('c'); step(8); cast('q'); step(15); };

const PAIRS: (Pair & { name: string })[] = [
  { name: 'Rush Toss → Rising Arrows', from: 'ground-q', to: 'ground-w', setup: rush, buffered: true, fired: 'barrage' },
  { name: 'Rush Toss → Double Shot', from: 'ground-q', to: 'z', setup: rush, buffered: true, fired: 'shoot' },
  { name: 'Piercing Leap → Downpour', from: 'ground-e', to: 'air-e', setup: leap, buffered: true, fired: 'barrage' },
  { name: 'Meteor Dive → Rising Arrows', from: 'air-q', to: 'ground-w', setup: dive, buffered: true, fired: 'barrage' },
  { name: 'Skyward Assault → Cyclone Sweep', from: 'ab', to: 'air-w', setup: assault, buffered: true, fired: 'shoot' },
  { name: 'Skyward Assault → Tempest', from: 'ab', to: 'r', setup: assault, buffered: true, fired: 'shoot' },
  { name: 'Skyward Assault → Meteor Dive', from: 'ab', to: 'air-q', setup: assault, buffered: true, fired: 'dive' },
  { name: 'Cyclone Sweep → Glide', from: 'air-w', to: 'd', setup: air('air-w'), buffered: true, fired: 'jump' },
  { name: 'Cyclone Sweep → Downpour', from: 'air-w', to: 'air-e', setup: air('air-w'), buffered: true, fired: 'barrage' },
  { name: 'Downpour → Cyclone Sweep', from: 'air-e', to: 'air-w', setup: air('air-w'), buffered: true, fired: 'shoot' },
  { name: 'Glide → Meteor Dive', from: 'd', to: 'air-q', setup: air('air-q'), buffered: true, fired: 'dive' },
  { name: 'Skyward Assault → Glide (dropped)', from: 'ab', to: 'd', setup: assault, buffered: false, fired: 'barrage' },
];
{
  const bad: string[] = [];
  for (const p of PAIRS) {
    const r = linkOff(p);
    const wantQueued = p.buffered ? p.to : null;
    if (r.queued !== wantQueued) bad.push(`${p.name}: queued ${r.queued} want ${wantQueued}`);
    else if (p.buffered && r.fired !== p.fired) bad.push(`${p.name}: fired ${r.fired} want ${p.fired}`);
  }
  check('the link-pair table buffers and fires each combo as its launcher ends', bad.length === 0, bad.join('; '));
}
