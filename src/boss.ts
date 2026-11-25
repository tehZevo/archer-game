import { P, WORLD } from './config';
import { game, logMsg, mobLevel, player } from './state';
import { areaMobs } from './floor';
import { areaName, isAreaEnd } from './world';
import { net } from './net';
import { mobExp } from './progress';
import { sfx } from './audio';
import type { Mob, MobType } from './types';

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
  HP: 14, DMG: 1.5, EXP: 12,
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
export interface BossState { act: BossAct; t: number; cd: number; air: boolean }

/** Shockwaves on the ground (drawn by render; they fade over QUAKE_T). */
export const quakes: { x: number; y: number; t: number }[] = [];
export const QUAKE_T = 0.45;

/** The enemy an area's boss is based on: its strongest walker (fliers if
 *  it has nothing else). */
export function bossType(area: number): MobType {
  const pool = areaMobs(areaName(area));
  const walkers = pool.filter((m) => !m.fly);
  return (walkers.length ? walkers : pool).reduce((a, b) => (b.lvl > a.lvl ? b : a));
}

export const bossName = (t: MobType): string => `Giant ${t.n}`;

/** The boss on this floor, if it's still standing. */
export const bossAlive = (): Mob | undefined => game.mobs.find((m) => m.boss);

/** On an area's last floor, put its boss on the ground. */
export function spawnBoss(): void {
  quakes.length = 0;
  if (game.floor.town || !isAreaEnd(game.floor.number)) return;
  const type = bossType(net.area);
  const ground = game.floor.platforms[0];
  const scale = 1 + (player.level - 1) * 0.12;
  const hp = Math.round(type.hp * scale * BOSS.HP);
  const w = type.w * BOSS.SCALE, h = type.h * BOSS.SCALE;
  const level = mobLevel(game.floor.number);
  game.mobs.push({
    x: WORLD.w * 0.75, y: ground.y - h, w, h,
    vx: 0, vy: 0, home: WORLD.w / 2, range: WORLD.w / 2 - 24, dir: -1,
    type, name: bossName(type), hp, hpMax: hp, spd: type.spd,
    dmg: Math.round(type.dmg * (1 + (player.level - 1) * 0.06) * BOSS.DMG),
    fly: false, col: type.col, level, exp: mobExp(level) * BOSS.EXP,
    stun: 0, atkCd: 0, airTime: 0, aggro: true, hitFlash: 0, barT: 0, anim: 0,
    spawn: { x: WORLD.w / 2, y: ground.y, types: [], minX: 24, maxX: WORLD.w - 24 },
    boss: { act: 'walk', t: 0, cd: BOSS.CD, air: false },
  });
}

/** Hurt the player (unless they're still flashing from the last hit). True if it landed. */
export function hurtPlayer(dmg: number): boolean {
  if (player.invuln > 0) return false;
  player.hp = Math.max(0, player.hp - dmg);
  player.combatT = P.COMBAT_TIME;
  player.invuln = 1.0;
  sfx.hit();
  game.dmgNums.push({ x: player.x, y: player.y - 14, v: dmg, t: 1, crit: false, vy: -80, col: '#ff8f8f' });
  return true;
}

/** The boss's moves for one step (instead of the usual patrol and chase). */
export function bossMove(m: Mob, dt: number, lo: number, hi: number): void {
  const b = m.boss!;
  const d = player.x - m.x;
  b.t -= dt;
  switch (b.act) {
    case 'walk':
      m.dir = Math.sign(d) || m.dir;
      m.vx += (m.dir * m.spd - m.vx) * Math.min(1, 8 * dt);
      if ((b.cd -= dt) <= 0) {
        // far away: rush at you; close in: jump and slam
        b.act = Math.abs(d) > 90 ? 'windCharge' : 'windSlam';
        b.t = BOSS.WIND;
      }
      break;
    case 'windCharge':
    case 'windSlam':
      m.vx *= 0.7;
      if (b.act === 'windCharge') m.dir = Math.sign(d) || m.dir;
      if (b.t <= 0) {
        if (b.act === 'windCharge') { b.act = 'charge'; b.t = BOSS.RUSH_T; }
        else { b.act = 'slam'; b.air = false; m.vy = -BOSS.JUMP; m.vx = clampAbs(d * 1.2, m.spd * 2); }
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
        if (player.onGround && Math.abs(d) < BOSS.QUAKE_R + m.w / 2 && Math.abs(feet - (m.y + m.h)) < 20) hurtPlayer(Math.round(m.dmg * BOSS.QUAKE_DMG));
        rest(m);
      }
      break;
  }
}

function rest(m: Mob): void {
  const b = m.boss!;
  b.act = 'walk'; b.cd = BOSS.CD; m.vx = 0;
}

const clampAbs = (v: number, max: number): number => Math.max(-max, Math.min(max, v));

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
export function portalOpen(to: number): boolean {
  return to < game.floor.number || !bossAlive();
}
