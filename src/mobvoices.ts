// Every enemy's voice: what it's made of (the impact your arrows make on it,
// and how it comes apart when it dies) and its cry (a grunt on each hit, a
// longer wail as it goes down). Layered from synth.ts's oscillators and
// filtered noise, in the spirit of an MMO mob's Damage/Die sounds: a weapon
// thwack over a body sound and a little vocal, never a bare beep.

import { allow, clank, noise, osc } from './synth';

/** What an enemy is made of, which decides the body of its hit and its death. */
export type Material = 'soft' | 'shell' | 'metal' | 'stone' | 'goo' | 'wing' | 'spirit' | 'crystal' | 'plant' | 'bone';

/** An enemy's voice: its cry's pitch (f, falling to s over d seconds) and
 *  waveform, and its material. Every MOB_TYPES entry has its own. */
export interface MobVoice { f: number; d: number; t: OscillatorType; s: number; m: Material }

export const MOB_SOUNDS: Record<string, MobVoice> = {
  'Garden Snail': { f: 300, d: 0.07, t: 'triangle', s: 190, m: 'shell' },
  'Enemy Crab': { f: 180, d: 0.06, t: 'square', s: 90, m: 'shell' },
  'Hermit Crab': { f: 150, d: 0.09, t: 'square', s: 70, m: 'shell' },
  'Gull': { f: 620, d: 0.05, t: 'sawtooth', s: 480, m: 'wing' },
  'Boar': { f: 130, d: 0.1, t: 'sawtooth', s: 60, m: 'soft' },
  'Wisp': { f: 880, d: 0.09, t: 'sine', s: 1320, m: 'spirit' },
  'Iron Hog': { f: 95, d: 0.12, t: 'square', s: 55, m: 'metal' },
  'Beetle': { f: 420, d: 0.05, t: 'square', s: 300, m: 'shell' },
  'Rabbit': { f: 520, d: 0.06, t: 'triangle', s: 700, m: 'soft' },
  'Bee': { f: 980, d: 0.04, t: 'sawtooth', s: 760, m: 'wing' },
  'Frog': { f: 240, d: 0.08, t: 'sine', s: 420, m: 'soft' },
  'Otter': { f: 340, d: 0.07, t: 'triangle', s: 240, m: 'soft' },
  'Goat': { f: 400, d: 0.08, t: 'sawtooth', s: 260, m: 'soft' },
  'Slime': { f: 200, d: 0.1, t: 'sine', s: 120, m: 'goo' },
  'Bat': { f: 1100, d: 0.04, t: 'sawtooth', s: 800, m: 'wing' },
  'Skeleton': { f: 260, d: 0.07, t: 'square', s: 160, m: 'bone' },
  'Spider': { f: 560, d: 0.05, t: 'square', s: 400, m: 'shell' },
  'Ghost': { f: 700, d: 0.14, t: 'sine', s: 420, m: 'spirit' },
  'Scorpion': { f: 300, d: 0.06, t: 'square', s: 150, m: 'shell' },
  'Turtle': { f: 170, d: 0.09, t: 'triangle', s: 110, m: 'shell' },
  'Wolf': { f: 380, d: 0.08, t: 'sawtooth', s: 220, m: 'soft' },
  'Snake': { f: 480, d: 0.06, t: 'sine', s: 300, m: 'soft' },
  'Golem': { f: 80, d: 0.14, t: 'square', s: 45, m: 'stone' },
  'Imp': { f: 760, d: 0.05, t: 'square', s: 520, m: 'soft' },
  'Troll': { f: 110, d: 0.12, t: 'sawtooth', s: 65, m: 'stone' },
  'Mushroom': { f: 340, d: 0.07, t: 'triangle', s: 200, m: 'plant' },
  'Cave Bug': { f: 640, d: 0.04, t: 'square', s: 460, m: 'shell' },
  'Crab': { f: 180, d: 0.06, t: 'square', s: 90, m: 'shell' },
  'Hawk': { f: 700, d: 0.05, t: 'sawtooth', s: 520, m: 'wing' },
  'Rock Crawler': { f: 140, d: 0.09, t: 'square', s: 80, m: 'stone' },
  'Mushling': { f: 360, d: 0.07, t: 'triangle', s: 220, m: 'plant' },
  'Spore Puff': { f: 440, d: 0.06, t: 'sine', s: 300, m: 'plant' },
  'Crystal Golem': { f: 520, d: 0.1, t: 'triangle', s: 340, m: 'crystal' },
  'Shard Bat': { f: 1000, d: 0.04, t: 'sawtooth', s: 720, m: 'crystal' },
  'Ruin Guardian': { f: 120, d: 0.11, t: 'square', s: 70, m: 'stone' },
  'Jellyfish': { f: 480, d: 0.08, t: 'sine', s: 360, m: 'goo' },
  'Windup Soldier': { f: 280, d: 0.06, t: 'square', s: 200, m: 'metal' },
  'Clockwork Bird': { f: 820, d: 0.04, t: 'square', s: 640, m: 'metal' },
  'Dream Moth': { f: 900, d: 0.06, t: 'sine', s: 1100, m: 'wing' },
  'Shadow Fox': { f: 320, d: 0.07, t: 'sawtooth', s: 200, m: 'soft' },
  'Reflection': { f: 600, d: 0.09, t: 'sine', s: 460, m: 'spirit' },
  'Ice Wisp': { f: 940, d: 0.08, t: 'sine', s: 1400, m: 'spirit' },
  'Star Sprite': { f: 1040, d: 0.06, t: 'sine', s: 1500, m: 'spirit' },
  'Meteor Golem': { f: 100, d: 0.12, t: 'sawtooth', s: 60, m: 'stone' },
  'Void Blossom': { f: 380, d: 0.08, t: 'triangle', s: 260, m: 'plant' },
  'Null Wraith': { f: 660, d: 0.13, t: 'sine', s: 400, m: 'spirit' },
  'Ember Crawler': { f: 260, d: 0.07, t: 'sawtooth', s: 170, m: 'shell' },
  'Toadstool': { f: 330, d: 0.07, t: 'triangle', s: 210, m: 'plant' },
  'Quartz Golem': { f: 500, d: 0.1, t: 'triangle', s: 330, m: 'crystal' },
  'Ruin Sentinel': { f: 115, d: 0.11, t: 'square', s: 68, m: 'stone' },
  'Blue Jelly': { f: 500, d: 0.08, t: 'sine', s: 380, m: 'goo' },
  'Windup Captain': { f: 270, d: 0.06, t: 'square', s: 190, m: 'metal' },
  'Ghost Fox': { f: 340, d: 0.09, t: 'sine', s: 230, m: 'spirit' },
  'Dark Reflection': { f: 580, d: 0.09, t: 'sine', s: 440, m: 'spirit' },
  'Comet Golem': { f: 105, d: 0.12, t: 'sawtooth', s: 62, m: 'stone' },
  'Thorn Blossom': { f: 390, d: 0.07, t: 'triangle', s: 270, m: 'plant' },
  'Red Snail': { f: 310, d: 0.07, t: 'triangle', s: 200, m: 'shell' },
  'Blue Crab': { f: 190, d: 0.06, t: 'square', s: 95, m: 'shell' },
  'Wild Boar': { f: 135, d: 0.1, t: 'sawtooth', s: 62, m: 'soft' },
  'Storm Gull': { f: 640, d: 0.05, t: 'sawtooth', s: 500, m: 'wing' },
  'Horned Beetle': { f: 430, d: 0.05, t: 'square', s: 310, m: 'shell' },
  'Brown Hare': { f: 530, d: 0.06, t: 'triangle', s: 710, m: 'soft' },
  'Poison Frog': { f: 250, d: 0.08, t: 'sine', s: 430, m: 'soft' },
  'Ram': { f: 410, d: 0.08, t: 'sawtooth', s: 270, m: 'soft' },
  'Bog Slime': { f: 210, d: 0.1, t: 'sine', s: 130, m: 'goo' },
  'Cinder Hound': { f: 300, d: 0.08, t: 'sawtooth', s: 150, m: 'soft' },
  'Ash Wisp': { f: 820, d: 0.08, t: 'sine', s: 1240, m: 'spirit' },
  'Armor Knight': { f: 160, d: 0.1, t: 'square', s: 90, m: 'metal' },
  'Keep Rat': { f: 900, d: 0.04, t: 'sawtooth', s: 1200, m: 'soft' },
  'Gargoyle': { f: 150, d: 0.11, t: 'sawtooth', s: 80, m: 'stone' },
  'Choir Spirit': { f: 620, d: 0.16, t: 'triangle', s: 520, m: 'spirit' },
  'Reef Ray': { f: 560, d: 0.07, t: 'sine', s: 380, m: 'wing' },
  'Coral Crawler': { f: 460, d: 0.06, t: 'triangle', s: 320, m: 'crystal' },
  'Yeti': { f: 90, d: 0.14, t: 'sawtooth', s: 50, m: 'soft' },
  'Frost Wolf': { f: 420, d: 0.09, t: 'sawtooth', s: 240, m: 'soft' },
  'Magma Hound': { f: 280, d: 0.09, t: 'sawtooth', s: 120, m: 'stone' },
  'Black Knight': { f: 130, d: 0.11, t: 'square', s: 70, m: 'metal' },
  'Bronze Gargoyle': { f: 175, d: 0.1, t: 'square', s: 95, m: 'metal' },
  'Storm Ray': { f: 600, d: 0.07, t: 'sawtooth', s: 900, m: 'wing' },
  'Ice Yeti': { f: 100, d: 0.14, t: 'triangle', s: 55, m: 'crystal' },
};

