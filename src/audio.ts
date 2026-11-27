// UI and gameplay sounds, layered from synth.ts's voices. Enemies' hits and
// deaths live in mobvoices.ts.

import { MOB_TYPES } from './config';
import { mobDeath, mobHit } from './mobvoices';
import { allow, noise, osc } from './synth';

export { MOB_SOUNDS } from './mobvoices';

/** A variant (a Blue Crab) without a voice of its own sounds like its parent. */
const voiced = (name: string): string => MOB_TYPES.find((t) => t.n === name)?.of ?? name;

/** The old one-oscillator blip, for the small UI sounds. */
const tone = (f: number, dur: number, type: OscillatorType, vol: number, to?: number, at = 0): void =>
  osc({ type, f, to, dur, vol, at });

/** Level up: not a jingle but an event. A sub boom and a crack hit at once,
 *  a wind rushes upward, and a wide, detuned power chord swells open behind
 *  it (a filter sweeping up) over a shimmer, then rings out. */
function levelUp(): void {
  // the hit
  osc({ type: 'sine', f: 150, to: 34, dur: 0.8, vol: 0.6, drive: 0.5 });
  noise({ dur: 0.45, vol: 0.4, filter: { type: 'lowpass', f: 1400, to: 120 }, drive: 0.4 });
  noise({ dur: 0.07, vol: 0.3, filter: { type: 'highpass', f: 3500 } });
  // the rush upward
  noise({ dur: 0.75, vol: 0.26, attack: 0.55, filter: { type: 'bandpass', f: 250, to: 5500, q: 2.5 } });
  // the swell: A, E, A, E stacked, opening up
  for (const f of [110, 165, 220, 330]) {
    osc({ at: 0.04, type: 'sawtooth', f, dur: 1.7, vol: 0.09, attack: 0.3, detune: 9, filter: { type: 'lowpass', f: 300, to: 4200, q: 3 } });
  }
  osc({ at: 0.04, type: 'sine', f: 55, dur: 1.5, vol: 0.22, attack: 0.25 }); // the floor under it
  // the shimmer as it peaks
  noise({ at: 0.35, dur: 1.2, vol: 0.1, attack: 0.3, filter: { type: 'highpass', f: 6500 }, flutter: 14 });
  osc({ at: 0.4, type: 'sine', f: 1760, dur: 1.1, vol: 0.05, attack: 0.2, vib: [6, 12], detune: 14 });
}

