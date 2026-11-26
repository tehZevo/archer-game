import { seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, PAUSE_ROWS, pauseScroll, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, RECOLOR, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';
// --- menu polish: key repeat, local-only rows, a steady caret ---
{
  // Esc menu: holding Down keeps moving
  release(); arena(30); game.pause = { col: 1, row: 0 };
  setKey('down', true);
  const frames = Math.ceil((REPEAT_DELAY + 4 * REPEAT_RATE) / P.STEP) + 1;
  for (let i = 0; i < frames; i++) tick();
  const moved = game.pause.row;
  setKey('down', false); step(5);
  check('holding Down in the Esc menu repeats the move', moved >= 3, `moved ${moved}`);
  check('releasing stops the repeat', game.pause.row === moved);
  game.pause = null;

  // local only: the code rows are skipped and can't be used
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)); }, removeItem: (k: string) => { mem.delete(k); },
  };
  net.offline = 'NEEDS HTTPS';
  initMenu(() => {}, START);
  const seen = new Set<string>();
  for (let i = 0; i < 10; i++) { menuKey('down'); seen.add(items()[menu.sel]); }
  const ci = items().indexOf('code');
  menuTap(MENU_X + 5, MENU_TOP + ci * MENU_ROW + 2);
  check('local only: the private code rows are skipped', !seen.has('code') && !seen.has('create') && seen.has('name') && disabled('code'));
  check('local only: tapping the code row does nothing', items()[menu.sel] !== 'code' && menu.edit === null);
  net.offline = '';
  check('online: the code rows are back', !disabled('code') && !disabled('create'));
  delete (globalThis as { localStorage?: unknown }).localStorage;

  check('the caret blinks between same-width glyphs, so text never shifts', textWidth('AB_') === textWidth('AB '));
}

