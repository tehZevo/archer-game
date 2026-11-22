import { joinRoom } from 'trystero';
import type { UserState } from '@trystero-p2p/core';
import { game, player } from './state';

/** A remote Archer, rendered as a translucent ghost (no shared combat). */
export interface Ghost { x: number; y: number; face: number; }

/** Players per channel; a full channel spills into the next one. */
export const MAX_PER_CHANNEL = 20;

// One room per floor; players spread across numbered channels.
const APP_ID = 'tehZevo/archer-game';
export const roomId = (floor: number, channel: number) => `eurekaland-f${floor}-c${channel}`;

/** Live map of everyone in the current channel (excluding us). */
export const peers = new Map<string, Ghost>();
export const net = { channel: 1, floor: 0, joined: false };

type Room = ReturnType<typeof joinRoom>;
let room: Room | null = null;
// Trystero's signed per-user store: we own it, peers read it.
let pos: UserState<Ghost> | null = null;

function connect(channel: number): void {
  room?.leave();
  peers.clear();
  net.channel = channel;
  net.floor = game.floor.number;
  // identity: 'none' gives each tab its own userId; the default persists one
  // per browser, so two tabs in a profile would share a slot and overwrite
  // each other's positions.
  room = joinRoom({ appId: APP_ID, maxUsers: MAX_PER_CHANNEL, identity: 'none' }, roomId(net.floor, channel));
  pos = room.makeUserState<Ghost>('pos', { x: player.x, y: player.y, face: player.face });
  pos.onChange((val, meta) => {
    if (meta.self) return;
    if (meta.removed || !val) peers.delete(meta.userId);
    else peers.set(meta.userId, val);
  });
  // A full room (we joined it empty) means everyone is in it: hop to the next.
  room.onError((err) => {
    if (err.code === 'room-full' && !Object.keys(room!.getPeers()).length) connect(channel + 1);
  });
  room.onPeerJoin((ctx) => {
    const got = pos?.getAll()[ctx.userId];
    if (got) peers.set(ctx.userId, got);
  });
  room.onPeerLeave((ctx) => peers.delete(ctx.userId));
  net.joined = true;
}

/** Network update rate: 10/s is plenty smooth for ghosts, for now. */
const SEND_MS = 100;
let lastSent = 0;

/** Publish our position; call every frame, sends at ~10 Hz. */
export function sync(): void {
  // changing floors moves us to that floor's rooms, keeping the channel number
  if (!room || game.floor.number !== net.floor) connect(net.channel);
  const now = performance.now();
  if (now - lastSent < SEND_MS) return;
  lastSent = now;
  pos?.set({ x: Math.round(player.x), y: Math.round(player.y), face: player.face });
}
