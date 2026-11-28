import { lookKey, LOOK_KEYS, myLook, setMyLook, stepLook, type Look } from './look';
import { offeredAt, unlockTown } from './townlooks';
import { wallet } from './economy';
import { HATS } from './hatart';

/* ============================================================
   STYLIST
   The window for changing your look. Before your character exists
   (no save yet), the main menu's LOOK row opens it to create them:
   body (female or male) plus the rest, changing live. After that the
   look is locked there, and only a town's stylist can change it: there
   you try changes on a preview, and DONE keeps them for STYLE_FEE gold
   (Esc or X walks away unchanged). The body is fixed once created.
   The HAT row is town-only: putting on a new hat costs its price on
   top of the fee (taking one off costs just the fee).
   A town's stylist also offers its own extra style or colour, which
   opening it unlocks for good (townlooks.ts). Up/Down picks a row,
   Left/Right (or Z) changes it. State and input only; see stylistdraw.ts.
   ============================================================ */

/** What a town stylist charges to keep a changed look. */
export const STYLE_FEE = 1000;

/** The rows in town (the body is fixed); creating a character adds BODY on top. */
export const STYLIST_ROWS = ['HAIR', 'HAIR COLOUR', 'SKIN', 'OUTFIT', 'HAT', 'DONE'] as const;
export const CREATE_ROWS = ['BODY', 'HAIR', 'HAIR COLOUR', 'SKIN', 'OUTFIT', 'DONE'] as const;
/** The look field each creation row changes (no hats: those come from a stylist). */
const CREATE_KEYS = ['body', 'style', 'hair', 'skin', 'outfit'] as const;

/** `town`: whose stylist this is (null: creating a character from the menu); `fresh`: how
 *  many of its extras just unlocked; `draft`: the look being tried on in town; `note`: a
 *  line under the title (e.g. not enough gold). */
export const stylist = { open: false, sel: 0, town: null as string | null, fresh: 0, draft: null as Look | null, note: '' };

export function openStylist(town: string | null = null): void {
  Object.assign(stylist, { open: true, sel: 0, town, fresh: town ? unlockTown(town) : 0, draft: town ? { ...myLook() } : null, note: '' });
}

/** The rows on show, and the look field each changes (undefined: DONE). */
export const stylistRows = (): readonly string[] => (stylist.town ? STYLIST_ROWS : CREATE_ROWS);
export const rowKey = (i: number): keyof Look | undefined => (stylist.town ? LOOK_KEYS[i] : CREATE_KEYS[i]);

/** The look the window shows: the draft in town, your own look when creating. */
export const shownLook = (): Look => stylist.draft ?? myLook();

/** Has the town draft changed from your look (so DONE costs the fee)? */
export const styleChanged = (): boolean => !!stylist.draft && lookKey(stylist.draft) !== lookKey(myLook());

/** What DONE costs: nothing if the look is unchanged, else the fee, plus the
 *  price of a new hat put on. */
export function styleCost(): number {
  if (!styleChanged()) return 0;
  const hat = stylist.draft!.hat;
  return STYLE_FEE + (hat && hat !== myLook().hat ? HATS[hat - 1].price : 0);
}

/** DONE: keep the look (in town, paying for it if it changed) and close. */
function done(): void {
  const cost = styleCost();
  if (cost) {
    if (wallet.coins < cost) { stylist.note = `NEED ${cost} GOLD`; return; }
    wallet.coins -= cost;
    setMyLook(stylist.draft!);
  }
  stylist.open = false; stylist.draft = null;
}

/** A navigation key: up, down, left, right, enter, escape. */
export function stylistKey(k: string): void {
  const n = stylistRows().length, key = rowKey(stylist.sel);
  if (k === 'up') stylist.sel = (stylist.sel + n - 1) % n;
  else if (k === 'down') stylist.sel = (stylist.sel + 1) % n;
  else if ((k === 'left' || k === 'right' || k === 'enter') && key) {
    const l = stepLook(shownLook(), key, k === 'left' ? -1 : 1, offeredAt(stylist.town));
    if (stylist.draft) stylist.draft = l; else setMyLook(l);
    stylist.note = '';
  } else if (k === 'enter') done();
  else if (k === 'escape') { stylist.open = false; stylist.draft = null; }
}

/* layout (screen space), shared with the drawing and the tap hit-test */
export const ST_W = 200, ST_H = 126, ST_ROW = 14, ST_TOP = 24, ST_ROWS_W = 136;
export const stylistBox = (w: number, h: number): { x: number; y: number } =>
  ({ x: Math.round((w - ST_W) / 2), y: Math.round((h - ST_H) / 2) });

/** A tap (view coords): on a look row, its left half steps back and its right
 *  half forward; DONE keeps the look; anywhere outside the window walks away. */
export function stylistTap(x: number, y: number, w: number, h: number): void {
  const b = stylistBox(w, h);
  if (x < b.x || x >= b.x + ST_W || y < b.y || y >= b.y + ST_H) { stylistKey('escape'); return; }
  const row = Math.floor((y - b.y - ST_TOP + 3) / ST_ROW);
  if (row < 0 || row >= stylistRows().length) return;
  const rx = x - b.x;
  if (rx >= ST_ROWS_W) return; // the preview
  stylist.sel = row;
  stylistKey(!rowKey(row) ? 'enter' : rx < ST_ROWS_W / 2 ? 'left' : 'right');
}
