// Runs before every test file (see vitest.config.ts).
//
// The game uses Math.random for floor layouts, drops, misses and so on. Tests
// swap it for a simple seeded generator so every run sees the same numbers,
// and reset the seed before each test so a test never depends on which tests
// ran before it.
import { beforeEach } from 'vitest';

const SEED = 12345;
let seed = SEED;
Math.random = (): number => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

beforeEach(() => {
  seed = SEED;
});
