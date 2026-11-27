import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { arena, dummy, release, step, tap } from './helpers';
import { useTime } from '../src/castrules';
import { P, SKILLS } from '../src/config';
import { PLAYER_DEATH_T } from '../src/deaths';
import { setKey } from '../src/input';
import { linkable, linkHeld } from '../src/links';
import { CASTS } from '../src/skillcasts';
import { player } from '../src/state';
import type { SkillKey } from '../src/types';

// A link: a skill pressed while another's animation plays is kept (buffered)
// and fires the moment that animation ends, skipping its recovery.

/** Learn these skills on a fresh Lv.20 archer. */
function learn(...skills: SkillKey[]): void {
  arena(20);
  for (const k of skills) player.ranks[k] = true;
}

/** Step until a buffered press has fired (or 30 frames pass). */
function untilQueuedFires(): number {
  let frames = 0;
  while (player.casting.queued && frames < 30) {
    step(1);
    frames++;
  }
  return frames;
}

/** Jump and be in the air (8 frames up). */
function jump(frames = 8): void {
  tap('c');
  step(frames);
}

/** Rush Toss, then Skyward Assault off it, a few frames into its hover. */
function intoAssaultHover(): void {
  tap('q');
  step(14);
  tap('w');
  step(3);
}

afterEach(() => release());

describe('every active skill has a cast', () => {
  it('(no skill is missing one)', () => {
    const missing = (Object.keys(SKILLS) as SkillKey[]).filter((k) => !SKILLS[k].passive && !CASTS[k]);
    expect(missing).toEqual([]);
  });
});

describe('links read off the cast you are in, and nothing else', () => {
  beforeEach(() => learn('r'));

  it('no cast, no links', () => {
    expect(player.linkFrom).toBe(null);
    expect(linkable('air-q')).toBe(false);
  });

  it('a cast is what links read off', () => {
    tap('r');
    expect(player.linkFrom).toBe('r');
    expect(linkable('air-q')).toBe(true);
  });

  it('once the cast ends, a press is a normal cast', () => {
    tap('r');
    step(40); // the storm and its recovery are over
    expect(player.linkFrom).toBe(null);
  });

  it('a respawn starts with no links', () => {
    tap('r');
    player.hp = 0;
    step(1 + Math.ceil(PLAYER_DEATH_T / P.STEP));
    tap('z'); // revive
    expect(player.linkFrom).toBe(null);
  });
});

describe('buffering', () => {
  it('a buffered skill fires the way you hold when it fires, not when you pressed it', () => {
    learn('ground-q');
    dummy(150);
    setKey('left', true);
    tap('q');
    step(1); // the first rush slides left...
    setKey('left', false);
    setKey('right', true);
    tap('q'); // ...and the next is buffered while Right is held
    step(10); // the first rush ends and the buffered one fires
    expect(player.face).toBe(1);
    expect(player.vx).toBeGreaterThan(0);
  });
});

describe('Electric Blitz', () => {
  beforeEach(() => {
    learn('ground-q', 'eb', 'air-q');
    player.blitz.charges = P.BLITZ_MAX;
    dummy(150);
  });

  it('a second blitz pressed during the first (with a charge banked) fires as soon as it clears', () => {
    tap('q');
    expect(linkable('eb')).toBe(true);
    tap('q'); // pressed mid-animation: buffered, not dropped
    expect(player.casting.queued).toBe('ground-q');
    step(12); // the first blitz's slide (0.34s) ends
    expect(player.blitz.charges).toBe(P.BLITZ_MAX - 2);
    expect(player.cast).toBe('rush');
    expect(player.linkFrom).toBe('eb'); // links now read off the chained blitz
    expect(player.castT).toBeGreaterThan(0.3);
  });

  it('Meteor Dive links into it on landing, with no use-time wait', () => {
    jump();
    tap('q');
    step(15); // the windup, the plunge, and the landing rush
    expect(linkable('eb')).toBe(true);
    expect(linkHeld('eb')).toBe(false);
    const charges = player.blitz.charges;
    tap('q');
    step(1);
    expect(player.blitz.charges).toBe(charges - 1);
    expect(player.cast).toBe('rush');
  });
});

