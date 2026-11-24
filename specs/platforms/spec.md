# Platforms & Floors

Floors sit inside named regions, one per town block (floors 1-9 = Beach, 11-19 = Forest, cycling every 10 floors); the HUD shows the region with the floor number ("Beach · Floor 3", "Beach · Town" on the town floor).

A floor is a single screen-wide tower level: a full-width ground slab at the bottom and 4 floating platforms stacked to the summit, each with 2-3 tiles of headroom above whatever is below it (the gap from the ground to the first platform matches the rest), each joined to the next by a rope or ladder, with a portal on top that advances to the next floor. The ground slab is 4 tiles thick. A floor is only as tall as its content: from the ground up to the portal plus 2-3 tiles of open sky (so heights vary a little between floors, and the minimap shows no empty band). Every 10th floor is a town: a designed layout (not random), flat and wide with little climbing, and no enemies (skills still work; arriving doesn't refill HP/MP). Two portals at the ends of the ground lead up to the next floor, each on its own route: the left one to route A, the right one to route B. The floors above a town come in those two versions (their own layouts and their own rooms) until the next town, where both routes meet again. A floating plaza deck in the middle (a ladder on one side, a rope on the other) holds a portal back down to the floor below. Each portal is labelled with where it goes; the way down glows a different colour.

All geometry is tile based on a 16px grid. A platform is a solid, contiguous block built from a per-column height profile: dirt tiles inside, a grass-capped tile on top of each column, and slope tiles where the surface changes height. All slopes are 2:1 (there are no 1:1 slopes): two tiles side by side that together rise one tile, the lower half rising 0–8px and the upper half 8–16px.

Slope collision follows the drawn ramp surface, not the tile's top edge.

## Size

- Platforms are never thinner than 2 tiles tall and never thicker than 4 tiles tall.
- Platforms are 12–24 tiles wide; shapes are picked at random (and randomly mirrored) and widened by duplicating flat columns to stay in that range.
- Generation is seeded from the multiplayer room name (floor + channel), so every player in a channel sees the same layout; the seed is a hash of the room id feeding a small deterministic PRNG.
- Platforms may run off either side of the map, but only while at least 6 of their columns and one of their summit tiles stay on screen.

## Slopes

A slope must always rise from, and fall into, a flat horizontal tile:

- The bottom of a slope tile — the tile to the left of a slope angling down to the left, or to the right of a slope angling down to the right — is never blocked by a wall; the foot of the ramp is open, walkable surface.
- The top of a slope tile always has a solid flat tile on the side it rises toward, so the ramp terminates in a flat horizontal surface rather than an edge or a wall.

In profile terms: every slope has at least one flat column on both sides, and slopes never sit at a block's edge (e.g. stair: 2, up, 3, up, 4; hill: 2, up, 3, 3, down, 2).

The rope/ladder between platforms is centred on a flat summit tile of the upper platform (x at the tile centre, snapped to the 16px grid) and hangs down from that tile's surface, through its own platform, to the first walkable surface beneath it on another platform or the ground.
