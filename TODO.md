# TODOs
- Spec: never rotate or scale in-game objects, effects, or decor sprites (exceptions: non-skill-icon HUD elements).
- (art) Dodge roll during held-Z needs a roll animation.
- Gray out the icons in the skills screen's link list for skills you haven't acquired yet.
- Bug: the C (copy JSON) action in the skill editor doesn't seem to work.
- (art) Create art for the Bubble skill.
- Bug: the "S" in "FOES" and some skill icons in the link line on the skills screen overflow the border — wrap them to a new line or reflow/reword so they fit.
- Bug: Tempest (R) only hits once — `tempest()` (skillcasts.ts:188) fires a single `damage()` per target and ignores `hits1: 8`. Wrap the hit in `eachShot(shotCount(r), …)` like Cyclone Sweep / Downpour so all 8 hits (×2 with Twin Echoes) land.
- Increase the time Z must be held before rapid fire (Gale Stream) kicks in — it should wait for the full use time before starting.
- Remove the 1–2–3–4 tab menu for pets; make it one scrollable list navigated with up/down, where each item is selectable.
