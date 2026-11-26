import { game, player, setKey, check, step, tap, arena, dummy } from './harness';
// --- Skyward Assault's look: a slash up, bangs in the air, a slash back down
{
  arena(20); player.ranks['ground-w'] = true; player.ranks.ab = true;
  dummy(125);
  setKey('down', true); tap('q'); setKey('down', false); step(12);
  game.fx = [];
  tap('w');
  const seen = new Set<string>(), order: string[] = [];
  const note = (): void => { for (const f of game.fx) if (!seen.has(f.type) || f.type === 'assaultBang') { if (!seen.has(f.type)) order.push(f.type); seen.add(f.type); } };
  note();
  let bangs = 0;
  for (let i = 0; i < 45; i++) { const before = game.fx.filter((f) => f.type === 'assaultBang').length; step(); note(); bangs += Math.max(0, game.fx.filter((f) => f.type === 'assaultBang').length - before); }
  check('Skyward Assault slashes up as she leaps', order[0] === 'assaultRise' || seen.has('assaultRise'));
  check('...bangs on the enemies in the air, strike by strike', bangs >= 2, `${bangs} bangs`);
  check('...and its last strike slashes back down', seen.has('assaultDrop') && order.indexOf('assaultDrop') > order.indexOf('assaultBang'));
}
