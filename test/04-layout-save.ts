import { seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, PAUSE_ROWS, pauseScroll, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, RECOLOR, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';
// --- bug: fast ground moves sank into slopes ---
{
  // Rush Toss's slide (~10px/frame) outran the 4px ground stick on 2:1 ramps
  // and the player dropped into the slope. Cast it up and down every ramp tile.
  let tries = 0, sank = 0;
  // the Beach floor with the most ramps
  const slopes = (): Platform[] => game.floor.platforms.filter((p) => !p.inner && p.slope);
  const best = [2, 3, 4].map(climb).map((pl) => (gotoPlace(pl), { pl, n: slopes().length })).sort((x, y) => y.n - x.n)[0].pl;
  gotoPlace(best);
  const tiles = slopes();
  for (const p of tiles) for (const face of [1, -1] as const) {
    arena(1); gotoPlace(best); game.mobs = []; game.floor.spawns = []; player.climb = null;
    const walk = game.floor.platforms.filter((q) => !q.inner);
    player.x = p.x + p.w / 2; player.y = surfaceYAt(p, player.x) - player.h; player.plat = p; player.face = face;
    step(1); if (!player.onGround) continue;
    tries++; tap('q');
    for (let i = 0; i < 20; i++) {
      step(1);
      const feet = player.y + player.h;
      if (walk.some((q) => player.x >= q.x && player.x < q.x + q.w && feet > surfaceYAt(q, player.x) + 3 && feet < surfaceYAt(q, player.x) + 14)) { sank++; break; }
    }
  }
  check('Rush Toss never sinks into a slope', tries > 20 && sank === 0, `${sank}/${tries}`);
}

// --- bug: the climb animation played while hanging still ---
{
  const frames = { ...GRIDS, climb: [['a'], ['b']] } as never;
  const f = (feet: number): unknown => archerFrame(frames, 'climb', climbPhase(feet));
  check('climb frame holds while still, steps while climbing', f(100) === f(100) && f(100) === f(103) && f(100) !== f(108));
}

// --- floor layout + jump height ---
{
  arena(1);
  let apex = 0;
  const y0 = player.y;
  tap('c');
  for (let i = 0; i < 40; i++) { step(1); apex = Math.max(apex, y0 - player.y); }
  check('a jump rises about 35px (25% lower than 46.5)', apex > 32 && apex < 38, `apex ${apex.toFixed(1)}`);
  const seen = new Set<string>();
  const bad: string[] = [];
  for (let n = 1; n <= 24; n++) { // up the leftmost branch, to Mushroom Grotto's town
    if (isTown(climb(n))) continue;
    gotoPlace(climb(n));
    const f = game.floor, L = LAYOUTS[f.layout as Layout];
    seen.add(f.layout!);
    const ids = [...new Set(f.platforms.filter((p) => p.block !== undefined).map((p) => p.block))];
    const span = f.platforms[0].y - f.portal.y;
    if (ids.length !== L.count || span < 150 || span > 500) bad.push(`floor ${n} (${f.layout}): ${ids.length} blocks, span ${span}`);
    for (const b of ids) {
      const w = new Set(f.platforms.filter((p) => p.block === b).map((p) => p.x)).size;
      if (w < L.minW || w > L.maxW) bad.push(`floor ${n} block ${b}: ${w} wide`);
    }
    if (f.layout === 'zigzag') {
      const mid = ids.map((b) => { const xs = f.platforms.filter((p) => p.block === b).map((p) => p.x); return (Math.min(...xs) + Math.max(...xs)) / 2; });
      if (mid.some((m, i) => i && (m < WORLD.w / 2) === (mid[i - 1] < WORLD.w / 2))) bad.push(`floor ${n}: zigzag doesn't switch sides`);
    }
    // no climb's foot meets another climb's top in the same column
    const cs = [...f.ropes, ...f.ladders];
    if (cs.some((a) => cs.some((b) => a !== b && Math.abs(a.x - b.x) < TILE && a.y2 >= b.y1 - 1 && a.y1 < b.y1)))
      bad.push(`floor ${n}: stacked climbs`);
  }
  check('floors 1-24 use every layout (stack, zigzag, open)', seen.size === Object.keys(LAYOUTS).length, [...seen].join(','));
  check('each layout keeps its block count, widths and span; zigzags switch sides; climbs never stack', bad.length === 0, bad.slice(0, 6).join('; '));
}

// --- save / load ---
{
  // a tiny in-memory localStorage for the headless run
  const mem: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; },
  };
  arena(35); gotoPlace({ town: 'mossgate' });
  player.exp = 123; player.ap = 7; player.sp = 2; player.stats.dex = 9; player.ranks.Z = 1; player.ranks.W = 1; player.ranks.E = 1;
  save();
  const want = JSON.stringify(snapshot());
  arena(1); player.ap = 0; player.sp = 0; player.ranks.W = 0; player.ranks.E = 0;
  const place = load();
  check('save round-trips level, EXP, points, stats, ranks and the town', JSON.stringify({ ...snapshot(), town: 'mossgate' }) === want && samePlace(place, { town: 'mossgate' }));
  check('you resume in the latest town: a town itself, or the start of the path you were on',
    lastTown({ town: 'mossgate' }) === 'mossgate' && lastTown({ path: 'meadows', floor: 5 }) === 'driftwood' && lastTown({ path: 'shore', floor: 2 }) === 'saltwick');
  gotoPlace({ path: 'meadows', floor: 3 }); save(); arena(1); gotoPlace(START);
  check('a save on a path\'s floors resumes in the town it started from', samePlace(load(), { town: 'driftwood' }));
  mem['archer-game:save'] = JSON.stringify({ ...snapshot(), town: 'atlantis' });
  check('a save in a town gone from the map resumes at the start', samePlace(load(), START));
  check('loading recomputes derived stats', player.hp === player.hpMax && player.war > 14 + 33);
  check('a corrupt save is ignored', apply('junk') === null);
  check('an older save is migrated and keeps its progress', apply({ v: 2, level: 50, exp: 10, ap: 3, sp: 2, stats: { dex: 9 }, ranks: { Z: 1 }, town: 'mossgate' }) !== null
    && player.level === 50 && player.ap === 3 && player.ranks.Z === 1);
  apply({ v: 4, level: 1e9, exp: -5, ap: 'x', sp: 3, stats: { dex: -2 }, ranks: { Z: 99, RA: 1, EB: 1 }, town: 0 });
  check('out-of-range values are clamped', player.level === 100 && player.exp === 0 && player.ap === 0 && player.stats.dex === 0 && player.ranks.Z === 1 && player.ranks.RA + player.ranks.EB === 1);
  clearSave();
  check('reset forgets the save', !hasSave() && samePlace(load(), START));
  delete (globalThis as { localStorage?: unknown }).localStorage;
}

