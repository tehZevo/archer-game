import { P, WORLD } from './config';
import { clamp } from './util';
import { game, logMsg, mobDmg, mobHp, player } from './state';
import { areaMobs } from './floor';
import { CHASE_TURN } from './mobai';
import { areaOf, isPathEnd, mobLevel } from './world';
import { mobExp } from './progress';
import { gearSoak } from './gear';
import { missChance } from './combat';
import { sfx } from './audio';
import type { Mob, MobType, Portal } from './types';

/* ============================================================
   BOSSES
   The last floor of every area has a boss: the area's strongest walking
   enemy, grown huge. It walks at you and, every few seconds, winds
   up one of two attacks (it shakes and flashes while it does):
   - charge: a fast rush along the ground; get out of its lane
   - slam: a jump that lands with a shockwave along the ground; be in
     the air (or far away) when it lands
   The floor's way up stays sealed until it's beaten.
   ============================================================ */

export const BOSS = {
  /** size multiple of the enemy it's based on */
  SCALE: 2,
  /** HP, damage and EXP multiples */
  HP: 10, DMG: 3, EXP: 12,
  /** coin piles it drops */
  COINS: 8,
  /** seconds between attacks, and the wind-up before each */
  CD: 2.6, WIND: 0.7,
  /** charge: speed multiple and length (s) */
  RUSH: 4, RUSH_T: 0.8,
  /** slam: jump speed, shockwave reach either side (px) and damage multiple */
  JUMP: 420, QUAKE_R: 110, QUAKE_DMG: 1.3,
} as const;

export type BossAct = 'walk' | 'windCharge' | 'charge' | 'windSlam' | 'slam';
export interface BossState {
  act: BossAct; t: number; cd: number; air: boolean;
  /** a slam down at a player below: the feet height it drops to (it
   *  passes through any platform above that on the way down) */
  dropTo?: number;
}

/** Shockwaves on the ground (drawn by render; they fade over QUAKE_T). */
export const quakes: { x: number; y: number; t: number }[] = [];
export const QUAKE_T = 0.45;

/** The enemy an area's boss is based on: its strongest walker (fliers if
 *  it has nothing else). */
export function bossType(area: string): MobType {
  const pool = areaMobs(area);
  const walkers = pool.filter((m) => !m.fly);
  return (walkers.length ? walkers : pool).reduce((a, b) => (b.lvl > a.lvl ? b : a));
}

export const bossName = (t: MobType): string => `Giant ${t.n}`;

/** The boss on this floor, if it's still standing. */
export const bossAlive = (): Mob | undefined => game.mobs.find((m) => m.boss);

/** On an area's last floor, put its boss on the ground. */
export function spawnBoss(): void {
  quakes.length = 0;
  if (game.floor.town || !isPathEnd(game.floor.place)) return;
  const type = bossType(areaOf(game.floor.place));
  const ground = game.floor.platforms[0];
  const w = type.w * BOSS.SCALE, h = type.h * BOSS.SCALE;
  const level = mobLevel(game.floor.place);
  // A boss scales on the same exponential curves as its base mob (see state.ts),
  // just multiplied up: 10× HP and 3× damage.
  const hp = mobHp(type, level, BOSS.HP);
  game.mobs.push({
    x: WORLD.w * 0.75, y: ground.y - h, w, h,
    vx: 0, vy: 0, home: WORLD.w / 2, range: WORLD.w / 2 - 24, dir: -1,
    type, name: bossName(type), hp, hpMax: hp, spd: type.spd,
    dmg: mobDmg(type, level, BOSS.DMG),
    fly: false, col: type.col, level, exp: mobExp(level) * BOSS.EXP,
    stun: 0, atkCd: 0, airTime: 0, aggro: true, hitFlash: 0, barT: 0, anim: 0,
    spawn: { x: WORLD.w / 2, y: ground.y, types: [], minX: 24, maxX: WORLD.w - 24 },
    boss: { act: 'walk', t: 0, cd: BOSS.CD, air: false },
  });
}

/** Hurt the player (unless they're still flashing from the last hit). True if it landed.
 *  Hit by something at `fromX`, they're bumped a little up and back, away from it (on top of their own momentum)
 *  (not while climbing or hovering in Skyward Assault). The attacker's level sets
 *  how often it misses (see missChance). */
export function hurtPlayer(dmg: number, fromX?: number, attackerLvl = 0): boolean {
  if (player.invuln > 0) return false;
  if (Math.random() < missChance(attackerLvl, player.level)) {
    // a missed attack shows "MISS" over the player, like the player's own misses
    game.dmgNums.push({ x: player.x, y: player.y - 14, v: 0, t: 1, crit: false, vy: -80, txt: 'MISS', col: '#ffffff' });
    return false;
  }
  if (fromX !== undefined && !player.climb && player.hang.t <= 0) {
    const away = Math.sign(player.x - fromX) || -player.face;
    // added to the momentum you already had, not replacing it
    player.vx += away * P.HIT_PUSH;
    player.vy -= P.HIT_HOP;
    player.onGround = false;
  }
  // armor soaks a share of the hit
  dmg = Math.max(1, Math.round(dmg * (1 - gearSoak())));
  player.hp = Math.max(0, player.hp - dmg);
  player.combatT = P.COMBAT_TIME;
  player.invuln = 1.0;
  sfx.hit();
  game.dmgNums.push({ x: player.x, y: player.y - 14, v: dmg, t: 1, crit: false, vy: -80, col: '#b06cff' });
  return true;
}

