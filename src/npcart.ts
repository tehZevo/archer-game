import { fillRect, newGrid, type Grid } from './grid';

/* ============================================================
   TOWN NPC ART
   The shopkeeper, the stylist and the trainer: 16 x 24 figures (the
   archer's size), each its own build, facing the viewer. Every NPC has
   four frames: standing, breathing (head and shoulders sunk a pixel),
   blinking, and waving at you when you're close enough to talk (see
   drawNpc). The quest board is a prop, one frame. Baked to PNG with the
   rest of the scenery (artsheets.ts: npc/<kind>/<frame>).
   ============================================================ */

export type NpcLook = 'shop' | 'stylist' | 'trainer';
export const NPC_W = 16, NPC_H = 24;
/** Frames: 0 standing, 1 breathing in, 2 blinking, 3 waving. */
export const NPC_FRAMES = 4;

const OUT = '#0d1424';

/* The merchant: stout, wide-brimmed hat with a gold band, a big
   moustache, a blue shirt under a white apron, a coin pouch at the hip. */
const SHOP = [
  '................',
  '......oooo......',
  '.....ohhhHo.....',
  '....ohhhhhHo....',
  '....oggggggo....',
  '..ooHhhhhhhHoo..',
  '.oHHHHHHHHHHHHo.',
  '..oossssssssoo..',
  '...osessssseso..',
  '...ossssSssssSo.',
  '...ommmmmmmmmo..',
  '....osssssssSo..',
  '.....oSSSSSo....',
  '...oocaaaaacoo..',
  '..occcaaaaacCco.',
  '..occaaaaaaaCco.',
  '..osoaaaaaaaoso.',
  '...oaaaaaaApApo.',
  '...oaAaaaaaAppo.',
  '...ooooooooooo..',
  '....olll.lllo...',
  '....olll.lllo...',
  '...obbbo.obbbo..',
  '...oooo...oooo..',
];
const SHOP_PAL: Record<string, string> = {
  h: '#7a4bb8', H: '#5a3590', g: '#ffd166', s: '#f2d0a9', S: '#d9a47c', e: OUT, m: '#6b4428',
  c: '#3f9fdc', C: '#2a6fa8', a: '#f4efe2', A: '#cfc6b0', p: '#c9952f', l: '#3d4f6e', b: '#5e3b1f',
};
/** The merchant's raised hand (cols 13-14, from the shoulder up), and the gap it leaves. */
const SHOP_WAVE: [number, number, string][] = [
  [14, 9, 'o'], [13, 10, 'o'], [14, 10, 's'], [15, 10, 'o'], [13, 11, 'o'], [14, 11, 'c'], [15, 11, 'o'],
  [13, 12, 'o'], [14, 12, 'c'], [15, 12, 'o'], [14, 13, 'c'], [15, 13, 'o'], [14, 14, 'C'], [15, 14, '.'],
  [12, 16, 'a'], [13, 16, 'o'], [14, 16, '.'], [14, 15, 'o'], [15, 15, '.'],
];

/* The stylist: slim and tall, pink hair piled into a bun with a comb
   through it, a violet dress with a sash, scissors at her side. */
const STYLIST = [
  '......oooo......',
  '.....ohhhHo.....',
  '.....ohhhHo.....',
  '...oooohHoooo...',
  '..ohhhhhhhhhHo..',
  '..ohhkkkkkkhHo..',
  '..ohsssssssshHo.',
  '..ohsesssssehHo.',
  '..ohssssSsssHHo.',
  '..oHsssrrsssHo..',
  '...oHsssssssHo..',
  '....ooSSSSSoo...',
  '....oddDDddddo..',
  '...odddDddddDdo.',
  '...osoyyyyyyoso.',
  '...oxodddddDoxo.',
  '....odddddddDo..',
  '...oddddddddDDo.',
  '...odddddddddDo.',
  '..oddddddddddDDo',
  '..ooooooooooooo.',
  '.....os...so....',
  '....obbo.obbo...',
  '....ooo...ooo...',
];
const STYLIST_PAL: Record<string, string> = {
  h: '#f29ac0', H: '#c46a92', k: '#ffd166', s: '#f2d0a9', S: '#d9a47c', e: '#3a1f4a', r: '#d0506a',
  d: '#b48ae6', D: '#7d5ab8', y: '#f4efe2', x: '#cfd8e6', b: '#5a3f8a',
};
const STYLIST_WAVE: [number, number, string][] = [
  [14, 9, 'o'], [13, 10, 'o'], [14, 10, 's'], [15, 10, 'o'], [13, 11, 'o'], [14, 11, 'd'], [15, 11, 'o'],
  [14, 12, 'd'], [15, 12, 'o'], [14, 13, 'D'], [15, 13, 'o'], [14, 14, 'o'], [15, 14, '.'],
  [13, 15, 'o'], [14, 15, '.'],
];

/* The trainer: broad and battle-worn, a red headband over cropped hair,
   a short beard, a green tunic with a leather belt and bracers, a
   wooden practice sword slung across his back. */
