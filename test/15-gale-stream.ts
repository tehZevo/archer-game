import { P, game, player, setKey, check, step, tap, arena, dummy } from './harness';
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
  step(Math.ceil(0.6 / P.STEP) + 2);
  check('the stream starts once the shot\'s full cast is over', player.rapid.on);
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

// --- the dive roll a Jump makes mid-stream: no speed trail, and you turn ---
{
  const hold = (k: string, on: boolean): void => setKey(k, on);
  arena(60);
  player.ranks['held-z'] = true;
  dummy(150);
  hold('z', true); step(Math.ceil(0.6 / P.STEP) + 2); // arm and start the stream
  check('the stream is running', player.rapid.on);
  const face = player.rapid.face, x0 = player.x;
  hold('right', true);
  hold('c', true); step(1); hold('c', false); // Jump -> the dive roll
  check('the roll is invulnerable, in its dive pose', player.invuln > 0 && player.invuln <= P.ROLL_INVULN && player.diving && player.rolling);
  check('the stream turns round: it fires the opposite way it was, and you face it', face === 1 && player.rapid.face === -1 && player.face === -1, `${face} -> ${player.rapid.face} face ${player.face}`);
  const ranks = player.ranks.d; player.ranks.d = true; const mp = player.mp;
  tap('d');
  check('you can\'t Glide out of the roll', player.cast !== 'jump' || player.mp === mp, `cast ${player.cast}`);
  player.ranks.d = ranks;
  hold('right', false);
  step(30); // the hop lands and the roll ends
  check('the roll ends on its own: no rush slide or strike', !player.rolling && !player.diving && player.rush.t <= 0 && player.x > x0 && player.face === -1);
  check('...and the stream is still going', player.rapid.on);
  hold('z', false); step(1);
}
{
  // the roll deals no damage, even rolling onto an enemy
  arena(60); player.ranks['held-z'] = true; player.ranks['ground-q'] = true;
  // start a stream on an empty floor, then hold its next shot off (so only the roll could hurt)
  setKey('z', true); step(Math.ceil(0.6 / P.STEP) + 2); player.rapid.t = 99;
  const m = dummy(player.x + 20), hp0 = m.hp;
  setKey('right', true); setKey('c', true); step(1); setKey('c', false); setKey('right', false);
  check('(the jump made the dodge roll)', player.rolling);
  step(30);
  setKey('z', false); step(1);
  check('the dodge roll deals no damage', m.hp === hp0 && !game.fx.some((f) => f.type === 'diveLand'), `hp ${hp0 - m.hp}`);
}

// --- the dodge roll's direction: the way you hold (else away from your
// facing), and the stream fires back the opposite way to the roll; its use
// time holds fire, which picks up as its recovery starts
{
  const roll = (hold: 'left' | 'right' | null): { rolled: number; fires: number; shots: number[] } => {
    arena(60); player.ranks['held-z'] = true;
    setKey('left', true); step(1); setKey('left', false); // face (and shoot) left
    setKey('z', true); step(Math.ceil(0.6 / P.STEP) + 2);
    const x0 = player.x;
    if (hold) setKey(hold, true);
    setKey('c', true); step(1); setKey('c', false);
    const fires = player.rapid.face;
    // count the stream's shots in each 1/10 s across the roll
    const shots: number[] = [];
    for (let i = 0; i < 9; i++) { const mp = player.mp; step(3); shots.push(mp - player.mp); }
    if (hold) setKey(hold, false);
    setKey('z', false); step(20);
    return { rolled: Math.sign(player.x - x0), fires, shots };
  };
  const none = roll(null), left = roll('left'), right = roll('right');
  check('facing left, holding nothing: roll right, keep shooting left', none.rolled === 1 && none.fires === -1, JSON.stringify(none));
  check('holding left: roll left, shoot right', left.rolled === -1 && left.fires === 1, JSON.stringify(left));
  check('holding right: roll right, keep shooting left', right.rolled === 1 && right.fires === -1, JSON.stringify(right));
  const quiet = none.shots.slice(0, 4).every((n) => n === 0), back = none.shots.slice(5).some((n) => n > 0);
  check('the stream holds fire through the roll\'s 0.5s use, then picks up', P.ROLL_USE === 0.5 && P.ROLL_DELAY === 0.2 && quiet && back, none.shots.join(','));
}
