# Movement

The player runs, jumps, glides, and climbs with classic side-scroller physics on a fixed step, frame-rate independent. On the ground the player accelerates to walk speed and slides a tiny bit when input is released.

Jumping keeps running momentum; holding Jump re-jumps on every landing. In the air the player can't steer: holding against the motion only brakes toward a standstill, never turns them around. Facing is never locked: the player can turn to face either way mid-air (e.g. to aim), even though their motion doesn't change.

Climbing: holding Up catches a rope or ladder within a small grab radius (from below it or mid-air); holding Down grabs one whose top is just under the feet. While climbing, x locks to the climbable and gravity is suspended. Jump with Left/Right held leaves in that direction (even with Up held); Jump with no direction does nothing. Up + Jump rushes up the climbable at high speed and pops off the top with a small jump. A just-left rope can't be re-caught until the player moves out of its range or lands; any other rope can be caught immediately.

Glide (D) launches the player forward in the facing direction with a capped upward boost. It can be used repeatedly in the air.
