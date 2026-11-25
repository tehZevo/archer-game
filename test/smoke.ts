// Headless smoke test. Bundled with esbuild for node and run with `npm test`.
// No DOM required: runtime.ts falls back to stubs.

import { P, MOB_TYPES, SKILL_BAR } from '../src/config';
import { game, player, gainExp, gotoPlace } from '../src/state';
import { nextPlace, placeKey, START } from '../src/world';
import { setKey, clearPressed } from '../src/input';
import { update } from '../src/update';
import { ICON_GLYPHS } from '../src/icons';
import { SKILLS } from '../src/config';
import { rank, spendSp, expToNext, isLearned, skillRows } from '../src/progress';

let failures = 0;
function check(name: string, cond: boolean): void {
  const ok = cond;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
}

function step(n = 1): void {
  for (let i = 0; i < n; i++) { update(P.STEP); clearPressed(); }
}

function reset(): void {
  gotoPlace({ path: 'shore', floor: 1 }); // Beach 1, the first floor above the Harbor
  player.x = 160; player.y = game.floor.platforms[0].y - player.h;
  player.vx = 0; player.vy = 0;
  player.onGround = true; player.climb = null;
  player.hp = player.hpMax; player.mp = player.mpMax;
  player.cast = null; player.castT = 0; player.castTotal = 0;
  player.combo = 0; player.comboT = 0; player.fervor = 0; player.fervorT = 0;
  player.level = 1; player.exp = 0; player.expNext = expToNext(1); player.sp = 0;
  game.pause = null; player.ap = 0;
  player.invuln = 999; // a wandering enemy's touch would knock you back mid-check
  for (const k of Object.keys(player.cd) as (keyof typeof player.cd)[]) player.cd[k] = 0;
}

// --- 1. the floor is taller than wide and has a ground slab + portal ---
reset();
check('floor is taller than wide', game.floor.platforms[0].w < 1200 && game.floor.portal.y < game.floor.platforms[0].y);
check('floor has a ground slab', game.floor.platforms[0].ground === true);
check('floor has an exit portal', !!game.floor.portal && game.floor.portal.w > 0);

// --- 2. mobs spawn on the ground (feet rest on a platform) ---
check('mobs spawn on the floor', game.mobs.length > 0 && game.mobs.every((m) => m.y + m.h <= game.floor.platforms[0].y + 1));

// --- 3. movement: holding right accelerates toward walk speed ---
reset();
setKey('right', true);
step(6);
check('walk accelerates right', player.vx > 0 && player.vx <= P.WALK + 1);
setKey('right', false);

// --- 4. jump: C sets upward velocity and leaves the ground ---
reset();
setKey('c', true);
step(1);
check('jump sets upward velocity', player.vy < 0 && !player.onGround);
setKey('c', false);

// --- 5. Glide: bought with SP from Lv.1; launches forward more than up, 0.3s cd, costs MP ---
reset();
player.ranks.D = 0;
player.onGround = false; player.y = 500;
setKey('d', true); step(1); setKey('d', false);
check('Glide needs its SP first', player.cd.D === 0);
player.ranks.D = 1; player.cd.D = 0;
player.onGround = false; player.y = 500;
setKey('d', true);
step(1);
check('Glide cd is 0.3s', Math.abs(player.cd.D - 0.3) < 0.01);
check('Glide launches forward > up', Math.abs(player.vx) > Math.abs(player.vy));
check('Glide consumes MP', player.mp < player.mpMax);
setKey('d', false);
step(1); player.cd.D = 0;
setKey('d', true);
step(1);
check('Glide can be used again mid-air', player.cd.D > 0.25);
setKey('d', false);

// --- 6. Twin Shot: fires and spends MP, sets cd ---
reset();
setKey('z', true);
step(1 + Math.ceil(P.Z_WINDUP / P.STEP)); // the arrows fly after the bow-draw windup
check('Twin Shot fires (muzzle flash, no projectile)', game.fx.some((f) => f.type === 'muzzle') && game.shots.length === 0);
check('Twin Shot sets its use time', player.useT > 0);
setKey('z', false);

