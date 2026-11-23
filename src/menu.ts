import { net, newCode, parseCode, CODE_LEN } from './net';
import { clearSave, hasSave, saving } from './save';

/* ============================================================
   MAIN MENU
   A title screen over the (frozen) world. Play joins the public
   channels; a private instance is a 5-letter code that everyone in
   the group enters (or opens via the share link, #CODE in the URL).
   ============================================================ */

export const menu = { open: true };

/** Build the menu; `start` runs once the player picks how to play. */
export function buildMenu(start: () => void): void {
  const stage = document.getElementById('stage')!;
  const el = document.createElement('div');
  el.id = 'menu';
  el.innerHTML = `
    <div class="mcard">
      <div class="mtitle">THE ARCHER</div>
      <div class="msub">Climb the tower</div>
      <button class="mbtn primary" data-act="play">Play</button>
      <div class="mhead">Private instance</div>
      <div class="mrow">
        <input class="mcode" maxlength="${CODE_LEN}" placeholder="CODE" spellcheck="false" autocomplete="off">
        <button class="mbtn" data-act="join">Join</button>
      </div>
      <button class="mbtn" data-act="create">Create new code</button>
      <div class="mnote">Share the code (or this page's link) so friends land in the same instance.</div>
      ${hasSave() ? '<button class="mbtn mreset" data-act="reset">Reset progress</button>' : ''}
    </div>`;
  stage.appendChild(el);

  const input = el.querySelector<HTMLInputElement>('.mcode')!;
  const note = el.querySelector<HTMLElement>('.mnote')!;
  const fromHash = parseCode(location.hash.slice(1));
  if (fromHash) input.value = fromHash;

  const go = (code: string): void => {
    net.code = code;
    history.replaceState(null, '', code ? `#${code}` : location.pathname + location.search);
    menu.open = false;
    el.remove();
    removeEventListener('keydown', onKey, true);
    start();
  };
  const join = (): void => {
    const c = parseCode(input.value);
    if (c) go(c);
    else { note.textContent = `A code is ${CODE_LEN} letters.`; input.focus(); }
  };

  el.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest('[data-act]')?.getAttribute('data-act');
    if (act === 'play') go('');
    if (act === 'join') join();
    if (act === 'reset' && confirm('Erase your saved progress and start over at Lv.1?')) {
      saving.enabled = false; clearSave(); location.reload();
    }
    if (act === 'create') { input.value = newCode(); note.textContent = `Code ${input.value}: share it, then Join.`; }
  });
  input.addEventListener('input', () => { input.value = input.value.toUpperCase().replace(/[^A-Z]/g, ''); });

  // Keyboard: Enter joins the code in the box (e.g. from a share link), or
  // plays public if it's empty. Captured so the game's key handler doesn't
  // swallow typing or scroll the page.
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') { e.preventDefault(); if (input.value) join(); else go(''); }
    e.stopPropagation();
  };
  addEventListener('keydown', onKey, true);
}
