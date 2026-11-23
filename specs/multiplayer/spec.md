# Multiplayer

Other players appear as ghosts on the same floor and channel, each washed in their own colour (stable per player) with a name tag above them; there is no shared combat. Networking is peer-to-peer over WebRTC (Trystero), with no game server.

- Each floor has numbered channels of up to 20 players; a full channel spills into the next.
- Each player samples their own motion 10 times a second (position, velocity, pose) and sends the last few samples together about 3 times a second, so updates are few but carry the full motion between them.
- Receivers play ghosts back a little under half a second behind, interpolating between samples. If a packet is late, the ghost coasts briefly on its last velocity, then holds still.
- Ghosts play the same poses as their owner: idle, walk, jump, climb, shoot, Sky Toss lean and hover.
- Other players' skills show their effects locally (shot flash and tracer on release, Sky Toss's horn of light, Sky Assault's swoosh). They are visual only: no damage.
- Each player has a short random name (e.g. SWIFTFOX), kept in the browser and shared with the channel.
- Players arriving on a floor are spread around the middle of the ground, so people entering together don't overlap.

## Main menu and private instances

- The game opens on a title menu over the frozen world, and nothing goes online until the player picks how to play.
- **Play** joins the public channels.
- **Private instance:** "Create new code" makes a random 5-letter code (no I or O). Entering a code and pressing Join plays in that instance: one room per floor, shared by everyone with the code, with its own seeded layouts. The code goes into the URL (`#CODE`), so the page link is the invite; opening it prefills the code, and Enter joins.
- Under the floor name the HUD shows where you are and how many players are there: "Ch.1 · 3 players", or "Private CODE · 2 players" in a private instance.

## Shared spawn boost

- Kills are shared with your channel or instance: each kill another player makes there speeds up your enemy waves by 15%, up to 2x. The boost fades over about 20 seconds.
- Kills are sent in batches at most once a second. A received batch counts at most 5 kills, so a misbehaving peer can't flood the floor.
- The HUD shows "Waves xN" while a boost is active. Changing floors or instances resets the boost.
