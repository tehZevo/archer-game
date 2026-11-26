# TODOs
- Add an in-game (dev mode) skill timing and link editor: lets me change which skills link into which (the `linksInto` lists) and tune each skill's use/recovery times up/down in 0.1s increments, with a copy button that copies the full tweaked list to the clipboard as JSON.
- Add a Bubble passive that reduces incoming damage by a flat 30%. (art)
- (art) Remove sprite stretching for effects: all effects should be drawn at their natural resolution.
- (art) Remove death animation rotation: all death animations should be unique and drawn, not transforms.
- Recalibrate enemy damage so a mob kills you in ~10 hits at Lv.1 and ~3 hits at Lv.100. Player HP is `100 × 1.05^(level−1)` (progress.ts:64): 100 at Lv.1, ~11,463 at Lv.100. Target per-hit damage = HP / hits → **~10 at Lv.1, ~3,821 at Lv.100**. The formula is `type.dmg × A × (1 + (mobLevel−1) × B)` (state.ts:126, currently `A = 3.5, B = 3.2`), scaling off the mob's base `type.dmg` (2–5). Normalizing to a base-3 mob: `3 × A = 10` → **A ≈ 3.3**; `3 × A × (1 + 99 × B) = 3,821` → **B ≈ 3.9**. So change `3.5 × (1 + (level−1) × 3.2)` → `3.3 × (1 + (level−1) × 3.9)` and update the two mechanics checks in test/11-deaths.ts that assert the formula.
- (art) Create natural-resolution (not scaled) damage numbers in a playful font. The digits should have no gaps between them (bubble-letter style) so they stay easy to read when stacked.
- Increase damage number vertical spacing by 25% (the `NUM_LINE` line offset in combat.ts:111, currently 9 → ~11).
