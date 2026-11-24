const KEY_MAP: Record<string, string> = {
  arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down',
};

/** Keys we consume on keydown so the page doesn't scroll. */
const PREVENT = new Set(['a', 's', 'z', 'x', 'c', 'v', 'b', 'q', 'w', 'e', 'r', 't', 'f', 'd', 'g', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', 'enter', 'escape', '[', ']', '`']);

const keys: Record<string, boolean> = Object.create(null);

interface KeyEv extends Event { key: string; code?: string }

/* Keys are matched by physical position (KeyboardEvent.code), not the typed
   letter, so the controls sit in the same place on any layout: on AZERTY
   the key in QWERTY's Z spot types W but still attacks. Ids stay the
   QWERTY names ('z', 'q', '1', ...); keyName() gives the layout's letter. */
const CODE_IDS: Record<string, string> = {
  Space: ' ', Enter: 'enter', NumpadEnter: 'enter', Escape: 'escape',
  BracketLeft: '[', BracketRight: ']', Backquote: '`',
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
};

/** The input id for a key event: by physical key where the browser says, else by the typed key. */
export function normalize(e: KeyEv): string {
  const c = e.code ?? '';
  if (/^Key[A-Z]$/.test(c)) return c.slice(3).toLowerCase();
  if (/^Digit[0-9]$/.test(c)) return c.slice(5);
  if (CODE_IDS[c]) return CODE_IDS[c];
  const k = e.key.toLowerCase();
  return KEY_MAP[k] || k;
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    const id = normalize(e as KeyEv);
    if (!keys[id]) keys[id + '_p'] = true;
    keys[id] = true;
    if (['left', 'right', 'up', 'down'].includes(id) || PREVENT.has(id)) e.preventDefault();
  });

  window.addEventListener('keyup', (e) => {
    keys[normalize(e as KeyEv)] = false;
  });
}

/* ---------------- key names for this layout ---------------- */
const layout = new Map<string, string>();
/** Learn what this keyboard layout types on each physical key (Chromium only;
 *  elsewhere labels stay the QWERTY letters). */
export async function loadLayout(): Promise<void> {
  try {
    const kb = (navigator as unknown as { keyboard?: { getLayoutMap(): Promise<Map<string, string>> } }).keyboard;
    const m = await kb?.getLayoutMap();
    m?.forEach((v, k) => layout.set(k, v));
  } catch { /* not allowed here (e.g. in an iframe): keep QWERTY labels */ }
}
/** Teach the layout by hand (tests). */
export const setLayout = (m: Record<string, string>): void => { layout.clear(); for (const k in m) layout.set(k, m[k]); };
/** The label to show for an input id: the letter this layout types there (upper-case). */
export function keyName(id: string): string {
  const code = /^[a-z]$/i.test(id) ? 'Key' + id.toUpperCase() : /^[0-9]$/.test(id) ? 'Digit' + id : '';
  return (layout.get(code) ?? id).toUpperCase();
}

/** Drive input programmatically (headless tests, console). */
export function setKey(id: string, down: boolean): void {
  const k = KEY_MAP[id.toLowerCase()] || id.toLowerCase();
  if (down && !keys[k]) keys[k + '_p'] = true;
  keys[k] = down;
}

/** True for exactly one physics step after the key goes down. */
export function pressed(id: string): boolean {
  return !!keys[id.toLowerCase() + '_p'];
}

export function held(id: string): boolean {
  return !!keys[id];
}

export function clearPressed(): void {
  for (const k in keys) if (k.endsWith('_p')) keys[k] = false;
}

/** Menu key repeat: a held key fires once on press, again after REPEAT_DELAY,
 *  then every REPEAT_RATE seconds. */
export const REPEAT_DELAY = 0.35, REPEAT_RATE = 0.08;
const repT: Record<string, number> = Object.create(null);
/** Like pressed(), but keeps firing while the key is held (call once per step). */
export function repeated(id: string, dt: number): boolean {
  const k = id.toLowerCase();
  if (pressed(k)) { repT[k] = REPEAT_DELAY; return true; }
  if (!held(k)) { repT[k] = 0; return false; }
  repT[k] = (repT[k] ?? REPEAT_DELAY) - dt;
  if (repT[k] > 0) return false;
  repT[k] += REPEAT_RATE;
  return true;
}
