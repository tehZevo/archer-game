// The Web Audio voices every sound is layered from: oscillators (with pitch
// sweeps, vibrato and detune) and filtered noise (with sweeps and flutter),
// each through an optional filter and drive into its own envelope. Everything
// runs into one compressor so a pile of hits glues together instead of
// clipping. No assets. The AudioContext is made lazily on the first sound
// (which follows a user gesture), so autoplay policies don't mute it.

import { settings, VOLUME_MAX } from './settings';

/** A filter on a voice, optionally swept from f to `to` over its length. */
export interface Filt { type: BiquadFilterType; f: number; to?: number; q?: number }
interface Base {
  dur: number; vol: number;
  /** seconds after now the voice starts */
  at?: number;
  /** seconds to reach full volume (a swell); a hit is near-instant */
  attack?: number;
  filter?: Filt;
  /** waveshaper drive (0..1): grit and punch */
  drive?: number;
  /** amplitude flutter in Hz (wing beats, crumbling, rattles) */
  flutter?: number;
}
export interface Osc extends Base {
  type: OscillatorType; f: number;
  /** the pitch it sweeps to (exponentially) */
  to?: number;
  /** [rate Hz, depth Hz] */
  vib?: [number, number];
  /** cents: a second copy this far off, for a thick chorus */
  detune?: number;
}
export type Noise = Base;

const hasAudio = typeof window !== 'undefined';
let ac: AudioContext | null = null;
let bus: AudioNode | null = null;
let noiseBuf: AudioBuffer | null = null;
const curves = new Map<number, Float32Array<ArrayBuffer>>();

function ctx(): AudioContext | null {
  if (!hasAudio || settings.sound <= 0) return null;
  if (!ac) {
    ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 5;
    comp.attack.value = 0.003; comp.release.value = 0.12;
    comp.connect(ac.destination);
    bus = comp;
  }
  return ac;
}

/** One second of white noise, shared by every noise voice. */
function noiseBuffer(a: AudioContext): AudioBuffer {
  if (noiseBuf) return noiseBuf;
  noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

/** A soft-clip curve: more drive, more grit. */
function curve(drive: number): Float32Array<ArrayBuffer> {
  const k = Math.round(drive * 100);
  let c = curves.get(k);
  if (!c) {
    c = new Float32Array(256);
    const amt = 1 + k / 4;
    for (let i = 0; i < 256; i++) { const x = i / 127.5 - 1; c[i] = Math.tanh(x * amt) / Math.tanh(amt); }
    curves.set(k, c);
  }
  return c;
}

/** Wire a source through its filter, drive, flutter and envelope to the bus. */
function chain(a: AudioContext, src: AudioNode, v: Base, t0: number): void {
  let node = src;
  if (v.filter) {
    const fl = a.createBiquadFilter();
    fl.type = v.filter.type;
    fl.frequency.setValueAtTime(v.filter.f, t0);
    if (v.filter.to) fl.frequency.exponentialRampToValueAtTime(v.filter.to, t0 + v.dur);
    fl.Q.value = v.filter.q ?? 1;
    node = node.connect(fl);
  }
  if (v.drive) {
    const ws = a.createWaveShaper();
    ws.curve = curve(v.drive);
    node = node.connect(ws);
  }
  if (v.flutter) {
    // tremolo: a gain wobbling between 0.15 and 1
    const trem = a.createGain(), lfo = a.createOscillator(), depth = a.createGain();
    trem.gain.value = 0.575; depth.gain.value = 0.425;
    lfo.frequency.value = v.flutter; lfo.type = 'square';
    lfo.connect(depth).connect(trem.gain);
    lfo.start(t0); lfo.stop(t0 + v.dur + 0.05);
    node = node.connect(trem);
  }
  const g = a.createGain(), vol = v.vol * (settings.sound / VOLUME_MAX), atk = v.attack ?? 0.003;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(v.dur, atk + 0.01));
  node.connect(g).connect(bus!);
}

/** A pitched voice. */
export function osc(v: Osc): void {
  const a = ctx();
  if (!a) return;
  const t0 = a.currentTime + (v.at ?? 0);
  for (const cents of v.detune ? [-v.detune, v.detune] : [0]) {
    const o = a.createOscillator();
    o.type = v.type;
    o.detune.value = cents;
    o.frequency.setValueAtTime(v.f, t0);
    if (v.to) o.frequency.exponentialRampToValueAtTime(v.to, t0 + v.dur);
    if (v.vib) {
      const lfo = a.createOscillator(), depth = a.createGain();
      lfo.frequency.value = v.vib[0]; depth.gain.value = v.vib[1];
      lfo.connect(depth).connect(o.frequency);
      lfo.start(t0); lfo.stop(t0 + v.dur + 0.05);
    }
    chain(a, o, v.detune ? { ...v, vol: v.vol * 0.6 } : v, t0);
    o.start(t0); o.stop(t0 + v.dur + 0.05);
  }
}

/** A burst of filtered noise: thuds, cracks, whooshes, crumbles. */
export function noise(v: Noise): void {
  const a = ctx();
  if (!a) return;
  const t0 = a.currentTime + (v.at ?? 0);
  const s = a.createBufferSource();
  s.buffer = noiseBuffer(a);
  s.loop = true;
  s.playbackRate.value = 0.8 + Math.random() * 0.4; // no two bursts quite alike
  chain(a, s, v, t0);
  s.start(t0, Math.random() * 0.5); s.stop(t0 + v.dur + 0.05);
}

/** A struck-metal clank: inharmonic partials (a bar's modes) over a sharp tick. */
export function clank(f: number, vol: number, at = 0, dur = 0.35): void {
  noise({ at, dur: 0.03, vol: vol * 0.9, filter: { type: 'highpass', f: 2500 } });
  [1, 2.76, 5.4, 8.93].forEach((m, i) =>
    osc({ at, type: i ? 'sine' : 'triangle', f: f * m, to: f * m * 0.985, dur: dur / (1 + i * 0.5), vol: vol / (1 + i * 0.6) }));
}

/** Rate limit: at most `max` sounds under `key` per `ms` window, so a
 *  six-target, eight-hit volley doesn't stack 48 voices on one frame. */
const recent = new Map<string, number[]>();
export function allow(key: string, max: number, ms: number): boolean {
  const now = Date.now(), list = (recent.get(key) ?? []).filter((t) => now - t < ms);
  if (list.length >= max) { recent.set(key, list); return false; }
  list.push(now);
  recent.set(key, list);
  return true;
}
