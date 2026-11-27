import { seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, PAUSE_ROWS, pauseScroll, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, VARIANT_ART, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';
// --- menu polish: key repeat, local-only rows, a steady caret ---
{
  // Esc menu: holding Down keeps moving
  release(); arena(30); game.pause = { col: 1, row: 0 };
  setKey('down', true);
  const frames = Math.ceil((REPEAT_DELAY + 4 * REPEAT_RATE) / P.STEP) + 1;
  for (let i = 0; i < frames; i++) tick();
  const moved = game.pause.row;
  setKey('down', false); step(5);
  check('holding Down in the Esc menu repeats the move, releasing stops it', moved >= 3 && game.pause.row === moved, `moved ${moved}`);
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
  check('local only: the private code rows are skipped and tapping one does nothing',
    !seen.has('code') && !seen.has('create') && seen.has('name') && disabled('code') && items()[menu.sel] !== 'code' && menu.edit === null);
  net.offline = '';
  check('online: the code rows are back', !disabled('code') && !disabled('create'));
  delete (globalThis as { localStorage?: unknown }).localStorage;

  check('the caret blinks between same-width glyphs, so text never shifts', textWidth('AB_') === textWidth('AB '));
}

{
  // tilesets: every area has one; the pieces paint valid colours for every pixel and variant
  check('every area on the map (incl. Clockwork Spire) has a tileset (Classic until it gets its own)',
    MAP_AREAS.includes('Clockwork Spire') && ['Sunlit Shore', 'Whispering Woods', 'Echoing Caves', 'Murky Swamp', 'Craggy Mountains', 'Endless Sky', 'Clockwork Spire'].every((a) => !!tilesetFor(a)));
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
  check('block fills pick from all 8 variants and decorations pick apart from the fill',
    bv.size === BLOCK_VARIANTS && [...bv].every((v) => v < BLOCK_VARIANTS) && [...Array(32).keys()].some((i) => variantAt(i, 0) !== variantAt(i, 0, 1)) && hash(1, 2) !== hash(2, 1));
}

{
  // dev mode (?dev): its own rooms, the warp menu, and the [ ] keys
  const before = roomId('driftwood', 1);
  setKey('[', true); step(1); setKey('[', false);
  const lv = player.level, fl = game.floor.place;
  setKey(']', true); step(1); setKey(']', false); step(1);
  check('dev mode is off without ?dev, where [ and ] do nothing', dev.on === false && player.level === lv && samePlace(game.floor.place, fl));
  dev.on = true;
  check('dev rooms get their own ids', roomId('driftwood', 1) === before + '-dev' && roomId('driftwood', 0, 'ABCDE').endsWith('-dev'));
  setKey(']', true); step(1); setKey(']', false); step(1);
  check('] warps up to the next place in dev mode', samePlace(game.floor.place, nextPlace(fl)));
  setKey('`', true); step(1); setKey('`', false); step(1);
  check('` opens the dev menu', dev.open);
  const stops = devStops();
  check('the dev menu is a flat list of each area (1st floor, with its level) and every town (marked (town))',
    placeKey(stops[0].place) === 'shore-1' && stops.length === PATHS.length + TOWNS.length
    && stops.slice(PATHS.length).every((s, i) => placeKey(s.place) === TOWNS[i].id && s.name === `${TOWNS[i].name} (town)`)
    && stops[0].name === 'Sunlit Shore Lv.1' && stops[PATHS.length].name === 'Saltwick Port (town)');
  dev.sel = PATHS.length; setKey('enter', true); devInput(P.STEP); clearPressed(); setKey('enter', false);
  check('picking a town warps there and closes the menu', samePlace(game.floor.place, stops[PATHS.length].place) && game.floor.town && !dev.open);
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
  check('old lines leave the log, and typing shows the whole recent log', !logLines(t0 + LOG_SHOW_MS + 1).some((l) => l.id === 'peer1'))
    && (chat.typing = true) && logLines(t0 + LOG_SHOW_MS + 1).some((l) => l.id === 'peer1');
  chat.typing = false; chat.log.length = 0; clearBubbles();
  // AZERTY: keys go by physical position, labels by layout
  const ev = (key: string, code?: string) => ({ key, code }) as unknown as Parameters<typeof normalize>[0];
  check('keys go by physical position: Z on any layout (AZERTY types W there), digits, space, arrows and Enter',
    normalize(ev('w', 'KeyZ')) === 'z' && normalize(ev('a', 'KeyQ')) === 'q' && normalize(ev('&', 'Digit1')) === '1'
    && normalize(ev(' ', 'Space')) === ' ' && normalize(ev('ArrowUp', 'ArrowUp')) === 'up' && normalize(ev('Enter', 'NumpadEnter')) === 'enter');
  check('without a code, the typed key is used', normalize(ev('ArrowLeft')) === 'left' && normalize(ev('X')) === 'x');
  check('labels are QWERTY until the layout is known', keyName('z') === 'z' && keyName('ground-q') === 'ground-q');
  setLayout({ KeyZ: 'w', KeyQ: 'a', KeyW: 'z', KeyA: 'q' });
  check('on AZERTY the labels show what the keys type', keyName('z') === 'ground-w' && keyName('ground-q') === 'A' && keyName('w') === 'z' && keyName('escape') === 'ESCAPE');
  setLayout({});
  // rooms by hour: floors carry the UTC hour you entered them; towns never do; layouts ignore it
  check('the hour stamp is the UTC hour, YYYYMMDDHH', hourStamp(Date.UTC(2026, 10, 24, 14, 59, 59)) === '2026112414' && hourStamp(Date.UTC(2026, 10, 24, 15, 0, 0)) === '2026112415');
  check('floor rooms are tagged with the hour; towns and an empty hour are not',
    roomId('shore-2', 2, '', '2026112414') === 'eurekaland-shore-2-c2-h2026112414' && roomId('shore-2', 1, 'ABCDE', '2026112414').endsWith('-pABCDE-h2026112414')
    && roomId('driftwood', 1, '', '2026112414') === 'eurekaland-driftwood-c1' && roomId('shore-2', 1, '', '') === 'eurekaland-shore-2-c1');
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
  check('areas without a set use the general pool', areaMobs('Nowhere').every((m) => !m.areas || m.areas.includes('*')) && areaMobs('Nowhere').length >= 2);
  const withOwn = Object.keys(TILESETS).filter((a) => !['Classic', 'Harbor'].includes(a)); // the Harbor is only a town
  check('every area with its own tileset has its own enemies (two or more)', withOwn.every((a) => MOB_TYPES.filter((m) => m.areas?.includes(a)).length >= 2),
    withOwn.filter((a) => MOB_TYPES.filter((m) => m.areas?.includes(a)).length < 2).join(', '));
  let artOk = true;
  for (const [name, { look }] of Object.entries(MOB_ART)) for (const f of [0, 1, 2, 3, HURT]) {
    paintMob(name, f, (x, y, c, w = 1, h = 1) => { if (x < 0 || y < 0 || x + w > look.w || y + h > look.h || !/^#[0-9a-f]{6}$/i.test(c)) artOk = false; });
  }
  check('enemy art paints inside its box (the hitbox) and uses it as its size',
    artOk && MOB_TYPES.filter((m) => MOB_ART[m.n]).every((m) => m.w === MOB_ART[m.n].look.w && m.h === MOB_ART[m.n].look.h));
  // the hurt pose (hitstun) is its own drawing: not just frame 0 again
  const rects = (name: string, f: number): string => { const r: string[] = []; paintMob(name, f, (x, y, c, w = 1, h = 1) => r.push(`${x},${y},${c},${w},${h}`)); return r.join(';'); };
  const sameHurt = Object.keys(MOB_ART).filter((n) => [0, 1, 2, 3].some((f) => rects(n, HURT) === rects(n, f)));
  check('every painted enemy has its own hurt pose', sameHurt.length === 0, sameHurt.join(', '));
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
  check('each Beach floor fields two different beach enemies, some platforms one type, some both',
    pairsOk && singles > 0 && doubles > 0, `${singles} single, ${doubles} both`);
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
  check('enemy HP bar: hidden before the first hit, shown after a hit for 4 s, then hidden again',
    before && after && still && BAR_SHOW === 4 && m.barT <= 0);
}

{
  // enemy animations: walkers step only while moving; fliers always flap; stun freezes
  const walk = { anim: 0, fly: false, vx: 60, stun: 0 }, frames = new Set<number>();
  for (let i = 0; i < 24; i++) { walk.anim = i * ANIM_RATE / 24; frames.add(mobFrame(walk, 4, 8)); }
  check('a walking enemy cycles through all its frames', frames.size === 4, [...frames].join(','));
  check('a standing enemy holds frame 0, then breathes out a beat later',
    mobFrame({ ...walk, vx: 0, anim: 3.3 }, 4, 8) === 0 && mobFrame({ ...walk, vx: 0, anim: ANIM_RATE * 0.9 }, 4, 8) === BREATH);
  check('a stunned enemy holds frame 0', mobFrame({ ...walk, stun: 1, anim: 3.3 }, 4, 8) === 0);
  check('a hovering flier keeps flapping', mobFrame({ anim: ANIM_RATE * 0.25, fly: true, vx: 0, stun: 0 }, 2, 4) === 1);
}

{
  // bosses: an area's last floor has one, and its way up stays sealed until it's beaten
  release();
  let endN = 1; while (!isPathEnd(climb(endN))) endN++;
  gotoPlace(climb(endN - 1));
  check('no boss before the last floor of an area', !game.mobs.some((m) => m.boss));
  gotoPlace(START);
  check('nor in a town', !game.mobs.some((m) => m.boss));
  gotoPlace(climb(endN));
  const bs = game.mobs.filter((m) => m.boss);
  check("an area's last floor has exactly one boss, one of its enemies grown huge and much tougher", bs.length === 1);
  const boss = bs[0];
  check('the boss is grown, not flying', boss.w === boss.type.w * BOSS.SCALE && boss.h === boss.type.h * BOSS.SCALE && boss.hpMax >= boss.type.hp * BOSS.HP && !boss.fly);
  check("the Tide Pools' boss is the Giant Enemy Crab", bossName(bossType('Tide Pools')) === 'Giant Enemy Crab', bossType('Tide Pools'));
  const hp0 = player.hpMax;
  player.hpMax = player.hp = 1e7;
  const ground = game.floor.platforms[0];
  const stand = (x: number): void => { player.x = x; player.y = ground.y - player.h; player.vx = player.vy = 0; player.onGround = true; player.plat = ground; player.climb = null; player.invuln = 0; };
  const up = game.floor.portals.find((q) => !q.down)!;
  player.x = up.x; player.y = up.y - player.h; player.vx = player.vy = 0; player.onGround = true; player.climb = null;
  tap('up');
  check('the way up is sealed while the boss stands', samePlace(game.floor.place, climb(endN)) && bossAlive() === boss);
  boss.stun = 2; boss.airTime = 1; step(1);
  check('the boss shrugs off stuns and launches', boss.stun === 0 && boss.airTime === 0);
  // charge: far away, it winds up, then rushes
  boss.x = WORLD.w * 0.75; boss.y = ground.y - boss.h; boss.vy = 0; boss.boss = { act: 'walk', t: 0, cd: 0, air: false };
  stand(40);
  step(1);
  check('far from you, the boss winds up a charge, then rushes at you', boss.boss.act === 'windCharge');
  step(Math.ceil(BOSS.WIND / P.STEP) + 2);
  check('the rush carries it in', boss.boss.act === 'charge' && boss.vx < -boss.spd * 2, `${boss.boss.act} ${boss.vx}`);
  // slam: the landing hits a player on the ground nearby, not one far off
  const slam = (dx: number, from = WORLD.w / 2): number => {
    boss.x = from; boss.y = ground.y - boss.h; boss.vx = boss.vy = 0; boss.boss = { act: 'windSlam', t: 0.01, cd: 9, air: false };
    stand(from + dx); quakes.length = 0;
    const before = player.hp;
    for (let i = 0; i < 300 && boss.boss.act !== 'walk'; i++) { player.invuln = Math.min(player.invuln, 0.5); game.mobs.splice(0, game.mobs.length, boss); step(1); stand(from + dx); }
    return before - player.hp;
  };
  check("a slam's shockwave hurts a player on the ground nearby, not one well out of reach (it leaps toward you)",
    slam(boss.w / 2 + 40) > 0 && quakes.length === 1 && slam(WORLD.w - 60, 30) === 0);
  // a wide platform above the ground for the boss to leap onto and off
  // (floors are built from single tiles, so add one for these tests)
  const deck: Platform = { x: WORLD.w / 2 - 60, y: ground.y - 48, w: 120, h: 16 };
  game.floor.platforms.push(deck);
  const onDeck = (): void => { stand(deck.x + deck.w / 2); player.y = deck.y - player.h; player.plat = deck; };
  // a slam can put the boss up on a platform above it, and it keeps chasing
  // from there (it is not tied to the ground it spawned on)
  {
    // a platform wide enough for the boss to stand on, above the ground
    {
      onDeck();
      boss.x = deck.x + deck.w / 2; boss.y = deck.y - boss.h; boss.vx = boss.vy = 0;
      boss.boss = { act: 'walk', t: 0, cd: 9, air: false };
      step(2);
      check('the boss stands on a high platform with you', Math.abs(boss.y + boss.h - deck.y) < 1, `feet ${(boss.y + boss.h).toFixed(1)} vs ${deck.y} (deck ${deck.x},${deck.w} ground ${ground.y})`);
    }
  }
  // a slam aimed at a player on a high platform lands on that platform,
  // rising to their feet rather than to a fixed height
  {
    {
      onDeck();
      boss.x = deck.x + deck.w / 2; boss.y = ground.y - boss.h; boss.vx = boss.vy = 0;
      boss.boss = { act: 'windSlam', t: 0.01, cd: 9, air: false };
      quakes.length = 0;
      for (let i = 0; i < 300 && boss.boss.act !== 'walk'; i++) { player.invuln = 1; game.mobs.splice(0, game.mobs.length, boss); step(1); }
      check('a slam from the ground lands on the platform you stand on', Math.abs(boss.y + boss.h - deck.y) < 1 && boss.boss.act === 'walk', `feet ${(boss.y + boss.h).toFixed(1)} vs ${deck.y}, act ${boss.boss.act}`);
      game.mobs.push(boss);
    }
  }
  // and the other way: a slam from a high platform at a player below drops
  // down through it to their level
  {
    {
      const mid = deck.x + deck.w / 2, below = mid + (mid < WORLD.w / 2 ? 1 : -1) * (deck.w / 2 + 40);
      game.mobs.splice(0, game.mobs.length, boss);
      boss.x = mid; boss.y = deck.y - boss.h; boss.vx = boss.vy = 0;
      boss.boss = { act: 'walk', t: 0, cd: 9, air: false };
      stand(below); step(2);
      boss.boss = { act: 'windSlam', t: 0.01, cd: 9, air: false };
      for (let i = 0; i < 300 && boss.boss.act !== 'walk'; i++) { player.invuln = 1; game.mobs.splice(0, game.mobs.length, boss); stand(below); step(1); }
      check('a slam from a platform jumps down to the player below', Math.abs(boss.y + boss.h - ground.y) < 1 && boss.boss.act === 'walk' && !boss.boss.dropTo, `feet ${(boss.y + boss.h).toFixed(1)} vs ground ${ground.y}, act ${boss.boss.act}`);
    }
  }
  game.floor.platforms.splice(game.floor.platforms.indexOf(deck), 1);
  // beaten: the way up opens
  killMob(boss);
  player.x = up.x; player.y = up.y - player.h; player.vx = player.vy = 0; player.onGround = true; player.climb = null;
  tap('up');
  check('beating the boss clears it and the way up opens', !bossAlive() && samePlace(game.floor.place, climb(endN + 1)));
  player.hpMax = player.hp = hp0;
  // looks: hair style, hair colour, skin and outfit; set from the menu or the town stylist
  check('a bad saved look falls back to the default, a good one is kept',
    JSON.stringify(cleanLook({ style: 99, hair: -1, skin: 'x' })) === JSON.stringify(DEFAULT_LOOK) && cleanLook({ style: 2, hair: 3, skin: 1, outfit: 4 }).hair === 3);
  check('stepping a look wraps around', stepLook(DEFAULT_LOOK, 'style', -1).style === LOOK_COUNTS.style - 1);
  check('the elf ear follows the skin tone', lookPalette({ ...DEFAULT_LOOK, skin: 3 }).k === lookPalette({ ...DEFAULT_LOOK, skin: 3 }).s);
  const poses = Object.keys(GRIDS) as (keyof typeof GRIDS)[];
  const diff = (a: string[], b: string[]): number => a.reduce((n, r, y) => n + [...r].filter((ch, x) => ch !== b[y][x]).length, 0);
  check('the default hair style leaves the sprites as drawn (the female build adds only a lash)', poses.every((p) => GRIDS[p].every((g) => diff(styled(g, p, 0), g) <= 1)));
  for (let st = 1; st < LOOK_COUNTS.style; st++) for (const body of [0, 1]) {
    const ok = poses.every((p) => GRIDS[p].every((g) => {
      const s = styled(g, p, st, body);
      // same size, and below the head only cape, outline or empty pixels change
      return s.length === g.length && s.every((r, y) => r.length === g[y].length)
        && s.every((r, y) => y < 12 || [...r].every((ch, x) => ch === g[y][x] || 'cCo.'.includes(g[y][x])));
    }));
    if (!ok) check(`hair style ${st}, body ${body}: frames keep their size; the body, bow and arms are untouched`, ok);
  }
  check('every hair style and build keeps frames their size, and the body, bow and arms untouched', true);
  check('every hair style looks different', new Set(Array.from({ length: LOOK_COUNTS.style }, (_, st) => styled(GRIDS.idle[0], 'idle', st).join())).size === LOOK_COUNTS.style);
  void 0;
  check('the male build changes the face', poses.filter((p) => p !== 'prone' && p !== 'climb').every((p) => diff(styled(GRIDS[p][0], p, 0, 1), styled(GRIDS[p][0], p, 0, 0)) >= 3));
  // town stylists: each town offers its own extra, which seeing unlocks everywhere
  const towns = TOWNS.map((t) => t.name);
  check('every town\'s stylist has an extra', towns.every((t) => TOWN_LOOKS[t]?.length), towns.filter((t) => !TOWN_LOOKS[t]?.length).join(', '));
  const extras = Object.values(TOWN_LOOKS).flat().map((e) => `${e.k}:${e.i}`);
  check('extras are real, not basic, and each offered by one town', new Set(extras).size === extras.length
    && Object.values(TOWN_LOOKS).flat().every((e) => e.i < LOOK_COUNTS[e.k] && !isBasic(e.k, e.i)));
  void 0;
  const allExtras = (['style', 'hair'] as const).flatMap((k) => Array.from({ length: LOOK_COUNTS[k] }, (_, i) => `${k}:${i}`).filter((x) => !isBasic(x.split(':')[0] as 'style', +x.split(':')[1])));
  check('every extra style and colour can be found in some town', allExtras.every((x) => extras.includes(x)), allExtras.filter((x) => !extras.includes(x)).join(', '));
  check('long hair shows down the back', styled(GRIDS.idle[0], 'idle', 2).join() !== styled(GRIDS.idle[0], 'idle', 1).join());
  // the menu's LOOK row opens the stylist; keys go to it until it closes
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage ??= { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); } };
  setMyLook(DEFAULT_LOOK); clearUnlocks();
  initMenu(() => {}, START);
  menu.sel = items().indexOf('look'); menuKey('enter');
  check('LOOK in the menu opens the stylist', stylist.open && stylist.sel === 0);
  menuKey('right');
  check('Right changes the picked row (hair style)', myLook().style === 1);
  menuKey('down'); menuKey('left');
  check('...the next row down is the hair colour', myLook().hair === BASIC.hair! - 1);
  void 0;
  check('the look is kept on this device', cleanLook(JSON.parse(localStorage.getItem('archer-game:look') ?? '{}')).hair === BASIC.hair! - 1);
  menuKey('escape');
  check('Esc closes the stylist, not the menu', !stylist.open && menu.open);
  // taps: a row's left half steps back, its right half forward
  stylistKey('escape'); stylist.open = true; stylist.sel = 0;
  const b = stylistBox(320, 180), rowY = (i: number): number => b.y + ST_TOP + i * 14 + 3;
  const sk = myLook().skin;
  stylistTap(b.x + ST_ROWS_W - 10, rowY(2), 320, 180);
  const fwd = myLook().skin === (sk + 1) % LOOK_COUNTS.skin && stylist.sel === 2;
  stylistTap(b.x + 10, rowY(2), 320, 180);
  check('tapping a row’s right half steps it forward, its left half back', fwd && myLook().skin === sk);
  stylistTap(2, 2, 320, 180);
  check('tapping outside the window closes it', !stylist.open);
  menu.open = false;
  // the town stylist
  let townN = 1; while (gotoPlace(climb(townN)), !game.floor.town) townN++;
  const st = game.floor.npcs?.find((n) => n.kind === 'stylist');
  const zones = game.floor.portals.map((q) => [q.x - q.w / 2 - 10, q.x + q.w / 2 + 10]).concat(game.floor.ladders.map((l) => [l.x - 7, l.x + 7]), game.floor.ropes.map((l) => [l.x - 7, l.x + 7]));
  check('towns have a stylist, clear of portals, ladders and ropes', !!st && zones.every(([lo, hi]) => st.x + NPC_R <= lo || st.x - NPC_R >= hi));
  release(); setMyLook(DEFAULT_LOOK);
  player.x = st!.x; player.y = st!.y - player.h; player.vx = player.vy = 0; player.onGround = true; player.climb = null;
  tap('up');
  check('Up beside the stylist opens the window, and arrows change your look there too', stylist.open);
  tap('right');
  check('the arrow applies', myLook().style === 1);
  const town = placeName(game.floor.place), extra = TOWN_LOOKS[town][0];
  check('the town stylist knows which town it is in, and says its looks are new', stylist.town === town && stylist.fresh > 0);
  void 0;
  setMyLook({ ...DEFAULT_LOOK, [extra.k]: extra.i - 1 });
  stylist.sel = STYLIST_ROWS.indexOf(extra.k === 'style' ? 'HAIR' : 'HAIR COLOUR'); tap('right');
  check('it offers its own extra', myLook()[extra.k] === extra.i, `${extra.k} ${myLook()[extra.k]} want ${extra.i}`);
  tap('x');
  check('X closes it, and seeing it unlocked the extra for good (the menu offers it now)',
    !stylist.open && !game.pause && isUnlocked(extra.k, extra.i) && offeredAt(null)(extra.k, extra.i));
  openStylist(town);
  check('a second visit has nothing new', stylist.fresh === 0);
  stylist.open = false; clearUnlocks();
  check('without the unlock the menu skips it', !offeredAt(null)(extra.k, extra.i) && offeredAt(town)(extra.k, extra.i));
  setMyLook(DEFAULT_LOOK);
  release();
  // quests: every town has a board posting kill quests for the areas above it
  release(); loadQuests([]);
  for (const a of TOWNS.map((t) => ({ id: t.id, town: t.name }))) {
    gotoPlace({ town: a.id });
    const b = game.floor.npcs?.find((n) => n.kind === 'board');
    const zones = game.floor.portals.map((q) => [q.x - q.w / 2 - 10, q.x + q.w / 2 + 10]).concat(game.floor.ladders.map((l) => [l.x - 7, l.x + 7]), game.floor.ropes.map((l) => [l.x - 7, l.x + 7]));
    if (!b || !zones.every(([lo, hi]) => b.x + NPC_R <= lo || b.x - NPC_R >= hi)) { check(`${a.town} has a clear quest board`, false); break; }
    const offers = boardOffers(a.id), ups = pathsFrom(a.id);
    const want = new Set((ups.length ? ups.map((p) => p.name) : [areaOf({ town: a.id })]).flatMap((n) => areaMobs(n).map((m) => m.n)));
    if (!offers.length || !offers.every((o) => want.has(o.mob) && o.exp > 0 && o.coins > 0)) { check(`${a.town} posts quests for the areas above`, false, offers.map((o) => o.mob).join(',')); break; }
  }
  check('every town has a quest board clear of portals, ladders and ropes', true);
  gotoPlace(START);
  const boardNpc = game.floor.npcs!.find((n) => n.kind === 'board')!;
  player.x = boardNpc.x; player.y = boardNpc.y - player.h; player.vy = 0; player.onGround = true; player.climb = null;
  tap('up');
  check('Up beside the board opens it', board.open && boardRows().length > 0);
  tap('z');
  check('Z takes the selected posting', quests.length === 1 && quests[0].have === 0);
  void 0;
  const q = quests[0];
  check('a taken posting leaves the offer list', boardRows().filter((r) => r.active === null).every((r) => r.q.mob !== q.mob));
  for (let i = 0; i < q.need + 3; i++) questKill(q.mob);
  questKill('Nobody');
  check('kills count toward the quest (capped at the goal)', q.have === q.need);
  const exp0 = player.exp, lvl0 = player.level, coins0 = wallet.coins;
  board.sel = 0; tap('z');
  check('Z hands in a finished quest for EXP and coins', quests.length === 0 && wallet.coins === coins0 + q.coins && (player.exp > exp0 || player.level > lvl0));
  void 0;
  for (let i = 0; i < 5; i++) { board.sel = boardRows().findIndex((r) => r.active === null); if (board.sel >= 0) tap('z'); }
  check(`at most ${QUEST_MAX} quests at once`, quests.length <= QUEST_MAX);
  const n0 = quests.length; board.sel = 0; tap('x');
  check('X drops an active quest', quests.length === n0 - 1);
  tap('escape');
  check('Esc closes the board (not the pause menu)', !board.open && !game.pause);
  release();
  // a kill in the world counts
  loadQuests([{ mob: 'Garden Snail', need: 2, have: 0, exp: 5, coins: 5 }]);
  gotoPlace(climb(1)); spawnMob({ x: 100, y: game.floor.platforms[0].y, types: ['Garden Snail'] } as never, MOB_TYPES[0]); killMob(game.mobs[game.mobs.length - 1]);
  check('killing an enemy advances its quest', quests[0].have === 1);
  // saved and restored
  const snap = snapshot();
  loadQuests([]); apply(snap);
  check('quests survive a save and load', quests.length === 1 && quests[0].mob === 'Garden Snail' && quests[0].have === 1);
  loadQuests([{ mob: 3 }, null, { mob: 'Enemy Crab', need: -5, have: 99, exp: 'x', coins: 1 }]);
  check('malformed saved quests are dropped or clamped', quests.length === 1 && quests[0].need === 1 && quests[0].have === 1 && quests[0].exp === 0);
  loadQuests([]);
}

// --- settings: the window, its values, storage, and where it opens from ---
{
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)); },
    removeItem: (k: string) => { mem.delete(k); },
  };
  Object.assign(settings, DEFAULT_SETTINGS);
  check('bad stored settings fall back to the defaults', JSON.stringify(cleanSettings({ sound: 'x', dmgNums: 3 })) === JSON.stringify(DEFAULT_SETTINGS));
  check('stored volume is clamped', cleanSettings({ sound: 99 }).sound === VOLUME_MAX && cleanSettings({ sound: -4 }).sound === 0);
  openSettings();
  const s0 = settings.sound;
  settingsKey('left');
  check('Left turns the sound down (and saves it)', settings.sound === s0 - 1 && JSON.parse(mem.get('archer-game:settings')!).sound === s0 - 1);
  for (let i = 0; i < 20; i++) settingsKey('right');
  check('the volume stops at its max', settings.sound === VOLUME_MAX);
  settingsKey('down'); settingsKey('left');
  check('damage numbers toggle', settings.dmgNums === false);
  const b = settingsBox(320, 180);
  settingsTap(b.x + SET_W - 10, b.y + SET_TOP + SET_ROW + 2, 320, 180);
  check('a tap on a row changes it', settings.dmgNums === true && settingsUi.sel === 1);
  settingsTap(b.x + 10, b.y + SET_TOP + (SETTING_ROWS.length - 1) * SET_ROW + 2, 320, 180);
  check('tapping DONE closes the window', !settingsUi.open);
  // from the main menu
  initMenu(() => {}, START); menu.sel = items().indexOf('settings'); menuKey('enter');
  check('the main menu opens the settings', settingsUi.open);
  menuKey('escape');
  check('Esc closes them back to the menu', !settingsUi.open && menu.open);
  menu.open = false;
  // from the Esc menu: Right past the skills column reaches the SETTINGS button
  arena();
  tap('escape'); tap('right'); tap('right');
  check('Right twice in the Esc menu selects SETTINGS', game.pause?.col === 2);
  tap('z');
  check('Z there opens the settings over the paused game', settingsUi.open && !!game.pause);
  const t0 = game.time; tap('down'); tap('escape');
  check('Esc closes the settings but stays paused', !settingsUi.open && !!game.pause && game.time === t0);
  tap('escape');
  check('a second Esc resumes', !game.pause);
  Object.assign(settings, DEFAULT_SETTINGS);
}

