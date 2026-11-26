import type { Place } from './world';
import type { BossState } from './boss';
export type SkillKey = 'Z' | 'D' | 'AC' | 'Q' | 'W' | 'E' | 'R' | 'AB' | 'S' | 'EB' | 'AD' | 'PV' | 'MS' | 'ES' | 'SA' | 'PP' | 'IR' | 'HA' | 'NI';

/** A status effect (see status.ts). */
export type StatusKind = 'poison' | 'burn' | 'chill';
export interface Status {
  kind: StatusKind;
  stacks: number;
  /** Seconds left (each new stack restarts it). */
  t: number;
  /** Seconds to the next damage tick. */
  tick: number;
}

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
  cd: number;
  /** Use time, s: how long a cast locks other skills and movement (attack
   *  skills default to P.USE_TIME). Haste shortens it. */
  use?: number;
  /** Post-animation recovery (see delayTime); links skip it. Defaults to P.DELAY_TIME. */
  delay?: number;
  /** The skills a press during this one's cast links into (see links.ts). */
  linksInto?: SkillKey[];
  /** A skill is single-rank: these are its stats once acquired. */
  mp1: number;
  dmg1: number;
  hits1?: number;
  /** Passive skills have no key; their effect is `bonus` once acquired. */
  passive?: boolean;
  /** Bought with SP even though it is open from Lv.1 (otherwise Lv.1 skills come free). */
  learn?: boolean;
  /** Fired by its own key (the base slots: see SKILL_ORDER). */
  keyed?: boolean;
  /** Shown on the skill bar (the attack keys; see SKILL_BAR). */
  bar?: boolean;
  /** The base slot this skill upgrades in place: it replaces that skill on
   *  its key once learned, and a slot holds one upgrade branch at a time. */
  upgrades?: SkillKey;
  /** A prerequisite skill that must be acquired before this one can be
   *  learned. The skill list shows it as locked until then. */
  requires?: SkillKey;
  bonus1?: number;
  targets1?: number;
}

/** A skill's live stats: a single rank, so just its authored values. */
export interface SkillRank {
  mp: number;
  /** Fractional multiplier, e.g. 1.25 for 125%. */
  dmg: number;
  hits: number;
  targets: number;
}


/** Esc menu cursor; `scroll` is the first skill row shown when the list is longer than the panel. */
/** col 2 is the SETTINGS button (top right), col 3 the AWARDS button (top left). */
export interface PauseMenu { col: 0 | 1 | 2 | 3; row: number; scroll?: number }

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
  /** Areas this enemy lives in (see world.ts); none = the fallback pool for areas without their own set. */
  areas?: string[];
  /** A variant of this enemy: never picked for a floor itself, it turns up in its base's place. */
  of?: string;
}

/** A spawn zone: one per platform that has enemies. Waves top it up to `cap`. */
export interface Spawn {
  x: number;
  y: number;
  /** Enemy types (MobType names) this zone spawns, picked at random per enemy. */
  types: string[];
  /** Surface spots (tile centres) a mob can appear on; defaults to (x, y). */
  spots?: { x: number; y: number }[];
  /** Max mobs alive from this zone at once (default 1). */
  cap?: number;
  /** Patrol bounds (the platform's walkable extent). */
  minX?: number;
  maxX?: number;
  /** The platform block the zone sits on (undefined = the ground). */
  block?: number;
  /** Recent kills here (halves every wave). A hot zone refills less and its
   *  enemies turn up on the other platforms instead (see spawnWave). */
  heat?: number;
}

