import { seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, PAUSE_ROWS, pauseScroll, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, RECOLOR, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';

{
  // Damage growth: both sides of the fight scale 1.5x faster per level
  arena(1); player.stats.dex = 0; recalcStats();
  const war1 = player.war;
  arena(21); recalcStats();
  check('attack grows 2.55 per level (was 1.7)', Math.abs(player.war - (14 + 20 * 2.55)) < 1e-9, `${player.war}`);
  check('...and it is 1.5x the old per-level step', Math.abs((player.war - 14) / 20 - 1.5 * 1.7) < 1e-9);
  check('the Lv.1 archer still starts at 14 attack', Math.abs(war1 - 14) < 1e-9, `${war1}`);
  arena(1); spawnMob({ x: 100, y: ground().y, types: ['Garden Snail'] } as never, MOB_TYPES[0]);
  check('a Lv.1 mob hits for its base damage', game.mobs[0].dmg === MOB_TYPES[0].dmg, `${game.mobs[0].dmg}`);
  game.mobs.length = 0; gotoPlace({ path: 'meadows', floor: 11 });
  spawnMob({ x: 100, y: ground().y, types: ['Garden Snail'] } as never, MOB_TYPES[0]);
  check('a high-floor mob hits 1.5x harder per level than before',
    game.mobs[0].dmg === Math.round(MOB_TYPES[0].dmg * (1 + (mobLevel(game.floor.place) - 1) * 0.09)),
    `${game.mobs[0].dmg}`);
  gotoPlace(START);
}

{
  // LUK rework: 2% crit chance a point, capped at 100%, overflow to crit damage
  arena(20); player.ranks.SA = 0; player.stats.luk = 0; recalcStats(); // no Precision: the 15% base alone
  check('LUK starts at the 15% base crit', Math.abs(critChance() - 0.15) < 1e-9, `${critChance()}`);
  player.stats.luk = 10;
  check('each LUK point is worth 2% crit chance', Math.abs(critChance() - 0.35) < 1e-9, `${critChance()}`);
  player.stats.luk = 42;
  check('the base 15% counts toward the cap, so 43 points fills it', Math.abs(critChance() - 0.99) < 1e-9, `${critChance()}`);
  player.stats.luk = 43;
  check('...and 43 points caps it at 100%', critChance() === 1, `${critChance()}`);
  player.stats.luk = 48;
  check('points past the cap convert at 2% crit damage each', Math.abs(critMult() - (1.5 + 5 * 0.02)) < 1e-9, `${critMult()}`);
  check('...counting only the overflow, not the whole stat', critOverflowPoints() === 5, `${critOverflowPoints()}`);
  player.stats.luk = 0;
  check('below the cap a crit still hits for 1.5x', Math.abs(critMult() - 1.5) < 1e-9);
  // and the multiplier is the one damage() applies
  arena(20); player.ranks.SA = 0; recalcStats();
  const m = dummy(140); m.level = 20;
  // the same roll on both shots (it also drives the damage's random spread):
  // at 0 LUK it is under the 15% crit threshold, at 60 LUK it always crits
  const saved = Math.random; Math.random = () => 0.2; // one shared random spread
  player.stats.luk = 0; damage(m, 1); const plain = 1e6 - m.hp;
  player.stats.luk = 60; m.hp = 1e6; damage(m, 1); const critted = 1e6 - m.hp;
  Math.random = saved; player.stats.luk = 0; recalcStats();
  // 60 LUK is 17 points past the 43-point cap: 1.5 + 17 x 2% = 1.84
  const ratio = critted / plain;
  check('a crit lands the converted multiplier (1.5 + 17 x 2%)', Math.abs(ratio / 1.84 - 1) < 0.01, `x${ratio.toFixed(3)}`);
  player.stats.luk = 0; recalcStats();
}

{
  // A miss grants i-frames without the flashing-sprite visual
  arena(20); player.invuln = 0; player.invulnQuiet = false; game.dmgNums.length = 0;
  const m = dummy(140); m.level = 35; // 15 levels above: guaranteed miss
  const saved = Math.random; Math.random = () => 0.5;
  damage(m, 1);
  check('the missed attack shows a floating MISS', game.dmgNums.length === 1 && game.dmgNums[0].txt === 'MISS',
    `${game.dmgNums.length} ${game.dmgNums[0]?.txt}`);
  check('...as a stacked damage number, not flat text', game.dmgNums[0].col === '#ffffff' && game.dmgNums[0].vy === -12,
    `${game.dmgNums[0].col} ${game.dmgNums[0].vy}`);
  check('...and it procs the invulnerability delay', player.invuln > 0 && player.invuln <= MISS_IFRAMES, `${player.invuln.toFixed(2)}`);
  check('...which is the quiet kind (no flash)', player.invulnQuiet);
  step(1);
  check('the i-frames tick down like a normal hit\'s', player.invuln < MISS_IFRAMES, `${player.invuln.toFixed(3)}`);
  Math.random = saved;
}

{
  // Downpour's vertical reach is half what it was
  check('the volley column reaches 88px below the feet (was 176)', P.PLUNGE_DEPTH === 88);
  arena(20); player.ranks.E = 1; player.ranks.PV = 1;
  player.y = ground().y - player.h - 120; player.onGround = false; // airborne
  const feet = player.y + player.h;
  const near = dummy(140); near.y = feet + 10; // right below
  const far = dummy(140); far.y = ground().y - far.h; // on the ground, ~100px down
  player.x = 140;
  tap('e'); step(2);
  check('the volley hits an enemy directly below', near.hp < 1e6, `hp ${near.hp}`);
  check('...and one about 100px down no longer does', far.hp === 1e6, `hp ${far.hp}`);
}

{
  // Twin Echoes's arrows always proc and stack above the base hit's number
  arena(20); player.ranks.Z = 1; player.ranks.ES = 1;
  const m = dummy(140); player.x = m.x - 40;
  check('the shadow doubles the shot without changing the skill\'s own hits',
    rank('Z').hits === 2 && shotCount(rank('Z')) === 4, `${rank('Z').hits}/${shotCount(rank('Z'))}`);
  game.dmgNums.length = 0;
  const saved = Math.random; Math.random = () => 0.99; // no crits or misses
  tap('z'); step(Math.ceil((P.Z_WINDUP + 0.4) / P.STEP)); // the whole volley lands
  Math.random = saved;
  const nums = game.dmgNums.filter((d) => d.txt !== 'MISS');
  check('every arrow shows its own number', nums.length === shotCount(rank('Z')), `${nums.length} numbers`);
  check('the numbers stack one line apart, not in a pile',
    new Set(nums.map((d) => Math.round(d.y))).size === nums.length, `${nums.map((d) => d.y.toFixed(0)).join(',')}`);
  check('the shadow hits for the same damage as the base arrow',
    nums.every((d) => Math.abs(d.v - nums[0].v) <= 1), `${nums.map((d) => d.v).join(',')}`);
}

{
  // Skyward Assault links into Cyclone Sweep: W in the air sweeps out of the
  // hover with no extra lag (the AB -> MS follow-up)
  arena(30); player.ranks.Q = 1; player.ranks.W = 1; player.ranks.AB = 1; player.ranks.MS = 1;
  const m = dummy(130);
  tap('q'); step(14); // Skyward Assault is a link off the rush
  tap('w'); step(4); // mid-leap: the hover is live
  check('the assault is hovering', player.hang.t > 0 && player.cast === 'barrage', `hangT ${player.hang.t.toFixed(2)}`);
  check('...and it links into the sweep', linkable('MS') && !linkHeld('MS'));
  const fervor0 = player.fervor;
  tap('w');
  check('the sweep fires out of the hover, not after it', player.cast === 'shoot' && player.linkFrom === 'MS',
    `cast ${player.cast} from ${player.linkFrom}`);
  step(12); // the sweep's four hits stagger out
  check('...and it hits', m.hp < 1e6, `hp ${m.hp}`);
  check('the linked sweep ends the hover', player.hang.t <= 0, `hangT ${player.hang.t.toFixed(2)}`);
  check('...and stacks Fervor like any other link', player.fervor === fervor0 + 1, `fervor ${fervor0} -> ${player.fervor}`);
}

{
  // Buffering: W pressed during the assault's own animation is kept and fires
  // on the first free frame
  arena(30); player.ranks.Q = 1; player.ranks.W = 1; player.ranks.AB = 1; player.ranks.MS = 1;
  dummy(130);
  tap('q'); step(14);
  tap('w');
  check('the assault starts', player.cast === 'barrage' && player.castT > 0, `castT ${player.castT.toFixed(2)}`);
  tap('w'); step(1); // pressed while the leap is still playing
  check('the sweep is buffered, not dropped', player.casting.queued === 'W', `queued ${player.casting.queued}`);
  check('...and the assault is still playing', player.cast === 'barrage' && player.castT > 0, `castT ${player.castT.toFixed(2)}`);
  step(2);
  check('...then fires once the leap is underway', player.cast === 'shoot' && player.casting.queued === null, `cast ${player.cast}`);
}

{
  // Cyclone Sweep on its own (no assault) still works as a standalone sweep
  arena(20); player.ranks.W = 1; player.ranks.MS = 1;
  tap('c'); step(10);
  check("a plain jump's sweep is unaffected", player.cast === null && player.linkFrom === null, `cast ${player.cast} from ${player.linkFrom}`);
  tap('w'); step(2);
  check('...and fires as usual', player.cast === 'shoot', `cast ${player.cast}`);
}

{
  // Each enemy type has its own hit sound
  arena(20);
  check('a Garden Snail has its own impact voice', MOB_SOUNDS['Garden Snail'] !== undefined);
  check('...as does every base mob type (a variant borrows its parent\'s voice)',
    MOB_TYPES.every((t) => MOB_SOUNDS[t.of ?? t.n] !== undefined),
    MOB_TYPES.filter((t) => !MOB_SOUNDS[t.of ?? t.n]).map((t) => t.n).join(', '));
  const snail = MOB_SOUNDS['Garden Snail'], gull = MOB_SOUNDS['Gull'];
  check('...and no two sound the same', new Set(MOB_TYPES.map((t) => `${MOB_SOUNDS[t.n].f}:${MOB_SOUNDS[t.n].t}`)).size >= 20,
    `${new Set(MOB_TYPES.map((t) => `${MOB_SOUNDS[t.n].f}:${MOB_SOUNDS[t.n].t}`)).size} distinct`);
  check('a snail and a gull are pitched apart', snail.f !== gull.f && snail.t !== gull.t);
}

{
  // Death: a tombstone drops in and the ghost rises out of it
  arena(20);
  const m = dummy(140);
  const fell = player.x;
  player.invuln = 0; player.hp = 1;
  const saved = Math.random; Math.random = () => 0.99; // the hit lands
  hurtPlayer(500, m.x);
  Math.random = saved;
  check('the archer is down', player.hp === 0, `${player.hp}`);
  step(1); // the frame's end starts the death animation, then the respawn
  check('the death animation starts on the spot she fell on', getPlayerDeath() !== null, `${getPlayerDeath()?.x}`);
  check('...at her position, not the respawn point', Math.abs(getPlayerDeath()!.x - fell) < 1,
    `${getPlayerDeath()?.x} vs ${fell}`);
  check('...and the archer is back on her feet', player.hp === player.hpMax && player.onGround);
  step(6); // the animation runs on its own clock while she plays on
  check('the tombstone drops in from above', tombDrop(getPlayerDeath()!) > 0 && tombDrop(getPlayerDeath()!) < 1,
    `${tombDrop(getPlayerDeath()!).toFixed(2)}`);
  check('...and the ghost has not risen yet', ghostRise(getPlayerDeath()!) === 0);
  step(Math.ceil((TOMB_DROP_T * 2) / P.STEP));
  check('the stone lands', tombDrop(getPlayerDeath()!) === 1, `${tombDrop(getPlayerDeath()!).toFixed(2)}`);
  step(6);
  check('the ghost starts rising out of it', ghostRise(getPlayerDeath()!) > 0, `${ghostRise(getPlayerDeath()!).toFixed(2)}`);
  check('the whole animation is about a second and a half', PLAYER_DEATH_T > 1 && PLAYER_DEATH_T < 2, `${PLAYER_DEATH_T}`);
  step(Math.ceil(PLAYER_DEATH_T / P.STEP));
  check('...and it clears', getPlayerDeath() === null, `${getPlayerDeath()?.age}`);
}

{
  // Enemy deaths are baked sprite sheets: frames built from each enemy's own
  // sprite and recipe, picked by age (no runtime particles)
  const W = 12, H = 10, px = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) { px[i * 4] = 200; px[i * 4 + 1] = 120; px[i * 4 + 2] = 60; px[i * 4 + 3] = 255; }
  const src = { w: W, h: H, px };
  const solid = (g: { px: Uint8ClampedArray }): number => { let n = 0; for (let i = 3; i < g.px.length; i += 4) if (g.px[i]) n++; return n; };
  const names = Object.keys(DEATHS);
  const sheets = names.map((n) => bakeDeathSheet(n, DEATHS[n], src));
  check('every enemy bakes a full strip of death frames', sheets.every((d) => d.frames.length === DEATH_FRAMES));
  check('...that starts with its body on screen', sheets.every((d) => solid(d.frames[0]) > W * H * 0.3),
    names.filter((_, i) => solid(sheets[i].frames[0]) <= W * H * 0.3).join(', '));
  check('...and has mostly faded by the last frame', sheets.every((d) => solid(d.frames[DEATH_FRAMES - 1]) < solid(d.frames[0])));
  const sig = sheets.map((d) => d.frames.map((g) => Array.from(g.px).join(',')).join('|'));
  check('each enemy\'s death animation is its own', new Set(sig).size === names.length, `${new Set(sig).size}/${names.length}`);
  check('the same enemy always bakes the same sheet', bakeDeathSheet(names[0], DEATHS[names[0]], src).frames[4].px.join() === sheets[0].frames[4].px.join());
  check('a death\'s age picks its frame, holding the last', deathFrame(0) === 0 && deathFrame(DEATH_T / 2) === DEATH_FRAMES / 2 && deathFrame(DEATH_T * 2) === DEATH_FRAMES - 1);
}