// --- chasing enemies keep full speed, run past you, and turn past you ---
{
  arena(1, 160); player.invuln = 999;
  const m = dummy(140); m.spd = 60; m.aggro = true; m.dir = 1;
  m.x = player.x - 40;
  step(1);
  check('a chasing enemy runs at full speed even right next to you', Math.abs(m.vx - 60) < 1e-6, `vx ${m.vx.toFixed(1)} at ${(player.x - m.x).toFixed(1)}px`);
  // it aims 3 tiles (48px) past you, so it keeps going as it closes
  m.x = player.x - 10; step(1);
  check('it runs on past you rather than stopping on you', m.vx === 60 && m.x > player.x - 10, `vx ${m.vx.toFixed(1)} x ${m.x.toFixed(1)}`);
  // once it is 3 tiles past you, it stops to turn round
  m.x = player.x + 48; m.vx = 60; step(1);
  check('three tiles past you, it stops to turn round', m.dir === 1 && m.vx === 0, `dir ${m.dir} vx ${m.vx.toFixed(1)}`);
  step(Math.ceil(CHASE_TURN / P.STEP));
  check('...then comes back at full speed', m.dir === -1 && Math.abs(m.vx + 60) < 1e-6, `vx ${m.vx.toFixed(1)}`);
  game.mobs.length = 0;
}

