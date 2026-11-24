import { CAM, MOB_EXP_SHARE, MOB_TYPES, SKILLS, SKILL_ORDER, TILE, WORLD } from './config';
import { generateFloor } from './floor';
import { net } from './net';
import { expToNext, jobForLevel, recalcStats, SKILL_PICK_EVERY, statsForLevel } from './progress';
import { runtime } from './runtime';
import type {
  Banner, DmgNum, Fx, Mob, PauseMenu, MobType, Player, Shot, SkillKey, Spawn,
} from './types';

// Index MobTypes by their level so spawns (which store the level) resolve a type.
const MOB_TYPES_BY_LVL: Record<number, MobType> = MOB_TYPES.reduce(
  (o, m) => ((o[m.lvl] = m), o),
  {} as Record<number, MobType>,
);

const cd: Record<SkillKey, number> = SKILL_ORDER.reduce(
  (o, k) => ((o[k] = 0), o),
  {} as Record<SkillKey, number>,
);

const ranks: Record<SkillKey, number> = (Object.keys(SKILLS) as SkillKey[]).reduce(
  (o, k) => ((o[k] = SKILLS[k].minLevel <= 1 ? 1 : 0), o),
  {} as Record<SkillKey, number>,
);

const start = statsForLevel(1);

export const player: Player = {
  x: 160, y: 760, w: 16, h: 24, // collision box = the 16×24 sprite
  vx: 0, vy: 0,
  onGround: true,
  plat: null,
  face: 1,
  climb: null,
  leftClimbX: null,
  dropBlock: null,
  dropY: 0,
  climbRush: false,
  useT: 0,
  queued: null,
  rushT: 0, rushCarry: [],
  hangT: 0, hangHits: 0, hangHitT: 0, hangDmg: 0, hangTargets: 0,
  regenT: 0,
  combatT: 0,
  hp: start.hpMax, hpMax: start.hpMax,
  mp: start.mpMax, mpMax: start.mpMax,
  cd,
  cast: null, castT: 0, castTotal: 0,
  invuln: 0,
  anim: 0, animState: 'idle',
  fervor: 0, fervorT: 0,
  superStance: 0,
  combo: 0, comboT: 0,
  level: 1,
  exp: 0,
  expNext: expToNext(1),
  sp: 0,
  ap: 0,
  stats: { dex: 0, vit: 0, spi: 0, luk: 0 },
  dex: start.dex,
  war: start.war,
  job: jobForLevel(1),
  ranks,
};

export const game = {
  player,
  floor: generateFloor(1),
  mobs: [] as Mob[],
  shots: [] as Shot[],
  fx: [] as Fx[],
  /** Delayed skill hits, run on game time (so they freeze with the pause menu). */
  timers: [] as Array<{ t: number; fn: () => void }>,
  dmgNums: [] as DmgNum[],
  /** Game time, s (stops with the pause menu). */
  time: 0,
  /** Seconds since the last enemy wave. */
  waveT: 0,
  kills: 0,
  cam: { x: 0, y: 0 },
  acc: 0,
  last: typeof performance !== 'undefined' ? performance.now() : 0,
  banner: null as Banner | null,
  /** Esc pause menu (stats, skills, spending AP/SP); null when closed.
   *  col 0 = stats, col 1 = skills; the game is frozen while open. */
  pause: null as PauseMenu | null,
  view: { w: 1280, h: 720, sx: 1, sy: 1 },
};

/** How far a mob's centre may go: its platform's walkable extent (tile
 *  edges), inside the map. */
export function mobBounds(m: Mob): [number, number] {
  const lo = Math.max(m.w / 2, m.home - m.range - TILE / 2);
  const hi = Math.min(WORLD.w - m.w / 2, m.home + m.range + TILE / 2);
  return [lo, hi];
}

/** A mob's level, which sets the EXP it's worth. For now it is simply the
 *  floor number; later it can come from the mob type and area. */
export const mobLevel = (floor: number): number => Math.max(1, floor);

export function spawnMob(s: Spawn, type: MobType): void {
  // Mobs scale with the player so the tower stays relevant up to Lv.100.
  const scale = 1 + (player.level - 1) * 0.12;
  const hp = Math.round(type.hp * scale);
  // appear on a random free spot of the zone; patrol within its platform
  const spot = s.spots?.length ? s.spots[Math.floor(Math.random() * s.spots.length)] : s;
  const lo = s.minX ?? s.x - 110, hi = s.maxX ?? s.x + 110;
  game.mobs.push({
    x: spot.x, y: spot.y - type.h, w: type.w, h: type.h,
    vx: 0, vy: 0, home: (lo + hi) / 2, range: Math.max(4, (hi - lo) / 2), dir: Math.random() < 0.5 ? -1 : 1,
    type, name: type.n, hp, hpMax: hp, spd: type.spd,
    dmg: Math.round(type.dmg * (1 + (player.level - 1) * 0.06)),
    fly: !!type.fly, col: type.col,
    exp: Math.round(expToNext(mobLevel(game.floor.number)) * MOB_EXP_SHARE[type.n]),
    stun: 0, atkCd: 0, airTime: 0, aggro: false, hitFlash: 0, anim: Math.random() * 6,
    spawn: s,
  });
}

