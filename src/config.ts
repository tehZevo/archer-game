import { mobSize } from './mobart';
import type { Fx, MobType, SkillDef, SkillKey } from './types';

/* ============================================================
   MOVEMENT ENGINE
   Real client constants (Map.wz/Physics.img), 30 Hz fixed step,
   trapezoidal integration so jump height is frame-rate proof.
   ============================================================ */
export const P = {
  WAVE_EVERY: 10,      // s between enemy waves (each tops spawn zones up to their cap; was 8)
  HEAT_HOT: 3,         // kills on one platform (cooling by half each wave) before its enemies start turning up elsewhere
  HEAT_EXTRA: 2,       // ...how many over its cap another platform can hold meanwhile
  STEP: 1 / 30,        // g_FrameDt30FPS = 0.0333
  GRAVITY: 858,        // px/s^2 (lowered from 2000, then 1040, then 780)
  TERMINAL: 670,       // terminalVelocity
  WALK: 66,            // halved from 131
  JUMP_V: 242.4,       // 10% under the old 269.3: a ~34px jump at 858 gravity
  JUMP_H: 81.25,       // halved from 162.5
  CLIMB_RUSH: 330,     // Up + Jump on a rope/ladder: rush speed, px/s
  CLIMB_RUSH_POP: 0.8, // ...then hop off the top at this fraction of JUMP_V
  CLIMB: 90,           // rope/ladder climb speed, px/s (was 140)
  DROP_HOP_V: 110,     // Down+Jump hop before falling through (v²/2g ≈ 6px)
  GLIDE_VX: 190,       // Glide forward launch speed, px/s (was 160; ×1-1.3 with rank)
  GLIDE_VY_MAX: 200,   // max upward speed after Glide (v²/2g ≈ 10px of extra rise)
  REGEN_EVERY: 5,      // s between HP/MP regen ticks
  REGEN_FRAC: 0.05,    // fraction of max HP/MP restored per tick
  COMBAT_TIME: 5,      // s after attacking or being hit with no HP regen
  BARRAGE_HANG: 0.3,   // s Sky Assault hovers (striking) before falling
  ASSAULT_LEAP: 0.12,  // s the assault's opening leap: a W pressed in it is buffered, after it the sweep fires out of the hover
  ASSAULT_SPIN_LINK: 0.35, // s of extra link window Sky Assault keeps open for Midair Spin after the hover
  BARRAGE_UP: 43,      // px Sky Assault warps straight up: a fixed rise (~2/3 of the old 64, so the strike lands sooner; a launched enemy peaks ~90px up, so it stays in the strike box)
  ARROW_V: 600,        // arrow speed (px/s)
  BOLT_V: 420,         // Shell Barrage bolt speed (px/s)
  Z_WINDUP: 0.10,      // s Twin Shot draws the bow before the arrows fly
  Z_CAST: 0.42,        // s for the whole Twin Shot animation (draw, release, follow-through)
  USE_TIME: 0.5,       // s an attack skill locks other skills + movement (links bypass)
  DELAY_TIME: 0.2,     // s of recovery after the animation (see delayTime; links skip it)
  ACCEL: 1600,         // groundedAccelForce
  MOB_SPEED: 0.5,     // ...and the most move too fast: every enemy's spd is halved
  RUSH_DIST: 64,      // px the Sky Toss slide always travels: it stops here, not early
  RUSH_SLIDE_V: 320,  // Sky Toss ground slide start speed (the slide's pace)
  RUSH_MAX: 0.32,     // s the Sky Toss slide lasts at most; the strike lands as it ends
  RUSH_GRAB: 22,      // px ahead of the player the slide picks enemies up
  RUSH_GRAB_BACK: 10, // ...and px behind, so an enemy you just passed still counts
  RUSH_HIT: 0.4,      // the slide hits each enemy once as it scoops them up, at this share of Sky Toss's damage
  // Electric Blitz: Q's charged upgrade. A rush you can bank up to 2 of.
  BLITZ_CHARGE_T: 10,  // s to recharge one charge (a linked skill cuts 1s off)
  BLITZ_MAX: 2,        // charges banked at full
  LINK_BUFFER: 0.5,   // s of free time a link window stays open past the animation (see linkWindow)
  BLITZ_SLIDE_V: 420,  // px/s (a faster, longer rush than Sky Toss)
  BLITZ_DIST: 96,      // px the blitz travels
  // Air Dive: Q's air form. A diagonal plunge that carries enemies with you.
  DIVE_WINDUP: 0.1,    // s she coils before the plunge starts (the windup)
  DIVE_VX: 260,        // px/s forward
  DIVE_VY: 420,        // px/s down
  DIVE_TIME: 0.3,      // s the plunge lasts before the landing rush
  BACKSTEP_VX: 230,    // Backstep Shot: backward hop speed, px/s
  BACKSTEP_VY: 150,    // ...and its small upward pop (v²/2g ≈ 11px)
  VAULT_VX: 150,       // Vault Shot: backward leap speed, px/s
  PLUNGE_W: 56,        // Plunging Volley: width of the column it rains into, px
  PLUNGE_DEPTH: 88,    // ...and how far below your feet it reaches, px (half the old 176)
  PLUNGE_POSE: 0.3,    // s of the volley's firing pose
  PLUNGE_HOP: 112.5,   // px/s (was 150) added to your current momentum (stacks: a falling cast lifts less)
  // Spike Lift: E's ground form. Spikes erupt around you and throw you up.
  SPIKE_CD: 8,         // s (a long cooldown, shortened by linked skills)
  SPIKE_DMG: 200,      // dmg driven into each enemy caught in the burst
  SPIKE_R: 56,         // px radius of the burst around you
  SPIKE_RISE_V: 118,   // px/s: the spikes push you up at this steady speed...
  SPIKE_RISE_T: 0.25,  // ...for this long, then you coast up a little and fall (~40px in all, a jump's height, but slower than a jump's pop)
  SPIKE_LIFT_H: 40,    // px the tornado lifts you, from wherever you are (see spikeLift)
  SPIN_R: 44,          // Midair Spin: reach of the sweep around you, px
  SPIN_CD: 4,          // ...and its cooldown, s (so one jump gets one sweep)

  TEMPEST_R: 96,       // Tempest: radius of the sweep around you, px
  RISE_VY: 430,        // Rising Arrow: your jump matches a launched enemy's (see damage's launch), so you rise together
  RISE_VX: 40,         // ...with a little forward drift, to stay over them
  VAULT_VY: 360,       // ...and its upward launch (v²/2g ≈ 62px, higher than a jump)
  FRICTION: 700,       // ground friction when no input (a short slide)
  AIR_BRAKE: 400,      // px/s^2: in the air, holding against your motion only slows you (never reverses)
  HIT_HOP: 130,        // px/s up when an enemy hits you: a little ~8px bump off the ground...
  HIT_PUSH: 90,        // ...and this fast back, away from the enemy
} as const;

