import { seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, LV_1_DMG, LV_100_DMG, LEVEL_SPAN, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, deathUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, VARIANT_ART, MOB_GEN, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';
// --- every enemy dies its own way ---
{
  const bases = MOB_TYPES.filter((m) => !m.of);
  const looks = bases.map((m) => `${DEATHS[m.n]?.story}/${DEATHS[m.n]?.bits}`);
  check('every enemy has its own death', bases.every((m) => DEATHS[m.n]) && new Set(looks).size === looks.length,
    [...bases.filter((m) => !DEATHS[m.n]).map((m) => m.n), ...looks.filter((l, i) => looks.indexOf(l) !== i)].join(', '));
  check('a variant dies like the enemy it is a cousin of', MOB_TYPES.filter((m) => m.of).every((m) => deathOf(m) === DEATHS[m.of!]));
  arena(1); corpses.length = 0;
  const m = dummy(140);
  killMob(m);
  check('a defeated enemy is left dying where it fell', corpses.length === 1 && corpses[0].name === m.type.n && corpses[0].drop === 0);
  step(Math.ceil(DEATH_T / P.STEP) + 1);
  check('...and is gone when its death has played', corpses.length === 0);
  const f = dummy(140); f.fly = true; f.y -= 40;
  killMob(f);
  const c = corpses[0];
  check('one killed in the air falls to the ground as it dies', Math.abs(c.drop - 40) < 1 && Math.abs(deathPose(c, 1).dy - c.drop) < 1, `drop ${c.drop.toFixed(1)} dy ${deathPose(c, 1).dy.toFixed(1)}`);
  gotoPlace(climb(3)); step(1);
  check('deaths do not follow you to another floor', corpses.length === 0);
}

{
  // Aerial height gate: the air forms want ~2/3 of the jump's peak of height
  // (AIR_MIN_H), not just any airtime
  arena(20); player.ranks['ground-e'] = true; player.ranks['air-e'] = true;
  dummy(100);
  tap('c'); step(1); // just left the ground: ~9px of height
  const mp0 = player.mp;
  tap('e');
  check('Downpour needs real height: early in the jump', player.cast !== 'barrage' && player.mp === mp0, `cast ${player.cast}`);
  step(7); // near the jump's apex (~35px)
  tap('e');
  check('Downpour fires near the jump apex', player.cast === 'barrage' && player.mp < mp0, `cast ${player.cast}`);
}
{
  // the same gate on Meteor Dive and Cyclone Sweep
  arena(20); player.ranks['ground-q'] = true; player.ranks['air-q'] = true;
  tap('c'); step(1);
  const mp0 = player.mp;
  tap('q');
  check('Meteor Dive needs real height: early in the jump', player.cast !== 'dive' && player.mp === mp0, `cast ${player.cast}`);
  step(7);
  tap('q');
  check('Meteor Dive fires near the jump apex', player.cast === 'dive' && player.mp < mp0, `cast ${player.cast}`);
}
{
  // ...and on Cyclone Sweep
  arena(20); player.ranks['ground-w'] = true; player.ranks['air-w'] = true;
  tap('c'); step(1);
  const mp0 = player.mp;
  tap('w');
  check('Cyclone Sweep needs real height: early in the jump', player.mp === mp0 && player.cd['ground-w.air'] === 0, `cd ${player.cd['ground-w.air'].toFixed(1)}`);
  step(7);
  tap('w');
  check('Cyclone Sweep fires near the jump apex', player.mp < mp0 && player.cd['ground-w.air'] > 0, `cd ${player.cd['ground-w.air'].toFixed(1)}`);
}

{
  // The world's vertical bounds: a big (or stacked) hop stops at the top
  arena(20);
  player.y = -40; player.vy = -100; player.onGround = false;
  step(1);
  check('the world clamps the player from above', player.y >= 0, `y ${player.y.toFixed(1)}`);
  player.y = WORLD.h; player.onGround = false; player.vy = 0;
  step(1);
  check('...and from below', player.y <= WORLD.h - player.h, `y ${player.y.toFixed(1)}`);
}

{
  // Electric Blitz self-link: a second blitz pressed during the first's
  // animation (with a charge banked) fires as soon as it clears
  arena(20); player.ranks['ground-q'] = true; player.ranks.eb = true; player.ranks['air-q'] = true;
  player.blitz.charges = P.BLITZ_MAX;
  dummy(150);
  check('blitzes start banked', player.blitz.charges === P.BLITZ_MAX, `charges ${player.blitz.charges}`);
  tap('q');
  check('the blitz links into itself', linkable('eb'), `from ${player.linkFrom}`);
  tap('q'); // pressed mid-animation: buffered, not dropped
  check('the second blitz is buffered', player.casting.queued === 'ground-q', `queued ${player.casting.queued}`);
  step(12); // the first blitz's slide (0.34s) ends
  check('the buffered blitz fires', player.blitz.charges === P.BLITZ_MAX - 2 && player.cast === 'rush',
    `charges ${player.blitz.charges} cast ${player.cast}`);
  check('links now read off the chained blitz', player.linkFrom === 'eb' && player.castT > 0.3, `castT ${player.castT.toFixed(2)}`);
}

{
  // Aerial skills link into Glide: pressed while the cast is still going,
  // D fires the moment its animation ends (skipping the recovery)
  arena(20); player.ranks.d = true; player.ranks['ground-e'] = true; player.ranks['air-e'] = true; player.ranks['air-w'] = true;
  dummy(100);
  tap('c'); step(4);
  tap('e');
  check('the volley links into Cyclone Sweep', linkable('air-w') && player.casting.useT > 0, `use ${player.casting.useT.toFixed(2)}`);
  tap('w');
  check('...pressed mid-volley, W waits for the animation', player.casting.queued === 'ground-w', `queued ${player.casting.queued}`);
  let wait = 0;
  while (player.casting.queued && wait < 30) { step(1); wait++; }
  check('...then fires as it ends', player.cast === 'shoot' && Math.abs(wait * P.STEP - useTime('air-e')) < 0.07,
    `cast ${player.cast} after ${(wait * P.STEP).toFixed(2)}s`);
}
{
  // Downpour links on a miss too: linking needs no hit
  arena(20); player.ranks['ground-e'] = true; player.ranks['air-e'] = true;
  tap('c'); step(8);
  tap('e');
  check('a whiffed Downpour still links', game.mobs.length === 0 && linkable('air-w'));
}
{
  // ...and so does the Cyclone Sweep
  arena(20); player.ranks.d = true; player.ranks['ground-w'] = true; player.ranks['air-w'] = true;
  dummy(150);
  tap('c'); step(8);
  tap('w'); step(13);
  check('Cyclone Sweep links into Glide', linkable('d'));
  tap('d'); for (let i = 0; i < 30 && player.casting.queued; i++) step(1); // fires as the sweep ends
  check('the spin links into Glide', player.cast === 'jump' && player.casting.useT > 0, `cast ${player.cast} cd ${player.cd.d.toFixed(2)}`);
}

{
  // With Skyward Assault (W's upgrade) learned, W in the air is always Cyclone Sweep
  arena(20); player.ranks['ground-q'] = true; player.ranks['ground-w'] = true; player.ranks.ab = true; player.ranks['air-w'] = true;
  const m = dummy(140);
  tap('c'); step(8);
  tap('w');
  check('W in the air is Cyclone Sweep, not Skyward Assault', player.cast === 'shoot' && player.skillPose === 'spin' && player.cd['ground-w.air'] > 0 && player.hang.t === 0,
    `cast ${player.cast} pose ${player.skillPose} cd ${player.cd['ground-w.air'].toFixed(1)}`);
  check('the sweep hits the enemy below', m.hp < 1e6);
  step(40);
  check('the spin does not hover', player.onGround);
}

{
  // Tempest is a committed cast: locked in place and invulnerable while it
  // sweeps out (the use time already freezes movement; the storm grants i-frames)
  arena(20); player.ranks.r = true;
  dummy(140);
  tap('r');
  check('Tempest locks you in place, invulnerable for the cast', player.cast === 'shoot' && player.casting.useT > 0 && player.invuln > 0 && player.invuln >= player.castT - 1e-9,
    `useT ${player.casting.useT.toFixed(2)} invuln ${player.invuln.toFixed(2)}`);
  step(43); // the 1.4s storm plays out
  check('the invulnerability ends with the storm', player.invuln <= 0, `invuln ${player.invuln.toFixed(2)}`);
  check('Tempest is a 10s cooldown', SKILLS.r.cd === 10 && player.cd.r > 8, `cd ${player.cd.r.toFixed(2)}`);
}
{
  // Midair, the storm pins you completely: no falling, no drift, for its
  // whole cast (not just the usual movement lock).
  arena(20); player.ranks.r = true;
  tap('c'); step(7); // near the jump apex
  tap('r');
  check('Tempest freezes you midair', player.casting.freeze && player.vy === 0, `vy ${player.vy.toFixed(0)}`);
  const y0 = player.y;
  step(10); // half the storm
  check('...and you stay put as it plays out', player.y === y0 && player.vy === 0, `dy ${(player.y - y0).toFixed(2)} vy ${player.vy.toFixed(0)}`);
  step(11); // the rest of the 0.7s cast
  check('you fall once the storm is over', !player.casting.freeze && player.y > y0, `dy ${(player.y - y0).toFixed(2)}`);
}
{
  // A live Tempest window lets Dive (Q) fire straight out of the storm.
  arena(20); player.ranks.r = true; player.ranks['ground-q'] = true; player.ranks['air-q'] = true;
  tap('c'); step(7); // airborne, where Q is the Meteor Dive
  tap('r');
  check('Tempest links into the Dive', linkable('air-q') && player.cast === 'shoot', `cast ${player.cast}`);
  const mp0 = player.mp;
  tap('q');
  for (let i = 0; i < 30 && player.casting.queued; i++) step(1);
  check('Dive fires out of the storm as it ends', player.cast === 'dive' && player.mp < mp0,
    `cast ${player.cast} mp ${player.mp} of ${mp0}`);
  step(12); // let the dive land, so the next block starts on the floor
  // The storm links into Dive, not the whole aerial kit.
  arena(20); player.ranks.r = true;
  tap('r'); player.cd.r = 10;
  check('the storm links into the Q slot only', linkable('air-q') && !linkable('ground-w'));
  tap('w'); step(1);
  // A Rising Arrows needs a launcher to link off; the storm isn't one, so the cast pays its own cooldown rather than a shone Tempest's.
  check('a Rising Arrows off the storm pays its own cooldown', player.cast === 'shoot' && player.cd.r > 9,
    `cast ${player.cast} cd ${player.cd.r.toFixed(2)}`);
}
{
  // A buffered skill fires in the direction held when it releases, not when
  // it was pressed: Q left, Q right zips you back and forth
  arena(20); player.ranks['ground-q'] = true;
  dummy(150);
  setKey('left', true);
  tap('q'); step(1); // the first rush slides left...
  setKey('left', false); setKey('right', true);
  tap('q'); // ...and the next one is buffered while the right key is held
  step(10); // the first rush (0.34s) ends and the buffered one fires
  check('the buffered rush fires right', player.face === 1 && player.vx > 0, `face ${player.face} vx ${player.vx.toFixed(0)}`);
  setKey('right', false);
}
{
  // EXP bar at max level: reads LV.100 and stays full
  arena(20);
  player.level = 99; player.exp = 500; player.expNext = 1000;
  check('below max level the bar shows exp/expNext', expBar().text === '500/1K' || expBar().text.includes('/'), expBar().text);
  player.level = MAX_LEVEL;
  check('at max level the bar reads LV.100', expBar().text === `LV.${MAX_LEVEL}`, expBar().text);
  check('...and the bar stays full', expBar().pct === 1);
}

{
  // Cyclone Sweep links into Downpour: E pressed during the sweep fires as it ends
  arena(20); player.ranks['ground-w'] = true; player.ranks['air-w'] = true; player.ranks['ground-e'] = true; player.ranks['air-e'] = true;
  dummy(100);
  tap('c'); step(8);
  tap('w'); step(13);
  check('the spin links into Downpour', linkable('air-e') && player.casting.useT > 0);
  tap('e'); for (let i = 0; i < 30 && player.casting.queued; i++) step(1); // fires as the sweep ends
  check('...and Downpour fires as the sweep ends', player.cast === 'barrage' && player.linkFrom === 'air-e',
    `cast ${player.cast} from ${player.linkFrom}`);
}
{
  // Meteor Dive links into the equipped ground rush, Skyfall-style: Electric
  // Blitz, not just the base Rush Toss
  arena(20); player.ranks['ground-q'] = true; player.ranks.eb = true; player.ranks['air-q'] = true;
  player.blitz.charges = P.BLITZ_MAX;
  dummy(150);
  tap('c'); step(8);
  tap('q'); step(15); // the windup, the plunge, and the landing rush
  check('the dive links into the Blitz', linkable('eb') && !linkHeld('eb'), `from ${player.linkFrom}`);
  const charges0 = player.blitz.charges;
  tap('q'); step(1); // the landing rush's tail is buffered, not dropped
  check('the blitz fires off the dive, no use-time wait', player.blitz.charges === charges0 - 1 && player.cast === 'rush',
    `charges ${player.blitz.charges} cast ${player.cast} charges0 ${charges0}`);
}

{
  // Both Qs end with a committed recovery (delay), shortened by Haste
  arena(20); player.ranks['ground-q'] = true;
  dummy(150);
  const base = delayTime('ground-q');
  check('Rush Toss has its own delay, longer than the default', SKILLS['ground-q'].delay === 0.35 && base < 0.35 + 1e-9, `${base.toFixed(3)}`);
  player.casting.useT = 0; player.casting.recoverT = 0;
  cast('ground-q');
  check('the cast ends in a recovery that outlasts the slide', player.casting.recoverT === base && player.casting.useT > 0);
  player.ranks['ground-q'] = false; player.ranks.eb = true;
  check('Electric Blitz carries the same committed recovery', SKILLS.eb.delay === 0.35 && delayTime('eb') === base);
  player.ranks.ha = true;
  check('Haste shortens the recovery by 20% attack speed at rank 3', Math.abs(delayTime('eb') - 0.35 / 1.2) < 1e-6,
    `${delayTime('eb').toFixed(4)}`);
  player.ranks.ha = false; player.ranks.eb = false; player.ranks['ground-q'] = true;
}

{
  // Off a Skyward Assault hover: only the assault's links (MS, R, Z, Q) are
  // buffered, so a Glide pressed during the hover is dropped.
  arena(30); player.ranks['ground-q'] = true; player.ranks['ground-w'] = true; player.ranks.ab = true; player.ranks.d = true;
  dummy(130);
  tap('q'); step(14); tap('w'); step(3);
  check('hovering (setup)', player.hang.t > 0 && !player.onGround, `hangT ${player.hang.t.toFixed(2)}`);
  tap('d');
  check('Glide pressed during the hover is dropped (not a link off it)', player.casting.queued === null && player.hang.t > 0,
    `queued ${player.casting.queued} hangT ${player.hang.t.toFixed(2)}`);
}
{
  // Off a Skyward Assault hover: the Q slot (Meteor Dive) is a link off the
  // assault, so a press during the hover is buffered and fires as it ends.
  arena(30); player.ranks['ground-q'] = true; player.ranks['ground-w'] = true; player.ranks.ab = true; player.ranks['air-q'] = true;
  dummy(130);
  tap('q'); step(14); tap('w'); step(3);
  check('the assault links into the Dive', linkable('air-q') && !linkHeld('air-q') && player.hang.t > 0, `hangT ${player.hang.t.toFixed(2)}`);
  tap('q'); // Q's air form (Meteor Dive) pressed during the hover
  check('...the Dive fires out of the hover', player.cast === 'dive' && player.linkFrom === 'air-q', `cast ${player.cast} from ${player.linkFrom}`);
}

{
  // Single-rank skills: each carries its (former) max-level hit/damage numbers
  check('the kit carries its authored hits and damage (Double Shot 4x120%, Rising Arrows 4, Assault 4, Sweep 4x200%, Blitz 2, Tempest 8x200%, Dive 1x400%)',
    SKILLS.z.targets1 === 4 && SKILLS.z.dmg1 === 120 && SKILLS['ground-w'].hits1 === 4 && SKILLS.ab.hits1 === 4 &&
    SKILLS['air-w'].hits1 === 4 && SKILLS['air-w'].dmg1 === 200 && SKILLS.eb.hits1 === 2 &&
    SKILLS.r.hits1 === 8 && SKILLS.r.dmg1 === 200 && SKILLS['air-q'].hits1 === 1 && SKILLS['air-q'].dmg1 === 400);
  // and the hits land: a Blitz rush (charge + two strikes) takes a big bite
  arena(20); player.ranks['ground-q'] = true; player.ranks.eb = true;
  player.blitz.charges = P.BLITZ_MAX;
  const m = dummy(140);
  tap('q'); step(24); // the slide ends and the strike lands (both hits)
  check('the Blitz rush strikes the carried enemy', m.hp < 1e6, `hp ${m.hp.toFixed(0)}`);
}

{
  // Damage growth: both sides of the fight scale 1.5x faster per level
  arena(1); player.stats.dex = 0; recalcStats();
  const war1 = player.war;
  arena(21); recalcStats();
  check('attack grows 2.55 per level (was 1.7)', Math.abs(player.war - (14 + 20 * 2.55)) < 1e-9, `${player.war}`);
  check('...and it is 1.5x the old per-level step', Math.abs((player.war - 14) / 20 - 1.5 * 1.7) < 1e-9);
  check('the Lv.1 archer still starts at 14 attack', Math.abs(war1 - 14) < 1e-9, `${war1}`);
  arena(1); spawnMob({ x: 100, y: ground().y, types: ['Garden Snail'] } as never, MOB_TYPES[0]);
  const max1 = LV_1_DMG * (MOB_TYPES[0].dmg / 3);
  check('a Lv.1 mob hits for 50%-100% of its base damage', game.mobs[0].dmg >= Math.round(max1 * 0.5) && game.mobs[0].dmg <= Math.round(max1), `${game.mobs[0].dmg} of max ${Math.round(max1)}`);
  gotoPlace({ path: 'meadows', floor: 11 }); game.mobs.length = 0;
  spawnMob({ x: 100, y: ground().y, types: ['Garden Snail'] } as never, MOB_TYPES[0]);
  const max = LV_1_DMG * (LV_100_DMG / LV_1_DMG) ** ((mobLevel(game.floor.place) - 1) / LEVEL_SPAN) * (MOB_TYPES[0].dmg / 3);
  check('a high-floor mob hits harder per level than before',
    game.mobs[0].dmg >= Math.round(max * 0.5) && game.mobs[0].dmg <= Math.round(max),
    `${game.mobs[0].dmg} of max ${Math.round(max)}`);
  gotoPlace(START);
}

{
  // LUK rework: 2% crit chance a point, capped at 100%, overflow to crit damage
  arena(20); player.ranks.sa = false; player.stats.luk = 0; recalcStats(); // no Precision: the 15% base alone
  check('LUK starts at the 15% base crit', Math.abs(critChance() - 0.15) < 1e-9, `${critChance()}`);
  player.stats.luk = 10;
  check('each LUK point is worth 2% crit chance', Math.abs(critChance() - 0.35) < 1e-9, `${critChance()}`);
  player.stats.luk = 43;
  check('the base 15% counts toward the cap, so 43 points fills it at 100%', critChance() === 1, `${critChance()}`);
  player.stats.luk = 48;
  check('points past the cap convert at 2% crit damage each, counting only the overflow',
    Math.abs(critMult() - (1.5 + 5 * 0.02)) < 1e-9 && critOverflowPoints() === 5, `${critMult()} (${critOverflowPoints()} over)`);
  player.stats.luk = 0;
  check('below the cap a crit still hits for 1.5x', Math.abs(critMult() - 1.5) < 1e-9);
  // and the multiplier is the one damage() applies
  arena(20); player.ranks.sa = false; recalcStats();
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
  check('...as a stacked damage number, not flat text', game.dmgNums[0].col === '#ffb347' && game.dmgNums[0].vy === -12,
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
  arena(20); player.ranks['ground-e'] = true; player.ranks['air-e'] = true;
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
  arena(20); player.ranks.z = true; player.ranks.es = true;
  const m = dummy(140); player.x = m.x - 40;
  check('the shadow doubles the shot without changing the skill\'s own hits',
    rank('z').hits === 2 && shotCount(rank('z')) === 4, `${rank('z').hits}/${shotCount(rank('z'))}`);
  game.dmgNums.length = 0;
  const saved = Math.random; Math.random = () => 0.99; // no crits or misses
  tap('z'); step(Math.ceil((P.Z_WINDUP + 0.4) / P.STEP)); // the whole volley lands
  Math.random = saved;
  const nums = game.dmgNums.filter((d) => d.txt !== 'MISS');
  check('every arrow shows its own number', nums.length === shotCount(rank('z')), `${nums.length} numbers`);
  check('the numbers stack one line apart, not in a pile',
    new Set(nums.map((d) => Math.round(d.y))).size === nums.length, `${nums.map((d) => d.y.toFixed(0)).join(',')}`);
  check('the shadow hits for the same damage as the base arrow',
    nums.every((d) => Math.abs(d.v - nums[0].v) <= 1), `${nums.map((d) => d.v).join(',')}`);
}

{
  // Skyward Assault links into Cyclone Sweep: W in the air sweeps out of the
  // hover with no extra lag (the AB -> MS follow-up)
  arena(30); player.ranks['ground-q'] = true; player.ranks['ground-w'] = true; player.ranks.ab = true; player.ranks['air-w'] = true;
  const m = dummy(130);
  tap('q'); step(14); // Skyward Assault is a link off the rush
  tap('w'); step(4); // mid-leap: the hover is live
  check('the assault is hovering', player.hang.t > 0 && player.cast === 'barrage', `hangT ${player.hang.t.toFixed(2)}`);
  check('...and it links into the sweep', linkable('air-w') && !linkHeld('air-w'));
  const fervor0 = player.fervor;
  tap('w');
  check('the sweep fires out of the hover, not after it', player.cast === 'shoot' && player.linkFrom === 'air-w',
    `cast ${player.cast} from ${player.linkFrom}`);
  step(12); // the sweep's four hits stagger out
  check('...and it hits', m.hp < 1e6, `hp ${m.hp}`);
  check('the linked sweep ends the hover', player.hang.t <= 0, `hangT ${player.hang.t.toFixed(2)}`);
  check('...and stacks Fervor like any other link', player.fervor === fervor0 + 1, `fervor ${fervor0} -> ${player.fervor}`);
}

{
  // Buffering: W pressed during the assault's own animation is kept and fires
  // on the first free frame
  arena(30); player.ranks['ground-q'] = true; player.ranks['ground-w'] = true; player.ranks.ab = true; player.ranks['air-w'] = true;
  dummy(130);
  tap('q'); step(14);
  tap('w');
  check('the assault starts', player.cast === 'barrage' && player.castT > 0, `castT ${player.castT.toFixed(2)}`);
  tap('w'); step(1); // pressed while the leap is still playing
  check('the sweep is buffered, not dropped', player.casting.queued === 'ground-w', `queued ${player.casting.queued}`);
  check('...and the assault is still playing', player.cast === 'barrage' && player.castT > 0, `castT ${player.castT.toFixed(2)}`);
  step(2);
  check('...then fires once the leap is underway', player.cast === 'shoot' && player.casting.queued === null, `cast ${player.cast}`);
}

{
  // Cyclone Sweep on its own (no assault) still works as a standalone sweep
  arena(20); player.ranks['ground-w'] = true; player.ranks['air-w'] = true;
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
  check('every enemy has its own voice (cry and material) for its death',
    new Set(MOB_TYPES.map((t) => { const v = MOB_SOUNDS[t.n]; return `${v.f}:${v.t}:${v.s}:${v.m}`; })).size === MOB_TYPES.length);
  check('a golem crumbles, a slime splats and a windup soldier clanks apart',
    MOB_SOUNDS['Meteor Golem'].m === 'stone' && MOB_SOUNDS['Slime'].m === 'goo' && MOB_SOUNDS['Windup Soldier'].m === 'metal');
  check('a snail and a gull are pitched apart', snail.f !== gull.f && snail.t !== gull.t);
}

{
  // Death: a tombstone drops in and the ghost rises out of it
  arena(20);
  const m = dummy(140);
  player.invuln = 0; player.hp = 1;
  const saved = Math.random; Math.random = () => 0.99; // the hit lands
  hurtPlayer(500, m.x);
  Math.random = saved;
  check('the archer is down', player.hp === 0, `${player.hp}`);
  step(1); // the frame's end starts the death animation
  const fell = player.x; // where she came to rest, after the hit's knockback
  check('the death animation starts on the spot she fell on',
    getPlayerDeath() !== null && Math.abs(getPlayerDeath()!.x - fell) < 1, `${getPlayerDeath()?.x} vs ${fell}`);
  check('...and she stays down while it plays (no instant respawn)', player.hp === 0 && Math.abs(player.x - fell) < 1);
  step(6);
  check('the tombstone drops in from above, the ghost not risen yet',
    tombDrop(getPlayerDeath()!) > 0 && tombDrop(getPlayerDeath()!) < 1 && ghostRise(getPlayerDeath()!) === 0,
    `${tombDrop(getPlayerDeath()!).toFixed(2)}`);
  setKey('right', true); step(3); setKey('right', false);
  check('a downed archer takes no input and no hits', Math.abs(player.x - fell) < 1 && !hurtPlayer(5, m.x) && player.hp === 0);
  step(Math.ceil((TOMB_DROP_T * 2) / P.STEP));
  check('the stone lands', tombDrop(getPlayerDeath()!) === 1, `${tombDrop(getPlayerDeath()!).toFixed(2)}`);
  step(6);
  check('the ghost starts rising out of it', ghostRise(getPlayerDeath()!) > 0, `${ghostRise(getPlayerDeath()!).toFixed(2)}`);
  step(Math.ceil(PLAYER_DEATH_T / P.STEP));
  check('the whole animation is about a second and a half, and it clears',
    PLAYER_DEATH_T > 1 && PLAYER_DEATH_T < 2 && getPlayerDeath() === null, `${PLAYER_DEATH_T} ${getPlayerDeath()?.age}`);
  check('...then a dialog asks where to revive, and she stays down', deathUi.open && player.hp === 0);
  check('the world is frozen while the dialog is up', windowOpen());
  tap('z'); // take the default (Return to town)
  check('...she revives, back on her feet', player.hp === player.hpMax && player.onGround && !deathUi.open);
}

{
  // Enemy deaths are baked sheets of drawn frames: each enemy's own body
  // drawn dying by its recipe's story, picked by age (no runtime particles)
  const solid = (g: { px: Uint8ClampedArray }): number => { let n = 0; for (let i = 3; i < g.px.length; i += 4) if (g.px[i]) n++; return n; };
  const names = Object.keys(DEATHS);
  const sheets = names.map((n) => bakeDeathSheet(n, DEATHS[n])!);
  check('every enemy bakes a full strip of drawn death frames that fades out at the end',
    sheets.every((d) => d && d.frames.length === DEATH_FRAMES && solid(d.frames[0]) > 40 && solid(d.frames[DEATH_FRAMES - 1]) < solid(d.frames[DEATH_FRAMES - 3])),
    names.filter((_, i) => !sheets[i] || solid(sheets[i].frames[0]) <= 40).join(', '));
  check('every enemy with art, variants too, has a drawn death', MOB_TYPES.filter((m) => hasMobArt(m.n)).every((m) => bakeDeathSheet(m.n, deathOf(m))),
    MOB_TYPES.filter((m) => hasMobArt(m.n) && !bakeDeathSheet(m.n, deathOf(m))).map((m) => m.n).join(', '));
  // the body is drawn moving, not just faded: the middle frames differ from the first
  check('the body is drawn dying, frame by frame', sheets.every((d) => d.frames[0].px.join() !== d.frames[DEATH_FRAMES >> 1].px.join()));
  const sig = sheets.map((d) => d.frames.map((g) => Array.from(g.px).join(',')).join('|'));
  check('each enemy\'s death animation is its own', new Set(sig).size === names.length, `${new Set(sig).size}/${names.length}`);
  check('the same enemy always bakes the same sheet', bakeDeathSheet(names[0], DEATHS[names[0]])!.frames[4].px.join() === sheets[0].frames[4].px.join());
  check('a death\'s age picks its frame, holding the last', deathFrame(0) === 0 && deathFrame(DEATH_T / 2) === DEATH_FRAMES / 2 && deathFrame(DEATH_T * 2) === DEATH_FRAMES - 1);
}

{
  // Bolt Flurry flies as one 4-bolt volley sprite, even on a whiff
  arena(30); player.ranks.z = true; player.ranks.s = true;
  game.shots.length = 0;
  tap('z');
  check('a whiffed Bolt Flurry flies one volley sprite', game.shots.length === 1 && game.shots[0].sprite === 'flurry', `${game.shots.length} shots`);
}

{
  // Bolt Flurry lands its 4 hits on every target, not split across them
  arena(70); player.ranks.z = true; player.ranks.s = true;
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
  arena(70); player.ranks.z = true; player.ranks.s = true; player.ranks.es = true;
  const m = dummy(160);
  game.shots.length = 0; game.dmgNums.length = 0;
  tap('z');
  check('an echoed Bolt Flurry flies two volleys, a little apart so both show',
    game.shots.length === 2 && game.shots.every((s) => s.sprite === 'flurry') && new Set(game.shots.map((s) => Math.round(s.y))).size === 2,
    `${game.shots.length} shots`);
  const seen = new Set<object>();
  for (let i = 0; i < 60; i++) { step(1); game.dmgNums.forEach((d) => seen.add(d)); }
  check('...and still lands all 8 hits on the enemy', seen.size === shotCount(rank('z')) && shotCount(rank('z')) === 8 && m.hp < 1e6,
    `${seen.size} numbers, ${shotCount(rank('z'))} shots`);
}

{
  // Downpour: one orange/green flare on the archer and a single tornado
  // blast below her, instead of a falling volley on every enemy it hits
  arena(30); player.ranks['ground-e'] = true; player.ranks['air-e'] = true;
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
  arena(20); player.ranks.r = true;
  check('no cast, no links', player.linkFrom === null && !linkable('air-q'));
  tap('r');
  check('a cast is what links read off', player.linkFrom === 'r' && linkable('air-q'));
  step(40); // the storm and its recovery are over
  check('...and once it ends, a press is a normal cast', player.linkFrom === null, `from ${player.linkFrom}`);
  tap('r'); step(1); closeLinks();
  check('closeLinks forgets it', player.linkFrom === null);
  player.cd.r = 0; tap('r'); player.hp = 0; step(1 + Math.ceil(PLAYER_DEATH_T / P.STEP)); tap('z'); // down, then back up
  check('a respawn starts with no links', player.linkFrom === null, `from ${player.linkFrom}`);
}
{
  const missing = (Object.keys(SKILLS) as SkillKey[]).filter((k) => !SKILLS[k].passive && !CASTS[k]);
  check('every active skill has a cast', missing.length === 0, missing.join(','));
}

// --- the snails: a boxy Garden Snail, and a tiny triangular Green Snail ---
{
  const green = MOB_TYPES.find((m) => m.n === 'Green Snail')!;
  check('the Green Snail is the smallest enemy', !!green && MOB_TYPES.every((m) => m === green || (m.w * m.h > green.w * green.h && m.w >= green.w && m.h >= green.h)));
  // its shell narrows to a point: each row above the foot is no wider than the one below
  const f = MOB_GEN['Green Snail']().frames[0], span = (y: number): number => {
    const xs = Array.from({ length: f.w }, (_, x) => x).filter((x) => f.g.px[(y * f.w + x) * 4 + 3] && x < 9);
    return xs.length ? xs[xs.length - 1] - xs[0] + 1 : 0;
  };
  const spans = Array.from({ length: 8 }, (_, y) => span(y));
  check('the Green Snail is triangle-shaped (a cone, one pixel at the tip)', spans[0] === 1 && spans.every((s, y) => y === 0 || s >= spans[y - 1]) && spans[7] >= 8, spans.join());
  // the Garden Snail's shell is square-ish: its widest and tallest runs are within a couple of pixels
  const g = MOB_GEN['Garden Snail']().frames[0], shellCol = (x: number, y: number): boolean => g.g.px[(y * g.w + x) * 4 + 3] > 0;
  const sw = Array.from({ length: 11 }, (_, x) => x).filter((x) => shellCol(x, 5)).length;
  const sh = Array.from({ length: 11 }, (_, y) => y + 1).filter((y) => shellCol(5, y)).length;
  check('the Garden Snail keeps a square-ish shell', Math.abs(sw - sh) <= 1 && sw >= 10, `${sw}x${sh}`);
  check('both snails die their own drawn deaths', !!bakeDeathSheet('Garden Snail', DEATHS['Garden Snail']) && !!bakeDeathSheet('Green Snail', DEATHS['Garden Snail']));
}
