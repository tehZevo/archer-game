import { seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, VARIANT_ART, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';
// --- minimap: the whole floor at 1:10, in the top-right under the skill bar ---
{
  game.view.w = 240; game.view.h = 180;
  const r = miniRect();
  check('minimap fits on screen under the skill bar', r.x >= 0 && r.x + r.w <= 240 && r.y >= 24 && r.y + r.h < 180 - 16, JSON.stringify(r));
  const [x0, y0] = toMini(0, 0), [x1, y1] = toMini(WORLD.w - 1, WORLD.h - 1);
  check('minimap covers the whole floor', x0 === r.x && y0 === r.y && x1 < r.x + r.w && y1 < r.y + r.h);
  check('minimap is 1:10', MINI_SCALE === 0.1 && r.w === Math.ceil(WORLD.w / 10));
}

// --- floors are trimmed to their content: a thin ground, a little sky ---
{
  const hs: number[] = [];
  let ok = true;
  for (let n = 1; n <= 20; n++) {
    release(); gotoPlace(climb(n));
    const f = game.floor, g = f.platforms[0], top = Math.min(...f.portals.map((p) => p.y - p.h));
    hs.push(f.h);
    if (WORLD.h !== f.h || g.h !== 4 * TILE || g.y + g.h !== f.h || top < 2 * TILE || (top > 3 * TILE && !f.town && f.h > 180) || f.h < (f.town ? TOWN_MIN_H : 180)) ok = false; // towns get extra sky (see TOWN_MIN_H)
    if (f.platforms.some((p) => p.y < 0) || f.ropes.some((c) => c.y1 < 0)) ok = false;
  }
  // towns are taller than the view, so climbing to the deck moves the camera
  {
    release(); gotoPlace(climb(1)); game.view.w = 240; game.view.h = 180; // the Harbor: one level, the shortest town
    const deck = Math.min(...game.floor.platforms.filter((p) => p.block === 1).map((p) => p.y));
    player.x = 40; player.y = ground().y - player.h; player.onGround = true; player.climb = null;
    game.cam.y = cameraTarget().y; const low = game.cam.y;
    player.y = deck - player.h; const high = cameraTarget().y;
    check('in town the camera follows you up onto the deck', game.floor.h >= TOWN_MIN_H && high < low, `cam ${low} -> ${high}, h ${game.floor.h}`);
  }
  check('each floor is ground (4 tiles) up to its portal plus 2-3 tiles of sky', ok, `heights ${[...new Set(hs)].join(',')}`);
  game.view.w = 240; game.view.h = 180;
  check('the minimap fits the tallest trimmed floor', Math.max(...hs) * MINI_SCALE + miniRect().y < 180 - 16);
}

// --- multiplayer stays offline (and says why) without WebCrypto or WebRTC ---
{
  const c = globalThis.crypto;
  Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
  net.offline = '';
  const ok = canConnect();
  check('no WebCrypto (plain HTTP page): multiplayer stays off with a reason', !ok && net.offline.includes('HTTPS'));
  Object.defineProperty(globalThis, 'crypto', { value: c, configurable: true });
  // Firefox-style: WebRTC lives under the moz-prefixed name
  const g = globalThis as { RTCPeerConnection?: unknown; mozRTCPeerConnection?: unknown };
  g.RTCPeerConnection = undefined; g.mozRTCPeerConnection = function () {};
  net.offline = '';
  check('WebRTC under the moz-prefixed name counts', canConnect() && net.offline === '');
  g.mozRTCPeerConnection = undefined;
  net.offline = '';
  check('no WebRTC (e.g. Firefox with it turned off): local only, no crash', !canConnect() && net.offline.includes('WEBRTC'));
  g.RTCPeerConnection = function () {};
  net.offline = '';
  check('with WebCrypto and WebRTC, multiplayer can connect', canConnect() && net.offline === '');
}

// --- towns: a designed layout, ways up into the areas above, one way down ---
{
  const stand = (pt: { x: number; y: number }): void => {
    player.x = pt.x; player.y = pt.y - player.h; player.vx = 0; player.vy = 0; player.onGround = true; player.climb = null;
  };
  const drift: Place = { town: 'driftwood' }, here = (): string => placeKey(game.floor.place);
  release(); gotoPlace(drift);
  const f = game.floor, layout = JSON.stringify(f.platforms);
  net.channel = 3; gotoPlace(drift); const other = JSON.stringify(game.floor.platforms); net.channel = 1;
  check('towns are a designed layout (the same on every channel and town)', layout === other);
  gotoPlace(drift);
  const [upL, upR, down] = game.floor.portals;
  check('a town has two ways up and one down', game.floor.portals.length === 3 && placeKey(upL.to) === 'woods-1' && placeKey(upR.to) === 'meadows-1'
    && !upL.down && !upR.down && down.down === true && placeKey(down.to) === 'saltwick' && game.mobs.every((m) => m.training));
  check('ways up show the level of the enemies past them', upL.lvl === 4 && upR.lvl === 4);
  const deck = game.floor.platforms.filter((p) => p.block === 1 && !p.inner);
  const deckTop = Math.min(...deck.map((p) => p.y));
  check('the plaza deck is reached by a ladder and a rope from the ground',
    game.floor.ladders[0].y1 === deckTop && game.floor.ropes[0].y1 === deckTop && game.floor.ladders[0].y2 === game.floor.platforms[0].y);
  // Driftwood Rest is a two-level town: a loft over the deck, up a ladder, with the way down on it
  {
    const fl = game.floor, dk = fl.platforms.filter((p) => p.block === 1), lf = fl.platforms.filter((p) => p.block === 2);
    const dTop = Math.min(...dk.map((p) => p.y)), dn = fl.portals.find((q) => q.down)!;
    const lTop = Math.min(...lf.map((p) => p.y)), lBottom = Math.max(...lf.map((p) => p.y + p.h)), lad = fl.ladders[1];
    check('a loft holds the way down, up a ladder from the deck, with headroom under it', fl.layout === 'loft'
      && dn.y === lTop && lf.some((p) => !p.inner && p.y === lTop && dn.x >= p.x && dn.x <= p.x + p.w)
      && !!lad && lad.y1 === lTop && lad.y2 === dTop && dTop - lBottom >= player.h + 4);
  }
  // every town, whatever its layout
  const plans = new Set<string>(), bad: string[] = [];
  for (const a of TOWNS.map((t) => ({ id: t.id, town: t.name }))) {
    gotoPlace({ town: a.id });
    const fl = game.floor, tops = fl.platforms.filter((p) => !p.inner);
    plans.add(fl.layout ?? '');
    // what you can reach from the ground by walking along levels and climbing
    const blockAt = (x: number, y: number): number | undefined => tops.find((p) => p.y === y && x >= p.x && x <= p.x + p.w)?.block ?? (tops.some((p) => p.ground && p.y === y) ? 0 : undefined);
    const reach = new Set<number>([0]);
    for (let grew = true; grew;) {
      grew = false;
      for (const c of [...fl.ladders, ...fl.ropes]) {
        const lo = blockAt(c.x, c.y2), hi = blockAt(c.x, c.y1);
        if (lo === undefined || hi === undefined) { bad.push(`${a.town}: a climbable at ${c.x} doesn't join two levels`); continue; }
        for (const [u, v] of [[lo, hi], [hi, lo]]) if (reach.has(u) && !reach.has(v)) { reach.add(v); grew = true; }
      }
    }
    for (const q of [...fl.portals, ...(fl.npcs ?? [])]) {
      const b = blockAt(q.x, q.y);
      if (b === undefined || !reach.has(b)) bad.push(`${a.town}: ${'kind' in q ? q.kind : q.label} can't be reached`);
    }
    // headroom: wherever one level is over another, you can walk under it
    for (const u of tops) for (const v of tops) {
      if (u === v || u.block === v.block || u.x >= v.x + v.w || v.x >= u.x + u.w || u.y >= v.y) continue;
      const under = fl.platforms.filter((p) => p.block === u.block && p.x === u.x).reduce((m, p) => Math.max(m, p.y + p.h), 0);
      if (v.y - under < player.h + 4 && under !== v.y) bad.push(`${a.town}: no headroom at x ${v.x}`); // (a step resting on it is fine)
    }
    // climbing off a ladder or rope never lands you in a portal
    for (const q of fl.portals) for (const c of [...fl.ladders, ...fl.ropes]) {
      if ((c.y1 === q.y || c.y2 === q.y) && Math.abs(c.x - q.x) < q.w / 2 + 10 + 7) bad.push(`${a.town}: a climbable by ${q.label}`);
    }
    // people on the same level stand far enough apart for their names not to overlap
    for (const u of fl.npcs ?? []) for (const v of fl.npcs ?? []) if (u !== v && u.y === v.y && Math.abs(u.x - v.x) < 44) bad.push(`${a.town}: ${u.kind} and ${v.kind} crowd each other`);
    // decorations stand on something
    for (const d of fl.decor ?? []) if (blockAt(d.x, d.y) === undefined) bad.push(`${a.town}: a ${d.kind} in mid-air at ${d.x}`);
    if (!(fl.decor ?? []).some((d) => d.kind === 'house' || d.kind === 'tower')) bad.push(`${a.town}: no buildings`);
  }
  check('towns come in every layout', TOWN_PLANS.every((p) => plans.has(p)), [...plans].join(', '));
  check('in every town, every portal and person can be reached by walking and climbing; levels have headroom; climbables are clear of portals; decorations stand on something; there are buildings', bad.length === 0, bad.slice(0, 4).join('; '));
  check('every town and path has its own short id, letters only, all different',
    new Set([...TOWNS, ...PATHS].map((x) => x.id)).size === TOWNS.length + PATHS.length && [...TOWNS, ...PATHS].every((x) => /^[a-z]+$/.test(x.id)));
  check('towns are junctions: every path runs between two known towns, and every town but the start is reached by one',
    PATHS.every((p) => TOWNS.some((t) => t.id === p.from) && TOWNS.some((t) => t.id === p.to))
    && TOWNS.every((t) => t.id === START.town || (pathsInto(t.id).length > 0 && townDepth(t.id) > 0)));
  check('every path declares its own mix of the shared layouts', PATHS.every((p) => Object.keys(p.layouts).length > 0
    && Object.entries(p.layouts).every(([k, w]) => k in LAYOUTS && (w ?? 0) > 0)));
  check('a town lays out every way up and down from it', TOWNS.every((t) => pathsFrom(t.id).length <= 2 && pathsInto(t.id).length <= 1));
  gotoPlace(drift);

  player.hp = 5; player.mp = 1;
  stand(upR); tap('up');
  const meadowFloor = JSON.stringify(game.floor.platforms);
  check('the right portal goes up into the right area', here() === 'meadows-1');
  check('arriving does not refill HP or MP', player.hp === 5 && player.mp === 1);
  gotoPlace(drift); stand(game.floor.portals[0]); tap('up');
  check('the left portal goes up into the left area, a different layout', here() === 'woods-1' && JSON.stringify(game.floor.platforms) !== meadowFloor);
  gotoPlace({ town: 'lanternhollow' }); stand(game.floor.portals[game.floor.portals.length - 1]); tap('up');
  check("a town's way down goes to the town its path started from (not the floor below)", here() === 'driftwood' && game.floor.town);
  gotoPlace(climb(1));
  check('the Harbor (where you start) has one way up, to the Beach, and none down',
    game.floor.town && game.floor.portals.length === 1 && placeKey(game.floor.portals[0].to) === 'shore-1');
  stand(game.floor.portals[0]); tap('up');
  check('it leads to Beach 1', here() === 'shore-1' && !game.floor.town);
  check('skills work in town', (() => { gotoPlace(drift); player.cd.z = 0; player.mp = 99; player.casting.useT = 0; tap('z'); return player.casting.useT > 0; })());
  release();
}

// --- enemies never freeze at a platform end; Rush Toss carry fixes ---
{
  // patrol: every enemy keeps moving (none parked against an edge)
  let frozen = 0, total = 0;
  for (const n of [1, 2, 4]) {
    release(); gotoPlace(climb(n)); player.invuln = 1e9; player.x = 4; player.y = 0; player.climb = null;
    const last = new Map<object, number>(), still = new Map<object, number>();
    for (let i = 0; i < 150; i++) {
      step(1); player.hp = player.hpMax;
      for (const m of game.mobs) {
        still.set(m, Math.abs(m.x - (last.get(m) ?? -9)) > 0.2 ? 0 : (still.get(m) ?? 0) + 1); last.set(m, m.x);
      }
    }
    total += game.mobs.filter((m) => !m.training).length; frozen += game.mobs.filter((m) => !m.training && (still.get(m) ?? 0) > 45).length;
  }
  check('patrolling enemies turn at platform ends instead of freezing', frozen === 0, `${frozen}/${total} frozen`);

  // chase: an angry enemy whose player is off its platform goes back to patrolling
  arena(1); const g = ground(), w0 = g.w;
  const m = dummy(100); m.spd = 50; m.aggro = true; m.home = 80; m.range = 60;
  player.x = 300; player.y = g.y - player.h;
  let still = 0, lx = m.x;
  for (let i = 0; i < 90; i++) { step(1); still = Math.abs(m.x - lx) < 0.2 ? still + 1 : 0; lx = m.x; }
  g.w = w0;
  check('an enemy does not pin itself to the edge chasing an unreachable player', still < 30, `still ${still} frames`);

  // Rush Toss hits at most 6
  arena(1); player.ranks['ground-q'] = true;
  const ms = Array.from({ length: 9 }, (_, i) => dummy(120 + i * 6));
  tap('q'); step(14);
  check('Rush Toss hits at most 6 enemies', ms.filter((x) => x.hp < 1e6).length === 6, `${ms.filter((x) => x.hp < 1e6).length} hit`);

  // grab reaches a little behind
  arena(1); const behind = dummy(95); player.x = 100;
  tap('q'); step(14);
  check('Rush Toss scoops up an enemy just behind you', behind.hp < 1e6 && behind.x > 100);
}

// --- an enemy carried by Rush Toss never ends up inside or under its platform ---
{
  let bad = 0, runs = 0;
  for (const n of [1, 2, 3, 4]) {
    release(); gotoPlace(climb(n));
    const count = Math.min(10, game.mobs.filter((m) => !m.fly && !m.training).length);
    for (let k = 0; k < count; k++) for (const face of [1, -1]) {
      release(); gotoPlace(climb(n)); player.invuln = 1e9; player.mp = 999; player.ranks['ground-q'] = true;
      const m = game.mobs.filter((x) => !x.fly && !x.training)[k];
      if (!m) continue;
      player.x = m.x - face * 14; player.y = m.y + m.h - player.h; player.vy = 0; player.face = face;
      player.onGround = true; player.climb = null; player.cd['ground-q'] = 0; player.casting.useT = 0;
      step(1); if (!player.onGround) continue;
      runs++;
      tap('q');
      step(60);
      if (!game.mobs.includes(m)) continue;
      const home = game.floor.platforms.filter((p) => !p.inner && p.block === m.spawn?.block && m.x >= p.x && m.x < p.x + p.w);
      const onTop = home.some((p) => Math.abs(surfaceYAt(p, m.x) - (m.y + m.h)) < 3);
      if (!onTop) bad++;
    }
  }
  check('enemies carried by Rush Toss stay standing on their platform', runs > 10 && bad === 0, `${bad}/${runs} fell in or through`);
}
