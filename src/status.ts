import { game, player } from './state';
import { net } from './net';
import { areaName } from './world';
import { killMob } from './combat';
import type { Mob, Status, StatusKind } from './types';

/* ============================================================
   STATUS EFFECTS
   Some areas carry an element, and it works both ways there:
   your hits sometimes inflict it on enemies, and its enemies
   sometimes inflict it on you when they touch you.
   - poison: damage every second, a long while (Swamp, Void Garden)
   - burn: heavier damage every second, briefly (Mushroom Grotto, Ember Wastes)
   - chill: slows movement (Mirror Lake, Summit)
   Effects stack: each new dose adds a stack (up to MAX_STACKS) and
   restarts the timer; damage and slow grow with the stacks. Poison
   and burn never take you below 1 HP. Your effects show as icons
   with timers over the HP bar; an enemy's as coloured pips.
   ============================================================ */

export const STATUS: Record<StatusKind, { dur: number; col: string; label: string }> = {
  poison: { dur: 5, col: '#7ad04a', label: 'POISON' },
  burn:   { dur: 3, col: '#ff8a3a', label: 'BURN' },
  chill:  { dur: 3, col: '#8fd8ff', label: 'CHILL' },
};
export const MAX_STACKS = 3;
/** Chance a hit inflicts the area's element (yours on enemies, theirs on you). */
export const INFLICT = { player: 0.25, mob: 0.35 };
/** Damage per second per stack: of your attack (on enemies), of your max HP (on you). */
export const DOT = { poison: { mob: 0.25, player: 0.02 }, burn: { mob: 0.5, player: 0.04 } };
/** Movement left per chill stack (multiplied). */
export const CHILL_SLOW = 0.8;

/** Which element each area carries. */
export const AREA_STATUS: Record<string, StatusKind> = {
  'Swamp': 'poison', 'Void Garden': 'poison',
  'Mushroom Grotto': 'burn', 'Ember Wastes': 'burn',
  'Mirror Lake': 'chill', 'Summit': 'chill',
};
/** The element of the area you're in (none in towns). */
export const areaStatus = (): StatusKind | undefined =>
  game.floor.town ? undefined : AREA_STATUS[areaName(net.area)];

type Bearer = { effects?: Status[] };

/** Add a stack of an effect (or start it), restarting its timer. */
export function applyStatus(b: Bearer, kind: StatusKind): void {
  const list = (b.effects ??= []);
  const s = list.find((e) => e.kind === kind);
  if (s) { s.stacks = Math.min(MAX_STACKS, s.stacks + 1); s.t = STATUS[kind].dur; }
  else list.push({ kind, stacks: 1, t: STATUS[kind].dur, tick: 1 });
}

/** Roll the area's element onto someone who was just hit. */
export function maybeInflict(b: Bearer, chance: number): void {
  const k = areaStatus();
  if (k && Math.random() < chance) applyStatus(b, k);
}

export const stacksOf = (b: Bearer, kind: StatusKind): number => b.effects?.find((e) => e.kind === kind)?.stacks ?? 0;

/** Movement multiplier from chill (1 = unslowed). */
export const slowFactor = (b: Bearer): number => CHILL_SLOW ** stacksOf(b, 'chill');

const DOT_COL: Partial<Record<StatusKind, string>> = { poison: '#9be86b', burn: '#ffae6b' };

/** Run timers and damage ticks. Call each step for the player and every mob. */
export function updateStatus(b: Bearer, dt: number, mob?: Mob): void {
  if (!b.effects?.length) return;
  for (let i = b.effects.length - 1; i >= 0; i--) {
    const s = b.effects[i];
    s.t -= dt;
    if (s.kind !== 'chill' && (s.tick -= dt) <= 0) {
      s.tick += 1;
      const rate = DOT[s.kind];
      if (mob) {
        const d = Math.max(1, Math.round(player.war * rate.mob * s.stacks));
        mob.hp -= d; mob.barT = Math.max(mob.barT, 1);
        game.dmgNums.push({ x: mob.x, y: mob.y - 8, v: d, t: 0.8, crit: false, vy: -12, col: DOT_COL[s.kind]! });
        if (mob.hp <= 0) { killMob(mob); return; }
      } else {
        const d = Math.min(Math.max(0, player.hp - 1), Math.max(1, Math.round(player.hpMax * rate.player * s.stacks)));
        if (d > 0) {
          player.hp -= d;
          game.dmgNums.push({ x: player.x, y: player.y - 14, v: d, t: 0.8, crit: false, vy: -40, col: DOT_COL[s.kind]! });
        }
      }
    }
    if (s.t <= 0) b.effects.splice(i, 1);
  }
}

export function clearStatus(b: Bearer): void { if (b.effects) b.effects.length = 0; }
