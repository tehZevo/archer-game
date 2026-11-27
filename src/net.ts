import { cleanEmote, clearEmotes, EMOTES, setEmote, type Emote } from './emotes';
import { joinRoom } from 'trystero';
import type { SendOptions, UserState } from '@trystero-p2p/core';
import { game, player } from './state';
import { isTownId, placeKey, START_TOWN } from './world';
import { devTag } from './dev';
import { remoteKills, resetBoost, takeBatch } from './boost';
import { ingest, newTrack, Recorder, type GhostTrack, type Packet, type Pose } from './ghost';
import { cleanName, clearShots, myName, queueShot, tintFor, type ShotMsg } from './presence';
import { addChat, addNote, cleanChat, clearBubbles, SELF } from './chat';
import { cheered, cheersLeft, cheerTarget, CHEER, minutes, nextCheerMs, spendCheer } from './cheer';
import { cleanLook, myLook, watchLook, type Look } from './look';

/** Players per channel; a full channel spills into the next one. */
export const MAX_PER_CHANNEL = 20;

/* ---------------- room ids ----------------
   A room id is five separate concerns joined into one string:
     eurekaland-<place>-<crowd><hour><dev>
   - prefix: shared by every room this game opens
   - place:  the place key (see placeKey in world.ts)
   - crowd:  a public channel (c2) or a private instance code (pABCDE);
             a private instance is one room per place, whatever the channel
   - hour:   floors only, the UTC hour you entered (-h2026112414)
   - dev:    dev sessions get their own rooms (see dev.ts) */
const APP_ID = 'tehZevo/archer-game';
const ROOM_PREFIX = 'eurekaland';
const crowdTag = (channel: number, code: string): string => (code ? `p${code}` : `c${channel}`);
/* Rooms by hour: peers left over from earlier sessions are left behind.
   The hour is fixed when you join a floor's room (through a portal, or
   starting play): if it turns while you're on a floor you stay put, and
   your next portal takes you into the new hour's rooms. Towns have no hour,
   so everyone passing through meets there. (The lobby, counts only, has none.) */
const hourTag = (place: string, hour: string): string => (hour && !isTownId(place) ? `-h${hour}` : '');
/** The room for a place + channel (or instance code) + hour. */
export const roomId = (place: string, channel: number, code = net.code, hour = net.hour): string =>
  `${ROOM_PREFIX}-${place}-${crowdTag(channel, code)}${hourTag(place, hour)}${devTag()}`;
/** The UTC hour stamp for a time: YYYYMMDDHH. */
export const hourStamp = (ms: number): string => new Date(ms).toISOString().slice(0, 13).replace(/[-T]/g, '');

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

/** Everyone else in our room, as far as we've heard. Motion, name and look
 *  arrive separately (and a peer on an older version may never send a look),
 *  so each lives in its own map, keyed by peer id. */
export const roster = {
  /** Buffered motion for playback: a peer shows as a ghost once this arrives. */
  tracks: new Map<string, GhostTrack>(),
  /** Display names. */
  names: new Map<string, string>(),
  /** How each player looks (absent for players on older versions). */
  looks: new Map<string, Look>(),
  /** Drop a player who left (their bubbles and emotes too). */
  forget(id: string): void {
    roster.tracks.delete(id); roster.names.delete(id); roster.looks.delete(id);
    clearBubbles(id); clearEmotes(id);
  },
  /** Empty the roster when we change rooms. */
  clear(): void {
    roster.tracks.clear(); roster.names.clear(); roster.looks.clear();
    clearShots(); clearBubbles(); clearEmotes(); resetBoost();
  },
};
/** Players in this channel or instance, you included. */
export const playerCount = (): number => roster.tracks.size + 1;
export const net = {
  channel: 1, joined: false,
  /** The place key of the room we're in ('' before the first). */
  place: '',
  /** Private instance code ('' = public channels). */
  code: '',
  /** Nothing connects until the player starts from the main menu. */
  started: false,
  /** Why multiplayer is off, if it is ('' = fine). */
  offline: '',
  /** The UTC hour stamp of the floor room we're in (see hourStamp). */
  hour: '',
};

