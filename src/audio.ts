// Tiny Web Audio synth for UI/gameplay sounds. No assets: each effect is a
// short oscillator + gain envelope. The AudioContext is created lazily on the
// first user gesture so autoplay policies don't mute it.

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

export const sfx = {
  shoot: (): void => tone(660, 0.12, 'square', 0.14, 880),
  jump: (): void => tone(420, 0.16, 'sine', 0.16, 720),
  glide: (): void => tone(300, 0.22, 'triangle', 0.18, 560),
  hit: (): void => tone(220, 0.08, 'square', 0.12, 140),
  levelUp: (): void => { tone(523, 0.12, 'triangle', 0.2); setTimeout(() => tone(784, 0.18, 'triangle', 0.2), 110); },
  portal: (): void => tone(330, 0.3, 'sine', 0.2, 990),
  coin: (): void => { tone(988, 0.06, 'square', 0.1); setTimeout(() => tone(1319, 0.14, 'square', 0.1), 55); },
};
