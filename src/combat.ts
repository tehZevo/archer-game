import { P } from './config';
import { localKill } from './boost';
import { dropCoins } from './economy';
import { game, gainExp, logMsg } from './state';
import { passiveBonus } from './progress';
import type { DamageOpts, DmgNum, Mob } from './types';

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

/** Fervor's per-stack bonus grows with the passive's rank. */
export const fervorMult = (): number => 1 + (0.08 + passiveBonus('IR')) * game.player.fervor;
/** Base 15% crit, raised by LUK and the Precision passive. */
export const critChance = (): number => 0.15 + game.player.stats.luk * 0.004 + passiveBonus('SA');
/** Built-in damage bonus, raised by the Power Surge passive. */
export const passiveDmg = (): number => 1.20 + passiveBonus('PP');

export function damage(target: Mob, mult: number, opts: DamageOpts = {}): void {
  let dmg = game.player.war * mult * passiveDmg() * fervorMult() * rand(0.92, 1.08);
  const crit = Math.random() < critChance();
  if (crit) dmg *= 1.5;
  if (opts.airborne && target.airTime > 0) dmg *= 1.30;  // Sky Toss airborne bonus
  dmg = Math.round(dmg);
  target.hp -= dmg;
  target.hitFlash = 0.14;
  target.aggro = true;
  const hx = target.x + rand(-4, 4), hy = target.y + target.h / 2 + rand(-4, 4);
  game.fx.push({ type: opts.fx ?? (crit ? 'crit' : 'hit'), x: hx, y: hy, t: opts.fx === 'stunHit' ? 0.3 : crit && !opts.fx ? 0.28 : 0.24, face: -game.player.face }); // streaks point back at the shooter
  game.dmgNums.push(stackedNum(target, dmg, crit));
  if (opts.stun) target.stun = Math.max(target.stun, 2.0);
  if (opts.launch) { target.airTime = 1.1; target.vy = -430; target.y -= 4; }
  if (target.hp <= 0) killMob(target);
}

/** Multi-hit numbers stack: each hit on the same enemy shows NUM_GAP after the
 *  previous one, a line higher, instead of all landing at once in a pile. A
 *  pause longer than NUM_RESET starts a new stack. */
export const NUM_GAP = 0.25, NUM_LINE = 9, NUM_MAX = 8;
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
  const i = game.mobs.indexOf(m);
  if (i >= 0) game.mobs.splice(i, 1);
  game.kills++;
  localKill(); // shared with the instance: speeds up other players' waves
  game.fx.push({ type: 'death', x: m.x, y: m.y + m.h, t: 0.35 });
  gainExp(m.exp);
  dropCoins(m);
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
  logMsg('You were knocked out. <b>Revived at the village gate.</b>');
}
