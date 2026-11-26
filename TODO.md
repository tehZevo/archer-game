# TODOs
- Add an in-game (dev mode) skill timing and link editor: lets me change which skills link into which (the `linksInto` lists) and tune each skill's use/recovery times up/down in 0.1s increments, with a copy button that copies the full tweaked list to the clipboard as JSON.
- Add a Bubble passive that reduces incoming damage by a flat 30%. (art)
- (art) Remove sprite stretching for effects: all effects should be drawn at their natural resolution.
- (art) Remove death animation rotation: all death animations should be unique and drawn, not transforms.
- (art) Create natural-resolution (not scaled) damage numbers in a playful font. The digits should have no gaps between them (bubble-letter style) so they stay easy to read when stacked.
- Give each enemy a random damage roll of 50%–100% of its max, picked once at spawn (in `spawnMob`, state.ts), so two mobs of the same species don't hit identically. The base `dmg` becomes the max; multiply by `0.5 + Math.random() * 0.5`.
- Replace the linear enemy HP scaling (`type.hp × 1.5 × (1 + (level − 1) × 6.1)` in state.ts:115-117) with an exponential curve anchored at `LV_1_HP = 30` and `LV_100_HP = 200000`, keeping a per-species multiplier so tanky mobs stay tanky: (#305)
  ```
  LV_1_HP   = 30
  LV_100_HP = 200000
  hp = round(LV_1_HP × (LV_100_HP / LV_1_HP) ^ ((level − 1) / 99) × (type.hp / 100))
  ```
  The `(type.hp / 100)` term spans ~1.4× (Gull/Bee, 140) to ~4.2× (Ice Yeti, 420), centered ~2.4×. So a Lv.1 Gull ≈ 42 HP and a Lv.1 Ice Yeti ≈ 126 HP; at Lv.100 the base curve is 200,000 × that multiplier. Update the mechanics checks in test/11-deaths.ts that assert the HP formula.
- Replace the linear enemy damage scaling (`type.dmg × 3.5 × (1 + (level − 1) × 3.2)` in state.ts:126) with an exponential curve anchored at `LV_1_DMG = 10` and `LV_100_DMG = 4000`, keeping a per-species multiplier so hard-hitting mobs stay harder: (#305)
  ```
  LV_1_DMG   = 10
  LV_100_DMG = 4000
  dmg = round(LV_1_DMG × (LV_100_DMG / LV_1_DMG) ^ ((level − 1) / 99) × (type.dmg / 3))
  ```
  The `(type.dmg / 3)` term spans ~0.67× (Gull, 2) to ~2.67× (Ice Yeti, 8), centered ~1×. So a Lv.1 base-3 mob ≈ 10 dmg and a Lv.1 Ice Yeti ≈ 27 dmg; at Lv.100 the base curve is 4,000 × that multiplier. Update the mechanics checks in test/11-deaths.ts that assert the damage formula.
- Make bosses use the same HP and damage formulas as regular enemies (the exponential curves in state.ts), so a boss and its base mob scale identically. The only difference is the boss multiplier: a boss does 3× damage and has 10× HP of its base mob. Set `BOSS.DMG = 3` and `BOSS.HP = 10` (boss.ts:28) and compute the boss's HP/dmg from the base enemy formula × those multipliers (drop the boss's separate linear `3.5 × (1 + (level − 1) × 3.2)` and `type.hp × scale × BOSS.HP` formulas in boss.ts:71,78).
- Use full-size skill icons in the skills menu (not scaled down to fit the row) and space the surrounding text out to make room for them. Use the same icons as the HUD.
- Should not be able to turn around during a skill, but SHOULD be able to buffer the next skill's direction by holding (or facing) that direction when pressing the next skill's button.
- Give Rush Toss a 3s cooldown that is lowered (reduced) by using its link skills.
- Always show customizations in the pet keeper shop (as a scrollable list). Once you buy a customization you can toggle it on/off by selecting it again. Customizations are global (not per-pet): they apply to whichever pet you have equipped, and you don't configure them separately per pet.
