import { game } from './state';
import type { FloorMod } from './types';

/* ============================================================
   FLOOR MODIFIERS
   Now and then a combat floor rolls a modifier that changes how
   it plays, and pays more coins for the trouble. Rolled from the
   floor's seed, so everyone in the channel gets the same one.
   - icy (cold areas): the ground is slippery: you speed up and
     slow down slowly, and slide on when you let go.
   ============================================================ */

export const FLOOR_MODS: Record<FloorMod, { areas: string[]; chance: number; label: string; coins: number }> = {
  icy: { areas: ['Mirror Lake', 'Mountain', 'Summit', 'Sky Reef'], chance: 0.4, label: 'ICY', coins: 1.5 },
};
/** On ice, how much of your usual grip (acceleration and friction) you keep. */
export const ICE_GRIP = 0.2;

/** The modifiers a combat floor in `area` rolls (r: the floor's own random stream). */
export function rollMods(area: string, r: () => number): FloorMod[] {
  return (Object.keys(FLOOR_MODS) as FloorMod[]).filter((k) => FLOOR_MODS[k].areas.includes(area) && r() < FLOOR_MODS[k].chance);
}

export const hasMod = (m: FloorMod): boolean => !!game.floor.mods?.includes(m);

/** Your grip on the ground (1 = normal). */
export const grip = (): number => (hasMod('icy') ? ICE_GRIP : 1);

/** Coins are worth more on a modified floor. */
export const coinMult = (): number => (game.floor.mods ?? []).reduce((k, m) => k * FLOOR_MODS[m].coins, 1);

/** "ICY +50% COINS", for the HUD (empty on a normal floor). */
export function modLine(): string {
  const mods = game.floor.mods ?? [];
  if (!mods.length) return '';
  return `${mods.map((m) => FLOOR_MODS[m].label).join(' ')} +${Math.round((coinMult() - 1) * 100)}% COINS`;
}