/* ---------------- world / map ----------------
   The tower is taller than it is wide: a vertical climb of floors.
   All geometry snaps to a TILE-pixel grid so the world is tile based. */
export const WORLD = { w: 320, h: 640 };

/* ---------------- areas ---------------- */
/* The tower is divided into named regions, one per town block: floors 1-9
   (capped by the town on 10) are the Beach, floors 11-19 the Forest, and so
   on, cycling every 10 floors. */

/* (which area a floor is in, and what it's called: see world.ts) */

/** Camera deadzone, as fractions of the view: the player (centre x, feet y)
 *  moves freely inside this box; outside it the camera eases toward the
 *  position that puts the player back on the box edge. */
export const CAM = { left: 0.42, right: 0.58, top: 0.64, bottom: 0.80, LERP: 8 };
export const TILE = 16;

/* ---------------- skills ----------------
   Five active buttons. The main attack (Z) is available from Lv.1 and a new
   skill unlocks every 5 levels. Jump (C) and Glide (D) are movement. */
export const SKILLS: Record<SkillKey, SkillDef> = {
  // Actives: 3 ranks; stats step from rank 1 to rank 3 so every rank is a big jump.
  // `use` is the use time (see SkillDef); Twin Shot and its upgrades have no
  // cooldown, so their pace is their use time alone (which Haste speeds up).
  Z: { key: 'Z', name: 'Twin Shot', tag: 'Main Attack', job: 1, minLevel: 1, maxLevel: 3,
       cd: 0, use: 0.5, mp1: 2, mpMax: 3, dmg1: 80, dmgMax: 120, hits1: 2, hitsMax: 2, targets1: 2, targetsMax: 4,
       desc: 'Hits the closest enemies in range twice' },
  AC: { key: 'AC', name: 'Agile Climbing', tag: 'Passive', job: 2, minLevel: 10, maxLevel: 3, passive: true,
        cd: 0, mp1: 0, mpMax: 0, dmg1: 0, dmgMax: 0, bonus1: 0.15, bonusMax: 0.6,
        desc: 'Up + Jump rushes up ropes and ladders; climb faster' },
  C: { key: 'C', name: 'Jump', tag: 'Movement', job: 1, minLevel: 1, maxLevel: 1,
       cd: 0.05, mp1: 0, mpMax: 0, dmg1: 0, dmgMax: 0,
       desc: 'Standard jump, keeps your running momentum' },
  D: { key: 'D', name: 'Glide', tag: 'Movement', job: 1, minLevel: 1, maxLevel: 1, learn: true,
       cd: 0, use: 0.3, mp1: 2, mpMax: 2, dmg1: 0, dmgMax: 0,
       desc: 'Mid-air acrobatic tumble' },
  Q: { key: 'Q', name: 'Sky Toss', tag: 'Launcher', job: 2, minLevel: 10, maxLevel: 3,
       cd: 0, use: 0.5, delay: 0.35, mp1: 4, mpMax: 6, dmg1: 250, dmgMax: 400, targets1: 6, targetsMax: 6,
       desc: 'Launch enemies airborne, opens the link window' },
  W: { key: 'W', name: 'Skyfall Volley', tag: 'Link', job: 2, minLevel: 10, maxLevel: 3,
       cd: 0.50, mp1: 3, mpMax: 5, dmg1: 85, dmgMax: 110, hits1: 4, hitsMax: 4, targets1: 4, targetsMax: 4,
       desc: 'Airborne-only volley after Sky Toss' },
  E: { key: 'E', name: 'Spike Lift', tag: 'Launcher', job: 4, minLevel: 60, maxLevel: 3,
       cd: P.SPIKE_CD, mp1: 5, mpMax: 7, dmg1: 200, dmgMax: 400, hits1: 2, hitsMax: 2, targets1: 4, targetsMax: 4,
       desc: 'Ground: spikes erupt around you, launching enemies ahead' },
  // The air forms of Q, W and E: their own rows, ranks and unlock levels,
  // each with no cooldown (use time only) and chaining into its ground form.
  AD: { key: 'AD', name: 'Air Dive', tag: 'Aerial', job: 3, minLevel: 30, maxLevel: 3,
       cd: 0, mp1: 3, mpMax: 4, dmg1: 250, dmgMax: 400, hits1: 1, hitsMax: 1, requires: 'Q',
       desc: 'Mid-air Q: plunge down, then roll into the ground rush' },
  MS: { key: 'MS', name: 'Midair Spin', tag: 'Link', job: 4, minLevel: 60, maxLevel: 3,
       cd: P.SPIN_CD, mp1: 3, mpMax: 5, dmg1: 200, dmgMax: 200, hits1: 4, hitsMax: 4, targets1: 8, targetsMax: 8, requires: 'AB',
       desc: 'Mid-air W: a 360-degree sweep around you' },
  PV: { key: 'PV', name: 'Plunging Volley', tag: 'Aerial', job: 3, minLevel: 30, maxLevel: 3,
       cd: 0, use: 0.25, mp1: 5, mpMax: 7, dmg1: 160, dmgMax: 240, hits1: 2, hitsMax: 2, targets1: 6, targetsMax: 10, requires: 'E',
       desc: 'Mid-air E: rain arrows straight down onto enemies beneath you' },
  R: { key: 'R', name: 'Tempest', tag: 'Finisher', job: 4, minLevel: 60, maxLevel: 3,
       cd: 10.0, use: 0.36, mp1: 10, mpMax: 14, dmg1: 140, dmgMax: 200, hits1: 4, hitsMax: 8, targets1: 8, targetsMax: 8,
       desc: 'A storm sweeps up and around you, striking every enemy it passes' },
  EB: { key: 'EB', name: 'Electric Blitz', tag: 'Launcher', job: 4, minLevel: 60, maxLevel: 3,
       cd: 3, use: 0.5, delay: 0.35, mp1: 0, mpMax: 0, dmg1: 300, dmgMax: 460, hits1: 2, hitsMax: 2, targets1: 8, targetsMax: 10,
       desc: 'A charged rush that carries enemies with you (2 charges)' },
  AB: { key: 'AB', name: 'Sky Assault', tag: 'Link', job: 3, minLevel: 30, maxLevel: 3,
       cd: 0.60, mp1: 4, mpMax: 6, dmg1: 105, dmgMax: 140, hits1: 4, hitsMax: 4, targets1: 6, targetsMax: 6, requires: 'W',
       desc: 'After Sky Toss: leap up to launched enemies' },
  S: { key: 'S', name: 'Shell Barrage', tag: 'Burst', job: 3, minLevel: 30, maxLevel: 3,
       cd: 0, use: 0.5, mp1: 4, mpMax: 6, dmg1: 165, dmgMax: 220, hits1: 4, hitsMax: 4, targets1: 5, targetsMax: 6,
       desc: 'Multi-arrow burst that stuns' },
  // Branch upgrades: each competes with the other upgrade on the same slot.
  BS: { key: 'BS', name: 'Backstep Shot', tag: 'Reposition', job: 3, minLevel: 30, maxLevel: 3,
       cd: 0, use: 0.55, mp1: 3, mpMax: 4, dmg1: 150, dmgMax: 205, hits1: 2, hitsMax: 3, targets1: 2, targetsMax: 3,
       desc: 'Hop backward while firing forward' },
  VS: { key: 'VS', name: 'Vault Shot', tag: 'Launcher', job: 4, minLevel: 60, maxLevel: 3,
       cd: 0.80, mp1: 5, mpMax: 7, dmg1: 240, dmgMax: 380, targets1: 8, targetsMax: 8,
       desc: 'Leap back into the air, launching enemies ahead' },
  RA: { key: 'RA', name: 'Rising Arrow', tag: 'Launcher', job: 4, minLevel: 60, maxLevel: 3,
       cd: 0.80, mp1: 5, mpMax: 7, dmg1: 240, dmgMax: 380, targets1: 8, targetsMax: 8,
       desc: 'Launch enemies ahead and rise with them' },
  // Passives: no key; `bonus` steps from rank 1 to rank 3 (0 until learned).
  ES: { key: 'ES', name: 'Echo Shot', tag: 'Passive', job: 4, minLevel: 60, maxLevel: 3, passive: true,
        cd: 0, mp1: 0, mpMax: 0, dmg1: 0, dmgMax: 0, bonus1: 2, bonusMax: 2,
        desc: 'A shadow archer shoots with you, doubling the arrows your attacks fire' },
  SA: { key: 'SA', name: 'Precision', tag: 'Passive', job: 1, minLevel: 1, maxLevel: 3, passive: true,
        cd: 0, mp1: 0, mpMax: 0, dmg1: 0, dmgMax: 0, bonus1: 0.07, bonusMax: 0.21,
        desc: 'Crit chance up' },
  PP: { key: 'PP', name: 'Power Surge', tag: 'Passive', job: 4, minLevel: 60, maxLevel: 3, passive: true,
        cd: 0, mp1: 0, mpMax: 0, dmg1: 0, dmgMax: 0, bonus1: 0.1, bonusMax: 0.3,
        desc: 'All damage up' },
  IR: { key: 'IR', name: 'Fervor', tag: 'Passive', job: 2, minLevel: 10, maxLevel: 3, passive: true,
        cd: 0, mp1: 0, mpMax: 0, dmg1: 0, dmgMax: 0, bonus1: 0.04, bonusMax: 0.12,
        desc: 'Each Fervor stack gives more damage' },
  HA: { key: 'HA', name: 'Haste', tag: 'Passive', job: 3, minLevel: 30, maxLevel: 3, passive: true,
        cd: 0, mp1: 0, mpMax: 0, dmg1: 0, dmgMax: 0, bonus1: 0.04, bonusMax: 0.1,
        desc: 'Attack speed up (shorter use time, not cooldowns)' },
};