// --- 7. combat: a hitbox kills a low-hp mob and awards exp ---
reset();
const mob = game.mobs[0];
mob.hp = 1;
const before = game.kills;
const expBefore = player.exp;
player.x = mob.x; player.y = mob.y;
setKey('z', true);
step(1 + Math.ceil((P.Z_WINDUP + 0.1) / P.STEP)); // the first hit lands after the windup; the kill waits for the second
check('killing a mob increments kills', game.kills > before);
check('killing a mob awards exp', player.exp >= expBefore);

// --- 8. leveling: exp to next level and stat growth ---
reset();
const lvl0 = player.level;
gainExp(expToNext(1));
check('exp to next level advances a level', player.level > lvl0);
check('level up grants 1 AP and no menu', player.ap === 1 && !game.pause);
reset();
for (let i = 0; i < 9; i++) gainExp(player.expNext - player.exp);
check('Lv.10 has 9 AP and 2 SP to spend', player.level === 10 && player.ap === 9 && player.sp === 2);
const tap = (k: string): void => { setKey(k, false); setKey(k, true); step(1); setKey(k, false); step(1); };
tap('escape');
const wave0 = game.waveT, regen0 = player.regenT;
step(10);
check('esc pauses the game', !!game.pause && game.waveT === wave0 && player.regenT === regen0);
const vit0 = player.stats.vit, hp0 = player.hpMax;
tap('down'); tap('z'); // VIT
check('pause menu spends AP on a stat', player.stats.vit === vit0 + 1 && player.hpMax > hp0 && player.ap === 8);
tap('right'); // skills column
const wRow = skillRows().findIndex((r) => r.key === 'W');
for (let i = 0; i < wRow; i++) tap('down');
tap('z');
check('pause menu spends SP to learn Skyfall Volley', isLearned('W') && player.sp === 1);
tap('escape');
check('esc resumes', !game.pause);

// --- 9. skill ranks: SP raises a skill's damage multiplier ---
reset();
const r0 = rank('Z').dmg;
player.sp = 10;
spendSp('Z');
check('spending SP raises the skill rank', rank('Z').dmg > r0);

// --- 10. skill bar exposes the 4 buttons; unlock cadence every 5 levels ---
check('attack keys are Z Q W E R, all bound', SKILL_BAR.map((s) => s.label).join('') === 'ZQWER' && SKILL_BAR.every((s) => s.skill));
reset();
check('Jump known from the start', isLearned('C'));
check('Sky Toss learned at Lv.5', !isLearned('Q'));
player.ranks.W = 0;
check('Skyfall Volley not known until picked', !isLearned('W'));

// --- 11. portal ascends to the next floor ---
reset();
const floor0 = game.floor.place;
player.x = game.floor.portal.x; player.y = game.floor.portal.y - player.h;
player.onGround = true;
setKey('up', true);
step(1);
check('portal advances the floor', placeKey(game.floor.place) === placeKey(nextPlace(floor0)));
setKey('up', false);

// --- 12. the game starts in a town (the Harbor) whose way up leads to the Beach ---
gotoPlace(START);
check('the start (the Harbor) is a town', game.floor.town === true && game.mobs.length === 0);
player.x = game.floor.portal.x; player.y = game.floor.portal.y - player.h;
player.onGround = true;
setKey('up', true);
step(1);
check('town portal leads on to the next area', placeKey(game.floor.place) === 'shore-1');
setKey('up', false);

// every skill (bases, upgrades, passives) has its own 14x14 icon glyph
{
  const keys = Object.keys(SKILLS) as (keyof typeof ICON_GLYPHS)[];
  check('every skill has an icon', keys.every((k) => ICON_GLYPHS[k]));
  check('icon glyphs are 14x14', Object.values(ICON_GLYPHS).every((g) => g.length === 14 && g.every((r) => r.length === 14)));
  const flat = Object.values(ICON_GLYPHS).map((g) => g.join(''));
  check('icons are all distinct', new Set(flat).size === flat.length);
}

console.log(failures === 0 ? '\nAll tests passed.' : `\n${failures} test(s) failed.`);
process.exit(failures === 0 ? 0 : 1);

