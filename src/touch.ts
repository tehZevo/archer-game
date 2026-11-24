import { setKey } from './input';
import { openChat } from './chatdom';

/** A touch control: a label and the input id it drives. */
interface Pad { id: string; label: string; }

const MOVE: Pad[] = [
  { id: 'left', label: '◀' },
  { id: 'right', label: '▶' },
];
const CLIMB: Pad[] = [
  { id: 'up', label: '▲' },
  { id: 'down', label: '▼' },
];
const SKILLS: Pad[] = [
  { id: 'c', label: 'C' },
  { id: 'd', label: 'D' },
  { id: 'z', label: 'Z' },
  { id: 'q', label: 'Q' },
  { id: 'w', label: 'W' },
  { id: 'e', label: 'E' },
  { id: 'r', label: 'R' },
  { id: 'x', label: 'X' },
  { id: 'a', label: 'A' },
  { id: 's', label: 'S' },
  { id: 'escape', label: 'II' },
  { id: 'chat', label: '…' },
];

function pad(p: Pad, cls: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'tbtn ' + cls;
  el.textContent = p.label;
  // the chat button opens the chat line (focus must happen in the tap itself for the phone keyboard)
  const down = p.id === 'chat'
    ? (e: Event) => { e.preventDefault(); openChat(); }
    : (e: Event) => { e.preventDefault(); setKey(p.id, true); };
  const up = (e: Event) => { e.preventDefault(); setKey(p.id, false); };
  el.addEventListener('touchstart', down, { passive: false });
  el.addEventListener('touchend', up);
  el.addEventListener('touchcancel', up);
  // Mouse fallback so it's testable on desktop too.
  el.addEventListener('mousedown', down);
  el.addEventListener('mouseup', up);
  return el;
}

/** Build the on-screen touch overlay (cross D-pad + skill buttons). */
export function buildTouch(): void {
  const root = document.createElement('div');
  root.id = 'touch';

  // Cross-shaped D-pad: touch and hold a direction.
  const dpad = document.createElement('div');
  dpad.className = 'dpad';
  dpad.appendChild(pad(CLIMB[0], 'up'));
  dpad.appendChild(pad(MOVE[0], 'left'));
  dpad.appendChild(pad(MOVE[1], 'right'));
  dpad.appendChild(pad(CLIMB[1], 'down'));

  const left = document.createElement('div');
  left.className = 'tgroup';
  left.appendChild(dpad);

  const right = document.createElement('div');
  right.className = 'tgroup skills';
  SKILLS.forEach((s) => right.appendChild(pad(s, 'skill')));

  root.appendChild(left);
  root.appendChild(right);
  document.body.appendChild(root);
}