export interface Mob {
  /** Damage-number stack: when its latest number shows (game time) and its height in the stack. */
  numAt?: number;
  numK?: number;
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
  /** Level (from the stage, see mobLevel): sets the EXP and coins it's worth. */
  level: number;
  /** Experience awarded on death (see mobExp). */
  exp: number;
  stun: number;
  atkCd: number;
  /** >0 while launched by Rush Toss; grants the airborne damage bonus. */
  airTime: number;
  /** Set once the player attacks it; only then does it chase the player. */
  aggro: boolean;
  hitFlash: number;
  /** Seconds of hitstun left: it flinches and stops in place (see HITSTUN). */
  hurt?: number;
  /** Seconds spent turning round toward the player while chasing (see CHASE_TURN). */
  turn?: number;
  /** Set when a multi-hit attack drops its HP to 0 with hits still to land:
   *  it stays (inert) to take them, and dies on the last one (or when this
   *  failsafe timer runs out). */
  dying?: number;
  /** Already killed: killMob ignores it after the first time. */
  dead?: boolean;
  /** Seconds left to show the HP bar; set on each hit, so undamaged enemies show none. */
  barT: number;
  anim: number;
  spawn: Spawn;
  /** A rare, tougher spawn (see ELITE in config.ts): bigger, gold-outlined, worth more. */
  elite?: boolean;
  /** Status effects on it (see status.ts). */
  effects?: Status[];
  /** Set on an area's boss: what it's doing (see boss.ts). */
  boss?: BossState;
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


export interface Casting {
  /** s left of the current skill's use time: no other skills or movement. */
  useT: number;
  /** The skill spending that use time (null between casts). Movement skills
   *  stay grabbable: see castrules.grabCancels. */
  key: SkillKey | null;
  /** s of recovery after the animation: blocks new skills, not movement. Links skip it. */
  recoverT: number;
  /** True for a cast that pins you in place: gravity stops and vx/vy are
   *  zeroed for its whole duration (Tempest), not just the ground lock. */
  freeze: boolean;
  /** A skill pressed too early, fired on the first free frame. */
  queued: SkillKey | null;
}

export interface RushState {
  /** s left of the slide (0 = not rushing); the strike lands when it ends. */
  t: number;
  /** px of the slide covered, and the px it travels (Rush Toss vs Electric Blitz). */
  dist: number;
  goal: number;
  /** Enemies being pushed along, at their distance ahead of the player. */
  carry: { m: Mob; off: number }[];
  /** The slide's own effect on the archer, and the scuffs it leaves (null: none, e.g. the dive). */
  look?: RushLook | null;
  /** px slid since the last ground scuff. */
  scuff?: number;
}

export interface Hover {
  /** s left hovering (no gravity) while striking airborne enemies. */
  t: number;
  /** Strikes left, s to the next one, and each strike's damage and target cap. */
  hits: number;
  hitT: number;
  dmg: number;
  targets: number;
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
  /** The current skill's use time, recovery and buffered follow-up. */
  casting: Casting;
  /** Rush Toss / Electric Blitz slide (see the rush in skills.ts). */
  rush: RushState;
  /** Piercing Leap: seconds left of the steady push up. */
  /** s left of a Piercing Leap's rise-and-hold (0 when none). */
  liftT: number;
  /** Feet y the Piercing Leap rises to and holds at. */
  liftTop: number;
  /** How the current cast draws you, over its usual pose: whirling
   *  round (Cyclone Sweep) or gone (Tempest). Cleared by the next cast. */
  skillPose?: 'spin' | 'vanish' | null;
  /** Skyward Assault's hover: time left, strikes left and their pacing / damage / reach. */
  hang: Hover;
  /** Seconds until the next regen tick. */
  regenT: number;
  /** Seconds left "in combat" (since last attacking or being hit): no HP regen. */
  combatT: number;
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  /** Seconds left on each cooldown slot: a key ("E"), or a key's air form
   *  ("E.air"), which cools down on its own (see cdSlot in skills.ts). */
  cd: Record<string, number>;
  /** The full length of each slot's current cooldown (the bar's dark fill). */
  cdMax: Record<string, number>;
  /** Counts down right after a slot's cooldown finishes, driving the
   *  yellow ready-glow on its bar icon (see hud.ts). */
  readyT: Record<string, number>;
  /** Per-slot countdown of the flash that confirms a cast (see hud.skillSlot). */
  usedT: Record<string, number>;
  /** True while a Meteor Dive is in flight; the landing rolls into the rush. */
  diving: boolean;
  /** Electric Blitz charges banked (full = 2) and the timer refilling the next. */
  blitz: { charges: number; t: number };
  cast: CastName | null;
  castT: number;
  castTotal: number;
  invuln: number;
  /** True when the current invulnerability came from a miss: it protects
   *  without the flashing-sprite visual. */
  invulnQuiet: boolean;
  anim: number;
  animState: 'idle' | 'walk' | 'jump' | 'fall' | 'climb' | 'prone';
  /** Fervor stacks from linked skills. */
  fervor: number;
  fervorT: number;
  superStance: number;
  /** The skill whose cast links read off (see links.ts), null when none is running. */
  linkFrom: SkillKey | null;
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
  /** Which skills are acquired (a skill is learned or not; no rank levels). */
  ranks: Record<SkillKey, boolean>;
  /** Status effects on you (see status.ts). */
  effects: Status[];
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
  sprite?: 'arrow' | 'flurry';
  /** Seconds before it launches (hidden and still until then). */
  delay?: number;
}

/** Effects are all baked animations (see fxsprites.ts). */
export type FxKind = 'tracer' | 'spikes' | 'tempest' | 'spin' | 'levelUp' | 'muzzle' | 'hit' | 'crit' | 'rush' | 'swoosh' | 'rain' | 'rainHit' | 'stunHit' | 'spirit'
  | 'skySwoosh' | 'diveHit' | 'spikeHit' | 'tempestHit' | 'skyHit' | 'spinHit'
  | 'volleyFlare' | 'tornado' | 'climbRise' | 'diveWindup' | 'diveLand' | 'tossTrail' | 'blitzTrail';
/** The looping effect on the archer for a ground rush's slide (see drawRushAura). */
export type RushLook = 'tossRush' | 'blitzRush';

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
  /** s until it appears (a multi-hit's later numbers wait their turn). */
  delay?: number;
  vy: number;
  crit: boolean;
  /** Shown instead of the number (a missed attack reads "MISS"). */
  txt?: string;
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
  /** No hit spark at all (the skill draws its own single blast instead). */
  noFx?: boolean;
  airborne?: boolean;
  stun?: boolean;
  launch?: boolean;
  /** More hits of the same attack are still to land on this target: if this
   *  one kills it, its death waits for them (see Mob.dying). */
  more?: boolean;
}

