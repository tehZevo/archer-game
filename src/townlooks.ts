import { BASIC, STYLE_NAMES, type Look } from './look';

/* ============================================================
   TOWN LOOKS
   Every town's stylist offers the basic styles and colours plus its
   own extra (a hair style or colour that suits the place). Seeing a
   stylist's extra unlocks it for good: from then on it's on offer at
   every stylist and the main menu's LOOK. Kept on this device.
   ============================================================ */

type Extra = { k: 'style' | 'hair'; i: number };
const style = (name: typeof STYLE_NAMES[number]): Extra => ({ k: 'style', i: STYLE_NAMES.indexOf(name) });
const hair = (i: number): Extra => ({ k: 'hair', i: BASIC.hair! + i });

/** Each town's extras (hair colour indices count from the first non-basic colour). */
export const TOWN_LOOKS: Record<string, Extra[]> = {
  'Saltwick Port': [hair(0)],               // auburn
  'Driftwood Rest': [hair(13)],             // sand
  'Mossgate Village': [hair(7)],            // moss
  'Fernwick Hamlet': [style('PONYTAIL')],
  'Sporehollow Camp': [hair(3)],            // lavender
  'Glimmerdeep Town': [hair(12)],           // violet
  'Gearholm City': [style('SLICKED'), hair(15)], // slate
  'Reedmouth Village': [hair(4)],           // mint
  'Tidewatch Outpost': [hair(2)],           // navy
  'Wrackhaven Cove': [hair(17)],            // copper
  'Stillwater Town': [hair(8)],             // sky
  'Thistledown Station': [hair(14)],        // rose
  'Lanternhollow Town': [hair(11)],         // gold
  'Emberfold Village': [hair(16)],          // ember
  'Highcrag Hold': [style('SPIKY')],
  'Cloudharbor Town': [hair(9)],            // snow
  'Windrest Camp': [hair(5)],               // orange
  'Summit Lodge': [hair(1)],                // platinum
  'Hollowmere Town': [hair(18)],            // peach
  'Bellcourt Abbey': [style('BUN')],
  'Willowmere Village': [hair(10)],         // chestnut
  'Duskmeadow Hamlet': [hair(6)],           // crimson
  'Nullhaven Refuge': [hair(19)],          // void
  'Ashen Gate Fort': [hair(20)],           // ash
};

const STORE = 'archer-game:looks-unlocked';
let unlocked: Set<string> | null = null;
const key = (k: keyof Look, i: number): string => `${k}:${i}`;
function load(): Set<string> {
  if (!unlocked) {
    try { unlocked = new Set((JSON.parse(localStorage.getItem(STORE) ?? '[]') as unknown[]).filter((v): v is string => typeof v === 'string')); }
    catch { unlocked = new Set(); }
  }
  return unlocked;
}

/** Is this option basic (everyone has it)? Body, skin and outfit always are. */
export const isBasic = (k: keyof Look, i: number): boolean => BASIC[k] === undefined || i < BASIC[k]!;

/** Has this player unlocked this option (or is it basic)? */
export const isUnlocked = (k: keyof Look, i: number): boolean => isBasic(k, i) || load().has(key(k, i));

/** Is this one of the town's own extras? */
export const townOffers = (town: string | null, k: keyof Look, i: number): boolean =>
  !!town && !!TOWN_LOOKS[town]?.some((e) => e.k === k && e.i === i);

/** What a stylist can give you: everything unlocked, plus the town's own extras. */
export const offeredAt = (town: string | null) => (k: keyof Look, i: number): boolean => isUnlocked(k, i) || townOffers(town, k, i);

/** Visiting a town's stylist unlocks its extras for good. Returns how many were new. */
export function unlockTown(town: string): number {
  const s = load();
  let n = 0;
  for (const e of TOWN_LOOKS[town] ?? []) if (!s.has(key(e.k, e.i))) { s.add(key(e.k, e.i)); n++; }
  if (n) try { localStorage.setItem(STORE, JSON.stringify([...s])); } catch { /* no storage */ }
  return n;
}

/** Forget every unlock (tests). */
export function clearUnlocks(): void { load().clear(); try { localStorage.removeItem(STORE); } catch { /* no storage */ } }