describe('aerial links', () => {
  it('Downpour links into Cyclone Sweep: W pressed mid-volley fires as the volley ends', () => {
    learn('d', 'ground-e', 'air-e', 'air-w');
    dummy(100);
    jump(4);
    tap('e');
    expect(linkable('air-w')).toBe(true);
    expect(player.casting.useT).toBeGreaterThan(0);
    tap('w');
    expect(player.casting.queued).toBe('ground-w');
    const frames = untilQueuedFires();
    expect(player.cast).toBe('shoot');
    expect(Math.abs(frames * P.STEP - useTime('air-e'))).toBeLessThan(0.07);
  });

  it('a whiffed Downpour still links (linking needs no hit)', () => {
    learn('ground-e', 'air-e');
    jump();
    tap('e');
    expect(linkable('air-w')).toBe(true);
  });

  it('Cyclone Sweep links into Glide', () => {
    learn('d', 'ground-w', 'air-w');
    dummy(150);
    jump();
    tap('w');
    step(13);
    expect(linkable('d')).toBe(true);
    tap('d');
    untilQueuedFires();
    expect(player.cast).toBe('jump');
    expect(player.casting.useT).toBeGreaterThan(0);
  });

  it('Cyclone Sweep links into Downpour', () => {
    learn('ground-w', 'air-w', 'ground-e', 'air-e');
    dummy(100);
    jump();
    tap('w');
    step(13);
    expect(linkable('air-e')).toBe(true);
    tap('e');
    untilQueuedFires();
    expect(player.cast).toBe('barrage');
    expect(player.linkFrom).toBe('air-e');
  });

  it('a plain jump\'s Cyclone Sweep (no link) fires as usual', () => {
    learn('ground-w', 'air-w');
    jump(10);
    expect(player.cast).toBe(null);
    expect(player.linkFrom).toBe(null);
    tap('w');
    step(2);
    expect(player.cast).toBe('shoot');
  });
});

describe('Skyward Assault', () => {
  it('with it learned, W in the air is still Cyclone Sweep, which hits below and doesn\'t hover', () => {
    learn('ground-q', 'ground-w', 'ab', 'air-w');
    const m = dummy(140);
    jump();
    tap('w');
    expect(player.cast).toBe('shoot');
    expect(player.skillPose).toBe('spin');
    expect(player.cd['ground-w.air']).toBeGreaterThan(0);
    expect(player.hang.t).toBe(0);
    expect(m.hp).toBeLessThan(1e6);
    step(40);
    expect(player.onGround).toBe(true);
  });

  describe('off its hover', () => {
    it('Glide pressed during the hover is dropped (it is not a link off the assault)', () => {
      learn('ground-q', 'ground-w', 'ab', 'd');
      dummy(130);
      intoAssaultHover();
      expect(player.hang.t).toBeGreaterThan(0);
      expect(player.onGround).toBe(false);
      tap('d');
      expect(player.casting.queued).toBe(null);
      expect(player.hang.t).toBeGreaterThan(0);
    });

    it('Downpour waits out the whole hover, then fires', () => {
      learn('ground-q', 'ground-w', 'ab', 'air-e');
      dummy(130);
      intoAssaultHover();
      tap('e');
      expect(player.hang.t).toBeGreaterThan(0);
      expect(player.casting.queued).not.toBe(null);
      let hoverFrames = 0;
      while (player.hang.t > 0 && hoverFrames < 60) {
        step(1);
        hoverFrames++;
      }
      step(1);
      expect(hoverFrames).toBeGreaterThan(10);
      expect(player.cast).toBe('barrage');
      expect(player.linkFrom).toBe('air-e');
    });

    it('Meteor Dive waits out the whole hover, then fires', () => {
      learn('ground-q', 'ground-w', 'ab', 'air-q');
      dummy(130);
      intoAssaultHover();
      expect(linkable('air-q')).toBe(true);
      expect(linkHeld('air-q')).toBe(true);
      tap('q');
      expect(player.casting.queued).not.toBe(null);
      let hoverFrames = 0;
      while (player.hang.t > 0 && hoverFrames < 60) {
        step(1);
        hoverFrames++;
      }
      step(1);
      expect(hoverFrames).toBeGreaterThan(10);
      expect(player.cast).toBe('dive');
      expect(player.linkFrom).toBe('air-q');
    });

    it('Cyclone Sweep fires out of the hover with no extra lag, ending it and stacking Fervor', () => {
      learn('ground-q', 'ground-w', 'ab', 'air-w');
      const m = dummy(130);
      tap('q');
      step(14);
      tap('w');
      step(4); // mid-leap: the hover is live
      expect(player.hang.t).toBeGreaterThan(0);
      expect(player.cast).toBe('barrage');
      expect(linkable('air-w')).toBe(true);
      expect(linkHeld('air-w')).toBe(true);
      const fervor = player.fervor;
      tap('w');
      expect(player.casting.queued).not.toBe(null);
      let hoverFrames = 0;
      while (player.hang.t > 0 && hoverFrames < 60) {
        step(1);
        hoverFrames++;
      }
      step(12); // the sweep's four hits stagger out
      expect(player.cast).toBe('shoot');
      expect(player.linkFrom).toBe('air-w');
      expect(m.hp).toBeLessThan(1e6);
      expect(player.hang.t).toBeLessThanOrEqual(0);
      expect(player.fervor).toBe(fervor + 1);
    });

    it('a W pressed during the assault\'s own leap is buffered, and fires once the hover ends', () => {
      learn('ground-q', 'ground-w', 'ab', 'air-w');
      dummy(130);
      tap('q');
      step(14);
      tap('w');
      expect(player.cast).toBe('barrage');
      expect(player.castT).toBeGreaterThan(0);
      tap('w');
      expect(player.casting.queued).not.toBe(null);
      let hoverFrames = 0;
      while (player.hang.t > 0 && hoverFrames < 60) {
        step(1);
        hoverFrames++;
      }
      step(1);
      expect(player.cast).toBe('shoot');
      expect(player.casting.queued).toBe(null);
    });
  });
});

