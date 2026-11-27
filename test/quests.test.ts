import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { arena, climb, release, tap } from './helpers';
import { killMob } from '../src/combat';
import { MOB_TYPES } from '../src/config';
import { NPC_R, wallet } from '../src/economy';
import { areaMobs } from '../src/floor';
import { board, boardOffers, boardRows, loadQuests, questKill, quests } from '../src/quests';
import { apply, snapshot } from '../src/save';
import { game, gotoPlace, player, spawnMob } from '../src/state';
import { areaOf, pathsFrom, START, TOWNS } from '../src/world';

/** Walk up to the quest board in the first town and open it. */
function openBoard(): void {
  gotoPlace(START);
  const npc = game.floor.npcs!.find((n) => n.kind === 'board')!;
  player.x = npc.x;
  player.y = npc.y - player.h;
  player.vy = 0;
  player.onGround = true;
  player.climb = null;
  tap('up');
}

beforeEach(() => {
  release();
  arena(1);
  loadQuests([]);
});
afterEach(() => {
  if (board.open) tap('escape');
  loadQuests([]);
  release();
});

describe('quest boards', () => {
  it('every town has one, standing clear of portals, ladders and ropes', () => {
    for (const t of TOWNS) {
      gotoPlace({ town: t.id });
      const f = game.floor, b = f.npcs?.find((n) => n.kind === 'board');
      expect(b, t.name).toBeTruthy();
      const busy = [
        ...f.portals.map((q) => [q.x - q.w / 2 - 10, q.x + q.w / 2 + 10]),
        ...f.ladders.map((l) => [l.x - 7, l.x + 7]),
        ...f.ropes.map((r) => [r.x - 7, r.x + 7]),
      ];
      for (const [left, right] of busy) expect(b!.x + NPC_R <= left || b!.x - NPC_R >= right, t.name).toBe(true);
    }
  });

  it('every board posts kill quests for the areas above its town', () => {
    for (const t of TOWNS) {
      const above = pathsFrom(t.id).map((p) => p.name);
      const areas = above.length ? above : [areaOf({ town: t.id })]; // a branch's end posts for its own area
      const wanted = new Set(areas.flatMap((a) => areaMobs(a).map((m) => m.n)));
      const offers = boardOffers(t.id);
      expect(offers.length, t.name).toBeGreaterThan(0);
      for (const o of offers) {
        expect(wanted.has(o.mob), `${t.name}: ${o.mob}`).toBe(true);
        expect(o.exp).toBeGreaterThan(0);
        expect(o.coins).toBeGreaterThan(0);
      }
    }
  });

  it('Up beside the board opens it', () => {
    openBoard();
    expect(board.open).toBe(true);
    expect(boardRows().length).toBeGreaterThan(0);
  });

  it('Z takes the selected posting, and it leaves the offer list', () => {
    openBoard();
    tap('z');
    expect(quests.length).toBe(1);
    expect(quests[0].have).toBe(0);
    const offers = boardRows().filter((r) => r.active === null);
    for (const r of offers) expect(r.q.mob).not.toBe(quests[0].mob);
  });

  it('kills count toward the quest, up to its goal', () => {
    openBoard();
    tap('z');
    const q = quests[0];
    for (let i = 0; i < q.need + 3; i++) questKill(q.mob);
    questKill('Nobody');
    expect(q.have).toBe(q.need);
  });

  it('Z hands in a finished quest for EXP and coins', () => {
    openBoard();
    tap('z');
    const q = quests[0];
    for (let i = 0; i < q.need; i++) questKill(q.mob);
    const exp = player.exp, level = player.level, coins = wallet.coins;
    board.sel = 0;
    tap('z');
    expect(quests.length).toBe(0);
    expect(wallet.coins).toBe(coins + q.coins);
    expect(player.exp > exp || player.level > level).toBe(true);
  });

  it('X drops an active quest', () => {
    openBoard();
    tap('z');
    board.sel = 0;
    tap('x');
    expect(quests.length).toBe(0);
  });

  it('Esc closes the board, not opening the pause menu', () => {
    openBoard();
    tap('escape');
    expect(board.open).toBe(false);
    expect(game.pause).toBeFalsy();
  });
});

describe('quest progress', () => {
  beforeEach(() => loadQuests([{ mob: 'Garden Snail', need: 2, have: 0, exp: 5, coins: 5 }]));

  it('killing an enemy in the world advances its quest', () => {
    gotoPlace(climb(1));
    spawnMob({ x: 100, y: game.floor.platforms[0].y, types: ['Garden Snail'] } as never, MOB_TYPES[0]);
    killMob(game.mobs[game.mobs.length - 1]);
    expect(quests[0].have).toBe(1);
  });

  it('quests survive a save and load', () => {
    quests[0].have = 1;
    const saved = snapshot();
    loadQuests([]);
    apply(saved);
    expect(quests.length).toBe(1);
    expect(quests[0].mob).toBe('Garden Snail');
    expect(quests[0].have).toBe(1);
  });

  it('malformed saved quests are dropped or clamped', () => {
    loadQuests([{ mob: 3 }, null, { mob: 'Enemy Crab', need: -5, have: 99, exp: 'x', coins: 1 }]);
    expect(quests.length).toBe(1);
    expect(quests[0].need).toBe(1);
    expect(quests[0].have).toBe(1);
    expect(quests[0].exp).toBe(0);
  });
});
