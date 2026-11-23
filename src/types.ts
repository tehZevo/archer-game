export type SkillKey = 'Z' | 'C' | 'D' | 'Q' | 'W' | 'E' | 'R' | 'AB' | 'S' | 'BS' | 'VS' | 'SA' | 'PP' | 'IR';

/** The four core stats, each upgraded with ability points (AP). */
export interface CoreStats {
  dex: number; // attack power
  vit: number; // max HP
  spi: number; // max MP
  luk: number; // crit chance
}
export type StatKey = keyof CoreStats;

export interface SkillDef {
  key: SkillKey;
  name: string;
  tag: string;
  desc: string;
  /** Job tier that grants this skill (1 = Archer). */
  job: number;
  /** Level at which the skill becomes learnable (every 5 levels). */
  minLevel: number;
  /** Master level in the real class. */
  maxLevel: number;
  cd: number;
  /** Stats scale linearly from the Lv.1 value to the master value. */
  mp1: number;
  mpMax: number;
  dmg1: number;
  dmgMax: number;
  hits1?: number;
  hitsMax?: number;
  /** Passive skills have no key; their effect is `bonus`, stepping from rank 1 to max. */
  passive?: boolean;
  bonus1?: number;
  bonusMax?: number;
  targets1?: number;
  targetsMax?: number;
}

export interface SkillRank {
  level: number;
  mp: number;
  /** Fractional multiplier, e.g. 1.25 for 125%. */
  dmg: number;
  hits: number;
  targets: number;
  maxLevel: number;
}

export interface PauseMenu { col: 0 | 1; row: number }

export interface JobDef {
  job: number;
  level: number;
  name: string;
  title: string;
  sp: number;
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  ground?: boolean;
  /** A slope tile (all slopes are 2:1). dir 1 rises right, -1 rises left. */
  slope?: boolean;
  dir?: 1 | -1;
  /** 2:1 slopes span two tiles side by side: part 0 = lower half (rises 0-8px),
   *  part 1 = upper half (rises 8-16px). */
  part?: 0 | 1;
  /** A tile with another tile on top of it: drawn as dirt, no grass cap. */
  inner?: boolean;
  /** Block tiles: bitmask of solid neighbours (see NB) for autotiling. */
  nb?: number;
  /** Id of the block (platform) this tile belongs to; the ground slab has none. */
  block?: number;
  /** Tile under the lower half of a slope: draws the grass band the thin
   *  slope end can't fit (dir = the slope's rise direction). */
  foot?: 1 | -1;
}

/** A rope or a ladder: a vertical climbable spanning y1 (top) to y2 (bottom). */
export interface Climbable {
  x: number;
  y1: number;
  y2: number;
}

export interface MobType {
  n: string;
  lvl: number;
  hp: number;
  w: number;
  h: number;
  spd: number;
  dmg: number;
  col: string;
  fly?: boolean;
}

/** A spawn zone: one per platform that has enemies. Waves top it up to `cap`. */
export interface Spawn {
  x: number;
  y: number;
  t: number;
  /** Surface spots (tile centres) a mob can appear on; defaults to (x, y). */
  spots?: { x: number; y: number }[];
  /** Max mobs alive from this zone at once (default 1). */
  cap?: number;
  /** Patrol bounds (the platform's walkable extent). */
  minX?: number;
  maxX?: number;
}

export interface Mob {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  home: number;
  range: number;
  dir: number;
  type: MobType;
  name: string;
  hp: number;
  hpMax: number;
  spd: number;
  dmg: number;
  fly: boolean;
  col: string;
  /** Experience awarded on death. */
  exp: number;
  stun: number;
  atkCd: number;
  /** >0 while launched by Sky Toss; grants the airborne damage bonus. */
  airTime: number;
  /** Set once the player attacks it; only then does it chase the player. */
  aggro: boolean;
  hitFlash: number;
  anim: number;
  spawn: Spawn;
}

/** Anything the ground physics apply to. x is the horizontal centre. */
export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  plat: Platform | null;
}

