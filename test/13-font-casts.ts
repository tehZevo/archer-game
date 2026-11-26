import { seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, PAUSE_ROWS, pauseScroll, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, VARIANT_ART, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';
// --- the font PNG has one 5x7 cell per character in FONT_CHARS
{
  const png = Uint8Array.from(atob(fontPng.split(',')[1]), (c) => c.charCodeAt(0));
  const u32 = (o: number): number => ((png[o] << 24) | (png[o + 1] << 16) | (png[o + 2] << 8) | png[o + 3]) >>> 0;
  check('font.png is one 5x7 cell per character', u32(16) === [...FONT_CHARS].length * 5 && u32(20) === 7, `${u32(16)}x${u32(20)}`);
}

{
  // Piercing Leap off a jump: the tornado's launch is a lift off the floor, so an
  // early cast doesn't stack its full height on top of the jump's.
  arena(20); player.ranks['ground-e'] = true;
  const g = ground().y - player.h;
  const peak = (n: number) => { let best = g; for (let i = 0; i < n; i++) { step(1); best = Math.min(best, player.y); } return g - best; };
  tap('e'); const flat = peak(40);
  check('Piercing Leap from the floor rises about its own height', flat > 35 && flat < 48, `${flat.toFixed(1)}px`);
  tap('c'); step(1); tap('e'); step(1);
  check('...and cast a frame into a jump the target is still measured off the floor',
    Math.abs(g + player.h - P.SPIKE_LIFT_H - player.liftTop) < 8, `top ${(g + player.h - player.liftTop).toFixed(1)}px up`);
  const linked = peak(40);
  check('...so it does not stack on the jump', linked < flat + 4, `${linked.toFixed(1)}px vs ${flat.toFixed(1)}px`);
}
{
  // Piercing Leap rises to its height and holds there for the whole cast,
  // rather than falling back down while you're still committed to it.
  arena(20); player.ranks['ground-e'] = true;
  const g = ground().y - player.h;
  tap('e');
  step(Math.ceil((P.SPIKE_LIFT_H / P.SPIKE_RISE_V + 0.1) / P.STEP)); // the rise
  const top = g - player.y;
  check('Piercing Leap rises to its lift height', Math.abs(top - P.SPIKE_LIFT_H) < 3, `${top.toFixed(1)}px`);
  const until = useTime('ground-e') - P.SPIKE_LIFT_H / P.SPIKE_RISE_V - 0.3;
  step(Math.floor(until / P.STEP));
  check('...and holds there until the cast is nearly over', Math.abs(g - player.y - top) < 1 && player.casting.useT > 0,
    `${(g - player.y).toFixed(1)}px useT ${player.casting.useT.toFixed(2)}`);
  step(Math.ceil(0.4 / P.STEP));
  check('...then falls once the cast ends', g - player.y < top - 2, `${(g - player.y).toFixed(1)}px`);
}
{
  // Bosses turn to face you at the same pace as the regular enemies (CHASE_TURN),
  // so they don't snap-rotate the instant you get past them.
  arena(20);
  const boss = dummy(100); boss.boss = { act: 'walk', t: 0, cd: 99, air: false }; boss.dir = 1; boss.spd = 40;
  player.x = 60; // behind it: it wants to face left
  step(1);
  check('a boss starts its turn facing the old way', boss.dir === 1, `dir ${boss.dir}`);
  step(6); // 0.2s in: still turning
  check('...and turns over the regular enemies\' beat, not at once', boss.dir === 1 && boss.vx === 0, `dir ${boss.dir} vx ${boss.vx.toFixed(0)}`);
  step(4); // past CHASE_TURN
  check('...and completes the turn', boss.dir === -1, `dir ${boss.dir}`);
}
{
  // Every combat floor has a way back down on the ground, and it asks first.
  const here: Place = { path: 'woods', floor: 3 };
  gotoPlace(here);
  const back = game.floor.portals.find((q) => q.down);
  check('a combat floor has a return portal on the ground', !!back && back.y >= game.floor.platforms[0].y - 1,
    back ? `y ${back.y.toFixed(0)}` : 'none');
  check('...and it leads to the town below the path', !!back && back.to.town === 'driftwood', back?.label);
  const stand = (): void => { player.x = back!.x; player.y = back!.y - player.h; player.onGround = true; };
  stand(); tap('up');
  check('...stepping into it asks before it sends you', confirmUi.open && game.floor.place.floor === 3,
    `open ${confirmUi.open}`);
  check('...and Enter belongs to the dialog, not the chat line', windowOpen());
  confirmUi.yes = false; tap('enter');
  check('...Enter takes the answer', !confirmUi.open);
  stand(); tap('up'); confirmUi.yes = false; tap('z');
  check('...saying no keeps you on the floor', !confirmUi.open && game.floor.place.floor === 3);
  stand(); tap('up'); confirmUi.yes = true; tap('z');
  check('...saying yes travels to that town', game.floor.town && placeKey(game.floor.place) === 'driftwood',
    placeKey(game.floor.place));
}
{
  // A Tempest linked off a Skyward Assault still pays its 10s cooldown.
  arena(30); player.ranks['ground-q'] = true; player.ranks.ab = true; player.ranks.r = true;
  dummy(130);
  tap('q'); step(14); tap('w'); step(4);
  tap('r'); for (let i = 0; i < 40 && player.casting.queued; i++) step(1); // fires as the hover ends
  // The 10s cooldown, less the 1s every link shaves off it (see pay).
  check('the linked Tempest fires off the hover and pays its cooldown',
    player.cast === 'shoot' && player.cd.r > 8 && player.cd.r < 10, `cast ${player.cast} cd ${player.cd.r.toFixed(2)}`);
  tap('r');
  check('...so a second cast right away is spent', player.cd.r > 8 && player.cast === 'shoot' && player.castT > 0,
    `cd ${player.cd.r.toFixed(2)} cast ${player.cast}`);
}
{
  // The sweep lands before the linked skill starts: a press during the sweep
  // is buffered, not lost, and fires as its animation ends.
  arena(20); player.ranks.d = true; player.ranks['ground-w'] = true; player.ranks['air-w'] = true;
  dummy(150);
  tap('c'); step(8);
  tap('w');
  check('the sweep hits on the cast', player.cast === 'shoot' && game.mobs[0].hp < 1e6, `hp ${game.mobs[0].hp}`);
  check('the sweep poses for its whole animation', player.cast === 'shoot' && player.castT > useTime('air-w') - 0.4,
    `cast ${player.cast} castT ${player.castT.toFixed(2)} of ${useTime('air-w')}`);
  tap('d');
  check('a Glide pressed mid-sweep is buffered, not lost', player.casting.queued === 'd', `queued ${player.casting.queued}`);
  let wait = 0;
  while (player.casting.queued === 'd' && wait < 40) { step(1); wait++; }
  check('...and it fires as the sweep ends', Math.abs(wait * P.STEP - useTime('air-w')) < 0.1 && player.cast === 'jump',
    `fired after ${(wait * P.STEP).toFixed(2)}s, sweep ${useTime('air-w')}s, cast ${player.cast}`);
}
{
  // The aerial kit plants you: each skill zeroes your velocity so the move
  // reads as its own move, not as momentum carried in from a run or a jump.
  arena(30); player.ranks['ground-w'] = true; player.ranks['air-w'] = true;
  tap('c'); step(6);
  player.vx = 180; player.vy = -60;
  tap('w');
  // (gravity picks back up on the next frame; the point is the momentum is gone)
  check('Cyclone Sweep zeroes vx and vy, so the sweep holds its spot', player.vx === 0 && player.vy > -60,
    `vx ${player.vx.toFixed(0)} vy ${player.vy.toFixed(0)}`);
  const x0 = player.x; step(6);
  check('...and it stays put through the sweep', Math.abs(player.x - x0) < 1, `dx ${(player.x - x0).toFixed(1)}`);
}
{
  // Meteor Dive: a frozen coil, then the diagonal plunge.
  arena(20); player.ranks['ground-q'] = true; player.ranks['air-q'] = true;
  tap('c'); step(6);
  player.vx = 180; player.vy = -60;
  tap('q');
  check('Meteor Dive hangs frozen through its windup', player.vx === 0 && player.vy > -60 && !player.diving,
    `vx ${player.vx.toFixed(0)} vy ${player.vy.toFixed(0)} diving ${player.diving}`);
  step(2); // DIVE_WINDUP is 0.1s: the coil is the first three frames
  check('...and is still in the coil a frame in', !player.diving && player.vx === 0,
    `diving ${player.diving} vx ${player.vx.toFixed(0)}`);
  step(2);
  check('...then plunges down and forward at 45°', player.diving && player.vx > 100 && player.vy > 100,
    `diving ${player.diving} vx ${player.vx.toFixed(0)} vy ${player.vy.toFixed(0)}`);
}
{
  // Piercing Leap: you rise straight up from where you were running.
  arena(20); player.ranks['ground-e'] = true;
  player.vx = 200;
  tap('e');
  check('Piercing Leap zeroes vx so you rise straight up', player.vx === 0 && player.vy < 0,
    `vx ${player.vx.toFixed(0)} vy ${player.vy.toFixed(0)}`);
  const x0 = player.x; step(6);
  check('...and the climb stays on the spot it started', Math.abs(player.x - x0) < 1, `dx ${(player.x - x0).toFixed(1)}`);
}
{
  // The W-slot skills are paced by the Rush Toss link alone: a fresh Q
  // lets the follow-up fire again immediately, with nothing cooling down.
  arena(20); player.ranks['ground-q'] = true; player.ranks['ground-w'] = true; player.ranks.ab = true;
  check('Rising Arrows and Skyward Assault carry no cooldown', SKILLS['ground-w'].cd === 0 && SKILLS.ab.cd === 0,
    `W ${SKILLS['ground-w'].cd} AB ${SKILLS.ab.cd}`);
  tap('q'); step(12); tap('w');
  check('...and casting the Volley leaves nothing to cool down', player.cd['ground-w'] === 0 && player.cast === 'barrage',
    `cast ${player.cast} cd ${player.cd['ground-w'].toFixed(2)}`);
  while (!player.onGround) step(); // back on the ground: the next press is a Rush Toss, not the air form
  tap('q'); step(12); tap('w');
  check('...so the next Rush Toss fires the Volley again straight away', player.cast === 'barrage' && player.cd['ground-w'] === 0,
    `cast ${player.cast} cd ${player.cd['ground-w'].toFixed(2)}`);
}
{
  // Casting a skill flashes its own icon on the bar: the air and ground forms
  // are stacked in one column, so which key you hit is worth confirming.
  arena(20); player.ranks['ground-q'] = true; player.ranks['air-q'] = true;
  tap('q');
  check('casting Rush Toss flashes the Q slot', player.usedT['ground-q'] > USE_FLASH - 0.05 && player.usedT['ground-q'] > 0 && player.usedT['ground-q.air'] === 0,
    `Q ${player.usedT['ground-q'].toFixed(2)} Q.air ${player.usedT['ground-q.air'].toFixed(2)}`);
  step(3);
  check('...and the flash fades over USE_FLASH', player.usedT['ground-q'] > 0 && player.usedT['ground-q'] < USE_FLASH,
    `t ${player.usedT['ground-q'].toFixed(2)}`);
  step(10);
  check('...and is gone', player.usedT['ground-q'] === 0, `t ${player.usedT['ground-q'].toFixed(2)}`);
  step(16); // the 0.6s Rush Toss cast finishes, freeing you to jump
  tap('c'); step(6);
  tap('q');
  check('the Meteor Dive flashes the stacked air slot, not the ground one',
    player.usedT['ground-q.air'] > 0 && player.usedT['ground-q'] === 0,
    `Q.air ${player.usedT['ground-q.air'].toFixed(2)} Q ${player.usedT['ground-q'].toFixed(2)}`);
}
{
  // A rope on the way up: Glide commits you to the tumble, but the climb you
  // fly past should take over from it rather than waiting it out.
  arena(1);
  const g = ground();
  game.floor.ropes.length = 0; game.floor.ladders.length = 0;
  game.floor.ropes.push({ x: player.x, y1: g.y - 90, y2: g.y });
  player.y = g.y - player.h - 10; player.onGround = false; player.vx = 0; player.vy = -60;
  tap('d');
  check('Glide starts (and locks movement for its use time)', player.cast === 'jump' && player.casting.useT > 0,
    `cast ${player.cast} useT ${player.casting.useT.toFixed(2)}`);
  setKey('up', true); player.x = game.floor.ropes[0].x; player.vx = 0; step(1);
  check('the rope is grabbed on the way up, mid-Glide', player.climb !== null,
    `climb ${player.climb ? 'y' : 'none'} useT ${player.casting.useT.toFixed(2)}`);
  check('...and grabbing it ends the Glide', player.casting.useT === 0 && player.casting.key === null,
    `useT ${player.casting.useT.toFixed(2)} key ${player.casting.key}`);
  const y0 = player.y; step(6);
  check('...so the climb keeps going up', player.y < y0 && player.climb !== null, `y ${player.y.toFixed(1)} was ${y0.toFixed(1)}`);
  step(2);
  check('...and Up keeps working to the top', player.climb !== null && player.y < y0 - 10, `y ${player.y.toFixed(1)}`);
}
{
  // A floor opens with the view on the player. It used to start at the world's
  // top-left and ease in, so the first half-second was a pan down to her.
  game.view.w = 240; game.view.h = 180;
  gotoPlace(climb(2));
  const want = cameraTarget();
  check('a floor loads with the camera centred on the player',
    Math.abs(game.cam.x - want.x) < 1 && Math.abs(game.cam.y - want.y) < 1,
    `cam ${game.cam.x.toFixed(0)},${game.cam.y.toFixed(0)} want ${want.x.toFixed(0)},${want.y.toFixed(0)}`);
  // (unless she spawned by a wall and the camera is pinned to the world's edge)
  const pinnedX = (): boolean => game.cam.x <= 0 || game.cam.x >= WORLD.w - game.view.w;
  check('...so she sits in the middle of the deadzone',
    (pinnedX() || (player.x > game.cam.x + game.view.w * CAM.left && player.x < game.cam.x + game.view.w * CAM.right))
    && player.y + player.h > game.cam.y + game.view.h * CAM.top && player.y + player.h < game.cam.y + game.view.h * CAM.bottom,
    `x ${player.x.toFixed(0)} in ${game.cam.x.toFixed(0)}..${(game.cam.x + game.view.w).toFixed(0)} feet ${(player.y + player.h).toFixed(0)} in ${game.cam.y.toFixed(0)}..${(game.cam.y + game.view.h).toFixed(0)}`);
  step(1);
  check('...and it stays there on the first frame', Math.abs(game.cam.x - want.x) < 1 && Math.abs(game.cam.y - want.y) < 1,
    `cam ${game.cam.x.toFixed(0)},${game.cam.y.toFixed(0)}`);
  // every floor, not just the first
  let off = 0;
  for (const n of [1, 3, 5, 8, 10]) {
    gotoPlace(climb(n)); game.view.w = 240; game.view.h = 180;
    const w2 = cameraTarget();
    if (Math.abs(game.cam.x - w2.x) > 1 || Math.abs(game.cam.y - w2.y) > 1) off++;
  }
  check('...on every floor up the tower', off === 0, `${off} floor(s) start off-centre`);
  // The other players stand still: the idle's breathing cycle is what read as
  // a float, so a ghost's frame is the standing one, not one cycling on time.
  const frames = { ...GRIDS, idle: [['a'], ['b']] } as never;
  const ghost = (t: number): unknown => archerFrame(frames, 'idle', poseCycle('idle', 100, t, false));
  const mine = (t: number): unknown => archerFrame(frames, 'idle', poseCycle('idle', 100, t));
  check('a ghost\u2019s idle frame does not cycle with time', ghost(0) === ghost(0.4) && ghost(0) === ghost(1.2),
    `${ghost(0)} ${ghost(0.4)} ${ghost(1.2)}`);
  check('...while your own archer keeps breathing', mine(0) !== mine(0.5));
  check('...and a climb still steps with the height climbed', poseCycle('climb', 100, 0) === poseCycle('climb', 100, 0.5)
    && poseCycle('climb', 100, 0) !== poseCycle('climb', 108, 0));
}
{
  // Jump is movement, not a skill: a press during a skill's use time is
  // dropped (never buffered), and the first free frame jumps at once.
  arena(20);
  dummy(150);
  tap('z');
  check('Double Shot locks movement for its use time', player.casting.useT > 0);
  tap('c');
  check('a jump pressed during the use time does nothing', player.onGround && player.casting.queued === null,
    `onGround ${player.onGround} queued ${player.casting.queued}`);
  while (player.casting.useT > 0) step(1);
  step(14);
  check('...and is not buffered to fire once it ends', player.onGround);
  tap('c');
  check('once movement is free, Jump fires on the press', !player.onGround && player.vy < 0, `vy ${player.vy.toFixed(0)}`);
}
{
  // the dive's pitch is drawn into the frame (no canvas rotation): a square
  // frame holding the same figure, turned head-down
  const g = GRIDS.dive[0], p = pitch(g, DIVE_PITCH);
  const ink = (r: string[]): number => r.join('').replace(/\./g, '').length;
  check('a pitched frame is square and holds the whole figure', p.length === p[0].length && p.length >= Math.hypot(g[0].length, g.length));
  check('...with about the same number of pixels', Math.abs(ink(p) - ink(g)) / ink(g) < 0.2, `${ink(p)} vs ${ink(g)}`);
  check('...and no new colours', [...new Set(p.join(''))].every((ch) => g.join('').includes(ch)));
  check('a zero pitch keeps the figure upright (centred in the square)', pitch(g, 0).filter((r) => r.includes('h')).length >= 1);
}

{
  // town NPCs idle (breathing, blinking now and then) and wave when you're near
  const ts = Array.from({ length: 400 }, (_, i) => i * 0.025);
  const idle = new Set(ts.map((t) => npcFrame(t, false, 1.3))), near = new Set(ts.map((t) => npcFrame(t, true, 1.3)));
  check('an idle NPC breathes and blinks, and never waves', idle.has(0) && idle.has(1) && idle.has(2) && !idle.has(3));
  check('a near NPC waves', near.has(3) && !near.has(2));
  check('NPC frames are all distinct', new Set(Array.from({ length: NPC_FRAMES }, (_, f) => npcRows('shop', f).join())).size === NPC_FRAMES);
  check('the three NPCs look different', new Set((['shop', 'stylist', 'trainer'] as const).map((k) => npcRows(k, 0).join())).size === 3);
}

{
  // the moving town decor: every frame of each animated piece is different
  const frames = (kind: DecorKind, pal = TOWN_PALS[0]): string[] => Array.from({ length: DECOR_FRAMES[kind] }, (_, f) => {
    const cells: string[] = [];
    paintDecor(kind, pal, (x, y, col, w = 1, h = 1) => cells.push(`${x},${y},${w},${h},${col}`), false, f);
    return cells.join(';');
  });
  const moving = (Object.keys(DECOR_FRAMES) as DecorKind[]).filter((k) => DECOR_FRAMES[k] > 1);
  check('lamps, flowers, signs and awnings move', ['lamp', 'flowers', 'sign', 'awning'].every((k) => moving.includes(k as DecorKind)));
  check('...and every frame of each is its own', moving.every((k) => new Set(frames(k)).size > 1), moving.filter((k) => new Set(frames(k)).size <= 1).join(', '));
  const smoke = Array.from({ length: SMOKE.frames }, (_, f) => { const c: string[] = []; paintSmoke((x, y) => c.push(`${x},${y}`), f); return c.join(';'); });
  check('chimney smoke rises frame by frame', new Set(smoke).size === SMOKE.frames);
}

{
  // The loop contract (loop.ts): a key tap is consumed by the first physics
  // step that sees it, so a frame that runs several catch-up steps doesn't
  // replay it; time is clamped, and a frozen world drops it.
  arena(20);
  dummy(150);
  player.cdMax.z = 0;
  const clock = { acc: 0 };
  setKey('z', false); setKey('z', true);
  const steps = advance(clock, P.STEP * 3 + 1e-6, false);
  setKey('z', false);
  check('a frame can run several catch-up steps', steps === 3, `${steps} steps`);
  check('...but a tap fires once, not on every one of them', player.casting.queued === null && player.cast === 'shoot',
    `queued ${player.casting.queued} cast ${player.cast}`);
  check('a stalled frame is clamped to MAX_DT', advance({ acc: 0 }, 5, false) === Math.floor(0.1 / P.STEP + 1e-9));
  const frozen = { acc: 0.05 };
  check('a frozen world runs no steps and drops the time', advance(frozen, 0.1, true) === 0 && frozen.acc === 0);
}
{
  // Glide links into Meteor Dive: a Q pressed during a Glide fires as the Glide ends
  arena(20); player.ranks['ground-q'] = true; player.ranks['air-q'] = true;
  tap('c'); step(4);
  tap('d');
  check('Glide links into Meteor Dive', player.linkFrom === 'd' && linkable('air-q'), `from ${player.linkFrom}`);
  tap('q');
  check('...and a Q pressed mid-Glide is buffered', player.casting.queued === 'ground-q', `queued ${player.casting.queued}`);
  let fired = -1;
  for (let i = 0; i < 30 && fired < 0; i++) { step(1); if (player.cast === 'dive') fired = i; }
  check('the Dive fires as the Glide ends, chaining the combo', fired >= 0 && fired < 16 && player.linkFrom === 'air-q', `fired ${fired} from ${player.linkFrom}`);
}
