# Combat

Attacks target a compact hitbox in the facing direction (a short reach in front of the player, about body height); projectile attacks land their hit when the shot reaches the enemy (Twin Shot has no projectile and hits instantly); multi-hit skills re-evaluate the box each tick, like classic MMO attack frames. Damage scales with the player's WAR stat, a passive multiplier, and Fervor, with ±8% variance and a 15% base crit rate (×1.5) that rises with LUK. Hits show floating damage numbers (gold when crit) and a brief hit flash.

Mobs patrol their platform and ignore the player until attacked; once hit, a mob chases the player. Touching any mob hurts; contact means the visible sprites overlap. Killed mobs give EXP (no floating EXP number). A mob's EXP depends on its level, not the player's; for now a mob's level is the floor number, so out-levelling a floor slows your levelling and climbing speeds it up. Each platform with enemies (and the ground) is a spawn zone with a max count, small for short platforms and larger on the ground; enemies return in periodic waves that top every zone back up to its max, never beyond. Mobs patrol within their own platform. Mob strength is keyed to the floor (higher floors, tougher mobs): Garden Snail → Boar → Wisp → Iron Hog.

Sky Toss slides the player a short way forward along the ground (no hop) and launches mobs airborne; airborne-targeted hits gain a 30% bonus. The player has invulnerability frames after taking a hit, and death revives at the floor's ground slab.

HP and MP regenerate in small ticks (5% of max every 5s). HP doesn't regenerate in combat, i.e. within 5s of attacking or being hit; MP always does.
