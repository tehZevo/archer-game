import { P, player, setKey, check, step, arena, dummy } from './harness';
// --- Gale Stream: holding Z after a shot streams arrows into the closest enemy
{
  const hold = (k: string, on: boolean): void => setKey(k, on);
  // not learned: holding Z fires the one Double Shot and nothing more
  arena(60);
  const a = dummy(150);
  hold('z', true); step(1);
  const afterShot = (): number => a.hpMax - a.hp;
  step(30);
  const once = afterShot();
  step(30);
  check('without Gale Stream, holding Z fires just the one shot', afterShot() === once && !player.rapid.on);
  hold('z', false); step(1);

  // learned: the shot plays out, then the stream starts and keeps hitting
  arena(60);
  player.ranks['held-z'] = true;
  const near = dummy(150), far = dummy(220);
  hold('z', true); step(1);
  check('a held Z shot arms the stream', player.rapid.armed && !player.rapid.on);
  step(Math.ceil(0.6 / P.STEP) + 1);
  check('the stream starts once the shot\'s use time is over', player.rapid.on);
  const before = near.hp, farBefore = far.hp, mp = player.mp;
  step(Math.round(1 / P.STEP)); // one second of streaming
  check('the stream keeps hitting the closest enemy', near.hp < before);
  check('...and only the closest one', far.hp === farBefore);
  const shots = Math.round(mp - player.mp);
  check('it fires about GALE_RATE shots a second (1 MP each)', Math.abs(shots - P.GALE_RATE) <= 1, `${shots}`);

  // walking backward: you move, but keep facing (and firing) ahead
  const x0 = player.x;
  hold('left', true); step(15);
  check('you can walk while streaming', player.x < x0 - 10, `${x0} -> ${player.x}`);
  check('walking backward doesn\'t turn you around', player.face === 1 && player.rapid.on);
  hold('left', false);

  // letting go ends it
  hold('z', false); step(1);
  check('letting go of Z ends the stream', !player.rapid.on && !player.rapid.armed);

  // out of MP ends it
  arena(60);
  player.ranks['held-z'] = true;
  dummy(150);
  hold('z', true); step(Math.ceil(0.6 / P.STEP) + 3);
  player.mp = 0; step(3);
  check('running out of MP ends the stream', !player.rapid.on);
  hold('z', false); step(1);
}
