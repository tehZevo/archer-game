# Multiplayer

Other players appear as translucent ghosts on the same floor and channel; there is no shared combat. Networking is peer-to-peer over WebRTC (Trystero), with no game server.

- Each floor has numbered channels of up to 20 players; a full channel spills into the next.
- Each player samples their own motion 10 times a second (position, velocity, pose) and sends the last few samples together about 3 times a second, so updates are few but carry the full motion between them.
- Receivers play ghosts back a little under half a second behind, interpolating between samples. If a packet is late, the ghost coasts briefly on its last velocity, then holds still.
- Ghosts play the same poses as their owner: idle, walk, jump, climb, shoot, Sky Toss lean and hover.

## Main menu and private instances

- The game opens on a title menu over the frozen world, and nothing goes online until the player picks how to play.
- **Play** joins the public channels.
- **Private instance:** "Create new code" makes a random 5-letter code (no I or O). Entering a code and pressing Join plays in that instance: one room per floor, shared by everyone with the code, with its own seeded layouts. The code goes into the URL (`#CODE`), so the page link is the invite; opening it prefills the code, and Enter joins.
- In a private instance the HUD shows "Private CODE" under the floor name.
