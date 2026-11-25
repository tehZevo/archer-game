/* ============================================================
   EMOTES
   F1-F7 each pop a little face over your archer's head for a few
   seconds, and everyone in the room sees it over your ghost (sent as its
   own message, like a shot). The faces are 9x9 character grids, painted
   by render.ts in a small bubble beside the head.
   ============================================================ */

export const EMOTES = ['happy', 'sad', 'angry', 'surprised', 'wink', 'love', 'sweat'] as const;
export type Emote = typeof EMOTES[number];

/** How long an emote stays up, ms. */
export const EMOTE_MS = 3000;

/** Palette: '.' clear, o outline, y face, r cheek/anger, b tear/sweat, k eye/mouth, h heart, H heart shine. */
export const EMOTE_PAL: Record<string, string> = {
  o: '#1a2438', y: '#ffd166', r: '#ff6b6b', b: '#6ac8ff', k: '#1a2438', h: '#ff5a7a', H: '#ffc0cc',
};

const FACE = [
  '..ooooo..',
  '.oyyyyyo.',
  'oyyyyyyyo',
  'oyyyyyyyo',
  'oyyyyyyyo',
  'oyyyyyyyo',
  'oyyyyyyyo',
  '.oyyyyyo.',
  '..ooooo..',
];
/** A face with some cells changed: [col, row, char]. */
const face = (marks: [number, number, string][]): string[] => {
  const g = FACE.map((r) => r.split(''));
  for (const [x, y, c] of marks) g[y][x] = c;
  return g.map((r) => r.join(''));
};

export const EMOTE_ART: Record<Emote, string[]> = {
  happy: face([[3, 3, 'k'], [5, 3, 'k'], [2, 5, 'k'], [3, 6, 'k'], [4, 6, 'k'], [5, 6, 'k'], [6, 5, 'k'], [2, 4, 'r'], [6, 4, 'r']]),
  sad: face([[3, 3, 'k'], [5, 3, 'k'], [3, 6, 'k'], [4, 5, 'k'], [5, 6, 'k'], [6, 4, 'b'], [6, 5, 'b']]),
  angry: face([[2, 2, 'k'], [3, 3, 'k'], [6, 2, 'k'], [5, 3, 'k'], [3, 4, 'k'], [5, 4, 'k'], [3, 6, 'k'], [4, 6, 'k'], [5, 6, 'k'], [6, 1, 'r'], [7, 2, 'r']]),
  surprised: face([[3, 2, 'k'], [3, 3, 'k'], [5, 2, 'k'], [5, 3, 'k'], [4, 5, 'k'], [3, 6, 'k'], [5, 6, 'k'], [4, 7, 'k']]),
  wink: face([[2, 3, 'k'], [3, 3, 'k'], [5, 3, 'k'], [5, 2, 'k'], [3, 6, 'k'], [4, 6, 'k'], [5, 5, 'k'], [6, 4, 'r']]),
  love: [
    '.........',
    '.hh...hh.',
    'hHhh.hhhh',
    'hHhhhhhhh',
    'hhhhhhhhh',
    '.hhhhhhh.',
    '..hhhhh..',
    '...hhh...',
    '....h....',
  ],
  sweat: face([[3, 3, 'k'], [5, 3, 'k'], [3, 6, 'k'], [4, 6, 'k'], [5, 6, 'k'], [7, 1, 'b'], [7, 2, 'b'], [6, 2, 'b']]),
};

/** Each player's current emote (SELF for you, peer ids for the others). */
export const emotes = new Map<string, { kind: Emote; at: number }>();

/** Clean an emote index from the network (anything else is ignored). */
export const cleanEmote = (v: unknown): Emote | null =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) < EMOTES.length ? EMOTES[v as number] : null;

export function setEmote(id: string, kind: Emote, now: number): void { emotes.set(id, { kind, at: now }); }

/** The emote showing over a player right now (null once it has run out). */
export function emoteFor(id: string, now: number): Emote | null {
  const e = emotes.get(id);
  if (!e) return null;
  if (now - e.at > EMOTE_MS) { emotes.delete(id); return null; }
  return e.kind;
}

/** Forget one player's emote (they left), or everyone's (we changed rooms). */
export function clearEmotes(id?: string): void { if (id === undefined) emotes.clear(); else emotes.delete(id); }