// --- enemies never get stuck running one way (past the sweep, at an edge) ---
{
  arena(1, 200); player.invuln = 999;
  // you slipped behind it mid-sweep: it is already past its goal, so it turns
  const m = dummy(140); m.spd = 60; m.aggro = true;
  m.x = player.x + 80; m.dir = 1; step(1);
  check('a chasing enemy already past its turn point stops to turn', m.vx === 0, `vx ${m.vx.toFixed(1)}`);
  step(Math.ceil(CHASE_TURN / P.STEP) + 1);
  check('...and heads back toward you', m.dir === -1 && m.vx < 0, `dir ${m.dir} vx ${m.vx.toFixed(1)}`);
  // you stand at the end of its platform: its turn point lies off the end,
  // so it turns there and sweeps back instead of pressing on the edge
  const [, hi] = mobBounds(m);
  player.x = hi - 6; m.x = hi - 30; m.dir = 1; m.vx = 0;
  let minX = Infinity, reached = false;
  for (let i = 0; i < 90; i++) { step(1); if (m.x >= hi - 1) reached = true; if (reached) minX = Math.min(minX, m.x); }
  check('an enemy chasing you at a platform end sweeps back from the edge', reached && minX < hi - 20, `reached ${reached} min ${minX.toFixed(1)} hi ${hi}`);
  game.mobs.length = 0;
}
