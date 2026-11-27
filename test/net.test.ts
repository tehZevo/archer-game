import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arena, climb, dummy, ground, step } from './helpers';
import { P } from '../src/config';
import { killMob } from '../src/combat';
import { boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate } from '../src/boost';
import { canConnect, hourStamp, net, newCode, parseCode, roomId } from '../src/net';
import { game, gotoPlace, player, SPAWN_SPREAD } from '../src/state';
import { SELF } from '../src/chat';
import { cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, emoteFor, EMOTES, setEmote } from '../src/emotes';
import { setKey } from '../src/input';
import { ingest, INTERP_MS, newTrack, Recorder, SEND_MS, view, type Packet } from '../src/ghost';
import { cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor } from '../src/presence';

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

describe('private instances', () => {
  it('instance codes are 5 letters, without I or O', () => {
    expect(newCode()).toMatch(/^[A-HJ-NP-Z]{5}$/);
  });

  it('typed codes are cleaned up, and the wrong length is rejected', () => {
    expect(parseCode(' abc-de ')).toBe('ABCDE');
    expect(parseCode('ABCD')).toBe('');
    expect(parseCode('ABCDEF')).toBe('');
  });

  it('public rooms are per place and channel', () => {
    expect(roomId('woods-3', 2, '', '')).toBe('eurekaland-woods-3-c2');
  });

  it('a private instance is one room per place, whatever the channel', () => {
    expect(roomId('woods-3', 2, 'ABCDE', '')).toBe('eurekaland-woods-3-pABCDE');
    expect(roomId('woods-3', 7, 'ABCDE')).toBe(roomId('woods-3', 2, 'ABCDE'));
  });

  it('the network stays offline until the menu starts the game', () => {
    expect(net.started).toBe(false);
  });
});

describe('shared spawn boost', () => {
  beforeEach(() => {
    arena(1);
    resetBoost();
  });

  it('local kills are batched up for sending', () => {
    killMob(dummy(150, 1));
    expect(takeBatch(0)).toBe(1);
    expect(takeBatch(10)).toBe(0); // the batch was emptied
  });

  it('kills from other players speed up waves', () => {
    remoteKills(2);
    expect(waveRate()).toBeCloseTo(1 + 2 * BOOST.PER_KILL, 9);
  });

  it('a flood of kills counts as one capped batch', () => {
    remoteKills(999);
    expect(boost.level).toBeCloseTo(BOOST.MAX_BATCH * BOOST.PER_KILL, 9);
  });

  it('junk is ignored, and the boost itself is capped', () => {
    remoteKills('junk');
    expect(boost.level).toBe(0);
    remoteKills(999);
    remoteKills(999);
    expect(boost.level).toBe(BOOST.MAX);
  });

  it('a full boost brings the next wave in about half the time, then wears off', () => {
    game.floor.spawns = [{ x: 150, y: ground().y, types: ['Garden Snail'], cap: 9 } as never];
    remoteKills(999);
    remoteKills(999); // two full batches: the boost is maxed
    game.mobs = [];
    game.waveT = 0;
    step(Math.ceil((P.WAVE_EVERY / 2 + 0.5) / P.STEP));
    expect(game.mobs.length).toBeGreaterThan(0);

    step(Math.ceil(30 / P.STEP));
    expect(boost.level).toBe(0);
    expect(waveRate()).toBe(1);
  });
});

