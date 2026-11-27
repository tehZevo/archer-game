import { seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, VARIANT_ART, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';
// --- ghosts: few rich packets, smooth playback ---
{
  // sender walks right at 60 px/s for 2s, recording every frame (60 fps); its clock is 5000ms ahead
  const rec = new Recorder(), tr = newTrack(), skew = 5000, latency = 80;
  const packets: Packet[] = [];
  for (let f = 0; f <= 120; f++) {
    const t = f * (1000 / 60);
    const p = rec.tick(t + skew, 100 + t * 0.06, 200, 60, 0, f > 60 ? 'jump' : 'walk', 1);
    if (p) { packets.push(p); ingest(tr, p, t + latency); }
  }
  const rate = packets.length / 2;
  check('ghost packets go out ~3x a second, several samples each', rate >= 3 && rate <= 4 && packets.slice(1).every((p) => p.s.length >= 2), `${rate}/s`);
  // playback at local time 1500ms shows where the sender was INTERP_MS + latency earlier
  const at = (t: number): number => view(tr, t)!.x;
  const expect = 100 + (1500 - INTERP_MS - latency) * 0.06;
  check('ghost playback lags by the interpolation delay', Math.abs(at(1500) - expect) < 3, `x ${at(1500).toFixed(1)} want ~${expect.toFixed(1)}`);
  const steps = [0, 1, 2, 3, 4].map((i) => at(1400 + i * 16));
  check('ghost motion is smooth between samples (no 100ms steps)', steps.every((x, i) => i === 0 || (x > steps[i - 1] && x - steps[i - 1] < 2)));
  check('ghost pose plays back with the motion', view(tr, 600)!.pose === 'walk' && view(tr, 2000)!.pose === 'jump');
  check('send interval is fewer than 10 updates/s', SEND_MS > 100);
}

{
  // The air forms show the key they're used on (Q, W, E), not AD/MS/PV.
  arena(60);
  player.ranks['ground-q'] = true; player.ranks['ground-w'] = true; player.ranks['ground-e'] = true;
  const rows = skillRows();
  const ad = rows.find((r) => r.key === 'air-q'), ms = rows.find((r) => r.key === 'air-w'), pv = rows.find((r) => r.key === 'air-e');
  check('Meteor Dive shows on the Q key', !!ad && ad.slot === 'ground-q', ad?.slot);
  check('Cyclone Sweep shows on the W key', !!ms && ms.slot === 'ground-w', ms?.slot);
  check('Downpour shows on the E key', !!pv && pv.slot === 'ground-e', pv?.slot);
}
// --- a skill's prerequisite must be mastered before it unlocks ---
{
  arena(60);
  player.ranks['ground-q'] = false; player.ranks['ground-w'] = true;
  const ad = skillRows().find((r) => r.key === 'air-q');
  check('Meteor Dive is locked until Rush Toss is mastered', !!ad && ad.action === '' && !!ad.need?.includes('Rush Toss'), ad?.need);
  player.ranks['ground-q'] = true;
  const ad2 = skillRows().find((r) => r.key === 'air-q');
  check('...and unlocks once Rush Toss is at max rank', !!ad2 && ad2.action.startsWith('Learn'));
  const ms = skillRows().find((r) => r.key === 'air-w');
  check('Cyclone Sweep is locked until Skyward Assault is mastered', !!ms && ms.action === '' && !!ms.need?.includes('Skyward Assault'), ms?.need);
  player.ranks.ab = true;
  const ms2 = skillRows().find((r) => r.key === 'air-w');
  check('...and unlocks once Skyward Assault is at max rank', !!ms2 && ms2.action.startsWith('Learn'));
}
// --- branching upgrades: the slots that still branch (Z, W) ---
{
  arena(30);
  player.ranks.z = true; player.sp = 2;
  const offered = skillRows().map((r) => r.key);
  check('Z offers Bolt Flurry', offered.includes('s'));
  check('the retired branches are not offered', !offered.includes('RA'));
  spendSkill('s');
  check('taking Bolt Flurry binds it to Z at rank 1', activeSkill('z').key === 's' && true);
  check('Bolt Flurry is the only offer on Z', skillRows().filter((r) => r.slot === 'z' && r.key !== 'z').length === 1);
}
{
  arena(30); player.ranks.s = true;
  const m = dummy(140);
  tap('z'); step(10);
  check('Bolt Flurry fires a burst that stuns ahead', m.hp < 1e6 && player.face === 1);
}
{
  // Rush Toss stays the launcher on Q; Skyward Assault is W's upgrade
  arena(20); player.ranks['ground-q'] = true; player.ranks['ground-w'] = true;
  const m = dummy(140);
  tap('q'); step(14);
  check('Rush Toss hits the enemy ahead and leaves it on the ground', m.hp < 1e6 && m.airTime > 0);
  const hp0 = m.hp; tap('w'); step(15);
  check('the rush opens the link window, and W launches and shoots it', m.hp < hp0 && m.airTime > 0);
  arena(15); player.ranks['ground-w'] = true; player.ranks.ab = true; // Skyward Assault is the W upgrade: maxing W masters it
  check('W offers Skyward Assault as its upgrade', activeSkill('ground-w').key === 'ab');
}
{
  // Meteor Dive: Q's air form plunges down and rolls into the ground rush
  arena(20); player.ranks['ground-q'] = true; player.ranks['air-q'] = true;
  tap('c'); step(6);
  const y0 = player.y;
  tap('q'); step(5); // past the windup, into the plunge
  check('Meteor Dive plunges you down and forward', player.y > y0 + 4 && player.vx !== 0, `dy ${(player.y - y0).toFixed(1)}`);
  step(24);
  check('the dive lands and rolls into the ground rush', player.onGround && !player.diving);
  // from higher up: the landing frame itself starts the rush, a real one (it strikes)
  arena(20); player.ranks['ground-q'] = true; player.ranks['air-q'] = true;
  const m = dummy(180);
  player.y -= 60; player.onGround = false; player.vy = 0;
  tap('q');
  let landed = -1, rushing = -1;
  for (let i = 0; i < 30 && rushing < 0; i++) {
    step(1);
    if (landed < 0 && player.onGround) landed = i;
    if (player.onGround && player.rush.t > 0) rushing = i;
  }
  check('the rush starts the moment the dive lands', landed >= 0 && rushing === landed, `landed ${landed} rush ${rushing}`);
  step(20);
  check('...and its strike lands, releasing the dive\'s links', m.hp < 1e6 && player.linkFrom === 'air-q' && linkable('ground-w') && !linkHeld('ground-w'),
    `from ${player.linkFrom}`);
}
{
  // Cyclone Sweep: W's air form sweeps the enemies around you
  arena(20); player.ranks['ground-q'] = true; player.ranks['ground-w'] = true; player.ranks['air-w'] = true;
  const m = dummy(140);
  tap('c'); step(8);
  const hp0 = m.hp; tap('w'); step(4);
  check('Cyclone Sweep sweeps the enemies around you in the air', m.hp < hp0 && m.airTime === 0, `hp ${m.hp}`);
}

{
  // Piercing Leap lifts you steadily (no snappy pop) to about a jump's height
  arena(10); player.ranks['ground-e'] = true;
  tap('e');
  const ys: number[] = [];
  for (let i = 0; i < 30 && !(i > 2 && player.onGround); i++) { ys.push(player.y); step(1); }
  const y0 = ground().y - player.h, peak = y0 - Math.min(...ys), firstStep = ys[0] - ys[1];
  check('Piercing Leap rises about a jump\'s height', peak > 30 && peak < 50, `peak ${peak.toFixed(1)}`);
  check('...at a steady pace, slower than a jump\'s pop', firstStep < 300 * P.STEP && firstStep > 0, `first step ${firstStep.toFixed(1)}px`);
}
{
  // Skyward Assault -> E: Downpour isn't a link off the assault, so a press
  // during the hover is dropped (only MS, R, Z, S, Q and PV are buffered).
  arena(30); player.ranks['ground-q'] = true; player.ranks['ground-w'] = true; player.ranks.ab = true; player.ranks['ground-e'] = true; player.ranks['air-e'] = true; player.ranks.d = true;
  dummy(130);
  tap('q'); step(14); tap('w'); step(3);
  check('Skyward Assault hovers', player.hang.t > 0 && !player.onGround, `hangT ${player.hang.t.toFixed(2)}`);
  tap('d');
  check('D pressed during the hover is dropped (not a link off it)', player.casting.queued === null && player.hang.t > 0,
    `queued ${player.casting.queued} hangT ${player.hang.t.toFixed(2)}`);
}

{
  // Q rushes chain into Z: pressed mid-slide, Double Shot fires as the slide ends
  arena(20); player.ranks['ground-q'] = true; player.ranks['ground-w'] = false;
  dummy(200);
  tap('q'); step(2); tap('z');
  check('Z pressed during the rush waits for it', player.casting.queued === 'z' && player.cast === 'rush');
  let fired = -1;
  for (let i = 0; i < 30 && fired < 0; i++) { step(1); if (player.cast === 'shoot') fired = i; }
  check('...and fires as soon as the slide ends, with no use-time wait', fired >= 0 && player.rush.t <= 0, `after ${fired} frames`);
  arena(20); player.ranks['ground-q'] = true; player.ranks['ground-w'] = false;
  tap('q'); for (let i = 0; i < 30 && (player.rush.t > 0 || rushHolding()); i++) step(1);
  check('right after the rush, Z fires at once too', player.casting.useT > 0 && (tap('z'), player.cast === 'shoot'));
  // the chain skips the ending lag once: a second Z right after is a fresh
  // shot (its own use time), not a free extra use while the window is open
  arena(20); player.ranks['ground-q'] = true; player.ranks['ground-w'] = false;
  dummy(200);
  tap('q'); for (let i = 0; i < 30 && (player.rush.t > 0 || player.cast === 'rush'); i++) step(1);
  tap('z'); step(1);
  check('the chained Z ends the rush\'s links', player.linkFrom === 'z');
  const cast1 = player.cast;
  tap('z');
  check('a second Z right after is a fresh shot, not a free extra', player.cast === 'shoot' && cast1 === 'shoot');
}
{
  // Level-based miss rate: 10% per level the target is above the attacker,
  // the same in reverse; applies to shots and to contact hits alike.
  check('an even match never misses', missChance(10, 10) === 0);
  check('each level above adds 10%', missChance(10, 12) === 0.2 && missChance(10, 11) === 0.1);
  check('being above the target misses nothing', missChance(10, 8) === 0);
  check('the rate caps at 75%', missChance(1, 100) === 0.75);
  arena(10);
  const m = dummy(140);
  const roll = (r: number): boolean => {
    m.hp = 1e6; const saved = Math.random; Math.random = () => r; damage(m, 1); Math.random = saved;
    return m.hp < 1e6;
  };
  m.level = 10;
  check('a shot at an even-levelled enemy lands on any roll', roll(0.99));
  m.level = 12; // two above: 20% miss
  check('a 20% roll at two levels above misses', !roll(0.15) && roll(0.25));
  m.level = 40;
  check('the cap bites at thirty levels up', !roll(0.7) && roll(0.8));
  check('a miss still wakes the enemy', (m.hp = 1e6, roll(0.01), m.aggro === true));
}
{
  // the mobs' contact hits miss the same way
  arena(20);
  player.invuln = 0;
  const saved = Math.random; Math.random = () => 0.05;
  check('a mob two levels below the archer misses on a 20% roll', !hurtPlayer(10, 0, 18) && player.hp === player.hpMax);
  Math.random = saved;
  check('...and the miss starts the i-frame cooldown, quietly (no flashing)', player.invuln > 0.9 && player.invulnQuiet && !hurtPlayer(10, 0, 18),
    `invuln ${player.invuln.toFixed(2)} quiet ${player.invulnQuiet}`);
  player.invuln = 0;
  check('...and lands when the roll clears, flashing', hurtPlayer(10, 0, 18) && player.hp === player.hpMax - 10 && !player.invulnQuiet);
  player.hp = player.hpMax; player.invuln = 0;
  check('a mob two levels above lands on any roll', hurtPlayer(10, 0, 22) && player.hp === player.hpMax - 10);
  // Twin Echoes (passive): the shadow archer fires alongside you, doubling the
  // arrows every attack fires, permanently, once bought with SP. No timer.
  arena(20); player.ranks.z = true;
  check('Double Shot fires two arrows with no Twin Echoes', shotCount(rank('z')) === 2, `${shotCount(rank('z'))}`);
  player.ranks.es = true;
  check('Twin Echoes doubles Double Shot\'s arrows', shotCount(rank('z')) === 4, `${shotCount(rank('z'))}`);
  check('Twin Echoes unlocks at Lv.30 and is a passive', SKILLS.es.minLevel === 30 && SKILLS.es.passive === true);
  arena(20); player.ranks.z = true; player.ranks.es = true;
  check('the shadow doubles a mid-air Downpour too', shotCount(rank('air-e')) === 4, `${shotCount(rank('air-e'))}`);
}
{
  // each ground rush wears its own aura and scuffs the floor it slides over
  arena(20); player.ranks['ground-q'] = true;
  game.fx.length = 0;
  tap('q'); step(4);
  check('Rush Toss slides in its own aura', player.rush.t > 0 && player.rush.look === 'tossRush');
  check('...scuffing the ground behind it', game.fx.some((f) => f.type === 'tossTrail'));
  arena(20); player.ranks['ground-q'] = true; player.ranks.eb = true;
  game.fx.length = 0;
  tap('q'); step(4);
  check('Electric Blitz has its own, distinct aura and scuffs', player.rush.look === 'blitzRush' && game.fx.some((f) => f.type === 'blitzTrail') && !game.fx.some((f) => f.type === 'tossTrail'));
  arena(20); player.ranks['ground-q'] = true;
  setKey('down', true); tap('q'); setKey('down', false);
  check('an in-place rush has no slide aura', !(player.rush.t > 0 && player.rush.look));
  player.blitz.charges = P.BLITZ_MAX; player.cd['ground-q'] = 0; player.readyT['ground-q'] = 0; // leave Q as the blitz tests expect
}
// --- Electric Blitz: Q's charged upgrade ---
{
  arena(20); player.ranks['ground-q'] = true; player.ranks.eb = true;
  check('Electric Blitz replaces Rush Toss on Q', activeSkill('ground-q').key === 'eb');
  check('it starts with two charges', player.blitz.charges === P.BLITZ_MAX);
  check('the blitz has no cooldown of its own (its charges are the cooldown)', P.BLITZ_CHARGE_T === 4);
  const m = dummy(140);
  const RUSH = 22; // the whole slide, from cast to the strike at its end
  tap('q'); step(RUSH);
  check('the blitz spends a charge and carries the enemy', player.blitz.charges === 1 && m.hp < 1e6,
    `charges ${player.blitz.charges} hp ${m.hp}`);
  step(10);
  tap('q'); step(RUSH);
  check('the second charge works', player.blitz.charges === 0 && m.hp < 1e6,
    `charges ${player.blitz.charges} hp ${m.hp}`);
  tap('q'); step(1);
  check('with no charges Q does nothing', player.blitz.charges === 0 && player.rush.t === 0,
    `charges ${player.blitz.charges} rushT ${player.rush.t.toFixed(2)}`);
  check('...and no ready-glow flashes (nothing came off cooldown)', player.readyT['ground-q'] === 0);
  for (let i = 0; i < P.BLITZ_CHARGE_T * 30 + 2 && player.blitz.charges === 0; i++) step(1);
  check('a charge recharges after 4s', player.blitz.charges === 1, `charges ${player.blitz.charges}`);
  check('the recharged charge flashes the icon', player.readyT['ground-q'] > 0);
  player.blitz.charges = 1; player.blitz.t = 3; player.linkFrom = 'ground-q'; player.ranks['ground-w'] = true; player.casting.useT = 0;
  cast('ground-w');
  check('a linked skill speeds up the charge filling (it never sets it back)', player.blitz.t === 4, `blitzT ${player.blitz.t}`);
}