/** An enemy wave: every spawn zone is topped back up to its cap. */
export function spawnWave(): void {
  for (const z of game.floor.spawns) {
    const alive = game.mobs.filter((m) => m.spawn === z).length;
    for (let i = alive; i < (z.cap ?? 1); i++) spawnMob(z, mobTypeFor(z.t));
  }
}

/** Replace the current floor with a freshly generated one and populate mobs. */
/** How far either side of the ground's centre a player can arrive, px. */
export const SPAWN_SPREAD = 64;

export function gotoFloor(n: number, route?: number): void {
  if (route !== undefined) net.route = route; // picked at a town: the floors above follow it
  game.floor = generateFloor(n);
  WORLD.h = game.floor.h;
  game.mobs.length = 0;
  game.shots.length = 0;
  game.fx.length = 0;
  game.timers.length = 0;
  game.dmgNums.length = 0;
  game.waveT = 0;
  spawnWave();
  // Drop the player onto the ground slab. The portal sits on the summit
  // platform, so use the ground's own centre — the portal's x can fall in a
  // gap between the ground's tiles on narrower worlds.
  // Spread arrivals around the middle so players arriving together don't
  // stand on the same pixel (a ghost hidden exactly behind you is invisible).
  const ground = game.floor.platforms[0];
  player.x = ground.x + ground.w / 2 - player.w / 2 + Math.round((Math.random() * 2 - 1) * SPAWN_SPREAD);
  player.y = ground.y - player.h;
  player.vx = 0; player.vy = 0;
  player.onGround = true; player.plat = ground;
  player.climb = null;
  player.leftClimbX = null;
  player.dropBlock = null;
  player.climbRush = false;
  player.useT = 0;
  player.queued = null;
  player.hangT = 0; player.hangHits = 0;
  player.rushT = 0; player.rushCarry = [];
}

/** Where the camera wants to be: the nearest position that puts the player
 *  inside the deadzone box (unchanged while they're inside it), kept within
 *  the world bounds. */
export function cameraTarget(): { x: number; y: number } {
  const { w, h } = game.view;
  const px = player.x, feet = player.y + player.h;
  let x = game.cam.x, y = game.cam.y;
  if (px < x + w * CAM.left) x = px - w * CAM.left;
  else if (px > x + w * CAM.right) x = px - w * CAM.right;
  if (feet < y + h * CAM.top) y = feet - h * CAM.top;
  else if (feet > y + h * CAM.bottom) y = feet - h * CAM.bottom;
  return {
    x: Math.max(0, Math.min(x, WORLD.w - w)),
    y: Math.max(0, Math.min(y, WORLD.h - h)),
  };
}

/** Map a spawn's stored mob level back to its MobType. */
function mobTypeFor(lvl: number): MobType {
  return MOB_TYPES_BY_LVL[lvl] ?? MOB_TYPES_BY_LVL[1];
}

/** Award experience, cascading through as many levels as it covers. */
export function gainExp(amount: number): void {
  if (player.level >= 100) return;
  player.exp += amount;
  while (player.level < 100 && player.exp >= player.expNext) {
    player.exp -= player.expNext;
    levelUp();
  }
}

function levelUp(): void {
  player.level++;
  recalcStats();
  player.hp = player.hpMax; player.mp = player.mpMax;
  player.expNext = expToNext(player.level);
  player.job = jobForLevel(player.level);
  player.ap += 1;
  const pick = player.level % SKILL_PICK_EVERY === 0;
  if (pick) player.sp += 1;
  game.fx.push({ type: 'levelUp', x: player.x, y: player.y + player.h, t: 0.9, follow: true });
  bannerMsg(`LEVEL ${player.level}`, `+1 AP${pick ? ' +1 SP' : ''} - ESC TO SPEND`);
  logMsg(`Reached <b>Level ${player.level}</b>`);
}

export function logMsg(html: string): void {
  runtime.log(html);
}

/** Run `fn` after `delay` seconds of game time. */
export function later(delay: number, fn: () => void): void {
  game.timers.push({ t: delay, fn });
}

export function bannerMsg(text: string, sub = ''): void {
  game.banner = { text, sub, t: 1.15 };
}
