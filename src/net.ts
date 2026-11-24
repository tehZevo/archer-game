import { joinRoom } from 'trystero';
import type { UserState } from '@trystero-p2p/core';
import { game, player } from './state';
import { isTown } from './world';
import { devTag } from './dev';
import { remoteKills, resetBoost, takeBatch } from './boost';
import { ingest, newTrack, Recorder, type GhostTrack, type Packet, type Pose } from './ghost';
import { cleanName, clearShots, myName, queueShot, tintFor, type ShotMsg } from './presence';
import { addChat, cleanChat, clearBubbles, SELF } from './chat';

/** Players per channel; a full channel spills into the next one. */
export const MAX_PER_CHANNEL = 20;

// One room per floor; players spread across numbered channels.
const APP_ID = 'tehZevo/archer-game';
/** Public rooms are per floor + channel; a private instance (net.code) is one room per floor. */
export const roomId = (floor: number, channel: number, code = net.code, area = net.area, hour = net.hour): string =>
  (code ? `eurekaland-f${floor}-p${code}` : `eurekaland-f${floor}-c${channel}`) + areaTag(area) + hourTag(floor, hour) + devTag();
/* Rooms by hour: a floor's rooms are tagged with the UTC hour you entered
   it (e.g. -h2026112414), so peers left over from earlier sessions are left
   behind. The hour is fixed when you join a floor's room (through a portal,
   or starting play): if it turns while you're on a floor you stay put, and
   your next portal takes you into the new hour's rooms. Towns have no hour,
   so everyone passing through meets there. (The lobby, counts only, has none.) */
/** The UTC hour stamp for a time: YYYYMMDDHH. */
export const hourStamp = (ms: number): string => new Date(ms).toISOString().slice(0, 13).replace(/[-T]/g, '');
const hourTag = (floor: number, hour: string): string => (hour && !isTown(floor) ? `-h${hour}` : '');
/** Area suffix: none for the first area (its original ids); every other area,
 *  and its own town, has its own rooms. */
const areaTag = (area: number): string => (area > 0 ? `-a${area}` : '');

/* ---------------- private instances ---------------- */
/** Letters for instance codes: no I or O, which read as 1 and 0. */
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const CODE_LEN = 5;

/** A fresh random 5-letter instance code. */
export function newCode(): string {
  const r = new Uint32Array(CODE_LEN);
  crypto.getRandomValues(r);
  return [...r].map((n) => CODE_ABC[n % CODE_ABC.length]).join('');
}

/** Normalise user input to a valid code, or '' if it isn't one. */
export function parseCode(s: string): string {
  const c = s.toUpperCase().replace(/[^A-Z]/g, '');
  return c.length === CODE_LEN ? c : '';
}

/** Live map of everyone in the current channel (excluding us): buffered motion for playback. */
export const peers = new Map<string, GhostTrack>();
/** Display names of the players in `peers`, by peer id. */
export const names = new Map<string, string>();
/** Players in this channel or instance, you included. */
export const playerCount = (): number => peers.size + 1;
export const net = {
  channel: 1, floor: 0, joined: false,
  /** Private instance code ('' = public channels). */
  code: '',
  /** Nothing connects until the player starts from the main menu. */
  started: false,
  /** Why multiplayer is off, if it is ('' = fine). */
  offline: '',
  /** The area (branch of the tower) you're in: an index into AREAS (world.ts). */
  area: 0,
  /** The UTC hour stamp of the floor room we're in (see hourStamp). */
  hour: '',
};

type Room = ReturnType<typeof joinRoom>;

/* ---------------- lobby ----------------
   One small room shared by everyone (menu or playing): each player posts
   the public floor + channel they're on, so the menu can show how busy
   each channel is. Nobody appears as a ghost here; it's counts only. */
/** (dev sessions get their own lobby, see dev.ts) */
const lobbyId = (): string => 'eurekaland-lobby' + devTag();
export const LOBBY_MAX = 100;
interface At { f: number; c: number }
let lobby: Room | null = null;
let lobbyAt: UserState<At> | null = null;
let posted = '';

/* The two things a browser needs for multiplayer, each checked once.
   Trystero signs identities with WebCrypto (secure pages only) and talks to
   peers over WebRTC (some Firefox builds ship it off). */