// --- HUD: compact numbers ---
check('HUD numbers: plain below 1000, then 1.2K / 1.2M', [999, 1000, 1299, 12345, 1234567].map(fmtNum).join(' ') === '999 1K 1.2K 12.3K 1.2M');

// --- every effect a skill spawns fits its animation (a longer lifetime once crashed the renderer) ---
{
  const bad: string[] = [];
  for (const key of ['Z', 'Q', 'W', 'E', 'R', 'D'] as const) {
    arena(60, 200);
    for (const k of Object.keys(player.ranks) as (keyof typeof player.ranks)[]) player.ranks[k] = ['S', 'BS', 'VS', 'RA', 'AB'].includes(k) ? 0 : 1;
    dummy(240); dummy(280);
    game.fx = [];
    cast(key); step(1);
    for (let i = 0; i < 20; i++) {
      game.fx.filter((f) => f.t > FX_DUR[f.type] + 1e-9).forEach((f) => bad.push(`${key}:${f.type} ${f.t.toFixed(2)}>${FX_DUR[f.type]}`));
      step(1);
    }
  }
  check('no skill effect outlives its animation', bad.length === 0, [...new Set(bad)].join(', '));
}

// --- EXP comes from the mob's level (the floor), not the player's ---
{
  const expAt = (floor: number, level: number): number => {
    arena(level); gotoPlace(climb(floor)); game.mobs = [];
    spawnMob({ x: 100, y: ground().y, types: ['Garden Snail'] } as never, MOB_TYPES[0]);
    return game.mobs[0].exp;
  };
  check('mob EXP ignores the player level', expAt(3, 1) === expAt(3, 40));
  check('mobs on higher floors are worth more EXP', expAt(8, 5) > expAt(2, 5));
  check('enemy levels climb a path\'s range, spread over its floors', mobLevel({ path: 'shore', floor: 1 }) === 1 && mobLevel({ path: 'shore', floor: 3 }) === 3
    && mobLevel({ path: 'woods', floor: 1 }) === 4 && mobLevel({ path: 'woods', floor: 5 }) === 8 && mobLevel({ path: 'reef', floor: 8 }) === 34);
  check('every path\'s range fits its floors, starting where the way into its town left off',
    PATHS.every((p) => p.lvl[0] <= p.lvl[1] && p.floors >= 1 && pathsInto(p.from).every((q) => q.lvl[1] < p.lvl[0])));
  {
    // EXP: ~10 same-level kills per level at Lv.1, ~100 at Lv.99 (vs level-100 enemies), smooth between
    const kills = (lv: number, mob: number) => Math.ceil(expToNext(lv) / mobExp(mob));
    check('Lv.1 takes about 10 kills of level-1 enemies', kills(1, 1) === 10, `${kills(1, 1)}`);
    check('Lv.99 takes about 100 kills of level-100 enemies', Math.abs(kills(99, 100) - 100) <= 8, `${kills(99, 100)}`);
    let smooth = true;
    for (let l = 1; l < 99; l++) if (kills(l + 1, l + 1) < kills(l, l) || kills(l + 1, l + 1) > kills(l, l) + 3) smooth = false;
    check('kills per level climb steadily from 10 to 100', smooth && Math.abs(killsToLevel(50) - Math.sqrt(10 * 100)) < 1);
    check('higher-level enemies are worth more, and a mob carries its level', mobExp(20) > mobExp(10) && Math.abs(mobExp(5, 10) - mobExp(5) * 10) <= 10);
    gotoPlace(climb(3)); spawnMob(game.floor.spawns[0], MOB_TYPES[0]); // Beach 2
    const m = game.mobs[game.mobs.length - 1];
    check('a spawned mob has its floor\'s level and that level\'s EXP', m.level === 2 && m.exp === mobExp(2));
    const hpHere = m.hpMax; player.level = 40; spawnMob(game.floor.spawns[0], MOB_TYPES[0]);
    check('enemy HP scales with the floor, not the player', game.mobs[game.mobs.length - 1].hpMax === hpHere);
  }
  arena(5); const m = dummy(140, 1); const before = game.dmgNums.length;
  killMob(m);
  check('a kill shows no floating EXP number', game.dmgNums.length === before);
}