/** The boss's moves for one step (instead of the usual patrol and chase). */
export function bossMove(m: Mob, dt: number, lo: number, hi: number): void {
  const b = m.boss!;
  const d = player.x - m.x;
  b.t -= dt;
  switch (b.act) {
    case 'walk': {
      // Turn at the same pace as the regular enemies (see CHASE_TURN): a beat
      // stopped on the spot, not a snap-rotate to face the player.
      const want = Math.sign(d) || m.dir;
      if (want !== m.dir) {
        m.vx = 0;
        if ((m.turn ?? 0) < CHASE_TURN) { m.turn = (m.turn ?? 0) + dt; break; }
        m.turn = 0; m.dir = want;
      } else m.turn = 0;
      m.vx += (m.dir * m.spd - m.vx) * Math.min(1, 8 * dt);
      if ((b.cd -= dt) <= 0) {
        // far away: rush at you; close in: jump and slam
        b.act = Math.abs(d) > 90 ? 'windCharge' : 'windSlam';
        b.t = BOSS.WIND;
      }
      break;
    }
    case 'windCharge':
    case 'windSlam':
      m.vx *= 0.7;
      if (b.act === 'windCharge') m.dir = Math.sign(d) || m.dir;
      if (b.t <= 0) {
        if (b.act === 'windCharge') { b.act = 'charge'; b.t = BOSS.RUSH_T; }
        else {
          // Leap at the platform you are standing on, not always the one
          // directly above: rise to your feet (capped at the leap's reach)
          // and travel the horizontal distance in the same arc.
          // Below it, it hops and drops down through its own platform to
          // yours, the arc stretched by the fall.
          b.act = 'slam'; b.air = false;
          const feet = player.y + player.h;
          const rise = Math.max(0, (m.y + m.h) - feet);
          const fall = player.onGround ? Math.max(0, feet - (m.y + m.h)) : 0;
          b.dropTo = fall > 16 ? feet : undefined;
          m.vy = -Math.min(BOSS.JUMP, Math.sqrt(2 * P.GRAVITY * (rise + 10)));
          // airtime for that arc (up, then down to the landing height), used
          // to pace the stride
          const v0 = -m.vy, drop = b.dropTo !== undefined ? fall : 0;
          const t = (v0 + Math.sqrt(v0 * v0 + 2 * P.GRAVITY * drop)) / P.GRAVITY;
          m.vx = Math.sign(d) * clamp(Math.abs(d) / Math.max(t, 0.15), m.spd, m.spd * 3);
        }
      }
      break;
    case 'charge':
      m.vx = m.dir * m.spd * BOSS.RUSH;
      if (b.t <= 0 || (m.dir > 0 && m.x >= hi - 1) || (m.dir < 0 && m.x <= lo + 1)) rest(m);
      break;
    case 'slam':
      if (m.vy < 0) b.air = true;
      // landed: the shockwave runs along the ground; only a player on the
      // ground near it gets hit
      if (b.air && m.vy === 0) {
        quakes.push({ x: m.x, y: m.y + m.h, t: QUAKE_T });
        sfx.hit();
        const feet = player.y + player.h;
        if (player.onGround && Math.abs(d) < BOSS.QUAKE_R + m.w / 2 && Math.abs(feet - (m.y + m.h)) < 20) hurtPlayer(Math.round(m.dmg * BOSS.QUAKE_DMG), m.x, m.level);
        rest(m);
      }
      break;
  }
}

function rest(m: Mob): void {
  const b = m.boss!;
  b.act = 'walk'; b.cd = BOSS.CD; m.vx = 0; b.dropTo = undefined;
}


/** True while the boss is winding up (it flashes and shakes). */
export const windingUp = (m: Mob): boolean => m.boss?.act === 'windCharge' || m.boss?.act === 'windSlam';

/** Fade the shockwaves. */
export function updateQuakes(dt: number): void {
  for (let i = quakes.length - 1; i >= 0; i--) if ((quakes[i].t -= dt) <= 0) quakes.splice(i, 1);
}

/** A boss went down: a pile of coins and the word that the way up is open. */
export function bossDown(m: Mob, drop: (m: Mob) => void): void {
  for (let i = 0; i < BOSS.COINS; i++) drop({ ...m, x: m.x + (i - BOSS.COINS / 2) * 6 });
  logMsg(`<b>${m.name}</b> defeated! The way up is open.`);
}

/** Can a portal be used? Ways up stay sealed while the boss stands. */
export function portalOpen(p: Portal): boolean {
  return !!p.down || !bossAlive();
}
