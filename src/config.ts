import type { Fx, MobType, SkillDef, SkillKey } from './types';

/* ============================================================
   MOVEMENT ENGINE
   Real client constants (Map.wz/Physics.img), 30 Hz fixed step,
   trapezoidal integration so jump height is frame-rate proof.
   ============================================================ */
export const P = {
  WAVE_EVERY: 8,       // s between enemy waves (each tops spawn zones up to their cap)
  STEP: 1 / 30,        // g_FrameDt30FPS = 0.0333
  GRAVITY: 1040,       // px/s^2 (lowered from 2000)
  TERMINAL: 670,       // terminalVelocity
  WALK: 66,            // halved from 131
  JUMP_V: 269.3,       // √(2·g·34.9): a ~35px jump (25% lower than the old 46.5px) at 1040 gravity
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
  BARRAGE_HANG: 0.5,   // s Sky Assault hovers (striking) before falling
  BARRAGE_RISE: 0.75,  // fraction of the way up to the highest launched enemy Sky Assault warps
  ARROW_V: 600,        // arrow speed (px/s)
  BOLT_V: 420,         // Shell Barrage bolt speed (px/s)
  Z_WINDUP: 0.10,      // s Twin Shot draws the bow before the arrows fly
  Z_CAST: 0.42,        // s for the whole Twin Shot animation (draw, release, follow-through)
  USE_TIME: 0.5,       // s an attack skill locks other skills + movement (links bypass)
  ACCEL: 1600,         // groundedAccelForce
  RUSH_SLIDE_V: 320,  // Sky Toss ground slide start speed (~70px slide)
  RUSH_MAX: 0.32,     // s the Sky Toss slide lasts at most; the strike lands as it ends
  RUSH_GRAB: 22,      // px ahead of the player the slide picks enemies up
  BACKSTEP_VX: 230,    // Backstep Shot: backward hop speed, px/s
  BACKSTEP_VY: 150,    // ...and its small upward pop (v²/2g ≈ 11px)
  VAULT_VX: 150,       // Vault Shot: backward leap speed, px/s
  PLUNGE_W: 56,        // Plunging Volley: width of the column it rains into, px
  PLUNGE_DEPTH: 176,   // ...and how far below your feet it reaches, px
  PLUNGE_STALL: 0.3,   // s the volley checks your fall (you hang, then drop)
  PIERCE_RANGE: 260,   // Piercing Arrow reach, px
  VAULT_VY: 360,       // ...and its upward launch (v²/2g ≈ 62px, higher than a jump)
  FRICTION: 700,       // ground friction when no input (a short slide)
  AIR_BRAKE: 400,      // px/s^2: in the air, holding against your motion only slows you (never reverses)
} as const;

/* ---------------- world / map ----------------
   The tower is taller than it is wide: a vertical climb of floors.
   All geometry snaps to a TILE-pixel grid so the world is tile based. */
export const WORLD = { w: 320, h: 1200 };

/* ---------------- areas ---------------- */
/* The tower is divided into named regions, one per town block: floors 1-9
   (capped by the town on 10) are the Beach, floors 11-19 the Forest, and so
   on, cycling every 10 floors. */
