# Physics

- Only the top surface of a platform is walkable; its inner tiles are not solid to the player or mobs.
- The player can jump down through any platform by holding Down and pressing Jump: a small hop, then they fall through that platform only. On the ground slab this is a normal jump.
- Platforms are one-way: bodies pass up through them and land on them from above.
- Bodies on a slope follow its surface up and down rather than stepping or floating off.
- Collision is swept along the whole path of a frame: no speed (falling, Feather Step) passes through a flat tile or a slope.
- Enemies damage the player only on actual contact.
