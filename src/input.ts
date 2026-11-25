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

/* ---------------- rebinding ----------------
   The game reads actions by their default key's id ('z' = attack, 'a' =
   HP potion, ...). `binds` says which physical key drives each one; the
   layout is saved in localStorage. A key that's been bound away from its
   default does nothing (unless another action was moved onto it). */
export interface Action { id: string; name: string }
export const ACTIONS: Action[] = [
  { id: 'z', name: 'MAIN ATTACK' }, { id: 'c', name: 'JUMP' }, { id: 'd', name: 'GLIDE' },
  { id: 'q', name: 'SKILL Q' }, { id: 'w', name: 'SKILL W' }, { id: 'e', name: 'SKILL E' }, { id: 'r', name: 'SKILL R' },
  { id: 'x', name: 'PICK UP' }, { id: 'a', name: 'HP POTION' }, { id: 's', name: 'MP POTION' },
];
const ACTION_IDS = new Set(ACTIONS.map((a) => a.id));
/** Keys an action can be bound to: letters, digits, space and a few marks
 *  (not the arrows, Enter, Esc or the dev keys). */
export const bindable = (k: string): boolean => /^[a-z0-9]$/.test(k) || [' ', ',', '.', '/', ';', "'", '-', '='].includes(k);

const KEYS_STORE = 'archer-game:keys';
/** action id -> physical key id. */
export const binds: Record<string, string> = {};
export function defaultBinds(): void { for (const a of ACTIONS) binds[a.id] = a.id; }

/** Validate a stored layout: each action gets a bindable key, no key twice
 *  (anything else falls back to the defaults). */
export function cleanBinds(v: unknown): Record<string, string> {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const out: Record<string, string> = {}, used = new Set<string>();
  for (const a of ACTIONS) {
    const k = o[a.id];
    if (typeof k !== 'string' || !bindable(k) || used.has(k)) return Object.fromEntries(ACTIONS.map((x) => [x.id, x.id]));
    out[a.id] = k; used.add(k);
  }
  return out;
}
defaultBinds();
try { Object.assign(binds, cleanBinds(JSON.parse(localStorage.getItem(KEYS_STORE) ?? 'null') ?? Object.fromEntries(ACTIONS.map((a) => [a.id, a.id])))); } catch { /* no storage: defaults */ }
function saveBinds(): void {
  try { localStorage.setItem(KEYS_STORE, JSON.stringify(binds)); } catch { /* no storage */ }
}

/** Put an action on a physical key. Whatever action had that key takes this
 *  one's old key (a swap), so every action always has exactly one key. */
export function bindKey(action: string, key: string): boolean {
  if (!ACTION_IDS.has(action) || !bindable(key)) return false;
  const other = ACTIONS.find((a) => binds[a.id] === key && a.id !== action);
  if (other) binds[other.id] = binds[action];
  binds[action] = key;
  for (const k in keys) keys[k] = false; // nothing stays held across a rebind
  saveBinds();
  return true;
}
export function resetBinds(): void { defaultBinds(); saveBinds(); }

/** The action id a physical key drives: its bound action, nothing if it's an
 *  action's default key that was moved away, else the key itself. */
export function actionFor(phys: string): string {
  for (const a of ACTIONS) if (binds[a.id] === phys) return a.id;
  return ACTION_IDS.has(phys) ? '' : phys;
}

/** Waiting for a key to bind (the keys window): the next key goes here instead of the game. */
export const capture = { fn: null as null | ((phys: string) => void) };

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    const phys = normalize(e as KeyEv);
    // binding a key: the next fresh press (not the held key's auto-repeat) is the new key
    if (capture.fn && (e as KeyboardEvent).repeat) { e.preventDefault(); return; }
    if (capture.fn) { const f = capture.fn; capture.fn = null; e.preventDefault(); f(phys); return; }
    const id = actionFor(phys);
    if (['left', 'right', 'up', 'down'].includes(id) || PREVENT.has(id) || PREVENT.has(phys)) e.preventDefault();
    if (!id) return;
    if (!keys[id]) keys[id + '_p'] = true;
    keys[id] = true;
  });

  window.addEventListener('keyup', (e) => {
    const id = actionFor(normalize(e as KeyEv));
    if (id) keys[id] = false;
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
/** The label to show for an input id: the letter this layout types on the
 *  key bound to it (upper-case). */
export function keyName(input: string): string {
  const id = binds[input.toLowerCase()] ?? input.toLowerCase();
  if (id === ' ') return 'SPC';
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
