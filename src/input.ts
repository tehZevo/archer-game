const KEY_MAP: Record<string, string> = {
  arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down',
};

/** Keys we consume on keydown so the page doesn't scroll. */
const PREVENT = new Set(['a', 's', 'z', 'x', 'c', 'v', 'b', 'q', 'w', 'e', 'r', 't', 'f', 'd', 'g', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', 'enter', 'escape', '[', ']']);

const keys: Record<string, boolean> = Object.create(null);

interface KeyEv extends Event { key: string }

function normalize(e: KeyEv): string {
  const k = e.key.toLowerCase();
  return KEY_MAP[k] || k;
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    const id = normalize(e as KeyEv);
    if (!keys[id]) keys[id + '_p'] = true;
    keys[id] = true;
    if (KEY_MAP[(e as KeyEv).key.toLowerCase()] || PREVENT.has((e as KeyEv).key.toLowerCase())) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[normalize(e as KeyEv)] = false;
  });
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
