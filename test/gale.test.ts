import { afterEach, describe, expect, it } from 'vitest';
import { arena, dummy, release, step, tap } from './helpers';
import { P } from '../src/config';
import { setKey } from '../src/input';
import { game, player } from '../src/state';

// Gale Stream: holding Z after a Double Shot streams arrows into the closest enemy.

/** Frames for a held Z's first shot to play out, so the stream starts. */
const UNTIL_STREAMING = Math.ceil(0.6 / P.STEP) + 2;

/** A Lv.60 archer with Gale Stream, holding Z until the stream is running. */
function startStream(): void {
  arena(60);
  player.ranks['held-z'] = true;
  setKey('z', true);
  step(UNTIL_STREAMING);
}

/** Jump while streaming (which makes the dodge roll). */
function jump(): void {
  setKey('c', true);
  step(1);
  setKey('c', false);
}

afterEach(() => release());

describe('Gale Stream', () => {
  it('without it, holding Z fires just the one Double Shot', () => {
    arena(60);
    const m = dummy(150);
    setKey('z', true);
    step(31);
    const once = m.hpMax - m.hp;
    step(30);
    expect(m.hpMax - m.hp).toBe(once);
    expect(player.rapid.on).toBe(false);
  });

  it('a held Z shot arms the stream, which starts once the shot\'s cast is over', () => {
    arena(60);
    player.ranks['held-z'] = true;
    dummy(150);
    setKey('z', true);
    step(1);
    expect(player.rapid.armed).toBe(true);
    expect(player.rapid.on).toBe(false);
    step(UNTIL_STREAMING - 1);
    expect(player.rapid.on).toBe(true);
  });

  it('keeps hitting the closest enemy only, about GALE_RATE shots a second (1 MP each)', () => {
    arena(60);
    player.ranks['held-z'] = true;
    const near = dummy(150);
    const far = dummy(220);
    setKey('z', true);
    step(UNTIL_STREAMING);
    const nearHp = near.hp, farHp = far.hp;
    step(Math.round(1 / P.STEP)); // one second of streaming
    expect(near.hp).toBeLessThan(nearHp);
    expect(far.hp).toBe(farHp);
  });

  it('you can walk backward while streaming, still facing (and firing) ahead', () => {
    startStream();
    dummy(player.x + 50);
    const x = player.x;
    setKey('left', true);
    step(15);
    expect(player.x).toBeLessThan(x - 10);
    expect(player.face).toBe(1);
    expect(player.rapid.on).toBe(true);
  });

  it('letting go of Z ends it', () => {
    startStream();
    setKey('z', false);
    step(1);
    expect(player.rapid.on).toBe(false);
    expect(player.rapid.armed).toBe(false);
  });

  it('running out of MP ends it', () => {
    startStream();
    dummy(150);
    step(1);
    player.mp = 0;
    step(3);
    expect(player.rapid.on).toBe(false);
  });
});

describe('the dodge roll (a Jump while streaming)', () => {
  it('is invulnerable, in its dive pose', () => {
    startStream();
    jump();
    expect(player.invuln).toBeGreaterThan(0);
    expect(player.invuln).toBeLessThanOrEqual(P.ROLL_INVULN);
    expect(player.diving).toBeTruthy();
    expect(player.rolling).toBe(true);
  });

  it('turns the stream round: it fires the other way, and you face it', () => {
    startStream();
    expect(player.rapid.face).toBe(1);
    setKey('right', true);
    jump();
    expect(player.rapid.face).toBe(-1);
    expect(player.face).toBe(-1);
  });

  it('you can\'t Glide out of it', () => {
    startStream();
    player.ranks.d = true;
    jump();
    const mp = player.mp;
    tap('d');
    expect(player.cast !== 'jump' || player.mp === mp).toBe(true);
  });

  it('ends on its own (no rush slide or strike), and the stream keeps going', () => {
    startStream();
    const x = player.x;
    setKey('right', true);
    jump();
    setKey('right', false);
    step(30); // the hop lands
    expect(player.rolling).toBe(false);
    expect(player.diving).toBeFalsy();
    expect(player.rush.t).toBeLessThanOrEqual(0);
    expect(player.x).toBeGreaterThan(x);
    expect(player.face).toBe(-1);
    expect(player.rapid.on).toBe(true);
  });

  it('deals no damage, even rolling onto an enemy', () => {
    startStream(); // on an empty floor
    player.rapid.t = 99; // hold the stream's next shot off, so only the roll could hurt
    const m = dummy(player.x + 20);
    setKey('right', true);
    jump();
    expect(player.rolling).toBe(true);
    step(30);
    expect(m.hp).toBe(m.hpMax);
    expect(game.fx.some((f) => f.type === 'diveLand')).toBe(false);
  });
});

describe('which way the dodge roll goes', () => {
  /** Stream to the left, then roll holding `hold`. Returns which way you rolled
   *  (1 right, -1 left), which way the stream fires, and its shots in each tenth of a second. */
  function roll(hold: 'left' | 'right' | null): { rolled: number; fires: number; shots: number[] } {
    arena(60);
    player.ranks['held-z'] = true;
    setKey('left', true); // face (and shoot) left
    step(1);
    setKey('left', false);
    setKey('z', true);
    step(UNTIL_STREAMING);
    const x = player.x;
    if (hold) setKey(hold, true);
    jump();
    const fires = player.rapid.face;
    const shots: number[] = [];
    for (let i = 0; i < 9; i++) {
      const mp = player.mp;
      step(3);
      shots.push(mp - player.mp);
    }
    release();
    step(20);
    return { rolled: Math.sign(player.x - x), fires, shots };
  }

  it('holding nothing, it rolls away from where you face (and keeps shooting that way)', () => {
    const r = roll(null);
    expect(r.rolled).toBe(1);
    expect(r.fires).toBe(-1);
  });

  it('holding left: roll left, shoot right', () => {
    const r = roll('left');
    expect(r.rolled).toBe(-1);
    expect(r.fires).toBe(1);
  });

  it('holding right: roll right, keep shooting left', () => {
    const r = roll('right');
    expect(r.rolled).toBe(1);
    expect(r.fires).toBe(-1);
  });

  it('the stream holds fire through the roll\'s 0.5s use, then picks up', () => {
    const { shots } = roll(null);
    expect(shots.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(shots.slice(5).some((n) => n > 0)).toBe(true);
  });
});
