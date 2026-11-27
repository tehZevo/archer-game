# Platforms & Floors

The tower is a run of areas, each 10 floors tall, with a named town between one area and the next (towns are stops, not numbered floors). Places are named by area and floor within it: the HUD and the menu show "Beach 3", "Forest 10", or the town's own name ("Driftwood Rest", "Mossgate", ...). The first area is the Beach. Leaving a town, its two ways up lead into two different areas (e.g. Forest on the left, Cave on the right), so the tower branches; both routes reach the same next town. (Internally, stages are numbered in one run, 11 per area plus town, for saves, rooms and portals.)

A floor is a single screen-wide tower level: a full-width ground slab at the bottom and 4 floating platforms stacked to the summit, each with 2-3 tiles of headroom above whatever is below it (the gap from the ground to the first platform matches the rest), each joined to the next by a rope or ladder, with a portal on top that advances to the next floor. The ground slab is 4 tiles thick. A floor is only as tall as its content: from the ground up to the portal plus 2-3 tiles of open sky (so heights vary a little between floors, and the minimap shows no empty band). After each area's 10th floor comes a town: a designed layout (not random), flat and wide with little climbing, and no enemies (skills still work; arriving doesn't refill HP/MP). Two portals at the ends of the ground lead up into the next areas, one each: the left one to one area (route A), the right one to the other (route B). The floors above a town come in those two versions (their own layouts and their own rooms) until the next town, where both routes meet again. A floating plaza deck in the middle (a ladder on one side, a rope on the other) holds a portal back down to the floor below. Each portal is labelled with where it goes ("Forest 1", "Cave 1", "Beach 10"; the portal on an area's 10th floor shows the town's name); the way down glows a different colour.

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

## Connectors

Different ladders and ropes never touch each other directly, vertically or horizontally: two connectors on the same floor are always separated by at least one tile of gap where their columns meet or where one hangs into the top of the other.