{
  // Bolt Flurry flies as one 4-bolt volley sprite, even on a whiff
  arena(30); player.ranks.Z = 3; player.ranks.S = 1;
  game.shots.length = 0;
  tap('z');
  check('a whiffed Bolt Flurry flies one volley sprite', game.shots.length === 1 && game.shots[0].sprite === 'flurry', `${game.shots.length} shots`);
}

{
  // Bolt Flurry lands its 4 hits on every target, not split across them
  arena(70); player.ranks.Z = 3; player.ranks.S = 1;
  const a = dummy(150), b = dummy(170);
  game.dmgNums.length = 0;
  const seen = new Set<{ x: number }>();
  tap('z');
  for (let i = 0; i < 60; i++) { step(1); game.dmgNums.forEach((d) => seen.add(d)); }
  const hits = (m: { x: number }): number => [...seen].filter((d) => Math.abs(d.x - m.x) < 6).length;
  check('Bolt Flurry hits each of two enemies 4 times', hits(a) === 4 && hits(b) === 4, `a ${hits(a)} b ${hits(b)}`);
}

{
  // Twin Echoes doubles the volley, not the bolts: two sprites, all 8 hits land
  arena(70); player.ranks.Z = 3; player.ranks.S = 1; player.ranks.ES = 1;
  const m = dummy(160);
  game.shots.length = 0; game.dmgNums.length = 0;
  tap('z');
  check('an echoed Bolt Flurry flies two volleys', game.shots.length === 2 && game.shots.every((s) => s.sprite === 'flurry'), `${game.shots.length} shots`);
  check('...a little apart, so both show', new Set(game.shots.map((s) => Math.round(s.y))).size === 2);
  const seen = new Set<object>();
  for (let i = 0; i < 60; i++) { step(1); game.dmgNums.forEach((d) => seen.add(d)); }
  check('...and still lands 8 hits', seen.size === shotCount(rank('Z')) && shotCount(rank('Z')) === 8,
    `${seen.size} numbers, ${shotCount(rank('Z'))} shots`);
  check('...on the enemy', m.hp < 1e6);
}