// --- every gap between platforms is the same 2-3 tiles of headroom, ground to first included ---
{
  const bad: string[] = [];
  for (const n of [1, 2, 3, 4]) {
    gotoPlace(climb(n));
    const blocks = new Map<number, { top: number; bot: number }>();
    for (const p of game.floor.platforms) if (p.block) {
      const b = blocks.get(p.block) ?? { top: Infinity, bot: -Infinity };
      b.top = Math.min(b.top, p.y); b.bot = Math.max(b.bot, p.y + p.h); blocks.set(p.block, b);
    }
    const bs = [...blocks.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => b);
    bs.forEach((b, i) => {
      const clear = ((i ? bs[i - 1].top : ground().y) - b.bot) / 16;
      if (clear < 2 || clear > 3) bad.push(`floor ${n} gap ${i}: ${clear}`);
    });
  }
  check('platform gaps are all 2-3 tiles, the first one too', bad.length === 0, bad.join(', '));
}

// --- presence: names, tints, spawn spread, ghost skill effects ---
{
  const ns = Array.from({ length: 50 }, () => randomName());
  check('random names fit the tag and the pixel font', ns.every((n) => n.length >= 5 && n.length <= NAME_MAX && /^[A-Z0-9]+$/.test(n)));
  check('names from peers are cleaned', cleanName('  hi there!!<b> ') === 'HITHEREB' && cleanName(null) === '' && cleanName('x'.repeat(40)).length === NAME_MAX);
  check('a peer keeps the same tint', tintFor('abc123') === tintFor('abc123'));
  check('peers get different tints', new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(tintFor)).size >= 4);

  const xs = Array.from({ length: 12 }, () => { gotoPlace(climb(2)); return player.x; });
  const mid = ground().x + ground().w / 2 - player.w / 2;
  check('arrivals are spread around the middle', new Set(xs).size > 6 && xs.every((x) => Math.abs(x - mid) <= SPAWN_SPREAD));

  const tr = newTrack();
  const at = (pose: 'shoot' | 'rush' | 'idle', since: number) => ghostFx(tr, { x: 100, y: 50, face: 1, pose, since });
  check('a ghost shoot pose alone spawns nothing (shots come as messages)', at('shoot', 0.3).length === 0);
  at('idle', 0);
  check('a ghost Rush Toss shows its horn of light', at('rush', 0).map((f) => f.type).join(',') === 'rush');

  // shots: each arrives as a message and shows when the ghost's playback reaches it
  clearShots();
  const st = newTrack(); st.offset = 1000; // their clock runs 1000ms behind ours
  queueShot(st, { t: 5000, x: 80, y: 40, f: 1, l: 64 }, 6000);
  queueShot(st, { t: 5100, x: 80, y: 40, f: 1, l: 64 }, 6100); // back to back
  const due0 = 5000 + 1000 + INTERP_MS;
  check('a ghost shot waits for the playback to reach it', dueShots(due0 - 1).length === 0);
  check('a ghost shot shows muzzle and tracer on time', dueShots(due0).map((f) => f.type).sort().join(',') === 'muzzle,tracer');
  check('back-to-back ghost shots each show', dueShots(due0 + 100).length === 2);
  queueShot(st, { t: 7000, x: 80, y: 40, f: 1, l: 64, n: 4 }, 8000);
  const d7 = 7000 + 1000 + INTERP_MS, tracers = (t: number) => dueShots(t).filter((f) => f.type === 'tracer').length;
  check('a multi-arrow ghost shot shows one tracer per arrow, one after another',
    tracers(d7) === 1 && tracers(d7 + SHOT_GAP) === 1 && tracers(d7 + 3 * SHOT_GAP) === 2);
  queueShot(st, { t: NaN, x: 0, y: 0, f: 1, l: 1 } as never, 0);
  for (let i = 0; i < 100; i++) queueShot(undefined, { t: 0, x: 0, y: 0, f: 1, l: 1 }, 0);
  check('bad or flooding shot messages are capped', dueShots(1e9).length <= 80);
}

