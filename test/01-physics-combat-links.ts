import { seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, PAUSE_ROWS, pauseScroll, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, VARIANT_ART, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';
// --- physics: airborne bodies never pass through a platform surface ---
{
  const walk = (): Platform[] => game.floor.platforms.filter((p) => !p.inner && !p.ground);
  const r = (a: number, b: number): number => a + Math.random() * (b - a);
  let through = 0, trials = 0;
  for (const n of [1, 2, 4]) {
    gotoPlace(climb(n)); game.mobs = []; game.floor.spawns = [];
    const slopes = game.floor.platforms.filter((p) => p.slope);
    for (let k = 0; k < 120 && slopes.length; k++) {
      trials++; release();
      const s = slopes[Math.floor(Math.random() * slopes.length)];
      player.x = s.x + r(-40, 56); player.y = s.y - r(0, 40) - player.h;
      player.vx = r(-300, 300); player.vy = r(-320, 670);
      player.onGround = false; player.climb = null; player.dropBlock = null; player.casting.useT = 1;
      for (let i = 0; i < 10; i++) {
        const pf = player.y + player.h, px = player.x;
        step(); player.casting.useT = 1;
        if (player.onGround || player.climb) break;
        const f = player.y + player.h, x = player.x;
        const crossed = walk().some((p) => {
          let above = false;
          for (let j = 0; j <= 32; j++) {
            const t = j / 32, sx = px + (x - px) * t, sf = pf + (f - pf) * t;
            if (sx < p.x || sx >= p.x + p.w) { above = false; continue; }
            const d = sf - surfaceYAt(p, sx);
            if (d <= 0) above = true; else if (above && d > 0.5) return true;
          }
          return false;
        });
        if (crossed) { through++; break; }
      }
    }
  }
  check('falling/jumping never passes through slopes or ledges', through === 0, `${through}/${trials}`);
}

// --- physics: walking over every slope shape tracks the surface ---
{
  let bad = 0;
  for (const kind of SHAPES) for (const dir of ['right', 'left']) {
    release(); gotoPlace(climb(2)); game.mobs = []; game.floor.spawns = [];
    const shape = makeShape(kind, 64, 400, 10, false, seeded(1));
    game.floor.platforms = [...shape.tiles];
    const startX = dir === 'right' ? 70 : 64 + shape.w - 6;
    const first = shape.tiles.filter((t) => t.x <= startX && startX < t.x + 16).reduce((a, b) => (b.y < a.y ? b : a));
    player.x = startX; player.y = surfaceYAt(first, startX) - player.h; player.vx = player.vy = 0;
    player.onGround = true; player.climb = null; player.casting.useT = 0;
    setKey(dir, true);
    let err = 0, air = 0;
    for (let f = 0; f < 200 && player.x > 66 && player.x < 64 + shape.w - 4; f++) {
      step();
      const col = shape.tiles.filter((t) => t.x <= player.x && player.x < t.x + 16);
      err = Math.max(err, Math.abs(player.y + player.h - Math.min(...col.map((t) => surfaceYAt(t, player.x)))));
      if (!player.onGround) air++;
    }
    setKey(dir, false);
    if (err > 0.5 || air) bad++;
  }
  check('walking over slopes stays on the surface', bad === 0, `${bad} bad walks`);
}

// --- physics: down-jump then Glide never falls back through the dropped platform ---
{
  let through = 0, trials = 0;
  for (const n of [1, 2, 4]) {
    gotoPlace(climb(n)); game.mobs = []; game.floor.spawns = [];
    const tops = game.floor.platforms.filter((p) => !p.ground && !p.inner && !p.slope).slice(0, 8);
    for (const t of tops) for (const k of [2, 5]) {
      trials++; release();
      player.x = t.x + 8; player.y = t.y - player.h; player.vx = player.vy = 0; player.onGround = true;
      player.climb = null; player.dropBlock = null; player.casting.useT = 0; player.mp = 999; player.cd.d = 0; player.cd.C = 0;
      step();
      setKey('down', true); setKey('c', true); step(); release();
      step(k);
      tap('d');
      for (let i = 0; i < 60 && !player.onGround; i++) {
        const prev = player.y + player.h, dropping = player.dropBlock !== null, x0 = player.x;
        step();
        if (dropping || player.onGround || player.climb) continue;
        const feet = player.y + player.h;
        const hit = game.floor.platforms.find((p) => !p.inner && p.block === t.block && player.x >= p.x && player.x < p.x + p.w &&
          prev < surfaceYAt(p, x0) - 0.01 && feet > surfaceYAt(p, player.x) + 0.01);
        if (hit) { through++; break; }
      }
    }
  }
  check('down-jump + Glide never falls through from above', through === 0, `${through}/${trials}`);
}

// --- combat: Double Shot draws, then hits the closest enemies twice ---
{
  arena();
  const far = dummy(190), near = dummy(130), mid = dummy(160);
  tap('z');
  const duringDraw = near.hp === 1e6 && mid.hp === 1e6;
  step(Math.ceil(P.Z_WINDUP / P.STEP));
  const firstHit = near.hp < 1e6 && mid.hp < 1e6;
  const one = 1e6 - near.hp;
  step(5);
  check('Double Shot: nothing lands during the bow-draw windup', duringDraw);
  check('Double Shot: first hit lands on release', firstHit);
  check('Double Shot: the animation lasts its use time', Math.abs(player.castTotal - useTime('z')) < 1e-9,
    `pose ${player.castTotal.toFixed(2)} use ${useTime('z').toFixed(2)}`);
  check('Double Shot: each target takes both hits', near.hp < 1e6 - one * 1.5 && mid.hp < 1e6 - one * 1.5 && far.hp < 1e6);
}

// --- balance: a Lv.1 Garden Snail takes a few Double Shots ---
{
  let casts = 0;
  for (let run = 0; run < 3; run++) {
    arena();
    const m = dummy(140, MOB_TYPES[0].hp);
    let c = 0;
    while (game.mobs.includes(m) && c < 20) { player.cd.z = 0; player.casting.useT = 0; tap('z'); step(8); c++; }
    casts += c;
  }
  const avg = casts / 3;
  check('Lv.1 Garden Snail takes 2-5 Double Shots', avg >= 2 && avg <= 5, `avg ${avg}`);
}

// --- links: W only works right after Rush Toss, once ---
for (const [lvl, upgraded] of [[12, false], [20, true]] as const) {
  const name = upgraded ? 'Skyward Assault' : 'Rising Arrows';
  arena(lvl);
  player.ranks['ground-w'] = true; if (upgraded) player.ranks.ab = true;
  const m = dummy(125);
  const mp0 = player.mp;
  tap('w');
  check(`${name}: does nothing without Rush Toss`, player.mp === mp0 && m.hp === 1e6);
  setKey('down', true); tap('q'); setKey('down', false); step(12);
  const hp0 = m.hp; tap('w'); step(20);
  check(`${name}: hits after Rush Toss`, m.hp < hp0);
  step(15); player.cd['ground-w'] = 0;
  const hp1 = m.hp; tap('w'); step(20);
  check(`${name}: can't be reused until the next Rush Toss`, m.hp === hp1);
}
{
  arena(12); player.ranks['ground-w'] = true;
  const m = dummy(125);
  setKey('down', true); tap('q'); setKey('down', false); step(12);
  const hp0 = m.hp; tap('z'); step(15);
  check('Z during the Rush Toss casts Double Shot', m.hp < hp0 && player.linkFrom === 'z', `from ${player.linkFrom}`);
}
{
  arena(12); player.ranks['ground-w'] = true;
  dummy(125);
  setKey('down', true); tap('q'); setKey('down', false);
  tap('w'); // pressed mid Rush Toss
  let fired = -1;
  for (let i = 0; i < 30 && fired < 0; i++) { const c = player.cast; step(); if (player.cast === 'shoot' && c !== 'shoot') fired = i; }
  check('a link pressed during Rush Toss fires when it ends', fired > 0 && fired < 20, `frame ${fired}`);
}
{
  arena(20); player.ranks['ground-w'] = true; player.ranks.ab = true;
  const m = dummy(125);
  setKey('down', true); tap('q'); setKey('down', false); step(12);
  const x0 = player.x, y0 = player.y, hp0 = m.hp;
  tap('w');
  const up = y0 - player.y;
  let hover = 0;
  for (let i = 0; i < 45; i++) { const y = player.y; step(); if (player.y === y && !player.onGround) hover++; }
  check('Skyward Assault warps straight up without moving sideways', up > 0 && player.x === x0, `up ${up.toFixed(1)} dx ${(player.x - x0).toFixed(2)}`);
  check('Skyward Assault hovers most of a second, then lands', hover >= 20 && hover <= 28 && player.onGround, `hover ${hover} frames`);
  check('Skyward Assault hits', m.hp < hp0);
  check('Skyward Assault always rises the same fixed height', Math.abs(up - P.BARRAGE_UP) < 1, `up ${up.toFixed(1)}`);
}
{
  // Skyward Assault is gated by the link window: one use per Rush Toss, not spammed.
  arena(20); player.ranks['ground-w'] = true; player.ranks.ab = true; // Skyward Assault is the W upgrade: maxing W masters it
  dummy(125);
  setKey('down', true); tap('q'); setKey('down', false); step(12);
  check('the Rush Toss links into Skyward Assault', linkable('ab'));
  tap('w');
  check('the first Skyward Assault fires', player.cast === 'barrage' && player.hang.t > 0);
  check('...and links now read off the Assault, not the Rush Toss', player.linkFrom === 'ab' && !linkable('ab'));
  player.hang.t = 0; player.cast = null; player.castT = 0; player.casting.useT = 0;
  tap('w');
  check('a second Skyward Assault waits for a fresh Rush Toss', player.cast !== 'barrage');
}

{
  // Rush Toss: slide forward pushing enemies along; the strike and launch land as the slide ends
  arena(1);
  const m = dummy(130);
  const x0 = player.x;
  tap('q');
  let launchedEarly = false, mx = m.x, carried = false, hits = 0, hp = m.hp;
  for (let i = 0; i < 9 && player.rush.t > 0; i++) {
    step(1);
    if (m.hp < hp) { hits++; hp = m.hp; }
    if (m.airTime > 0 && player.rush.t > 0) launchedEarly = true;
    if (m.x > mx + 1) carried = true;
    mx = m.x;
  }
  check('Rush Toss slides forward', player.x - x0 > 30, `dx ${(player.x - x0).toFixed(1)}`);
  check('Rush Toss pushes the enemies it runs into along with you', carried && m.x > 130);
  check('Rush Toss launches nothing until the slide ends', !launchedEarly);
  check('the Rush Toss charge hits each enemy it scoops up, once', hits === 1, `${hits} hits, dx ${(player.x - x0).toFixed(1)}, rushT ${player.rush.t.toFixed(2)}`);
  step(2);
  check('Rush Toss strikes as the slide ends (the launch is on W now)', m.hp < 1e6 && m.airTime === 0);
}
{
  // Rush Toss travels its fixed distance even when an enemy slows it mid-slide
  arena(1);
  const m = dummy(player.x + 20);
  const x0 = player.x;
  tap('q');
  step(3);              // mid-slide, having run into the enemy
  check('contact slows the slide', Math.abs(player.vx) < P.RUSH_SLIDE_V, `vx ${player.vx.toFixed(1)}`);
  check('...but the slide is not over yet', player.rush.t > 0);
  step(20);
  check('the slide ends having covered its distance', player.rush.t === 0 && player.x - x0 >= P.RUSH_DIST - 4, `dx ${(player.x - x0).toFixed(1)}`);
  game.mobs.length = 0;
}

{
  // Rush Toss stops at the edge of the platform instead of sliding off it
  arena(1);
  const g = ground(), w0 = g.w;
  g.w = 140; player.x = 120;
  tap('q'); step(14);
  const x = player.x, on = player.onGround;
  g.w = w0;
  check('Rush Toss stops at a platform edge', on && x <= 140, `x ${x.toFixed(1)}`);
}

// --- enemies: waves never exceed a zone's cap; mobs stay on their platform ---
{
  let over = 0;
  for (const n of [1, 2, 4]) {
    release(); gotoPlace(climb(n)); player.x = 4; player.invuln = 999;
    [...game.mobs].slice(0, 3).forEach(killMob);
    step(Math.round((P.WAVE_EVERY + 1) / P.STEP));
    for (const z of game.floor.spawns) if (game.mobs.filter((m) => m.spawn === z).length > (z.cap ?? 1) + P.HEAT_EXTRA) over++;
  }
  check('enemy waves never exceed a zone cap (plus the overflow from a farmed platform)', over === 0, `${over} zones over`);
}

// --- spread spawns: farming one platform moves its enemies to the others ---
{
  release(); gotoPlace(climb(2)); player.invuln = 999;
  game.mobs = [];
  const zs = game.floor.spawns.slice(0, 3);
  game.floor.spawns = zs; zs.forEach((z) => { z.cap = 2; z.heat = 0; });
  spawnWave();
  check('a wave fills every zone to its cap', zs.every((z) => game.mobs.filter((m) => m.spawn === z).length === 2));
  const hot = zs[0];
  for (let i = 0; i < 6; i++) { const m = game.mobs.find((q) => q.spawn === hot); if (m) killMob(m); else { spawnMob(hot, MOB_TYPES[0]); killMob(game.mobs[game.mobs.length - 1]); } }
  check('kills heat their platform', hot.heat === 6);
  spawnWave();
  const on = (z: typeof hot): number => game.mobs.filter((m) => m.spawn === z).length;
  check('a farmed platform refills less', on(hot) === 0, `${on(hot)}`);
  check('...and its enemies turn up on the other platforms', on(zs[1]) + on(zs[2]) === 6, `${on(zs[1])}+${on(zs[2])}`);
  check('heat cools by half each wave', hot.heat === 3);
  game.mobs = []; spawnWave(); game.mobs = []; spawnWave();
  check('once it cools the platform fills as usual', on(hot) === 2 && hot.heat! < P.HEAT_HOT);
  game.mobs = [];
}

// --- regen: 5% every 5s, no HP regen in combat; frozen while paused ---
{
  arena(); player.invuln = 999;
  player.hp = 50; player.mp = 10; player.regenT = 0;
  step(Math.round(4.9 / P.STEP));
  const before = player.hp;
  step(Math.round(0.2 / P.STEP));
  check('HP and MP regen once every 5s', before === 50 && player.hp > 50 && player.mp > 10);
  const hp = player.hp;
  cast('z');
  step(Math.round(5.1 / P.STEP));
  check('no HP regen within 5s of attacking', player.hp === hp);
  game.pause = { col: 0, row: 0 };
  const t = player.regenT; step(30);
  check('pause menu freezes the game', player.regenT === t);
  game.pause = null;
}

// --- progression: an upgrade starts at rank 1, not its base skill's rank ---
{
  arena(30);
  player.ranks.z = true; player.sp = 1;
  spendSkill('s');
  check('upgrading Double Shot to Bolt Flurry starts at rank 1', activeSkill('z').key === 's' && true);
  check('movement skills are never offered for ranks', !skillRows().some((r) => r.key === 'd' && r.action));
}

// --- an upgrade needs its base skill learned (its single rank) ---
{
  arena(30);
  player.ranks.z = false; player.sp = 1;
  check('an upgrade isn\'t offered until its base is learned', !skillRows().some((r) => r.key === 's'));
  player.ranks.z = true;
  const row = skillRows().find((r) => r.key === 's');
  check('with the base learned, the upgrade is offered', !!row && row.action.startsWith('Upgrade'));
  check('...and an SP takes it', spendSkill('s') && player.ranks.s === true && player.sp === 0);
}