describe('presence', () => {
  it('random names fit the name tag and the pixel font', () => {
    for (let i = 0; i < 50; i++) {
      const name = randomName();
      expect(name.length).toBeGreaterThanOrEqual(5);
      expect(name.length).toBeLessThanOrEqual(NAME_MAX);
      expect(name).toMatch(/^[A-Z0-9]+$/);
    }
  });

  it('names from other players are cleaned up', () => {
    expect(cleanName('  hi there!!<b> ')).toBe('HITHEREB');
    expect(cleanName(null)).toBe('');
    expect(cleanName('x'.repeat(40)).length).toBe(NAME_MAX);
  });

  it('a player always gets the same tint, and different players mostly differ', () => {
    expect(tintFor('abc123')).toBe(tintFor('abc123'));
    const tints = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(tintFor));
    expect(tints.size).toBeGreaterThanOrEqual(4);
  });

  it('arrivals on a floor are spread around its middle', () => {
    const xs: number[] = [];
    for (let i = 0; i < 12; i++) {
      gotoPlace(climb(2));
      xs.push(player.x);
    }
    const middle = ground().x + ground().w / 2 - player.w / 2;
    expect(new Set(xs).size).toBeGreaterThan(6);
    for (const x of xs) expect(Math.abs(x - middle)).toBeLessThanOrEqual(SPAWN_SPREAD);
  });

  it('a ghost in the shoot pose spawns nothing by itself (shots arrive as messages)', () => {
    const track = newTrack();
    expect(ghostFx(track, { x: 100, y: 50, face: 1, pose: 'shoot', since: 0.3 })).toEqual([]);
  });

  it('a ghost starting Rush Toss shows its horn of light', () => {
    const track = newTrack();
    ghostFx(track, { x: 100, y: 50, face: 1, pose: 'idle', since: 0 });
    const fx = ghostFx(track, { x: 100, y: 50, face: 1, pose: 'rush', since: 0 });
    expect(fx.map((f) => f.type)).toEqual(['rush']);
  });
});

describe('ghost shots', () => {
  // each shot arrives as a message and shows once the ghost's playback reaches it
  const shot = (t: number, arrows?: number) => ({ t, x: 80, y: 40, f: 1, l: 64, n: arrows });
  const tracers = (now: number): number => dueShots(now).filter((f) => f.type === 'tracer').length;
  let track: ReturnType<typeof newTrack>;

  beforeEach(() => {
    clearShots();
    track = newTrack();
    track.offset = 1000; // their clock runs 1000ms behind ours
  });

  it('waits for the playback to reach it, then shows a muzzle flash and a tracer', () => {
    queueShot(track, shot(5000), 6000);
    const due = 5000 + 1000 + INTERP_MS;
    expect(dueShots(due - 1)).toEqual([]);
    expect(dueShots(due).map((f) => f.type).sort()).toEqual(['muzzle', 'tracer']);
  });

  it('back-to-back shots each show, each at its own time', () => {
    queueShot(track, shot(5000), 6000);
    queueShot(track, shot(5100), 6100);
    const due = 5000 + 1000 + INTERP_MS;
    expect(dueShots(due).map((f) => f.type).sort()).toEqual(['muzzle', 'tracer']);
    expect(dueShots(due + 100).map((f) => f.type).sort()).toEqual(['muzzle', 'tracer']);
  });

  it('a multi-arrow shot shows one tracer per arrow, one after another', () => {
    queueShot(track, shot(7000, 4), 8000);
    const due = 7000 + 1000 + INTERP_MS;
    expect(tracers(due)).toBe(1);
    expect(tracers(due + SHOT_GAP)).toBe(1);
    expect(tracers(due + 3 * SHOT_GAP)).toBe(2);
  });

  it('bad or flooding shot messages are capped', () => {
    queueShot(track, { t: NaN, x: 0, y: 0, f: 1, l: 1 } as never, 0);
    for (let i = 0; i < 100; i++) queueShot(undefined, { t: 0, x: 0, y: 0, f: 1, l: 1 }, 0);
    expect(dueShots(1e9).length).toBeLessThanOrEqual(80);
  });
});

