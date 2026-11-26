# TODOs
- Add a Bubble passive that reduces incoming damage by a flat 30%. (art)
- (art) Remove sprite stretching for effects: all effects should be drawn at their natural resolution.
- (art) Remove death animation rotation: all death animations should be unique and drawn, not transforms.
- (art) Create natural-resolution (not scaled) damage numbers in a playful font. The digits should have no gaps between them (bubble-letter style) so they stay easy to read when stacked.
- Add a separate skills screen in the menu with a subtab per job tier (1–10, 10–30, 30–60, 60–100); highlighting a skill shows its details on the right.
- Make enemies ADD velocity when they hit you (knockback) instead of SET velocity, so consecutive hits stack the knockback.
- Raise `LV_1_HP` (currently 30 in state.ts:115) so a Lv.1 mob takes ~3 Double Shot hits (~100 HP for a base mob, i.e. `LV_1_HP` ~70–100), keeping the exponential curve to Lv.100.
- Sort the dev warp menu's maps by tier, and place each town immediately before the area it links up to.
