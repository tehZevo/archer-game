# Rendering — Pixel Perfect, 16×16 Sprites

The game renders pixel perfect: every visible element is a 16×16 (or 16-multiple) sprite drawn at integer coordinates on a fixed 240×180 base-resolution canvas, upscaled by CSS with `image-rendering: pixelated` (nearest-neighbour). No element ever samples across a pixel boundary.

## Transformations

In-game objects, effects, and decor sprites are drawn at their natural size and orientation: never rotated, never scaled. Aside from the boss/elite size scale, foreground sprites (the player, decor, enemies, effects, and everything else in the world) are never squashed, stretched, or rotated; animations that need these looks are sprited — authored as dedicated frames at the shape they are shown in. Each sprite is authored at the size and angle it is shown at, so a 16×16 sprite occupies 16×16 device pixels on the base canvas.

- **Scale** is baked into the art, not applied at draw time: a bigger mob is a bigger authored sprite, not `drawImage(img, x, y, w * 1.5, h * 1.5)`.
- **Rotation** is baked in too: a diagonal arrow is a sprite drawn diagonally, not a horizontal sprite passed through `ctx.rotate`.
- **Exception — non-skill-icon HUD elements** (the HP/MP/EXP bars, the minimap, and other HUD chrome) may scale and rotate freely; they are UI, not world sprites. Skill icons are the canonical 10×10 and are drawn 1:1 (see Sprites).

## Sprites

- All sprites are authored on a 16×16 grid (the tile unit), built procedurally once at boot as tiny canvases with 1px blocks and drawn with `drawImage`.
- **Every animation is fully sprited.** Each animation — walk, idle, hurt, death, and every other pose — is a set of dedicated authored frames baked to a sheet, not a body assembled from parts (head/torso/limbs) composed at runtime. A new animation means authoring its frames, not writing a part-drawing routine.
- Tiles (grass/dirt, slope tops) are 16×16; each slope tile is one half of a 2:1 ramp, a full 16×16 cell whose surface rises half a tile.
- Ropes and ladders are 16×16 sprites tiled vertically between their endpoints; the sprite is centred on its tile (x at the tile centre, snapped to the 16px grid).
- Skill icons have one canonical size (`ICON`, 10×10: the glyph itself over a dark tile, no frame) and are never scaled: every screen (skill bar, skills screen, link help, menus) draws them 1:1 at that size, and layouts are built around it.
- The player is 16×24; mobs are sized to the grid (e.g. snail 17×14, hog 26×21) and drawn centred on integer positions. Every body's collision box matches its sprite.

## Attack effects

Skill effects follow the style of classic MMOs' Archer effects, as original pixel art: short multi-frame animations of glowing light (white-hot core, cyan/teal halo, soft outer glow) drawn additively. Twin Shot flashes at the bow with crescent swooshes and whips twin tracer streaks out to each enemy it hits (no flying projectile); arrows are thin glowing streaks that fly straight out horizontally (never rotated) and stop at the enemy they hit; hits flash a spiky starburst that collapses into an expanding oval shockwave and sparkle dust (bigger, green on crits); Sky Toss erupts a spiral horn of light from the ground under each target with dust at its base; Sky Assault strikes as white-blue crescent swooshes; Skyfall Volley rains a volley of yellow-green arrows down onto launched enemies with gold impacts; Shell Barrage fires slower green bolts that burst green on hit; Glide opens green portal rings behind the player; a killed enemy vanishes in a soft dust puff; a level-up raises a gold pillar of light with rings and sparkles that follows the player. There are no free-floating particle/confetti effects: every effect is one of these baked animations. Damage numbers use the pixel font. Effects are pixel-snapped like everything else.

## Coordinates

- World geometry snaps to the 16px tile grid, so platform/slope destinations are integers.
- The camera translates by rounded pixels; entity draw positions round to integers.
- Partial tiles (block edges) crop the source and destination by the same integer amount, so tiles are never resampled.
- Pixel-font text always starts on a whole pixel (centred text never lands on a half pixel).
- 1px UI strokes use the +0.5 offset convention so lines land on whole pixels.

## Draw order

Sky gradient → floor platforms → ropes/ladders → portal → mobs (with HP bars) → arrows → player → effects → floating damage numbers (a multi-hit's numbers stack upward on the enemy, one line per hit, each appearing an eighth of a second after the one below; a cast's stack is as many lines as the hits it lands and stays whole while the next cast starts; they drift up slowly) → HUD overlay.

The skill bar shows a distinct pixel icon for each slot's active skill, so taking an upgrade changes the slot's icon; every skill, upgrade and passive has its own icon.

A minimap in the top-right corner, under the skill bar, shows the whole floor at 1:10: platform tops (the ground as a band), ropes and ladders, the portal, enemies as red dots, other players in their own tint, you in gold, and a faint box for the part of the floor on screen. It's hidden behind the main menu and the pause menu.

HUD numbers (HP, MP, EXP) are compact: plain below 1000, then shortened with K/M (e.g. 1.2K), rounded down so a bar never reads full early.
