# Multiplayer

Other players appear as ghosts on the same floor and channel, each washed in their own colour (stable per player) with a name tag above them; there is no shared combat. Networking is peer-to-peer over WebRTC (Trystero), with no game server.

- Each floor has numbered channels of up to 20 players; a full channel spills into the next.
- Each player samples their own motion 10 times a second (position, velocity, pose) and sends the last few samples together about 3 times a second, so updates are few but carry the full motion between them.
- A player whose tab is in the background keeps sending their (unchanging) position, so they stay visible to others, standing still, instead of vanishing.
- Receivers play ghosts back a little under half a second behind, interpolating between samples. If a packet is late, the ghost coasts briefly on its last velocity, then holds still.
- Ghosts play the same poses as their owner: idle, walk, jump, climb, shoot, Sky Toss lean and hover.
- Other players' skills show their effects locally, visual only (no damage). Every released shot (Twin Shot, Piercing Arrow) is sent as its own message and shows its flash and tracer when that player's ghost reaches the moment it was fired, so rapid back-to-back shots all show; Sky Toss's horn of light and Sky Assault's swoosh play from the ghost's pose.
- Each player has a short random name (e.g. SWIFTFOX), kept in the browser and shared with the channel.
- Players arriving on a floor are spread around the middle of the ground, so people entering together don't overlap.

## Main menu and private instances

- The game opens on a title menu drawn in the game itself (on the canvas, pixel font, over the frozen world), not as page elements on top. It shows your level and the floor you'll resume on. Arrows move, Z or Enter selects; on touch, tap a row to select it and tap again to use it.
- Nothing appears in any channel until the player picks how to play. While the menu is open the game joins a small lobby room that only shares head-counts (which public floor and channel each player is on), so the menu can show how busy each channel is.
- **Play** joins the public channels on Auto: the busiest channel on your floor that still has room (so players meet up), or channel 1 if nobody is around.
- **Channel** picks a public channel by hand (left/right, or tap the row's ends): Auto, then channels 1-3 and one beyond the busiest, each with its player count (e.g. "CH 2 3/20"). Selecting it plays there.
- **Private code:** "New private code" makes a random 5-letter code (no I or O). Typing a code and pressing Enter plays in that instance: one room per floor, shared by everyone with the code, with its own seeded layouts. The code goes into the URL (`#CODE`), so the page link is the invite; opening it prefills the code, and Enter joins. A wrong-length code is refused with a note.
- **Name** shows your name and lets you type a new one (letters and digits, up to 9); an empty name gets a random one.
- **Reset progress** (only with a save) asks once more before erasing.
- Typing goes through a hidden text field so phones open their keyboard.

## Shared spawn boost

- Kills are shared with your channel or instance: each kill another player makes there speeds up your enemy waves by 15%, up to 2x. The boost fades over about 20 seconds.
- Kills are sent in batches at most once a second. A received batch counts at most 5 kills, so a misbehaving peer can't flood the floor.
- The HUD shows "Waves xN" while a boost is active. Changing floors or instances resets the boost.