{
  // Downpour: one orange/green flare on the archer and a single tornado
  // blast below her, instead of a falling volley on every enemy it hits
  arena(30); player.ranks.E = 1; player.ranks.PV = 1;
  player.y = ground().y - player.h - 120; player.onGround = false; player.x = 140;
  const m = dummy(140); m.y = player.y + player.h + 10;
  game.fx.length = 0;
  tap('e'); step(6);
  check('the volley flares on the archer and blasts a tornado below', game.fx.some((f) => f.type === 'volleyFlare') && game.fx.some((f) => f.type === 'tornado'));
  check('...with no rain or per-enemy hit sparks', !game.fx.some((f) => f.type === 'rain' || f.type === 'rainHit' || f.type === 'hit' || f.type === 'crit'));
  check('...and the enemy below still takes the hits', m.hp < 1e6, `hp ${m.hp}`);
}

{
  // Links read off the cast you're in, and nothing else: no timers
  arena(20); player.ranks.R = 1;
  check('no cast, no links', player.linkFrom === null && !linkable('AD'));
  tap('r');
  check('a cast is what links read off', player.linkFrom === 'R' && linkable('AD'));
  step(40); // the storm and its recovery are over
  check('...and once it ends, a press is a normal cast', player.linkFrom === null, `from ${player.linkFrom}`);
  tap('r'); step(1); closeLinks();
  check('closeLinks forgets it', player.linkFrom === null);
  player.cd.R = 0; tap('r'); player.hp = 0; step(1);
  check('a respawn starts with no links', player.linkFrom === null, `from ${player.linkFrom}`);
}

// --- every active skill has a cast body
{
  const missing = (Object.keys(SKILLS) as SkillKey[]).filter((k) => !SKILLS[k].passive && !CASTS[k]);
  check('every active skill has a cast', missing.length === 0, missing.join(','));
}
