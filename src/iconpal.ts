/** The skill icons' palette: one character per colour in a glyph grid
 *  (see icons.ts). '.' and unknown characters are transparent. */
export const PAL: Record<string, string> = {
  o: '#0d1424', // glyph outline
  x: '#dfe7f2', // silver shaft
  a: '#8fd6ff', // cyan glow
  A: '#3f9fdc', // deep cyan
  g: '#ffd166', // gold
  G: '#c9952f', // dark gold
  w: '#c8944a', // wood
  W: '#8a5f2a', // dark wood
  L: '#c8a06a', // rope tan
  e: '#7ef29a', // green
  E: '#2fa85f', // dark green
  r: '#ff9f6b', // orange
  R: '#e0552f', // red
  p: '#c9a6ff', // violet
  s: '#f2d0a9', // skin (boot cuff)
  b: '#7a5232', // boot leather
  // skill colours: each attack reads by its hue (effects use the same, fxsprites.ts)
  y: '#ffe14d', Y: '#d9a400', // Talon Dive yellow
  P: '#9b5cff', D: '#4a2390', // Piercing Leap / Trefoil Tempest purple
  k: '#ff8ad8', // Trefoil Tempest pink
  i: '#bfeeff', I: '#6cc8f5', // Skyward Assault light blue
  n: '#ff5a4a', // Cyclone Sweep red highlight
};
