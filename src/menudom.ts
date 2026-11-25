import { game } from './state';
import { menu, menuKey, menuTap, menuText } from './menu';
import { stylist, stylistTap } from './stylist';
import { settingsTap, settingsUi } from './settings';
import { actionFor, capture, normalize } from './input';

/* ============================================================
   MENU INPUT (browser only)
   Keys are captured while the menu is open, so the game never
   sees them. Typing goes through one hidden <input>, focused
   while a text row is being edited, so phones open their
   keyboard and desktop typing, paste and backspace all work.
   ============================================================ */

const NAV: Record<string, string> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  Enter: 'enter', Escape: 'escape',
};

export function bindMenu(canvas: HTMLCanvasElement): void {
  const input = document.createElement('input');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocapitalize', 'characters');
  input.spellcheck = false;
  // invisible but focusable (display:none can't take focus or open a keyboard)
  input.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;border:0;padding:0;pointer-events:none';
  canvas.parentElement!.appendChild(input);

  let editing: string | null = null;
  /** Keep the hidden input's focus in step with the row being edited. */
  const syncField = (): void => {
    if (menu.edit === editing) return;
    editing = menu.edit;
    if (editing) {
      input.value = editing === 'code' ? menu.code : menu.name;
      input.focus();
    } else input.blur();
  };

  input.addEventListener('input', () => { menuText(input.value); input.value = menu.edit === 'code' ? menu.code : menu.name; });

  addEventListener('keydown', (e) => {
    if (!menu.open || capture.fn) return; // a key being bound goes to input.ts
    e.stopPropagation(); // the game's input never sees menu keys
    // the attack key (Z unless rebound) confirms, like in the game (see input.ts)
    const k = !menu.edit && actionFor(normalize(e)) === 'z' ? 'enter' : NAV[e.key];
    // while typing, letters (z included) go to the field; only Enter, Esc and Up/Down navigate
    if (menu.edit && !['Enter', 'Escape', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    if (!k) return;
    e.preventDefault();
    menuKey(k);
    syncField();
  }, true);

  canvas.addEventListener('pointerdown', (e) => {
    if (!menu.open) return;
    const b = canvas.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width * game.view.w, y = (e.clientY - b.top) / b.height * game.view.h;
    if (stylist.open) stylistTap(x, y, game.view.w, game.view.h);
    else if (settingsUi.open) settingsTap(x, y, game.view.w, game.view.h);
    else menuTap(x, y);
    // focus inside the tap's own handler: mobile only opens a keyboard for a user gesture
    syncField();
    if (menu.edit) e.preventDefault();
  });
  // a click on the (unfocusable) canvas would otherwise blur the field being typed in
  canvas.addEventListener('mousedown', (e) => { if (menu.open && menu.edit) e.preventDefault(); });
}