export interface Player extends Body {
  face: 1 | -1;
  /** Glide (double jump) charge; refilled on landing. */
  climb: Climbable | null;
  /** x of the climbable just jumped off: climbables there can't be caught
   *  until the player leaves its grab range or lands (others catch instantly). */
  leftClimbX: number | null;
  /** Block being down-jumped through: ignored until the feet have dropped
   *  below its surface (dropY), so rising back above it makes it solid again. */
  dropBlock: number | null;
  dropY: number;
  /** Rushing up the current rope/ladder (Up + Jump): fast climb, hop off the top. */
  climbRush: boolean;
  /** Seconds left in the current skill's use time: no other skills or movement. */
  useT: number;
  /** A link skill pressed during Sky Toss, fired once Sky Toss finishes. */
  queued: SkillKey | null;
  /** Sky Assault: seconds left hovering (no gravity) while striking airborne enemies. */
  hangT: number;
  /** Sky Assault strikes left, time to the next one, and per-strike damage / targets. */
  hangHits: number;
  hangHitT: number;
  hangDmg: number;
  hangTargets: number;
  /** Seconds until the next regen tick. */
  regenT: number;
  /** Seconds left "in combat" (since last attacking or being hit): no HP regen. */
  combatT: number;
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  cd: Record<SkillKey, number>;
  cast: CastName | null;
  castT: number;
  castTotal: number;
  invuln: number;
  anim: number;
  animState: 'idle' | 'walk' | 'jump' | 'climb';
  /** Fervor stacks from linked skills. */
  ignis: number;
  ignisT: number;
  superStance: number;
  /** >0 while the Sky Toss link window is open. */
  combo: number;
  comboT: number;
  /** Progression. */
  level: number;
  exp: number;
  expNext: number;
  /** Unspent skill points (one every 5 levels). */
  sp: number;
  /** Unspent ability points for core stats (one per level). */
  ap: number;
  /** The four core stats (base growth is added on top of these). */
  stats: CoreStats;
  dex: number;
  /** Weapon attack power; the base of every damage calculation. */
  war: number;
  job: JobDef;
  ranks: Record<SkillKey, number>;
}

export type CastName =
  | 'shoot' | 'jump' | 'rush' | 'barrage' | 'tornado' | 'dive' | 'moon';

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  /** Runs when the arrow reaches its target (applies the hit). */
  onHit?: () => void;
  /** Which baked sprite to draw (default: the arrow streak). */
  sprite?: 'arrow' | 'bolt';
  /** Seconds before it launches (hidden and still until then). */
  delay?: number;
}

/** Effects are all baked animations (see fxsprites.ts). */
export type FxKind = 'tracer' | 'death' | 'levelUp' | 'muzzle' | 'hit' | 'crit' | 'rush' | 'swoosh' | 'rain' | 'rainHit' | 'stunHit' | 'spirit';

export interface Fx {
  type: FxKind;
  x: number;
  y: number;
  t: number;
  face?: number;
  col?: string;
  /** Horizontal stretch (tracer length / sprite width). */
  sx?: number;
  /** Stick to the player (level-up pillar). */
  follow?: boolean;
}

export interface DmgNum {
  x: number;
  y: number;
  v: number;
  t: number;
  vy: number;
  crit: boolean;
  col: string;
}

export interface Banner {
  text: string;
  sub: string;
  t: number;
}

export interface DamageOpts {
  /** Hit effect to play (default: the cyan hit, or the crit burst). */
  fx?: FxKind;
  airborne?: boolean;
  stun?: boolean;
  launch?: boolean;
}

/** A warp pad that sends the player to the next floor (or home on a town). */
export interface Portal {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A procedurally generated floor: its layout, enemies and exit portal. */
export interface Floor {
  number: number;
  platforms: Platform[];
  ropes: Climbable[];
  ladders: Climbable[];
  spawns: Spawn[];
  portal: Portal;
  town: boolean;
}