type Room = ReturnType<typeof joinRoom>;

/* ---------------- lobby ----------------
   One small room shared by everyone (menu or playing): each player posts
   the public place + channel they're on, so the menu can show how busy
   each channel is. Nobody appears as a ghost here; it's counts only. */
/** (dev sessions get their own lobby, see dev.ts) */
const lobbyId = (): string => 'eurekaland-lobby' + devTag();
export const LOBBY_MAX = 100;
interface At { p: string; c: number }
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
    lobbyAt = lobby.makeUserState<At>('at', { p: '', c: 0 });
    lobby.onError((err) => console.warn('[net] lobby error:', err.code, err.message, err));
    lobby.onPeerJoin((ctx) => log('lobby peer joined', ctx.userId.slice(0, 8)));
    log('joined the lobby');
  } catch (e) { console.warn('[net] lobby failed', e); lobby = null; lobbyAt = null; }
}

/** Players on each public channel of a place (by key), as the lobby reports them. */
export function lobbyCounts(place: string): Map<number, number> {
  const m = new Map<number, number>();
  for (const v of Object.values(lobbyAt?.getAll() ?? {})) {
    if (!v || v.p !== place || !(v.c > 0) || v.c > 99) continue;
    m.set(v.c, (m.get(v.c) ?? 0) + 1);
  }
  return m;
}

/** Post where we are (public channels only; a private instance posts nothing). */
function postLobby(): void {
  const at: At = net.started && !net.code ? { p: net.place, c: net.channel } : { p: '', c: 0 };
  const key = `${at.p}:${at.c}`;
  if (key !== posted && lobbyAt) { posted = key; lobbyAt.set(at); }
}
/** Our side of a name tag: set once, and again whenever your look changes. */
interface Who { n: string; l?: Look }
/** What we can send to the room. */
interface Sends {
  /** kill counts, in batches; each peer's waves speed up (see boost.ts) */
  kills: number;
  /** every released shot is its own message, so back-to-back shots all show */
  shot: ShotMsg;
  /** a chat line (see chat.ts) */
  chat: string;
  /** an index into EMOTES (see emotes.ts) */
  emote: number;
  /** a cheer, sent only to the player cheered (see cheer.ts) */
  cheer: 1;
}
/** The live connection to our current room. */
interface Link {
  room: Room;
  /** Our motion, in Trystero's signed per-user store: we own it, peers read it. */
  pos: UserState<Packet>;
  /** Our name and look, in their own store, so they don't ride every motion packet. */
  who: UserState<Who>;
  send: { [K in keyof Sends]: (v: Sends[K], o?: SendOptions) => Promise<void> };
}
let link: Link | null = null;
const rec = new Recorder();

/** Network log lines go to the console, prefixed so they're easy to filter. */
const log = (...a: unknown[]): void => { if (typeof console !== 'undefined') console.info('[net]', ...a); };

function receive(id: string, p: Packet): void {
  let tr = roster.tracks.get(id);
  if (!tr) { roster.tracks.set(id, (tr = newTrack())); log('first position from', id.slice(0, 8)); }
  ingest(tr, p, performance.now());
}

function meet(id: string, val: Who): void {
  roster.names.set(id, cleanName(val.n));
  if (val.l) roster.looks.set(id, cleanLook(val.l)); else roster.looks.delete(id);
}

/** Send to the room, if anyone's there to hear it. */
function toRoom<K extends keyof Sends>(kind: K, v: Sends[K]): void {
  if (net.started && roster.tracks.size) link?.send[kind](v).catch(() => {});
}