{
  // tilesets: every area has one; the pieces paint valid colours for every pixel and variant
  check('every area on the map has a tileset (Classic until it gets its own)', ['Sunlit Shore', 'Whispering Woods', 'Echoing Caves', 'Murky Swamp', 'Craggy Mountains', 'Endless Sky', 'Clockwork Spire'].every((a) => !!tilesetFor(a)));
  check('Clockwork Spire is on the map', MAP_AREAS.includes('Clockwork Spire'));
  const fallback = ['Old Keep', 'Ember Wastes', 'Sky Reef', 'Chapel Spire', 'Frozen Summit']; // no sets of their own yet
  const own = MAP_AREAS.filter((a) => !fallback.includes(a));
  check('every area in play and on the planned route has its own tileset', own.every((a) => tilesetFor(a).name === a),
    own.filter((a) => tilesetFor(a).name !== a).join(', '));
  check('unknown areas fall back to Classic', tilesetFor('Nowhere').name === 'Classic');
  // props and backdrops: every area with a tileset has its own; props paint inside their canvas
  const inside = (paint: (p: (x: number, y: number, c: string, w?: number, h?: number) => void) => void, W: number, H: number): boolean => {
    let ok = true, any = false;
    paint((x, y, c, w = 1, h = 1) => { any = true; if (!/^#[0-9a-f]{3,8}$/i.test(c) || x < -0.5 || y < -0.5 || x + w > W + 0.5 || y + h > H + 0.5) ok = false; });
    return ok && any;
  };
  const withSets = Object.keys(TILESETS).filter((a) => a !== 'Classic');
  check('every area with a tileset has its own props and backdrop', withSets.every((a) => PROPS[a] && BACKDROPS[a]),
    withSets.filter((a) => !PROPS[a] || !BACKDROPS[a]).join(', '));
  check('every prop paints only inside its canvas', Object.values(PROPS).every((ps) => ps.every((p) => inside(p, PROP_W, PROP_H))));
  let placed = 0;
  for (let i = 0; i < 400; i++) { const k = propAt('Whispering Woods', i, 7); if (k !== null) { placed++; if (k < 0 || k >= PROPS['Whispering Woods'].length) placed = -999; } }
  check('props stand on a few tops, not most', placed > 20 && placed < 90, `${placed}/400`);
  check('backdrop particles stay in view', Object.values(BACKDROPS).every((b) => !b.particles || particlesAt(b.particles, 3.7, 240, 180).every((q) => q.x >= -20 && q.x <= 240 && q.y >= -20 && q.y <= 180)));
  const hex = /^#[0-9a-f]{6}$/;
  let bad = '';
  for (const ts of Object.values(TILESETS)) {
    for (let v = 0; v < 4; v++) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (!hex.test(ts.fill(x, y, v))) bad ||= `${ts.name} fill ${x},${y},${v}`;
      const c = ts.surface(x, y, v);
      if (c !== null && !hex.test(c)) bad ||= `${ts.name} surface ${x},${y},${v}`;
    }
    if (!ts.surface(0, 0, 0)) bad ||= `${ts.name} has no surface`;
    // decorations and climbables stay inside their sprites
    const inside = (name: string, w: number, h: number) => (x: number, y: number, c: string, pw = 1, ph = 1) => {
      if (x < 0 || y < 0 || x + pw > w || y + ph > h || !hex.test(c)) bad ||= `${ts.name} ${name} paints ${x},${y} ${pw}x${ph} ${c}`;
    };
    for (let v = 0; v < 4; v++) for (const w of [false, true]) for (const e of [false, true]) ts.top?.(inside('top', TOP_W, TOP_H), v, w, e);
    for (let v = 0; v < 4; v++) ts.bottom?.(inside('bottom', 16, BOT_H), v);
    ts.rope(inside('rope', 16, 16)); ts.ladder(inside('ladder', 16, 16));
  }
  check('tileset pieces paint valid colours inside their sprites', bad === '', bad);
  const vs = new Set<number>();
  for (let i = 0; i < 64; i++) vs.add(variantAt(i, 3));
  check('tile variants are 0-3, all used, and fixed per position', [...vs].every((v) => v >= 0 && v < 4) && vs.size === 4 && variantAt(5, 7) === variantAt(5, 7));
  const bv = new Set(Array.from({ length: 128 }, (_, i) => variantAt(i, 3, 0, BLOCK_VARIANTS)));
  check('block fills pick from all 8 variants', bv.size === BLOCK_VARIANTS && [...bv].every((v) => v < BLOCK_VARIANTS));
  check('decorations pick variants apart from the fill', [...Array(32).keys()].some((i) => variantAt(i, 0) !== variantAt(i, 0, 1)) && hash(1, 2) !== hash(2, 1));
}

{
  // dev mode (?dev): its own rooms, the warp menu, and the [ ] keys
  check('dev mode is off without ?dev', dev.on === false);
  const before = roomId('driftwood', 1);
  setKey('[', true); step(1); setKey('[', false);
  const lv = player.level, fl = game.floor.place;
  setKey(']', true); step(1); setKey(']', false); step(1);
  check('[ and ] do nothing without ?dev', player.level === lv && samePlace(game.floor.place, fl));
  dev.on = true;
  check('dev rooms get their own ids', roomId('driftwood', 1) === before + '-dev' && roomId('driftwood', 0, 'ABCDE').endsWith('-dev'));
  setKey(']', true); step(1); setKey(']', false); step(1);
  check('] warps up to the next place in dev mode', samePlace(game.floor.place, nextPlace(fl)));
  setKey('`', true); step(1); setKey('`', false); step(1);
  check('` opens the dev menu', dev.open);
  const stops = devStops();
  check('the dev menu lists Beach 1 and every town', placeKey(stops[0].place) === 'shore-1' && stops.length === TOWNS.length + 1
    && stops.slice(1).every((s, i) => placeKey(s.place) === TOWNS[i].id && s.name.trim() === TOWNS[i].name));
  check('the dev menu labels towns by their area', stops[2].label === 'Sunlit Shore');
  dev.sel = 2; setKey('enter', true); devInput(P.STEP); clearPressed(); setKey('enter', false);
  check('picking a town warps there and closes the menu', samePlace(game.floor.place, stops[2].place) && game.floor.town && !dev.open);
  dev.on = false;
  // text chat
  check('chat keeps only what the font draws, upper-cased and capped',
    cleanChat('  hi, there!  \u{1F600} ok?') === "HI, THERE! OK?" && cleanChat('x'.repeat(200)).length === CHAT_MAX && cleanChat('   ') === '');
  check('chat wraps on words and splits long ones', JSON.stringify(wrap('HELLO THERE FRIEND', 11)) === '["HELLO THERE","FRIEND"]' && wrap('A'.repeat(25), 10).length === 3);
  chat.log.length = 0; clearBubbles();
  say('hello world');
  check('saying something logs it and shows our bubble', chat.log.length === 1 && chat.log[0].id === SELF && chat.log[0].text === 'HELLO WORLD' && !!bubbleFor(SELF, performance.now()));
  say('   ');
  check('blank lines are not sent', chat.log.length === 1);
  const t0 = 1e6;
  addChat('peer1', 'BOB', 'HI', '#ff0000', t0);
  check('a bubble lasts a few seconds, then goes', !!bubbleFor('peer1', t0 + 1000) && bubbleFor('peer1', t0 + bubbleMs('HI') + 1) === null);
  check('old lines leave the log unless you are typing', !logLines(t0 + LOG_SHOW_MS + 1).some((l) => l.id === 'peer1'));
  chat.typing = true;
  check('typing shows the whole recent log', logLines(t0 + LOG_SHOW_MS + 1).some((l) => l.id === 'peer1'));
  chat.typing = false; chat.log.length = 0; clearBubbles();
  // AZERTY: keys go by physical position, labels by layout
  const ev = (key: string, code?: string) => ({ key, code }) as unknown as Parameters<typeof normalize>[0];
  check('the key in the Z spot is Z on any layout (AZERTY types W there)', normalize(ev('w', 'KeyZ')) === 'z' && normalize(ev('a', 'KeyQ')) === 'q');
  check('digits, space, arrows and Enter go by physical key', normalize(ev('&', 'Digit1')) === '1' && normalize(ev(' ', 'Space')) === ' ' && normalize(ev('ArrowUp', 'ArrowUp')) === 'up' && normalize(ev('Enter', 'NumpadEnter')) === 'enter');
  check('without a code, the typed key is used', normalize(ev('ArrowLeft')) === 'left' && normalize(ev('X')) === 'x');
  check('labels are QWERTY until the layout is known', keyName('z') === 'Z' && keyName('Q') === 'Q');
  setLayout({ KeyZ: 'w', KeyQ: 'a', KeyW: 'z', KeyA: 'q' });
  check('on AZERTY the labels show what the keys type', keyName('z') === 'W' && keyName('Q') === 'A' && keyName('w') === 'Z' && keyName('escape') === 'ESCAPE');
  setLayout({});
  // rooms by hour: floors carry the UTC hour you entered them; towns never do; layouts ignore it
  check('the hour stamp is the UTC hour, YYYYMMDDHH', hourStamp(Date.UTC(2026, 10, 24, 14, 59, 59)) === '2026112414' && hourStamp(Date.UTC(2026, 10, 24, 15, 0, 0)) === '2026112415');
  check('floor rooms are tagged with the hour', roomId('shore-2', 2, '', '2026112414') === 'eurekaland-shore-2-c2-h2026112414' && roomId('shore-2', 1, 'ABCDE', '2026112414').endsWith('-pABCDE-h2026112414'));
  check('towns have no hour tag', roomId('driftwood', 1, '', '2026112414') === 'eurekaland-driftwood-c1');
  check('no hour yet: no tag', roomId('shore-2', 1, '', '') === 'eurekaland-shore-2-c1');
  const was = net.hour;
  net.hour = '2026112414'; gotoPlace(climb(4)); const a = JSON.stringify(game.floor.platforms.map((p) => [p.x, p.y]));
  net.hour = '2026112415'; gotoPlace(climb(4)); const b = JSON.stringify(game.floor.platforms.map((p) => [p.x, p.y]));
  check('a floor\'s layout is the same whatever the hour', a === b);
  net.hour = was;
}

{
  // enemies: two types per floor from the area's set; each platform fields one or both
  const beach = areaMobs('Sunlit Shore').map((m) => m.n);
  check('the Beach has its own enemies (snail, enemy crab, hermit crab, gull)', ['Garden Snail', 'Enemy Crab', 'Hermit Crab', 'Gull'].every((n) => beach.includes(n)));
  check('areas without a set use the general pool', areaMobs('Old Keep').every((m) => !m.areas || m.areas.includes('*')) && areaMobs('Old Keep').length >= 2);
  const withOwn = Object.keys(TILESETS).filter((a) => !['Classic', 'Harbor'].includes(a)); // the Harbor is only a town
  check('every area with its own tileset has its own enemies (two or more)', withOwn.every((a) => MOB_TYPES.filter((m) => m.areas?.includes(a)).length >= 2),
    withOwn.filter((a) => MOB_TYPES.filter((m) => m.areas?.includes(a)).length < 2).join(', '));
  let artOk = true;
  for (const [name, { look }] of Object.entries(MOB_ART)) for (const f of [0, 1, 2, 3, HURT]) {
    paintMob(name, f, (x, y, c, w = 1, h = 1) => { if (x < 0 || y < 0 || x + w > look.w || y + h > look.h || !/^#[0-9a-f]{6}$/i.test(c)) artOk = false; });
  }
  check('enemy art paints inside its box (the hitbox)', artOk);
  // the hurt pose (hitstun) is its own drawing: not just frame 0 again
  const rects = (name: string, f: number): string => { const r: string[] = []; paintMob(name, f, (x, y, c, w = 1, h = 1) => r.push(`${x},${y},${c},${w},${h}`)); return r.join(';'); };
  const sameHurt = Object.keys(MOB_ART).filter((n) => [0, 1, 2, 3].some((f) => rects(n, HURT) === rects(n, f)));
  check('every painted enemy has its own hurt pose', sameHurt.length === 0, sameHurt.join(', '));
  check('every enemy with painted art uses its box as its size', MOB_TYPES.filter((m) => MOB_ART[m.n]).every((m) => m.w === MOB_ART[m.n].look.w && m.h === MOB_ART[m.n].look.h));
  let pairsOk = true, singles = 0, doubles = 0;
  for (const n of [2, 3, 4]) { // the Beach
    gotoPlace(climb(n));
    const ground = game.floor.spawns[game.floor.spawns.length - 1].types;
    const [a, b] = ground;
    if (ground.length !== 2 || a === b || !beach.includes(a) || !beach.includes(b)) pairsOk = false;
    for (const z of game.floor.spawns.slice(0, -1)) {
      if (!z.types.every((t) => t === a || t === b)) pairsOk = false;
      if (z.types.length === 1) singles++; else doubles++;
    }
  }
  check('each Beach floor fields two different beach enemies', pairsOk);
  check('some platforms field one type, some both', singles > 0 && doubles > 0, `${singles} single, ${doubles} both`);
  const seq = () => { let i = 0; return () => [0.1, 0.9, 0.5][i++ % 3]; };
  check('a floor\'s pair is fixed by its seed', JSON.stringify(floorMobs({ path: 'shore', floor: 2 }, seq())) === JSON.stringify(floorMobs({ path: 'shore', floor: 2 }, seq())));
}

{
  // enemy HP bar: hidden until hit, then up for BAR_SHOW s after each hit
  arena(); const m = dummy(150);
  const before = m.barT <= 0;
  damage(m, 1); const after = m.barT > 0;
  for (let i = 0; i < 30; i++) update(1 / 60);
  const still = m.barT > 0;
  m.barT = 0.01; update(1 / 60);
  check('enemy HP bar: hidden before the first hit', before);
  check('enemy HP bar: shown after a hit, for 4 s', after && still && BAR_SHOW === 4);
  check('enemy HP bar: hidden again once the time runs out', m.barT <= 0);
}

{
  // enemy animations: walkers step only while moving; fliers always flap; stun freezes
  const walk = { anim: 0, fly: false, vx: 60, stun: 0 }, frames = new Set<number>();
  for (let i = 0; i < 24; i++) { walk.anim = i * ANIM_RATE / 24; frames.add(mobFrame(walk, 4, 8)); }
  check('a walking enemy cycles through all its frames', frames.size === 4, [...frames].join(','));
  check('a standing enemy holds frame 0', mobFrame({ ...walk, vx: 0, anim: 3.3 }, 4, 8) === 0);
  check('...and breathes out a beat later', mobFrame({ ...walk, vx: 0, anim: ANIM_RATE * 0.9 }, 4, 8) === BREATH);
  check('a stunned enemy holds frame 0', mobFrame({ ...walk, stun: 1, anim: 3.3 }, 4, 8) === 0);
  check('a hovering flier keeps flapping', mobFrame({ anim: ANIM_RATE * 0.25, fly: true, vx: 0, stun: 0 }, 2, 4) === 1);
}
