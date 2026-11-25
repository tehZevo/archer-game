import { bump } from './achievements';
import { ELITE, P } from './config';
import { localKill } from './boost';
import { dropGear, gearDmg } from './gear';
import { dropCoins } from './economy';
import { game, gainExp, logMsg } from './state';
import { passiveBonus } from './progress';
import { BOSS, bossDown } from './boss';
import { addCorpse } from './deaths';
import { questKill } from './quests';
import { clearStatus } from './status';
import type { DamageOpts, DmgNum, Mob } from './types';

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

/** Fervor's per-stack bonus grows with the passive's rank. */
export const fervorMult = (): number => 1 + (0.08 + passiveBonus('IR')) * game.player.fervor;
/** Base 15% crit, raised by LUK and the Precision passive. */
export const critChance = (): number => 0.15 + game.player.stats.luk * 0.004 + passiveBonus('SA');
/** Built-in damage bonus, raised by the Power Surge passive. */
export const passiveDmg = (): number => 1.20 + passiveBonus('PP');

/** Level-based miss rate: each level the target stands above the attacker
 *  adds 5% to the chance of missing it (capped), and the same in reverse.
 *  Applies to the archer's shots and to the mobs' contact hits alike. */
export const missChance = (attackerLvl: number, targetLvl: number): number =>
  Math.max(0, Math.min(0.75, 0.05 * (targetLvl - attackerLvl)));

/** Seconds the enemy HP bar stays up after a hit. */
export const BAR_SHOW = 4;

/** Seconds an enemy flinches after a hit; and the longest a death can wait on
 *  an attack's remaining hits. */
export const HITSTUN = 0.35, DYING_MAX = 0.6;

export function damage(target: Mob, mult: number, opts: DamageOpts = {}): void {
  // the higher-level target dodges more (see missChance)
  target.aggro = true;
  if (Math.random() < missChance(game.player.level, target.level)) {
    game.dmgNums.push({ x: target.x, y: target.y - 14, v: 0, t: 1, vy: -60, crit: false, txt: 'MISS', col: '#cfcfcf' });
    return;
  }
  // the weapon in hand multiplies everything the bow fires
  let dmg = game.player.war * mult * passiveDmg() * fervorMult() * gearDmg() * rand(0.92, 1.08);
  const crit = Math.random() < critChance();
  if (crit) dmg *= 1.5;
  if (opts.airborne && target.airTime > 0) dmg *= 1.30;  // Sky Toss airborne bonus
  dmg = Math.round(dmg);
  target.hp -= dmg;
  target.hitFlash = 0.14;
  target.barT = BAR_SHOW;
  target.aggro = true;
  target.hurt = HITSTUN;
  const hx = target.x + rand(-4, 4), hy = target.y + target.h / 2 + rand(-4, 4);
  game.fx.push({ type: opts.fx ?? (crit ? 'crit' : 'hit'), x: hx, y: hy, t: opts.fx === 'stunHit' ? 0.3 : crit && !opts.fx ? 0.28 : 0.24, face: -game.player.face }); // streaks point back at the shooter
  game.dmgNums.push(stackedNum(target, dmg, crit));
  if (opts.stun) target.stun = Math.max(target.stun, 2.0);
  if (opts.launch) { target.airTime = 1.1; target.vy = -430; target.y -= 4; }
  if (target.hp <= 0) {
    // overkill from a multi-hit attack: the rest of its hits still land (and
    // show their numbers) before it dies
    if (opts.more) target.dying = DYING_MAX;
    else killMob(target);
  }
  // (no status procs from your hits for now; mobs still inflict the area's
  // element on you — see update.ts. The mob keeps any effect it already has.)
}

/** Multi-hit numbers stack: each hit on the same enemy shows NUM_GAP after the
 *  previous one, a line higher, instead of all landing at once in a pile. A
 *  pause longer than NUM_RESET starts a new stack. */
