import { seeded, cleanEmote, clearEmotes, EMOTE_ART, EMOTE_MS, EMOTE_PAL, EMOTES, emoteFor, setEmote, buy, NPC_R, COIN_LIFE, coinValue, drops, FLY_T, flying, PRICES, RESPEC_PRICES, shop, shopStock, START_POTIONS, trainer, TRAINER_ITEMS, wallet, areaOf, isPathEnd, isTown, lastTown, MAP_AREAS, mobLevel, nextPlace, PATHS, pathsFrom, pathsInto, placeKey, placeName, samePlace, START, TOWNS, townDepth, type Place, ELITE, FX_DUR, MOB_TYPES, P, SKILLS, VARIANT_CHANCE, game, gotoPlace, player, spawnMob, spawnWave, SPAWN_SPREAD, USE_FLASH, confirmInput, confirmUi, cleanName, clearShots, dueShots, ghostFx, NAME_MAX, queueShot, randomName, SHOT_GAP, tintFor, FONT_CHARS, textWidth, fontPng, ACTIONS, actionFor, binds, bindKey, capture, cleanBinds, resetBinds, clearPressed, keyName, normalize, REPEAT_DELAY, REPEAT_RATE, setKey, setLayout, update, advance, tick, CHASE_TURN, activeSkill, expBar, MAX_LEVEL, passiveBonus, PAUSE_ROWS, pauseScroll, rank, recalcStats, shotCount, skillRows, spendSkill, STAT_GAIN, surfaceYAt, areaMobs, floorMobs, groupSize, pickVariant, LAYOUTS, type Layout, makeShape, SHAPES, TOWN_MIN_H, DRAWN, hasMobArt, HURT, MOB_ART, paintMob, RECOLOR, miniRect, MINI_SCALE, toMini, CAM, TILE, WORLD, ANIM_RATE, BREATH, mobFrame, BAR_SHOW, critChance, critMult, critOverflowPoints, damage, MISS_IFRAMES, missChance, DYING_MAX, HITSTUN, killMob, NUM_GAP, NUM_LINE, passiveDmg, barrageTargets, cast, cdSlot, delayTime, rushHolding, useTime, CASTS, MOB_SOUNDS, GHOST_RISE_T, ghostRise, getPlayerDeath, PLAYER_DEATH_T, TOMB_DROP_T, tombDrop, fmtNum, BOSS, bossAlive, bossName, bossType, hurtPlayer, quakes, cleanLook, DEFAULT_LOOK, LOOK_COUNTS, lookPalette, myLook, setMyLook, stepLook, stylist, stylistKey, stylistTap, stylistBox, ST_ROWS_W, ST_TOP, styled, DECOR_FRAMES, paintDecor, paintSmoke, SMOKE, TOWN_PALS, type DecorKind, NPC_FRAMES, npcFrame, npcRows, board, boardOffers, boardRows, loadQuests, QUEST_MAX, questKill, quests, apply, clearSave, hasSave, load, save, snapshot, boost, BOOST, remoteKills, resetBoost, takeBatch, waveRate, canConnect, hourStamp, net, newCode, parseCode, roomId, activate, disabled, autoChannel, channelChoices, initMenu, items, menu, menuKey, menuTap, menuText, MENU_ROW, MENU_TOP, MENU_W, MENU_X, BLOCK_VARIANTS, hash, tilesetFor, TILESETS, TOP_H, TOP_W, BOT_H, variantAt, PROP_H, PROP_W, propAt, PROPS, BACKDROPS, particlesAt, expToNext, killsToLevel, mobExp, dev, devStops, BASIC, clearUnlocks, isBasic, isUnlocked, offeredAt, TOWN_LOOKS, openStylist, STYLIST_ROWS, devInput, windowOpen, addChat, bubbleFor, bubbleMs, chat, CHAT_MAX, cleanChat, clearBubbles, LOG_SHOW_MS, logLines, SELF, wrap, say, archerFrame, climbPhase, DIVE_PITCH, GRIDS, pitch, POSE_FPS, poseCycle, ingest, INTERP_MS, newTrack, POSES, Recorder, SEND_MS, view, type Packet, keysKey, keysUi, KEY_ROWS, pet, PET, achKey, achUi, ACHIEVEMENTS, bump, clearAchievements, cleanRecord, GOLD_OUTFIT, isDone, record, runBonus, visitArea, startRun, DEFS, startsLearned, clearGear, equip, gear, gearDmg, gearFor, gearSoak, gearDrops, READY_FLASH, cameraTarget, mobBounds, coinMult, FLOOR_MODS, grip, ICE_GRIP, modLine, rollMods, bag, BAG_SIZE, unequip, wear, STAT_KEYS, generateFloor, TOWN_PLANS, corpses, DEATH_T, DEATHS, deathOf, deathPose, closeLinks, linkable, linkHeld, bakeDeathSheet, DEATH_FRAMES, deathFrame, localPose, applyStatus, areaStatus, CHILL_SLOW, DOT, MAX_STACKS, slowFactor, STATUS, updateStatus, cleanSettings, DEFAULT_SETTINGS, openSettings, settings, settingsBox, settingsKey, settingsTap, settingsUi, SET_ROW, SET_TOP, SET_W, SETTING_ROWS, VOLUME_MAX, type Mob, type PauseMenu, type Platform, type SkillKey, climb, check, release, step, tap, landLeap, ground, arena, dummy } from './harness';