// --- canvas main menu: navigation, channels, codes, names, reset ---
{
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)); },
    removeItem: (k: string) => { mem.delete(k); },
  };
  let started = 0;
  const open = (): void => { initMenu(() => { started++; }, { path: 'shore', floor: 2 }); };
  clearSave(); open();
  check('menu rows: play, channel, code, new code, name, look, settings, awards (no reset without a save)', items().join(',') === 'play,channel,code,create,name,look,settings,awards');
  menuKey('up');
  check('menu selection wraps around', items()[menu.sel] === 'awards');

  // channel picker
  check('auto picks the busiest channel with room', autoChannel(new Map([[1, 20], [2, 5], [3, 7]])) === 3);
  check('auto falls back to channel 1 when nobody is around', autoChannel(new Map()) === 1);
  check('channel list offers auto, 1-3 and one past the busiest', channelChoices(new Map([[5, 2]])).join(',') === '0,1,2,3,4,5,6');
  open(); menuKey('down'); menuKey('right'); menuKey('right');
  check('left/right on the channel row picks a channel', menu.channel === 2);
  menuKey('enter');
  check('playing from the channel row joins that public channel', started === 1 && !menu.open && net.channel === 2 && net.code === '');

  // private code: type, then join
  open(); menu.sel = items().indexOf('code');
  menuKey('enter');
  check('Enter on the code row starts typing', menu.edit === 'code');
  menuText('ab1c');
  menuKey('enter');
  check('a short code is refused with a note', menu.open && menu.note.length > 0 && menu.edit === 'code');
  menuText('abcdez');
  check('the code field keeps 5 letters, upper-cased', menu.code === 'ABCDE');
  menuKey('enter');
  check('a full code joins that private instance', !menu.open && net.code === 'ABCDE' && started === 2);

  // new code fills the field and jumps to it
  open(); menu.sel = items().indexOf('create'); activate();
  check('new code fills the code row', menu.code.length === 5 && items()[menu.sel] === 'code');

  // name
  open(); menu.sel = items().indexOf('name'); activate(); menuText('robin hood!'); menuKey('enter');
  check('renaming saves a cleaned name', menu.name === 'ROBINHOOD' && localStorage.getItem('archer-game:name') === 'ROBINHOOD');

  // taps: first selects, second uses; the channel row's thirds step the channel
  open();
  const rowY = (id: string): number => MENU_TOP + items().indexOf(id as never) * MENU_ROW + 3;
  menuTap(MENU_X + MENU_W / 2, rowY('channel'));
  check('a tap selects a row without using it', items()[menu.sel] === 'channel' && menu.open);
  menuTap(MENU_X + MENU_W - 4, rowY('channel'));
  check('tapping the right of the channel row steps it', menu.channel === 1);
  menuTap(MENU_X + 4, rowY('name'));
  check('a tap on a text row starts typing', menu.edit === 'name');

  // reset asks twice
  save(); open();
  check('reset shows once there is a save', items().includes('reset'));
  menu.sel = items().indexOf('reset'); activate();
  check('reset asks to confirm first', menu.confirmReset && hasSave());
  menuKey('up');
  check('moving away cancels the reset', !menu.confirmReset);
  menu.open = false; net.code = ''; net.channel = 1;
  delete (globalThis as { localStorage?: unknown }).localStorage;
}

