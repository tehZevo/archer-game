import { game } from './state';
import { menu } from './menu';
import { shop } from './economy';
import { dev } from './dev';
import { say } from './net';
import { chat, CHAT_MAX } from './chat';

/* ============================================================
   CHAT INPUT (browser only)
   Enter in play opens the chat line: typing goes into a hidden
   <input> (so phones get a keyboard, and paste/backspace work) and
   the game sees none of those keys. Enter sends, Esc cancels.
   ============================================================ */
let opener: (() => void) | null = null;
/** Open the chat line (the touch chat button; call inside the tap's own handler so phones show a keyboard). */
export function openChat(): void {
  if (!menu.open && !game.pause && !shop.open && !dev.open && !chat.typing) opener?.();
}

export function bindChat(canvas: HTMLCanvasElement): void {
  const input = document.createElement('input');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocapitalize', 'characters');
  input.maxLength = CHAT_MAX;
  input.spellcheck = false;
  input.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;border:0;padding:0;pointer-events:none';
  canvas.parentElement!.appendChild(input);

  const open = (): void => { chat.typing = true; chat.draft = ''; input.value = ''; input.focus(); };
  opener = open;
  const close = (): void => { chat.typing = false; chat.draft = ''; input.blur(); };

  input.addEventListener('input', () => { chat.draft = input.value.slice(0, CHAT_MAX); });
  // losing focus (clicking away, switching tabs) cancels the line
  input.addEventListener('blur', () => { if (chat.typing) close(); });

  addEventListener('keydown', (e) => {
    // (a key the menu already handled, e.g. the Enter that starts the game, isn't ours)
    if (menu.open || e.defaultPrevented) return;
    if (!chat.typing) {
      if (e.key === 'Enter' && !game.pause && !shop.open && !dev.open) {
        e.preventDefault(); e.stopPropagation();
        open();
      }
      return;
    }
    e.stopPropagation(); // the game's input never sees what's typed
    if (e.key === 'Enter') { e.preventDefault(); say(chat.draft); close(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  }, true);
}
