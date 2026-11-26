import { seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, PAUSE_ROWS, pauseScroll, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, RECOLOR, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';
// --- every enemy dies its own way ---
{
  const bases = MOB_TYPES.filter((m) => !m.of);
  check('every enemy has its own death', bases.every((m) => DEATHS[m.n]), bases.filter((m) => !DEATHS[m.n]).map((m) => m.n).join(', '));
  const looks = bases.map((m) => `${DEATHS[m.n]?.move}/${DEATHS[m.n]?.bits}`);
  check('no two enemies die the same way', new Set(looks).size === looks.length, looks.filter((l, i) => looks.indexOf(l) !== i).join(', '));
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
  arena(20); player.ranks.E = 1; player.ranks.PV = 1;
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
  arena(20); player.ranks.Q = 1; player.ranks.AD = 1;
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
  arena(20); player.ranks.W = 1; player.ranks.MS = 1;
  tap('c'); step(1);
  const mp0 = player.mp;
  tap('w');
  check('Cyclone Sweep needs real height: early in the jump', player.mp === mp0 && player.cd['W.air'] === 0, `cd ${player.cd['W.air'].toFixed(1)}`);
  step(7);
  tap('w');
  check('Cyclone Sweep fires near the jump apex', player.mp < mp0 && player.cd['W.air'] > 0, `cd ${player.cd['W.air'].toFixed(1)}`);
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
  arena(20); player.ranks.Q = 1; player.ranks.EB = 1; player.ranks.AD = 1;
  player.blitz.charges = P.BLITZ_MAX;
  dummy(150);
  check('blitzes start banked', player.blitz.charges === P.BLITZ_MAX, `charges ${player.blitz.charges}`);
  tap('q');
  check('the blitz links into itself', linkable('EB'), `from ${player.linkFrom}`);
  tap('q'); // pressed mid-animation: buffered, not dropped
  check('the second blitz is buffered', player.casting.queued === 'Q', `queued ${player.casting.queued}`);
  step(12); // the first blitz's slide (0.34s) ends
  check('the buffered blitz fires', player.blitz.charges === P.BLITZ_MAX - 2 && player.cast === 'rush',
    `charges ${player.blitz.charges} cast ${player.cast}`);
  check('links now read off the chained blitz', player.linkFrom === 'EB' && player.castT > 0.3, `castT ${player.castT.toFixed(2)}`);
}

{
  // Aerial skills link into Glide: pressed while the cast is still going,
  // D fires the moment its animation ends (skipping the recovery)
  arena(20); player.ranks.D = 1; player.ranks.E = 1; player.ranks.PV = 1;
  dummy(100);
  tap('c'); step(8);
  tap('e');
  check('the volley links into Glide', linkable('D') && player.casting.useT > 0, `use ${player.casting.useT.toFixed(2)}`);
  tap('d');
  check('...pressed mid-volley, D waits for the animation', player.casting.queued === 'D', `queued ${player.casting.queued}`);
  let wait = 0;
  while (player.casting.queued && wait < 30) { step(1); wait++; }
  check('...then fires as it ends', player.cast === 'jump' && Math.abs(wait * P.STEP - useTime('PV')) < 0.07,
    `cast ${player.cast} after ${(wait * P.STEP).toFixed(2)}s`);
}
{
  // Downpour links on a miss too: linking needs no hit
  arena(20); player.ranks.E = 1; player.ranks.PV = 1;
  tap('c'); step(8);
  tap('e');
  check('a whiffed Downpour still links', game.mobs.length === 0 && linkable('MS'));
}
{
  // ...and so does the Cyclone Sweep
  arena(20); player.ranks.D = 1; player.ranks.W = 1; player.ranks.MS = 1;
  dummy(150);
  tap('c'); step(8);
  tap('w'); step(13);
  check('Cyclone Sweep links into Glide', linkable('D'));
  tap('d'); for (let i = 0; i < 30 && player.casting.queued; i++) step(1); // fires as the sweep ends
  check('the spin links into Glide', player.cast === 'jump' && player.casting.useT > 0, `cast ${player.cast} cd ${player.cd.D.toFixed(2)}`);
}

{
  // With Skyward Assault (W's upgrade) learned, W in the air is always Cyclone Sweep
  arena(20); player.ranks.Q = 1; player.ranks.W = 1; player.ranks.AB = 1; player.ranks.MS = 1;
  const m = dummy(140);
  tap('c'); step(8);
  tap('w');
  check('W in the air is Cyclone Sweep, not Skyward Assault', player.cast === 'shoot' && player.skillPose === 'spin' && player.cd['W.air'] > 0 && player.hang.t === 0,
    `cast ${player.cast} pose ${player.skillPose} cd ${player.cd['W.air'].toFixed(1)}`);
  check('the sweep hits the enemy below', m.hp < 1e6);
  step(40);
  check('the spin does not hover', player.onGround);
}

{
  // Tempest is a committed cast: locked in place and invulnerable while it
  // sweeps out (the use time already freezes movement; the storm grants i-frames)
  arena(20); player.ranks.R = 1;
  dummy(140);
  tap('r');
  check('Tempest locks you in place', player.cast === 'shoot' && player.casting.useT > 0, `useT ${player.casting.useT.toFixed(2)}`);
  check('...and you are invulnerable for the cast', player.invuln > 0 && player.invuln >= player.castT - 1e-9,
    `invuln ${player.invuln.toFixed(2)} castT ${player.castT.toFixed(2)}`);
  step(43); // the 1.4s storm plays out
  check('the invulnerability ends with the storm', player.invuln <= 0, `invuln ${player.invuln.toFixed(2)}`);
  check('Tempest is a 10s cooldown', SKILLS.R.cd === 10 && player.cd.R > 8, `cd ${player.cd.R.toFixed(2)}`);
}
{
  // Midair, the storm pins you completely: no falling, no drift, for its
  // whole cast (not just the usual movement lock).
  arena(20); player.ranks.R = 1;
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
  arena(20); player.ranks.R = 1; player.ranks.Q = 1; player.ranks.AD = 1;
  tap('c'); step(7); // airborne, where Q is the Meteor Dive
  tap('r');
  check('Tempest links into the Dive', linkable('AD') && player.cast === 'shoot', `cast ${player.cast}`);
  const mp0 = player.mp;
  tap('q');
  for (let i = 0; i < 30 && player.casting.queued; i++) step(1);
  check('Dive fires out of the storm as it ends', player.cast === 'dive' && player.mp < mp0,
    `cast ${player.cast} mp ${player.mp} of ${mp0}`);
  step(12); // let the dive land, so the next block starts on the floor
  // The storm links into Dive, not the whole aerial kit.
  arena(20); player.ranks.R = 1;
  tap('r'); player.cd.R = 10;
  check('the storm links into the Q slot only', linkable('AD') && !linkable('W'));
  tap('w'); step(1);
  // A Rising Arrows needs a launcher to link off; the storm isn't one, so the cast pays its own cooldown rather than a shone Tempest's.
  check('a Rising Arrows off the storm pays its own cooldown', player.cast === 'shoot' && player.cd.R > 9,
    `cast ${player.cast} cd ${player.cd.R.toFixed(2)}`);
}
{
  // A buffered skill fires in the direction held when it releases, not when
  // it was pressed: Q left, Q right zips you back and forth
  arena(20); player.ranks.Q = 1;
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
  arena(20); player.ranks.W = 1; player.ranks.MS = 1; player.ranks.E = 1; player.ranks.PV = 1;
  dummy(100);
  tap('c'); step(8);
  tap('w'); step(13);
  check('the spin links into Downpour', linkable('PV') && player.casting.useT > 0);
  tap('e'); for (let i = 0; i < 30 && player.casting.queued; i++) step(1); // fires as the sweep ends
  check('...and Downpour fires as the sweep ends', player.cast === 'barrage' && player.linkFrom === 'PV',
    `cast ${player.cast} from ${player.linkFrom}`);
}
{
  // Meteor Dive links into the equipped ground rush, Skyfall-style: Electric
  // Blitz, not just the base Rush Toss
  arena(20); player.ranks.Q = 1; player.ranks.EB = 1; player.ranks.AD = 1;
  player.blitz.charges = P.BLITZ_MAX;
  dummy(150);
  tap('c'); step(8);
  tap('q'); step(15); // the windup, the plunge, and the landing rush
  check('the dive links into the Blitz', linkable('EB') && !linkHeld('EB'), `from ${player.linkFrom}`);
  const charges0 = player.blitz.charges;
  tap('q'); step(1); // the landing rush's tail is buffered, not dropped
  check('the blitz fires off the dive, no use-time wait', player.blitz.charges === charges0 - 1 && player.cast === 'rush',
    `charges ${player.blitz.charges} cast ${player.cast} charges0 ${charges0}`);
}

{
  // Both Qs end with a committed recovery (delay), shortened by Haste
  arena(20); player.ranks.Q = 1;
  dummy(150);
  const base = delayTime('Q');
  check('Rush Toss has its own delay, longer than the default', SKILLS.Q.delay === 0.35 && base < 0.35 + 1e-9, `${base.toFixed(3)}`);
  player.casting.useT = 0; player.casting.recoverT = 0;
  cast('Q');
  check('the cast ends in a recovery that outlasts the slide', player.casting.recoverT === base && player.casting.useT > 0);
  player.ranks.Q = 0; player.ranks.EB = 1;
  check('Electric Blitz carries the same committed recovery', SKILLS.EB.delay === 0.35 && delayTime('EB') === base);
  player.ranks.HA = 3;
  check('Haste shortens the recovery by 10% attack speed at rank 3', Math.abs(delayTime('EB') - 0.35 / 1.1) < 1e-6,
    `${delayTime('EB').toFixed(4)}`);
  player.ranks.HA = 0; player.ranks.EB = 0; player.ranks.Q = 1;
}

{
  // Off a Skyward Assault hover: the lift is the use time, so a non-link skill
  // (Glide) waits for it, then fires and carries you
  arena(30); player.ranks.Q = 1; player.ranks.W = 3; player.ranks.AB = 3; player.ranks.D = 1;
  dummy(130);
  tap('q'); step(14); tap('w'); step(3);
  check('hovering (setup)', player.hang.t > 0 && !player.onGround, `hangT ${player.hang.t.toFixed(2)}`);
  tap('d');
  check('Glide pressed during the hover waits for it', player.casting.queued === 'D' && player.hang.t > 0,
    `queued ${player.casting.queued} hangT ${player.hang.t.toFixed(2)}`);
  step(30); // the hover ends, the buffered Glide fires
  check('...and the Glide fires as the hover ends, carrying you', player.cast === 'jump' && player.vx !== 0,
    `cast ${player.cast} vx ${player.vx.toFixed(0)}`);
}
{
  arena(30); player.ranks.Q = 1; player.ranks.W = 3; player.ranks.AB = 3; player.ranks.AD = 1;
  dummy(130);
  tap('q'); step(14); tap('w'); step(3);
  tap('q'); // Q's air form (Meteor Dive) pressed during the hover waits for it
  check('Meteor Dive pressed during the hover waits for it', player.casting.queued === 'Q' && player.hang.t > 0,
    `queued ${player.casting.queued} hangT ${player.hang.t.toFixed(2)}`);
  step(30); // the hover ends, the buffered Meteor Dive fires
  check('...and the dive plays out (no hover freeze)', player.hang.t === 0 && (player.diving || player.rush.t > 0),
    `diving ${player.diving} rushT ${player.rush.t.toFixed(2)}`);}

{
  // Single-rank skills: each carries its (former) max-level hit/damage numbers
  check('Double Shot hits up to 4 targets at 120% per hit',
    SKILLS.Z.targets1 === 4 && SKILLS.Z.dmg1 === 120 && SKILLS.Z.maxLevel === 1);
  check('Rising Arrows fires 4', SKILLS.W.hits1 === 4);
  check('Skyward Assault strikes 4', SKILLS.AB.hits1 === 4);
  check('Cyclone Sweep sweeps 4 hits at 200%', SKILLS.MS.hits1 === 4 && SKILLS.MS.dmg1 === 200);
  check('Electric Blitz strikes twice', SKILLS.EB.hits1 === 2);
  check('Tempest storms up to 8 hits at 200% each', SKILLS.R.hits1 === 8 && SKILLS.R.dmg1 === 200);
  check('Meteor Dive lands one Rush Toss-strength hit', SKILLS.AD.hits1 === 1 && SKILLS.AD.dmg1 === 400);
  // and the hits land: a Blitz rush (charge + two strikes) takes a big bite
  arena(20); player.ranks.Q = 1; player.ranks.EB = 1;
  player.blitz.charges = P.BLITZ_MAX;
  const m = dummy(140);
  tap('q'); step(24); // the slide ends and the strike lands (both hits)
  check('the Blitz rush strikes the carried enemy', m.hp < 1e6, `hp ${m.hp.toFixed(0)}`);
}