describe('Tempest', () => {
  it('links into Meteor Dive, which fires out of the storm as it ends', () => {
    learn('r', 'ground-q', 'air-q');
    jump(7); // airborne, where Q is the Meteor Dive
    tap('r');
    expect(linkable('air-q')).toBe(true);
    expect(player.cast).toBe('shoot');
    const mp = player.mp;
    tap('q');
    untilQueuedFires();
    expect(player.cast).toBe('dive');
    expect(player.mp).toBeLessThan(mp);
  });

  it('links into the Q slot only, not the whole aerial kit', () => {
    learn('r');
    tap('r');
    expect(linkable('air-q')).toBe(true);
    expect(linkable('ground-w')).toBe(false);
  });

  it('a Rising Arrows after it isn\'t a link (the storm is no launcher), so it pays its own cooldown', () => {
    learn('r');
    tap('r');
    player.cd.r = 10;
    tap('w');
    step(1);
    expect(player.cast).toBe('shoot');
    expect(player.cd.r).toBeGreaterThan(9);
  });
});

describe('more links', () => {
  it('a Tempest linked off the Assault hover still pays its cooldown (less the 1s a link shaves)', () => {
    learn('ground-q', 'ab', 'r');
    dummy(130);
    intoAssaultHover();
    tap('r');
    untilQueuedFires(); // fires as the hover ends
    expect(player.cast).toBe('shoot');
    expect(player.cd.r).toBeGreaterThan(8);
    expect(player.cd.r).toBeLessThan(10);
    // so a second cast right away is spent
    tap('r');
    expect(player.cd.r).toBeGreaterThan(8);
    expect(player.castT).toBeGreaterThan(0);
  });

  it('a Glide pressed mid-sweep is buffered, and fires as the sweep ends', () => {
    learn('d', 'ground-w', 'air-w');
    const m = dummy(150);
    jump();
    tap('w');
    expect(player.cast).toBe('shoot');
    expect(m.hp).toBeLessThan(1e6); // the sweep hits on the cast
    expect(player.castT).toBeGreaterThan(useTime('air-w') - 0.4); // and poses for its whole animation
    tap('d');
    expect(player.casting.queued).toBe('d');
    const frames = untilQueuedFires();
    expect(Math.abs(frames * P.STEP - useTime('air-w'))).toBeLessThan(0.1);
    expect(player.cast).toBe('jump');
  });

  it('Glide links into Meteor Dive, which fires as the Glide ends', () => {
    learn('ground-q', 'air-q');
    jump(4);
    tap('d');
    expect(player.linkFrom).toBe('d');
    expect(linkable('air-q')).toBe(true);
    tap('q');
    let fired = -1;
    for (let i = 0; i < 30 && fired < 0; i++) {
      step(1);
      if (player.cast === 'dive') fired = i;
    }
    expect(fired).toBeGreaterThanOrEqual(0);
    expect(fired).toBeLessThan(16);
    expect(player.linkFrom).toBe('air-q');
  });
});
