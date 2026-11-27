import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arena, dummy, ground, memoryStorage, release, step, tap } from './helpers';
import {
  achKey, achUi, bump, cleanRecord, clearAchievements, GOLD_OUTFIT, isDone, record, runBonus, visitArea } from '../src/achievements';
import { damage } from '../src/combat';
import { COIN_LIFE, drops, wallet } from '../src/economy';
import { DEFAULT_LOOK, LOOK_COUNTS, stepLook } from '../src/look';
import { items } from '../src/menu';
import { startRun } from '../src/save';
import { game, player } from '../src/state';

// achievements are counted across runs, and unlock run bonuses and a cosmetic
beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  clearAchievements();
  arena();
  player.exp = 0; // so no level-up banner covers an achievement's
});
afterEach(() => {
  clearAchievements();
  drops.length = 0;
  wallet.coins = 0;
  wallet.hp = 0;
  if (achUi.open) achKey('escape');
  game.pause = null;
  release();
  vi.unstubAllGlobals();
});

describe('counting', () => {
  it('a kill counts, and unlocks FIRST BLOOD', () => {
    damage(dummy(100, 1), 10);
    expect(record.stats.kills).toBe(1);
    expect(isDone('kill1')).toBe(true);
    expect(game.banner?.sub).toBe('FIRST BLOOD');
  });

  it('an elite kill counts as a kill and as an elite', () => {
    const e = dummy(100, 1);
    e.elite = true;
    damage(e, 10);
    expect(record.stats.kills).toBe(1);
    expect(record.stats.elites).toBe(1);
    expect(isDone('elite1')).toBe(true);
  });

  it('the done list is stored apart from the save', () => {
    bump('bosses', 10);
    expect(isDone('boss10')).toBe(true);
    const stored = JSON.parse(localStorage.getItem('archer-game:achievements')!);
    expect(stored.done).toContain('boss10');
  });

  it('each area counts once', () => {
    visitArea('Sunlit Shore');
    visitArea('Sunlit Shore');
    visitArea('Whispering Woods');
    expect(record.areas.filter((a) => a === 'Sunlit Shore').length).toBe(1);
  });

  it('coins you pick up count as earned', () => {
    step(1); // one frame on this floor first: coins left from an earlier floor are cleared on the first frame
    drops.length = 0;
    drops.push({ x: player.x, y: ground().y, vy: 0, v: 40, t: COIN_LIFE, landed: true });
    const before = record.stats.coins;
    tap('x');
    expect(record.stats.coins).toBe(before + 40);
  });

  it('taking the way up counts a floor', () => {
    const before = record.stats.floors, up = game.floor.portal;
    player.x = up.x;
    player.y = up.y - player.h;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.climb = null;
    tap('up');
    expect(record.stats.floors).toBe(before + 1);
  });

  it('a bad stored record is cleaned', () => {
    expect(cleanRecord({ stats: { kills: -5, coins: 'x' } }).stats.kills).toBe(0);
    expect(cleanRecord({ areas: [1, 'A', 'A'] }).areas).toEqual(['A']);
    expect(cleanRecord({ done: ['nope', 'kill1'] }).done).toEqual(['kill1']);
  });
});

describe('rewards', () => {
  it('run bonuses add up the unlocked rewards', () => {
    bump('bosses', 1); // GIANT SLAYER: 100 coins
    expect(runBonus()).toEqual({ coins: 100, potions: 0, sp: 0 });
  });

  it('a new run starts with the bonuses', () => {
    bump('bosses', 1); // GIANT SLAYER: 100 coins
    bump('kills', 500); // HUNTER: 5 potions
    const coins = wallet.coins, hp = wallet.hp, sp = player.sp;
    startRun();
    expect(wallet.coins).toBe(coins + 100);
    expect(wallet.hp).toBe(hp + 5);
    expect(player.sp).toBe(sp);
  });

  it('the gold outfit is skipped until it is earned', () => {
    for (let i = 0; i < LOOK_COUNTS.outfit; i++) {
      expect(stepLook({ ...DEFAULT_LOOK, outfit: i }, 'outfit', 1).outfit).not.toBe(GOLD_OUTFIT);
    }
  });

  it('beating 10 bosses (WARDEN) puts the gold outfit on offer', () => {
    bump('bosses', 10);
    expect(stepLook({ ...DEFAULT_LOOK, outfit: GOLD_OUTFIT - 1 }, 'outfit', 1).outfit).toBe(GOLD_OUTFIT);
  });
});

describe('the achievements list', () => {
  function openFromEscMenu(): void {
    tap('escape');
    tap('left');
    tap('z');
  }

  it('Left from the stats column of the Esc menu reaches AWARDS', () => {
    tap('escape');
    tap('left');
    expect(game.pause?.col).toBe(3);
  });

  it('Z opens the list, and Down moves through it', () => {
    openFromEscMenu();
    expect(achUi.open).toBe(true);
    tap('down');
    expect(achUi.sel).toBe(1);
  });

  it('Esc closes it, still paused', () => {
    openFromEscMenu();
    tap('escape');
    expect(achUi.open).toBe(false);
    expect(game.pause).toBeTruthy();
  });

  it('the main menu has an AWARDS row', () => {
    expect(items()).toContain('awards');
  });
});
