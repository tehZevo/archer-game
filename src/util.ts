export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

/** Compact HUD number: plain below 1000, then 1.2K / 34.5K / 123K / 1.2M.
 *  Rounds down so a bar never reads full before it is. */
export function fmtNum(v: number): string {
  const n = Math.floor(v);
  if (n < 1000) return String(n);
  const [d, unit] = n < 1e6 ? [1e3, 'K'] : [1e6, 'M'];
  const x = n / d;
  const s = x < 100 ? (Math.floor(x * 10) / 10).toFixed(1) : String(Math.floor(x));
  return s + unit; // always one decimal under 100 (7.0K, not 7K), so the format stays steady
}