/** The two user states: our motion and our name tag, mirrored into the roster. */
function makeStates(room: Room): Pick<Link, 'pos' | 'who'> {
  const pos = room.makeUserState<Packet>('pos', { t: Math.round(performance.now()), f: player.face, s: [[0, Math.round(player.x), Math.round(player.y), 0, 0, 0]] });
  pos.onChange((val, meta) => {
    if (meta.self) return;
    if (meta.removed || !val) roster.tracks.delete(meta.userId);
    else receive(meta.userId, val);
  });
  const who = room.makeUserState<Who>('who', { n: myName(), l: myLook() });
  who.onChange((val, meta) => {
    if (meta.self) return;
    if (meta.removed || !val) { roster.names.delete(meta.userId); roster.looks.delete(meta.userId); }
    else meet(meta.userId, val);
  });
  watchLook((l) => who.set({ n: myName(), l }));
  return { pos, who };
}

/** The four actions, each wired to what it does when a peer sends it. */
function makeSends(room: Room): Link['send'] {
  const kills = room.makeAction<number>('kills');
  kills.onMessage((n) => remoteKills(n));
  const shot = room.makeAction<ShotMsg>('shot');
  shot.onMessage((s, ctx) => queueShot(roster.tracks.get(ctx.userId), s, performance.now()));
  const chat = room.makeAction<string>('chat');
  chat.onMessage((s, ctx) =>
    addChat(ctx.userId, roster.names.get(ctx.userId) ?? '?', cleanChat(s), tintFor(ctx.userId), performance.now()));
  const emote = room.makeAction<number>('emote');
  emote.onMessage((n, ctx) => { const k = cleanEmote(n); if (k) setEmote(ctx.userId, k, performance.now()); });
  const cheer = room.makeAction<1>('cheer');
  cheer.onMessage((_, ctx) => gotCheer(roster.names.get(ctx.userId) ?? '?'));
  return { kills: kills.send, shot: shot.send, chat: chat.send, emote: emote.send, cheer: cheer.send };
}

function connect(channel: number): void {
  link?.room.leave();
  roster.clear();
  net.channel = channel;
  // a new place takes the current hour; a channel hop on the same place keeps it
  const here = placeKey(game.floor.place);
  if (net.place !== here || !net.hour) net.hour = hourStamp(Date.now());
  net.place = here;
  // identity: 'none' gives each tab its own userId; the default persists one
  // per browser, so two tabs in a profile would share a slot and overwrite
  // each other's positions.
  const room = joinRoom({ appId: APP_ID, maxUsers: MAX_PER_CHANNEL, identity: 'none' }, roomId(net.place, channel));
  log('joining', roomId(net.place, channel));
  const l: Link = { room, ...makeStates(room), send: makeSends(room) };
  link = l;
  // A full room (we joined it empty) means everyone is in it: hop to the next.
  // (Private instances have nowhere to spill to: the 21st player just sees nobody.)
  room.onError((err) => {
    console.warn('[net] room error:', err.code, err.message, err);
    if (err.code === 'room-full' && !net.code && !Object.keys(room.getPeers()).length) connect(channel + 1);
  });
  room.onPeerJoin((ctx) => {
    const got = l.pos.getAll()[ctx.userId];
    log('peer joined', ctx.userId.slice(0, 8), 'has position:', !!got);
    if (got) receive(ctx.userId, got);
    const w = l.who.getAll()[ctx.userId];
    if (w?.n) meet(ctx.userId, w);
  });
  room.onPeerLeave((ctx) => { log('peer left', ctx.userId.slice(0, 8)); roster.forget(ctx.userId); });
  net.joined = true;
}

/** Say something: it shows in our own log and bubble, and goes to the room. */
export function say(raw: string): void {
  const who = cheerTarget(raw);
  if (who !== null) { cheerPlayer(who); return; }
  const text = cleanChat(raw);
  if (!text) return;
  addChat(SELF, myName(), text, '#ffffff', performance.now());
  toRoom('chat', text);
}

