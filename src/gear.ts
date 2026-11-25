/* ============================================================
 * Equipment: a weapon and an armor piece, one equipped per slot.
 *
 * There is no bag yet, so picking up a piece simply replaces what
 * was in its slot (see equip). Gear is scaled to the level it is
 * found or bought at, so a bow picked up in the Craggy Mountains is
 * worth more than one bought on the Beach.
 * ============================================================ */

export type GearKind = 'weapon' | 'armor';

export interface GearItem {
  kind: GearKind;
  /** The name shown in the menu, e.g. "Yew Bow". */
  name: string;
  /** The level it was made for; everything about it scales off this. */
  lvl: number;
}

/** The names each slot wears, one per 5 levels of the area it comes from. */
const NAMES: Record<GearKind, string[]> = {
  weapon: ['Short Bow', 'Long Bow', 'Composite Bow', 'Yew Bow', 'Hunter Bow', 'War Bow', 'Ranger Bow', 'Longbow'],
  armor: ['Leather Armor', 'Hide Armor', 'Studded Armor', 'Chainmail', 'Scale Armor', 'Brigandine', 'Plate Armor'],
};

/** Make a piece of gear for the given level: the tier is picked by level,
 *  so every piece of a tier is identical (no random rolls to compare). */
export function gearFor(kind: GearKind, lvl: number): GearItem {
  const t = Math.max(0, Math.min(NAMES[kind].length - 1, Math.floor((lvl - 1) / 5)));
  return { kind, name: NAMES[kind][t], lvl: Math.max(1, Math.round(lvl)) };
}

/** A weapon's bonus, as a share of your attack: +12% at Lv.1, +32% at Lv.10. */
export const weaponBonus = (i: GearItem): number => (10 + i.lvl * 2) / 100;

/** An armor piece soaks this share of the damage taken, capped so you never
 *  become invincible: 6% at Lv.1, 40% from Lv.35 on. */
export const armorSoak = (i: GearItem): number => Math.min(40, 5 + i.lvl) / 100;

/** The two slots. Both start empty (naked and bowless at Lv.1). */
export const gear = { weapon: null as GearItem | null, armor: null as GearItem | null };

/** True when `item` is worth putting on over what is in its slot. */
export const isUpgrade = (item: GearItem): boolean =>
  (gear[item.kind]?.lvl ?? 0) < item.lvl;

/** Put a piece on, keeping it if the slot is empty or the new one is newer.
 *  Returns true when it went on (the old piece is gone: no bag to keep it in). */
export function equip(item: GearItem): boolean {
  if (!isUpgrade(item)) return false;
  gear[item.kind] = item;
  return true;
}

/** Wipe the slots back to nothing (a new run). */
export function clearGear(): void {
  gear.weapon = null; gear.armor = null;
}

/* The two numbers everything else reads. */
export const gearDmg = (): number => (gear.weapon ? 1 + weaponBonus(gear.weapon) : 1);
export const gearSoak = (): number => (gear.armor ? armorSoak(gear.armor) : 0);
