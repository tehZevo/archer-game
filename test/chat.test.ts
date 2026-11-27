import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { climb, release } from './helpers';
import { addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap } from '../src/chat';
import { CHEER, cheer, cheerLeftMs, cheersLeft, cheerTarget, expMult, loadCheer, nextCheerMs, spendCheer } from '../src/cheer';
import { killMob } from '../src/combat';
import { newTrack } from '../src/ghost';
import { cheerPlayer, gotCheer, roster, say } from '../src/net';
import { snapshot } from '../src/save';
import { game, gotoPlace, player } from '../src/state';

beforeEach(() => {
  chat.log.length = 0;
  clearBubbles();
});
afterEach(() => {
  chat.typing = false;
  chat.log.length = 0;
  clearBubbles();
});

describe('text chat', () => {
  it('keeps only what the font can draw, upper-cased and capped', () => {
    expect(cleanChat('  hi, there!  \u{1F600} ok?')).toBe('HI, THERE! OK?');
    expect(cleanChat('x'.repeat(200)).length).toBe(CHAT_MAX);
    expect(cleanChat('   ')).toBe('');
  });

  it('wraps on words', () => {
    expect(wrap('HELLO THERE FRIEND', 11)).toEqual(['HELLO THERE', 'FRIEND']);
    expect(wrap('A'.repeat(25), 10).length).toBe(3);
  });

  it('saying something logs it and shows your bubble', () => {
    say('hello world');
    expect(chat.log.length).toBe(1);
    expect(chat.log[0].id).toBe(SELF);
    expect(chat.log[0].text).toBe('HELLO WORLD');
    expect(bubbleFor(SELF, performance.now())).toBeTruthy();
  });

  it('blank lines are not sent', () => {
    say('   ');
    expect(chat.log.length).toBe(0);
  });

  it('a bubble lasts a few seconds, then goes', () => {
    const t = 1e6;
    addChat('peer1', 'BOB', 'HI', '#ff0000', t);
    expect(bubbleFor('peer1', t + 1000)).toBeTruthy();
    expect(bubbleFor('peer1', t + bubbleMs('HI') + 1)).toBe(null);
  });

  it('old lines leave the log, unless you are typing', () => {
    const t = 1e6;
    addChat('peer1', 'BOB', 'HI', '#ff0000', t);
    const later = t + LOG_SHOW_MS + 1;
    expect(logLines(later).some((l) => l.id === 'peer1')).toBe(false);
    chat.typing = true;
    expect(logLines(later).some((l) => l.id === 'peer1')).toBe(true);
  });
});

describe('cheers (/cheer <player> gives them +10% EXP)', () => {
  beforeEach(() => loadCheer(null));
  afterEach(() => {
    loadCheer(null);
    roster.clear();
  });

  it('/cheer lines are read as cheers, anything else is chat', () => {
    expect(cheerTarget('/cheer Robin')).toBe('Robin');
    expect(cheerTarget('  /CHEER  ')).toBe('');
    expect(cheerTarget('/cheerful')).toBe(null);
    expect(cheerTarget('cheer robin')).toBe(null);
  });

  describe('your stock', () => {
    const t = 1_000_000_000_000;

    it('you hold three', () => {
      expect([spendCheer(t), spendCheer(t + 1), spendCheer(t + 2), spendCheer(t + 3)]).toEqual([true, true, true, false]);
      expect(cheersLeft(t + 3)).toBe(0);
    });

    it('one comes back an hour after you first spend from a full stock', () => {
      spendCheer(t);
      spendCheer(t + 1);
      spendCheer(t + 2);
      expect(nextCheerMs(t + 60_000)).toBe(CHEER.RECHARGE_MS - 60_000);
      expect(cheersLeft(t + CHEER.RECHARGE_MS - 1)).toBe(0);
      expect(cheersLeft(t + CHEER.RECHARGE_MS)).toBe(1);
      expect(cheersLeft(t + 2.5 * CHEER.RECHARGE_MS)).toBe(2);
      expect(cheersLeft(t + 9 * CHEER.RECHARGE_MS)).toBe(3);
    });
  });

  describe('cheering someone', () => {
    function robinAndRobertAreHere(): void {
      roster.names.set('p1', 'ROBIN');
      roster.tracks.set('p1', newTrack());
      roster.names.set('p2', 'ROBERT');
      roster.tracks.set('p2', newTrack());
    }

    it('someone not in your channel: says so, and costs nothing', () => {
      cheerPlayer('robin');
      expect(cheersLeft()).toBe(3);
      expect(chat.log.at(-1)?.text.startsWith('NO PLAYER ROBIN')).toBe(true);
    });

    it('a name two players start with is not a match', () => {
      robinAndRobertAreHere();
      cheerPlayer('rob');
      expect(cheersLeft()).toBe(3);
    });

    it('a name only one player starts with is', () => {
      robinAndRobertAreHere();
      cheerPlayer('robi');
      expect(cheersLeft()).toBe(2);
      expect(chat.log.at(-1)?.text).toBe('YOU CHEERED ROBIN! 2 LEFT');
    });

    it('with none left, you hear when the next comes back', () => {
      robinAndRobertAreHere();
      cheerPlayer('ROBERT');
      cheerPlayer('robin');
      cheerPlayer('robin');
      cheerPlayer('robin');
      expect(cheersLeft()).toBe(0);
      expect(chat.log.at(-1)?.text).toBe('NO CHEERS LEFT · NEXT IN 60M');
    });

    it('a /cheer line is never said aloud', () => {
      robinAndRobertAreHere();
      say('/cheer robin');
      expect(chat.log.some((l) => l.id === SELF)).toBe(false);
      expect(bubbleFor(SELF, performance.now())).toBeFalsy();
    });
  });

  describe('being cheered', () => {
    /** The EXP from killing one enemy worth 100. */
    function expFromAKill(): number {
      const m = game.mobs.find((x) => !x.training)!;
      m.exp = 100;
      const before = player.exp;
      killMob(m);
      return player.exp - before;
    }

    beforeEach(() => {
      release();
      gotoPlace(climb(2));
      player.level = 10;
      player.exp = 0;
      player.expNext = 1e9;
    });

    it('no cheer, no bonus', () => {
      expect(expMult()).toBe(1);
      expect(cheerLeftMs()).toBe(0);
      expect(expFromAKill()).toBe(100);
    });

    it('gives +10% EXP on kills, and says who', () => {
      gotCheer('robin');
      expect(expFromAKill()).toBe(110);
      expect(chat.log.at(-1)?.text).toBe('ROBIN CHEERED YOU! +10% EXP FOR 30M');
      expect(cheer.from).toBe('ROBIN');
    });

    it('lasts half an hour', () => {
      gotCheer('robin');
      expect(cheerLeftMs()).toBeGreaterThan(CHEER.BUFF_MS - 1000);
      expect(expMult(Date.now() + CHEER.BUFF_MS + 1)).toBe(1);
    });

    it('cheers and the buff are saved', () => {
      gotCheer('robin');
      const saved = snapshot().cheer;
      expect(saved.until).toBeGreaterThan(Date.now());
      loadCheer(null);
      expect(cheerLeftMs()).toBe(0);
      loadCheer(saved);
      expect(cheerLeftMs()).toBeGreaterThan(0);
    });
  });
});
