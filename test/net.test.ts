import { describe, expect, it } from 'vitest';
import { ingest, INTERP_MS, newTrack, Recorder, SEND_MS, view, type Packet } from '../src/ghost';

describe('ghosts (other players)', () => {
  // A sender walks right at 60 px/s for 2s at 60 fps, jumping for the second
  // half. Its clock runs 5s ahead of ours, and packets take 80ms to arrive.
  const LATENCY = 80;
  function sendTwoSeconds(): { packets: Packet[]; track: ReturnType<typeof newTrack> } {
    const recorder = new Recorder(), track = newTrack(), packets: Packet[] = [];
    for (let frame = 0; frame <= 120; frame++) {
      const t = frame * (1000 / 60);
      const packet = recorder.tick(t + 5000, 100 + t * 0.06, 200, 60, 0, frame > 60 ? 'jump' : 'walk', 1);
      if (packet) {
        packets.push(packet);
        ingest(track, packet, t + LATENCY);
      }
    }
    return { packets, track };
  }

  it('send a few packets a second, each carrying several samples', () => {
    const { packets } = sendTwoSeconds();
    const perSecond = packets.length / 2;
    expect(perSecond).toBeGreaterThanOrEqual(3);
    expect(perSecond).toBeLessThanOrEqual(4);
    expect(packets.slice(1).every((p) => p.s.length >= 2)).toBe(true);
    expect(SEND_MS).toBeGreaterThan(100); // fewer than 10 a second
  });

  it('play back where the sender was, delayed by the interpolation time plus latency', () => {
    const { track } = sendTwoSeconds();
    const wantX = 100 + (1500 - INTERP_MS - LATENCY) * 0.06;
    expect(Math.abs(view(track, 1500)!.x - wantX)).toBeLessThan(3);
  });

  it('move smoothly between samples, with no jumps', () => {
    const { track } = sendTwoSeconds();
    const xs = [0, 1, 2, 3, 4].map((i) => view(track, 1400 + i * 16)!.x);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeGreaterThan(xs[i - 1]);
      expect(xs[i] - xs[i - 1]).toBeLessThan(2);
    }
  });

  it('play the pose back along with the motion', () => {
    const { track } = sendTwoSeconds();
    expect(view(track, 600)!.pose).toBe('walk');
    expect(view(track, 2000)!.pose).toBe('jump');
  });
});
