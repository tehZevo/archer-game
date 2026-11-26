import { bump } from './achievements';
import { sfx } from './audio';
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
import { closeLinks } from './links';

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

/** Fervor's per-stack bonus grows with the passive's rank. */
export const fervorMult = (): number => 1 + (0.08 + passiveBonus('IR')) * game.player.fervor;
/** Base 15% crit, raised 2% a point by LUK and the Precision passive. */
export const CRIT_PER_POINT = 0.02;
export const critChance = (): number =>
  Math.min(1, 0.15 + game.player.stats.luk * CRIT_PER_POINT + passiveBonus('SA'));
/** LUK points spent past the 100% crit chance cap (the base 15% counts
 *  toward it, so the cap is reached well before 50 points). */
export const critOverflowPoints = (): number =>
  Math.max(0, game.player.stats.luk - Math.ceil((1 - 0.15 - passiveBonus('SA')) / CRIT_PER_POINT));
/** Crits hit for 1.5x, plus 2% for every LUK point past the cap. */
export const CRIT_BASE = 1.5;
export const critMult = (): number => CRIT_BASE + critOverflowPoints() * 0.02;
/** Built-in damage bonus, raised by the Power Surge passive. */
export const passiveDmg = (): number => 1.20 + passiveBonus('PP');

/* ---- The damage pipeline, in three parts (see damage()). ---- */

/** (1) Base attack: the player's raw attack stat (level + DEX, see recalcStats)
 *  scaled by the weapon's bonus. This is the "attack" the whole build raises. */
export const baseAttack = (): number => game.player.war * gearDmg();

/** (2) Modifiers: multiplicative buffs stacked on base attack — passives
 *  (Power Surge) and stacks (Fervor). Crit, variance and the airborne bonus are
 *  per-hit and applied in damage(), not here. */
export const damageModifiers = (): number => passiveDmg() * fervorMult();

/** (3) Applied damage, before the target's defense: base attack × modifiers ×
 *  the attack skill's own multiplier (mult, e.g. Double Shot's 120%). */
export const appliedDamage = (mult: number): number => baseAttack() * damageModifiers() * mult;

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
/** Brief i-frames a missed attack grants (see the miss branch of damage). */
export const MISS_IFRAMES = 0.35;

export function damage(target: Mob, mult: number, opts: DamageOpts = {}): void {
  // the higher-level target dodges more (see missChance)
  target.aggro = true;
  if (Math.random() < missChance(game.player.level, target.level)) {
    // the MISS rides the same floating-number treatment as a hit
    game.dmgNums.push(stackedNum(target, 0, false, 'MISS'));
    // and it buys a moment of safety: the same i-frames a hit would grant,
    // without the flashing sprite (the shot is spent, you're not re-hit)
    game.player.invuln = Math.max(game.player.invuln, MISS_IFRAMES);
    game.player.invulnQuiet = true;
    return;
  }
  // the weapon in hand multiplies everything the bow fires (see baseAttack)
  let dmg = appliedDamage(mult) * rand(0.92, 1.08);
  const crit = Math.random() < critChance();
  if (crit) dmg *= critMult();
  if (opts.airborne && target.airTime > 0) dmg *= 1.30;  // Rush Toss airborne bonus
  dmg = Math.round(dmg);
  target.hp -= dmg;
  target.hitFlash = 0.14;
  target.barT = BAR_SHOW;
  target.aggro = true;
  target.hurt = HITSTUN;
  const hx = target.x + rand(-4, 4), hy = target.y + target.h / 2 + rand(-4, 4);
  if (!opts.noFx) game.fx.push({ type: opts.fx ?? (crit ? 'crit' : 'hit'), x: hx, y: hy, t: opts.fx === 'stunHit' ? 0.3 : crit && !opts.fx ? 0.28 : 0.24, face: -game.player.face }); // streaks point back at the shooter
  sfx.mobHit(target.name); // every line of a multi-hit stack sounds like this enemy
  game.dmgNums.push(stackedNum(target, dmg, crit));
  if (opts.stun) target.stun = Math.max(target.stun, 2.0);
  // A launcher pops the enemy straight up: cancel its horizontal drift so it
  // rises in place (and is there for the aerial follow-up).
  if (opts.launch) { target.airTime = 1.1; target.vx = 0; target.vy = -430; target.y -= 4; }
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
export function stackedNum(m: Mob, v: number, crit: boolean, txt?: string): DmgNum {
  const now = game.time;
  const fresh = m.numAt === undefined || now - m.numAt > NUM_RESET;
  const k = fresh ? 0 : ((m.numK ?? 0) + 1) % NUM_MAX;
  const at = fresh ? now : Math.max(now, m.numAt! + NUM_GAP);
  m.numAt = at; m.numK = k;
  return {
    // a slow drift (it was 70px/s): fast enough to feel alive, slow enough that
    // a number doesn't rise into the line the next one appears on
    x: m.x, y: m.y - 8 - k * NUM_LINE, v, t: 1, crit, delay: at - now, txt,
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
  opts: { speed?: number; sprite?: 'arrow' | 'flurry'; dir?: number; delay?: number } = {},
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
  closeLinks(); // a respawn starts with no cast to link off
  clearStatus(game.player);
  logMsg('You were knocked out. <b>Revived at the village gate.</b>');
}