const hasWebCrypto = (): boolean => typeof globalThis.crypto?.subtle?.generateKey === 'function';
/** Firefox's WebRTC lives under both names; some builds only define one. */
const hasWebRTC = (): boolean =>
  typeof RTCPeerConnection !== 'undefined' ||
  typeof (globalThis as { mozRTCPeerConnection?: unknown }).mozRTCPeerConnection !== 'undefined';

/** True when the browser can actually connect; on false, net.offline says
 *  why and the menu shows "local only" instead of the channel picker. */
export function canConnect(): boolean {
  const why = hasWebCrypto() ? (hasWebRTC() ? '' : 'NO WEBRTC') : 'NEEDS HTTPS'; // console/netStatus text
  if (!why) return true;
  if (!net.offline) console.warn('[net] multiplayer is off:', why);
  net.offline = why;
  return false;
}

export function joinLobby(): void {
  if (lobby || !canConnect()) return;
  try {
    lobby = joinRoom({ appId: APP_ID, maxUsers: LOBBY_MAX, identity: 'none' }, lobbyId());
    lobbyAt = lobby.makeUserState<At>('at', { f: 0, c: 0 });
    lobby.onError((err) => console.warn('[net] lobby error:', err.code, err.message, err));
    lobby.onPeerJoin((ctx) => log('lobby peer joined', ctx.userId.slice(0, 8)));
    log('joined the lobby');
  } catch (e) { console.warn('[net] lobby failed', e); lobby = null; lobbyAt = null; }
}

/** Players on each public channel of a floor, as the lobby reports them. */
export function lobbyCounts(floor: number): Map<number, number> {
  const m = new Map<number, number>();
  for (const v of Object.values(lobbyAt?.getAll() ?? {})) {
    if (!v || v.f !== floor || !(v.c > 0) || v.c > 99) continue;
    m.set(v.c, (m.get(v.c) ?? 0) + 1);
  }
  return m;
}

/** Post where we are (public channels only; a private instance posts nothing). */
function postLobby(): void {
  const at: At = net.started && !net.code ? { f: net.floor, c: net.channel } : { f: 0, c: 0 };
  const key = `${at.f}:${at.c}`;
  if (key !== posted && lobbyAt) { posted = key; lobbyAt.set(at); }
}
let room: Room | null = null;
// Trystero's signed per-user store: we own it, peers read it.
let pos: UserState<Packet> | null = null;
let sendKills: ((n: number) => Promise<void>) | null = null;
let sendShot: ((s: ShotMsg) => Promise<void>) | null = null;
let sendChat: ((s: string) => Promise<void>) | null = null;
const rec = new Recorder();

/** Network log lines go to the console, prefixed so they're easy to filter. */
const log = (...a: unknown[]): void => { if (typeof console !== 'undefined') console.info('[net]', ...a); };

function receive(id: string, p: Packet): void {
  let tr = peers.get(id);
  if (!tr) { peers.set(id, (tr = newTrack())); log('first position from', id.slice(0, 8)); }
  ingest(tr, p, performance.now());
}