describe('when multiplayer is unavailable', () => {
  const fakePeerConnection = function () {};

  beforeEach(() => {
    vi.stubGlobal('RTCPeerConnection', fakePeerConnection);
    net.offline = '';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    net.offline = '';
  });

  it('with WebCrypto and WebRTC, multiplayer can connect', () => {
    expect(canConnect()).toBe(true);
    expect(net.offline).toBe('');
  });

  it('without WebCrypto (a plain HTTP page) it stays off, and says why', () => {
    vi.stubGlobal('crypto', {});
    expect(canConnect()).toBe(false);
    expect(net.offline).toContain('HTTPS');
  });

  it('WebRTC under its Firefox name (mozRTCPeerConnection) counts', () => {
    vi.stubGlobal('RTCPeerConnection', undefined);
    vi.stubGlobal('mozRTCPeerConnection', fakePeerConnection);
    expect(canConnect()).toBe(true);
    expect(net.offline).toBe('');
  });

  it('without WebRTC (e.g. turned off in Firefox) you play alone, without a crash', () => {
    vi.stubGlobal('RTCPeerConnection', undefined);
    expect(canConnect()).toBe(false);
    expect(net.offline).toContain('WEBRTC');
  });
});

describe('emotes (F1-F7 pop a face over your head, and your ghost\'s)', () => {
  beforeEach(() => {
    arena(1);
    clearEmotes();
  });
  afterEach(() => clearEmotes());

  it('F2 shows the sad face over you, for a few seconds', () => {
    setKey('f2', true);
    step(1);
    setKey('f2', false);
    const now = performance.now();
    expect(emoteFor(SELF, now)).toBe('sad');
    expect(emoteFor(SELF, now + EMOTE_MS + 1)).toBe(null);
  });

  it('there are seven, each a 9x9 face in the emote palette', () => {
    expect(EMOTES.length).toBe(7);
    for (const e of EMOTES) {
      expect(EMOTE_ART[e].length).toBe(9);
      for (const row of EMOTE_ART[e]) {
        expect(row.length).toBe(9);
        for (const c of row) expect(c === '.' || !!EMOTE_PAL[c]).toBe(true);
      }
    }
  });

  it('emotes from the network are checked', () => {
    expect(cleanEmote(5)).toBe('love');
    expect(cleanEmote(7)).toBe(null);
    expect(cleanEmote('1')).toBe(null);
    expect(cleanEmote(-1)).toBe(null);
  });

  it('a player leaving clears their emote', () => {
    setEmote('peer', 'love', 0);
    clearEmotes('peer');
    expect(emoteFor('peer', 0)).toBe(null);
  });
});

describe('rooms by the hour', () => {
  // floors carry the UTC hour you entered them; towns never do; layouts ignore it
  it('the hour stamp is the UTC hour, as YYYYMMDDHH', () => {
    expect(hourStamp(Date.UTC(2026, 10, 24, 14, 59, 59))).toBe('2026112414');
    expect(hourStamp(Date.UTC(2026, 10, 24, 15, 0, 0))).toBe('2026112415');
  });

  it('floor rooms are tagged with it, public or private', () => {
    expect(roomId('shore-2', 2, '', '2026112414')).toBe('eurekaland-shore-2-c2-h2026112414');
    expect(roomId('shore-2', 1, 'ABCDE', '2026112414').endsWith('-pABCDE-h2026112414')).toBe(true);
  });

  it('towns have no hour tag, and neither does a floor with no hour yet', () => {
    expect(roomId('driftwood', 1, '', '2026112414')).toBe('eurekaland-driftwood-c1');
    expect(roomId('shore-2', 1, '', '')).toBe('eurekaland-shore-2-c1');
  });

  it('a floor\'s layout is the same whatever the hour', () => {
    const was = net.hour;
    const layout = (): string => JSON.stringify(game.floor.platforms.map((p) => [p.x, p.y]));
    net.hour = '2026112414';
    gotoPlace(climb(4));
    const first = layout();
    net.hour = '2026112415';
    gotoPlace(climb(4));
    net.hour = was;
    expect(layout()).toBe(first);
  });
});