const TRAINER = [
  '.............ww.',
  '.....oooooo.owo.',
  '....ohhhhhhoowo.',
  '...ohhhhhhhhwo..',
  '...orrrrrrrrRo..',
  '...osessssesow..',
  '...ossssSssssw..',
  '...oBssssssBow..',
  '....oBBBBBBow...',
  '.....oSSSSow....',
  '..ooommmmmmooo..',
  '.ommmmMmmmmMmmo.',
  '.ommmmmMmmmmMmo.',
  '.oSbmmmmmmmmbSo.',
  '.oSbmmmmmmmmbSo.',
  '.oSoLLLgLLLLoSo.',
  '..o.mmmmmmmMo.o.',
  '....mmmmmmmMo...',
  '...oooooooooo...',
  '....oll..llo....',
  '....oll..llo....',
  '...obbbo.obbbo..',
  '...obbbo.obbbo..',
  '...oooo...oooo..',
];
const TRAINER_PAL: Record<string, string> = {
  h: '#4a3326', r: '#d04a3a', R: '#9a2a20', s: '#e0b48a', S: '#b8875e', e: OUT, B: '#5a3a26',
  m: '#3f8f5a', M: '#2a6a40', b: '#7a5232', L: '#5e3b1f', g: '#ffd166', l: '#3d4f6e', w: '#b08850',
};
const TRAINER_WAVE: [number, number, string][] = [
  [14, 8, 'o'], [13, 9, 'o'], [14, 9, 'S'], [15, 9, 'o'], [13, 10, 'o'], [14, 10, 'b'], [15, 10, 'o'],
  [14, 11, 'm'], [15, 11, 'o'], [14, 12, 'm'], [15, 12, 'o'],
  [13, 13, 'o'], [14, 13, 'o'], [13, 14, 'o'], [14, 14, '.'], [13, 15, 'o'], [14, 15, '.'],
];

const ART: Record<NpcLook, { rows: string[]; pal: Record<string, string>; wave: [number, number, string][]; eyes: number }> = {
  shop: { rows: SHOP, pal: SHOP_PAL, wave: SHOP_WAVE, eyes: 8 },
  stylist: { rows: STYLIST, pal: STYLIST_PAL, wave: STYLIST_WAVE, eyes: 7 },
  trainer: { rows: TRAINER, pal: TRAINER_PAL, wave: TRAINER_WAVE, eyes: 5 },
};

/** The rows of an NPC's frame (see NPC_FRAMES). */
export function npcRows(kind: NpcLook, frame: number): string[] {
  const a = ART[kind], rows = a.rows.slice();
  if (frame === 1) {
    // breathing in: head and shoulders sink a pixel into the neck
    const neck = a.eyes + 5;
    for (let r = neck; r > 0; r--) rows[r] = a.rows[r - 1];
    rows[0] = '.'.repeat(NPC_W);
  }
  if (frame === 2) rows[a.eyes] = rows[a.eyes].replace(/e/g, 'S'); // eyelids down
  if (frame === 3) {
    const g = rows.map((r) => [...r]);
    for (const [x, y, ch] of a.wave) g[y][x] = ch;
    return g.map((r) => r.join(''));
  }
  return rows;
}

/** An NPC's frame as pixels. */
export function npcGrid(kind: NpcLook, frame: number): Grid {
  const pal: Record<string, string> = { o: OUT, ...ART[kind].pal }, g = newGrid(NPC_W, NPC_H);
  npcRows(kind, frame).forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) fillRect(g, x, y, 1, 1, pal[ch]); }));
  return g;
}

/** Which frame an NPC shows at time t (s): waving while you're near, else
 *  breathing slowly and blinking now and then (each in its own phase). */
export function npcFrame(t: number, near: boolean, phase: number): number {
  if (near) return Math.floor(t * 3) % 2 ? 3 : 0;
  const blink = (t + phase) % 3.7;
  if (blink < 0.14) return 2;
  return Math.floor((t + phase) / 0.9) % 2;
}

/** The quest board: a wooden notice board on two posts, notes pinned up (12 x 18). */
const BOARD = [
  'WWWWWWWWWWWW',
  'WwwwwwwwwwwW',
  'WwrppwwrppwW',
  'WwpiiwwpiiwW',
  'WwppiwwpppwW',
  'WwpiiwwpiiwW',
  'WwwwwrppwwwW',
  'WwwwwpiiwwwW',
  'WwwwwpppwwwW',
  'WwwwwwwwwwwW',
  'WWWWWWWWWWWW',
  '.WW......WW.',
  '.WW......WW.',
  '.WW......WW.',
  '.WW......WW.',
  '.WW......WW.',
  '.WW......WW.',
  'WWWW....WWWW',
];
const BOARD_PAL: Record<string, string> = { w: '#9a6a3a', W: '#5e3b1f', p: '#efe6c8', r: '#e05a5a', i: '#7d735c' };
export function boardGrid(): Grid {
  const g = newGrid(BOARD[0].length, BOARD.length);
  BOARD.forEach((r, y) => [...r].forEach((ch, x) => { if (BOARD_PAL[ch]) fillRect(g, x, y, 1, 1, BOARD_PAL[ch]); }));
  return g;
}