/** Skills you start with at rank 1 (Lv.1 skills, except those bought with SP). */
export const startsLearned = (k: SkillKey): boolean => SKILLS[k].minLevel <= 1 && !SKILLS[k].learn;

export const SKILL_ORDER: SkillKey[] = ['Z', 'C', 'D', 'AC', 'Q', 'W', 'E', 'R']; // upgrades (S, BS, VS, AB) share their slot's key

/** The buttons shown in the on-canvas skill bar. Z is the main attack slot:
 *  Twin Shot early, upgraded to Shell Barrage at Lv.30. */
/** Attack keys Z (main), Q, W, E, R. Slots upgrade in place (see UPGRADES in progress.ts). */
export const SKILL_BAR: { label: string; skill: SkillKey | null }[] = [
  { label: 'Z', skill: 'Z' },
  { label: 'Q', skill: 'Q' },
  { label: 'W', skill: 'W' },
  { label: 'E', skill: 'E' },
  { label: 'R', skill: 'R' },
];

/** Skills that consume the Sky Toss link window and stack Fervor. */
export const LINKED_SKILLS: SkillKey[] = ['W', 'AB'];

/* ---------------- mobs ---------------- */
export const MOB_TYPES: MobType[] = [
  { n: 'Garden Snail', lvl: 1,  hp: 150,  w: 17, h: 14, spd: 52,  dmg: 3,  col: '#5fb8f0', areas: ['Sunlit Shore'] },
  { n: 'Enemy Crab',   lvl: 2,  hp: 180,  w: 20, h: 13, spd: 70,  dmg: 3,  col: '#e8643c', areas: ['Tide Pools', 'Sunlit Shore'] },
  { n: 'Hermit Crab',  lvl: 3,  hp: 240,  w: 18, h: 16, spd: 40,  dmg: 3,  col: '#e8b48a', areas: ['Sunlit Shore'] },
  { n: 'Gull',         lvl: 4,  hp: 140,  w: 18, h: 12, spd: 90,  dmg: 2,  col: '#f4f7fc', fly: true, areas: ['Sunlit Shore', 'Endless Sky'] },
  { n: 'Boar',   lvl: 8,  hp: 260,  w: 23, h: 18, spd: 78,  dmg: 4,  col: '#e79ac4', areas: ['Whispering Woods', '*'] },
  { n: 'Wisp',       lvl: 14, hp: 220,  w: 16, h: 17, spd: 96,  dmg: 3,  col: '#b98cf5', fly: true, areas: ['Murky Swamp', '*'] },
  { n: 'Iron Hog',   lvl: 28, hp: 320,  w: 26, h: 21, spd: 60,  dmg: 5,  col: '#8fa2b8' },
  // each area's own pair (art in mobart.ts; '*' also joins the pool for areas without a set)
  { n: 'Beetle',         lvl: 6,  hp: 200, ...mobSize('Beetle'),         spd: 55,  dmg: 3, col: '#3a7a4a', areas: ['Whispering Woods'] },
  { n: 'Rabbit',         lvl: 6,  hp: 160, ...mobSize('Rabbit'),         spd: 95,  dmg: 3, col: '#f4eee4', areas: ['Sunny Meadows'] },
  { n: 'Bee',            lvl: 7,  hp: 140, ...mobSize('Bee'),            spd: 100, dmg: 3, col: '#f0c030', fly: true, areas: ['Sunny Meadows'] },
  { n: 'Frog',           lvl: 10, hp: 190, ...mobSize('Frog'),           spd: 80,  dmg: 3, col: '#5aa84a', areas: ['Misty Riverbank'] },
  { n: 'Otter',          lvl: 11, hp: 230, ...mobSize('Otter'),          spd: 85,  dmg: 4, col: '#8a5a34', areas: ['Misty Riverbank'] },
  { n: 'Goat',           lvl: 10, hp: 260, ...mobSize('Goat'),           spd: 75,  dmg: 4, col: '#e8e4dc', areas: ['Rolling Hills', 'Craggy Mountains'] },
  { n: 'Hawk',           lvl: 11, hp: 160, ...mobSize('Hawk'),           spd: 110, dmg: 4, col: '#8a5a34', fly: true, areas: ['Rolling Hills', 'Craggy Mountains', 'Endless Sky'] },
  { n: 'Bat',            lvl: 14, hp: 160, ...mobSize('Bat'),            spd: 105, dmg: 3, col: '#5a3a6a', fly: true, areas: ['Echoing Caves'] },
  { n: 'Rock Crawler',   lvl: 15, hp: 280, ...mobSize('Rock Crawler'),   spd: 45,  dmg: 4, col: '#6a6878', areas: ['Echoing Caves'] },
  { n: 'Slime',          lvl: 14, hp: 240, ...mobSize('Slime'),          spd: 50,  dmg: 3, col: '#7ac04a', areas: ['Murky Swamp'] },
  { n: 'Mushling',       lvl: 18, hp: 260, ...mobSize('Mushling'),       spd: 55,  dmg: 4, col: '#b4508a', areas: ['Mushroom Grotto'] },
  { n: 'Spore Puff',     lvl: 19, hp: 180, ...mobSize('Spore Puff'),     spd: 60,  dmg: 4, col: '#c8a8f0', fly: true, areas: ['Mushroom Grotto'] },
  { n: 'Crystal Golem',  lvl: 19, hp: 340, ...mobSize('Crystal Golem'),  spd: 40,  dmg: 5, col: '#7a6ac8', areas: ['Crystal Caverns'] },
  { n: 'Shard Bat',      lvl: 19, hp: 170, ...mobSize('Shard Bat'),      spd: 110, dmg: 4, col: '#5a44b0', fly: true, areas: ['Crystal Caverns'] },
  { n: 'Ruin Guardian',  lvl: 24, hp: 340, ...mobSize('Ruin Guardian'),  spd: 45,  dmg: 5, col: '#5a7a7a', areas: ['Sunken Ruins'] },
  { n: 'Jellyfish',      lvl: 24, hp: 190, ...mobSize('Jellyfish'),      spd: 50,  dmg: 4, col: '#e8a0d8', fly: true, areas: ['Sunken Ruins', 'Tide Pools'] },
  { n: 'Windup Soldier', lvl: 24, hp: 280, ...mobSize('Windup Soldier'), spd: 70,  dmg: 5, col: '#a83a3a', areas: ['Clockwork Spire'] },
  { n: 'Clockwork Bird', lvl: 24, hp: 180, ...mobSize('Clockwork Bird'), spd: 115, dmg: 4, col: '#a8803a', fly: true, areas: ['Clockwork Spire'] },
  { n: 'Dream Moth',     lvl: 30, hp: 190, ...mobSize('Dream Moth'),     spd: 90,  dmg: 4, col: '#c8b0e8', fly: true, areas: ['Dreamwood'] },
  { n: 'Shadow Fox',     lvl: 30, hp: 260, ...mobSize('Shadow Fox'),     spd: 105, dmg: 5, col: '#3a2e4a', areas: ['Dreamwood'] },
  { n: 'Reflection',     lvl: 30, hp: 250, ...mobSize('Reflection'),     spd: 85,  dmg: 5, col: '#a8c8e8', areas: ['Mirror Lake'] },
  { n: 'Ice Wisp',       lvl: 30, hp: 190, ...mobSize('Ice Wisp'),       spd: 95,  dmg: 4, col: '#c8e8ff', fly: true, areas: ['Mirror Lake'] },
  { n: 'Star Sprite',    lvl: 36, hp: 180, ...mobSize('Star Sprite'),    spd: 120, dmg: 4, col: '#fff0a0', fly: true, areas: ['Starfall Observatory'] },
  { n: 'Meteor Golem',   lvl: 36, hp: 360, ...mobSize('Meteor Golem'),   spd: 45,  dmg: 6, col: '#6a4a3a', areas: ['Starfall Observatory'] },
  { n: 'Void Blossom',   lvl: 40, hp: 300, ...mobSize('Void Blossom'),   spd: 30,  dmg: 6, col: '#8a4ad8', areas: ['Void Garden'] },
  { n: 'Null Wraith',    lvl: 40, hp: 220, ...mobSize('Null Wraith'),    spd: 100, dmg: 5, col: '#2a1a3a', fly: true, areas: ['Void Garden'] },

  // variants: cousins of an area's enemies at about the same level, with their own
  // look and stats. They live wherever their base (`of`) does unless they list their
  // own areas, and turn up in its place VARIANT_CHANCE of the time (see pickVariant).
  { n: 'Red Snail',       of: 'Garden Snail',   lvl: 2,  hp: 210, w: 17, h: 14,                   spd: 44,  dmg: 3, col: '#f07a5a' },
  { n: 'Blue Crab',       of: 'Enemy Crab',           lvl: 3,  hp: 160, w: 20, h: 13,                   spd: 92,  dmg: 3, col: '#4a8ae8' },
  { n: 'Wild Boar',     of: 'Boar',           lvl: 9,  hp: 340, w: 23, h: 18,                   spd: 70,  dmg: 5, col: '#8a5a3a', areas: ['Whispering Woods'] },
  { n: 'Storm Gull',      of: 'Gull',           lvl: 5,  hp: 170, w: 18, h: 12,                   spd: 105, dmg: 3, col: '#8a94a8', fly: true, areas: ['Endless Sky'] },
  { n: 'Horned Beetle',   of: 'Beetle',         lvl: 7,  hp: 260, ...mobSize('Horned Beetle'),   spd: 50,  dmg: 4, col: '#8a5a2a' },
  { n: 'Brown Hare',      of: 'Rabbit',         lvl: 7,  hp: 150, ...mobSize('Brown Hare'),      spd: 115, dmg: 3, col: '#a8784a' },
  { n: 'Poison Frog',     of: 'Frog',           lvl: 11, hp: 170, ...mobSize('Poison Frog'),     spd: 85,  dmg: 5, col: '#3a6ae0' },
  { n: 'Ram',             of: 'Goat',           lvl: 11, hp: 340, ...mobSize('Ram'),             spd: 68,  dmg: 5, col: '#8a8478' },
  { n: 'Ember Crawler',   of: 'Rock Crawler',   lvl: 16, hp: 300, ...mobSize('Ember Crawler'),   spd: 55,  dmg: 5, col: '#8a2a1a' },
  { n: 'Bog Slime',       of: 'Slime',          lvl: 15, hp: 320, ...mobSize('Bog Slime'),       spd: 42,  dmg: 4, col: '#7a5a8a' },
  { n: 'Toadstool',       of: 'Mushling',       lvl: 19, hp: 360, ...mobSize('Toadstool'),       spd: 45,  dmg: 5, col: '#d83a3a' },
  { n: 'Quartz Golem',    of: 'Crystal Golem',  lvl: 20, hp: 300, ...mobSize('Quartz Golem'),    spd: 50,  dmg: 6, col: '#e8dce8' },
  { n: 'Ruin Sentinel',   of: 'Ruin Guardian',  lvl: 25, hp: 400, ...mobSize('Ruin Sentinel'),   spd: 40,  dmg: 6, col: '#8a7a4a' },
  { n: 'Blue Jelly',      of: 'Jellyfish',      lvl: 25, hp: 170, ...mobSize('Blue Jelly'),      spd: 65,  dmg: 4, col: '#70a8f0', fly: true },
  { n: 'Windup Captain',  of: 'Windup Soldier', lvl: 25, hp: 340, ...mobSize('Windup Captain'),  spd: 62,  dmg: 6, col: '#3a5aa8' },
  { n: 'Ghost Fox',       of: 'Shadow Fox',     lvl: 31, hp: 220, ...mobSize('Ghost Fox'),       spd: 125, dmg: 5, col: '#d8e4f0' },
  { n: 'Dark Reflection', of: 'Reflection',     lvl: 31, hp: 280, ...mobSize('Dark Reflection'), spd: 95,  dmg: 6, col: '#2a3a5a' },
  { n: 'Comet Golem',     of: 'Meteor Golem',   lvl: 37, hp: 330, ...mobSize('Comet Golem'),     spd: 58,  dmg: 6, col: '#4a5a7a' },
  { n: 'Thorn Blossom',   of: 'Void Blossom',   lvl: 41, hp: 340, ...mobSize('Thorn Blossom'),   spd: 30,  dmg: 7, col: '#d83a5a' },
];
// a variant without its own areas lives wherever its base does
for (const m of MOB_TYPES) if (m.of && !m.areas) m.areas = MOB_TYPES.find((b) => b.n === m.of)?.areas;

