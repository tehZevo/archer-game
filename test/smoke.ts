// Headless smoke test. Bundled with esbuild for node and run with `npm test`.
// No DOM required: runtime.ts falls back to stubs.

import { readdirSync, readFileSync } from 'node:fs';
import { BAKED_TILES } from '../src/tilebaked';
import { ATLAS_COLS, CELLS, pieces, SWAY_ROWS, topDeco } from '../src/tilebake';
import { TILESETS, TOP_W, TOP_Y } from '../src/tileset';
import { ART_GEN } from '../src/artsheets';
import { archerShape, DIVE_PITCH, GRIDS, lookColours, PAL, pitch, recolourFrame, sheetRows, styled, type ArcherPose } from '../src/archer';
import { BAKED_ARCHER } from '../src/archerbaked';
import { DEFAULT_LOOK, LOOK_COUNTS, lookPalette, type Look } from '../src/look';
import { hexRgb } from '../src/grid';
import { BAKED_ART } from '../src/artbaked';
import { P, MOB_TYPES, SKILL_BAR } from '../src/config';
import { BAKED } from '../src/fxbaked';
import { FX_GEN } from '../src/fxsprites';
import { packStrip } from '../src/grid';
import { decodePng } from '../scripts/png';
import { BAKED_MOBS } from '../src/mobbaked';
import { breath, lunge, mobAnim, MOB_GEN, recoil } from '../src/sprites';
import { slug } from '../scripts/slug';
import { game, player, gainExp, gotoPlace } from '../src/state';
import { nextPlace, placeKey, START } from '../src/world';
import { setKey } from '../src/input';
import { tick } from '../src/loop';
import { GLYPH, ICON_GLYPHS } from '../src/icons';
import { SKILLS } from '../src/config';
import { rank, spendSp, expToNext, isLearned, skillRows } from '../src/progress';

let failures = 0;
function check(name: string, cond: boolean): void {
  const ok = cond;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
}

function step(n = 1): void {
  for (let i = 0; i < n; i++) tick();
}

