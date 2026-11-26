import { hash } from './tilekit';

/* ============================================================
   PROPS
   Bigger decorations standing on platform tops: trees, lanterns,
   crystals, telescopes... Purely visual: they don't collide. Each
   area has a few, painted in code on a PROP_W x PROP_H canvas whose
   bottom edge is the ground (feet at y = PROP_H, centred on x = 12).
   render.ts places them on exposed tops from the tile position, so
   every player sees the same ones.
   ============================================================ */

export const PROP_W = 24, PROP_H = 32;
/** Chance an exposed top tile carries a prop (most stay clear). */
export const PROP_CHANCE = 0.13;

export type PropPaint = (x: number, y: number, col: string, w?: number, h?: number) => void;
type Prop = (p: PropPaint) => void;

const B = PROP_H; // the ground line

/* ---------------- shared shapes ---------------- */
/** A filled circle, cut flat where it meets the ground. */
function disc(p: PropPaint, cx: number, cy: number, r: number, col: string): void {
  for (let y = -r; y <= r && cy + y < B; y++) { const h = Math.round(Math.sqrt(r * r - y * y)); p(cx - h, cy + y, col, h * 2 + 1, 1); }
}
/** A lantern hanging from a post: post, arm, glowing box. */
function lanternPost(p: PropPaint, post: string, glow: string, core: string): void {
  p(11, B - 26, post, 2, 26); p(9, B - 2, post, 6, 2); p(13, B - 26, post, 5, 1);
  p(15, B - 25, post, 1, 2); p(13, B - 23, glow, 5, 5); p(14, B - 22, core, 3, 3); p(13, B - 18, post, 5, 1);
}
/** A pointed crystal shard, `h` tall, lit on its left face. */
function shard(p: PropPaint, cx: number, h: number, w: number, light: string, dark: string): void {
  for (let y = 0; y < h; y++) {
    const half = Math.max(1, Math.round(w * Math.min(1, (y + 1) / (w * 1.5))));
    p(cx - half, B - h + y, light, half, 1); p(cx, B - h + y, dark, half, 1);
  }
}
/** A pine tree: trunk and three stacked tiers. */
function pine(p: PropPaint, leaf: string, shade: string, snow?: string): void {
  p(11, B - 6, '#5a3e24', 2, 6);
  for (const [top, w] of [[B - 28, 4], [B - 21, 7], [B - 14, 10]] as const) {
    for (let y = 0; y < 8; y++) { const half = Math.round((w * (y + 1)) / 8); p(12 - half, top + y, leaf, half, 1); p(12, top + y, shade, half, 1); }
    if (snow) p(12 - Math.round(w / 4), top + 1, snow, Math.round(w / 2), 1);
  }
}
/** A mushroom: stem and a domed cap with spots. */
function shroom(p: PropPaint, cx: number, h: number, r: number, stem: string, cap: string, spot: string): void {
  p(cx - 1, B - h, stem, 3, h);
  for (let y = 0; y < r; y++) { const half = Math.round(r * Math.sqrt(1 - (y / r) ** 2)); p(cx - half, B - h - y, cap, half * 2 + 1, 1); }
  p(cx - r + 2, B - h - 2, spot, 2, 1); p(cx + 1, B - h - r + 2, spot, 2, 1);
}