function connect(channel: number): void {
  room?.leave();
  peers.clear();
  names.clear();
  clearShots();
  clearBubbles();
  resetBoost();
  net.channel = channel;
  // a new floor takes the current hour; a channel hop on the same floor keeps it
  if (net.floor !== game.floor.number || !net.hour) net.hour = hourStamp(Date.now());
  net.floor = game.floor.number;
  // identity: 'none' gives each tab its own userId; the default persists one
  // per browser, so two tabs in a profile would share a slot and overwrite
  // each other's positions.
  room = joinRoom({ appId: APP_ID, maxUsers: MAX_PER_CHANNEL, identity: 'none' }, roomId(net.floor, channel));
  log('joining', roomId(net.floor, channel));
  pos = room.makeUserState<Packet>('pos', { t: Math.round(performance.now()), f: player.face, s: [[0, Math.round(player.x), Math.round(player.y), 0, 0, 0]] });
  pos.onChange((val, meta) => {
    if (meta.self) return;
    if (meta.removed || !val) peers.delete(meta.userId);
    else receive(meta.userId, val);
  });
  // names travel in their own user state: set once, not with every motion packet
  const who = room.makeUserState<{ n: string }>('who', { n: myName() });
  who.onChange((val, meta) => {
    if (meta.self) return;
    if (meta.removed || !val) names.delete(meta.userId);
    else names.set(meta.userId, cleanName(val.n));
  });
  // A full room (we joined it empty) means everyone is in it: hop to the next.
  // (Private instances have nowhere to spill to: the 21st player just sees nobody.)
  room.onError((err) => {
    console.warn('[net] room error:', err.code, err.message, err);
    if (err.code === 'room-full' && !net.code && !Object.keys(room!.getPeers()).length) connect(channel + 1);
  });
  // kills are broadcast in batches; each peer's waves speed up (see boost.ts)
  const kills = room.makeAction<number>('kills');
  kills.onMessage((n) => remoteKills(n));
  sendKills = kills.send;
  // every released shot is its own message, so back-to-back shots all show
  const shots = room.makeAction<ShotMsg>('shot');
  shots.onMessage((s, ctx) => queueShot(peers.get(ctx.userId), s, performance.now()));
  sendShot = shots.send;
  // chat lines go to everyone in the room (see chat.ts)
  const chatMsg = room.makeAction<string>('chat');
  chatMsg.onMessage((s, ctx) =>
    addChat(ctx.userId, names.get(ctx.userId) ?? '?', cleanChat(s), tintFor(ctx.userId), performance.now()));
  sendChat = chatMsg.send;
  room.onPeerJoin((ctx) => {
    log('peer joined', ctx.userId.slice(0, 8), 'has position:', !!pos?.getAll()[ctx.userId]);
    const got = pos?.getAll()[ctx.userId];
    if (got) receive(ctx.userId, got);
    const n = who.getAll()[ctx.userId]?.n;
    if (n) names.set(ctx.userId, cleanName(n));
  });
  room.onPeerLeave((ctx) => { log('peer left', ctx.userId.slice(0, 8)); peers.delete(ctx.userId); names.delete(ctx.userId); clearBubbles(ctx.userId); });
  net.joined = true;
}

/** Say something: it shows in our own log and bubble, and goes to the room. */
export function say(raw: string): void {
  const text = cleanChat(raw);
  if (!text) return;
  addChat(SELF, myName(), text, '#ffffff', performance.now());
  if (net.started && peers.size) sendChat?.(text).catch(() => {});
}

/** Tell the channel we released a shot (muzzle at x,y; tracer len px). */
export function netShot(x: number, y: number, face: number, len: number): void {
  if (!net.started || !peers.size) return;
  sendShot?.({ t: Math.round(performance.now()), x: Math.round(x), y: Math.round(y), f: face, l: Math.round(len) }).catch(() => {});
}

/** A snapshot of the connection, for the console: `archer.netStatus()`. */
export function netStatus(): Record<string, unknown> {
  return {
    started: net.started, offline: net.offline, room: room ? roomId(net.floor, net.channel) : null,
    connectedPeers: room ? Object.keys(room.getPeers()).length : 0,
    ghosts: peers.size, names: [...names.values()],
    lobbyPeers: lobby ? Object.keys(lobby.getPeers()).length : 0,
    lobbyCounts: Object.fromEntries(lobbyCounts(net.floor || 1)),
  };
}

/** The pose peers should see: an active skill animation wins over movement. */
export function localPose(): Pose {
  if (player.cast === 'shoot' || player.cast === 'rush' || player.cast === 'barrage') return player.cast;
  return player.animState;
}

/** Record our motion; call every frame. Sends a few samples per packet, ~3x a second (see ghost.ts). */
export function sync(): void {
  // changing floors moves us to that floor's rooms, keeping the channel number
  if (!net.started || !canConnect()) return;
  if (!room || game.floor.number !== net.floor) connect(net.channel);
  postLobby();
  const p = rec.tick(performance.now(), player.x, player.y, player.vx, player.vy, localPose(), player.face);
  if (p) pos?.set(p);
  const k = takeBatch(performance.now());
  if (k && peers.size) sendKills?.(k).catch(() => {});
}