export const AREAS = ['Beach', 'Forest', 'Cave', 'Swamp', 'Mountain', 'Sky'] as const;
/** The region a floor belongs to; the town at 10 tops its block's area. */
export const areaFor = (n: number): string => AREAS[Math.floor((n - 1) / 10) % AREAS.length];

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
  Z: { key: 'Z', name: 'Twin Shot', tag: 'Main Attack', job: 1, minLevel: 1, maxLevel: 3,
       cd: 0.42, mp1: 2, mpMax: 3, dmg1: 159, dmgMax: 220, hits1: 2, hitsMax: 2, targets1: 2, targetsMax: 3,
       desc: 'Hits the closest enemies in range twice' },
  C: { key: 'C', name: 'Jump', tag: 'Movement', job: 1, minLevel: 1, maxLevel: 1,
       cd: 0.05, mp1: 0, mpMax: 0, dmg1: 0, dmgMax: 0,
       desc: 'Standard jump, keeps your running momentum' },
  D: { key: 'D', name: 'Glide', tag: 'Movement', job: 1, minLevel: 1, maxLevel: 1,
       cd: 0.3, mp1: 2, mpMax: 2, dmg1: 0, dmgMax: 0,
       desc: 'Mid-air acrobatic tumble' },
  Q: { key: 'Q', name: 'Sky Toss', tag: 'Launcher', job: 1, minLevel: 1, maxLevel: 3,
       cd: 0.70, mp1: 4, mpMax: 6, dmg1: 250, dmgMax: 400, targets1: 8, targetsMax: 8,
       desc: 'Launch enemies airborne, opens the link window' },
  W: { key: 'W', name: 'Skyfall Volley', tag: 'Link', job: 1, minLevel: 5, maxLevel: 3,
       cd: 0.50, mp1: 3, mpMax: 5, dmg1: 85, dmgMax: 110, hits1: 4, hitsMax: 6, targets1: 8, targetsMax: 8,
       desc: 'Airborne-only volley after Sky Toss' },
  E: { key: 'E', name: 'Plunging Volley', tag: 'Aerial', job: 1, minLevel: 10, maxLevel: 3,
       cd: 3.0, mp1: 5, mpMax: 7, dmg1: 160, dmgMax: 240, hits1: 2, hitsMax: 2, targets1: 6, targetsMax: 10,
       desc: 'Mid-air only: rain arrows straight down onto enemies beneath you' },
  R: { key: 'R', name: 'Piercing Arrow', tag: 'Finisher', job: 1, minLevel: 25, maxLevel: 3,
       cd: 6.0, mp1: 10, mpMax: 14, dmg1: 700, dmgMax: 1000, targets1: 6, targetsMax: 12,
       desc: 'A heavy arrow that pierces every enemy in a line' },
  AB: { key: 'AB', name: 'Sky Assault', tag: 'Link', job: 1, minLevel: 15, maxLevel: 3,
       cd: 0.60, mp1: 4, mpMax: 6, dmg1: 105, dmgMax: 140, hits1: 6, hitsMax: 8, targets1: 6, targetsMax: 6,
       desc: 'After Sky Toss: leap up to launched enemies' },
  S: { key: 'S', name: 'Shell Barrage', tag: 'Burst', job: 1, minLevel: 30, maxLevel: 3,
       cd: 0.42, mp1: 4, mpMax: 6, dmg1: 165, dmgMax: 220, hits1: 4, hitsMax: 4, targets1: 5, targetsMax: 6,
       desc: 'Multi-arrow burst that stuns' },
  // Branch upgrades: each competes with the other upgrade on the same slot.
  BS: { key: 'BS', name: 'Backstep Shot', tag: 'Reposition', job: 1, minLevel: 30, maxLevel: 3,
       cd: 0.55, mp1: 3, mpMax: 4, dmg1: 150, dmgMax: 205, hits1: 2, hitsMax: 3, targets1: 2, targetsMax: 3,
       desc: 'Hop backward while firing forward' },
  VS: { key: 'VS', name: 'Vault Shot', tag: 'Launcher', job: 1, minLevel: 20, maxLevel: 3,
       cd: 0.80, mp1: 5, mpMax: 7, dmg1: 240, dmgMax: 380, targets1: 8, targetsMax: 8,
       desc: 'Leap back into the air, launching enemies ahead' },
  // Passives: no key; `bonus` steps from rank 1 to rank 3 (0 until learned).
  SA: { key: 'SA', name: 'Precision', tag: 'Passive', job: 1, minLevel: 10, maxLevel: 3, passive: true,
        cd: 0, mp1: 0, mpMax: 0, dmg1: 0, dmgMax: 0, bonus1: 0.07, bonusMax: 0.21,
        desc: 'Crit chance up' },
  PP: { key: 'PP', name: 'Power Surge', tag: 'Passive', job: 1, minLevel: 20, maxLevel: 3, passive: true,
        cd: 0, mp1: 0, mpMax: 0, dmg1: 0, dmgMax: 0, bonus1: 0.1, bonusMax: 0.3,
        desc: 'All damage up' },
  IR: { key: 'IR', name: 'Fervor', tag: 'Passive', job: 1, minLevel: 5, maxLevel: 3, passive: true,
        cd: 0, mp1: 0, mpMax: 0, dmg1: 0, dmgMax: 0, bonus1: 0.04, bonusMax: 0.12,
        desc: 'Each Fervor stack gives more damage' },
};

export const SKILL_ORDER: SkillKey[] = ['Z', 'C', 'D', 'Q', 'W', 'E', 'R']; // upgrades (S, BS, VS, AB) share their slot's key

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
  { n: 'Garden Snail', lvl: 1,  hp: 150,  w: 17, h: 14, spd: 52,  dmg: 24,  col: '#5fb8f0' },
  { n: 'Boar',   lvl: 8,  hp: 420,  w: 23, h: 18, spd: 78,  dmg: 38,  col: '#e79ac4' },
  { n: 'Wisp',       lvl: 14, hp: 700,  w: 16, h: 17, spd: 96,  dmg: 30,  col: '#b98cf5', fly: true },
  { n: 'Iron Hog',   lvl: 28, hp: 1400, w: 26, h: 21, spd: 60,  dmg: 52,  col: '#8fa2b8' },
];

/** Share of the next-level requirement *at the mob's level* each mob is
 *  worth: two to three kills per level when your level matches the floor,
 *  slower if you out-level it, faster if you climb above it. */
export const MOB_EXP_SHARE: Record<string, number> = {
  'Garden Snail': 0.34, 'Boar': 0.42, 'Wisp': 0.40, 'Iron Hog': 0.55,
};

/** Animation length of each effect; an effect's lifetime t must not exceed it. */
export const FX_DUR: Record<Fx['type'], number> = {
  tracer: 0.14, death: 0.35, levelUp: 0.9,
  muzzle: 0.18, hit: 0.24, crit: 0.28, rush: 0.4, swoosh: 0.2,
  rain: 0.4, rainHit: 0.24, stunHit: 0.3, spirit: 0.3,
};