export const NUM_GAP = 0.125, NUM_LINE = 9, NUM_MAX = 8;
const NUM_RESET = 0.4;
function stackedNum(m: Mob, v: number, crit: boolean): DmgNum {
  const now = game.time;
  const fresh = m.numAt === undefined || now - m.numAt > NUM_RESET;
  const k = fresh ? 0 : ((m.numK ?? 0) + 1) % NUM_MAX;
  const at = fresh ? now : Math.max(now, m.numAt! + NUM_GAP);
  m.numAt = at; m.numK = k;
  return {
    // a slow drift (it was 70px/s): fast enough to feel alive, slow enough that
    // a number doesn't rise into the line the next one appears on
    x: m.x, y: m.y - 8 - k * NUM_LINE, v, t: 1, crit, delay: at - now,
    vy: -12, col: crit ? '#ffd166' : '#ffffff',
  };
}

export function killMob(m: Mob): void {
  if (m.dead) return;
  m.dead = true;
  const i = game.mobs.indexOf(m);
  if (i >= 0) game.mobs.splice(i, 1);
  game.kills++;
  if (!m.boss) m.spawn.heat = (m.spawn.heat ?? 0) + 1; // farming one platform heats it (see spawnWave)
  bump('kills');
  if (m.elite) bump('elites');
  if (m.boss) bump('bosses');
  localKill(); // shared with the instance: speeds up other players' waves
  addCorpse(m, m.boss ? BOSS.SCALE : m.elite ? ELITE.SCALE : 1); // it dies its own way (deaths.ts)
  gainExp(m.exp);
  dropCoins(m);
  dropGear(m); // a rare piece of gear, scaled to the enemy's level
  if (m.elite) for (let i = 1; i < ELITE.COINS; i++) dropCoins({ ...m, x: m.x + (i % 2 ? 6 : -6) * Math.ceil(i / 2) });
  if (m.boss) bossDown(m, dropCoins);
  questKill(m.name);
}

/**
 * classic MMO attacks are hitbox-based: the rectangle is evaluated instantly and
 * every mob inside it takes damage on that frame. The arrow is a pure visual.
 */
export function hitbox(cx: number, cy: number, w: number, h: number): Mob[] {
  return game.mobs.filter((m) =>
    m.x + m.w / 2 > cx - w / 2 && m.x - m.w / 2 < cx + w / 2 &&
    m.y + m.h > cy - h / 2 && m.y < cy + h / 2);
}

export function airborneInBox(cx: number, cy: number, w: number, h: number): Mob[] {
  return hitbox(cx, cy, w, h).filter((m) => m.airTime > 0);
}

/** Arrows fly straight out horizontally from the bow and stop at the
 *  target's x (the hit effect plays there); with no target they fly ~1/4s. */
export function spawnArrow(
  x: number, y: number, tx: number, hasTarget = true, onHit?: () => void,
  opts: { speed?: number; sprite?: 'arrow' | 'bolt'; dir?: number; delay?: number } = {},
): void {
  const dx = tx - x, V = opts.speed ?? P.ARROW_V, dir = opts.dir ?? Math.sign(dx || 1);
  game.shots.push({
    x, y, vx: dir * V, vy: 0, sprite: opts.sprite, onHit, delay: opts.delay,
    t: hasTarget ? Math.max(Math.abs(dx) / V, 0.04) : 350 / V, // at least a frame on screen
  });
  game.fx.push({ type: 'muzzle', x, y, t: 0.18, face: Math.sign(dx) || 1 });
}

export function revive(): void {
  game.player.hp = game.player.hpMax;
  game.player.mp = game.player.mpMax;
  const ground = game.floor.platforms[0];
  game.player.x = ground.x + ground.w / 2;
  game.player.y = ground.y - game.player.h;
  game.player.vx = game.player.vy = 0;
  game.player.onGround = true; game.player.plat = ground;
  game.player.climb = null; game.player.climbRush = false;
  game.player.fervor = 0;
  game.player.combo = 0;
  clearStatus(game.player);
  logMsg('You were knocked out. <b>Revived at the village gate.</b>');
}