/* ---------------- per area ---------------- */
export const PROPS: Record<string, Prop[]> = {
  Classic: [(p) => lanternPost(p, '#4a3a2a', '#ffd070', '#fff4c0')],
  Harbor: [
    (p) => { p(5, B - 10, '#8e6442', 14, 10); p(5, B - 10, '#b08a5e', 14, 1); p(5, B - 6, '#6e4a30', 14, 1); p(5, B - 10, '#5a3e28', 1, 10); p(18, B - 10, '#5a3e28', 1, 10); p(9, B - 8, '#3a3a40', 6, 1); }, // a cargo crate
    (p) => { for (let y = 0; y < 12; y++) p(7 - (y % 11 ? 1 : 0), B - 12 + y, y === 2 || y === 9 ? '#3a3e48' : '#9a6e4a', 11 + (y % 11 ? 2 : 0), 1); p(9, B - 12, '#7a5638', 7, 1); }, // a barrel
    (p) => lanternPost(p, '#3a2a1e', '#ffd070', '#fff4c0'), // a dock lamp
    (p) => { p(10, B - 14, '#6e4a30', 4, 14); p(10, B - 14, '#9a6e4a', 1, 14); p(9, B - 15, '#5a3e28', 6, 1); for (const y of [B - 10, B - 7]) p(8, y, '#c8a06a', 8, 2); }, // a mooring post wound with rope
  ],
  'Tide Pools': [
    (p) => { disc(p, 12, B - 4, 6, '#56687a'); p(6, B - 4, '#3e4c5a', 13, 4); p(9, B - 9, '#5aa85e', 2, 4); p(14, B - 8, '#2e7a4a', 1, 4); }, // a weedy boulder
    (p) => { p(8, B - 3, '#f08a3a', 9, 1); p(12, B - 7, '#f08a3a', 1, 7); p(10, B - 1, '#f08a3a'); p(14, B - 1, '#f08a3a'); }, // a big starfish
  ],
  'Sunlit Shore': [
    (p) => { // a palm
      for (let y = 0; y < 22; y++) p(11 + Math.round(Math.sin(y / 7) * 2), B - y - 1, y % 4 ? '#a87a4a' : '#8a5a34', 3, 1);
      for (const [dx, dy] of [[-7, 2], [-4, 0], [4, 0], [7, 2], [-2, -2], [3, -2]]) p(12 + Math.min(dx, 0), B - 23 + dy, '#4f9a44', Math.abs(dx) + 1, 2);
      p(11, B - 22, '#6a4a2a', 3, 2);
    },
    (p) => { p(6, B - 6, '#e8c98a', 12, 6); p(8, B - 10, '#e8c98a', 8, 4); p(10, B - 13, '#e8c98a', 4, 3); p(11, B - 15, '#e8643c', 1, 3); p(12, B - 15, '#ff9f6b', 2, 1); p(9, B - 4, '#bf9353', 2, 2); }, // a sandcastle
  ],
  'Whispering Woods': [
    (p) => { disc(p, 12, B - 6, 7, '#2e6a2e'); disc(p, 9, B - 8, 4, '#3f8a3a'); disc(p, 15, B - 5, 4, '#245a26'); p(14, B - 9, '#e8643c'); p(8, B - 5, '#e8643c'); }, // a berry bush
    (p) => { p(8, B - 8, '#6a4a2a', 9, 8); p(8, B - 8, '#8a6a44', 9, 2); p(10, B - 7, '#a88a60', 5, 1); shroom(p, 18, 3, 2, '#e8dcc8', '#c8503a', '#fff'); }, // a stump
  ],
  'Sunny Meadows': [
    (p) => { disc(p, 12, B - 7, 8, '#e8c060'); p(4, B - 4, '#c89a40', 17, 4); for (let x = 6; x < 19; x += 3) p(x, B - 12 + (x % 2), '#f4dc8a', 1, 3); }, // a haystack
    (p) => { for (const x of [4, 18]) p(x, B - 12, '#a87a4a', 2, 12); p(2, B - 10, '#c89a64', 20, 2); p(2, B - 5, '#c89a64', 20, 2); }, // a fence
  ],
  'Misty Riverbank': [
    (p) => { for (const [x, h] of [[6, 14], [9, 20], [12, 17], [15, 22], [18, 12]]) { p(x, B - h, '#5a8a3a', 1, h); p(x, B - h, '#6a3e1e', 1, 4); } }, // cattails
    (p) => { disc(p, 12, B - 4, 6, '#6a7a6a'); p(6, B - 3, '#4a5a4a', 13, 3); disc(p, 11, B - 11, 3, '#5aa84a'); p(10, B - 12, '#fff'); p(12, B - 12, '#fff'); }, // a frog on a rock
  ],
  'Rolling Hills': [
    (p) => { disc(p, 10, B - 5, 6, '#8a8a7a'); disc(p, 16, B - 4, 4, '#7a7a6a'); p(6, B - 8, '#a8a898', 4, 1); }, // rocks
    (p) => { p(11, B - 20, '#8a6a44', 2, 20); p(5, B - 19, '#c89a64', 14, 5); p(16, B - 18, '#c89a64', 3, 3); p(7, B - 17, '#6a4a2a', 7, 1); }, // a signpost
  ],
  'Echoing Caves': [
    (p) => { shard(p, 10, 22, 4, '#5a5870', '#3e3c50'); shard(p, 16, 12, 3, '#4e4c62', '#34324a'); }, // stalagmites
    (p) => { shard(p, 12, 16, 3, '#6ae0d8', '#2fa8a0'); shard(p, 8, 9, 2, '#9ff3ea', '#3fbfb4'); }, // a glowing crystal
  ],
  'Murky Swamp': [
    (p) => lanternPost(p, '#3a2e22', '#b8e070', '#f0ffc0'), // a will-o'-lamp
    (p) => { p(11, B - 22, '#3a2e22', 2, 22); p(7, B - 18, '#3a2e22', 4, 1); p(6, B - 21, '#3a2e22', 1, 3); p(13, B - 14, '#3a2e22', 5, 1); p(17, B - 17, '#3a2e22', 1, 3); }, // a dead sapling
  ],
  'Craggy Mountains': [
    (p) => pine(p, '#2e5a3a', '#1e4a2e', '#f4f8fc'),
    (p) => { p(8, B - 4, '#8a8a9a', 8, 4); p(9, B - 8, '#9a9aaa', 6, 4); p(10, B - 11, '#aaaabc', 4, 3); p(10, B - 12, '#f4f8fc', 4, 1); }, // a cairn
  ],
  'Endless Sky': [
    (p) => lanternPost(p, '#c8a040', '#fff0a0', '#ffffff'), // a golden lamp
    (p) => { disc(p, 12, B - 6, 6, '#ffffff'); disc(p, 7, B - 4, 4, '#f0f4fc'); disc(p, 17, B - 4, 4, '#e4ecf8'); }, // a cloud puff
  ],
  'Mushroom Grotto': [
    (p) => shroom(p, 12, 14, 8, '#d8c8e8', '#b4508a', '#f8c8e8'),
    (p) => { shroom(p, 8, 7, 4, '#c8b8d8', '#6a3aa8', '#c8a8f0'); shroom(p, 16, 10, 5, '#c8b8d8', '#3a8a9a', '#9ff3ea'); },
  ],
  'Crystal Caverns': [
    (p) => { shard(p, 12, 24, 4, '#c8b8ff', '#7a5ad8'); shard(p, 7, 12, 3, '#a8e8ff', '#5a9ad8'); shard(p, 17, 15, 3, '#d8ccff', '#8a6ae8'); },
    (p) => { shard(p, 12, 10, 5, '#a890f0', '#5a44b0'); },
  ],
  'Clockwork Spire': [
    (p) => lanternPost(p, '#6a5030', '#ffc860', '#fff0c0'), // a gas lamp
    (p) => { disc(p, 12, B - 12, 9, '#a8803a'); disc(p, 12, B - 12, 6, '#c8a050'); disc(p, 12, B - 12, 2, '#4a3418'); for (let a = 0; a < 8; a++) p(12 + Math.round(Math.cos(a * Math.PI / 4) * 10) - 1, B - 12 + Math.round(Math.sin(a * Math.PI / 4) * 10) - 1, '#a8803a', 3, 3); p(10, B - 3, '#6a5030', 5, 3); }, // a gear on a stand
  ],
  'Sunken Ruins': [
    (p) => { p(8, B - 20, '#5a7a7a', 8, 20); p(7, B - 2, '#4a6a6a', 10, 2); p(8, B - 20, '#7a9a9a', 2, 20); p(9, B - 22, '#5a7a7a', 3, 2); p(13, B - 21, '#5a7a7a', 3, 1); p(15, B - 12, '#3a8a5a', 1, 6); }, // a broken column
    (p) => { for (const [x, h] of [[8, 12], [11, 16], [14, 10], [16, 13]]) { p(x, B - h, '#e8708a', 2, h); p(x - 1, B - h, '#f8a0b8', 1, 2); } }, // coral
  ],
  Dreamwood: [
    (p) => lanternPost(p, '#8a78b0', '#ffb070', '#fff0b0'),
    (p) => { p(11, B - 14, '#a898c8', 2, 14); disc(p, 12, B - 18, 6, '#ffc8e8'); disc(p, 9, B - 16, 3, '#a8d8ff'); }, // a candy tree
  ],
  'Mirror Lake': [
    (p) => { shard(p, 12, 20, 3, '#e8f4ff', '#a8c8e8'); shard(p, 8, 10, 2, '#d8ecff', '#98b8d8'); }, // an ice spire
    (p) => { for (const [x, h] of [[7, 10], [10, 14], [14, 12], [17, 8]]) p(x, B - h, '#8aa8b8', 1, h); }, // frosted reeds
  ],
  'Starfall Observatory': [
    (p) => { // a telescope on a tripod
      for (const dx of [-5, 0, 5]) for (let y = 0; y < 12; y++) p(12 + Math.round((dx * y) / 12), B - 12 + y, '#6a5a3a');
      for (let i = 0; i < 12; i++) p(6 + i, B - 13 - Math.round(i * 0.7), i > 8 ? '#e8c860' : '#8a8aa8', 2, 3);
    },
    (p) => { p(7, B - 10, '#3a3a5a', 10, 10); p(8, B - 9, '#d8c890', 8, 6); p(9, B - 8, '#3a3a7a', 1, 1); p(12, B - 6, '#3a3a7a', 1, 1); p(14, B - 8, '#3a3a7a', 1, 1); }, // a star chart on an easel
  ],
  'Ember Wastes': [
    (p) => { for (const [x, h] of [[9, 14], [13, 18], [16, 9]]) { p(x, B - h, '#3a2420', 2, h); p(x, B - h, '#ff7a30', 1, 2); } p(7, B - 2, '#2a1a18', 12, 2); }, // charred stumps
    (p) => { disc(p, 12, B - 5, 6, '#4a2e26'); p(8, B - 6, '#ff8a3a', 2, 1); p(12, B - 8, '#ffc060', 1, 1); p(14, B - 4, '#ff6a2a', 3, 1); }, // a glowing cinder rock
  ],
  'Old Keep': [
    (p) => { p(8, B - 18, '#6a6670', 8, 18); p(8, B - 18, '#8a8690', 2, 18); for (const x of [8, 11, 14]) p(x, B - 20, '#6a6670', 2, 2); p(11, B - 12, '#2a2630', 2, 4); }, // a crenellated pillar
    (p) => { p(11, B - 24, '#4a3a2a', 1, 24); p(12, B - 23, '#a83a3a', 8, 9); p(12, B - 19, '#e8c060', 8, 1); p(12, B - 14, '#7a2a2a', 4, 1); }, // a tattered banner
  ],
  'Chapel Spire': [
    (p) => lanternPost(p, '#5a4a3a', '#fff0b0', '#ffffff'), // a candle stand
    (p) => { p(11, B - 20, '#d8d0c0', 3, 20); p(7, B - 16, '#d8d0c0', 11, 3); p(11, B - 20, '#f4ecdc', 1, 20); p(9, B - 2, '#a89880', 7, 2); }, // a stone cross
  ],
  'Sky Reef': [
    (p) => { for (const [x, h] of [[8, 12], [11, 18], [15, 14]]) { p(x, B - h, '#ff8a9a', 2, h); p(x - 1, B - h, '#ffc8d0', 1, 3); p(x + 2, B - h + 4, '#ff8a9a', 2, 1); } }, // pink coral
    (p) => { disc(p, 12, B - 6, 6, '#ffffff'); disc(p, 12, B - 7, 3, '#7ad8f0'); p(9, B - 1, '#c8e8f8', 7, 1); }, // a cloud anemone
  ],
  'Frozen Summit': [
    (p) => pine(p, '#2a4a50', '#1a3a40', '#ffffff'),
    (p) => { shard(p, 12, 16, 4, '#e8f8ff', '#9ac8e8'); shard(p, 7, 8, 2, '#d8f0ff', '#8ab8d8'); disc(p, 12, B - 1, 7, '#ffffff'); }, // an ice spike in a drift
  ],
  'Void Garden': [
    (p) => { p(11, B - 12, '#3a1a5a', 2, 12); for (let a = 0; a < 6; a++) disc(p, 12 + Math.round(Math.cos(a) * 4), B - 15 + Math.round(Math.sin(a) * 4), 2, '#8a4ad8'); disc(p, 12, B - 15, 2, '#f0d8ff'); }, // a void blossom
    (p) => { shard(p, 12, 14, 3, '#5a2a8a', '#2a0e4a'); p(11, B - 16, '#d8a0ff'); }, // an obelisk shard
  ],
};

/** An area's props (areas without their own use Classic's). */
export const propsFor = (area: string): Prop[] => PROPS[area] ?? PROPS.Classic;

/** Which prop (if any) stands on the exposed top tile at grid cell (tx, ty). */
export function propAt(area: string, tx: number, ty: number): number | null {
  if (hash(tx, ty, 77) >= PROP_CHANCE) return null;
  return Math.floor(hash(ty, tx, 78) * propsFor(area).length);
}
