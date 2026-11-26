import { COIN_LIFE } from './economy';
import { game, logMsg, player } from './state';
import { pressed } from './input';
import type { Floor, Mob } from './types';

/* ============================================================
 * Equipment: a weapon and an armor piece, one equipped per slot,
 * plus a small bag of spares.
 *
 * An upgrade goes straight on and the piece it replaces goes in the
 * bag; a lesser piece goes in the bag too, while there is room. Each
 * piece keeps its own name and level, and the Esc menu swaps a spare
 * back on (see wear). Gear is scaled to the level it is found or
 * bought at, so a bow picked up in the Craggy Mountains is worth more
 * than one bought on the Beach.
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

/** A weapon's bonus, as a share of your attack: +12% at Lv.1, +30% at Lv.10. */
export const weaponBonus = (i: GearItem): number => (10 + i.lvl * 2) / 100;

/** An armor piece soaks this share of the damage taken, capped so you never
 *  become invincible: 6% at Lv.1, 40% from Lv.35 on. */
export const armorSoak = (i: GearItem): number => Math.min(40, 5 + i.lvl) / 100;

/** The two slots. Both start empty (naked and bowless at Lv.1). */
export const gear = { weapon: null as GearItem | null, armor: null as GearItem | null };

/** True when `item` is worth putting on over what is in its slot. */
export const isUpgrade = (item: GearItem): boolean =>
  (gear[item.kind]?.lvl ?? 0) < item.lvl;

/** Spare pieces, in the order they were picked up. */
export const BAG_SIZE = 4;
export const bag: GearItem[] = [];
export const bagFull = (): boolean => bag.length >= BAG_SIZE;

/** Put a piece on if it is an upgrade (the old one goes in the bag, room
 *  permitting), else stow it in the bag. False when it fit nowhere. */
export function equip(item: GearItem): boolean {
  if (isUpgrade(item)) {
    const old = gear[item.kind];
    gear[item.kind] = item;
    if (old && !bagFull()) bag.push(old);
    return true;
  }
  if (bagFull()) return false;
  bag.push(item);
  return true;
}

/** Put on the bag's i-th piece, whatever its level; what it replaces
 *  takes its place in the bag. */
export function wear(i: number): boolean {
  const item = bag[i];
  if (!item) return false;
  const old = gear[item.kind];
  gear[item.kind] = item;
  if (old) bag[i] = old; else bag.splice(i, 1);
  return true;
}

/** Take off what is in a slot, into the bag (if there is room). */
export function unequip(kind: GearKind): boolean {
  const item = gear[kind];
  if (!item || bagFull()) return false;
  gear[kind] = null; bag.push(item);
  return true;
}

/** Wipe the slots and the bag back to nothing (a new run). */
export function clearGear(): void {
  gear.weapon = null; gear.armor = null; bag.length = 0;
}

/* ---------------- Drops ----------------
 * A defeated enemy sometimes leaves a piece behind, scaled to its own
 * level. It lands where it fell and sits there until you walk over it;
 * an upgrade goes straight on (see equip), a lesser piece into the bag. */

export interface GearDrop {
  item: GearItem;
  x: number; y: number;
  /** s left before it fades (same lifetime as a coin pile). */
  t: number;
}

/** Roughly one enemy in twelve; a boss always leaves one. */
export const GEAR_CHANCE = 1 / 12;

export const gearDrops: GearDrop[] = [];
/** The floor the drops lie on: they are left behind with it, like coins. */
let onFloor: Floor | null = null;

export function dropGear(m: Mob): void {
  if (Math.random() > (m.boss ? 1 : GEAR_CHANCE)) return;
  const kind: GearKind = Math.random() < 0.5 ? 'weapon' : 'armor';
  gearDrops.push({ item: gearFor(kind, m.level), x: m.x, y: m.y + m.h - 4, t: COIN_LIFE });
}

/** Fade the pieces left on the floor and pick up (with X) the ones under you. */
export function updateGear(dt: number): void {
  if (onFloor !== game.floor) { gearDrops.length = 0; onFloor = game.floor; }
  const picking = pressed('x'); // gear is picked up with X, not on contact
  for (let i = gearDrops.length - 1; i >= 0; i--) {
    const d = gearDrops[i];
    d.t -= dt;
    if (d.t <= 0) { gearDrops.splice(i, 1); continue; }
    if (!picking) continue;
    if (Math.abs(d.x - player.x) > 14) continue;
    if (Math.abs(d.y - (player.y + player.h)) > 16) continue;
    takeGear(d);
  }
}

/** Take a piece off the floor: worn if it's an upgrade, else bagged. False
 *  (and it stays lying there) when it's no upgrade and the bag is full. */
export function takeGear(d: GearDrop): boolean {
  const on = isUpgrade(d.item);
  if (!equip(d.item)) return false;
  gearDrops.splice(gearDrops.indexOf(d), 1);
  logMsg(`${on ? 'Equipped' : 'Bagged'} ${d.item.name} Lv.${d.item.lvl}`);
  return true;
}

/* The two numbers everything else reads. */
export const gearDmg = (): number => (gear.weapon ? 1 + weaponBonus(gear.weapon) : 1);
export const gearSoak = (): number => (gear.armor ? armorSoak(gear.armor) : 0);