/** A small seeded random per enemy, so its clatter and shards fall the same
 *  way every time (part of what makes each death its own). */
function seeded(name: string): () => number {
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

/** The cry: the enemy's own pitch and waveform, softened by a lowpass so a
 *  square or saw reads as a voice, not a beep. Long and wavering on a death. */
function cry(v: MobVoice, vol: number, dying: boolean, at = 0): void {
  const dur = dying ? v.d * 3.5 + 0.12 : v.d;
  osc({
    at, type: v.t, f: v.f * (dying ? 1.15 : 1), to: v.s * (dying ? 0.55 : 1), dur, vol,
    vib: dying ? [9 + v.f / 200, v.f * 0.04] : undefined, attack: dying ? 0.015 : 0.004,
    filter: { type: 'lowpass', f: Math.min(5000, v.f * 4), q: 2 }, detune: dying ? 12 : undefined,
  });
}

/** The impact a hit makes on each material (the body under the arrow's thwack). */
const IMPACT: Record<Material, (v: MobVoice) => void> = {
  soft: () => {
    noise({ dur: 0.09, vol: 0.32, filter: { type: 'lowpass', f: 1100, to: 300 } });
    osc({ type: 'sine', f: 150, to: 55, dur: 0.1, vol: 0.3 });
  },
  shell: (v) => {
    noise({ dur: 0.035, vol: 0.28, filter: { type: 'bandpass', f: 3200, q: 3 } });
    osc({ type: 'square', f: v.f * 1.4, to: v.f * 0.7, dur: 0.05, vol: 0.08, filter: { type: 'lowpass', f: 2400 } });
    noise({ dur: 0.07, vol: 0.2, filter: { type: 'lowpass', f: 700 } });
  },
  metal: (v) => clank(v.f * 2.2, 0.16, 0, 0.28),
  stone: () => {
    noise({ dur: 0.14, vol: 0.38, filter: { type: 'lowpass', f: 600, to: 150 }, drive: 0.4 });
    noise({ dur: 0.05, vol: 0.18, filter: { type: 'bandpass', f: 1400, q: 2 } });
    osc({ type: 'sine', f: 110, to: 42, dur: 0.16, vol: 0.32 });
  },
  goo: () => {
    noise({ dur: 0.12, vol: 0.3, filter: { type: 'lowpass', f: 2200, to: 260, q: 6 } });
    osc({ type: 'sine', f: 320, to: 120, dur: 0.1, vol: 0.18, vib: [40, 40] });
  },
  wing: () => {
    noise({ dur: 0.1, vol: 0.24, filter: { type: 'bandpass', f: 1600, q: 1.5 }, flutter: 40 });
    osc({ type: 'sine', f: 180, to: 80, dur: 0.06, vol: 0.18 });
  },
  spirit: (v) => {
    noise({ dur: 0.14, vol: 0.18, filter: { type: 'bandpass', f: 900, to: 3500, q: 3 } });
    osc({ type: 'sine', f: v.f * 1.5, to: v.f * 2, dur: 0.12, vol: 0.08, detune: 25 });
  },
  crystal: (v) => {
    noise({ dur: 0.03, vol: 0.22, filter: { type: 'highpass', f: 5000 } });
    [1, 2.4, 3.9].forEach((m, i) => osc({ type: 'sine', f: v.f * 2 * m, dur: 0.2 / (1 + i), vol: 0.09 / (1 + i) }));
  },
  plant: () => {
    noise({ dur: 0.1, vol: 0.22, filter: { type: 'bandpass', f: 2800, q: 1.2 }, flutter: 55 });
    noise({ dur: 0.06, vol: 0.22, filter: { type: 'lowpass', f: 800 } });
  },
  bone: () => {
    noise({ dur: 0.025, vol: 0.28, filter: { type: 'bandpass', f: 2200, q: 5 } });
    noise({ at: 0.03, dur: 0.025, vol: 0.2, filter: { type: 'bandpass', f: 1700, q: 5 } });
  },
};

/** How each material comes apart (under the cry and the poof). */
const BREAK: Record<Material, (v: MobVoice, r: () => number) => void> = {
  soft: () => {
    // it collapses: a heavy flump onto the ground
    osc({ at: 0.12, type: 'sine', f: 120, to: 40, dur: 0.3, vol: 0.38 });
    noise({ at: 0.12, dur: 0.22, vol: 0.3, filter: { type: 'lowpass', f: 900, to: 160 } });
  },
  shell: (v, r) => {
    // the shell cracks and the bits clatter down
    noise({ dur: 0.08, vol: 0.32, filter: { type: 'highpass', f: 2600 }, drive: 0.3 });
    for (let i = 0; i < 4; i++) noise({ at: 0.08 + i * (0.05 + r() * 0.05), dur: 0.03, vol: 0.18 - i * 0.03, filter: { type: 'bandpass', f: 1800 + r() * 2400, q: 4 } });
    osc({ type: 'square', f: v.f * 1.2, to: v.f * 0.4, dur: 0.12, vol: 0.07, filter: { type: 'lowpass', f: 2000 } });
  },
  metal: (v, r) => {
    // gears and plates: a tumbling clank-clank-clank, a sprung coil, a fizzle
    for (let i = 0; i < 3; i++) clank(v.f * (2 - i * 0.35) * (0.9 + r() * 0.2), 0.15 - i * 0.03, i * (0.09 + r() * 0.04), 0.4);
    osc({ at: 0.05, type: 'triangle', f: 220 + r() * 120, to: 90, dur: 0.45, vol: 0.12, vib: [22, 60] });
    noise({ at: 0.1, dur: 0.45, vol: 0.12, filter: { type: 'highpass', f: 4000 }, flutter: 30 });
  },
  stone: () => {
    // a boom, then the rubble crumbling away
    osc({ type: 'sine', f: 90, to: 30, dur: 0.55, vol: 0.5, drive: 0.5 });
    noise({ dur: 0.2, vol: 0.4, filter: { type: 'lowpass', f: 1200, to: 200 }, drive: 0.5 });
    noise({ at: 0.12, dur: 0.6, vol: 0.26, filter: { type: 'bandpass', f: 700, to: 250, q: 1.5 }, flutter: 24 });
  },
  goo: (v, r) => {
    // a wet splat and a few bubbles popping as it melts
    noise({ dur: 0.22, vol: 0.38, filter: { type: 'lowpass', f: 2600, to: 180, q: 8 } });
    osc({ type: 'sine', f: v.f, to: v.f * 0.35, dur: 0.25, vol: 0.2, vib: [30, 60] });
    for (let i = 0; i < 3; i++) osc({ at: 0.15 + i * (0.07 + r() * 0.05), type: 'sine', f: 300 + r() * 300, to: 900 + r() * 400, dur: 0.05, vol: 0.12 });
  },
  wing: () => {
    // a last frantic flurry of wingbeats and a drop
    noise({ dur: 0.35, vol: 0.28, filter: { type: 'bandpass', f: 1400, to: 700, q: 1.3 }, flutter: 18 });
    osc({ at: 0.3, type: 'sine', f: 140, to: 50, dur: 0.18, vol: 0.3 });
  },
  spirit: (v) => {
    // it unravels: a whoosh up into nothing and a falling, beating shimmer
    noise({ dur: 0.6, vol: 0.24, attack: 0.15, filter: { type: 'bandpass', f: 400, to: 5000, q: 4 } });
    osc({ type: 'sine', f: v.f * 2, to: v.f * 0.5, dur: 0.7, vol: 0.1, detune: 30, vib: [6, 20] });
  },
  crystal: (v, r) => {
    // it shatters: a bright crash and shards tinkling down
    noise({ dur: 0.18, vol: 0.32, filter: { type: 'highpass', f: 3500 }, drive: 0.3 });
    for (let i = 0; i < 7; i++) osc({ at: 0.03 + r() * 0.35, type: 'sine', f: v.f * (2 + r() * 4), dur: 0.12 + r() * 0.15, vol: 0.07 });
  },
  plant: (v, r) => {
    // a rustle as it wilts and a puff of spores
    noise({ dur: 0.4, vol: 0.24, filter: { type: 'bandpass', f: 3000, to: 1200, q: 1 }, flutter: 35 + r() * 20 });
    noise({ at: 0.05, dur: 0.3, vol: 0.2, attack: 0.05, filter: { type: 'lowpass', f: 1500, to: 300 } });
    osc({ type: 'sine', f: v.f * 0.8, to: v.f * 1.6, dur: 0.06, vol: 0.12 }); // the pop
  },
  bone: (_v, r) => {
    // the bones clatter apart
    for (let i = 0; i < 6; i++) noise({ at: i * (0.035 + r() * 0.05), dur: 0.03, vol: 0.22 - i * 0.025, filter: { type: 'bandpass', f: 1200 + r() * 2000, q: 6 } });
  },
};

const STOCK: MobVoice = { f: 220, d: 0.08, t: 'square', s: 140, m: 'soft' };
const voiceOf = (name: string): MobVoice => MOB_SOUNDS[name] ?? STOCK;

/** An arrow landing on an enemy: the thwack, the body's impact, a grunt. */
export function mobHit(name: string): void {
  if (!allow('hit', 3, 45)) return;
  const v = voiceOf(name);
  noise({ dur: 0.04, vol: 0.26, filter: { type: 'bandpass', f: 1900, q: 1.2 } }); // the thwack
  IMPACT[v.m](v);
  cry(v, 0.06, false, 0.01);
}

/** An enemy dying: its wail, its material coming apart, and the poof as it
 *  vanishes. An elite or a boss goes down with a boom under it. */
export function mobDeath(name: string, big = false): void {
  if (!allow('death', 3, 80)) return;
  const v = voiceOf(name), r = seeded(name);
  cry(v, 0.1, true);
  BREAK[v.m](v, r);
  noise({ at: 0.18, dur: 0.35, vol: 0.14, attack: 0.08, filter: { type: 'bandpass', f: 600 + r() * 600, to: 2400, q: 1.2 } }); // the poof
  if (big) {
    osc({ type: 'sine', f: 70, to: 25, dur: 0.9, vol: 0.55, drive: 0.6 });
    noise({ dur: 0.5, vol: 0.35, filter: { type: 'lowpass', f: 900, to: 90 }, drive: 0.5 });
  }
}