export const sfx = {
  shoot: (): void => tone(660, 0.12, 'square', 0.14, 880),
  jump: (): void => tone(420, 0.16, 'sine', 0.16, 720),
  /** Skyward Assault's leap: a rising blade of wind whooshing up, over a snap. */
  assaultRise: (): void => {
    noise({ dur: 0.3, vol: 0.32, filter: { type: 'bandpass', f: 500, to: 5000, q: 2 } });
    noise({ dur: 0.05, vol: 0.25, filter: { type: 'highpass', f: 3000 } });
    osc({ type: 'sawtooth', f: 180, to: 720, dur: 0.22, vol: 0.06, filter: { type: 'lowpass', f: 1800 } });
  },
  /** A strike in the air: a punchy bang, a thump under a crack. */
  assaultBang: (): void => {
    if (!allow('assaultBang', 2, 60)) return;
    osc({ type: 'sine', f: 140, to: 50, dur: 0.18, vol: 0.4, drive: 0.4 });
    noise({ dur: 0.16, vol: 0.32, filter: { type: 'lowpass', f: 2600, to: 300 }, drive: 0.3 });
    noise({ dur: 0.04, vol: 0.22, filter: { type: 'highpass', f: 4000 } });
  },
  /** The last strike slashing back down: a falling whoosh into a heavy boom. */
  assaultSlam: (): void => {
    noise({ dur: 0.2, vol: 0.3, filter: { type: 'bandpass', f: 4500, to: 500, q: 2 } });
    osc({ at: 0.08, type: 'sine', f: 110, to: 35, dur: 0.45, vol: 0.55, drive: 0.5 });
    noise({ at: 0.08, dur: 0.35, vol: 0.35, filter: { type: 'lowpass', f: 1600, to: 120 }, drive: 0.4 });
    noise({ at: 0.08, dur: 0.05, vol: 0.25, filter: { type: 'highpass', f: 3500 } });
  },
  /** A Gale Stream shot: an airy whip of wind and a light bowstring snap,
   *  short enough to run at eight a second without smearing. */
  gale: (): void => {
    noise({ dur: 0.07, vol: 0.16, filter: { type: 'bandpass', f: 1800, to: 6500, q: 3 } });
    osc({ type: 'triangle', f: 1250, to: 700, dur: 0.045, vol: 0.07 });
  },
  glide: (): void => tone(300, 0.22, 'triangle', 0.18, 560),
  /** Rush Toss: a low forward heave — a thump under a short rush of air. */
  rushToss: (): void => {
    osc({ type: 'sine', f: 180, to: 60, dur: 0.25, vol: 0.3, drive: 0.3 });
    noise({ dur: 0.18, vol: 0.22, filter: { type: 'lowpass', f: 1800, to: 400 } });
  },
  /** Electric Blitz: a crackling charge that snaps forward. */
  blitz: (): void => {
    osc({ type: 'sawtooth', f: 1400, to: 400, dur: 0.18, vol: 0.14, filter: { type: 'highpass', f: 800 } });
    noise({ dur: 0.12, vol: 0.2, filter: { type: 'highpass', f: 4000 } });
  },
  /** Meteor Dive: a falling whistle that lands with a weight. */
  meteorDive: (): void => {
    osc({ type: 'sawtooth', f: 900, to: 200, dur: 0.3, vol: 0.18, filter: { type: 'lowpass', f: 3000 } });
    noise({ dur: 0.25, vol: 0.2, filter: { type: 'bandpass', f: 3000, to: 600, q: 2 } });
  },
  /** Piercing Leap: a rising spike of air as you launch. */
  piercingLeap: (): void => {
    osc({ type: 'triangle', f: 300, to: 900, dur: 0.25, vol: 0.18 });
    noise({ dur: 0.15, vol: 0.16, filter: { type: 'bandpass', f: 1200, to: 3000, q: 2 } });
  },
  /** Rising Arrows: a light volley lifting upward. */
  risingArrows: (): void => {
    osc({ type: 'triangle', f: 500, to: 1100, dur: 0.22, vol: 0.16 });
    noise({ dur: 0.12, vol: 0.14, filter: { type: 'highpass', f: 2000 } });
  },
  /** Cyclone Sweep: a swirling 360° whoosh. */
  cyclone: (): void => {
    noise({ dur: 0.4, vol: 0.24, attack: 0.2, filter: { type: 'bandpass', f: 400, to: 3000, q: 3 }, flutter: 18 });
  },
  /** Ember Rain: arrows raining straight down. */
  emberRain: (): void => {
    noise({ dur: 0.3, vol: 0.2, filter: { type: 'highpass', f: 1500, to: 5000 } });
    osc({ type: 'triangle', f: 700, to: 300, dur: 0.2, vol: 0.12 });
  },
  /** Tempest: a wide storm that booms as it sweeps out. */
  tempest: (): void => {
    osc({ type: 'sine', f: 90, to: 40, dur: 0.6, vol: 0.45, drive: 0.5 });
    noise({ dur: 0.5, vol: 0.3, filter: { type: 'bandpass', f: 600, to: 4000, q: 2 }, flutter: 10 });
  },
  /** Bolt Flurry: a rapid crack of a multi-arrow burst. */
  flurry: (): void => {
    osc({ type: 'square', f: 880, to: 1320, dur: 0.1, vol: 0.16 });
    noise({ dur: 0.08, vol: 0.18, filter: { type: 'highpass', f: 3000 } });
  },
  hit: (): void => tone(220, 0.08, 'square', 0.12, 140),
  /** Each enemy's own impact (see mobvoices.ts): a slime and a golem should not sound the same. */
  mobHit: (name: string): void => mobHit(voiced(name)),
  /** Each enemy's own death; an elite or a boss lands with a boom. */
  mobDeath: (name: string, big = false): void => mobDeath(voiced(name), big),
  levelUp,
  /** A quest handed in: a short bright reward chime. */
  reward: (): void => { tone(523, 0.12, 'triangle', 0.2); tone(784, 0.18, 'triangle', 0.2, undefined, 0.11); },
  portal: (): void => tone(330, 0.3, 'sine', 0.2, 990),
  coin: (): void => { tone(988, 0.06, 'square', 0.1); tone(1319, 0.14, 'square', 0.1, undefined, 0.055); },
};