/** A warp pad that sends the player to the next floor (or home on a town). */
export interface Portal {
  x: number;
  y: number;
  w: number;
  h: number;
  /** The place it leads to. */
  to: Place;
  /** A town's way back down (always open, even with a boss up). */
  down?: boolean;
  /** Shown above it (towns: where each portal goes). */
  label?: string;
  /** A town's ways up: the level of the enemies where it leads (shown under the label). */
  lvl?: number;
}

/** A town NPC: stands at (x, y = the surface under their feet). */
/** A town decoration standing on a surface at (x, y): x is its centre, y the ground it stands on. */
export interface Decor { x: number; y: number; kind: DecorKind; flip?: boolean }
export type DecorKind = 'house' | 'tower' | 'lamp' | 'bench' | 'crate' | 'barrel' | 'flowers' | 'well' | 'sign' | 'awning' | 'fence';

export interface Npc { x: number; y: number; kind: 'shop' | 'trainer' | 'stylist' | 'board'; name: string }

/** A floor modifier (see floormods.ts). */
export type FloorMod = 'icy';

/** A procedurally generated floor: its layout, enemies and exit portal. */
export interface Floor {
  /** Where this floor is: a town, or a path and floor (see world.ts). */
  place: Place;
  platforms: Platform[];
  ropes: Climbable[];
  ladders: Climbable[];
  spawns: Spawn[];
  /** The way on up (on a town, the left one). */
  portal: Portal;
  /** Every portal on the floor, `portal` included (towns have three). */
  portals: Portal[];
  /** People to talk to (towns): stand beside one and press Up. */
  npcs?: Npc[];
  /** Towns: buildings and street furniture, purely visual (see towndecor.ts). */
  decor?: Decor[];
  town: boolean;
  /** Random floors: the layout style it was built with (see LAYOUTS in floor.ts). */
  layout?: string;
  /** Modifiers this floor rolled (see floormods.ts); none on most. */
  mods?: FloorMod[];
  /** World height for this floor: its content plus a little sky (WORLD.h while on it). */
  h: number;
}