{
  // bosses: an area's last floor has one, and its way up stays sealed until it's beaten
  release();
  let endN = 1; while (!isPathEnd(climb(endN))) endN++;
  gotoPlace(climb(endN - 1));
  check('no boss before the last floor of an area', !game.mobs.some((m) => m.boss));
  gotoPlace(START);
  check('no boss in a town', !game.mobs.some((m) => m.boss));
  gotoPlace(climb(endN));
  const bs = game.mobs.filter((m) => m.boss);
  check("an area's last floor has exactly one boss", bs.length === 1);
  const boss = bs[0];
  check('the boss is one of its enemies, grown huge and much tougher',
    boss.w === boss.type.w * BOSS.SCALE && boss.h === boss.type.h * BOSS.SCALE && boss.hpMax >= boss.type.hp * BOSS.HP && !boss.fly);
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
  check('far from you, the boss winds up a charge', boss.boss.act === 'windCharge');
  step(Math.ceil(BOSS.WIND / P.STEP) + 2);
  check('then rushes at you', boss.boss.act === 'charge' && boss.vx < -boss.spd * 2, `${boss.boss.act} ${boss.vx}`);
  // slam: the landing hits a player on the ground nearby, not one far off
  const slam = (dx: number, from = WORLD.w / 2): number => {
    boss.x = from; boss.y = ground.y - boss.h; boss.vx = boss.vy = 0; boss.boss = { act: 'windSlam', t: 0.01, cd: 9, air: false };
    stand(from + dx); quakes.length = 0;
    const before = player.hp;
    for (let i = 0; i < 300 && boss.boss.act !== 'walk'; i++) { player.invuln = Math.min(player.invuln, 0.5); game.mobs.splice(0, game.mobs.length, boss); step(1); stand(from + dx); }
    return before - player.hp;
  };
  check("a slam's shockwave hurts a player on the ground nearby", slam(boss.w / 2 + 40) > 0 && quakes.length === 1);
  check('but not one well out of reach (it leaps toward you)', slam(WORLD.w - 60, 30) === 0);
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
  check('beating the boss clears it', !bossAlive());
  player.x = up.x; player.y = up.y - player.h; player.vx = player.vy = 0; player.onGround = true; player.climb = null;
  tap('up');
  check('then the way up opens', samePlace(game.floor.place, climb(endN + 1)));
  player.hpMax = player.hp = hp0;
  // looks: hair style, hair colour, skin and outfit; set from the menu or the town stylist
  check('a bad saved look falls back to the default', JSON.stringify(cleanLook({ style: 99, hair: -1, skin: 'x' })) === JSON.stringify(DEFAULT_LOOK));
  check('a good look is kept', cleanLook({ style: 2, hair: 3, skin: 1, outfit: 4 }).hair === 3);
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
  check('the male build changes the face', poses.filter((p) => p !== 'prone' && p !== 'climb').every((p) => diff(styled(GRIDS[p][0], p, 0, 1), styled(GRIDS[p][0], p, 0, 0)) >= 3));
  // town stylists: each town offers its own extra, which seeing unlocks everywhere
  const towns = TOWNS.map((t) => t.name);
  check('every town\'s stylist has an extra', towns.every((t) => TOWN_LOOKS[t]?.length), towns.filter((t) => !TOWN_LOOKS[t]?.length).join(', '));
  const extras = Object.values(TOWN_LOOKS).flat().map((e) => `${e.k}:${e.i}`);
  check('extras are real, not basic, and each offered by one town', new Set(extras).size === extras.length
    && Object.values(TOWN_LOOKS).flat().every((e) => e.i < LOOK_COUNTS[e.k] && !isBasic(e.k, e.i)));
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
  check('the look is kept on this device', cleanLook(JSON.parse(localStorage.getItem('archer-game:look') ?? '{}')).hair === BASIC.hair! - 1);
  menuKey('escape');
  check('Esc closes the stylist, not the menu', !stylist.open && menu.open);
  // taps: a row's left half steps back, its right half forward
  stylistKey('escape'); stylist.open = true; stylist.sel = 0;
  const b = stylistBox(320, 180), rowY = (i: number): number => b.y + ST_TOP + i * 14 + 3;
  const sk = myLook().skin;
  stylistTap(b.x + ST_ROWS_W - 10, rowY(2), 320, 180);
  check('tapping the right half of a row steps it forward', myLook().skin === (sk + 1) % LOOK_COUNTS.skin && stylist.sel === 2);
  stylistTap(b.x + 10, rowY(2), 320, 180);
  check('tapping the left half steps it back', myLook().skin === sk);
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
  check('Up beside the stylist opens the window', stylist.open);
  tap('right');
  check('arrows change your look there too', myLook().style === 1);
  const town = placeName(game.floor.place), extra = TOWN_LOOKS[town][0];
  check('the town stylist knows which town it is in, and says its looks are new', stylist.town === town && stylist.fresh > 0);
  setMyLook({ ...DEFAULT_LOOK, [extra.k]: extra.i - 1 });
  stylist.sel = STYLIST_ROWS.indexOf(extra.k === 'style' ? 'HAIR' : 'HAIR COLOUR'); tap('right');
  check('it offers its own extra', myLook()[extra.k] === extra.i, `${extra.k} ${myLook()[extra.k]} want ${extra.i}`);
  tap('x');
  check('X closes it', !stylist.open && !game.pause);
  check('seeing it unlocked the extra for good (the menu offers it now)', isUnlocked(extra.k, extra.i) && offeredAt(null)(extra.k, extra.i));
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
  const q = quests[0];
  check('a taken posting leaves the offer list', boardRows().filter((r) => r.active === null).every((r) => r.q.mob !== q.mob));
  for (let i = 0; i < q.need + 3; i++) questKill(q.mob);
  questKill('Nobody');
  check('kills count toward the quest (capped at the goal)', q.have === q.need);
  const exp0 = player.exp, lvl0 = player.level, coins0 = wallet.coins;
  board.sel = 0; tap('z');
  check('Z hands in a finished quest for EXP and coins', quests.length === 0 && wallet.coins === coins0 + q.coins && (player.exp > exp0 || player.level > lvl0));
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
