import { joinRoom } from 'trystero';
import type { UserState } from '@trystero-p2p/core';
import { game, player } from './state';
import { ingest, newTrack, Recorder, type GhostTrack, type Packet, type Pose } from './ghost';

/** Players per channel; a full channel spills into the next one. */
export const MAX_PER_CHANNEL = 20;

// One room per floor; players spread across numbered channels.
const APP_ID = 'tehZevo/archer-game';
export const roomId = (floor: number, channel: number) => `eurekaland-f${floor}-c${channel}`;

/** Live map of everyone in the current channel (excluding us): buffered motion for playback. */
export const peers = new Map<string, GhostTrack>();
export const net = { channel: 1, floor: 0, joined: false };

type Room = ReturnType<typeof joinRoom>;
let room: Room | null = null;
// Trystero's signed per-user store: we own it, peers read it.
let pos: UserState<Packet> | null = null;
const rec = new Recorder();

function receive(id: string, p: Packet): void {
  let tr = peers.get(id);
  if (!tr) peers.set(id, (tr = newTrack()));
  ingest(tr, p, performance.now());
}

function connect(channel: number): void {
  room?.leave();
  peers.clear();
  net.channel = channel;
  net.floor = game.floor.number;
  // identity: 'none' gives each tab its own userId; the default persists one
  // per browser, so two tabs in a profile would share a slot and overwrite
  // each other's positions.
  room = joinRoom({ appId: APP_ID, maxUsers: MAX_PER_CHANNEL, identity: 'none' }, roomId(net.floor, channel));
  pos = room.makeUserState<Packet>('pos', { t: Math.round(performance.now()), f: player.face, s: [[0, Math.round(player.x), Math.round(player.y), 0, 0, 0]] });
  pos.onChange((val, meta) => {
    if (meta.self) return;
    if (meta.removed || !val) peers.delete(meta.userId);
    else receive(meta.userId, val);
  });
  // A full room (we joined it empty) means everyone is in it: hop to the next.
  room.onError((err) => {
    if (err.code === 'room-full' && !Object.keys(room!.getPeers()).length) connect(channel + 1);
  });
  room.onPeerJoin((ctx) => {
    const got = pos?.getAll()[ctx.userId];
    if (got) receive(ctx.userId, got);
  });
  room.onPeerLeave((ctx) => peers.delete(ctx.userId));
  net.joined = true;
}

/** The pose peers should see: an active skill animation wins over movement. */
export function localPose(): Pose {
  if (player.cast === 'shoot' || player.cast === 'rush' || player.cast === 'barrage') return player.cast;
  return player.animState;
}

/** Record our motion; call every frame. Sends a few samples per packet, ~3x a second (see ghost.ts). */
export function sync(): void {
  // changing floors moves us to that floor's rooms, keeping the channel number
  if (!room || game.floor.number !== net.floor) connect(net.channel);
  const p = rec.tick(performance.now(), player.x, player.y, player.vx, player.vy, localPose(), player.face);
  if (p) pos?.set(p);
}