function reset(): void {
  gotoPlace({ path: 'shore', floor: 1 }); // Beach 1, the first floor above the Harbor
  player.x = 160; player.y = game.floor.platforms[0].y - player.h;
  player.vx = 0; player.vy = 0;
  player.onGround = true; player.climb = null;
  player.hp = player.hpMax; player.mp = player.mpMax;
  player.cast = null; player.castT = 0; player.castTotal = 0;
  player.links.combo = 0; player.fervor = 0; player.fervorT = 0;
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
// Glide commits you for its 0.2s use time; it has no cooldown to gate re-use.
check('Glide has a 0.2s use time and no cooldown', player.cd.D === 0 && Math.abs(player.casting.useT - 0.2) < 0.05,
  `cd ${player.cd.D} use ${player.casting.useT.toFixed(2)}`);
check('Glide launches forward > up', Math.abs(player.vx) > Math.abs(player.vy));
check('Glide consumes MP', player.mp < player.mpMax);
setKey('d', false);
step(7); // the 0.2s glide animation finishes
setKey('d', true);
step(1);
check('Glide can be used again mid-air', player.casting.useT > 0 && player.onGround === false,
  `use ${player.casting.useT.toFixed(2)}`);
setKey('d', false);

// --- 6. Double Shot: fires and spends MP, sets cd ---
reset();
setKey('z', true);
step(1 + Math.ceil(P.Z_WINDUP / P.STEP)); // the arrows fly after the bow-draw windup
check('Double Shot fires (muzzle flash, no projectile)', game.fx.some((f) => f.type === 'muzzle') && game.shots.length === 0);
check('Double Shot sets its use time', player.casting.useT > 0);
setKey('z', false);

// --- 7. combat: a hitbox kills a low-hp mob and awards exp ---
reset();
const mob = game.mobs[0];
mob.hp = 1;
const before = game.kills;
const expBefore = player.exp;
player.x = mob.x; player.y = mob.y;
setKey('z', true);
step(1 + Math.ceil((P.Z_WINDUP + 0.3) / P.STEP)); // the first hit lands after the windup; the kill waits for the second
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
check('pause menu spends SP to learn Rising Arrows', isLearned('W') && player.sp === 1);
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
check('Jump is movement, not a skill', !('C' in SKILLS));
check('every skill has an icon glyph', (Object.keys(SKILLS) as (keyof typeof ICON_GLYPHS)[]).every((k) => ICON_GLYPHS[k]?.length === GLYPH));
check('every upgrade names a keyed base slot', (Object.keys(SKILLS) as (keyof typeof SKILLS)[])
  .every((k) => !SKILLS[k].upgrades || SKILLS[SKILLS[k].upgrades!].keyed));
check('the skill bar is the keyed attack slots, Z Q W E R', SKILL_BAR.every((s) => SKILLS[s.skill].keyed));
check('Rush Toss learned at Lv.5', !isLearned('Q'));
player.ranks.W = 0;
check('Rising Arrows not known until picked', !isLearned('W'));

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

// every skill (bases, upgrades, passives) has its own icon glyph
{
  const keys = Object.keys(SKILLS) as (keyof typeof ICON_GLYPHS)[];
  check('every skill has an icon', keys.every((k) => ICON_GLYPHS[k]));
  check(`icon glyphs are ${GLYPH}x${GLYPH}`, Object.values(ICON_GLYPHS).every((g) => g.length === GLYPH && g.every((r) => r.length === GLYPH)));
  const flat = Object.values(ICON_GLYPHS).map((g) => g.join(''));
  check('icons are all distinct', new Set(flat).size === flat.length);
}

// baked effect sheets match their generators (re-run `npm run bake` after changing an effect)
{
  const stale = Object.entries(BAKED).filter(([name, s]) => {
    const g = FX_GEN[name]?.();
    if (!g || g.w !== s.w || g.h !== s.h || g.frames.length !== s.n || g.ox !== s.ox || g.oy !== s.oy) return true;
    const png = decodePng(readFileSync(`assets/fx/${name}.png`));
    return Buffer.compare(Buffer.from(png.px), Buffer.from(packStrip(g.frames).px)) !== 0;
  }).map(([n]) => n);
  check(`every baked effect sheet matches its generator${stale.length ? ' (stale: ' + stale.join(', ') + ')' : ''}`, stale.length === 0);
  check('every effect has a generator', Object.keys(BAKED).every((n) => FX_GEN[n]));
  const staleMobs = Object.entries(BAKED_MOBS).filter(([name, s]) => {
    const a = MOB_GEN[name]?.();
    if (!a || a.hurt.w !== s.w || a.hurt.h !== s.h || a.frames.length !== s.n || a.fps !== s.fps) return true;
    const png = decodePng(readFileSync(`assets/mobs/${slug(name)}.png`));
    return Buffer.compare(Buffer.from(png.px), Buffer.from(packStrip([...a.frames, a.hurt].map((f) => f.g)).px)) !== 0;
  }).map(([n]) => n);
  check(`every baked enemy sheet matches its painter${staleMobs.length ? ' (stale: ' + staleMobs.join(', ') + ')' : ''}`, staleMobs.length === 0);
  // tilesets: every piece's atlas cell matches what its painter draws now
  const staleTiles = Object.entries(TILESETS).filter(([name, ts]) => {
    const b = BAKED_TILES[name];
    if (!b) return true;
    const files = readdirSync('assets/tiles').filter((f) => f.startsWith(slug(name) + '-'));
    const png = new Map(files.map((f) => [f.replace(/\.png$/, '').split('-').pop()!, decodePng(readFileSync(`assets/tiles/${f}`))]));
    const ps = pieces(ts);
    if (ps.length !== b.at.length) return true;
    return ps.some(([, paint], j) => {
      const s = paint(), at = b.at[j];
      if (!s || at < 0) return !!s !== at >= 0;
      const sh = b.sheets[Math.floor(at / CELLS)], g = png.get(`${sh.w}x${sh.h}`), i = at % CELLS;
      if (!g || s.w !== sh.w || s.h !== sh.h) return true;
      const x0 = (i % ATLAS_COLS) * sh.w, y0 = Math.floor(i / ATLAS_COLS) * sh.h;
      for (let y = 0; y < sh.h; y++) {
        const row = g.px.subarray(((y0 + y) * g.w + x0) * 4, ((y0 + y) * g.w + x0 + sh.w) * 4);
        if (Buffer.compare(Buffer.from(row), Buffer.from(s.g.px.subarray(y * sh.w * 4, (y + 1) * sh.w * 4))) !== 0) return true;
      }
      return false;
    });
  }).map(([n]) => n);
  check(`every tileset atlas matches its painters${staleTiles.length ? ' (stale: ' + staleTiles.join(', ') + ')' : ''}`, staleTiles.length === 0);
  const staleArt = Object.keys(ART_GEN).filter((key) => {
    if (!BAKED_ART[key]) return true;
    const png = decodePng(readFileSync(`assets/art/${slug(key)}.png`)), g = ART_GEN[key]();
    return png.w !== g.w || png.h !== g.h || Buffer.compare(Buffer.from(png.px), Buffer.from(g.px)) !== 0;
  });
  check(`every scenery PNG matches its painter${staleArt.length ? ' (stale: ' + staleArt.slice(0, 5).join(', ') + ')' : ''}`, staleArt.length === 0);
  // the archer: sheets match the grids, and a look applied by swapping the
  // default colours matches painting the grids in that look's palette
  const staleArcher: string[] = [];
  for (let style = 0; style < LOOK_COUNTS.style; style++) for (let body = 0; body < LOOK_COUNTS.body; body++) {
    const shape = archerShape(style, body), png = decodePng(readFileSync(`assets/archer/${style}-${body}.png`));
    const bad = Object.entries(sheetRows(shape)).some(([p, r]) => shape[p as ArcherPose].some((g, f) => {
      for (let y = 0; y < r.h; y++) {
        const row = png.px.subarray(((r.y + y) * png.w + f * r.w) * 4, ((r.y + y) * png.w + (f + 1) * r.w) * 4);
        if (Buffer.compare(Buffer.from(row), Buffer.from(g.px.subarray(y * g.w * 4, (y + 1) * g.w * 4))) !== 0) return true;
      }
      return false;
    }));
    if (bad || !BAKED_ARCHER.sheets[`${style}-${body}`]) staleArcher.push(`${style}-${body}`);
  }
  check(`every archer sheet matches its grids${staleArcher.length ? ' (stale: ' + staleArcher.join(', ') + ')' : ''}`, staleArcher.length === 0);
  const looks: Look[] = [];
  for (const k of ['hair', 'skin', 'outfit'] as const) for (let i = 0; i < LOOK_COUNTS[k]; i++) looks.push({ ...DEFAULT_LOOK, style: i % LOOK_COUNTS.style, [k]: i });
  const wrong = looks.filter((look) => {
    const shape = archerShape(look.style, look.body), pal = { ...PAL, ...lookPalette(look) }, cols = lookColours(look);
    return (Object.keys(GRIDS) as ArcherPose[]).some((p) => GRIDS[p].some((rows0, f) => {
      let rows = styled(rows0, p, look.style, look.body);
      if (p === 'dive') rows = pitch(rows, DIVE_PITCH);
      const got = recolourFrame(shape[p][f], cols);
      return rows.some((r, y) => [...r].some((ch, x) => {
        const i = (y * got.w + x) * 4, want = pal[ch];
        if (!want) return got.px[i + 3] !== 0;
        const [R, G, B] = hexRgb(want);
        return got.px[i] !== R || got.px[i + 1] !== G || got.px[i + 2] !== B;
      }));
    }));
  });
  check(`every look recolours the default sheets exactly${wrong.length ? ' (' + wrong.length + ' wrong)' : ''}`, wrong.length === 0);
  check('every base enemy is baked', Object.keys(MOB_GEN).every((n) => BAKED_MOBS[n]));
  check('every enemy breathes: a standing frame sunk a pixel, same size', Object.keys(MOB_GEN).every((n) => {
    const a = mobAnim(n)!, b = breath(a);
    return b.w === a.frames[0].w && b.h === a.frames[0].h && b.g.px.join() !== a.frames[0].g.px.join();
  }));
  check('every enemy recoils when hurt: the hurt pose thrown back, same size', Object.keys(MOB_GEN).every((n) => {
    const a = mobAnim(n)!, r = recoil(a);
    return r.w === a.hurt.w && r.h === a.hurt.h && r.g.px.join() !== a.hurt.g.px.join();
  }));
  check('every enemy lunges: its standing frame thrown forward, same size', Object.keys(MOB_GEN).every((n) => {
    const a = mobAnim(n)!, l = lunge(a);
    return l.w === a.frames[0].w && l.g.px.join() !== a.frames[0].g.px.join() && l.g.px.join() !== recoil(a).g.px.join();
  }));
  check('every enemy type has art (baked, or recoloured from a baked base)', MOB_TYPES.every((m) => mobAnim(m.n)));
}

{ // swaying plants lean their tops and keep their roots
  const ts = Object.values(TILESETS).find((t) => t.name === 'Sunny Meadows')!, still = topDeco(ts, 0, false, false)!.g, lean = topDeco(ts, 0, false, false, 1)!.g;
  const row = (g: typeof still, y: number): string => Array.from(g.px.subarray(y * TOP_W * 4, (y + 1) * TOP_W * 4)).join();
  const roots = [...Array(SWAY_ROWS + 1).keys()].map((i) => TOP_Y - SWAY_ROWS + i);
  check('a sway frame leans the plants but keeps the roots', roots.every((y) => row(still, y) === row(lean, y)) && still.px.join() !== lean.px.join());
  const cc = Object.values(TILESETS).find((t) => t.name === 'Crystal Caverns')!, c0 = topDeco(cc, 1, true, true)!.g.px, c2 = topDeco(cc, 1, true, true, 2)!.g.px;
  check('a crystal\u2019s glow frame is brighter, same shape', c0.some((v, i) => i % 4 < 3 && c2[i] > v) && c0.every((v, i) => i % 4 < 3 ? c2[i] >= v : c2[i] === v));
  check('stones, posts and stumps hold still', topDeco(ts, 3, false, false, 1) === topDeco(ts, 3, false, false));
}

console.log(failures === 0 ? '\nAll tests passed.' : `\n${failures} test(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