/** How often a spawning enemy turns up as one of its variants instead (if it has any here). */
export const VARIANT_CHANCE = 0.3;


/** Elites: now and then a floor enemy spawns bigger and tougher, with a gold
 *  outline, and is worth more. Multiples of the normal enemy's stats. */
export const ELITE = { CHANCE: 1 / 25, SCALE: 1.5, HP: 8, DMG: 1.6, EXP: 6, COINS: 5 } as const; // rarer, tougher, richer (was 1/8, x4 HP, x1.3 dmg, x3 EXP, 3 piles)

/** Animation length of each effect; an effect's lifetime t must not exceed it. */
export const FX_DUR: Record<Fx['type'], number> = {
  tracer: 0.14, levelUp: 0.9,
  spikes: 0.45, tempest: 0.4, spin: 0.3,
  muzzle: 0.18, hit: 0.24, crit: 0.28, rush: 0.4, swoosh: 0.2,
  rain: 0.4, rainHit: 0.24, stunHit: 0.3, spirit: 0.3,
  skySwoosh: 0.2, diveHit: 0.24, spikeHit: 0.24, tempestHit: 0.24, skyHit: 0.24, spinHit: 0.24,
  volleyFlare: 0.25, tornado: 0.4, climbRise: 0.3, diveWindup: 0.2,
};