const CHEER_COL = '#ffb3e6';
const note = (text: string): void => addNote(cleanChat(text), CHEER_COL, performance.now());

/** The peer in our room going by `name`: an exact match, else the only one it starts. */
export function peerNamed(name: string): string | null {
  const want = cleanName(name);
  if (!want) return null;
  const all = [...roster.names.entries()].filter(([id]) => roster.tracks.has(id));
  const exact = all.find(([, n]) => n === want);
  if (exact) return exact[0];
  const starts = all.filter(([, n]) => n.startsWith(want));
  return starts.length === 1 ? starts[0][0] : null;
}

/** `/cheer <name>`: spend a cheer on a player in our channel. */
export function cheerPlayer(name: string): void {
  if (!name) { note(`/CHEER <PLAYER>: +${CHEER.EXP * 100}% EXP FOR THEM · ${cheersLeft()} LEFT`); return; }
  const id = peerNamed(name);
  if (!id) { note(`NO PLAYER ${cleanName(name) || name} HERE`); return; }
  if (!spendCheer()) { note(`NO CHEERS LEFT · NEXT IN ${minutes(nextCheerMs())}`); return; }
  link?.send.cheer(1, { target: id }).catch(() => {});
  note(`YOU CHEERED ${roster.names.get(id)}! ${cheersLeft()} LEFT`);
}

/** A peer cheered us. */
export function gotCheer(by: string): void {
  cheered(cleanName(by) || '?');
  note(`${cleanName(by) || '?'} CHEERED YOU! +${CHEER.EXP * 100}% EXP FOR ${minutes(CHEER.BUFF_MS)}`);
}

/** Tell the channel we released a shot (muzzle at x,y; tracer len px). */
export function netShot(x: number, y: number, face: number, len: number, n = 1): void {
  toRoom('shot', { t: Math.round(performance.now()), x: Math.round(x), y: Math.round(y), f: face, l: Math.round(len), n });
}

/** Show an emote over your head, and to the room. */
export function netEmote(kind: Emote): void {
  setEmote(SELF, kind, performance.now());
  toRoom('emote', EMOTES.indexOf(kind));
}

/** A snapshot of the connection, for the console: `archer.netStatus()`. */
export function netStatus(): Record<string, unknown> {
  return {
    started: net.started, offline: net.offline, room: link ? roomId(net.place, net.channel) : null,
    connectedPeers: link ? Object.keys(link.room.getPeers()).length : 0,
    ghosts: roster.tracks.size, names: [...roster.names.values()],
    lobbyPeers: lobby ? Object.keys(lobby.getPeers()).length : 0,
    lobbyCounts: Object.fromEntries(lobbyCounts(net.place || START_TOWN)),
  };
}

/** The pose peers should see: an active skill animation wins over movement. */
export function localPose(): Pose {
  if (player.rolling) return 'roll';
  if (player.diving) return 'dive';
  // the dive's coil holds the plunge pose; its landing roll slides like a rush
  if (player.cast === 'dive' && player.castT > 0) return player.onGround ? 'rush' : 'dive';
  if (player.skillPose && player.castT > 0) return player.skillPose;
  if (player.cast === 'rush') return 'rush';
  // the Piercing Leap / Ember Rain / Skyward Assault casts show the shoot pose too
  if (player.cast === 'shoot' || player.cast === 'barrage') return 'shoot';
  return player.animState;
}

/** Record our motion; call every frame. Sends a few samples per packet, ~3x a second (see ghost.ts). */
export function sync(): void {
  // changing floors moves us to that floor's rooms, keeping the channel number
  if (!net.started || !canConnect()) return;
  if (!link || placeKey(game.floor.place) !== net.place) connect(net.channel);
  postLobby();
  const p = rec.tick(performance.now(), player.x, player.y, player.vx, player.vy, localPose(), player.face);
  if (p) link?.pos.set(p);
  const k = takeBatch(performance.now());
  if (k) toRoom('kills', k);
}
