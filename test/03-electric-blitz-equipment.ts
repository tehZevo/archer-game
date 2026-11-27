import { capAdd, seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, PAUSE_ROWS, pauseScroll, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, VARIANT_ART, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';
// --- Equipment: a weapon and an armor piece ---
{
  arena(10); player.ranks.z = true;
  clearGear();
  check('you start with nothing equipped', gear.weapon === null && gear.armor === null);
  check('an empty slot leaves damage and damage taken unchanged', gearDmg() === 1 && gearSoak() === 0);

  const bow = gearFor('weapon', 10);
  check('gear is named by the level it is made for', bow.name === 'Long Bow' && bow.lvl === 10, bow.name);
  check('a Lv.10 bow adds 30% to every hit', equip(bow) && Math.abs(gearDmg() - 1.30) < 0.001, `x${gearDmg().toFixed(3)}`);
  const war0 = player.war;
  dummy(140); game.dmgNums.length = 0;
  tap('z'); step(12);
  const hit = game.dmgNums[game.dmgNums.length - 1];
  check('the bow multiplies the arrow that lands', hit.v > war0 * 1.29, `hit ${hit.v}`);

  check('a weaker bow goes in the bag, leaving the stronger one on', equip(gearFor('weapon', 4)) && gear.weapon?.lvl === 10 && bag.length === 1 && bag[0].lvl === 4);
  const better = gearFor('weapon', 20);
  check('a stronger bow goes on, the old one into the bag', equip(better) && gear.weapon?.name === 'Yew Bow' && bag[1]?.name === 'Long Bow' && bag[1].lvl === 10, gear.weapon?.name);
  check('wearing a spare swaps it with the bow you had on', wear(1) && gear.weapon?.lvl === 10 && bag[1].lvl === 20);
  check('taking a piece off puts it in the bag', unequip('weapon') && gear.weapon === null && bag.length === 3);
  wear(2); // the Yew Bow back on
  while (bag.length < BAG_SIZE) equip(gearFor('armor', 1));
  equip(gearFor('armor', 2)); bag.pop(); // armor on, one bag slot free again
  equip(gearFor('weapon', 3));
  check('with the bag full, a lesser piece is left where it lies', !equip(gearFor('weapon', 3)) && bag.length === BAG_SIZE);
  check('...but an upgrade still goes on', equip(gearFor('weapon', 25)) && gear.weapon?.lvl === 25);
  // in the Esc menu the bag sits under the stats: Z wears a spare, X bins it
  clearGear(); equip(gearFor('weapon', 20)); equip(gearFor('weapon', 7));
  tap('escape'); game.pause!.col = 0; game.pause!.row = STAT_KEYS.length + 2;
  tap('z');
  check('Z on a spare in the Esc menu puts it on', gear.weapon?.lvl === 7 && bag[0]?.lvl === 20);
  tap('x');
  check('X on a spare throws it away', bag.length === 0 && gear.weapon?.lvl === 7 && !!game.pause);
  tap('escape');
  clearGear(); equip(better);

  const plate = gearFor('armor', 30);
  check('armor soaks a share of what you take (capped)', equip(plate) && gearSoak() === 0.35, `soak ${gearSoak()}`);
  player.invuln = 0;
  hurtPlayer(100, undefined, player.level);
  check('a 100-damage hit costs 65 with that armor on', player.hp === player.hpMax - 65, `hp ${player.hp}`);

  // a kill can leave a piece behind, and walking over it puts it on
  clearGear();
  const slain = dummy(100);
  for (let i = 0; i < 80 && gearDrops.length === 0; i++) { slain.dead = false; killMob(slain); slain.hp = 1e6; }
  check('a defeated enemy can leave gear where it fell', gearDrops.length > 0 && gearDrops[0].item.lvl === slain.level);
  const d = gearDrops[0];
  player.x = d.x; player.y = d.y - player.h; player.onGround = true;
  step(1);
  check('walking over it leaves it lying', gear[d.item.kind] === null && gearDrops.length > 0);
  tap('x');
  check('pressing X picks it up', gear[d.item.kind] !== null && gearDrops.length === 0);
  // a piece left lying is gone once you leave the floor (like coins)
  for (let i = 0; i < 80 && gearDrops.length === 0; i++) { slain.dead = false; killMob(slain); slain.hp = 1e6; }
  const had = gearDrops.length > 0;
  gotoPlace(climb(3)); step(1);
  check('gear left on a floor does not follow you to the next', had && gearDrops.length === 0, `${gearDrops.length} left`);
  arena(10);

  const mem: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
  clearGear(); equip(gearFor('weapon', 20)); equip(gearFor('armor', 34)); equip(gearFor('weapon', 7));
  save();
  clearGear();
  load();
  check('your gear survives a reload', gear.weapon?.name === gearFor('weapon', 20).name && gear.armor?.lvl === 34, `${gear.weapon?.name} / ${gear.armor?.name}`);
  check('...and so does the bag', bag.length === 1 && bag[0].kind === 'weapon' && bag[0].lvl === 7 && bag[0].name === gearFor('weapon', 7).name);
  clearSave(); clearGear();
  delete (globalThis as { localStorage?: unknown }).localStorage;
}

// --- E / R ---
{
  // E is a two-form key: Piercing Leap on the ground, Downpour in the air
  arena(10); player.ranks['ground-e'] = true; player.ranks['air-e'] = true;
  const near = dummy(140), behind = dummy(60);
  tap('e');
  check('Piercing Leap throws you into the air', !player.onGround && player.vy < 0);
  check('...and its spikes are still falling: nothing is hit yet', near.hp === 1e6);
  step(Math.ceil(0.3 / P.STEP));
  check('Piercing Leap spears the enemies in front of you as its spikes land', near.hp < 1e6);
  check('...but not the ones behind you', behind.hp === 1e6);
  check('Piercing Leap is on a long cooldown', player.cd['ground-e'] > 4, `cd ${player.cd['ground-e'].toFixed(1)}`);
  // the air form, once you are back on your feet with the cooldown cleared
  landLeap(); step(13); player.cd['ground-e'] = 0; // let the leap's recovery tick out, freeing movement
  const under = dummy(100), beside = dummy(170);
  tap('c'); step(8);
  const yTop = player.y; player.vx = 40; tap('e'); step(1);
  check('Downpour bumps you up (a clear hop)', player.y < yTop - 4 && player.y > yTop - 20 && player.vy < 0, `rose ${(yTop - player.y).toFixed(1)}px`);
  step(10);
  check('Downpour does not freeze you mid-air', player.vy > 0 && player.vx !== 0);
  step(4);
  check('Downpour hits the enemy beneath you', under.hp < 1e6);
  check('Downpour leaves enemies off to the side alone', beside.hp === 1e6);
  step(30);
  check('after the volley you drop back down', player.onGround);

  // the two forms cool down apart: Piercing Leap's long cooldown never locks out the volley
  player.cd['ground-e'] = 0; player.cd['ground-e.air'] = 0; player.casting.useT = 0;
  tap('e'); step(6);
  check('Piercing Leap fills its own slot, its full length', player.cd['ground-e'] > 4 && player.cdMax['ground-e'] === P.SPIKE_CD && player.cd['ground-e.air'] === 0);
  player.casting.useT = 0; const yv = player.y; tap('e'); step(1);
  check('Downpour still fires in the air during the Piercing Leap cooldown', player.y < yv && player.cast === 'barrage' && player.cd['ground-e.air'] === 0 && player.cd['ground-e'] > 4);
  check('the bar shows the form you are in', cdSlot('ground-e') === 'ground-e.air' && cdSlot('ground-e', false) === 'ground-e');
  step(40);
}
{
  // The spike lift links into Downpour: E pressed during the rise fires as it ends
  arena(60); player.ranks['ground-e'] = true; player.ranks['air-e'] = true;
  dummy(130);
  tap('e'); step(12); // rise to the top of the lift (the air form needs ~2/3 a jump's height)
  check('Piercing Leap lifts you (setup)', !player.onGround && player.liftT > 0, `liftT ${player.liftT.toFixed(2)}`);
  tap('e'); // Downpour (E's air form) pressed during the lift links off it
  check('the spike lift links into Downpour', player.linkFrom === 'ground-e' && linkable('air-e'), `from ${player.linkFrom}`);
  let fired = -1;
  for (let i = 0; i < 24 && fired < 0; i++) { step(1); if (player.casting.key === 'air-e') fired = i; }
  check('...and it fires as the lift ends', fired >= 0 && player.casting.key === 'air-e', `fired ${fired}`);
}
{
  // A linked skill refunds 1s off Piercing Leap's cooldown (as it does Tempest's)
  arena(20); player.ranks['ground-q'] = true; player.ranks['ground-w'] = true; player.ranks['ground-e'] = true;
  dummy(150);
  tap('e'); step(2);
  check('Piercing Leap starts on its full cooldown', player.cd['ground-e'] > 4, `cd ${player.cd['ground-e'].toFixed(1)}`);
  landLeap(); // let the lift's hover play out and land
  player.cd.r = 5; player.cd['ground-w.air'] = 3; // so the Tempest and Cyclone Sweep shaves are visible too
  tap('q'); step(14); // the rush ends, the link window is live
  const cd1 = player.cd['ground-e'], cdR1 = player.cd.r, cdW1 = player.cd['ground-w.air'];
  tap('w'); step(4); // the queued volley fires as the rush clears
  check('the linked Rising Arrows fires', player.cast === 'shoot' && player.linkFrom === 'ground-w',
    `cast ${player.cast} from ${player.linkFrom}`);
  check('the link refunds 1s off Piercing Leap', Math.abs(player.cd['ground-e'] - (cd1 - 1 - 4 / 30)) < 0.05,
    `cd ${player.cd['ground-e'].toFixed(2)} after a ${cd1.toFixed(2)}s cooldown`);
  check('...and 1s off Cyclone Sweep', player.cd['ground-w.air'] < cdW1 - 0.9 && player.cd['ground-w.air'] > cdW1 - 1.3, `cd ${player.cd['ground-w.air'].toFixed(2)} of ${cdW1.toFixed(2)}`);
  check('the same link also shaves Tempest', player.cd.r < cdR1 - 0.9 && player.cd.r > cdR1 - 1.3, `cd.r ${player.cd.r.toFixed(2)} of ${cdR1.toFixed(2)}`);
}
{
  // Cyclone Sweep (W in the air): one sweep per 4s, and a slow rise
  arena(20); player.ranks['ground-q'] = true; player.ranks['ground-w'] = true; player.ranks['air-w'] = true;
  tap('c'); step(70);
  check('back on the ground', player.onGround);
  const m = dummy(140);
  tap('c'); step(8); tap('w');
  const ySpin = player.y;
  let rising = true;
  for (let i = 0; i < 12; i++) { const y = player.y; step(1); rising &&= player.y < y; } // the sweep's four hits stagger out, lifting you
  const hp1 = m.hp; player.casting.useT = 0; tap('w'); step(2);
  check('W can\'t be spammed in the air (a second spin waits out its cooldown)', hp1 < 1e6 && m.hp === hp1 && player.cd['ground-w.air'] > 3, `hp ${m.hp} hp1 ${hp1} cd ${player.cd['ground-w.air'].toFixed(2)}`);
  check('the spin lifts you slowly', rising && ySpin - player.y < 15, `rose ${(ySpin - player.y).toFixed(1)}px`);
  check('the spin cools down for 8s', player.cdMax['ground-w.air'] === P.SPIN_CD && P.SPIN_CD === 8);
}
{
  // Q and Meteor Dive: both paced by the use time alone, no cooldowns
  arena(20); player.ranks['ground-q'] = true; player.ranks['air-q'] = true;
  tap('q');
  check('the ground rush has a 3s cooldown, on top of its use time', SKILLS['ground-q'].cd === 3 && SKILLS['ground-q'].use === 0.6 && player.cdMax['ground-q'] === 3 && player.casting.useT > 0);
  step(40); player.cd['ground-q'] = 0;
  tap('c'); step(6); tap('q');
  check('the Meteor Dive has no cooldown, only a use time', SKILLS['air-q'].cd === 0 && player.cd['ground-q.air'] === 0 && player.casting.useT > 0 && player.casting.recoverT > 0,
    `cd ${player.cd['ground-q.air'].toFixed(2)} use ${player.casting.useT.toFixed(2)}`);
  step(40);
}
{
  // The Meteor Dive's follow-ups fire off its landing, not its coil, and a
  // Double Shot pressed mid-plunge waits out the landing roll.
  arena(20); player.ranks['ground-q'] = true; player.ranks['air-q'] = true;
  dummy(150);
  tap('c'); step(8);
  tap('q');
  check('a follow-up pressed at the coil waits for the landing', linkable('ground-w') && linkHeld('ground-w'));
  step(4); tap('z');
  check('a Double Shot pressed mid-plunge is buffered', player.casting.queued === 'z', `queued ${player.casting.queued}`);
  let rolled = false, firedRolling = false;
  for (let i = 0; i < 40 && player.casting.queued; i++) {
    step(1);
    if (player.onGround && player.rush.t > 0) rolled = true;
    if (player.cast === 'shoot' && player.rush.t > 0) firedRolling = true;
  }
  check('...and fires once the landing roll\'s strike lands, not during it', rolled && !firedRolling && player.cast === 'shoot',
    `rolled ${rolled} firedRolling ${firedRolling} cast ${player.cast}`);
}
{
  // The Meteor Dive links into the grounded kit: pressed as the dive lands,
  // the next skill fires without the use-time wait
  arena(20); player.ranks['ground-q'] = true; player.ranks['air-q'] = true; player.ranks['ground-w'] = true;
  dummy(150);
  tap('c'); step(8);
  tap('q'); step(15); // the windup, the plunge, and the landing rush
  check('the dive has landed, its links released', linkable('ground-w') && !linkHeld('ground-w'), `from ${player.linkFrom}`);
  const mp0 = player.mp;
  tap('w');
  check('Rising Arrows links out of the dive', player.mp < mp0 && player.linkFrom === 'ground-w', `mp ${player.mp} from ${player.linkFrom}`);
}
{
  arena(25); player.ranks.r = true;
  const a = dummy(130), b = dummy(170);
  tap('r'); step(15);
  check('Tempest hits every enemy caught in the sweep', a.hp < 1e6 && b.hp < 1e6);
  const hp = a.hp; player.casting.useT = 0; tap('r'); step(5);
  check('Tempest is on a long cooldown', a.hp === hp && player.cd.r > 4);
}
{
  // ready-glow: the bar icon flashes the moment a cooldown runs out
  arena(20); player.ranks['ground-e'] = true;
  tap('e');
  check('casting starts the cooldown with no glow', player.cd['ground-e'] > 0 && player.readyT['ground-e'] === 0);
  for (let i = 0; i < 400 && player.cd['ground-e'] > 0; i++) step(1);
  check('the glow flashes as the cooldown ends', player.cd['ground-e'] === 0 && player.readyT['ground-e'] > 0, `cd ${player.cd['ground-e'].toFixed(2)} readyT ${player.readyT['ground-e'].toFixed(2)}`);
  step(8);
  check('the glow fades as the flash plays out', player.readyT['ground-e'] > 0 && player.readyT['ground-e'] < READY_FLASH, `readyT ${player.readyT['ground-e'].toFixed(2)}`);
  step(10);
  check('the glow is gone once the flash is over', player.readyT['ground-e'] === 0);
}
{
  // Haste: +attack speed shortens use time, never cooldowns; Double Shot is paced by use time alone
  arena(25); dummy(130);
  cast('z');
  const base = player.casting.useT;
  check('Double Shot has a use time and no cooldown', base > 0.1 && player.cd.z === 0);
  player.casting.useT = 0; player.casting.recoverT = 0; player.cd.r = 0; player.ranks.r = true; cast('r');
  const rCd = player.cd.r, rUse = player.casting.useT;
  player.ranks.ha = true; player.casting.useT = 0; player.casting.recoverT = 0; player.cd.r = 0; cast('r');
  check('Haste shortens use time by 20% attack speed at rank 3', Math.abs(player.casting.useT - rUse / 1.2) < 1e-6);
  check('Haste leaves cooldowns alone', player.cd.r === rCd);
  player.casting.useT = 0; player.casting.recoverT = 0; cast('z');
  check('a hasted Double Shot fires about 20% faster', Math.abs(player.casting.useT - base / 1.2) < 1e-6);
  player.ranks.ha = false; player.ranks.r = false;
}

// --- private instances ---
{
  const c = newCode();
  check('instance codes are 5 letters without I or O', /^[A-HJ-NP-Z]{5}$/.test(c), c);
  check('typed codes are normalised; wrong lengths rejected', parseCode(' abc-de ') === 'ABCDE' && parseCode('ABCD') === '' && parseCode('ABCDEF') === '');
  check('public rooms are per place + channel', roomId('woods-3', 2, '', '') === 'eurekaland-woods-3-c2');
  check('a private instance is its own room per place', roomId('woods-3', 2, 'ABCDE', '') === 'eurekaland-woods-3-pABCDE' && roomId('woods-3', 7, 'ABCDE') === roomId('woods-3', 2, 'ABCDE'));
  check('the network stays offline until the menu starts the game', net.started === false);
}

// --- shared spawn boost ---
{
  arena(1); resetBoost();
  game.floor.spawns = [{ x: 150, y: ground().y, types: ['Garden Snail'], cap: 9 } as never];
  const m = dummy(150, 1); killMob(m);
  check('local kills are batched for sending', takeBatch(0) === 1 && takeBatch(10) === 0);
  remoteKills(2);
  check('remote kills speed up waves', Math.abs(waveRate() - (1 + 2 * BOOST.PER_KILL)) < 1e-9);
  remoteKills(999); remoteKills('junk');
  check('boost is capped, and a flood counts as one capped batch', boost.level === BOOST.MAX);
  // with a full boost, waves come twice as often
  game.mobs = []; game.waveT = 0;
  step(Math.ceil((P.WAVE_EVERY / 2 + 0.5) / P.STEP)); // the boost decays a little meanwhile
  check('a full boost brings the next wave in about half the time', game.mobs.length > 0);
  step(Math.ceil(30 / P.STEP));
  check('the boost decays back to normal', boost.level === 0 && waveRate() === 1);
}

// --- archer sprite sheet ---
check('every archer frame is 16x24 (lying flat is 24x24)', Object.entries(GRIDS).every(([p, fs]) => fs.length > 0 && fs.every((g) => g.length === 24 && g.every((r) => r.length === (p === 'prone' ? 24 : 16)))));
{
  // lying flat keeps the standing head's size (it used to shrink to 4 rows)
  const headRows = (g: string[]): number => g.filter((r) => /[hs]/.test(r)).length;
  check('the prone head is as tall as the standing one', headRows(GRIDS.prone[0]) >= headRows(GRIDS.idle[0].slice(0, 10)) - 1,
    `${headRows(GRIDS.prone[0])} vs ${headRows(GRIDS.idle[0].slice(0, 10))}`);
}
check('every networked pose has frames and a cycle rate', POSES.every((p) => GRIDS[p]?.length && POSE_FPS[p] > 0));
check('new poses go on the end of the networked list (older clients read them as idle)', POSES.indexOf('vanish') === 10 && POSES.indexOf('fall') === POSES.length - 1 && POSES.indexOf('prone') === 7 && POSES[0] === 'idle');
{
  // holding Down on the ground lies you flat; Left/Right overrides it with a normal walk
  arena(1); player.x = 300; player.vx = 0; player.face = 1;
  setKey('down', true); step(5);
  check('holding Down on the ground lies you flat', player.animState === 'prone' && Math.abs(player.x - 300) < 1);
  setKey('left', true); step(20);
  const downWalk = 300 - player.x, st = player.animState;
  setKey('left', false); step(10);
  check('Left/Right while holding Down stands you up and walks', st === 'walk' && player.face === -1 && downWalk > 10);
  check('letting go of Left/Right (Down still held) lies you back down', player.animState === 'prone');
  setKey('down', false); step(2);
  check('letting go of Down stands you back up', player.animState === 'idle');
  // the same walk as without Down
  arena(1); player.x = 300; player.vx = 0;
  setKey('left', true); step(20); setKey('left', false);
  check('a walk with Down held is as fast as without', Math.abs((300 - player.x) - downWalk) < 0.01, `${(300 - player.x).toFixed(2)} vs ${downWalk.toFixed(2)}`);
  release();
}

// --- Knockback adds to your momentum, capped at its own speed ---
{
  check('knockback tops your speed up to its own, no further', capAdd(50, P.HIT_PUSH) === P.HIT_PUSH && capAdd(0, P.HIT_PUSH) === P.HIT_PUSH);
  check('...adds nothing if you are already going faster that way', capAdd(200, P.HIT_PUSH) === 200 && capAdd(-200, -P.HIT_HOP) === -200);
  check('...and still pushes against your momentum', capAdd(-50, P.HIT_PUSH) === P.HIT_PUSH - 50);
  arena(30); clearGear();
  player.invuln = 0; player.hp = player.hpMax; player.vx = 300; player.vy = 0;
  hurtPlayer(1, player.x - 20, 200);
  check('a hit from behind while running fast keeps your run speed', player.vx === 300 && player.vy === -P.HIT_HOP, `vx ${player.vx} vy ${player.vy}`);
  player.invuln = 999;
}

// --- Bubble: a passive that takes a flat 30% off every hit ---
{
  arena(30); clearGear();
  const take = (): number => {
    player.invuln = 0; player.hp = player.hpMax;
    const before = player.hp; hurtPlayer(100, undefined, 200); return before - player.hp;
  };
  player.ranks.bu = false; const plain = take();
  player.ranks.bu = true; const bubbled = take();
  player.ranks.bu = false; player.invuln = 999;
  check('Bubble takes a flat 30% off each hit', plain === 100 && bubbled === 70, `${plain} -> ${bubbled}`);
}
