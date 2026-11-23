# Platforms & Floors

Floors sit inside named regions, one per town block (floors 1-9 = Beach, 11-19 = Forest, cycling every 10 floors); the HUD shows the region with the floor number ("Beach · Floor 3", "Beach · Town" on the town floor).

A floor is a single screen-wide tower level: a full-width ground slab at the bottom and 7 floating platforms stacked to the summit (about 5-6 tiles apart), each joined to the next by a rope or ladder, with a portal on top that advances to the next floor. Every 10th floor is a town (no enemies; its portal returns to floor 1).

All geometry is tile based on a 16px grid. A platform is a solid, contiguous block built from a per-column height profile: dirt tiles inside, a grass-capped tile on top of each column, and slope tiles where the surface changes height. All slopes are 2:1 (there are no 1:1 slopes): two tiles side by side that together rise one tile, the lower half rising 0–8px and the upper half 8–16px.

Slope collision follows the drawn ramp surface, not the tile's top edge.

## Size

- Platforms are never thinner than 2 tiles tall and never thicker than 4 tiles tall.
- Platforms are 6–24 tiles wide; shapes are picked at random (and randomly mirrored) and widened by duplicating flat columns to stay in that range.
- Generation is seeded from the multiplayer room name (floor + channel), so every player in a channel sees the same layout; the seed is a hash of the room id feeding a small deterministic PRNG.
- Only platforms at least 12 tiles wide may run off either side of the map, and only while at least 6 of their columns and one of their summit tiles stay on screen. Narrower platforms stay fully on screen.

## Slopes

A slope must always rise from, and fall into, a flat horizontal tile:

- The bottom of a slope tile — the tile to the left of a slope angling down to the left, or to the right of a slope angling down to the right — is never blocked by a wall; the foot of the ramp is open, walkable surface.
- The top of a slope tile always has a solid flat tile on the side it rises toward, so the ramp terminates in a flat horizontal surface rather than an edge or a wall.

In profile terms: every slope has at least one flat column on both sides, and slopes never sit at a block's edge (e.g. stair: 2, up, 3, up, 4; hill: 2, up, 3, 3, down, 2).

The rope/ladder between platforms is centred on a flat summit tile of the upper platform (x at the tile centre, snapped to the 16px grid) and hangs down from that tile's surface, through its own platform, to the first walkable surface beneath it on another platform or the ground.