// --- spawns come in groups of 4-8; enemies never leave their own platform ---
{
  check('group size: 4 on short tops, up to 8 on long ones', groupSize(4) === 4 && groupSize(6) === 4 && groupSize(10) === 6 && groupSize(14) === 8 && groupSize(30) === 8);
  let zones = 0, groups = 0;
  for (const n of [1, 2, 3, 4]) {
    gotoPlace(climb(n));
    const plats = game.floor.spawns.filter((z) => z.block !== undefined);
    zones += plats.length; groups += plats.filter((z) => (z.cap ?? 1) >= 4 && (z.cap ?? 1) <= 8).length;
  }
  check('platform spawn zones hold groups of 4-8', zones > 0 && groups === zones, `${groups}/${zones}`);

  // launch every enemy hard sideways and up; none may end up anywhere but its own platform
  release(); gotoPlace(climb(2)); player.invuln = 999; player.x = 4;
  for (const m of game.mobs) { m.vx = (m.x < 160 ? -1 : 1) * 900; m.vy = -600; m.airTime = 1.1; }
  step(90);
  const strays = game.mobs.filter((m) => {
    const z = m.spawn!;
    const plat = game.floor.platforms.find((p) => !p.inner && m.x >= p.x && m.x < p.x + p.w && Math.abs(surfaceYAt(p, m.x) - (m.y + m.h)) < 6);
    const offEdge = m.x < (z.minX ?? 0) - 16 || m.x > (z.maxX ?? 320) + 16;
    return offEdge || !m.fly && (!plat || plat.block !== z.block);
  });
  check('knocked enemies stay on their own platform', strays.length === 0, `${strays.length}/${game.mobs.length} strayed`);
}
