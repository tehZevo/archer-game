import { hasGlyph } from './font';

/* ============================================================
   TEXT CHAT
   Enter opens a line to type in (see chatdom.ts); Enter sends it to
   everyone in your room (net.ts) and Esc cancels. A message shows as a
   speech bubble over the sender's head for a few seconds, and the last
   few lines stay in a small log above the bars (all of them while you
   type). Only what the pixel font can draw survives.
   ============================================================ */
export const CHAT_MAX = 60;      // characters per message
export const LOG_KEEP = 30;      // lines remembered
export const LOG_LINES = 5;      // lines shown
export const LOG_SHOW_MS = 12000; // a line stays in the log this long (unless typing)
export const BUBBLE_CHARS = 20;  // bubble line width, in characters
/** The id our own messages are filed under (peers use their peer id). */
export const SELF = 'self';

export interface ChatLine { id: string; name: string; text: string; col: string; at: number }

export const chat = {
  typing: false,
  draft: '',
  log: [] as ChatLine[],
  /** the latest message from each sender, for their bubble */
  bubbles: new Map<string, { text: string; at: number }>(),
};

/** Upper-case, keep only drawable characters, squeeze spaces, cap the length. */
export const cleanChat = (s: unknown): string =>
  [...String(s ?? '').toUpperCase()].filter(hasGlyph).join('').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);

/** How long (ms) a bubble stays up: longer messages get longer. */
export const bubbleMs = (text: string): number => 4000 + text.length * 80;

/** File a message (already cleaned) in the log and as its sender's bubble. */
export function addChat(id: string, name: string, text: string, col: string, now: number): void {
  if (!text) return;
  chat.log.push({ id, name, text, col, at: now });
  if (chat.log.length > LOG_KEEP) chat.log.splice(0, chat.log.length - LOG_KEEP);
  chat.bubbles.set(id, { text, at: now });
}

/** A note from the game to you, in the log only (no speaker, no bubble). */
export function addNote(text: string, col: string, now: number): void {
  if (!text) return;
  chat.log.push({ id: '', name: '', text, col, at: now });
  if (chat.log.length > LOG_KEEP) chat.log.splice(0, chat.log.length - LOG_KEEP);
}

/** The bubble over a sender's head right now, as wrapped lines (null once it's expired). */
export function bubbleFor(id: string, now: number): string[] | null {
  const b = chat.bubbles.get(id);
  if (!b) return null;
  if (now - b.at > bubbleMs(b.text)) { chat.bubbles.delete(id); return null; }
  return wrap(b.text, BUBBLE_CHARS);
}

/** Log lines to show: the newest few, recent ones only unless typing. */
export function logLines(now: number): ChatLine[] {
  const recent = chat.typing ? chat.log : chat.log.filter((l) => now - l.at < LOG_SHOW_MS);
  return recent.slice(-LOG_LINES);
}

/** Word-wrap to `width` characters per line; words longer than a line are split. */
export function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (let word of text.split(' ')) {
    while (word.length > width) {
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(word.slice(0, width)); word = word.slice(width);
    }
    if (!word) continue;
    if (!cur) cur = word;
    else if (cur.length + 1 + word.length <= width) cur += ' ' + word;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Forget one sender's bubble (they left), or everyone's (we changed rooms); the log carries over. */
export function clearBubbles(id?: string): void {
  if (id === undefined) chat.bubbles.clear(); else chat.bubbles.delete(id);
}
