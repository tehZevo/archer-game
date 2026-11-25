// Tiny Web Audio synth for UI/gameplay sounds. No assets: each effect is a
// short oscillator + gain envelope. The AudioContext is created lazily on the
// first user gesture so autoplay policies don't mute it.

import { MOB_TYPES } from './config';
import { settings, VOLUME_MAX } from './settings';

let ac: AudioContext | null = null;
const hasAudio = typeof window !== 'undefined';

function ctx(): AudioContext | null {
  if (!ac) ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return ac;
}

function tone(freq: number, dur: number, type: OscillatorType, vol = 0.2, slideTo?: number): void {
  if (!hasAudio || settings.sound <= 0) return;
  vol *= settings.sound / VOLUME_MAX; // the SOUND setting
  const a = ctx();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}

/** Each mob type's impact voice: pitch, length, waveform and the pitch it
 *  drops to. Tuned per enemy so a multi-hit stack sounds like the thing you're
 *  hitting. Types not listed use the stock hit. */
export const MOB_SOUNDS: Record<string, { f: number; d: number; t: OscillatorType; s: number }> = {
  'Garden Snail': { f: 300, d: 0.07, t: 'triangle', s: 190 },
  'Enemy Crab': { f: 180, d: 0.06, t: 'square', s: 90 },
  'Hermit Crab': { f: 150, d: 0.09, t: 'square', s: 70 },
  'Gull': { f: 620, d: 0.05, t: 'sawtooth', s: 480 },
  'Boar': { f: 130, d: 0.1, t: 'sawtooth', s: 60 },
  'Wisp': { f: 880, d: 0.09, t: 'sine', s: 1320 },
  'Iron Hog': { f: 95, d: 0.12, t: 'square', s: 55 },
  'Beetle': { f: 420, d: 0.05, t: 'square', s: 300 },
  'Rabbit': { f: 520, d: 0.06, t: 'triangle', s: 700 },
  'Bee': { f: 980, d: 0.04, t: 'sawtooth', s: 760 },
  'Frog': { f: 240, d: 0.08, t: 'sine', s: 420 },
  'Otter': { f: 340, d: 0.07, t: 'triangle', s: 240 },
  'Goat': { f: 400, d: 0.08, t: 'sawtooth', s: 260 },
  'Slime': { f: 200, d: 0.1, t: 'sine', s: 120 },
  'Bat': { f: 1100, d: 0.04, t: 'sawtooth', s: 800 },
  'Skeleton': { f: 260, d: 0.07, t: 'square', s: 160 },
  'Spider': { f: 560, d: 0.05, t: 'square', s: 400 },
  'Ghost': { f: 700, d: 0.14, t: 'sine', s: 420 },
  'Scorpion': { f: 300, d: 0.06, t: 'square', s: 150 },
  'Turtle': { f: 170, d: 0.09, t: 'triangle', s: 110 },
  'Wolf': { f: 380, d: 0.08, t: 'sawtooth', s: 220 },
  'Snake': { f: 480, d: 0.06, t: 'sine', s: 300 },
  'Golem': { f: 80, d: 0.14, t: 'square', s: 45 },
  'Imp': { f: 760, d: 0.05, t: 'square', s: 520 },
  'Troll': { f: 110, d: 0.12, t: 'sawtooth', s: 65 },
  'Mushroom': { f: 340, d: 0.07, t: 'triangle', s: 200 },
  'Cave Bug': { f: 640, d: 0.04, t: 'square', s: 460 },
  'Crab': { f: 180, d: 0.06, t: 'square', s: 90 },
  'Hawk': { f: 700, d: 0.05, t: 'sawtooth', s: 520 },
  'Rock Crawler': { f: 140, d: 0.09, t: 'square', s: 80 },
  'Mushling': { f: 360, d: 0.07, t: 'triangle', s: 220 },
  'Spore Puff': { f: 440, d: 0.06, t: 'sine', s: 300 },
  'Crystal Golem': { f: 520, d: 0.1, t: 'triangle', s: 340 },
  'Shard Bat': { f: 1000, d: 0.04, t: 'sawtooth', s: 720 },
  'Ruin Guardian': { f: 120, d: 0.11, t: 'square', s: 70 },
  'Jellyfish': { f: 480, d: 0.08, t: 'sine', s: 360 },
  'Windup Soldier': { f: 280, d: 0.06, t: 'square', s: 200 },
  'Clockwork Bird': { f: 820, d: 0.04, t: 'square', s: 640 },
  'Dream Moth': { f: 900, d: 0.06, t: 'sine', s: 1100 },
  'Shadow Fox': { f: 320, d: 0.07, t: 'sawtooth', s: 200 },
  'Reflection': { f: 600, d: 0.09, t: 'sine', s: 460 },
  'Ice Wisp': { f: 940, d: 0.08, t: 'sine', s: 1400 },
  'Star Sprite': { f: 1040, d: 0.06, t: 'sine', s: 1500 },
  'Meteor Golem': { f: 100, d: 0.12, t: 'sawtooth', s: 60 },
  'Void Blossom': { f: 380, d: 0.08, t: 'triangle', s: 260 },
  'Null Wraith': { f: 660, d: 0.13, t: 'sine', s: 400 },
  'Ember Crawler': { f: 260, d: 0.07, t: 'sawtooth', s: 170 },
  'Toadstool': { f: 330, d: 0.07, t: 'triangle', s: 210 },
  'Quartz Golem': { f: 500, d: 0.1, t: 'triangle', s: 330 },
  'Ruin Sentinel': { f: 115, d: 0.11, t: 'square', s: 68 },
  'Blue Jelly': { f: 500, d: 0.08, t: 'sine', s: 380 },
  'Windup Captain': { f: 270, d: 0.06, t: 'square', s: 190 },
  'Ghost Fox': { f: 340, d: 0.09, t: 'sine', s: 230 },
  'Dark Reflection': { f: 580, d: 0.09, t: 'sine', s: 440 },
  'Comet Golem': { f: 105, d: 0.12, t: 'sawtooth', s: 62 },
  'Thorn Blossom': { f: 390, d: 0.07, t: 'triangle', s: 270 },
  'Red Snail': { f: 310, d: 0.07, t: 'triangle', s: 200 },
  'Blue Crab': { f: 190, d: 0.06, t: 'square', s: 95 },
  'Wild Boar': { f: 135, d: 0.1, t: 'sawtooth', s: 62 },
  'Storm Gull': { f: 640, d: 0.05, t: 'sawtooth', s: 500 },
  'Horned Beetle': { f: 430, d: 0.05, t: 'square', s: 310 },
  'Brown Hare': { f: 530, d: 0.06, t: 'triangle', s: 710 },
  'Poison Frog': { f: 250, d: 0.08, t: 'sine', s: 430 },
  'Ram': { f: 410, d: 0.08, t: 'sawtooth', s: 270 },
  'Bog Slime': { f: 210, d: 0.1, t: 'sine', s: 130 },
}

export const sfx = {
  shoot: (): void => tone(660, 0.12, 'square', 0.14, 880),
  jump: (): void => tone(420, 0.16, 'sine', 0.16, 720),
  glide: (): void => tone(300, 0.22, 'triangle', 0.18, 560),
  hit: (): void => tone(220, 0.08, 'square', 0.12, 140),
  /** Each enemy's own impact (see MOB_SOUNDS): a slime and a bat should not
   *  sound the same. Falls back to the stock hit for a mob without a voice. */
  mobHit: (name: string): void => {
    // a variant (a Blue Crab) sounds like the enemy it is a cousin of
    const base = MOB_TYPES.find((t) => t.n === name)?.of ?? name;
    const v = MOB_SOUNDS[base] ?? { f: 220, d: 0.08, t: 'square' as OscillatorType, s: 140 };
    tone(v.f, v.d, v.t, 0.12, v.s);
  },
  levelUp: (): void => { tone(523, 0.12, 'triangle', 0.2); setTimeout(() => tone(784, 0.18, 'triangle', 0.2), 110); },
  portal: (): void => tone(330, 0.3, 'sine', 0.2, 990),
  coin: (): void => { tone(988, 0.06, 'square', 0.1); setTimeout(() => tone(1319, 0.14, 'square', 0.1), 55); },
};
